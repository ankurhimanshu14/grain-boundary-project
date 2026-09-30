"""Builds ../furnace_analyzer.html: one offline file (SheetJS + example data inlined)."""
from pathlib import Path
d = Path(__file__).parent
src = (d / "src.html").read_text(encoding="utf-8")
lib = (d / "xlsx.mini.min.js").read_text(encoding="utf-8").replace("</script", "<\\/script")
ex = (d / "example.json").read_text(encoding="utf-8")
out = src.replace("/*XLSX*/", lib, 1).replace("/*EXAMPLE*/", ex, 1)
(d.parent / "furnace_analyzer.html").write_text(out, encoding="utf-8")
