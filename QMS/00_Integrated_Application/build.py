"""Build the single-file CALOR Quality System from src/ and the module sources.

    python QMS/00_Integrated_Application/build.py

Output: QMS/00_Integrated_Application/calor-quality-system.html (generated: edit the sources).
"""
import json, pathlib

HERE = pathlib.Path(__file__).resolve().parent
QMS = HERE.parent
SRC = HERE / "src"
OUT = HERE / "calor-quality-system.html"
# module code -> (module source, document folder under QMS/)
MODULES = {"org": (QMS / "ORG/04_Application/mwspl-org-module.js", "ORG"),
           "scada": (QMS / "SCADA/04_Application/mwspl-scada-module.js", "SCADA"),
           "spec": (QMS / "SPEC/04_Application/mwspl-spec-module.js", "SPEC"),
           "tc": (QMS / "TC/04_Application/mwspl-tc-module.js", "TC")}

def body(src):
    """The module source; a module may embed its sample data (04_Application/sample.json) at /*@SAMPLE@*/null."""
    text = src.read_text(encoding="utf-8")
    sample = src.parent / "sample.json"
    if "/*@SAMPLE@*/null" in text and sample.exists():
        text = text.replace("/*@SAMPLE@*/null", sample.read_text(encoding="utf-8").replace("</", "<\\/"), 1)
    return text

def wrap(code, src):
    """Each module runs in its own scope; its listeners only act while it is the open module."""
    return ("<script>\n/* ---------- module %s ---------- */\n(function(location){\"use strict\";\n"
            "const ACTIVE=()=>MWS.app===%s;\n"
            "const onDoc=(t,f)=>document.addEventListener(t,e=>{if(ACTIVE())return f(e);});\n"
            "const onWin=(t,f)=>window.addEventListener(t,e=>{if(ACTIVE())return f(e);});\n"
            "%s\n})(MWS.loc(%s));\n</script>\n") % (code, json.dumps(code), body(src), json.dumps(code))

def main():
    head = (SRC / "shell-head.html").read_text(encoding="utf-8")
    css = (SRC / "app.css").read_text(encoding="utf-8")
    html = head.replace("{{CSS}}", css)
    docs = {}
    for code, (src, folder) in MODULES.items():
        for p in sorted((QMS / folder).rglob("*.md")):
            docs[p.relative_to(QMS).as_posix()] = p.read_text(encoding="utf-8")
    # "</" would end the script element
    blob = json.dumps(docs, ensure_ascii=False).replace("</", "<\\/")
    html += "<script>MWS.docs=%s;</script>\n" % blob
    for code, (src, _) in MODULES.items():
        html += wrap(code, src)
    html += "<script>\n%s</script>\n</body></html>\n" % (SRC / "shell-tail.js").read_text(encoding="utf-8")
    OUT.write_text(html, encoding="utf-8")
    print("wrote", OUT.relative_to(QMS.parent), "%d KB" % (len(html.encode()) // 1024), "docs:", len(docs))

if __name__ == "__main__":
    main()
