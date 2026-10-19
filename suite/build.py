"""Build CALOR.html, the main application: one file with a navigation bar that
runs Organization_Personnel.html, Work_Instructions.html, Production_Report.html, Load_Build_Fixturing.html, Trap_Points.html, Process_Specifications.html,
SCADA_Review_2.html, Furnace_Operations.html, Quench_Media_Testing.html, Hardness_Metallurgical_Testing.html, Control_Plan_PFMEA.html,
Thermocouple_SAT_PDCA.html, Temperature_Uniformity_Survey.html and
Equipment_Qualification.html as pages


Each application stays a standalone file and is embedded unchanged as the srcdoc
of a same-origin frame, so all share the browser's storage and the HTQ bridge.

    python suite/build.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHELL = ROOT / "suite" / "shell.html"
APPS = {"/*@ORG@*/": ROOT / "Organization_Personnel.html",
        "/*@WI@*/": ROOT / "Work_Instructions.html",
        "/*@MON@*/": ROOT / "Monitoring_Review.html",
        "/*@PROD@*/": ROOT / "Production_Report.html",
        "/*@LOAD@*/": ROOT / "Load_Build_Fixturing.html",
        "/*@TRAP@*/": ROOT / "Trap_Points.html",
        "/*@SPEC@*/": ROOT / "Process_Specifications.html",
        "/*@SCADA@*/": ROOT / "SCADA_Review_2.html",  # SCADA Review 2 replaced the earlier SCADA review
        "/*@OPS@*/": ROOT / "Furnace_Operations.html",
        "/*@QUENCH@*/": ROOT / "Quench_Media_Testing.html",
        "/*@METAL@*/": ROOT / "Hardness_Metallurgical_Testing.html",
        "/*@TREND@*/": ROOT / "Trend_Analysis.html",
        "/*@CPF@*/": ROOT / "Control_Plan_PFMEA.html",
        "/*@SAT@*/": ROOT / "Thermocouple_SAT_PDCA.html",
        "/*@TUS@*/": ROOT / "Temperature_Uniformity_Survey.html",
        "/*@EQUIP@*/": ROOT / "Equipment_Qualification.html"}
OUT = ROOT / "CALOR.html"


THEME = ROOT / "suite" / "calor-theme.css"
FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700'
         '&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">')


def themed(html: str) -> str:
    """The page with the CALOR theme (the MSA Manager look) added to its <head>.

    The theme's selectors carry extra specificity, so placing it before the page's own
    styles is fine; the standalone page files are not changed."""
    assert "<head>" in html, "page has no <head>"
    css = THEME.read_text(encoding="utf-8")
    return html.replace("<head>", f'<head>{FONTS}<style id="calor-theme">\n{css}</style>', 1)


def embed(path: Path) -> str:
    """JSON string that is safe inside <script type="application/json">."""
    text = json.dumps(themed(path.read_text(encoding="utf-8")), ensure_ascii=False)
    # keep the HTML parser from ending or escaping the script element early
    return text.replace("</", "<\\/").replace("<!--", "<\\u0021--")


def main() -> None:
    html = SHELL.read_text(encoding="utf-8")
    for marker, path in APPS.items():
        assert html.count(marker) == 1, f"{marker} missing in {SHELL.name}"
        html = html.replace(marker, embed(path))
    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT.name} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
