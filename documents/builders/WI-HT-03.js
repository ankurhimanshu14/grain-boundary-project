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
const DOCNO="WI-HT-03",TITLE="Furnace shut-down";
const tb=table([4318,1773,1773,1774],[
 new TableRow({children:[cell([P("MASS WIRE AND STEELS PVT. LTD. · BHIWADI",{size:15,c:"76838C",after:20}),P("Work instruction · "+TITLE,{b:true,size:22,after:0})],4318),
   cell([P("DOCUMENT",{size:15,c:"76838C",after:20}),P(DOCNO,{b:true,after:0})],1773),
   cell([P("REVISION",{size:15,c:"76838C",after:20}),P("0",{b:true,after:0})],1773),
   cell([P("APPROVED",{size:15,c:"76838C",after:20}),P("__ / __ / ____",{b:true,after:0})],1774)]})]);
const kv=rows=>table([2700,6938],rows.map(([k,v])=>new TableRow({children:[cell(k,2700,{fill:GREY,b:true}),cell(v,6938)]})));
const draft=new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:120},border:{top:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:2},bottom:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:2},left:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:4},right:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:4}},
  children:[t("DRAFT for review: confirm the cool-down rates, the burner shut-down sequence, the fans to keep running and the lock-out rules against the furnace and burner manufacturers' manuals and the site safety rules, then approve.",{b:true,c:"B02A2A",size:18})]});
const KEY={S:"⚠ Safety",Q:"◆ Quality",C:"● Critical"};
const KC=k=>k==="S"?"B02A2A":k==="C"?"8A5A00":ACC;
const STEPS=[
"#A. Plan the stop (shift supervisor)",
["Agree the stop and its type with the Production Manager and the HT Manager (table in section 5); write the reason on the Shutdown checksheet F-HT-03A.","Q"],
["Decide whether the line is run out empty (normal) or product stays inside (only when the HT Manager agrees, e.g. a short stop to hot standby).","C"],
["Identify the last batch to be loaded: part, batch, heat and its last tray no. on the Daily production page.","C"],
["Inform maintenance of the stop time; for a maintenance stop agree the work, the lock-out points and who holds the permits.","S"],
"#B. Run the line out",
["Stop loading product after the last tray of the last batch. Load one empty separator tray after it.","Q"],
["Keep pushing at the push time of the last batch's job card with EMPTY trays until the last product tray has left the tempering chamber: 13 pushes after it to leave the hardening chamber and 12 more to leave the tempering chamber — 25 empty trays in all, counting the separator tray of step 5. Never change the push time or a set value while product is still inside.","C"],
["Enter the empty trays on the Daily production page so the last product tray's exit time is calculated; record the actual time the last product tray left the tempering chamber.","Q"],
["Quench (F-01 / F-02) and controlled cooling stay within the job card until the last product tray has passed them.","C"],
["Count the pieces of the last lot at unloading and compare with the pieces loaded; do the lot changeover / trap point check for the last lot (CALOR → Trap points).","C"],
["Product cannot be run out (stop by an alarm, a jam or a decision): record every tray left inside and its position on the checksheet; it is SUSPECT until the HT Manager decides (SOP-HT-08).","C"],
"#C. Quench and controlled cooling",
["Controlled cooling chamber empty; switch its blower off after the last tray (isothermal annealing).",""],
["F-02 oil quench: after the last tray keep the oil circulation and cooler running as the procedure says until the oil is below its safe temperature; then close the hood / cover the tank (fire risk). Never leave hot oil without its cover.","S"],
["F-01 water quench: circulation as the procedure says; cover the tank.",""],
["Quench elevator / conveyor empty and in its parking position.","S"],
"#D. Burners off",
["Hot standby: lower the set values to the standby values of the furnace instruction; keep the burners on under the burner management system; no product is loaded until a restart by WI-HT-02.","Q"],
["Full stop: lower the set values at the cool-down rate of the furnace manual if it gives one (refractory); then shut the burners down by the burner management sequence.","S"],
["Close the gas safety shut-off valves of the furnace; for maintenance close and lock the furnace gas isolation valve (tag with the name and date).","S"],
["Keep the combustion air blower and the exhaust / flue fan running as the furnace manual requires to cool the burners and clear the furnace; switch them off only when the manual allows.","S"],
["Keep SCADA recording running at least until the burners are off and the chamber temperatures are falling; note the time the burners went off.","Q"],
"#E. Make the line safe",
["Doors closed for slow cooling unless the furnace manual says otherwise.","Q"],
["Pusher, extractor and rail transfer in their safe position; hydraulic pump off; selectors to OFF.","S"],
["For maintenance: electrical isolation and lock-out of the drives, blowers and burners by the authorised person (lock-out / tag-out); work only with a permit.","S"],
["Write the handover note to maintenance / the next shift: state of the furnace, gas valves, locks, quench, anything abnormal seen during the run-out.",""],
"#F. When the furnace is cool enough",
["Check the hearth, rails and tray positions of both chambers and the controlled cooling chamber for fallen parts; record the check on the Trap points page (parts found: identify the lot, quarantine).","C"],
["Inspect the trays and fixtures that ran in the last batch (CALOR → Load build); remove cracked or distorted ones.","Q"],
["Use the stop for the planned maintenance items of the predictive maintenance checksheet F-MT-01 (items on WATCH / PLAN WORK).",""],
"#G. Records",
["Complete the Shutdown checksheet F-HT-03A: result SHUTDOWN COMPLETE, signatures.","Q"],
["Record the shut-down on CALOR → Process → Alarms (type, reason, last tray, burners off, product left inside).","Q"],
["Record the stop on the Daily production page as a pause of the push cycle (reason) when the line will restart with trays inside, or leave the day closed when the line was run out empty.","Q"]];
let n=0;
const rows=[new TableRow({tableHeader:true,children:[cell("No.",700,{fill:GREY,b:true}),cell("Step",7238,{fill:GREY,b:true}),cell("Key point",1700,{fill:GREY,b:true})]})];
STEPS.forEach(s=>{
  if(typeof s==="string"){rows.push(new TableRow({cantSplit:true,children:[cell(P(s.slice(1),{b:true,c:ACC,after:20}),9638,{span:3,fill:"E6EFF1"})]}));return;}
  n++;rows.push(new TableRow({cantSplit:true,children:[cell(P(String(n),{al:AlignmentType.RIGHT,after:20}),700),cell(s[0],7238),cell(s[1]?P(KEY[s[1]],{b:true,c:KC(s[1]),after:20}):"",1700)]}));});
const types=table([2300,7338],[new TableRow({tableHeader:true,children:[cell("Type of shut-down",2300,{fill:GREY,b:true}),cell("What is different",7338,{fill:GREY,b:true})]}),
 ...[["Planned stop (no orders, holiday)","All steps; the line is run out empty; burners off; gas valves closed. Check of the hearths for fallen parts once cool."],
   ["Planned maintenance stop","All steps plus lock-out / tag-out of gas, electrical drives and burners for the maintenance work; record the work so the restart (WI-HT-02) can check the TUS / SAT needs on the Equipment page."],
   ["Hot standby (short idle)","Steps A–C and D (hot standby): the line is run out empty, the burners stay on at the standby set values under the burner management system; no product until a restart by WI-HT-02 with a soak."],
   ["Emergency stop (power, gas, fire, alarm)","First SOP-HT-11 (the emergency instruction). When the line is safe, finish with steps C–G of this instruction; the trays left inside are SUSPECT."],
   ["Breakdown (equipment fault, line cannot run out)","Steps A, C–G; record every tray left inside and its position (step 10); the HT Manager decides on it."]]
 .map(([a,b])=>new TableRow({cantSplit:true,children:[cell(a,2300,{b:true}),cell(b,7338)]}))]);
const sign=table([3212,3213,3213],[new TableRow({height:{value:1100,rule:"atLeast"},children:["Prepared by (HT Engineer)","Approved by (HT Manager)","Controlled copy issued to"].map((s,i)=>cell([P(s,{size:16,c:"76838C"}),P(" "),P(i===2?"Location · Date":"Sign · Date",{size:16,c:"76838C"})],[3212,3213,3213][i]))})]);
const revs=table([900,1800,2400,4538],[new TableRow({children:["Rev","Approved","Approved by","Reason for the change"].map((h,i)=>cell(h,[900,1800,2400,4538][i],{fill:GREY,b:true,kn:true}))}),
  new TableRow({children:["0","","","First issue"].map((h,i)=>cell(h,[900,1800,2400,4538][i],{kn:true}))})]);
const body=[draft,tb,P(" ",{after:60}),
 kv([["Covers","Equipment shut-down (CQI-9 HTSA 1.15)"],["Applies to","Furnaces F-01, F-02, F-03 and F-04: hardening chamber, controlled cooling chamber, tempering chamber; quench tanks F-01 (water) and F-02 (oil)"],["Used by","Furnace operator, Loading / unloading operator, Shift supervisor, Maintenance technician, HT Manager"],["Record","Shutdown checksheet F-HT-03A; shut-down record on the CALOR Alarms page"],["Kept at","Control panel of each furnace; HT office; Procedures & WIs page in CALOR"],["Language","English, Hindi"]]),
 H("1. Purpose"),P("Stop a furnace line safely with every tray of product accounted for: either run out of the line with its full thermal cycle, or recorded as left inside and held for a decision."),
 H("2. Scope"),P("Every planned stop of a pusher furnace line (no orders, holiday, maintenance, hot standby) and the end of a stop after an emergency once the line is safe. Emergencies themselves are SOP-HT-11; start-up is WI-HT-02. This instruction does not replace the furnace and burner manufacturers' manuals."),
 H("3. Responsibilities"),
 B("Shift supervisor: plans the stop, decides run-out or product left inside with the HT Manager, signs the checksheet."),
 B("Furnace operator: runs the line out, records the trays and times, shuts the burners down by the sequence, fills in the checksheet."),
 B("Maintenance technician: gas isolation and lock-out for maintenance, checks of the burners, fans and drives."),
 B("HT Manager: agrees product left inside and decides its disposition."),
 H("4. Safety"),
 B("Burners off only by the burner management sequence; gas valves closed; for maintenance the gas and electrical isolation are locked and tagged by the authorised person."),
 B("The chambers, trays, quench oil and doors stay hot for many hours after the stop; the F-02 oil quench is a fire risk until it is cool and covered."),
 B("Gas smell at any time: stop, do not switch anything, follow SOP-HT-11 (EI-HT-05 part B)."),
 B("Heat-resistant gloves, face shield, apron and safety shoes; keep clear of moving equipment during the run-out."),
 H("5. Types of shut-down"),types,
 H("6. Steps"),
 P([t("Key points: "),t("⚠ Safety",{b:true,c:"B02A2A"}),t(" · "),t("● Critical (checksheet item: stop if not met)",{b:true,c:"8A5A00"}),t(" · "),t("◆ Quality",{b:true,c:ACC})]),
 table([700,7238,1700],rows),
 H("7. When something goes wrong"),
 P("A product tray cannot leave the line, a burner or gas valve does not close, or the quench oil overheats: stop the run-out, inform the shift supervisor and maintenance, follow SOP-HT-11, record the trays left inside and start a reaction plan on the CALOR Alarms page."),
 H("8. Records"),
 B("Shutdown checksheet F-HT-03A (kept 3 years or as the record retention rule says)."),
 B("Shut-down record on CALOR → Process → Alarms; the last tray and its exit time on the Daily production page; the trap point check on the Trap points page."),
 B("Lock-out / permit records of the maintenance work."),
 H("9. Related documents"),
 P("WI-HT-01 General operating procedure · WI-HT-02 Furnace start-up · SOP-HT-11 Emergency response · SOP-HT-08 Segregation of suspect and nonconforming product · Trap point register (CALOR) · F-HT-03A Shutdown checksheet · F-MT-01 Predictive maintenance checksheet · Furnace and burner manufacturers' manuals · Site lock-out / tag-out procedure."),
 H("10. Revisions"),revs,P(" ",{after:120,kn:true}),sign];
const doc=new Document({
 styles:{default:{document:{run:{font:FONT,size:20}}}},
 numbering:{config:[{reference:"bul",levels:[{level:0,format:LevelFormat.BULLET,text:"•",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:360,hanging:240}}}}]}]},
 sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1000,bottom:1000,left:1134,right:1134}}},
  headers:{default:new Header({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:9638}],children:[t(`${DOCNO} rev 0 · ${TITLE}`,{size:16,c:"76838C"}),t("\tMass Wire and Steels Pvt. Ltd. · Bhiwadi",{size:16,c:"76838C"})]})]})},
  footers:{default:new Footer({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:9638}],children:[t("Controlled document: printed copies are uncontrolled unless stamped. Check the revision in force on the Procedures & WIs page.",{size:14,c:"76838C"}),new TextRun({children:["\tPage ",PageNumber.CURRENT," of ",PageNumber.TOTAL_PAGES],font:FONT,size:16,color:"76838C"})]})]})},
  children:body}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('/home/user/grain-boundary-project/documents/WI-HT-03_Furnace_Shut-down.docx',b);console.log('ok');});
