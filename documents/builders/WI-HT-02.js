const fs=require('fs');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,ShadingType,AlignmentType,BorderStyle,Header,Footer,PageNumber,HeadingLevel,LevelFormat,TabStopType}=require('docx');
const FONT="Calibri",ACC="0E5566",GREY="F2F4F5",LINE="BFC7CC";
const W=9638; // A4 width minus 2 x 1134 margins
const bd={style:BorderStyle.SINGLE,size:4,color:LINE},borders={top:bd,bottom:bd,left:bd,right:bd};
const t=(s,o={})=>new TextRun({text:s,font:FONT,size:o.size||20,bold:o.b,color:o.c,italics:o.i});
const P=(s,o={})=>new Paragraph({keepNext:o.kn,spacing:{after:o.after??80,before:o.before||0},alignment:o.al,children:Array.isArray(s)?s:[t(s,o)]});
const cell=(c,w,o={})=>new TableCell({borders,width:{size:w,type:WidthType.DXA},margins:{top:60,bottom:60,left:100,right:100},
  shading:o.fill?{fill:o.fill,type:ShadingType.CLEAR,color:"auto"}:undefined,columnSpan:o.span,verticalAlign:o.va,
  children:(Array.isArray(c)?c:[c]).map(x=>typeof x==="string"?P(x,{b:o.b,size:o.size,c:o.c,after:20,kn:o.kn}):x)});
const table=(widths,rows)=>new Table({width:{size:widths.reduce((a,b)=>a+b,0),type:WidthType.DXA},columnWidths:widths,rows});
const H=s=>new Paragraph({keepNext:true,heading:HeadingLevel.HEADING_1,spacing:{before:240,after:100},border:{bottom:{style:BorderStyle.SINGLE,size:12,color:ACC,space:2}},children:[new TextRun({text:s,font:FONT,size:24,bold:true,color:ACC})]});
const H2=s=>new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{before:160,after:60},children:[new TextRun({text:s,font:FONT,size:21,bold:true,color:"131D24"})]});
const B=(s,lvl=0)=>new Paragraph({numbering:{reference:"bul",level:lvl},spacing:{after:40},children:Array.isArray(s)?s:[t(s)]});
const DOCNO="WI-HT-02",TITLE="Furnace start-up";
const tb=table([4318,1773,1773,1774],[
 new TableRow({children:[cell([P("MASS WIRE AND STEELS PVT. LTD. · BHIWADI",{size:15,c:"76838C",after:20}),P("Work instruction · "+TITLE,{b:true,size:22,after:0})],4318),
   cell([P("DOCUMENT",{size:15,c:"76838C",after:20}),P(DOCNO,{b:true,after:0})],1773),
   cell([P("REVISION",{size:15,c:"76838C",after:20}),P("0",{b:true,after:0})],1773),
   cell([P("APPROVED",{size:15,c:"76838C",after:20}),P("__ / __ / ____",{b:true,after:0})],1774)]})]);
const kv=rows=>table([2700,6938],rows.map(([k,v])=>new TableRow({children:[cell(k,2700,{fill:GREY,b:true}),cell(v,6938)]})));
const draft=new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:120},border:{top:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:2},bottom:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:2},left:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:4},right:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:4}},
  children:[t("DRAFT for review: confirm the steps, heat-up rates and the burner sequence against the furnace and burner manufacturers' manuals and the gas safety rules, then approve.",{b:true,c:"B02A2A",size:18})]});
const KEY={S:"⚠ Safety",Q:"◆ Quality",C:"● Critical"};
const KC=k=>k==="S"?"B02A2A":k==="C"?"8A5A00":ACC;
const STEPS=[
"#A. Decide and prepare (shift supervisor)",
["Confirm the type of start-up (table in section 5) and the reason; for a restart after an emergency, read the emergency record on the CALOR Alarms page and the decision on the trays left inside.","Q"],
["Open the Start-up checksheet F-HT-02A for the furnace; every step marked ● below is an item of the checksheet.","Q"],
["Maintenance work closed: work orders signed off, permits returned, locks removed by their owners, guards and covers fitted, tools and materials out of the furnace and the pits.","S"],
["After maintenance or a rebuild of refractory, burners, thermocouples, controllers or recorders: record the change on CALOR → Pyrometry → Equipment; a TUS and / or SAT may be needed before production (the Equipment page says which).","C"],
["Product left inside from the shutdown or the emergency: confirm its positions from the shutdown checksheet F-HT-03A; it stays tagged SUSPECT and goes to the HT Manager's decision (SOP-HT-08).","Q"],
"#B. Checks before ignition",
["Gas supply: main isolation valve open by the authorised person; gas pressure at the furnace gas train within its range (record the value).","C"],
["Combustion air blower started; air pressure normal; exhaust / flue fan running and draught normal.","S"],
["Burner safety: interlocks, flame detectors and gas pressure switches tested by the burner management test function (no bypass, no jumper).","C"],
["Control thermocouples TC-01 … TC-06 of both chambers connected; both walls of every zone read plausibly at ambient / hot standby (odd = right wall, even = left wall).","C"],
["SAT of the control thermocouples in date (CALOR → Pyrometry → SAT); TUS of the chamber in date for the set values to be used (CALOR → TUS).","C"],
["Over-temperature protection set (above the highest set value + tolerance as the furnace instruction says) and active.","C"],
["SCADA recording running and its clock correct; the controllers in automatic.","C"],
"#C. Purge and ignition",
["Start the purge from the burner management panel; wait for the full purge time — never shorten or bypass it.","S"],
["Ignite the burners only by the burner management sequence, zone by zone as the furnace manual says. Never light a burner by hand or with an open flame.","S"],
["A burner that does not light or locks out: stop, find the cause (EI-HT-05); do not repeat ignition attempts without a new purge.","S"],
["Note the time the burners were lit (checksheet).","Q"],
"#D. Heat-up",
["Heat up at the rate of the furnace manual (refractory): from cold in steps with holds; after a refractory repair or a new lining follow the dry-out schedule of the refractory supplier.","Q"],
["Raise the set values in steps, not straight to the process set values, unless the manual allows it.","Q"],
["Watch the SCADA every 30 minutes during the heat-up: both walls of each zone rising together; a wall lagging behind points to a burner or a thermocouple fault.","Q"],
["During the heat-up check the pusher, extractor, doors, rail transfer and quench elevator by running them EMPTY.",""],
"#E. Quench and controlled cooling",
["F-01 (water quench): water level within the marks, temperature within the limit, agitation / circulation running — agitation is not monitored, so check that the motor runs and the surface moves.","C"],
["F-02 (oil quench): oil level within the marks, oil at 50–80 °C (heat it before the first quench if it is cold), agitation and oil cooler running, no water in the oil (crackle test if due — CALOR → Quench media).","C"],
["F-03 / F-04: no quench; skip this part.",""],
["Every furnace running isothermal annealing: controlled cooling blower, dampers, rail transfer in / out and cooling timer tested with an empty tray.","Q"],
"#F. Set values, stabilisation and soak",
["Take the job card (process specification in force, CALOR → Specifications) of the first part to be loaded; enter its set values for every zone of both chambers and its push time. Check that the specification is approved for this furnace.","C"],
["Wait until every zone of both chambers is within the tolerance of its set value on BOTH wall thermocouples; note the time and the readings of all 12 thermocouples on the checksheet.","C"],
["Soak: hold at the set values for at least the minimum soak (30 min, see the checksheet settings) after the time above before the first tray.","C"],
["A zone that will not come into tolerance, or two walls far apart: do not load; inform maintenance (EI-HT-11 if a thermocouple is suspect).","C"],
"#G. First trays and release",
["Trays: use only trays in use with the inspection in date (CALOR → Load build); HK trays not cracked or distorted; load not above 200 kg.","Q"],
["Push the first production tray only after the soak; note the time on the checksheet and enter the tray on the Daily production page (start time and push time of the day).","C"],
["Load the first batch to its loading standard; record the load check of its first tray.","Q"],
["First-off test: take the first tray's samples to the laboratory; hardness (and the tests of the specification) within 8 h of the first tray (checksheet setting). Hold the first batch until the result is OK.","C"],
["First-off result not OK: stop pushing, hold the trays processed since the start-up (SOP-HT-08), inform the HT Manager.","C"],
"#H. Records and release",
["Complete the checksheet F-HT-02A: result RELEASED FOR PRODUCTION (or the reason it is not), signatures of the operator and the shift supervisor; the HT Manager signs the release after a restart from an emergency or a maintenance change.","Q"],
["Record the start-up on CALOR → Alarms (start-up record: type, reason, ready time, first push, checklist, first-off test).","Q"],
["Close the pause of the push cycle on the Daily production page with the restart time if the stop was recorded there.","Q"]];
let n=0;
const rows=[new TableRow({tableHeader:true,children:[cell("No.",700,{fill:GREY,b:true}),cell("Step",7238,{fill:GREY,b:true}),cell("Key point",1700,{fill:GREY,b:true})]})];
STEPS.forEach(s=>{
  if(typeof s==="string"){rows.push(new TableRow({cantSplit:true,children:[cell(P(s.slice(1),{b:true,c:ACC,after:20}),9638,{span:3,fill:"E6EFF1"})]}));return;}
  n++;rows.push(new TableRow({cantSplit:true,children:[cell(P(String(n),{al:AlignmentType.RIGHT,after:20}),700),cell(s[0],7238),cell(s[1]?P(KEY[s[1]],{b:true,c:KC(s[1]),after:20}):"",1700)]}));});
const types=table([2300,7338],[new TableRow({tableHeader:true,children:[cell("Type of start-up",2300,{fill:GREY,b:true}),cell("What is different",7338,{fill:GREY,b:true})]}),
 ...[["Cold start (from ambient)","All steps. Heat-up from cold at the furnace manual's rate with holds; the longest start-up. Check that no tray was left inside."],
   ["Restart after power failure","Steps A–H. Read the emergency record (EI-HT-04) first; the trays left in the line are SUSPECT. Check the quench oil temperature and agitation before the first quench; check that every motor restarted in the right direction."],
   ["Restart after maintenance","Steps A–H. Record the change on the Equipment page; a TUS / SAT after a change to the burners, refractory, thermocouples, controllers or recorders before production if the Equipment page requires it. Run the changed equipment empty first."],
   ["Restart after an alarm stop (gas, air, over-temperature, quench, jam)","Steps A–H from the step after the cause was removed. Over-temperature trip: reset only with the shift supervisor (EI-HT-12). Follow the restart conditions of the emergency instruction."],
   ["Restart from hot standby / idle","The furnace was held hot without production: steps A (records), B, E, F, G, H. Bring the set values from the standby values to the job card; soak again before the first tray."]]
 .map(([a,b])=>new TableRow({cantSplit:true,children:[cell(a,2300,{b:true}),cell(b,7338)]}))]);
const sign=table([3212,3213,3213],[new TableRow({height:{value:1100,rule:"atLeast"},children:["Prepared by (HT Engineer)","Approved by (HT Manager)","Controlled copy issued to"].map((s,i)=>cell([P(s,{size:16,c:"76838C"}),P(" "),P(i===2?"Location · Date":"Sign · Date",{size:16,c:"76838C"})],[3212,3213,3213][i]))})]);
const revs=table([900,1800,2400,4538],[new TableRow({children:["Rev","Approved","Approved by","Reason for the change"].map((h,i)=>cell(h,[900,1800,2400,4538][i],{fill:GREY,b:true,kn:true}))}),
  new TableRow({children:["0","","","First issue"].map((h,i)=>cell(h,[900,1800,2400,4538][i],{kn:true}))})]);
const body=[draft,tb,P(" ",{after:60}),
 kv([["Covers","Equipment start-up (CQI-9 HTSA 1.15)"],["Applies to","Furnaces F-01, F-02, F-03 and F-04: hardening chamber, controlled cooling chamber, tempering chamber; quench tanks F-01 (water) and F-02 (oil)"],["Used by","Furnace operator, Shift supervisor, Maintenance technician, HT Manager"],["Record","Start-up checksheet F-HT-02A; start-up record on the CALOR Alarms page"],["Kept at","Control panel of each furnace; HT office; Procedures & WIs page in CALOR"],["Language","English, Hindi"]]),
 H("1. Purpose"),P("Start a furnace line safely and bring it to the process conditions of the job card before the first tray is pushed, so that no tray is heat treated in a furnace that is not ready."),
 H("2. Scope"),P("Every start-up of a pusher furnace line: cold start, restart after a power failure, after maintenance, after an alarm stop and from hot standby. Shut-down is WI-HT-03; emergencies are SOP-HT-11. This instruction does not replace the furnace and burner manufacturers' manuals."),
 H("3. Responsibilities"),
 B("Shift supervisor: decides the start-up, checks the pre-conditions, signs the checksheet."),
 B("Furnace operator: carries out the steps and fills in the checksheet."),
 B("Maintenance technician: gas, burner and electrical checks; confirms the equipment is fit after maintenance."),
 B("HT Manager: releases the furnace for production after a restart from an emergency or a maintenance change; decides on product left inside."),
 H("4. Safety"),
 B("Only trained and authorised persons light a furnace. Never bypass a purge, an interlock, a flame safeguard or a gas pressure switch."),
 B("Gas smell at any time: stop, do not switch anything, follow SOP-HT-11 (EI-HT-05 part B)."),
 B("Heat-resistant gloves, face shield, apron and safety shoes at the doors and the quench; keep clear of moving equipment while it is tested."),
 H("5. Types of start-up"),types,
 H("6. Steps"),
 P([t("Key points: "),t("⚠ Safety",{b:true,c:"B02A2A"}),t(" · "),t("● Critical (checksheet item: stop if not met)",{b:true,c:"8A5A00"}),t(" · "),t("◆ Quality",{b:true,c:ACC})]),
 table([700,7238,1700],rows),
 H("7. When something goes wrong"),
 P("A critical step not met: do not light, or do not push; inform the shift supervisor and maintenance; record it on the checksheet and start a reaction plan on the CALOR Alarms page. Emergencies during the start-up: SOP-HT-11."),
 H("8. Records"),
 B("Start-up checksheet F-HT-02A (kept 3 years or as the record retention rule says)."),
 B("Start-up record on CALOR → Process → Alarms; the first tray and push time on the Daily production page; the first-off test on the Hardness page."),
 B("Equipment change record and any TUS / SAT on the Pyrometry pages."),
 H("9. Related documents"),
 P("WI-HT-01 General operating procedure · WI-HT-03 Furnace shut-down · SOP-HT-11 Emergency response · SOP-HT-08 Segregation of suspect and nonconforming product · SOP-HT-09 Product inspection and testing · Process specifications / job cards · F-HT-02A Start-up checksheet · F-MT-01 Predictive maintenance checksheet · Furnace and burner manufacturers' manuals."),
 H("10. Revisions"),revs,P(" ",{after:120,kn:true}),sign];
const doc=new Document({
 styles:{default:{document:{run:{font:FONT,size:20}}}},
 numbering:{config:[{reference:"bul",levels:[{level:0,format:LevelFormat.BULLET,text:"•",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:360,hanging:240}}}}]}]},
 sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1000,bottom:1000,left:1134,right:1134}}},
  headers:{default:new Header({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:9638}],children:[t(`${DOCNO} rev 0 · ${TITLE}`,{size:16,c:"76838C"}),t("\tMass Wire and Steels Pvt. Ltd. · Bhiwadi",{size:16,c:"76838C"})]})]})},
  footers:{default:new Footer({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:9638}],children:[t("Controlled document: printed copies are uncontrolled unless stamped. Check the revision in force on the Procedures & WIs page.",{size:14,c:"76838C"}),new TextRun({children:["\tPage ",PageNumber.CURRENT," of ",PageNumber.TOTAL_PAGES],font:FONT,size:16,color:"76838C"})]})]})},
  children:body}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('/home/user/grain-boundary-project/documents/WI-HT-02_Furnace_Start-up.docx',b);console.log('ok');});
