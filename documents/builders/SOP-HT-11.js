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
const H3=s=>new Paragraph({keepNext:true,spacing:{before:120,after:40},children:[new TextRun({text:s,font:FONT,size:20,bold:true,color:ACC})]});
const DOCNO="SOP-HT-11",TITLE="Emergency response for the heat treat line";
const tb=table([4318,1773,1773,1774],[
 new TableRow({children:[cell([P("MASS WIRE AND STEELS PVT. LTD. · BHIWADI",{size:15,c:"76838C",after:20}),P("Procedure · "+TITLE,{b:true,size:22,after:0})],4318),
   cell([P("DOCUMENT",{size:15,c:"76838C",after:20}),P(DOCNO,{b:true,after:0})],1773),
   cell([P("REVISION",{size:15,c:"76838C",after:20}),P("0",{b:true,after:0})],1773),
   cell([P("APPROVED",{size:15,c:"76838C",after:20}),P("__ / __ / ____",{b:true,after:0})],1774)]})]);
const kv=rows=>table([2700,6938],rows.map(([k,v])=>new TableRow({children:[cell(k,2700,{fill:GREY,b:true}),cell(v,6938)]})));
const draft=new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:120},border:{top:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:2},bottom:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:2},left:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:4},right:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:4}},
  children:[t("DRAFT for review: confirm every step against the furnace and burner manufacturers' manuals, the gas safety rules and the site emergency plan, fill in the contacts, then approve.",{b:true,c:"B02A2A",size:18})]});
const KEY={S:"⚠ Safety",Q:"◆ Quality",C:"● Critical"};
const KC=k=>k==="S"?"B02A2A":k==="C"?"8A5A00":ACC;
function steps(list){
  let n=0;const rows=[new TableRow({tableHeader:true,children:[cell("No.",700,{fill:GREY,b:true}),cell("Action",7238,{fill:GREY,b:true}),cell("Key point",1700,{fill:GREY,b:true})]})];
  list.forEach(s=>{
    if(typeof s==="string"){rows.push(new TableRow({cantSplit:true,children:[cell(P(s,{b:true,c:ACC,after:20}),9638,{span:3,fill:"E6EFF1"})]}));return;}
    n++;rows.push(new TableRow({cantSplit:true,children:[cell(P(String(n),{al:AlignmentType.RIGHT,after:20}),700),cell(s[0],7238),cell(s[1]?P(KEY[s[1]],{b:true,c:KC(s[1]),after:20}):"",1700)]}));});
  return table([700,7238,1700],rows);
}
const prod=rows=>table([2600,7038],[new TableRow({tableHeader:true,children:[cell("Where the tray was",2600,{fill:GREY,b:true}),cell("Risk and disposition",7038,{fill:GREY,b:true})]}),
  ...rows.map(([a,b])=>new TableRow({cantSplit:true,children:[cell(a,2600,{b:true}),cell(b,7038)]}))]);

// one emergency instruction: {no, title, alarm, detect, first, steps, product, restart, records}
function EI(e){
  return [H(`${e.no}  ${e.title}`),
    kv([["Recognised by",e.detect],["Alarm on the CALOR Alarms page",e.alarm],["Furnaces",e.furn||"F-01, F-02, F-03, F-04"]]),
    H3("Immediate actions"),steps(e.steps),
    ...(e.product?[H3("Product in the line"),prod(e.product)]:[]),
    H3("Restart only when"),...e.restart.map(x=>B(x)),
    ...(e.note?[P(e.note,{i:true,c:"555555",before:60})]:[])];
}

const EIS=[
{no:"EI-HT-04",title:"Power failure",alarm:"Power failure",
 detect:"Lights / panels off, motors stopped (pusher, blowers, quench agitator, pumps), burners off, SCADA on UPS or blank.",
 steps:[
  "First minute: people and gas",
  ["Raise the alarm to the shift supervisor and maintenance; note the time of the failure (watch / phone).","S"],
  ["Check that every burner is off and the gas safety shut-off valves have closed (valve position indicators). Never open a gas valve by hand.","S"],
  ["Gas smell or a valve that did not close: follow EI-HT-05 part B (gas leak) at once.","S"],
  ["Keep everybody away from the quench elevator, the extractor and the doors: they may move without warning when the power returns. Put the selector switches of the pusher, extractor and elevator to OFF / manual.","S"],
  "Quench and controlled cooling (the most critical trays)",
  ["F-02 oil quench: a tray hanging above or half in the oil is a fire risk. Lower it fully into the oil with the manual / emergency drive of the elevator if the manual allows it; otherwise keep the area clear and have the CO₂ / foam extinguisher ready. Close the quench hood.","S"],
  ["F-02: oil agitation and circulation have stopped – a tray in the oil quenches slowly. Note the tray, the time it entered the oil and the time agitation stopped.","Q"],
  ["F-01 water quench: the water pump / agitation stopped – note the tray in the quench and the time.","Q"],
  ["Controlled cooling chamber (isothermal annealing): the cooling blower stopped – note the tray in the chamber and how many minutes of its cooling time had passed.","Q"],
  "Furnace",
  ["Keep the furnace doors closed to hold the heat; do not open inspection ports.","Q"],
  ["Combustion air / exhaust: follow the furnace manual (some burners need the blower to protect them from back-heat; restart it first when the power returns).","S"],
  ["Standby supply (if the site has a generator / UPS – to confirm): start it by its instruction for the critical loads only: control power and SCADA, burner management, quench agitation and oil circulation, exhaust.","S"],
  "Record and tag",
  ["Write down the position of every tray at the failure: the 13 in the hardening chamber, the one in the quench or controlled cooling chamber, the 12 in the tempering chamber (Daily production page: the last tray entered gives the positions).","Q"],
  ["Tag all of them SUSPECT (red HOLD tag) when they come out, by tray number (SOP-HT-08).","C"],
  ["Record the failure on the Alarms page (alarm “Power failure”, start, end, trays at risk) and the pause of the push cycle on the Daily production page (reason: power failure).","Q"],
  "When the power returns",
  ["Restart by WI-HT-02 (restart after power failure): purge, relight by the burner management sequence, never by hand.","S"],
  ["Do not push until every zone of both chambers is back within tolerance on both wall thermocouples and soaked (Start-up checksheet F-HT-02A).","C"]],
 product:[
  ["Hardening chamber zone 1 (preheat)","Low risk; tag and include in the release test of the batch."],
  ["Hardening chamber zones 2–3 (austenitizing)","Below the austenitizing temperature during the failure: incomplete austenitizing possible. Hold; hardness (and microstructure where specified) on samples from these trays before release. Long hot hold after the restart: also check decarburization."],
  ["F-02 tray in the oil quench / on the elevator","Slack quench (no agitation) or delayed quench: highest risk of soft spots and low core hardness. Hold; 100 % hardness or sort; re-harden by the rework procedure (SOP-QA-12) only with the HT Manager's release."],
  ["F-01 tray in the water quench","Quench without agitation: soft spots, uneven hardness, distortion / cracks. Hold; hardness and crack check."],
  ["Controlled cooling chamber (IA)","Cooling interrupted: wrong transformation (hardness / microstructure outside the specification). Hold; hardness and microstructure."],
  ["Tempering chamber (tempering / isothermal hold / normalizing)","Cooled below the set value then reheated: usually acceptable but not proven. Hold; hardness on samples of each batch before release."]],
 restart:["Power stable and the cause known (maintenance / electricity board).","Burners relit by the burner management sequence; all zones within tolerance and soaked; quench and controlled cooling within the job card.","Start-up checksheet F-HT-02A completed and the HT Manager has decided what happens to the trays at risk."]},
{no:"EI-HT-05",title:"Gas supply failure, flame failure or gas leak",alarm:"Gas pressure low / high · Burner flame failure",
 detect:"Burner lockout lamp, flame failure alarm, gas pressure switch trip, zone temperature falling; or the smell of gas.",
 steps:[
  "Part A – gas pressure fault or burner lockout",
  ["Note the time and the burners / zones affected; inform the shift supervisor and maintenance.","S"],
  ["Check that the safety shut-off valves of the affected burners closed. Do not reset the lockout or the pressure switch before the cause is known.","S"],
  ["Stop pushing when a zone leaves its tolerance (both walls); keep the doors closed. Record the pause of the push cycle.","C"],
  ["Maintenance checks the gas supply pressure, the filter and regulator, the igniter and the flame sensor of the burner.",""],
  ["Relight only after the purge, by the burner management sequence (WI-HT-02).","S"],
  "Part B – gas leak (smell of gas, hissing, gas detector alarm)",
  ["Do not switch anything electrical on or off near the leak; no flames, no phones in the area.","S"],
  ["Close the main gas isolation valve from a safe place outside the bay (location: ______________).","S"],
  ["Evacuate the bay to the assembly point; call the site emergency team and the gas supplier (numbers in section 6).","S"],
  ["Ventilate (open doors from outside); nobody re-enters until the gas supplier / maintenance declares it safe.","S"],
  "Both cases",
  ["Tag the trays in the zones that left their tolerance as suspect (SOP-HT-08); record the alarm on the Alarms page.","Q"]],
 product:[["Zones that left their tolerance","Hold the trays that were in those zones from the alarm until the zone was back in tolerance; hardness before release."],["Gas leak with evacuation","Treat as a power failure of the whole line: every tray in the line is suspect (table of EI-HT-04)."]],
 restart:["Cause found and corrected; gas pressure normal; no leak (leak test by maintenance / the gas supplier after a leak).","Purge and relight by the burner management sequence; zones within tolerance and soaked."]},
{no:"EI-HT-06",title:"Fire (quench oil, a door, hydraulic oil)",alarm:"Fire / flames at the quench or a door",
 detect:"Flames or smoke at the F-02 oil quench, a door, the hydraulic unit or a cable tray; fire alarm.",
 steps:[
  ["Raise the fire alarm; call the site emergency team / fire brigade.","S"],
  ["Stop pushing and the quench elevator; close the main gas isolation valve from a safe place.","S"],
  ["F-02 quench oil fire: close the quench hood / lid; use the CO₂ / foam system or extinguishers. NEVER water on an oil fire.","S"],
  ["Hydraulic oil fire: stop the hydraulic pump (emergency stop), CO₂ / dry powder.","S"],
  ["Electrical fire: isolate the panel if it can be done safely; CO₂ only.","S"],
  ["Evacuate by the site emergency plan; count everybody at the assembly point.","S"],
  ["No restart before the safety review by the Maintenance Head and the HT Manager.","S"],
  ["Tag every tray in the line and in the quench as suspect (SOP-HT-08); record the event on the Alarms page.","Q"]],
 product:[["Every position","Treat as a power failure of the whole line (table of EI-HT-04); the tray in the burning quench: scrap unless the HT Manager decides otherwise after tests."]],
 restart:["Fire brigade / emergency team has released the area.","Damage inspected; quench oil tested (flash point, water, contamination) before use; electrical and hydraulic checks done.","Start-up by WI-HT-02 with the Start-up checksheet."]},
{no:"EI-HT-07",title:"Quench failure (F-01 water, F-02 oil)",alarm:"Quench oil temperature out of limits (also used for the F-01 water temperature) · Quench agitation failure · Quench oil level low · Cooling water failure",furn:"F-01 (water), F-02 (oil)",
 detect:"Quench temperature out of the job card limits, agitator / pump stopped or its current falling (agitation is not monitored: check the agitator current and the surface movement), level low, crackle test positive (oil), cooler / cooling water failure.",
 steps:[
  ["Stop pushing at once: no tray into a quench out of its limits.","C"],
  ["Check agitation (motor running, current, surface movement), temperature, level and the cooler / cooling water; inform maintenance.",""],
  ["F-02 oil above its upper limit: fire risk – keep the hood closed, no tray into the oil, cooling to the limit before restart.","S"],
  ["F-02 water in the oil (crackle test / Karl Fischer): stop quenching; never add water to the oil; heat-out or replace the oil by the quench media procedure.","S"],
  ["F-01 water too hot: restore cooling water / the cooling tower before quenching.","Q"],
  ["Tag the trays quenched since the last good reading as suspect (SOP-HT-08); record the alarm on the Alarms page and the out-of-limit test on the Quench media page.","Q"]],
 product:[["Trays quenched since the last good quench check","Hold; hardness (core and surface where specified) and crack check before release."],["Trays still in the hardening chamber","Not affected while they stay in the chamber; do not push them out until the quench is within the limits. Long stop: decarburization check."]],
 restart:["Quench within the job card limits (temperature, level, agitation confirmed by current and surface movement); oil test passed where the failure involved water or overheating."]},
{no:"EI-HT-08",title:"Combustion air blower or exhaust fan failure",alarm:"Combustion air blower failure / low air pressure · Exhaust / flue fan failure",
 detect:"Air pressure switch trip, burners off on the air interlock, blower or exhaust fan stopped or noisy, current abnormal, flue gases at the doors.",
 steps:[
  ["Check that the burners went off on the air interlock and the gas safety valves closed.","S"],
  ["Stop pushing; keep the doors closed; record the pause of the push cycle.","C"],
  ["Inform maintenance: blower motor, belt, bearing, filter, damper (see the predictive maintenance checksheet F-MT-01 history).",""],
  ["Tag the trays in the zones that left their tolerance as suspect (SOP-HT-08); record the alarm.","Q"]],
 product:[["Zones that left their tolerance","As EI-HT-05: hold and test before release."]],
 restart:["Blower repaired and air pressure normal; purge and relight by the burner management sequence; zones within tolerance and soaked."]},
{no:"EI-HT-09",title:"Controlled cooling chamber failure (isothermal annealing)",alarm:"Controlled cooling air / blower failure (isothermal annealing)",
 detect:"Cooling blower stopped, cooling timer / damper fault, a tray not transferred in or out of the cooling chamber, the cooling cycle not finished before the next push.",
 steps:[
  ["Stop pushing: the next tray must not leave the hardening chamber while the cooling chamber is not working.","C"],
  ["Note the tray in the cooling chamber and the minutes of cooling it got.","Q"],
  ["Inform maintenance (blower, damper, rail transfer, timer).",""],
  ["Tag the tray in the cooling chamber as suspect; record the alarm and the pause of the push cycle.","Q"]],
 product:[["Tray in the controlled cooling chamber","Wrong cooling: hold; hardness and microstructure (ferrite–pearlite, no bainite / martensite) before release."],["Trays in the hardening chamber","Longer at temperature during the stop: within the specification usually; check decarburization after a long stop."]],
 restart:["Blower, damper, timer and transfer working; the cooling cycle (transfers + cooling) fits in the push time of the job card."]},
{no:"EI-HT-10",title:"Pusher, extractor or rail transfer jam",alarm:"Pusher / tray transport failure (jam, tray stuck)",
 detect:"Pusher stalls or its hydraulic pressure rises sharply, extractor or transfer stops, a tray tilted / stuck, a push not completed.",
 steps:[
  ["Stop the drive (emergency stop); never push harder or by hand into a hot chamber.","S"],
  ["Inform the shift supervisor and maintenance; note the time and the tray positions.","Q"],
  ["Keep the doors closed while the cause is found; recover a stuck tray only by the furnace manual's method with the burners in the state it requires.","S"],
  ["Record the pause of the push cycle; record the alarm.","Q"],
  ["After clearing: check trays and hearth rails for damage; inspect the trays involved (Load build page).",""]],
 product:[["All trays in the line","Stayed longer than the job card at temperature. Hold the trays whose time exceeded the job card tolerance; hardness (and decarburization for long stops) before release. Tilted tray: parts may have fallen – trap point check of the chamber at the next shutdown (Trap points page)."]],
 restart:["Cause removed; trial push with an empty tray; pusher pressure back to normal (F-MT-01)."]},
{no:"EI-HT-11",title:"Control, SCADA or thermocouple failure",alarm:"Control thermocouple break / reading out of range · SCADA / recorder failure",
 detect:"Thermocouple break or implausible reading, the two wall readings of a zone far apart, controller fault, SCADA screen frozen or recording stopped.",
 steps:[
  ["Compare the two wall thermocouples of the zone and the over-temperature controller reading; run the zone on the healthy sensor or stop pushing as the furnace instruction allows.","C"],
  ["SCADA recording stopped: write the zone readings by hand in the shift log every 15 minutes until it runs again (the CQI-9 record must not have a gap).","Q"],
  ["Replace a failed thermocouple; do a SAT after the replacement (Pyrometry → SAT, replacement record).","Q"],
  ["Tag the trays in the zone from the last plausible reading until the zone was controlled again; record the alarm.","Q"]],
 product:[["Trays in the zone without a valid reading","Hold; hardness before release."]],
 restart:["Valid control and recording on both walls of every zone; SAT done after a thermocouple replacement."]},
{no:"EI-HT-12",title:"Over-temperature trip",alarm:"Over-temperature protection tripped",
 detect:"Over-temperature controller tripped, burners of the chamber off.",
 steps:[
  ["Do not reset the trip before the cause is known; inform the shift supervisor and maintenance.","S"],
  ["Find the cause: control thermocouple, controller, set value, burner valve stuck open.",""],
  ["Reset only with the shift supervisor; restart by WI-HT-02.","S"],
  ["Tag every tray in the chamber at the trip; record the alarm.","Q"]],
 product:[["Every tray in the tripped chamber","Overheated possibly: grain growth, decarburization, overheating. Hold; hardness, microstructure and grain size before release."]],
 restart:["Cause corrected; over-temperature protection tested; zones within tolerance and soaked."]}
];

// quick reference card (first actions)
const QR=[["Power failure","EI-HT-04","Burners off, gas valves closed · F-02 tray above oil: lower it / keep clear · selectors OFF · note time and tray positions · tag all trays"],
 ["Gas fault / flame failure","EI-HT-05 A","Valves closed · do not reset · stop pushing · maintenance"],
 ["Gas smell / leak","EI-HT-05 B","No switches, no flames · main gas valve closed from outside · evacuate · emergency team"],
 ["Fire","EI-HT-06","Fire alarm · stop line · gas off · oil fire: hood + CO₂ / foam, NEVER water · evacuate"],
 ["Quench out of limits","EI-HT-07","Stop pushing · check agitation / temperature / level · no tray into the quench"],
 ["Air blower / exhaust fan failure","EI-HT-08","Burners off on interlock · stop pushing · maintenance"],
 ["Controlled cooling failure","EI-HT-09","Stop pushing · note the tray in the chamber and its cooling minutes"],
 ["Pusher / transfer jam","EI-HT-10","Emergency stop · never force · doors closed · maintenance"],
 ["Thermocouple / SCADA failure","EI-HT-11","Compare both walls · manual readings every 15 min · stop pushing if no valid reading"],
 ["Over-temperature trip","EI-HT-12","Do not reset · find the cause · tag every tray of the chamber"]];
const qr=table([2300,1300,6038],[new TableRow({tableHeader:true,children:["Emergency","Instruction","First actions (then follow the instruction)"].map((h,i)=>cell(h,[2300,1300,6038][i],{fill:ACC,b:true,c:"FFFFFF"}))}),
  ...QR.map(r=>new TableRow({cantSplit:true,children:r.map((x,i)=>cell(x,[2300,1300,6038][i],{b:i===0}))}))]);
const contacts=table([3600,3000,3038],[new TableRow({children:["Who","Name","Phone (write in)"].map((h,i)=>cell(h,[3600,3000,3038][i],{fill:GREY,b:true}))}),
  ...["Shift supervisor","Maintenance Head","HT Manager","Electrical maintenance / electricity board","Gas supplier emergency","Site emergency team / fire brigade (101)","Ambulance (108) / first aid","Quality Manager"].map(w=>new TableRow({children:[cell(w,3600),cell(" ",3000),cell(" ",3038)]}))]);
const sign=table([3212,3213,3213],[new TableRow({height:{value:1100,rule:"atLeast"},children:["Prepared by (HT Engineer)","Approved by (HT Manager)","Reviewed (Maintenance Head / Safety)"].map((s,i)=>cell([P(s,{size:16,c:"76838C"}),P(" "),P("Sign · Date",{size:16,c:"76838C"})],[3212,3213,3213][i]))})]);
const revs=table([900,1800,2400,4538],[new TableRow({children:["Rev","Approved","Approved by","Reason for the change"].map((h,i)=>cell(h,[900,1800,2400,4538][i],{fill:GREY,b:true,kn:true}))}),
  new TableRow({children:["0","","","First issue (includes EI-HT-04 to EI-HT-12)"].map((h,i)=>cell(h,[900,1800,2400,4538][i],{kn:true}))})]);
const drills=table([3300,2200,4138],[new TableRow({children:["Drill","How often","Record"].map((h,i)=>cell(h,[3300,2200,4138][i],{fill:GREY,b:true}))}),
  ...[["Power failure (walk-through at the line, every shift team)","Every 6 months","Drill record: date, team, time to safe state, gaps found"],["Gas leak evacuation","Every 12 months (with the site fire drill)","Site emergency drill record"],["Quench oil fire (hood, extinguisher)","Every 12 months","Drill record; extinguisher inspection tag"],["Standby supply start (if installed)","Monthly test run","Generator log"]].map(r=>new TableRow({children:r.map((x,i)=>cell(x,[3300,2200,4138][i]))}))]);

const body=[
 draft,tb,P(" ",{after:60}),
 kv([["Covers","Methods of addressing potential emergencies, such as power failure (CQI-9 HTSA 1.15)"],["Applies to","The heat treat line: furnaces F-01 to F-04 (hardening chamber, controlled cooling chamber, tempering chamber), quench tanks F-01 (water) and F-02 (oil), pusher, extractor, rail transfer, SCADA"],["Used by","Furnace operator, Loading / unloading / quench operator, Shift supervisor, Maintenance technician, HT Engineer, HT Manager"],["Kept at","Control panel of each furnace (with the quick reference card, section 5); quench area; HT office; Procedures & WIs page in CALOR"],["Replaces","The separate drafts EI-HT-04 to EI-HT-07 on the Procedures & WIs page (same numbers kept as sections)"]]),
 H("1. Purpose"),P("Make sure that in every foreseeable emergency on the heat treat line the people are safe first, the furnace and the quench are brought to a safe state, and every tray that may not have had its full thermal cycle is identified, held and decided on before it can reach a customer."),
 H("2. Scope"),P("All emergencies that can interrupt or upset the heat treatment process: power failure, gas supply failure or leak, burner flame failure, fire, quench failure, combustion air blower failure, controlled cooling failure, mechanical jam of the pusher / extractor / transfer, control / SCADA / thermocouple failure and over-temperature trip. Medical emergencies, flooding and site-wide events follow the site emergency plan; this procedure covers the heat treat side of them."),
 H("3. Responsibilities"),
 B("Furnace operator: takes the immediate actions, notes the time and the tray positions, tags suspect trays, records the event."),
 B("Shift supervisor: takes charge at the line, calls maintenance and the emergency team, decides to stop / restart the line with the HT Manager."),
 B("Maintenance technician / Maintenance Head: makes the equipment safe, finds and removes the cause, confirms the equipment is fit to restart."),
 B("HT Manager: decides the disposition of the suspect product, approves the restart after a stopping emergency, keeps this procedure current."),
 B("Quality Manager: releases or rejects held product with the HT Manager; checks that no suspect tray was dispatched."),
 H("4. General rules for every emergency"),
 B([t("Priorities: ",{b:true}),t("1. people · 2. gas and fire safety · 3. the quench and controlled cooling (most critical product) · 4. the furnace · 5. the record.")]),
 B("Never bypass or reset a safety interlock, flame safeguard, gas pressure switch or over-temperature trip before the cause is known."),
 B("Never push a tray into a chamber, quench or cooling chamber that is not within the job card."),
 B("Note the time the emergency started and ended and the position of every tray. The Daily production page gives the tray in each position from the last tray entered."),
 B("Every tray that was in the line during an emergency is SUSPECT until the HT Manager decides (red HOLD tag, quarantine area, SOP-HT-08). Rework only by the rework procedure SOP-QA-12."),
 B("Record every emergency on the CALOR Alarms page (alarm type, start, acknowledgement, end, what was done, product affected, reaction plan) and every stop of pushing as a pause of the push cycle on the Daily production page. The second-level data review (HTSA 1.9) checks these records within 24 h."),
 B("Restart after a stopping emergency only by WI-HT-02 with the Start-up checksheet F-HT-02A."),
 H("5. Quick reference card (post at each control panel)"),qr,
 H("6. Emergency contacts (fill in and keep current)"),contacts,
 H("7. Emergency instructions"),
 P([t("Key points: "),t("⚠ Safety",{b:true,c:"B02A2A"}),t(" · "),t("● Critical (stop if not met)",{b:true,c:"8A5A00"}),t(" · "),t("◆ Quality",{b:true,c:ACC})]),
 ...EIS.flatMap(EI),
 H("8. Equipment that must be available"),
 B("Main gas isolation valve outside the bay, marked and reachable; its location written in EI-HT-05."),
 B("CO₂ / foam extinguishers at the F-02 oil quench and the hydraulic units; quench hood / lid working; no water extinguisher at the oil quench."),
 B("Manual / emergency drive of the quench elevator (F-02) and its instruction at the quench."),
 B("UPS for the SCADA and the burner management system; standby generator for the critical loads if the site has one (to confirm)."),
 B("Red HOLD tags, a marked quarantine area, a torch at each control panel, the shift log for manual readings."),
 H("9. Training and drills"),
 P("Every operator, supervisor and maintenance technician of the line is trained on this procedure before working alone and after each revision (training record on the Procedures & WIs page). Drills keep the first actions automatic:"),drills,
 H("10. Records"),
 B("Alarm / emergency record with the reaction plan – CALOR, Process → Alarms."),
 B("Pause of the push cycle and the trays in the line – CALOR, Production → Daily production."),
 B("Suspect product and its disposition – the reaction plan of the record, the Hardness page, the Rework page."),
 B("Restart – Start-up checksheet F-HT-02A; equipment repair – maintenance work order; thermocouple replacement and SAT – Pyrometry → SAT."),
 B("Drill records and training records."),
 H("11. Related documents"),
 P("WI-HT-01 General operating procedure · WI-HT-02 Furnace start-up · WI-HT-03 Furnace shut-down · SOP-HT-08 Segregation of suspect and nonconforming product · SOP-HT-09 Product inspection and testing · SOP-QA-12 Rework and reprocessing · Alarm response matrix (CALOR Alarms page) · Quench media test plan · F-HT-02A / F-HT-03A Start-up / shutdown checksheets · F-MT-01 Predictive maintenance checksheet · Site emergency plan · Furnace and burner manufacturers' manuals."),
 H("12. Revisions"),revs,P(" ",{after:120,kn:true}),sign];

const doc=new Document({
 styles:{default:{document:{run:{font:FONT,size:20}}}},
 numbering:{config:[{reference:"bul",levels:[{level:0,format:LevelFormat.BULLET,text:"•",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:360,hanging:240}}}}]}]},
 sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1000,bottom:1000,left:1134,right:1134}}},
  headers:{default:new Header({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:9638}],children:[t(`${DOCNO} rev 0 · ${TITLE}`,{size:16,c:"76838C"}),t("\tMass Wire and Steels Pvt. Ltd. · Bhiwadi",{size:16,c:"76838C"})]})]})},
  footers:{default:new Footer({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:9638}],children:[t("Controlled document: printed copies are uncontrolled unless stamped. Check the revision in force on the Procedures & WIs page.",{size:14,c:"76838C"}),new TextRun({children:["\tPage ",PageNumber.CURRENT," of ",PageNumber.TOTAL_PAGES],font:FONT,size:16,color:"76838C"})]})]})},
  children:body}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('/home/user/grain-boundary-project/documents/SOP-HT-11_Emergency_Response.docx',b);console.log('ok');});
