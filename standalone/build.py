"""Builds ../furnace_analyzer.html: a single offline file (SheetJS inlined)."""
from pathlib import Path
d = Path(__file__).parent
src = (d / "src.html").read_text(encoding="utf-8")
lib = (d / "xlsx.mini.min.js").read_text(encoding="utf-8").replace("</script", "<\\/script")
(d.parent / "furnace_analyzer.html").write_text(src.replace("/*XLSX*/", lib, 1), encoding="utf-8")
