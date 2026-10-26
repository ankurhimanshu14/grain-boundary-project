"""Daily production report format (Excel) for the pusher furnace line, MWSPL-F-PROD-01."""
import datetime as dt, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from openpyxl.comments import Comment
from openpyxl.utils import get_column_letter as L

OUT = sys.argv[1]
N = 300                      # tray rows
NB = 60                      # batch rows
NH = 40                      # hold rows
NP = 40                      # parameter change rows
NS = 40                      # part rows

F = "Arial"
f_t = Font(name=F, size=14, bold=True)
f_h = Font(name=F, size=9, bold=True, color="FFFFFF")
f_b = Font(name=F, size=9)
f_in = Font(name=F, size=9, color="0000FF")
f_bold = Font(name=F, size=9, bold=True)
f_note = Font(name=F, size=8, italic=True, color="595959")
fill_h = PatternFill("solid", fgColor="1D5B78")
fill_in = PatternFill("solid", fgColor="FFF7CC")
fill_calc = PatternFill("solid", fgColor="EEF2F0")
fill_sec = PatternFill("solid", fgColor="DCE6EA")
thin = Side(style="thin", color="BFC7C3")
box = Border(left=thin, right=thin, top=thin, bottom=thin)
wrap = Alignment(wrap_text=True, vertical="top")
center = Alignment(horizontal="center", vertical="center", wrap_text=True)

DT = "dd-mmm-yy hh:mm"
D = "dd-mmm-yyyy"

wb = Workbook()

def header(ws, row, cols, height=30):
    for i, (t, w) in enumerate(cols, 1):
        c = ws.cell(row=row, column=i, value=t)
        c.font, c.fill, c.alignment, c.border = f_h, fill_h, center, box
        ws.column_dimensions[L(i)].width = w
    ws.row_dimensions[row].height = height

def cell(ws, ref, v=None, kind="calc", fmt=None, bold=False):
    c = ws[ref]
    if v is not None:
        c.value = v
    c.font = f_in if kind == "in" else (f_bold if bold else f_b)
    if kind == "in":
        c.fill = fill_in
    elif kind == "calc":
        c.fill = fill_calc
    c.border = box
    if fmt:
        c.number_format = fmt
    c.alignment = Alignment(vertical="top", wrap_text=kind == "text")
    return c

def title(ws, text, sub):
    ws["A1"] = "MASS WIRE AND STEELS PVT. LTD., BHIWADI"
    ws["A1"].font = Font(name=F, size=9, bold=True, color="595959")
    ws["A2"] = text
    ws["A2"].font = f_t
    ws["A3"] = sub
    ws["A3"].font = f_note

# ------------------------------------------------------------------ Settings & lists
st = wb.active
st.title = "Settings"
title(st, "Settings and lists", "Site rules used by the formulas. Confirm against the process specifications in force; change only with the HT Manager's approval.")
header(st, 5, [("Setting", 46), ("Value", 14), ("Unit", 10), ("Source / note", 70)])
SET = [
    ("Production day starts at", dt.time(8, 0), "hh:mm", "Plant rule: a tray counts in the day in which it leaves the tempering chamber, from 08:00 to 08:00 the next day."),
    ("Hardening chamber tray positions", 13, "trays", "Plant layout (5 / 4 / 4 per zone). At each push the 13th tray leaves the hardening chamber."),
    ("Tempering chamber tray positions", 12, "trays", "Plant layout (4 / 4 / 4 per zone). Leaves at the push that brings the 26th position."),
    ("Transfer hardening → tempering (HT, normalizing)", 18, "min", "Measured and confirmed: push 9 min, out of hardening 06:03, into tempering 06:21."),
    ("Maximum net load per tray", 200, "kg", "HK-grade cast trays, maximum 200 kg."),
    ("Exit time tolerance (actual vs calculated)", 5, "min", "Site rule: a larger difference means the timing in the report is off (start, push, push changes, holds)."),
]
for i, (a, v, u, n) in enumerate(SET, 6):
    cell(st, f"A{i}", a, "label")
    cell(st, f"B{i}", v, "in", "hh:mm" if isinstance(v, dt.time) else "0")
    cell(st, f"C{i}", u, "label")
    cell(st, f"D{i}", n, "text")
NAMES = {"daystart": "Settings!$B$6", "posH": "Settings!$B$7", "posT": "Settings!$B$8", "xfer": "Settings!$B$9", "kgmax": "Settings!$B$10", "tol": "Settings!$B$11"}

LISTS = {
    "Furnace": ["F-01", "F-02", "F-03", "F-04"],
    "Tray type": ["Loaded", "Mixed", "Empty"],
    "Process": ["HT", "IA", "NORM"],
    "Hold reason": ["Quench media out of limits", "Temperature excursion / alarm", "Burner / flame failure", "Power failure", "Pusher / extractor breakdown",
                    "Controlled cooling fault", "Material not available", "Planned stop / maintenance", "Other"],
    "Parameter": ["Push time", "Hardening set value", "Tempering set value", "Controlled cooling", "Quench (temperature / agitation)", "Dip time", "Other"],
    "Zone": ["Zone 1", "Zone 2", "Zone 3", "All zones"],
}
r0 = 14
st.cell(row=r0 - 1, column=1, value="Drop-down lists (add entries at the end of a column)").font = f_bold
for j, (name, vals) in enumerate(LISTS.items(), 1):
    c = st.cell(row=r0, column=j, value=name)
    c.font, c.fill, c.border, c.alignment = f_h, fill_h, box, center
    for k, v in enumerate(vals, 1):
        x = st.cell(row=r0 + k, column=j, value=v)
        x.font, x.border = f_in, box
for j in range(5, 7):
    st.column_dimensions[L(j)].width = max(st.column_dimensions[L(j)].width or 0, 30)
LREF = {name: f"Settings!${L(j)}${r0+1}:${L(j)}${r0+20}" for j, name in enumerate(LISTS, 1)}
st.freeze_panes = "A6"

def dv_list(ws, rng, name):
    d = DataValidation(type="list", formula1=LREF[name], allow_blank=True)
    ws.add_data_validation(d)
    d.add(rng)

# ------------------------------------------------------------------ Parts & specifications
ps = wb.create_sheet("Parts")
title(ps, "Parts and specifications in force", "One row per part: copy from the process specification in force (MWSPL-QP-SPEC-01). The tray log and the batches look the values up by part number.")
PC = [("Part no.", 14), ("Part name", 22), ("Process\n(HT / IA / NORM)", 11), ("Specification\n(no. / rev)", 15), ("Pieces per\ntray", 10), ("Part weight\n(kg)", 10),
      ("Push time\n(min)", 9), ("Gap hardening →\ntempering (min)", 13), ("Hardening set\nZ1 / Z2 / Z3 (°C)", 18), ("Tempering set\nZ1 / Z2 / Z3 (°C)", 18), ("Note", 36)]
header(ps, 5, PC, 42)
EXP = [("EX-1001", "Example shaft", "HT", "PS-0001 rev 1", 60, 1.8, 9, None, "840 / 870 / 870", "560 / 580 / 580", "Example: oil quench on F-02."),
       ("EX-2001", "Example gear blank", "IA", "PS-0002 rev 0", 24, 3.5, 9, 7, "880 / 920 / 920", "640 / 650 / 650", "Example: controlled cooling cycle 7 min (cooling + transfers) within the push."),
       ("EX-3001", "Example flange", "NORM", "PS-0003 rev 0", 30, 2.2, 9, None, "720 / 740 / 740", "880 / 900 / 900", "Example: preheat in the hardening chamber, austenitize in the tempering chamber.")]
for i in range(6, 6 + NS):
    for j in range(1, 12):
        cell(ps, f"{L(j)}{i}", None, "calc" if j == 8 else "in", "0.0" if j == 6 else None)
    # gap: IA = the controlled cooling cycle typed in column H; HT / NORM = the fixed transfer
for i, row in enumerate(EXP, 6):
    for j, v in enumerate(row, 1):
        if j == 8:
            continue
        ps.cell(row=i, column=j, value=v)
    if row[7] is not None:
        ps.cell(row=i, column=8, value=row[7])
for i in range(6, 6 + NS):
    c = ps[f"H{i}"]
    if c.value is None:
        c.value = f'=IF(A{i}="","",IF(C{i}="IA","enter cycle",{NAMES["xfer"]}))'
    else:
        c.font, c.fill = f_in, fill_in
    ps[f"H{i}"].comment = None
ps["H5"].comment = Comment("HT and normalizing: the fixed transfer from Settings (formula). Isothermal annealing: type the controlled cooling cycle (cooling time + transfers, minutes) over the formula.", "MWSPL")
dv_list(ps, f"C6:C{5+NS}", "Process")
ps.freeze_panes = "B6"
PR = f"Parts!$A$6:$A${5+NS}"
def pcol(c): return f"Parts!${c}$6:${c}${5+NS}"

# ------------------------------------------------------------------ Report (cover + day summary)
rp = wb.create_sheet("Report", 0)
title(rp, "Daily production report: pusher furnace line", "Format MWSPL-F-PROD-01 rev 00 · one workbook per furnace and production day · enter the trays in the Tray log, the pauses of the push cycle in Holds, set-value / push changes in Parameter changes.")
for c, w in zip("ABCDEFGH", (34, 18, 4, 30, 18, 4, 26, 18)):
    rp.column_dimensions[c].width = w
def kv(r, label, ref_or_val, kind="in", fmt=None, col="A"):
    vcol = chr(ord(col) + 1)
    cell(rp, f"{col}{r}", label, "label").font = f_bold
    cell(rp, f"{vcol}{r}", ref_or_val, kind, fmt)
rp["A5"] = "Report identification"; rp["A5"].font = f_bold; rp["A5"].fill = fill_sec
kv(6, "Furnace", "F-02")
kv(7, "Production date (day of exit)", dt.date(2026, 10, 25), fmt=D)
kv(8, "Production day from", f"=B7+{NAMES['daystart']}", "calc", DT)
kv(9, "Production day to", "=B8+1", "calc", DT)
kv(10, "Report no.", "PR-0001")
kv(11, "Line start: first tray of the tray log enters", dt.datetime(2026, 10, 25, 6, 0), fmt=DT)
kv(12, "Push time at the start (min)", 9, fmt="0")
dv_list(rp, "B6", "Furnace")
rp["B11"].comment = Comment("Entry time of the first row of the Tray log. Later trays follow the push time, the push changes in the Push column and the holds, unless an actual entry time is typed.", "MWSPL")

rp["D5"] = "Production in this day (trays out of the tempering chamber)"; rp["D5"].font = f_bold; rp["D5"].fill = fill_sec
TL = "'Tray log'"
def tl(c): return f"{TL}!${c}$7:${c}${6+N}"
KP = [
    ("Trays out (loaded and mixed)", f'=COUNTIFS({tl("Y")},$B$7,{tl("B")},"Loaded")+COUNTIFS({tl("Y")},$B$7,{tl("B")},"Mixed")', "0"),
    ("Empty trays out (separators)", f'=COUNTIFS({tl("Y")},$B$7,{tl("B")},"Empty")', "0"),
    ("Pieces out", f'=SUMIFS({tl("J")},{tl("Y")},$B$7)+SUMIFS({tl("N")},{tl("Y")},$B$7)', "#,##0"),
    ("Net weight out (kg, calculated)", f'=SUMIFS({tl("R")},{tl("Y")},$B$7)', "#,##0"),
    ("  of which hardening & tempering (kg)", f'=SUMIFS({tl("R")},{tl("Y")},$B$7,{tl("O")},"HT")', "#,##0"),
    ("  of which isothermal annealing (kg)", f'=SUMIFS({tl("R")},{tl("Y")},$B$7,{tl("O")},"IA")', "#,##0"),
    ("  of which normalizing (kg)", f'=SUMIFS({tl("R")},{tl("Y")},$B$7,{tl("O")},"NORM")', "#,##0"),
    ("Rework trays out (re-heat-treatment)", f'=COUNTIFS({tl("Y")},$B$7,{tl("S")},"?*")', "0"),
    ("Trays with a check flag", f'=COUNTIFS({tl("Y")},$B$7,{tl("AA")},"?*")', "0"),
    ("Push cycle on hold in the day (min)", f"=SUMIFS(Holds!$F$7:$F${6+NH},Holds!$B$7:$B${6+NH},\">=\"&$B$8,Holds!$B$7:$B${6+NH},\"<\"&$B$9)", "0"),
    ("Holds still open (no restart time)", f'=COUNTIFS(Holds!$B$7:$B${6+NH},"<>",Holds!$C$7:$C${6+NH},"")', "0"),
    ("Parameter changes in the day", f"=COUNTIFS('Parameter changes'!$B$7:$B${6+NP},\">=\"&$B$8,'Parameter changes'!$B$7:$B${6+NP},\"<\"&$B$9)", "0"),
    ("Last tray out (calculated)", f'=IF(B6="","",_xlfn.MAXIFS({tl("W")},{tl("Y")},$B$7))', DT),
]
for i, (lab, f, fmt) in enumerate(KP, 6):
    cell(rp, f"D{i}", lab, "label")
    cell(rp, f"E{i}", f, "calc", fmt)
r = 6 + len(KP)
cell(rp, f"D{r}", "Last tray out (actual, from the unloading)", "label")
cell(rp, f"E{r}", dt.datetime(2026, 10, 25, 18, 22), "in", DT)
cell(rp, f"D{r+1}", "Difference actual − calculated (min)", "label")
cell(rp, f"E{r+1}", f'=IF(OR(E{r}="",E{r-1}="",E{r-1}=0),"",ROUND((E{r}-E{r-1})*1440,0))', "calc", "0")
cell(rp, f"D{r+2}", "Timing check", "label")
cell(rp, f"E{r+2}", f'=IF(E{r+1}="","",IF(ABS(E{r+1})<={NAMES["tol"]},"OK","Check start, push, push changes, holds"))', "calc")
rp.column_dimensions["E"].width = 22

rp["G5"] = "Sign-off"; rp["G5"].font = f_bold; rp["G5"].fill = fill_sec
SG = [("Entered by (shift operator)", "A. Kumar (example)"), ("Shift in-charge: shift A", ""), ("Shift in-charge: shift B", ""), ("Shift in-charge: shift C", ""),
      ("Checked by (Production Manager)", ""), ("Approved on", None), ("Remarks", "")]
for i, (a, v) in enumerate(SG, 6):
    cell(rp, f"G{i}", a, "label")
    cell(rp, f"H{i}", v, "in", D if a == "Approved on" else None)
rp.column_dimensions["H"].width = 24

rb = r + 4
rp[f"A{rb}"] = "Batches out in this day"; rp[f"A{rb}"].font = f_bold; rp[f"A{rb}"].fill = fill_sec
rp[f"A{rb+1}"] = "See the Batches sheet: one row per part + batch + heat (rework separately), with trays, pieces and kg out in this day, entry, calculated and actual last tray out, weighed weight."
rp[f"A{rb+1}"].font = f_note

leg = rb + 3
rp[f"A{leg}"] = "How to use this format"; rp[f"A{leg}"].font = f_bold; rp[f"A{leg}"].fill = fill_sec
LEG = [
    ("Yellow cells with blue text", "Entries. Type or pick from the drop-down."),
    ("Grey cells with black text", "Formulas: do not type over them (the gap of an isothermal annealing part on the Parts sheet is the one exception)."),
    ("Example rows", "Every sheet holds a few example rows (part numbers EX-…, names marked example). Delete them before the first real report."),
    ("1 · Parts", "Copy each part from its process specification in force: process, pieces per tray, part weight, push time, gap between the chambers."),
    ("2 · Report", "Furnace, production date, report no., the time the first tray of the tray log entered and the push time then."),
    ("3 · Tray log", "One row per tray in the order the trays enter the hardening chamber, including empty separator trays. A mixed tray uses the second part columns. Type an actual entry time only for a tray that entered off the push cycle; change the push time on the tray from which it changed."),
    ("4 · Holds", "Every pause of the push cycle (from, to, reason). The push timer stops during a hold: the formulas shift the following trays."),
    ("5 · Parameter changes", "Set value, push, controlled cooling or quench changes with time, from / to and reason."),
    ("6 · Batches", "One row per part + batch + heat; record the actual time the last tray of the batch left the tempering chamber and the weighed weight."),
    ("Line timing", "Out of the hardening chamber = entry of the tray 13 positions later; out of the tempering chamber = entry of the tray 25 positions later + the gap (transfer 18 min for HT / normalizing, the controlled cooling cycle for isothermal annealing). Rows near the end of the log, without 25 trays after them, are estimated from the push time (Basis = estimate)."),
    ("Production day", "A tray counts in the day in which it leaves the tempering chamber, from 08:00 to 08:00 the next day, whichever day it was loaded."),
    ("N/A", "\"N/A\" means not available: type it where a batch, heat or heat code is not known. It is an entry, not an identity: two N/A batches are not the same batch."),
]
for i, (a, b) in enumerate(LEG, leg + 1):
    c = rp.cell(row=i, column=1, value=a); c.font = f_bold; c.alignment = wrap; c.border = box
    rp.merge_cells(start_row=i, start_column=2, end_row=i, end_column=8)
    c = rp.cell(row=i, column=2, value=b); c.font = f_b; c.alignment = wrap; c.border = box
    rp.row_dimensions[i].height = 30 if len(b) < 140 else 44
rp["B6"].fill = fill_in

# ------------------------------------------------------------------ Tray log
tw = wb.create_sheet("Tray log", 1)
title(tw, "Tray log: one row per tray, in the order the trays enter the hardening chamber", "Empty separator trays are rows too (type Empty). Times are calculated from the line start, the push time and the holds; type an actual entry only for a tray off the cycle.")
TC = [("Tray\nno.", 6), ("Tray type", 9), ("Actual entry\n(only if off cycle)", 15), ("Push time\nfrom this tray\n(min)", 9), ("Entry into\nhardening\n(calc)", 14),
      ("Part no. 1", 11), ("Batch no. 1", 10), ("Heat no. 1", 10), ("Heat code 1", 9), ("Pieces 1", 7),
      ("Part no. 2\n(mixed tray)", 11), ("Batch no. 2", 10), ("Heat no. 2", 10), ("Pieces 2", 7),
      ("Process", 8), ("Pieces per\ntray (spec)", 9), ("Tray load\n(% of spec)", 9), ("Net weight\n(kg)", 9),
      ("Rework ref.\n(NCR / report)", 13), ("Rework reason", 16), ("Gap\n(min)", 7),
      ("Out of\nhardening\n(calc)", 14), ("Out of\ntempering\n(calc)", 14), ("Basis", 8), ("Production\nday (exit)", 11), ("Note", 20), ("Check flags", 34)]
header(tw, 6, TC, 48)
lk = lambda col, part: f'IFERROR(INDEX({pcol(col)},MATCH({part},{PR},0)),"")'
for i in range(7, 7 + N):
    prev = i - 1
    tw[f"A{i}"] = f'=IF(B{i}="","",COUNTA(B$7:B{i}))'
    tw[f"D{i}"] = f"=Report!B12" if i == 7 else f'=IF(B{i}="","",IF(D{prev}="",Report!$B$12,D{prev}))'
    if i == 7:
        tw[f"E{i}"] = f'=IF(B{i}="","",IF(C{i}<>"",C{i},Report!$B$11))'
    else:
        tw[f"E{i}"] = (f'=IF(B{i}="","",IF(C{i}<>"",C{i},E{prev}+D{prev}/1440'
                       f'+SUMIFS(Holds!$F$7:$F${6+NH},Holds!$B$7:$B${6+NH},">="&E{prev},Holds!$B$7:$B${6+NH},"<"&E{prev}+D{prev}/1440)/1440))')
    tw[f"O{i}"] = f'=IF(F{i}="","",{lk("C", f"F{i}")})'
    tw[f"P{i}"] = f'=IF(F{i}="","",{lk("E", f"F{i}")})'
    tw[f"Q{i}"] = (f'=IF(OR(J{i}="",P{i}="",P{i}=0),"",J{i}/P{i}+IF(OR(N{i}="",K{i}=""),0,IFERROR(N{i}/INDEX({pcol("E")},MATCH(K{i},{PR},0)),0)))')
    tw[f"R{i}"] = (f'=IF(B{i}="","",IF(J{i}="",0,J{i}*IFERROR(INDEX({pcol("F")},MATCH(F{i},{PR},0)),0))'
                   f'+IF(N{i}="",0,N{i}*IFERROR(INDEX({pcol("F")},MATCH(K{i},{PR},0)),0)))')
    tw[f"U{i}"] = f'=IF(B{i}="","",IF(F{i}="",{NAMES["xfer"]},IFERROR(INDEX({pcol("H")},MATCH(F{i},{PR},0))+0,{NAMES["xfer"]})))'
    off13, off25 = f"INDEX($E$7:$E${6+N+30},ROW()-6+{NAMES['posH']})", f"INDEX($E$7:$E${6+N+30},ROW()-6+{NAMES['posH']}+{NAMES['posT']})"
    tw[f"V{i}"] = f'=IF(B{i}="","",IF({off13}<>"",{off13},E{i}+{NAMES["posH"]}*D{i}/1440))'
    tw[f"W{i}"] = f'=IF(B{i}="","",IF({off25}<>"",{off25},E{i}+({NAMES["posH"]}+{NAMES["posT"]})*D{i}/1440)+U{i}/1440)'
    tw[f"X{i}"] = f'=IF(B{i}="","",IF({off25}<>"","line","estimate"))'
    tw[f"Y{i}"] = f'=IF(B{i}="","",INT(W{i}-{NAMES["daystart"]}))'
    flags = [f'IF(AND(B{i}<>"Empty",F{i}=""),"part missing; ","")',
             f'IF(AND(F{i}<>"",J{i}=""),"pieces missing; ","")',
             f'IF(AND(F{i}<>"",O{i}=""),"part not on the Parts sheet; ","")',
             f'IF(AND(B{i}="Empty",OR(F{i}<>"",K{i}<>"")),"empty tray with parts; ","")',
             f'IF(AND(B{i}="Loaded",K{i}<>""),"second part: type Mixed; ","")',
             f'IF(AND(Q{i}<>"",N(Q{i})>1),"over 100 % of the spec load; ","")',
             f'IF(N(R{i})>{NAMES["kgmax"]},"over the tray maximum (kg); ","")',
             f'IF(AND(K{i}<>"",IFERROR(INDEX({pcol("C")},MATCH(K{i},{PR},0)),O{i})<>O{i}),"different processes in one tray; ","")',
             f'IF(AND(S{i}<>"",T{i}=""),"rework reason missing; ","")',
             f'IF(AND(C{i}<>"",I{i}=""),"","")']
    tw[f"AA{i}"] = f'=IF(B{i}="","",' + "&".join(flags[:-1]) + ")"
    for j in range(1, 28):
        col = L(j)
        kind = "in" if col in "BCFGHIJKLMNSTZ" and len(col) == 1 else "calc"
        if col == "D":
            kind = "in"
        c = tw[f"{col}{i}"]
        c.font = f_in if kind == "in" else f_b
        c.fill = fill_in if kind == "in" else fill_calc
        c.border = box
        if col in ("C", "E", "V", "W"):
            c.number_format = DT
        elif col == "Y":
            c.number_format = D
        elif col == "Q":
            c.number_format = "0%"
        elif col in ("R",):
            c.number_format = "#,##0.0"
dv_list(tw, f"B7:B{6+N}", "Tray type")
tw["D6"].comment = Comment("The push time in force from this tray on. It repeats the row above; type a new value on the first tray of a push change (also record it on the Parameter changes sheet).", "MWSPL")
tw["C6"].comment = Comment("Only for a tray that entered off the push cycle (e.g. the first tray after a stop). Later trays follow from this time.", "MWSPL")
tw["X6"].comment = Comment("line = from the entry of the tray 25 positions later (as on the furnace); estimate = fewer than 25 trays after it in the log, calculated from the push time without holds. Re-check in the next day's workbook.", "MWSPL")
tw.freeze_panes = "F7"
tw.auto_filter.ref = f"A6:AA{6+N}"
tw.conditional_formatting.add(f"A7:AA{6+N}", FormulaRule(formula=['$AA7<>""'], fill=PatternFill("solid", fgColor="FBE3D6")))
tw.conditional_formatting.add(f"A7:AA{6+N}", FormulaRule(formula=['$B7="Empty"'], font=Font(name=F, size=9, color="808080", italic=True)))

# example trays: 25-Oct from 06:00, F-02, EX-1001 (HT), separator, EX-3001 (NORM), mixed tray, EX-2001 (IA)
ex = []
for k in range(14):
    ex.append(("Loaded", "EX-1001", "B-102", "H-5521", "C7", 60))
ex.append(("Empty",))
for k in range(8):
    ex.append(("Loaded", "EX-3001", "B-215", "H-5590", "N/A", 30))
ex.append(("Mixed", "EX-3001", "B-215", "H-5590", "N/A", 12, "EX-3001", "B-216", "H-5591", 15))
ex.append(("Empty",))
for k in range(16):
    ex.append(("Loaded", "EX-2001", "B-330", "H-5602", "G2", 24))
for k in range(4):
    ex.append(("Loaded", "EX-1001", "B-103", "H-5521", "C7", 60, None, None, None, None, "NCR-0044", "Re-temper: hardness above 52 HRC"))
for i, t in enumerate(ex, 7):
    tw[f"B{i}"] = t[0]
    if len(t) > 1:
        for col, v in zip("FGHIJ", t[1:6]):
            tw[f"{col}{i}"] = v
    if len(t) > 6:
        for col, v in zip("KLMN", t[6:10]):
            if v is not None:
                tw[f"{col}{i}"] = v
    if len(t) > 10:
        tw[f"S{i}"], tw[f"T{i}"] = t[10], t[11]
tw["Z7"] = "Example rows: delete before use"
tw["D16"] = 10
tw["Z16"] = "Push changed 9 → 10 min (example)"

# ------------------------------------------------------------------ Holds
hw = wb.create_sheet("Holds", 2)
title(hw, "Push cycle on hold", "Every pause of the push cycle. The push timer stops during the hold: the trays after it enter that much later (Tray log).")
header(hw, 6, [("No.", 6), ("On hold from", 16), ("Restarted at", 16), ("Reason", 30), ("Reference (alarm record, NCR)", 22), ("Duration\n(min)", 10), ("By", 16), ("Note", 36)], 32)
for i in range(7, 7 + NH):
    hw[f"A{i}"] = f'=IF(B{i}="","",ROW()-6)'
    hw[f"F{i}"] = f'=IF(OR(B{i}="",C{i}=""),"",ROUND((C{i}-B{i})*1440,0))'
    for j, col in enumerate("ABCDEFGH", 1):
        c = hw[f"{col}{i}"]
        inp = col in "BCDEGH"
        c.font, c.fill, c.border = (f_in if inp else f_b), (fill_in if inp else fill_calc), box
        if col in "BC":
            c.number_format = DT
dv_list(hw, f"D7:D{6+NH}", "Hold reason")
hw["B7"], hw["C7"], hw["D7"], hw["E7"], hw["G7"], hw["H7"] = dt.datetime(2026, 10, 25, 9, 0), dt.datetime(2026, 10, 25, 9, 40), "Quench media out of limits", "OP-0012", "Shift B in-charge (example)", "Oil temperature 82 °C; cooler restarted (example)"
hw.conditional_formatting.add(f"A7:H{6+NH}", FormulaRule(formula=['AND($B7<>"",$C7="")'], fill=PatternFill("solid", fgColor="FBE3D6")))
hw.freeze_panes = "A7"

# ------------------------------------------------------------------ Parameter changes
pw = wb.create_sheet("Parameter changes", 3)
title(pw, "Process parameter changes", "Changes made while trays were in the furnace. A push change is also typed in the Push column of the Tray log, on the first tray it applies to.")
header(pw, 6, [("No.", 6), ("Changed at", 16), ("Parameter", 24), ("Zone", 11), ("From", 10), ("To", 10), ("Reason", 34), ("By", 18), ("Approved by", 18)], 32)
for i in range(7, 7 + NP):
    pw[f"A{i}"] = f'=IF(B{i}="","",ROW()-6)'
    for col in "ABCDEFGHI":
        c = pw[f"{col}{i}"]
        inp = col != "A"
        c.font, c.fill, c.border = (f_in if inp else f_b), (fill_in if inp else fill_calc), box
        if col == "B":
            c.number_format = DT
dv_list(pw, f"C7:C{6+NP}", "Parameter")
dv_list(pw, f"D7:D{6+NP}", "Zone")
for col, v in zip("BCDEFGHI", (dt.datetime(2026, 10, 25, 8, 15), "Push time", "All zones", 9, 10, "Load of EX-3001 (example)", "Shift B in-charge (example)", "HT Manager (example)")):
    pw[f"{col}7"] = v
pw["B7"].number_format = DT
pw.freeze_panes = "A7"

# ------------------------------------------------------------------ Batches
bw = wb.create_sheet("Batches", 4)
title(bw, "Batches: part + batch + heat (rework separately)", "Trays, pieces and weight are counted from the Tray log (both part columns). Record the actual exit of the last tray and the weighed weight.")
BC = [("Part no.", 11), ("Batch no.", 10), ("Heat no.", 10), ("Rework?\n(Y / blank)", 9), ("Process", 8), ("Trays", 7), ("Pieces", 9), ("Net weight\ncalc (kg)", 10),
      ("Pieces out in\nthe report day", 11), ("First tray\nentry (calc)", 14), ("Last tray out\n(calc)", 14), ("Last tray out\n(actual)", 15), ("Difference\n(min)", 9),
      ("Weighed\n(kg)", 9), ("Weighed vs\ncalc", 9), ("Check", 30), ("Note", 26)]
header(bw, 6, BC, 42)
def bmatch(i, sumcol, item):    # SUMIFS / COUNTIFS over part, batch, heat and the rework flag of item 1 or 2
    p, b, h = ("F", "G", "H") if item == 1 else ("K", "L", "M")
    rw = f'{tl("S")},IF($D{i}="Y","?*","")'
    return p, b, h
for i in range(7, 7 + NB):
    rwc = f'IF($D{i}="Y","?*","")'
    c1 = f'{tl("F")},$A{i},{tl("G")},$B{i},{tl("H")},$C{i}'
    c2 = f'{tl("K")},$A{i},{tl("L")},$B{i},{tl("M")},$C{i}'
    rw = f',{tl("S")},IF($D{i}="Y","?*","")'
    # blank-rework criterion "" matches empty cells in COUNTIFS
    bw[f"E{i}"] = f'=IF(A{i}="","",{lk("C", f"A{i}")})'
    bw[f"F{i}"] = f'=IF(A{i}="","",COUNTIFS({c1}{rw})+COUNTIFS({c2}{rw}))'
    bw[f"G{i}"] = f'=IF(A{i}="","",SUMIFS({tl("J")},{c1}{rw})+SUMIFS({tl("N")},{c2}{rw}))'
    bw[f"H{i}"] = f'=IF(A{i}="","",G{i}*IFERROR(INDEX({pcol("F")},MATCH(A{i},{PR},0)),0))'
    bw[f"I{i}"] = f'=IF(A{i}="","",SUMIFS({tl("J")},{c1}{rw},{tl("Y")},Report!$B$7)+SUMIFS({tl("N")},{c2}{rw},{tl("Y")},Report!$B$7))'
    bw[f"J{i}"] = f'=IF(OR(A{i}="",COUNTIFS({c1}{rw})=0),"",_xlfn.MINIFS({tl("E")},{c1}{rw}))'
    bw[f"K{i}"] = f'=IF(OR(A{i}="",COUNTIFS({c1}{rw})=0),"",_xlfn.MAXIFS({tl("W")},{c1}{rw}))'
    bw[f"M{i}"] = f'=IF(OR(L{i}="",K{i}=""),"",ROUND((L{i}-K{i})*1440,0))'
    bw[f"O{i}"] = f'=IF(OR(N{i}="",N(H{i})=0),"",N{i}/H{i}-1)'
    bw[f"P{i}"] = (f'=IF(A{i}="","",IF(F{i}=0,"no tray in the log; ","")&IF(E{i}="","part not on the Parts sheet; ","")'
                   f'&IF(OR(B{i}="",C{i}=""),"batch / heat missing (type N/A if not available); ","")'
                   f'&IF(M{i}="","",IF(ABS(M{i})>{NAMES["tol"]},"exit differs from the calculated time; ",""))'
                   f'&IF(AND(L{i}<>"",L{i}<J{i}),"actual exit before the entry; ",""))')
    for col in "ABCDEFGHIJKLMNOPQ":
        c = bw[f"{col}{i}"]
        inp = col in "ABCDLNQ"
        c.font, c.fill, c.border = (f_in if inp else f_b), (fill_in if inp else fill_calc), box
        if col in "JKL":
            c.number_format = DT
        elif col == "O":
            c.number_format = "0.0%"
        elif col in "H":
            c.number_format = "#,##0.0"
        elif col == "N":
            c.number_format = "#,##0.0"
bw["J6"].comment = Comment("Counted from the part 1 column of the tray log (the batch's own trays); a batch only in the second column of mixed trays shows no time.", "MWSPL")
for i, (a, b, c_, d, l, n) in enumerate([("EX-1001", "B-102", "H-5521", None, dt.datetime(2026, 10, 25, 13, 12), 1490),
                                         ("EX-3001", "B-215", "H-5590", None, None, None), ("EX-3001", "B-216", "H-5591", None, None, None),
                                         ("EX-2001", "B-330", "H-5602", None, None, None), ("EX-1001", "B-103", "H-5521", "Y", None, None)], 7):
    bw[f"A{i}"], bw[f"B{i}"], bw[f"C{i}"] = a, b, c_
    if d: bw[f"D{i}"] = d
    if l: bw[f"L{i}"] = l
    if n: bw[f"N{i}"] = n
bw["Q7"] = "Example rows: delete before use"
bw.conditional_formatting.add(f"A7:Q{6+NB}", FormulaRule(formula=['$P7<>""'], fill=PatternFill("solid", fgColor="FBE3D6")))
bw.freeze_panes = "D7"

# ------------------------------------------------------------------ page set-up
for ws in wb.worksheets:
    ws.sheet_view.showGridLines = False
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.oddFooter.left.text = "MWSPL-F-PROD-01 rev 00"
    ws.oddFooter.right.text = "Page &P of &N"
tw.print_title_rows = "6:6"
bw.print_title_rows = "6:6"
wb.active = 0
wb.save(OUT)
print("saved", OUT)
