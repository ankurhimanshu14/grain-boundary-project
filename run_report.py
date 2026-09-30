"""CLI: python run_report.py data.xlsx [out.html]"""
import sys

from cqi9.analysis import Params, analyse, load_scada
from cqi9.plots import all_plots
from cqi9.report import build_report

src, out = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "report.html")
df, meta = load_scada(src)
r = analyse(df, meta, Params())
open(out, "w", encoding="utf-8").write(build_report(r, all_plots(r)))
print(out, r.verdict)
