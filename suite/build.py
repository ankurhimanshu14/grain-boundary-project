"""Build CALOR.html, the main application: one file with a navigation bar that
runs Pusher_Furnace_SCADA_Review.html, Quench_Media_Testing.html and
Thermocouple_SAT_PDCA.html as pages
(Production_Report.html is kept separate until it is finished).

Each application stays a standalone file and is embedded unchanged as the srcdoc
of a same-origin frame, so all share the browser's storage and the HTQ bridge.

    python suite/build.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHELL = ROOT / "suite" / "shell.html"
APPS = {"/*@SCADA@*/": ROOT / "Pusher_Furnace_SCADA_Review.html",
        "/*@QUENCH@*/": ROOT / "Quench_Media_Testing.html",
        "/*@SAT@*/": ROOT / "Thermocouple_SAT_PDCA.html"}
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
