# CQI-9 Furnace Temperature Analyzer

Upload a SCADA Excel export (Date, Time, SET-1/PV-1 … SET-6/PV-6) from the 3-zone continuous pusher furnace and get a CQI-9 style analysis plus a printable report.

```bash
pip install -r requirements.txt
streamlit run app.py          # upload the .xlsx in the browser
python run_report.py sample_data/furnace4_2026-09-29.xlsx report.html   # CLI alternative
pytest
```

Report tab → **Download** the HTML and print (Ctrl+P, "Save as PDF" if needed).

## Rules implemented
- TC1/2 = Zone 1, TC3/4 = Zone 2, TC5/6 = Zone 3 (odd = Left, even = Right). Trays 5/4/4.
- **500–1000 °C only**: readings outside are invalid, never plotted, and listed in Data quality (offline = 0, 32767 sensor fault, etc.). Readings that are still far from SET within N min of a sensor fault are treated as instrument recovery.
- Deviation = PV − SET for each TC's own SET. Production window = time at the main SET, after a settling period.
- Per TC: mean/min/max, deviation, % in band (± CQI-9 class), excursions; per zone Left−Right; furnace-wide spread; data gaps; offline thermocouples.
- Verdict NON-CONFORMING / CONFORMING WITH OBSERVATIONS / CONFORMING.

Defaults (Class 5 ±14 °C, 60 min settling, 100 % in band, L−R and spread limits = 2×tolerance) are adjustable in the sidebar — **confirm against your process table / customer requirement**. SCADA PVs do not replace SAT/TUS with calibrated instruments.

## Standalone version (no Python needed)
`furnace_analyzer.html` is a single offline file (Excel reader inlined). Double-click it, drop the SCADA `.xlsx` on the page, adjust criteria, then **Print report** or **Download report (HTML)**. Rebuild after editing with `python standalone/build.py` (edits go in `standalone/src.html`).
