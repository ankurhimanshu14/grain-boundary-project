"""Streamlit app: upload SCADA Excel -> CQI-9 analysis -> printable report.
Run:  streamlit run app.py
"""
import streamlit as st
import streamlit.components.v1 as components

from cqi9.analysis import FURNACE_CLASSES, Params, T_MAX, T_MIN, analyse, load_scada
from cqi9.plots import all_plots
from cqi9.report import build_report

st.set_page_config(page_title="CQI-9 Furnace Analyzer", layout="wide", page_icon="🔥")
st.title("🔥 CQI-9 Furnace Temperature Analyzer")
st.caption("Continuous pusher furnace · 3 zones · 6 burners · 6 thermocouples · "
           f"valid/plotted range {T_MIN:.0f}–{T_MAX:.0f} °C")

with st.sidebar:
    st.header("Acceptance criteria")
    cls = st.selectbox("CQI-9 furnace class (uniformity)", [*FURNACE_CLASSES, "Custom"], index=4,
                       help="Confirm the class required by your CQI-9 process table / customer.")
    tol = st.number_input("Tolerance ± °C", 1.0, 100.0,
                          FURNACE_CLASSES.get(cls, 14.0), 0.5, disabled=cls != "Custom")
    tol = FURNACE_CLASSES.get(cls, tol)
    settle = st.number_input("Settling time after SET reached (min)", 0, 600, 60, 5)
    minpct = st.slider("Min % readings in band", 50, 100, 100)
    recov = st.number_input("Sensor recovery exclusion (min)", 0, 120, 20, 5,
                            help="Out-of-band readings this long after a sensor fault are treated as instrument recovery.")
    st.header("Report header")
    info = {"company": st.text_input("Company"), "furnace": st.text_input("Furnace"),
            "part": st.text_input("Part / job / tray load")}

up = st.file_uploader("Upload SCADA Excel (.xlsx)", type=["xlsx"])
if not up:
    st.info("Upload the SCADA export (Date, Time, SET-1/PV-1 … SET-6/PV-6). "
            "TC1/TC2 = Zone 1, TC3/TC4 = Zone 2, TC5/TC6 = Zone 3 (odd = Left, even = Right).")
    st.stop()

try:
    df, meta = load_scada(up)
    r = analyse(df, meta, Params(tolerance=tol, settle_min=settle, min_in_band_pct=minpct, recovery_min=recov))
except Exception as e:  # noqa: BLE001
    st.error(f"Could not analyse file: {e}")
    st.stop()

plots = all_plots(r)
color = {"NON-CONFORMING": "red", "CONFORMING": "green"}.get(r.verdict, "orange")
st.markdown(f"### Overall: :{color}[{r.verdict}]")
c = st.columns(4)
c[0].metric("Production SET", f"{r.main_sp:g} °C")
c[1].metric("Tolerance", f"±{tol:g} °C")
c[2].metric("TCs in service", f"{len(r.in_service)} / 6")
c[3].metric("Data gaps", len(r.gaps))

t1, t2, t3, t4 = st.tabs(["Findings & tables", "Charts", "Data quality", "🖨 Printable report"])
with t1:
    for s, t in r.findings:
        {"critical": st.error, "warning": st.warning, "info": st.info}[s](t)
    st.subheader("Thermocouples"); st.dataframe(r.tc_table.drop(columns=["n"]), hide_index=True)
    st.subheader("Left/Right per zone"); st.dataframe(r.zone_table, hide_index=True)
with t2:
    for k, b in plots.items():
        st.subheader(k); st.image(b)
with t3:
    st.dataframe(r.quality, hide_index=True)
    st.write("Gaps:", [f"{a:%H:%M:%S}→{b:%H:%M:%S}" for a, b in r.gaps] or "none")
with t4:
    rep = build_report(r, plots, info)
    st.download_button("⬇ Download report (HTML – open & print / save as PDF)", rep,
                       file_name=f"CQI9_report_{r.df['t'].iat[0]:%Y%m%d}.html", mime="text/html")
    components.html(rep, height=900, scrolling=True)
