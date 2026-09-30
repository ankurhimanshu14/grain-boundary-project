"""Core analysis of SCADA SET/PV readings for a 6-thermocouple, 3-zone furnace.

Furnace layout (fixed by the process):
  * 3 zones, 2 thermocouples (TC) per zone: odd TC = Left, even TC = Right
    (Zone 1 = TC1/TC2, Zone 2 = TC3/TC4, Zone 3 = TC5/TC6).
  * Tray capacity: 5 (zone 1) + 4 (zone 2) + 4 (zone 3) = 13 trays.
  * Valid temperature window: 500-1000 degC.  Readings outside it are
    treated as invalid (sensor off / over-range / recovering) and are
    never plotted, but they ARE counted and reported.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

T_MIN, T_MAX = 500.0, 1000.0
ZONES = {1: (1, 2), 2: (3, 4), 3: (5, 6)}
ZONE_TRAYS = {1: 5, 2: 4, 3: 4}
SIDE = {1: "Left", 2: "Right"}

# CQI-9 furnace classes: uniformity range, +/- degC (from +/- degF classes).
FURNACE_CLASSES = {
    "Class 1 (±3 °C / ±5 °F)": 3.0,
    "Class 2 (±6 °C / ±10 °F)": 6.0,
    "Class 3 (±8 °C / ±15 °F)": 8.0,
    "Class 4 (±10 °C / ±20 °F)": 10.0,
    "Class 5 (±14 °C / ±25 °F)": 14.0,
    "Class 6 (±28 °C / ±50 °F)": 28.0,
}


def tc_name(n: int) -> str:
    zone = next(z for z, tcs in ZONES.items() if n in tcs)
    side = "Left" if n % 2 == 1 else "Right"
    return f"TC{n} (Z{zone} {side})"


@dataclass
class Params:
    tolerance: float = 14.0          # +/- degC around SET (CQI-9 class)
    settle_min: float = 60.0         # minutes ignored after a channel reaches production SET
    min_in_band_pct: float = 100.0   # % of valid production readings that must be in band
    recovery_min: float = 20.0       # after a sensor fault, out-of-band readings this long are 'recovering'
    gap_factor: float = 3.0          # gap = interval > factor x median interval
    max_lr_diff: float | None = None  # allowed |L-R| in a zone (default 2 x tolerance)

    @property
    def lr_limit(self) -> float:
        return self.max_lr_diff if self.max_lr_diff else 2 * self.tolerance


@dataclass
class Result:
    meta: dict[str, str]
    df: pd.DataFrame                      # cleaned; columns t, SET-n, PV-n (NaN where invalid), RAW-n
    params: Params
    main_sp: float
    channels: list[int]
    in_service: list[int]
    prod: pd.DataFrame                    # bool mask per TC (production window)
    gaps: list[tuple[pd.Timestamp, pd.Timestamp]]
    interval_s: float
    tc_table: pd.DataFrame
    zone_table: pd.DataFrame
    furnace: dict[str, Any]
    quality: pd.DataFrame                 # invalid-reading events
    findings: list[tuple[str, str]] = field(default_factory=list)  # (severity, text)
    verdict: str = ""


# ----------------------------------------------------------------- loading
def load_scada(file) -> tuple[pd.DataFrame, dict[str, str]]:
    """Read the SCADA workbook (first sheet). Header row is auto-detected."""
    raw = pd.read_excel(file, sheet_name=0, header=None)
    hdr = None
    for i in range(min(len(raw), 40)):
        if str(raw.iat[i, 0]).strip().lower() == "date":
            hdr = i
            break
    if hdr is None:
        raise ValueError("Could not find the header row (a cell reading 'Date' in column A).")
    meta_txt = [str(v).strip() for v in raw.iloc[:hdr].to_numpy().ravel()
                if isinstance(v, str) and v.strip()]
    df = raw.iloc[hdr + 1:].copy()
    df.columns = [str(c).strip() for c in raw.iloc[hdr]]
    df = df.dropna(subset=["Date", "Time"])
    t = pd.to_datetime(df["Date"].astype(str).str.strip() + " " + df["Time"].astype(str).str.strip(),
                       errors="coerce")
    df = df.assign(t=t).dropna(subset=["t"]).sort_values("t").drop_duplicates("t")
    cols = {}
    for c in df.columns:
        m = re.fullmatch(r"(SET|PV)-(\d+)", c, re.I)
        if m:
            cols[c] = f"{m.group(1).upper()}-{int(m.group(2))}"
    df = df.rename(columns=cols)
    need = [f"{k}-{n}" for n in range(1, 7) for k in ("SET", "PV")]
    missing = [c for c in need if c not in df.columns]
    if missing:
        raise ValueError(f"Missing expected columns: {', '.join(missing)}")
    for c in need:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df[["t"] + need].reset_index(drop=True)
    meta = {"company": meta_txt[0] if meta_txt else "",
            "title": next((m for m in meta_txt if "FURNACE" in m.upper()), "")}
    return df, meta


# ----------------------------------------------------------------- analysis
def _runs(mask: np.ndarray, t: pd.Series, gap_s: float):
    """Yield (start_idx, end_idx) of contiguous True runs, split at data gaps."""
    dt = t.diff().dt.total_seconds().fillna(0).to_numpy()
    start = None
    for i, m in enumerate(mask):
        if m and (start is None or dt[i] > gap_s):
            if start is not None:
                yield start, i - 1
            start = i
        elif not m and start is not None:
            yield start, i - 1
            start = None
    if start is not None:
        yield start, len(mask) - 1


def analyse(df: pd.DataFrame, meta: dict[str, str], p: Params) -> Result:
    df = df.copy()
    chans = list(range(1, 7))
    dt = df["t"].diff().dt.total_seconds().dropna()
    interval = float(dt.median()) if len(dt) else 60.0
    gap_s = p.gap_factor * interval
    gaps = [(df["t"].iat[i - 1], df["t"].iat[i])
            for i in np.flatnonzero(df["t"].diff().dt.total_seconds().fillna(0).to_numpy() > gap_s)]

    # --- validity (500-1000 degC window) ---
    events = []
    for n in chans:
        raw = df[f"PV-{n}"]
        df[f"RAW-{n}"] = raw
        bad = ~raw.between(T_MIN, T_MAX)
        offline = bool((raw == 0).all())
        if not offline:
            # readings just after a fault that are still far from SET are the
            # instrument recovering, not furnace temperature -> mark suspect
            setv = df[f"SET-{n}"]
            far = ((raw - setv).abs() > p.tolerance) | setv.isna()
            arr, tt = bad.to_numpy().copy(), df["t"]
            for a, b in list(_runs(bad.to_numpy(), tt, gap_s)):
                j = b + 1
                while j < len(df) and (tt.iat[j] - tt.iat[b]).total_seconds() <= p.recovery_min * 60 \
                        and bool(far.iat[j]) and not arr[j]:
                    arr[j] = True
                    j += 1
            bad = pd.Series(arr, index=df.index)
        df[f"PV-{n}"] = raw.where(~bad)
        sp = df[f"SET-{n}"]
        df[f"SET-{n}"] = sp.where(sp.between(T_MIN, T_MAX))
        if offline:
            events.append({"TC": tc_name(n), "From": df["t"].iat[0], "To": df["t"].iat[-1],
                           "Readings": len(df), "Min raw": 0.0, "Max raw": 0.0,
                           "Reason": "Channel offline (reads 0)"})
            continue
        for a, b in _runs(bad.to_numpy(), df["t"], gap_s):
            v = raw.iloc[a:b + 1]
            reason = ("Over-range / sensor fault (≥ 32000), incl. recovery" if (v >= 32000).any()
                      else "Above 1000 °C" if (v > T_MAX).all()
                      else "Below 500 °C / recovering")
            events.append({"TC": tc_name(n), "From": df["t"].iat[a], "To": df["t"].iat[b],
                           "Readings": b - a + 1, "Min raw": v.min(), "Max raw": v.max(),
                           "Reason": reason})
    quality = pd.DataFrame(events)
    in_service = [n for n in chans if df[f"PV-{n}"].notna().any()]

    all_sets = pd.concat([df[f"SET-{n}"] for n in in_service]).dropna()
    main_sp = float(all_sets.mode().iat[0]) if len(all_sets) else float("nan")

    # --- production window per TC ---
    prod = pd.DataFrame(False, index=df.index, columns=chans)
    settle = pd.Timedelta(minutes=p.settle_min)
    prod_start = {}
    for n in in_service:
        at_sp = (df[f"SET-{n}"] == main_sp).to_numpy()
        if not at_sp.any():
            continue
        last_off = np.flatnonzero(~at_sp)
        # start of the final continuous stretch at main SP, else first time at SP
        first_idx = 0 if len(last_off) == 0 else (
            last_off[last_off < np.flatnonzero(at_sp)[-1]][-1] + 1
            if (last_off < np.flatnonzero(at_sp)[-1]).any() else int(np.flatnonzero(at_sp)[0]))
        t0 = df["t"].iat[first_idx]
        prod_start[n] = t0
        prod[n] = at_sp & (df["t"] >= t0 + settle).to_numpy()

    tol = p.tolerance
    rows = []
    for n in chans:
        r = {"TC": tc_name(n), "n": n, "Zone": next(z for z, t_ in ZONES.items() if n in t_)}
        if n not in in_service:
            r.update({"Status": "OFFLINE", "Verdict": "FAIL",
                      "Note": "No valid reading in the whole file (SET/PV = 0)"})
            rows.append(r)
            continue
        m = prod[n]
        pv = df.loc[m, f"PV-{n}"]
        valid = pv.notna()
        dev = pv - df.loc[m, f"SET-{n}"]
        inb = dev.abs() <= tol
        nvalid = int(valid.sum())
        pct = 100.0 * inb.sum() / nvalid if nvalid else float("nan")
        # excursions: contiguous out-of-band runs within production window
        out = (m & df[f"PV-{n}"].notna() & ((df[f"PV-{n}"] - df[f"SET-{n}"]).abs() > tol)).to_numpy()
        runs = list(_runs(out, df["t"], gap_s))
        longest = max(((b - a + 1) * interval / 60 for a, b in runs), default=0.0)
        nbad = int((m & df[f"RAW-{n}"].notna() & df[f"PV-{n}"].isna()).sum())
        r.update({
            "Status": "In service",
            "Set (°C)": main_sp,
            "Prod. start": prod_start.get(n),
            "Readings": nvalid,
            "Mean (°C)": pv.mean(), "Min (°C)": pv.min(), "Max (°C)": pv.max(),
            "Std (°C)": pv.std(),
            "Mean dev (°C)": dev.mean(), "Min dev (°C)": dev.min(), "Max dev (°C)": dev.max(),
            "In band %": pct,
            "Out-of-band min": (nvalid - inb.sum()) * interval / 60,
            "Excursions": len(runs), "Longest excursion min": longest,
            "Invalid in window": nbad,
            "Verdict": "PASS" if (nvalid and pct >= p.min_in_band_pct) else "FAIL",
        })
        rows.append(r)
    tc_table = pd.DataFrame(rows)

    # --- zone L/R ---
    zrows = []
    for z, (l, r_) in ZONES.items():
        row = {"Zone": f"Zone {z}", "Trays": ZONE_TRAYS[z]}
        if l in in_service and r_ in in_service:
            m = prod[l] & prod[r_] & df[f"PV-{l}"].notna() & df[f"PV-{r_}"].notna()
            d = (df.loc[m, f"PV-{l}"] - df.loc[m, f"PV-{r_}"])
            row.update({"Samples": int(m.sum()),
                        "Mean L−R (°C)": d.mean(), "Max |L−R| (°C)": d.abs().max(),
                        f"|L−R| ≤ {p.lr_limit:g} °C %": 100 * (d.abs() <= p.lr_limit).mean() if len(d) else np.nan,
                        "Verdict": "PASS" if len(d) and (d.abs() <= p.lr_limit).all() else "FAIL"})
        else:
            row.update({"Samples": 0, "Verdict": "N/A – TC offline"})
        zrows.append(row)
    zone_table = pd.DataFrame(zrows)

    # --- furnace-wide spread (all in-service TCs simultaneously in production) ---
    furnace: dict[str, Any] = {"spread": None}
    if in_service:
        m = prod[in_service].all(axis=1) & df[[f"PV-{n}" for n in in_service]].notna().all(axis=1)
        pvs = df.loc[m, [f"PV-{n}" for n in in_service]]
        spread = pvs.max(axis=1) - pvs.min(axis=1)
        furnace = {"spread": spread, "spread_idx": spread.index, "samples": int(m.sum()),
                   "mean_spread": spread.mean() if len(spread) else np.nan,
                   "max_spread": spread.max() if len(spread) else np.nan,
                   "spread_limit": 2 * tol,
                   "pct_spread_ok": 100 * (spread <= 2 * tol).mean() if len(spread) else np.nan}

    res = Result(meta, df, p, main_sp, chans, in_service, prod, gaps, interval, tc_table,
                 zone_table, furnace, quality)
    _findings(res)
    return res


def _findings(r: Result) -> None:
    p, f = r.params, r.findings
    off = [n for n in r.channels if n not in r.in_service]
    for n in off:
        f.append(("critical", f"{tc_name(n)} is out of service (SET and PV read 0 for the whole period). "
                              f"Zone {next(z for z, t in ZONES.items() if n in t)} has no working control/monitor "
                              "thermocouple on that side – furnace cannot be shown to conform."))
    for _, row in r.tc_table.iterrows():
        if row.get("Status") != "In service":
            continue
        if row["Verdict"] == "FAIL":
            f.append(("critical", f"{row['TC']}: only {row['In band %']:.1f}% of production readings are within "
                                  f"±{p.tolerance:g} °C of SET {r.main_sp:g} °C (mean deviation "
                                  f"{row['Mean dev (°C)']:+.1f} °C, range {row['Min dev (°C)']:+.0f} to "
                                  f"{row['Max dev (°C)']:+.0f} °C)."))
        if row["Invalid in window"]:
            f.append(("warning", f"{row['TC']}: {int(row['Invalid in window'])} invalid reading(s) inside the "
                                 "production window (excluded from statistics and plots)."))
    for _, row in r.zone_table.iterrows():
        if row["Verdict"] == "FAIL":
            f.append(("warning", f"{row['Zone']}: Left/Right difference reached {row['Max |L−R| (°C)']:.0f} °C "
                                 f"(limit {p.lr_limit:g} °C)."))
    fu = r.furnace
    if fu.get("spread") is not None and fu.get("samples"):
        if fu["max_spread"] > fu["spread_limit"]:
            f.append(("warning", f"Furnace-wide spread between hottest and coldest working TC reached "
                                 f"{fu['max_spread']:.0f} °C (limit {fu['spread_limit']:g} °C); within limit "
                                 f"{fu['pct_spread_ok']:.1f}% of the time."))
    for a, b in r.gaps:
        f.append(("warning", f"Data gap {a:%H:%M:%S} → {b:%H:%M:%S} ({(b - a).total_seconds() / 60:.0f} min) – "
                             "no SCADA records; temperature during this time is unverified."))
    if len(r.quality):
        q = r.quality[r.quality["Reason"] != "Channel offline (reads 0)"]
        for _, e in q.iterrows():
            f.append(("info", f"{e['TC']}: {e['Reason']} {e['From']:%H:%M}–{e['To']:%H:%M} "
                              f"({e['Readings']} readings, raw {e['Min raw']:g}…{e['Max raw']:g}) – excluded."))
    crit = any(s == "critical" for s, _ in f)
    r.verdict = "NON-CONFORMING" if crit else ("CONFORMING WITH OBSERVATIONS"
                                               if any(s == "warning" for s, _ in f) else "CONFORMING")
