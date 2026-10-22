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
const B=(s,lvl=0)=>new Paragraph({numbering:{reference:"bul",level:lvl},spacing:{after:40},children:[t(s)]});

// ---- title block (as docPdf: plant + kind · title | document | revision | approved)
const tb=table([4318,1773,1773,1774],[
 new TableRow({children:[cell([P("MASS WIRE AND STEELS PVT. LTD. · BHIWADI",{size:15,c:"76838C",after:20}),P("Work instruction · Operation of the pusher furnace line",{b:true,size:22,after:0})],4318),
   cell([P("DOCUMENT",{size:15,c:"76838C",after:20}),P("WI-HT-01",{b:true,after:0})],1773),
   cell([P("REVISION",{size:15,c:"76838C",after:20}),P("0",{b:true,after:0})],1773),
   cell([P("APPROVED",{size:15,c:"76838C",after:20}),P("__ / __ / ____",{b:true,after:0})],1774)]})]);
const kv=rows=>table([2700,6938],rows.map(([k,v])=>new TableRow({children:[cell(k,2700,{fill:GREY,b:true}),cell(v,6938)]})));
const draft=new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:120},border:{top:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:2},bottom:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:2},left:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:4},right:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:4}},
  children:[t("DRAFT for review: adapt to the furnace manuals and the way the line is run, then approve. Not for use at the line until approved.",{b:true,c:"B02A2A",size:18})]});

// ---- steps: [text, key] ; key: S safety, Q quality, C critical ; phase rows as strings starting with "#"
const KEY={S:"⚠ Safety",Q:"◆ Quality",C:"● Critical"};
const STEPS=[
"#A. Shift handover and line status",
["Arrive at the line before the shift starts. Read the handover note and the shift log of the outgoing operator.",""],
["Check on the Alarms page (CALOR) that no alarm is still active and no reaction plan for the line is open; if one is, ask the shift supervisor before pushing.","S"],
["Check the Daily production page for the furnace: last tray entered, push time in force, any pause of the push cycle still open, parameter changes of the last shift.","Q"],
["Walk the line with the outgoing operator: hardening chamber, quench / controlled cooling chamber, tempering chamber, unloading table. Note trays tagged as suspect (red HOLD tag) and where they are.","Q"],
["Sign the handover in the shift log (time, both names).",""],
"#B. Check the process before the first push of the shift",
["Take the job card / process specification in force for every part now in the line and for the next part to be loaded (Specifications page, revision in force).","Q"],
["Compare the SCADA set value of every zone of the hardening and the tempering chamber with the job card (set value and tolerance).","C"],
["Read both wall thermocouples of every zone (odd numbers right wall, even numbers left wall). Every zone must be within tolerance of its set value on both walls before a push.","C"],
["Compare the push timer with the push time of the job card (within its tolerance).","C"],
["Check the quench: oil temperature, level and agitation within the job card limits (hardening & tempering). For isothermal annealing check the controlled cooling blower, time setting and target; the cooling cycle (transfers + cooling) must end before the next push.","C"],
["Check that the SCADA recording is running and its clock is correct.","Q"],
["Any value outside the job card: do not push. Inform the shift supervisor; correct it only on the supervisor's instruction and record the change as a parameter change (Daily production page).","C"],
"#C. Loading the trays",
["Load each part only to its approved loading standard (Load build page): pieces per tray, pattern, orientation, maximum height.","Q"],
["Use only trays / fixtures marked “in use” with the inspection in date; never load a cracked, distorted or quarantined tray.","Q"],
["Parts must be clean and dry: no oil, coolant, chips, rust or paint. Reject dirty parts to the supplying area.","Q"],
["One lot per tray (part + batch, or part + heat when the batch is not available). A mixed tray only when the supervisor plans it.","Q"],
["Put the route card / identification tag on every tray. Record the load check of the first tray of every batch.","Q"],
"#D. Pushing and recording the trays",
["Push only at the push time of the job card. Every push moves one tray in; the extractor takes the 13th tray out of the hardening chamber and, at the same push, the last tray out of the tempering chamber.","Q"],
["Enter every tray on the Daily production page in the order it enters the hardening chamber: part, batch, heat, heat code and pieces. Enter empty trays too.","Q"],
["When the push time changes for a new part, enter the new push time from that batch; when a batch enters off the cycle, enter its actual entry time.","Q"],
["When pushing must stop (no load, waiting, fault), record the pause of the push cycle with its reason and record the restart time when pushing resumes.","Q"],
"#E. Lot changeover",
["At every change of lot load the empty separator tray(s) the procedure asks for between the outgoing and the incoming lot.","C"],
["Do the trap point check of the line for the changeover (Trap points page): loading table, entry, transfer, quench elevator and conveyor, unloading table, trays and grids.","C"],
["Count the pieces of the outgoing lot at unloading and compare with the pieces loaded. Any difference or parts found in a trap point: stop, hold both lots, inform the shift supervisor.","C"],
"#F. Quench, controlled cooling and transfer",
["Hardening & tempering: watch the quench delay, dip time, oil temperature, agitation and level at every push; they must stay within the job card.","C"],
["Isothermal annealing: check that every tray enters the controlled cooling chamber, gets its cooling time and is transferred into the tempering chamber before the next push.","C"],
["Normalizing: check the transfer between the chambers and the fan cooling after exit where the job card asks for it.","Q"],
["Never quench into oil above its limit temperature; never add water to the oil.","S"],
"#G. Monitoring during the shift",
["Check the SCADA screen at least every hour and at every push: zone temperatures on both walls, set values, alarms. Record the hourly readings in the shift log.","Q"],
["React to every alarm by the alarm response matrix and record it on the Alarms page (time, acknowledgement, what was done, product affected).","S"],
["A zone outside its tolerance: stop pushing, inform the supervisor, tag the trays in that zone as suspect (SOP-HT-08). Restart only when the zone is back within tolerance.","C"],
["Do not change a set value, a push time or a quench setting without the supervisor's instruction and a parameter change record.","C"],
"#H. Unloading and identification",
["Unload the trays in the order they come out of the tempering chamber; keep the route card / tag with the parts.","Q"],
["Empty every tray completely; check grids and baskets for trapped parts and return empty trays to the loading area.","Q"],
["Place the parts in the marked area for testing / release; take the first-off and in-process samples the control plan asks for to the laboratory.","Q"],
["Product is released only with a conforming hardness / metallurgical result (SOP-HT-09). Suspect or nonconforming product goes to the quarantine area with a red HOLD tag (SOP-HT-08).","C"],
"#I. End of shift",
["Bring the shift log and the Daily production entries up to date: trays, pauses, parameter changes, alarms.","Q"],
["Hand over: open alarms, pauses of the push cycle, suspect product on hold, trays still in the line, anything unusual. Both operators sign the handover.",""],
["Keep the area clean and clear: no parts on the floor, the loading table or under the conveyors.","S"]];
let n=0;
const stepRows=[new TableRow({tableHeader:true,children:[cell("No.",700,{fill:GREY,b:true}),cell("Step",7238,{fill:GREY,b:true}),cell("Key point",1700,{fill:GREY,b:true})]})];
STEPS.forEach(s=>{
  if(typeof s==="string"){stepRows.push(new TableRow({children:[cell(P(s.slice(1),{b:true,c:ACC,after:20}),9638,{span:3,fill:"E6EFF1"})]}));return;}
  n++;stepRows.push(new TableRow({cantSplit:true,children:[cell(P(String(n),{al:AlignmentType.RIGHT,after:20}),700),cell(s[0],7238),cell(s[1]?P(KEY[s[1]],{b:true,c:s[1]==="S"?"B02A2A":s[1]==="C"?"8A5A00":ACC,after:20}):"",1700)]}));});

const sign=table([3212,3213,3213],[new TableRow({height:{value:1100,rule:"atLeast"},children:["Prepared by (HT Engineer)","Approved by (HT Manager)","Controlled copy issued to"].map((s,i)=>cell([P(s,{size:16,c:"76838C"}),P(" "),P(i===2?"Location · Date":"Sign · Date",{size:16,c:"76838C"})],[3212,3213,3213][i]))})]);
const revs=table([900,1800,2400,4538],[new TableRow({children:["Rev","Approved","Approved by","Reason for the change"].map((h,i)=>cell(h,[900,1800,2400,4538][i],{fill:GREY,b:true,kn:true}))}),
  new TableRow({children:["0","","","First issue"].map((h,i)=>cell(h,[900,1800,2400,4538][i],{kn:true}))})]);

const doc=new Document({
 styles:{default:{document:{run:{font:FONT,size:20}}}},
 numbering:{config:[{reference:"bul",levels:[{level:0,format:LevelFormat.BULLET,text:"•",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:360,hanging:240}}}}]}]},
 sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1000,bottom:1000,left:1134,right:1134}}},
  headers:{default:new Header({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:9638}],children:[t("WI-HT-01 rev 0 · Operation of the pusher furnace line",{size:16,c:"76838C"}),t("\tMass Wire and Steels Pvt. Ltd. · Bhiwadi",{size:16,c:"76838C"})]})]})},
  footers:{default:new Footer({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:9638}],children:[t("Controlled document: printed copies are uncontrolled unless stamped. Check the revision in force on the Procedures & WIs page.",{size:14,c:"76838C"}),new TextRun({children:["\tPage ",PageNumber.CURRENT," of ",PageNumber.TOTAL_PAGES],font:FONT,size:16,color:"76838C"})]})]})},
  children:[
   draft,tb,P(" ",{after:60}),
   kv([["Covers","General operating procedure (CQI-9 HTSA 1.15)"],["Applies to","Every furnace (F-01, F-02, F-03, F-04) · every process: hardening & tempering, isothermal annealing, normalizing"],["Used by","Furnace operator, Loading operator, Unloading / quench operator, Shift supervisor, HT Engineer"],["Kept at","F-01, F-02, F-03 and F-04 control panels (paper copy); Procedures & WIs page in CALOR (screen)"],["Language","English, Hindi"],["Master file","HT office, controlled master file"]]),
   H("1. Purpose"),P("Run the pusher furnace line so that every tray gets the thermal cycle of its process specification, every lot stays identified and separate, and every deviation is seen, stopped and recorded."),
   H("2. Scope"),P("All continuous gas-fired pusher furnaces (3-zone hardening chamber with 13 tray positions, quench or one-tray controlled cooling chamber, 3-zone tempering chamber with 12 tray positions) and all processes run on them: hardening & tempering, isothermal annealing and normalizing. It covers normal operation by shift, from handover to loading, pushing, quench / cooling, unloading and end of shift."),
   P("Start-up, shut-down and emergencies have their own instructions (see 7). This instruction does not replace the furnace manufacturer's manual or the site safety rules."),
   H("3. Responsibilities"),
   B("Furnace operator: runs the line to this instruction and the job card, records trays, readings and alarms, stops pushing when a value is out of limits."),
   B("Loading / unloading operator: loads to the loading standard, keeps lots separate and identified, does the lot changeover checks."),
   B("Shift supervisor: verifies the line status at handover, authorises any parameter change, decides on stopping the line, contains suspect product."),
   B("HT Engineer / HT Manager: keeps the job cards and this instruction current, decides the disposition of suspect product, trains the operators."),
   H("4. Safety and protective equipment"),
   B("Heat-resistant gloves, face shield, apron and safety shoes at the doors, the quench and the unloading table."),
   B("No loose clothing near the pusher, the extractor, the elevator and the conveyors; keep hands out of moving equipment."),
   B("Keep the quench area free of combustibles; know the fire extinguishers, the gas isolation valve and the escape routes."),
   B("Never bypass a burner safety interlock, a flame safeguard or a guard. Gas smell: follow the emergency instruction at once."),
   H("5. Definitions"),
   kv([["Job card","The one-page card of the process specification in force for a part: set values and tolerances of every zone, push time, quench / cooling settings, pieces per tray."],["Lot","Part + batch no. (part + heat no. when the batch is not available; rework separately). “N/A” is never used to match lots."],["Push cycle","The time between two pushes; one tray enters and one leaves each chamber at every push."],["Suspect product","Product that may not have had its thermal cycle; it is tagged and held until the HT Manager decides."],["Separator tray","An empty tray loaded between two lots so that parts falling in the furnace cannot mix lots."]]),
   H("6. Steps"),
   P([t("Key points: "),t("⚠ Safety",{b:true,c:"B02A2A"}),t(" · "),t("● Critical (check and stop if not met)",{b:true,c:"8A5A00"}),t(" · "),t("◆ Quality",{b:true,c:ACC})]),
   table([700,7238,1700],stepRows),
   H("7. When something goes wrong"),
   P("A temperature, push time or quench value outside the job card: stop loading and pushing, inform the shift supervisor, tag the affected trays as suspect (SOP-HT-08) and record it (Alarms page, parameter change). Do not restart until the value is back within the job card and the supervisor agrees."),
   P("Emergencies: follow the emergency instruction at once — power failure EI-HT-04, gas supply / flame failure EI-HT-05, fire EI-HT-06, quench or cooling water failure EI-HT-07. Start-up WI-HT-02 and shut-down WI-HT-03."),
   P("Contacts: shift supervisor · Maintenance Head · HT Manager · site emergency number (write the numbers on the posted copy)."),
   H("8. Records"),
   B("Daily production report (tray log, pauses of the push cycle, parameter changes) — CALOR, Daily production."),
   B("Shift log with hourly readings and handover signatures."),
   B("Alarm, start-up and shut-down records — CALOR, Alarms."),
   B("Load checks and lot changeover (trap point) checks — CALOR, Load build and Trap points."),
   B("SCADA temperature records — kept by the SCADA system, reviewed on the SCADA review page."),
   H("9. Related documents"),
   P("Process specifications / job cards · Loading standards · Alarm response matrix · WI-HT-02 Furnace start-up · WI-HT-03 Furnace shut-down · EI-HT-04 to EI-HT-07 Emergency instructions · SOP-HT-08 Segregation of suspect and nonconforming product · SOP-HT-09 Product inspection and testing · WI-HT-10 Loading and unloading of trays · Control plan."),
   H("10. Revisions"),revs,
   P(" ",{after:120,kn:true}),sign]}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('/home/user/grain-boundary-project/documents/WI-HT-01_General_Operating_Procedure.docx',b);console.log('ok');});
