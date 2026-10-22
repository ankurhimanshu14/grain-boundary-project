from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.comments import Comment
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter as CL
from datetime import date
import math

F="Arial"
def font(sz=10,b=False,color="000000"): return Font(name=F,size=sz,bold=b,color=color)
thin=Side(style="thin",color="8A9AA0"); BOX=Border(left=thin,right=thin,top=thin,bottom=thin)
INPUT=PatternFill("solid",fgColor="FFF6C8"); HEAD=PatternFill("solid",fgColor="1F4E5A"); SEC=PatternFill("solid",fgColor="DCE6E8"); CALC=PatternFill("solid",fgColor="F2F4F4")
RED=PatternFill("solid",fgColor="F8D2D2"); AMB=PatternFill("solid",fgColor="FCE8C3"); GRN=PatternFill("solid",fgColor="D5EFD9"); GREY=PatternFill("solid",fgColor="E6E6E6")
WRAP=Alignment(wrap_text=True,vertical="center"); CEN=Alignment(horizontal="center",vertical="center",wrap_text=True)
BLUE="0000FF"

def cell(ws,ref,v=None,f=None,fill=None,al=None,fmt=None,bd=True):
    c=ws[ref]
    if v is not None: c.value=v
    c.font=f or font(); c.alignment=al or WRAP
    if fill: c.fill=fill
    if bd: c.border=BOX
    if fmt: c.number_format=fmt
    return c
def mbox(ws,rng,v=None,f=None,fill=None,al=None,fmt=None):
    ws.merge_cells(rng)
    for row in ws[rng]:
        for c in row:
            c.border=BOX
            if fill: c.fill=fill
    return cell(ws,rng.split(":")[0],v,f,fill,al,fmt)
def inp(ws,ref,v=None,al=CEN,fmt=None): return cell(ws,ref,v,font(10,False,BLUE if v not in (None,"") else "000000"),INPUT,al,fmt)
def setw(ws,d):
    for k,w in d.items(): ws.column_dimensions[k].width=w

# ---------------- parameters (typical values, to be replaced by the furnace's own baseline) ----------------
# (area, parameter, method, unit, kind, applies, baseline, lowAct, lowWatch, highWatch, highAct, what it predicts)
P=[
 ("Combustion","Main gas pressure at the furnace gas train","Gas train gauge","mbar","Value","All",40,30,34,46,50,"Regulator / filter blockage; supply problems before a flame failure"),
 ("Combustion","Combustion air pressure after the blower","Air header gauge","mbar","Value","All",60,48,53,70,75,"Blower / filter / damper deterioration; air-fuel ratio drift"),
 ("Combustion","Combustion air blower motor current","Clamp meter or panel ammeter (% of rated current)","% FLA","Value","All",70,40,55,85,95,"Bearing / impeller / belt problems, blocked intake"),
 ("Combustion","Combustion air blower bearing vibration","Handheld vibration meter, velocity RMS","mm/s","Value","All",1.5,"","",2.8,4.5,"Bearing wear, imbalance, looseness (ISO 10816-3 group 2 rigid zones, to confirm)"),
 ("Combustion","Combustion air blower bearing temperature","IR thermometer","°C","Value","All",50,"","",70,85,"Lubrication failure, bearing wear"),
 ("Combustion","Burner flame failures / lockouts in the last 24 h","Alarm log (CALOR → Alarms) / burner controller","count","Value","All",0,"","",1,3,"Igniter / flame sensor / nozzle fouling"),
 ("Combustion","Highest zone controller output at steady state, hardening chamber","SCADA / controller display","%","Value","All",55,"","",75,90,"Burner capacity loss, refractory heat loss, air leaks: rising output for the same set value"),
 ("Combustion","Highest zone controller output at steady state, tempering chamber","SCADA / controller display","%","Value","All",45,"","",70,85,"As above, tempering chamber"),
 ("Temperature","Largest wall difference (left − right) of a zone, hardening chamber","SCADA (TC odd = right, even = left)","°C","Value","All",0,-8,-5,5,8,"Burner imbalance on one wall or thermocouple drift (SAT due)"),
 ("Temperature","Largest wall difference (left − right) of a zone, tempering chamber","SCADA (TC odd = right, even = left)","°C","Value","All",0,-8,-5,5,8,"As above, tempering chamber"),
 ("Temperature","Over-temperature controller reading vs control thermocouple (difference)","Panel displays","°C","Value","All",0,-8,-5,5,8,"Drift of the over-temperature sensor or the control thermocouple"),
 ("Refractory","Furnace shell hottest spot (IR scan of walls, roof, doors)","IR thermometer / camera, same route daily","°C","Value","All",70,"","",100,120,"Refractory / insulation failure before a burn-through"),
 ("Refractory","Door seals and flame curtains intact, no flame out of doors","Visual","","Check","All","","","","","","Seal / curtain wear, heat loss, decarburization risk"),
 ("Pusher","Pusher hydraulic pressure during the push","Hydraulic gauge at mid-stroke","bar","Value","All",80,"","",110,130,"Rising friction: hearth / rail wear, tray distortion, scale build-up, jam risk"),
 ("Pusher","Push stroke time (one full push)","Stopwatch / PLC","s","Value","All",30,"","",36,40,"Pump wear, internal leakage, valve problems"),
 ("Pusher","Hydraulic oil temperature","Tank thermometer","°C","Value","All",45,"","",55,60,"Cooler fouling, pump wear, oil degradation"),
 ("Pusher","Hydraulic oil level and no leaks","Sight glass / visual","","Check","All","","","","","","Seal and hose wear"),
 ("Transfer","Extractor / rail transfer drive motor current","Clamp meter or panel ammeter (% of rated)","% FLA","Value","All",60,"","",80,90,"Rail / roller / chain wear, misalignment"),
 ("Transfer","Chains, rails and rollers: lubricated, no abnormal noise","Visual / listen","","Check","All","","","","","","Lubrication and wear"),
 ("Controlled cooling","Cooling chamber blower motor current","Clamp meter or panel ammeter (% of rated)","% FLA","Value","All",70,45,55,85,95,"Blower / damper / filter problems: slower controlled cooling"),
 ("Controlled cooling","Cooling chamber blower bearing vibration","Handheld vibration meter, velocity RMS","mm/s","Value","All",1.5,"","",2.8,4.5,"Bearing wear, imbalance"),
 ("Quench","Water quench tank temperature at the start of the shift","Tank indicator / thermometer","°C","Value","F-01",28,"","",32,35,"Cooling water / heat exchanger capacity loss"),
 ("Quench","Oil quench tank temperature at the start of the shift","Tank indicator / thermometer","°C","Value","F-02",62,50,54,76,80,"Heater / cooler control problems"),
 ("Quench","Quench agitator motor current (agitation is not monitored: current is the indicator)","Clamp meter or panel ammeter (% of rated)","% FLA","Value","F-01, F-02",70,45,55,90,100,"Falling current: impeller wear / loss, belt slip; rising: bearing / jamming"),
 ("Quench","Oil cooler temperature drop (oil in − oil out)","Thermometers at the cooler","°C","Value","F-02",8,3,5,"","","Cooler fouling: slower heat removal before the oil overheats"),
 ("Quench","Quench elevator / conveyor: no abnormal noise, chain tension","Visual / listen","","Check","F-01, F-02","","","","","","Chain / sprocket wear"),
 ("Electrical","Control panel internal temperature","Panel thermometer / IR","°C","Value","All",35,"","",40,45,"Panel cooling failure, overheating components"),
 ("Electrical","Thermocouple heads, compensating cables and connections intact","Visual","","Check","All","","","","","","Damaged cables, loose connections (reading drift)"),
]
N=len(P); P0=5; P1=P0+N-1   # parameter rows on the Parameters sheet

wb=Workbook()
ins=wb.active; ins.title="Instructions"

# ---------------- Parameters ----------------
ps=wb.create_sheet("Parameters")
setw(ps,{"A":5,"B":15,"C":46,"D":30,"E":8,"F":8,"G":10,"H":9,"I":9,"J":9,"K":9,"L":9,"M":46})
mbox(ps,"A1:M1","Mass Wire and Steels Pvt. Ltd. · Bhiwadi · Furnace predictive maintenance",font(10,True,"FFFFFF"),HEAD)
mbox(ps,"A2:M2","Parameters, normal values and limits – one list for all four furnaces (edit the yellow cells; the daily checksheet and the trend sheet read them from here)",font(12,True),None)
mbox(ps,"A3:M3","Values are TYPICAL starting points, not measured on your furnaces: replace the normal value with the average of the first 2–4 weeks of readings and set the limits from the equipment manuals.",font(9,False,"9C0006"),None)
H=["No.","Area","Parameter","Method / instrument","Unit","Kind","Applies to","Normal (baseline)","Act if below","Watch if below","Watch if above","Act if above","What a change predicts"]
for i,h in enumerate(H): cell(ps,f"{CL(i+1)}4",h,font(9,True,"FFFFFF"),HEAD,CEN)
ps.row_dimensions[4].height=30
for j,p in enumerate(P):
    r=P0+j
    cell(ps,f"A{r}",j+1,al=CEN)
    for k,v in enumerate(p):
        col=CL(k+2)
        if k>=5 and k<=10: inp(ps,f"{col}{r}",v if v!="" else None)
        else: cell(ps,f"{col}{r}",v,al=CEN if k in (3,4,5) else WRAP)
    ps.row_dimensions[r].height=30
dvk=DataValidation(type="list",formula1='"Value,Check"'); ps.add_data_validation(dvk); dvk.add(f"F{P0}:F{P1}")
dva=DataValidation(type="list",formula1='"All,F-01,F-02,F-03,F-04,F-01, F-02,F-03, F-04"',allow_blank=True,showErrorMessage=False); ps.add_data_validation(dva); dva.add(f"G{P0}:G{P1}")
ps.freeze_panes="D5"; ps.sheet_view.showGridLines=False
ps.page_setup.orientation="landscape"; ps.page_setup.paperSize=ps.PAPERSIZE_A4; ps.page_setup.fitToWidth=1; ps.page_setup.fitToHeight=0; ps.sheet_properties.pageSetUpPr.fitToPage=True
ps.print_title_rows="4:4"

def PR(col,j): return f"Parameters!${col}${P0+j}"

# ---------------- daily checksheet ----------------
def daily(ws,ex=None):
    ex=ex or {}
    setw(ws,{"A":5,"B":13,"C":44,"D":24,"E":7,"F":20,"G":9,"H":10,"I":10,"J":9,"K":9,"L":9,"M":30,"N":11})
    mbox(ws,"A1:N1","Mass Wire and Steels Pvt. Ltd. · Bhiwadi · Heat treatment maintenance",font(10,True,"FFFFFF"),HEAD)
    mbox(ws,"A2:J3","Daily predictive maintenance checksheet – furnace",font(15,True),None)
    mbox(ws,"K2:N2","Form F-MT-01 · Rev 0",font(9)); mbox(ws,"K3:N3","One sheet per furnace per day",font(9))
    fields=[(5,"B","C:D","Furnace","furn"),(5,"F","G:I","Date","date"),(5,"J","K:N","Shift","shift"),
            (6,"B","C:D","Furnace state","state"),(6,"F","G:I","Checked by","by"),(6,"J","K:N","Instruments used","inst")]
    for r,lc,vc,lbl,k in fields:
        cell(ws,f"{lc}{r}",lbl,font(9,True),SEC); a,b=vc.split(":"); c=mbox(ws,f"{a}{r}:{b}{r}",ex.get(k),font(10,False,BLUE if ex.get(k) else "000000"),INPUT)
        if k=="date": c.number_format="dd-mmm-yyyy"
    cell(ws,"A5",None,fill=SEC); cell(ws,"A6",None,fill=SEC)
    for ref,f in (("C5",'"F-01,F-02,F-03,F-04"'),("C6",'"Running (steady state),Running (heating up / changing),Idle (hot standby),Stopped"'),("K5",'"A (06:00-14:00),B (14:00-22:00),C (22:00-06:00)"')):
        dv=DataValidation(type="list",formula1=f,allow_blank=True); ws.add_data_validation(dv); dv.add(ref)
    mbox(ws,"A7:N7","Take the readings at the same time and place every day, with the furnace at steady state where the item says so. Enter yesterday's reading to see the change (or copy it from yesterday's sheet).",font(9,False,"555555"),None)
    H=["No.","Area","Parameter","Method / instrument","Unit","Limits","Normal","Reading today","Reading yesterday","Change since yesterday","vs normal","Status","Action / remarks (work order no.)","Applicable"]
    hr=9
    for i,h in enumerate(H): cell(ws,f"{CL(i+1)}{hr}",h,font(9,True,"FFFFFF"),HEAD,CEN)
    ws.row_dimensions[hr].height=30
    t0=hr+1
    exv=ex.get("vals",{})
    for j,p in enumerate(P):
        r=t0+j; kind=p[4]
        cell(ws,f"A{r}",f"={PR('A',j)}",al=CEN)
        cell(ws,f"B{r}",f"={PR('B',j)}")
        cell(ws,f"C{r}",f"={PR('C',j)}")
        cell(ws,f"D{r}",f"={PR('D',j)}",font(8))
        cell(ws,f"E{r}",f'=IF({PR("E",j)}="","",{PR("E",j)})',al=CEN)
        lo,lw,hw,hi,kd=PR("I",j),PR("J",j),PR("K",j),PR("L",j),PR("F",j)
        cell(ws,f"F{r}",f'=IF({kd}="Check","OK / Not OK",TRIM(IF({lo}<>"","act <"&{lo}&"  ","")&IF({lw}<>"","watch <"&{lw}&"  ","")&IF({hw}<>"","watch >"&{hw}&"  ","")&IF({hi}<>"","act >"&{hi},"")))',font(8),CALC,CEN)
        cell(ws,f"G{r}",f'=IF({PR("H",j)}="","",{PR("H",j)})',font(10),CALC,CEN)
        v=exv.get(j+1,("","",""))
        inp(ws,f"H{r}",v[0] if v[0]!="" else None); inp(ws,f"I{r}",v[1] if v[1]!="" else None)
        cell(ws,f"J{r}",f'=IF(OR(H{r}="",I{r}="",{kd}="Check"),"",H{r}-I{r})',font(10),CALC,CEN,'+0.0;-0.0;0')
        cell(ws,f"K{r}",f'=IF(OR(H{r}="",G{r}="",{kd}="Check"),"",IF(G{r}=0,H{r}-G{r},(H{r}-G{r})/ABS(G{r})))',font(10),CALC,CEN,'+0%;-0%;0%')
        if kind=="Value" and p[6]==0: ws[f"K{r}"].number_format='+0.0;-0.0;0'
        cell(ws,f"L{r}",f'=IF(LEFT(N{r},2)="No","N/A",IF(H{r}="","",IF({kd}="Check",IF(H{r}="OK","OK","ACT"),IF(OR(AND({lo}<>"",H{r}<{lo}),AND({hi}<>"",H{r}>{hi})),"ACT",IF(OR(AND({lw}<>"",H{r}<{lw}),AND({hw}<>"",H{r}>{hw})),"WATCH","OK")))))',font(10,True),CALC,CEN)
        inp(ws,f"M{r}",v[2] if v[2]!="" else None,WRAP)
        cell(ws,f"N{r}",f'=IF({PR("G",j)}="All","Yes",IF($C$5="","Yes",IF(ISNUMBER(SEARCH($C$5,{PR("G",j)})),"Yes","No – N/A for "&$C$5)))',font(8),CALC,CEN)
        if kind=="Check":
            dv=DataValidation(type="list",formula1='"OK,Not OK"',allow_blank=True); ws.add_data_validation(dv); dv.add(f"H{r}"); dv.add(f"I{r}")
        ws.row_dimensions[r].height=30
    t1=t0+N-1
    ws.conditional_formatting.add(f"L{t0}:L{t1}",FormulaRule(formula=[f'L{t0}="ACT"'],fill=RED,font=Font(name=F,bold=True,color="9C0006")))
    ws.conditional_formatting.add(f"L{t0}:L{t1}",FormulaRule(formula=[f'L{t0}="WATCH"'],fill=AMB,font=Font(name=F,bold=True,color="7A4A00")))
    ws.conditional_formatting.add(f"L{t0}:L{t1}",FormulaRule(formula=[f'L{t0}="OK"'],fill=GRN,font=Font(name=F,bold=True,color="1B5E20")))
    ws.conditional_formatting.add(f"A{t0}:K{t1}",FormulaRule(formula=[f'LEFT($N{t0},2)="No"'],fill=GREY,font=Font(name=F,color="808080")))
    r=t1+2
    mbox(ws,f"A{r}:N{r}","Summary (calculated)",font(10,True,"FFFFFF"),HEAD); r+=1
    def srow(lbl,frm,big=False):
        nonlocal r
        mbox(ws,f"A{r}:E{r}",lbl,font(9,True),SEC); mbox(ws,f"F{r}:N{r}",frm,font(11 if big else 10,True),CALC); r+=1; return f"$F${r-1}"
    L=f"$L${t0}:$L${t1}"
    app=srow("Items for this furnace",f'=COUNTIF($N${t0}:$N${t1},"Yes")')
    don=srow("Readings entered",f'=COUNTIF({L},"OK")+COUNTIF({L},"WATCH")+COUNTIF({L},"ACT")')
    act=srow("ACT – outside the action limit",f'=COUNTIF({L},"ACT")')
    wat=srow("WATCH – beyond the watch limit",f'=COUNTIF({L},"WATCH")')
    res=srow("RESULT",f'=IF({act}>0,"ACTION: raise a maintenance work order today for every ACT item and inform the Maintenance Head",IF({don}<{app},"INCOMPLETE: "&({app}-{don})&" reading(s) missing",IF({wat}>0,"WATCH: plan maintenance and follow these items on the trend sheet","ALL WITHIN LIMITS")))',True)
    rr=int(res[3:])
    for f,fill,col in (('LEFT($F${0},6)="ACTION"',RED,"9C0006"),('OR(LEFT($F${0},5)="WATCH",LEFT($F${0},10)="INCOMPLETE")',AMB,"7A4A00"),('$F${0}="ALL WITHIN LIMITS"',GRN,"1B5E20")):
        ws.conditional_formatting.add(f"F{rr}",FormulaRule(formula=[f.format(rr)],fill=fill,font=Font(name=F,bold=True,color=col)))
    r+=1
    for i,h in enumerate(["","Sign-off","Name","","Signature","","","Date / time"]):
        if h: cell(ws,f"{CL(i+1)}{r}",h,font(9,True),SEC,CEN)
    ws.merge_cells(f"C{r}:D{r}"); ws.merge_cells(f"E{r}:G{r}"); ws.merge_cells(f"H{r}:J{r}"); r+=1
    for who in ("Maintenance technician (checked)","Maintenance Head (reviewed)"):
        cell(ws,f"B{r}",who,font(9,True)); v=ex.get("sign",{}).get(who)
        mbox(ws,f"C{r}:D{r}",v,font(10,False,BLUE if v else "000000"),INPUT); mbox(ws,f"E{r}:G{r}",None,fill=INPUT); mbox(ws,f"H{r}:J{r}",None,fill=INPUT); ws.row_dimensions[r].height=26; r+=1
    ws.print_area=f"A1:N{r-1}"; ws.page_setup.orientation="landscape"; ws.page_setup.paperSize=ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth=1; ws.page_setup.fitToHeight=0; ws.sheet_properties.pageSetUpPr.fitToPage=True; ws.print_title_rows=f"{hr}:{hr}"
    ws.page_margins.left=ws.page_margins.right=0.3; ws.oddFooter.left.text="&8Form F-MT-01 Rev 0 · &A"; ws.oddFooter.right.text="&8Page &P of &N"
    ws.freeze_panes=f"D{t0}"; ws.sheet_view.showGridLines=False

# ---------------- monthly trend and prediction ----------------
TP=[14,15,4,24,12,7,9,20,3,25]   # parameter numbers shown by default
def trend(ws,ex=None):
    ex=ex or {}
    nc=len(TP); last=CL(2+nc)
    setw(ws,{"A":6,"B":12}); [setw(ws,{CL(3+i):13}) for i in range(nc)]
    mbox(ws,f"A1:{last}1","Mass Wire and Steels Pvt. Ltd. · Bhiwadi · Heat treatment maintenance",font(10,True,"FFFFFF"),HEAD)
    mbox(ws,f"A2:{last}3","Predictive maintenance trend – one sheet per furnace per month",font(15,True),None)
    cell(ws,"A5","Furnace",font(9,True),SEC); ws.merge_cells("A5:B5")
    mbox(ws,"C5:D5",ex.get("furn"),font(10,False,BLUE if ex.get("furn") else "000000"),INPUT,CEN)
    mbox(ws,"E5:F5","Month (first day)",font(9,True),SEC); c=mbox(ws,"G5:H5",ex.get("month"),font(10,False,BLUE if ex.get("month") else "000000"),INPUT,CEN); c.number_format="mmm-yyyy"
    dv=DataValidation(type="list",formula1='"F-01,F-02,F-03,F-04"',allow_blank=True); ws.add_data_validation(dv); dv.add("C5")
    mbox(ws,f"A6:{last}6","Copy the daily readings of the parameters below into the day rows (or choose other parameters by their number from the Parameters sheet). The rows at the bottom calculate the trend and how many days remain before the action limit.",font(9,False,"555555"),None)
    ws.row_dimensions[6].height=26
    r0=8
    cell(ws,f"A{r0}","",fill=SEC); cell(ws,f"B{r0}","Parameter no.",font(9,True),SEC,CEN)
    for i,n in enumerate(TP):
        c=inp(ws,f"{CL(3+i)}{r0}",n); c.comment=Comment("Number from the Parameters sheet; change it to trend another parameter.","CALOR")
    look=lambda col,i: f'IFERROR(INDEX(Parameters!${col}${P0}:${col}${P1},MATCH({CL(3+i)}${r0},Parameters!$A${P0}:$A${P1},0)),"")'
    cell(ws,f"A{r0+1}","",fill=HEAD); cell(ws,f"B{r0+1}","Parameter",font(9,True,"FFFFFF"),HEAD,CEN)
    cell(ws,f"A{r0+2}","",fill=HEAD); cell(ws,f"B{r0+2}","Unit",font(9,True,"FFFFFF"),HEAD,CEN)
    for i in range(nc):
        cell(ws,f"{CL(3+i)}{r0+1}","="+look("C",i),font(8,True,"FFFFFF"),HEAD,CEN)
        cell(ws,f"{CL(3+i)}{r0+2}",f'=IF({look("E",i)}=0,"",{look("E",i)})',font(9,True,"FFFFFF"),HEAD,CEN)
    ws.row_dimensions[r0+1].height=64
    cell(ws,f"A{r0+3}","Day",font(9,True),SEC,CEN); cell(ws,f"B{r0+3}","Date",font(9,True),SEC,CEN)
    for i in range(nc): cell(ws,f"{CL(3+i)}{r0+3}","Reading",font(9,True),SEC,CEN)
    d0=r0+4; d1=d0+30
    exd=ex.get("data",{})
    for k in range(31):
        r=d0+k
        cell(ws,f"A{r}",k+1,al=CEN)
        cell(ws,f"B{r}",f'=IF($G$5="","",IF({k+1}>DAY(EOMONTH($G$5,0)),"",$G$5+{k}))',font(9),CALC,CEN,"dd-mmm")
        for i in range(nc):
            v=exd.get(i,{}).get(k+1)
            inp(ws,f"{CL(3+i)}{r}",v)
    r=d1+1
    labels=[("Normal","H"),("Act if below","I"),("Watch if below","J"),("Watch if above","K"),("Act if above","L")]
    LR={}
    for lbl,col in labels:
        mbox(ws,f"A{r}:B{r}",lbl,font(9,True),SEC)
        for i in range(nc): cell(ws,f"{CL(3+i)}{r}",f'=IF({look(col,i)}="","",{look(col,i)})',font(9),CALC,CEN)
        LR[col]=r; r+=1
    def frow(lbl,fn,fmt=None,bold=False):
        nonlocal r
        mbox(ws,f"A{r}:B{r}",lbl,font(9,True),SEC)
        for i in range(nc):
            c=CL(3+i); rng=f"{c}${d0}:{c}${d1}"
            cell(ws,f"{c}{r}",fn(c,rng),font(9,bold),CALC,CEN,fmt)
        r+=1; return r-1
    rc=frow("Readings",lambda c,g:f"=COUNT({g})")
    rl=frow("Latest reading",lambda c,g:f'=IF({c}{rc}=0,"",INDEX({g},MATCH(9.99E+307,{g})))')
    rd=frow("Day of the latest reading",lambda c,g:f'=IF({c}{rc}=0,"",INDEX($A${d0}:$A${d1},MATCH(9.99E+307,{g})))')
    ra=frow("Average this month",lambda c,g:f'=IF({c}{rc}=0,"",AVERAGE({g}))',"0.0")
    rs=frow("Trend per day (slope)",lambda c,g:f'=IF({c}{rc}<5,"",SLOPE({g},$A${d0}:$A${d1}))','+0.00;-0.00;0.00')
    rt=frow("Trend at the latest day",lambda c,g:f'=IF({c}{rs}="","",INTERCEPT({g},$A${d0}:$A${d1})+{c}{rs}*{c}{rd})',"0.0")
    rp=frow("Days until the action limit (at this trend)",lambda c,g:(
        f'=IF(OR({c}{rs}="",{c}{rs}=0),"",IF({c}{rs}>0,IF({c}{LR["L"]}="","",IF({c}{rt}>={c}{LR["L"]},0,({c}{LR["L"]}-{c}{rt})/{c}{rs})),'
        f'IF({c}{LR["I"]}="","",IF({c}{rt}<={c}{LR["I"]},0,({c}{rt}-{c}{LR["I"]})/(-{c}{rs})))))'),"0")
    rq=frow("Prediction",lambda c,g:(
        f'=IF({c}{rc}<5,"Needs 5 readings",IF({c}{rp}="","Stable / no limit in the trend direction",IF({c}{rp}<=0,"AT THE LIMIT: act now",'
        f'IF({c}{rp}<=7,"PLAN WORK within "&ROUND({c}{rp},0)&" days",IF({c}{rp}<=30,"WATCH: limit in about "&ROUND({c}{rp},0)&" days","Stable")))))'),None,True)
    ws.row_dimensions[rq].height=42
    for i in range(nc):
        c=CL(3+i)
        ws.conditional_formatting.add(f"{c}{rq}",FormulaRule(formula=[f'OR(LEFT({c}{rq},2)="AT",LEFT({c}{rq},4)="PLAN")'],fill=RED,font=Font(name=F,bold=True,color="9C0006")))
        ws.conditional_formatting.add(f"{c}{rq}",FormulaRule(formula=[f'LEFT({c}{rq},5)="WATCH"'],fill=AMB,font=Font(name=F,bold=True,color="7A4A00")))
        ws.conditional_formatting.add(f"{c}{rq}",FormulaRule(formula=[f'LEFT({c}{rq},6)="Stable"'],fill=GRN,font=Font(name=F,bold=True,color="1B5E20")))
        g=f"{c}{d0}:{c}{d1}"
        act=f'AND(ISNUMBER({c}{d0}),OR(AND({c}${LR["I"]}<>"",{c}{d0}<{c}${LR["I"]}),AND({c}${LR["L"]}<>"",{c}{d0}>{c}${LR["L"]})))'
        wat=f'AND(ISNUMBER({c}{d0}),OR(AND({c}${LR["J"]}<>"",{c}{d0}<{c}${LR["J"]}),AND({c}${LR["K"]}<>"",{c}{d0}>{c}${LR["K"]})))'
        ws.conditional_formatting.add(g,FormulaRule(formula=[act],fill=RED,font=Font(name=F,bold=True,color="9C0006"),stopIfTrue=True))
        ws.conditional_formatting.add(g,FormulaRule(formula=[wat],fill=AMB,font=Font(name=F,color="7A4A00")))
    r+=1
    mbox(ws,f"A{r}:{last}{r}","How to read it: the trend is a straight line through this month's readings; 'Days until the action limit' extends that line to the nearest action limit in the direction it is moving. It is an estimate for planning, not a guarantee – confirm a PLAN WORK prediction with the equipment (vibration spectrum, inspection) before replacing parts.",font(9,False,"555555"),None)
    ws.row_dimensions[r].height=40
    ws.print_area=f"A1:{last}{r}"; ws.page_setup.orientation="landscape"; ws.page_setup.paperSize=ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth=1; ws.page_setup.fitToHeight=1; ws.sheet_properties.pageSetUpPr.fitToPage=True
    ws.freeze_panes=f"C{d0}"; ws.sheet_view.showGridLines=False
    ws.oddFooter.left.text="&8Form F-MT-02 Rev 0 · &A"
    return {"rq":rq,"rp":rp,"rs":rs}

daily(wb.create_sheet("Daily checksheet"))
trend(wb.create_sheet("Monthly trend"))

# ---------------- examples (F-02) ----------------
exv={1:(41,40,""),2:(59,60,""),3:(74,72,""),4:(2.9,2.6,"Vibration rising for 3 weeks – see the trend sheet; spectrum check booked (WO-1187)"),5:(62,60,""),6:(0,0,""),7:(68,66,""),8:(52,51,""),
 9:(6,5,"Zone 3: right wall 6 °C hotter – check burner 3R air/gas ratio; SAT of TC-05/TC-06 due 02-Dec"),10:(2,2,""),11:(1,2,""),12:(84,82,""),13:("OK","OK",""),14:(104,102,"Push pressure rising ~1.2 bar/day – inspect hearth rails and trays at the next stop (WO-1190)"),
 15:(31,31,""),16:(48,47,""),17:("OK","OK",""),18:(64,63,""),19:("OK","OK",""),20:(71,70,""),21:(1.6,1.6,""),22:("","",""),23:(66,64,""),24:(56,58,"Agitator current falling – check impeller and belt at the next stop"),
 25:(7,7,""),26:("OK","OK",""),27:(37,36,""),28:("OK","OK","")}
daily(wb.create_sheet("Example daily (F-02)"),{"furn":"F-02","date":date(2026,10,20),"shift":"A (06:00-14:00)","state":"Running (steady state)","by":"Maintenance fitter (example)",
 "inst":"Clamp meter CM-03, vibration meter VM-01, IR gun IR-02","vals":exv,"sign":{"Maintenance technician (checked)":"D. Sharma (example)","Maintenance Head (reviewed)":"Maintenance Head (example)"}})
# example trend: 20 days of October
import random; random.seed(4)
def series(start,step,noise,n=20,dec=1): return {d:round(start+step*(d-1)+random.uniform(-noise,noise),dec) for d in range(1,n+1)}
data={0:series(80,1.25,1.2,dec=0),      # 14 pusher pressure rising
      1:series(30,0.02,0.4,dec=0),       # 15 stroke time
      2:{d:round(min(1.5+0.074*(d-1)+random.uniform(-0.1,0.1),2.95),1) for d in range(1,21)},  # 4 blower vibration rising
      3:{d:round(70-0.7*(d-1)+random.uniform(-1,1)) for d in range(1,21)},                       # 24 agitator current falling
      4:series(81,0.15,1.5,dec=0),       # 12 shell hot spot
      5:series(66,0.1,1.2,dec=0),        # 7 controller output, hardening
      6:series(5,0.05,0.6,dec=0),        # 9 wall difference, hardening
      7:series(70,0.03,1.0,dec=0),       # 20 cooling blower current
      8:series(70,0.2,1.2,dec=0),        # 3 air blower current
      9:series(8,-0.03,0.4,dec=1)}       # 25 oil cooler dT
trend(wb.create_sheet("Example trend (F-02)"),{"furn":"F-02","month":date(2026,10,1),"data":data})
for n in ("Example daily (F-02)","Example trend (F-02)"): wb[n].sheet_properties.tabColor="9AA5A8"
for n in ("Daily checksheet","Monthly trend"): wb[n].sheet_properties.tabColor="1F4E5A"

# ---------------- instructions ----------------
setw(ins,{"A":3,"B":115})
L=[("Furnace predictive maintenance checksheet",font(15,True)),("Mass Wire and Steels Pvt. Ltd. · Bhiwadi · pusher furnaces F-01 … F-04",font(10,False,"555555")),("",None),
 ("Why predictive",font(11,True)),
 ("Instead of only checking that equipment works, the same values are measured every day (pressures, motor currents, vibration, temperatures, controller output, wall difference). A slow change in a value warns of a failure weeks before it happens, so the work can be planned for a stop instead of a breakdown with product inside the furnace.",font(10)),
 ("",None),("Sheets",font(11,True)),
 ("Parameters – the list of what is measured, how, the normal value and the watch / act limits. One list for all furnaces; items for one furnace only (F-01 water quench, F-02 oil quench) say so in 'Applies to'.",font(10)),
 ("Daily checksheet – form F-MT-01, one per furnace per day. Status per item: OK, WATCH (beyond the watch limit) or ACT (beyond the action limit / check Not OK), and a result for the day.",font(10)),
 ("Monthly trend – form F-MT-02, one per furnace per month: the daily readings of 10 key parameters, the trend per day and the estimated days until the action limit.",font(10)),
 ("Example daily (F-02) / Example trend (F-02) – the forms filled in, showing a rising pusher pressure, rising blower vibration and a falling agitator current.",font(10)),
 ("",None),("How to fill in",font(11,True)),
 ("• Fill only the yellow cells; grey cells are calculated. Choose the furnace first: items for another furnace turn grey and show N/A (F-03 and F-04 have no quench).",font(10)),
 ("• Take readings at the same point, with the same instrument, at the same furnace condition every day (steady state for currents, outputs and wall difference) – otherwise the trend means nothing.",font(10)),
 ("• ACT: raise a maintenance work order the same day and write its number in Action / remarks. WATCH: enter the item on the trend sheet and plan the work.",font(10)),
 ("• Copy a form for each new day / month: right-click the tab → Move or Copy → Create a copy, then clear the yellow reading cells.",font(10)),
 ("",None),("Values to confirm",font(11,True)),
 ("• Every normal value and limit on the Parameters sheet is a TYPICAL starting value, not measured on your furnaces. For the first 2–4 weeks record readings only, then set 'Normal' to their average and the watch / act limits from the equipment manuals (blower, pump, motor nameplates) and experience.",font(10)),
 ("• Vibration limits follow the usual ISO 10816-3 zones for medium machines on rigid foundations (2.8 / 4.5 mm/s RMS); confirm the machine group with the maintenance team.",font(10)),
 ("• Quench agitation is not monitored on this line, so the agitator motor current is used as the indicator: a falling current usually means a worn or lost impeller or a slipping belt.",font(10)),
 ("• Wall difference (left − right) and controller output come from SCADA; they are also analysed in CALOR → Process → SCADA review, and a drifting thermocouple shows up in CALOR → Pyrometry → SAT.",font(10)),
]
for i,(t,f) in enumerate(L,1):
    c=ins.cell(row=i,column=2,value=t or None); c.font=f or font(); c.alignment=Alignment(wrap_text=True,vertical="top")
c=ins.cell(row=len(L)+2,column=2,value="Fill-in cell (yellow)"); c.fill=INPUT; c.font=font(); c.border=BOX
c=ins.cell(row=len(L)+3,column=2,value="Calculated cell (grey)"); c.fill=CALC; c.font=font(); c.border=BOX
ins.sheet_view.showGridLines=False
wb.move_sheet("Parameters",offset=-3)
out="/home/user/grain-boundary-project/documents/Furnace_Predictive_Maintenance_Checksheet.xlsx"
wb.save(out); print(out, [s for s in wb.sheetnames])
