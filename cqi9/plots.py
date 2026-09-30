"""Charts. All temperature axes are hard-limited to 500-1000 degC and invalid
readings (outside that window) are never drawn."""
from __future__ import annotations

import io

import matplotlib
matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np

from .analysis import SIDE, T_MAX, T_MIN, ZONES, Result, tc_name

COLORS = {1: "#1f77b4", 2: "#d62728", 3: "#2ca02c", 4: "#ff7f0e", 5: "#9467bd", 6: "#8c564b"}
HFMT = mdates.DateFormatter("%H:%M")


def _png(fig) -> bytes:
    b = io.BytesIO()
    fig.savefig(b, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    return b.getvalue()


def _line(ax, t, y, **kw):
    ax.plot(t, y.where(y.between(T_MIN, T_MAX)) if hasattr(y, "where") else y, **kw)


def _gaps(ax, r: Result):
    for a, b in r.gaps:
        ax.axvspan(a, b, color="0.85", zorder=0)


def _temp_axes(ax, r: Result):
    ax.set_ylim(T_MIN, T_MAX)
    ax.set_ylabel("Temperature (°C)")
    ax.grid(alpha=.3)
    ax.xaxis.set_major_formatter(HFMT)
    ax.set_xlim(r.df["t"].iat[0], r.df["t"].iat[-1])
    _gaps(ax, r)


def _band(ax, r: Result):
    df, tol = r.df, r.params.tolerance
    sp = df[[f"SET-{n}" for n in r.in_service]].median(axis=1)
    m = (sp == r.main_sp)
    ax.fill_between(df["t"], r.main_sp - tol, r.main_sp + tol, where=m, color="#2ca02c",
                    alpha=.12, label=f"SET ±{tol:g} °C", step="post")


def plot_overview(r: Result) -> bytes:
    df = r.df
    fig, ax = plt.subplots(figsize=(11, 5))
    _band(ax, r)
    for n in r.in_service:
        _line(ax, df["t"], df[f"PV-{n}"], lw=1, color=COLORS[n], label=tc_name(n))
    _line(ax, df["t"], df[f"SET-{r.in_service[0]}"], lw=1.4, color="k", ls="--", drawstyle="steps-post", label="SET")
    _temp_axes(ax, r)
    ax.set_xlabel("Time (grey = SCADA data gap)")
    ax.set_title("All thermocouples vs time (valid range 500–1000 °C)")
    ax.legend(ncol=4, fontsize=8, loc="lower right")
    return _png(fig)


def plot_zones(r: Result) -> bytes:
    df = r.df
    fig, axs = plt.subplots(3, 1, figsize=(11, 10), sharex=True)
    for ax, (z, tcs) in zip(axs, ZONES.items()):
        _band(ax, r)
        for n in tcs:
            if n in r.in_service:
                _line(ax, df["t"], df[f"PV-{n}"], lw=1.1, color=COLORS[n], label=f"{tc_name(n)} PV")
            else:
                ax.plot([], [], color=COLORS[n], label=f"{tc_name(n)} – OFFLINE (no data)")
        sets = [n for n in tcs if n in r.in_service]
        if sets:
            _line(ax, df["t"], df[f"SET-{sets[0]}"], lw=1.3, color="k", ls="--", drawstyle="steps-post", label="SET")
        _temp_axes(ax, r)
        ax.set_title(f"Zone {z}", loc="left", fontsize=10, fontweight="bold")
        ax.legend(fontsize=8, loc="lower right", ncol=3)
    axs[-1].set_xlabel("Time")
    fig.tight_layout()
    return _png(fig)


def plot_deviation(r: Result) -> bytes:
    df, tol = r.df, r.params.tolerance
    fig, ax = plt.subplots(figsize=(11, 4.5))
    ax.axhspan(-tol, tol, color="#2ca02c", alpha=.12)
    for n in r.in_service:
        m = r.prod[n]
        ax.plot(df["t"], (df[f"PV-{n}"] - df[f"SET-{n}"]).where(m), lw=1, color=COLORS[n], label=tc_name(n))
    ax.axhline(tol, color="g", lw=.8); ax.axhline(-tol, color="g", lw=.8)
    ax.axhline(0, color="k", lw=.6)
    ax.xaxis.set_major_formatter(HFMT); ax.grid(alpha=.3)
    ax.set_xlim(df["t"].iat[0], df["t"].iat[-1]); _gaps(ax, r)
    ax.set_ylabel("PV − SET (°C)"); ax.set_xlabel("Time")
    ax.set_title(f"Deviation from SET – production window only (green = ±{tol:g} °C)")
    ax.legend(ncol=3, fontsize=8, loc="lower right")
    return _png(fig)


def plot_uniformity(r: Result) -> bytes:
    df, p = r.df, r.params
    fig, axs = plt.subplots(2, 1, figsize=(11, 7), sharex=True)
    ax = axs[0]
    for z, (l, rt) in ZONES.items():
        if l in r.in_service and rt in r.in_service:
            m = r.prod[l] & r.prod[rt]
            ax.plot(df["t"], (df[f"PV-{l}"] - df[f"PV-{rt}"]).where(m), lw=1, label=f"Zone {z} (L − R)")
    ax.axhspan(-p.lr_limit, p.lr_limit, color="#2ca02c", alpha=.12)
    ax.set_ylabel("Left − Right (°C)"); ax.grid(alpha=.3); _gaps(ax, r)
    ax.set_title(f"Left/right difference per zone (green = ±{p.lr_limit:g} °C)")
    ax.legend(fontsize=8)
    ax = axs[1]
    sp = r.furnace.get("spread")
    if sp is not None and len(sp):
        ax.plot(df.loc[sp.index, "t"], sp, color="#444", lw=1, label="Hottest − coldest working TC")
    ax.axhline(2 * p.tolerance, color="g", lw=1, ls="--", label=f"Limit 2×tol = {2 * p.tolerance:g} °C")
    ax.set_ylabel("Furnace spread (°C)"); ax.grid(alpha=.3); _gaps(ax, r)
    ax.set_title("Furnace-wide spread between working thermocouples")
    ax.xaxis.set_major_formatter(HFMT); ax.set_xlim(df["t"].iat[0], df["t"].iat[-1])
    ax.set_xlabel("Time"); ax.legend(fontsize=8)
    fig.tight_layout()
    return _png(fig)


def all_plots(r: Result) -> dict[str, bytes]:
    return {"Overview – all thermocouples": plot_overview(r),
            "Per-zone temperature (Left / Right)": plot_zones(r),
            "Deviation from SET": plot_deviation(r),
            "Uniformity – L/R difference and furnace spread": plot_uniformity(r)}
