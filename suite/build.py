"""Build Heat_Treat_Quality_Suite.html: one file with a navigation bar that runs
Pusher_Furnace_SCADA_Review.html and Thermocouple_SAT_PDCA.html as pages.

Each application stays a standalone file and is embedded unchanged as the srcdoc
of a same-origin frame, so both share the browser's storage and the HTQ bridge.

    python suite/build.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHELL = ROOT / "suite" / "shell.html"
APPS = {"/*@SCADA@*/": ROOT / "Pusher_Furnace_SCADA_Review.html",
        "/*@SAT@*/": ROOT / "Thermocouple_SAT_PDCA.html"}
OUT = ROOT / "Heat_Treat_Quality_Suite.html"


def embed(path: Path) -> str:
    """JSON string that is safe inside <script type="application/json">."""
    text = json.dumps(path.read_text(encoding="utf-8"), ensure_ascii=False)
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
