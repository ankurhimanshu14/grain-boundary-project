"""Self-contained, print-ready HTML report (A4)."""
from __future__ import annotations

import base64
import html
from datetime import datetime

import numpy as np
import pandas as pd

from .analysis import ZONE_TRAYS, Result

CSS = """
*{box-sizing:border-box} body{font-family:Segoe UI,Arial,sans-serif;color:#111;margin:0;padding:18px;font-size:12px}
h1{font-size:20px;margin:0} h2{font-size:14px;border-bottom:2px solid #333;padding-bottom:3px;margin:18px 0 8px}
.hdr{display:flex;justify-content:space-between;border-bottom:3px solid #222;padding-bottom:8px;margin-bottom:10px}
table{border-collapse:collapse;width:100%;margin:4px 0} th,td{border:1px solid #999;padding:3px 5px;text-align:right}
th{background:#eee} td:first-child,th:first-child{text-align:left}
.kv td{text-align:left} .kv td:first-child{font-weight:600;width:22%;background:#f6f6f6}
.v{display:inline-block;padding:6px 14px;font-weight:700;font-size:15px;border:2px solid;border-radius:4px}
.NON-CONFORMING{color:#b00020;background:#fde8ea;border-color:#b00020}
.CONFORMING{color:#0a6b2d;background:#e3f6ea;border-color:#0a6b2d}
.CONFORMING-WITH-OBSERVATIONS{color:#8a5a00;background:#fff3d6;border-color:#8a5a00}
.PASS{color:#0a6b2d;font-weight:700} .FAIL{color:#b00020;font-weight:700}
.critical{color:#b00020} .warning{color:#8a5a00} .info{color:#333}
li{margin:2px 0} figure{margin:8px 0;page-break-inside:avoid} figure img{width:100%}
figcaption{font-size:11px;color:#444} .sign td{height:42px;text-align:left}
.small{font-size:10px;color:#555} .noprint{margin-bottom:10px}
@media print{.noprint{display:none} body{padding:0} h2{page-break-after:avoid} table{page-break-inside:avoid}}
@page{size:A4;margin:12mm}
"""


def _e(x) -> str:
    return html.escape(str(x))


def _fmt(v, nd=1):
    if v is None or (isinstance(v, float) and np.isnan(v)) or v is pd.NaT:
        return "–"
    if isinstance(v, (pd.Timestamp, datetime)):
        return f"{v:%H:%M:%S}"
    if isinstance(v, (int, np.integer)):
        return str(v)
    if isinstance(v, (float, np.floating)):
        return f"{v:.{nd}f}"
    return _e(v)


def _table(df: pd.DataFrame, cols: list[str], nd: dict[str, int] | None = None) -> str:
    nd = nd or {}
    h = "".join(f"<th>{_e(c)}</th>" for c in cols)
    body = ""
    for _, r in df.iterrows():
        tds = ""
        for c in cols:
            v = r.get(c)
            if c == "Verdict":
                cls = "PASS" if v == "PASS" else "FAIL" if v == "FAIL" else ""
                tds += f'<td class="{cls}">{_e(v)}</td>'
            elif c in ("Readings", "Excursions", "Samples", "Trays") and isinstance(v, (int, float, np.number)) and not pd.isna(v):
                tds += f"<td>{int(v)}</td>"
            else:
                tds += f"<td>{_fmt(v, nd.get(c, 1))}</td>"
        body += f"<tr>{tds}</tr>"
    return f"<table><tr>{h}</tr>{body}</table>"


def build_report(r: Result, plots: dict[str, bytes], info: dict[str, str] | None = None,
                 print_button: bool = True) -> str:
    info = info or {}
    p, df = r.params, r.df
    t0, t1 = df["t"].iat[0], df["t"].iat[-1]
    vcls = r.verdict.replace(" ", "-")
    meta_rows = [
        ("Company", info.get("company") or r.meta.get("company", "")),
        ("Furnace", info.get("furnace") or r.meta.get("title", "")),
        ("Part / job / tray load", info.get("part", "")),
        ("Data period", f"{t0:%d-%b-%Y %H:%M:%S} → {t1:%d-%b-%Y %H:%M:%S}"),
        ("Sampling interval", f"{r.interval_s:.0f} s ({len(df)} records)"),
        ("Furnace", "Continuous pusher, gas-fired; 3 zones (5 + 4 + 4 = 13 trays); 6 burners; 6 TCs (L/R per zone)"),
        ("Acceptance", f"Production SET {r.main_sp:g} °C, tolerance ±{p.tolerance:g} °C, "
                       f"≥ {p.min_in_band_pct:g}% readings in band, first {p.settle_min:g} min after SET reached ignored; "
                       "plots limited to 500–1000 °C"),
    ]
    kv = "".join(f"<tr><td>{_e(k)}</td><td>{_e(v)}</td></tr>" for k, v in meta_rows)
    fnd = "".join(f'<li class="{s}"><b>{s.upper()}:</b> {_e(t)}</li>' for s, t in r.findings) or "<li>No findings.</li>"

    tcc = ["TC", "Status", "Readings", "Mean (°C)", "Min (°C)", "Max (°C)", "Mean dev (°C)",
           "Min dev (°C)", "Max dev (°C)", "In band %", "Longest excursion min", "Excursions", "Verdict"]
    tc_tab = _table(r.tc_table, tcc)
    zc = [c for c in r.zone_table.columns]
    z_tab = _table(r.zone_table, zc)
    fu = r.furnace
    if fu.get("samples"):
        fu_html = (f"<table class='kv'><tr><td>Samples with all working TCs in production</td><td>{fu['samples']}</td></tr>"
                   f"<tr><td>Mean spread</td><td>{fu['mean_spread']:.1f} °C</td></tr>"
                   f"<tr><td>Max spread</td><td>{fu['max_spread']:.0f} °C</td></tr>"
                   f"<tr><td>Time within {fu['spread_limit']:g} °C spread</td><td>{fu['pct_spread_ok']:.1f}%</td></tr></table>")
    else:
        fu_html = "<p>Not computed (no simultaneous production data).</p>"
    q = r.quality
    q_html = (_table(q.assign(Verdict=""), ["TC", "From", "To", "Readings", "Min raw", "Max raw", "Reason"], {"Min raw": 0, "Max raw": 0})
              if len(q) else "<p>No invalid readings.</p>")
    q_html = q_html.replace("<th>Verdict</th>", "")
    gaps = ("<ul>" + "".join(f"<li>{a:%H:%M:%S} → {b:%H:%M:%S} ({(b - a).total_seconds() / 60:.0f} min)</li>"
                             for a, b in r.gaps) + "</ul>") if r.gaps else "<p>None.</p>"
    figs = "".join(
        f'<figure><img src="data:image/png;base64,{base64.b64encode(b).decode()}"><figcaption>{_e(k)}</figcaption></figure>'
        for k, b in plots.items())
    btn = '<div class="noprint"><button onclick="window.print()" style="padding:6px 14px;font-size:14px">🖨 Print report</button></div>' if print_button else ""
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>CQI-9 Furnace Temperature Report</title>
<style>{CSS}</style></head><body>{btn}
<div class="hdr"><div><h1>CQI-9 Furnace Temperature Analysis Report</h1>
<div>SCADA temperature vs time – {_e(info.get('furnace') or r.meta.get('title', ''))}</div></div>
<div style="text-align:right"><span class="v {vcls}">{_e(r.verdict)}</span>
<div class="small">Generated {datetime.now():%d-%b-%Y %H:%M}</div></div></div>
<table class="kv">{kv}</table>
<h2>1. Findings</h2><ul>{fnd}</ul>
<h2>2. Thermocouple performance in production window (PV vs SET {r.main_sp:g} °C, ±{p.tolerance:g} °C)</h2>{tc_tab}
<h2>3. Left / Right balance per zone</h2>{z_tab}
<h2>4. Furnace-wide spread</h2>{fu_html}
<h2>5. Charts</h2>{figs}
<h2>6. Data quality</h2><b>Invalid / excluded readings (outside 500–1000 °C or sensor recovery)</b>{q_html}
<b>Data gaps (&gt; {p.gap_factor:g}× sampling interval)</b>{gaps}
<h2>7. Sign-off</h2><table class="sign"><tr><th>Prepared by</th><th>Reviewed by (CQI-9 Champion)</th><th>Approved by</th></tr>
<tr><td>Name / Date:</td><td>Name / Date:</td><td>Name / Date:</td></tr></table>
<p class="small">Method: readings outside 500–1000 °C are treated as invalid and excluded from statistics and plots.
Deviation = PV − SET for each thermocouple's own SET. Verdicts are calculated from SCADA controller PVs; they do not replace
a system accuracy test (SAT) or temperature uniformity survey (TUS) with calibrated test instruments.</p>
</body></html>"""
