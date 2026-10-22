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
const HB=s=>new Paragraph({pageBreakBefore:true,keepNext:true,spacing:{before:0,after:100},border:{bottom:{style:BorderStyle.SINGLE,size:12,color:ACC,space:2}},children:[new TextRun({text:s,font:FONT,size:24,bold:true,color:ACC})]});
const DOCNO="SOP-HT-08",TITLE="Segregation of suspect and nonconforming product";
const tb=table([4318,1773,1773,1774],[
 new TableRow({children:[cell([P("MASS WIRE AND STEELS PVT. LTD. · BHIWADI",{size:15,c:"76838C",after:20}),P("Work instruction · "+TITLE,{b:true,size:22,after:0})],4318),
   cell([P("DOCUMENT",{size:15,c:"76838C",after:20}),P(DOCNO,{b:true,after:0})],1773),
   cell([P("REVISION",{size:15,c:"76838C",after:20}),P("0",{b:true,after:0})],1773),
   cell([P("APPROVED",{size:15,c:"76838C",after:20}),P("__ / __ / ____",{b:true,after:0})],1774)]})]);
const kv=rows=>table([2700,6938],rows.map(([k,v])=>new TableRow({children:[cell(k,2700,{fill:GREY,b:true}),cell(v,6938)]})));
const draft=new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:120},border:{top:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:2},bottom:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:2},left:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:4},right:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:4}},
  children:[t("DRAFT for review: confirm the tag colours, the quarantine area and the people authorised to decide against the QMS nonconforming product procedure and the customer requirements, then approve.",{b:true,c:"B02A2A",size:18})]});
const KEY={S:"⚠ Safety",Q:"◆ Quality",C:"● Critical"};
const KC=k=>k==="S"?"B02A2A":k==="C"?"8A5A00":ACC;
const STEPS=[
"#A. Recognise and stop",
["Anybody who finds or suspects product that may not conform stops it at once: no further processing, shot blasting, packing or dispatch of it. Reasons are listed in section 5.","C"],
["Stop the source as its instruction says (stop pushing, stop the quench, stop loading) and inform the shift supervisor.","C"],
"#B. Identify",
["Fix a red HOLD tag to every tray, bin or pallet of the suspect product at once (layout in Annex A): part no., batch no., heat no., tray no(s)., quantity, reason, reference record, date / time, name. One tag per container; never one tag for several lots.","C"],
["Hot parts: tag the tray at the unloading table; cool the parts in their own tray before moving them.","S"],
["Keep the lot identity: never mix suspect trays of different lots in one bin; rework product carries its rework reference as well (Daily production page).","Q"],
"#C. Segregate",
["Move the tagged product to the quarantine area (red-marked, lockable) the same shift. At night or when it cannot be moved: the red bin at the furnace unloading point, then to the quarantine area at the start of the next day shift.","C"],
["Suspect product must not go to shot blasting, washing, inspection or packing together with conforming product. If it must be shot blasted before the test, the machine is run empty before and after it, and it keeps its HOLD tag in its own bin.","C"],
["Enter it in the quarantine register (Annex B): register no., date, part, batch, heat, quantity, reason, reference record, location.","Q"],
"#D. Contain: find all the product concerned",
["Use the time window of the event and the tray positions to find every affected tray: the Daily production page (trays and batches in the furnace and in each zone in the window), the SCADA review (affected windows), the alarm record.","C"],
["Check whether product of the window has already left: next process, stores, dispatch, the customer. Inform the Quality Manager at once if any may have been dispatched (customer notification is the Quality Manager's decision).","C"],
["Tag and segregate all of it the same way; record the containment (quantities, locations, time) in the reaction plan of the record that found it.","Q"],
"#E. Evaluate",
["The HT Manager decides the tests: hardness (surface / core), microstructure, decarburization, grain size, crack check; sample size as the control plan or the reaction plan says (100 % when the risk is high, e.g. a tray caught in the quench).","Q"],
["Test only tagged samples taken from the held lot; record the results on the Hardness page with the reference of the event.","Q"],
"#F. Disposition (HT Manager or Quality Manager only)",
["Release: only with conforming results for every tray concerned.","C"],
["Rework (re-heat-treatment): only by the rework procedure SOP-QA-12 (allowed characteristics and methods, process control sheet, customer approval when the procedure requires it); the rework lot keeps its own identity and rework reference.","C"],
["Sort 100 %: conforming parts released, rejects follow the scrap or rework route; record the quantities.","Q"],
["Concession / deviation: only with the customer's written approval; mark the lot as the customer requires.","Q"],
["Scrap: mark the parts (paint mark / cut as the site rule says), put them in the scrap bin, record the quantity and the reason.","Q"],
["Record the disposition, its reason and the signature in the quarantine register and in the reaction plan of the record.","C"],
"#G. Release from quarantine",
["Remove the HOLD tag only when the disposition is signed; replace it with a green RELEASED tag (released), a rework tag (rework) or move to scrap.","C"],
["The quarantine area is checked every working day by Quality: every container tagged and in the register; items older than 7 days are reported to the HT Manager and the Quality Manager.","Q"]];
let n=0;
const rows=[new TableRow({tableHeader:true,children:[cell("No.",700,{fill:GREY,b:true}),cell("Step",7238,{fill:GREY,b:true}),cell("Key point",1700,{fill:GREY,b:true})]})];
STEPS.forEach(s=>{
  if(typeof s==="string"){rows.push(new TableRow({cantSplit:true,children:[cell(P(s.slice(1),{b:true,c:ACC,after:20}),9638,{span:3,fill:"E6EFF1"})]}));return;}
  n++;rows.push(new TableRow({cantSplit:true,children:[cell(P(String(n),{al:AlignmentType.RIGHT,after:20}),700),cell(s[0],7238),cell(s[1]?P(KEY[s[1]],{b:true,c:KC(s[1]),after:20}):"",1700)]}));});
const reasons=table([3000,6638],[new TableRow({tableHeader:true,children:[cell("Event",3000,{fill:GREY,b:true}),cell("Product that is SUSPECT (red HOLD tag)",6638,{fill:GREY,b:true})]}),
 ...[["Zone out of tolerance, set value or push time not as the job card","The trays that were in the zone / furnace during the deviation (Daily production and SCADA review give the trays)."],
   ["Emergency: power, gas, fire, quench, controlled cooling, jam, over-temperature (SOP-HT-11)","Every tray in the line at the event, as the emergency instruction says per position."],
   ["Quench out of limits (F-01 water, F-02 oil)","Trays quenched since the last good quench check."],
   ["Failed or overdue SAT / TUS, thermocouple failure","Product of the chamber since the last valid result (window on the SAT / TUS page)."],
   ["Failed hardness / metallurgical test","The batch tested and every batch processed under the same conditions since the last passing test."],
   ["Trap point find, piece count of a lot not matching","Both lots of the changeover until the parts are identified and the counts reconciled (Trap points page)."],
   ["Parts on the floor, in a chute or without identification","Treated as NONCONFORMING: never returned to a lot (scrap unless the HT Manager can prove their identity)."],
   ["Load check not OK, tray over its load, mixed lot in a tray","The trays concerned (Load build page)."],
   ["Start-up not released, first-off test not OK","The trays processed since the start-up (WI-HT-02)."]]
 .map(([a,b])=>new TableRow({cantSplit:true,children:[cell(a,3000,{b:true}),cell(b,6638)]}))]);
const tags=table([1800,2400,5438],[new TableRow({tableHeader:true,children:["Colour","Tag","Meaning"].map((h,i)=>cell(h,[1800,2400,5438][i],{fill:GREY,b:true}))}),
 ...[["Yellow","IN PROCESS / AWAITING TEST","Normal production waiting for its release test. Not suspect; not yet released."],
   ["Red","HOLD – SUSPECT / NONCONFORMING","Must not be processed, shot blasted with other lots, packed or dispatched. Only the HT Manager or the Quality Manager may remove it, with a signed disposition."],
   ["Green","RELEASED","Tests conforming; may go to shot blasting, inspection and dispatch."],
   ["Orange","REWORK","Approved rework per SOP-QA-12; carries the rework reference; processed as its own lot."],
   ["Red bin / cage","SCRAP","Marked scrap; never returned to production."]]
 .map(([a,b,c])=>new TableRow({cantSplit:true,children:[cell(a,1800,{b:true}),cell(b,2400,{b:true}),cell(c,5438)]}))]);
const tagLayout=table([3200,6438],["HOLD tag no.","Part no. / name","Batch no. / heat no. / heat code","Tray no(s). / furnace","Quantity (pieces, kg)","Reason (event)","Reference record (alarm, test, review no.)","Tagged by / date / time","Disposition / signed by / date"].map(k=>new TableRow({height:{value:420,rule:"atLeast"},children:[cell(k,3200,{fill:GREY,b:true}),cell(" ",6438)]})));
const regCols=["Reg. no.","Date","Part / batch / heat","Qty","Reason","Reference","Location","Disposition","By / date"],regW=[800,900,1900,700,1500,1100,900,1100,738];
const register=table(regW,[new TableRow({tableHeader:true,children:regCols.map((h,i)=>cell(h,regW[i],{fill:GREY,b:true,size:16}))}),...Array.from({length:22},()=>0).map(()=>new TableRow({height:{value:560,rule:"atLeast"},children:regW.map(w=>cell(" ",w))}))]);
const sign=table([3212,3213,3213],[new TableRow({height:{value:1100,rule:"atLeast"},children:["Prepared by (HT Engineer)","Approved by (HT Manager)","Controlled copy issued to"].map((s,i)=>cell([P(s,{size:16,c:"76838C"}),P(" "),P(i===2?"Location · Date":"Sign · Date",{size:16,c:"76838C"})],[3212,3213,3213][i]))})]);
const revs=table([900,1800,2400,4538],[new TableRow({children:["Rev","Approved","Approved by","Reason for the change"].map((h,i)=>cell(h,[900,1800,2400,4538][i],{fill:GREY,b:true,kn:true}))}),
  new TableRow({children:["0","","","First issue"].map((h,i)=>cell(h,[900,1800,2400,4538][i],{kn:true}))})]);
const body=[draft,tb,P(" ",{after:60}),
 kv([["Covers","Product segregation (CQI-9 HTSA 1.15; handling of suspect and nonconforming product, HTSA 2.8)"],["Applies to","All product heat treated on F-01 to F-04, from loading to dispatch, including shot blasting, inspection and rework"],["Used by","Every person in heat treatment, shot blasting, inspection and dispatch; HT Manager and Quality Manager for the disposition"],["Records","HOLD tags, quarantine register, reaction plans on the CALOR pages"],["Kept at","Each furnace unloading point, the quarantine area, the laboratory, final inspection, the HT office; Procedures & WIs page in CALOR"],["Language","English, Hindi"]]),
 H("1. Purpose"),P("Make sure that product which may not conform is identified at once, kept apart from conforming product, and reaches the next process or the customer only after an authorised disposition."),
 H("2. Scope"),P("Every case of suspect or nonconforming product in the heat treat area: process deviations, alarms and emergencies, failed tests, pyrometry failures, trap point finds and unidentified parts. It covers the product from the furnace to dispatch, including shot blasting. Customer notification and the QMS nonconforming output procedure are the Quality Manager's and are referred to, not repeated."),
 H("3. Responsibilities"),
 B("Everybody: stops, tags and reports suspect product; never removes a HOLD tag."),
 B("Shift supervisor: makes sure suspect product is tagged, segregated and registered the same shift; starts the containment."),
 B("HT Manager: decides the tests and, with the Quality Manager, the disposition; checks the trace of the affected trays."),
 B("Quality Manager (or a designee named in writing): disposition, release from quarantine, customer notification, daily check of the quarantine area."),
 H("4. Identification: tags and colours"),tags,
 P("Areas: a red-marked, lockable quarantine area (key with Quality); a red bin at each furnace unloading point for use at night; a marked scrap bin; a marked rework holding area. Location of the quarantine area: ______________________.",{before:80}),
 H("5. When product is SUSPECT"),reasons,
 H("6. Steps"),
 P([t("Key points: "),t("⚠ Safety",{b:true,c:"B02A2A"}),t(" · "),t("● Critical",{b:true,c:"8A5A00"}),t(" · "),t("◆ Quality",{b:true,c:ACC})]),
 table([700,7238,1700],rows),
 H("7. Rules that are never broken"),
 B("No HOLD tag is removed, covered or replaced without a signed disposition."),
 B("Unidentified parts are never put back into a lot; “N/A” is never used to match parts to a lot."),
 B("Suspect product is never shot blasted, packed or dispatched with conforming product."),
 B("Rework only by SOP-QA-12; scrap is marked and never returns to production."),
 H("8. Records"),
 B("Quarantine register (Annex B) and the HOLD tags (kept with the disposition)."),
 B("Reaction plans on the CALOR pages: Alarms, Hardness, SCADA review (8D), Quench media, Trap points, Load build, Rework."),
 B("Customer notifications and concessions (Quality Manager)."),
 H("9. Related documents"),
 P("WI-HT-01 General operating procedure · WI-HT-02 Furnace start-up · WI-HT-03 Furnace shut-down · SOP-HT-11 Emergency response · SOP-HT-09 Product inspection and testing · SOP-QA-12 Rework and reprocessing · Control plans · QMS procedure for nonconforming output · Customer-specific requirements."),
 H("10. Revisions"),revs,P(" ",{after:120,kn:true}),sign,
 HB("Annex A. HOLD tag layout (print on red card)"),tagLayout,
 HB("Annex B. Quarantine register (keep at the quarantine area)"),register];
const doc=new Document({
 styles:{default:{document:{run:{font:FONT,size:20}}}},
 numbering:{config:[{reference:"bul",levels:[{level:0,format:LevelFormat.BULLET,text:"•",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:360,hanging:240}}}}]}]},
 sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1000,bottom:1000,left:1134,right:1134}}},
  headers:{default:new Header({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:9638}],children:[t(`${DOCNO} rev 0 · ${TITLE}`,{size:16,c:"76838C"}),t("\tMass Wire and Steels Pvt. Ltd. · Bhiwadi",{size:16,c:"76838C"})]})]})},
  footers:{default:new Footer({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:9638}],children:[t("Controlled document: printed copies are uncontrolled unless stamped. Check the revision in force on the Procedures & WIs page.",{size:14,c:"76838C"}),new TextRun({children:["\tPage ",PageNumber.CURRENT," of ",PageNumber.TOTAL_PAGES],font:FONT,size:16,color:"76838C"})]})]})},
  children:body}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('/home/user/grain-boundary-project/documents/SOP-HT-08_Product_Segregation.docx',b);console.log('ok');});
