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
const DOCNO="WI-HT-12",TITLE="Burner management system and burner sequence";
const tb=table([4318,1773,1773,1774],[
 new TableRow({children:[cell([P("MASS WIRE AND STEELS PVT. LTD. · BHIWADI",{size:15,c:"76838C",after:20}),P("Work instruction · "+TITLE,{b:true,size:22,after:0})],4318),
   cell([P("DOCUMENT",{size:15,c:"76838C",after:20}),P(DOCNO,{b:true,after:0})],1773),
   cell([P("REVISION",{size:15,c:"76838C",after:20}),P("0",{b:true,after:0})],1773),
   cell([P("APPROVED",{size:15,c:"76838C",after:20}),P("__ / __ / ____",{b:true,after:0})],1774)]})]);
const kv=rows=>table([2700,6938],rows.map(([k,v])=>new TableRow({children:[cell(k,2700,{fill:GREY,b:true}),cell(v,6938)]})));
const draft=new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:120},border:{top:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:2},bottom:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:2},left:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:4},right:{style:BorderStyle.SINGLE,size:12,color:"B02A2A",space:4}},
  children:[t("DRAFT for review: this describes how a burner management system works and how it is to be used and tested. The times, set points, fault codes and devices of your furnaces must be filled in from the burner and furnace manufacturers' documents and checked by a competent combustion / gas engineer before approval.",{b:true,c:"B02A2A",size:18})]});
const KEY={S:"⚠ Safety",Q:"◆ Quality",C:"● Critical"};
const KC=k=>k==="S"?"B02A2A":k==="C"?"8A5A00":ACC;
const H3=s=>new Paragraph({keepNext:true,spacing:{before:120,after:40},children:[new TextRun({text:s,font:FONT,size:20,bold:true,color:ACC})]});
const grid=(w,head,rows,o={})=>table(w,[new TableRow({tableHeader:true,children:head.map((h,i)=>cell(h,w[i],{fill:GREY,b:true,size:o.hs}))}),
  ...rows.map(r=>new TableRow({cantSplit:true,height:o.h?{value:o.h,rule:"atLeast"}:undefined,children:r.map((x,i)=>cell(x,w[i],{b:o.bold0&&i===0,size:o.s}))}))]);

const seq=grid([500,1700,4038,1900,1500],["No.","State","What the BMS does","Goes on only when","If not"],[
 ["0","Off / standby","Gas safety shut-off valves closed, no ignition. Waits for a start command.","Start pressed by an authorised operator","—"],
 ["1","Start checks (permissives)","Checks every interlock of section 6: emergency stop reset, no lockout, combustion air blower and exhaust fan running and proven, gas pressure between its low and high switches, safety shut-off valves proven closed (and valve leak test passed where fitted), over-temperature protection healthy, no flame signal present (a flame seen now is a fault).","All permissives made","No start; the panel shows which permissive is missing"],
 ["2","Pre-purge","Opens the air dampers to the purge position and blows air through the chamber for the full pre-purge time, to remove any gas. The timer restarts if the air flow is lost.","Purge time complete with purge air flow proven throughout","Purge restarts; repeated loss of air → lockout"],
 ["3","Ignition position","Moves the air damper / gas control to the low-fire (ignition) position.","Low-fire position proven","Lockout"],
 ["4","Trial for ignition (pilot / burner)","Switches on the igniter (spark) and opens the pilot or ignition gas valve for the safety time only.","Flame detector sees a stable flame within the safety time","Gas valves closed at once → lockout (no automatic retry unless the manufacturer allows one, with a new purge)"],
 ["5","Main flame","Opens the main gas valves; checks the main flame; switches the igniter off.","Main flame proven","Gas valves closed → lockout"],
 ["6","Run / modulation","Hands the burner to the zone temperature controller (high / low or modulating firing). Supervises the flame and every interlock continuously.","—","Any interlock or flame loss → gas valves closed within the flame failure response time → lockout or safety shutdown"],
 ["7","Normal shutdown","On a stop command: closes the gas valves, keeps the air running for the post-purge if specified.","—","—"],
 ["8","Lockout","Gas valves closed, alarm on. Stays locked until a manual reset, even after the power returns.","Cause found and removed; reset by an authorised person","Stays locked out"]],{s:17,bold0:false});

const ilk=grid([2300,2200,2338,1400,1400],["Interlock (permissive)","Device","Trips when","BMS action","Reset"],[
 ["Gas pressure low","Low gas pressure switch","Gas pressure below its set point (supply failure)","Close gas valves, lockout","Manual, after the cause"],
 ["Gas pressure high","High gas pressure switch","Regulator failure, pressure above its set point","Close gas valves, lockout","Manual"],
 ["Combustion air","Air pressure / flow switch","Blower stopped, filter blocked, air below its set point","Close gas valves, lockout","Manual"],
 ["Exhaust / flue","Draught or fan running proof","Exhaust fan stopped or draught lost","Close gas valves","Manual"],
 ["Flame supervision","UV scanner or ionisation rod per burner","No flame or an unstable flame","Close that burner's gas valves (or the zone / furnace as designed), lockout","Manual"],
 ["Valve proving","Proof-of-closure switches / leak tester","A safety valve not closed, or leaking, before a start","No start","Manual, after repair"],
 ["Over-temperature","Independent over-temperature controller","Chamber above its over-temperature set point","Close gas valves of the chamber, lockout","Manual, with the shift supervisor (EI-HT-12)"],
 ["Emergency stop","Emergency stop buttons","Button pressed","Close all gas valves","Manual, after release"],
 ["Power / control supply","Supply monitoring","Power failure","Valves close (spring-return, fail-safe)","Restart by WI-HT-02"]],{s:17,bold0:true});

const tests=grid([3100,1500,1800,3238],["Test","How often","By","Method / record"],[
 ["Visual check of the flames through the sight glasses; flame signal strength on the BMS display","Every shift","Furnace operator","Shift log; a weak or unstable flame signal → maintenance"],
 ["Flame failure test (simulate loss of flame on one burner: cover the scanner / pull the flame rod)","Monthly, each burner","Maintenance (authorised)","The burner's gas valves close within the flame failure response time; record per burner"],
 ["Gas pressure switch low / high trip test","Every 6 months","Maintenance","Pressure lowered / raised with the test cock; trip value recorded"],
 ["Air pressure / flow switch trip test","Every 6 months","Maintenance","Air reduced until the trip; value recorded"],
 ["Safety shut-off valve leak / tightness test","Every 12 months (or by the valve leak tester at every start where fitted)","Maintenance / gas contractor","Leak test report"],
 ["Pre-purge time and purge air flow check","Every 12 months and after any change","Maintenance","Purge time measured against the setting; air flow proven"],
 ["Over-temperature protection test","Every 3 months (CALOR Equipment page interval)","Maintenance","Trip simulated; record on the Equipment page"],
 ["Complete BMS function check by the burner supplier","Every 12 months and after any modification","Burner / BMS supplier","Service report; settings sheet signed"]],{s:17,bold0:true});

const sett=grid([4600,2000,3038],["Setting (fill in from the manufacturer's documents)","Value","Source / checked by"],[
 ["Pre-purge time (s) — at least the time for the purge volume of the standard / manufacturer (often 5 volume changes)","",""],["Purge air flow (m³/h) proven by","",""],["Safety time, trial for ignition (s)","",""],["Flame failure response time (s)","",""],["Gas pressure switch low / high set points (mbar)","",""],["Air pressure switch set point (mbar)","",""],["Post-purge time (s), if used","",""],["Number of ignition retries allowed (normally none)","",""],["Over-temperature set point per chamber (°C)","",""]],{h:420,s:18});

const burners=grid([1100,1500,1400,1500,1700,2438],["Furnace","Chamber / zone","Burners (no. per wall)","Burner type / rating","Flame detector (UV / ionisation)","Ignition (pilot / direct spark) · BMS controller model"],
 ["F-01","F-02","F-03","F-04"].flatMap(f=>["Hardening Z1","Hardening Z2","Hardening Z3","Tempering Z1","Tempering Z2","Tempering Z3"].map((z,i)=>[i?"":f,z,"","","",""])),{s:16,h:300});

const faults=grid([1400,3600,4638],["Code / lamp","Meaning","Operator action"],[["","Flame failure during run","Note the burner / zone; stop pushing if the zone leaves tolerance; call maintenance; reset only after the cause (EI-HT-05)"],["","No flame at ignition","Do not repeat ignition attempts without a new purge; call maintenance"],["","Air pressure fault","Check the blower; EI-HT-08"],["","Gas pressure low / high","EI-HT-05"],["","Valve proving / leak test failed","Do not start; maintenance / gas contractor"],["","",""],["","",""]],{h:380,s:18});

const STEPS=[
"#A. Before a start",
["Only operators trained and authorised for this BMS (named list at the panel) start or reset burners.","S"],
["Read the panel: no lockout, no alarm; every permissive lamp of section 6 made. A missing permissive is a fault to remove, never to bypass.","C"],
"#B. Start (cold start or restart)",
["Start the combustion air blower and the exhaust fan; wait until they are proven.","S"],
["Press the BMS start for the zone / burners as the furnace manual says. Do not interrupt the pre-purge.","S"],
["Watch the ignition: each burner must show a flame (sight glass, flame signal) within the trial for ignition. Note any burner that fails.","S"],
["A burner that fails to light locks out: do not press reset repeatedly. Maintenance finds the cause; a new start always runs a new pre-purge.","C"],
["When all burners of a zone are running, put the zone controller to automatic and heat up by WI-HT-02.","Q"],
"#C. During production",
["Check the flames and the flame signals once per shift (shift log).","Q"],
["A burner flame failure: the BMS shuts that burner (or zone) off; follow EI-HT-05; stop pushing if the zone leaves its tolerance.","C"],
["Never jumper, bridge, block or force an interlock, a detector or a valve, not even for a moment. A temporary bypass needs a written permit from the Maintenance Head with extra precautions and is recorded.","S"],
"#D. Shutdown and lockout reset",
["Normal stop: shut the burners down from the BMS (WI-HT-03); never by closing the gas cock under a burning flame.","S"],
["Lockout: read and write down the fault code; inform the shift supervisor and maintenance; reset only when the cause is found and removed; record it on the CALOR Alarms page.","C"],
["Gas smell at any time: SOP-HT-11, EI-HT-05 part B.","S"]];
let n=0;
const rows=[new TableRow({tableHeader:true,children:[cell("No.",700,{fill:GREY,b:true}),cell("Step",7238,{fill:GREY,b:true}),cell("Key point",1700,{fill:GREY,b:true})]})];
STEPS.forEach(s=>{
  if(typeof s==="string"){rows.push(new TableRow({cantSplit:true,children:[cell(P(s.slice(1),{b:true,c:ACC,after:20}),9638,{span:3,fill:"E6EFF1"})]}));return;}
  n++;rows.push(new TableRow({cantSplit:true,children:[cell(P(String(n),{al:AlignmentType.RIGHT,after:20}),700),cell(s[0],7238),cell(s[1]?P(KEY[s[1]],{b:true,c:KC(s[1]),after:20}):"",1700)]}));});
const sign=table([3212,3213,3213],[new TableRow({height:{value:1100,rule:"atLeast"},children:["Prepared by (Maintenance Head)","Checked by (combustion / gas engineer)","Approved by (HT Manager)"].map((s,i)=>cell([P(s,{size:16,c:"76838C"}),P(" "),P("Sign · Date",{size:16,c:"76838C"})],[3212,3213,3213][i]))})]);
const revs=table([900,1800,2400,4538],[new TableRow({children:["Rev","Approved","Approved by","Reason for the change"].map((h,i)=>cell(h,[900,1800,2400,4538][i],{fill:GREY,b:true,kn:true}))}),
  new TableRow({children:["0","","","First issue"].map((h,i)=>cell(h,[900,1800,2400,4538][i],{kn:true}))})]);

const body=[draft,tb,P(" ",{after:60}),
 kv([["Covers","Burner management system (BMS, also called flame safeguard / burner control): what it does, the start-up sequence, the interlocks, operation, lockout reset and the periodic tests"],["Applies to","The gas burners of the hardening and tempering chambers of furnaces F-01 to F-04"],["Used by","Furnace operator, Shift supervisor, Maintenance technician, Maintenance Head"],["Referred to by","WI-HT-01 operation · WI-HT-02 start-up · WI-HT-03 shut-down · SOP-HT-11 emergencies (EI-HT-05, -08, -12)"],["Kept at","Control panel of each furnace; maintenance office; Procedures & WIs page in CALOR"]]),
 H("1. What a burner management system is"),
 P("A gas burner is dangerous at two moments: when it is lit (gas that does not ignite at once collects and can explode when it does) and when its flame goes out while gas still flows. The burner management system (BMS) is the automatic safety control that removes both risks. It is separate from the temperature controller: the temperature controller decides how much heat a zone needs; the BMS decides whether gas may flow at all."),
 B("It lets a burner start only when every safety condition (permissive) is made."),
 B("It purges the chamber with air before any ignition, so no gas is left inside."),
 B("It lights the burner in a fixed order and allows gas only for a short safety time until a flame is proven by a flame detector."),
 B("It watches the flame and every interlock all the time and closes the safety gas valves at once if anything is wrong (lockout)."),
 B("After a lockout it needs a manual reset, so a person must look at the cause first."),
 P("The fixed order of these steps is the burner management sequence (section 5). The operator starts it, watches it and resets it; the operator never replaces any step by hand.",{before:60}),
 H("2. Purpose of this instruction"),P("Describe the BMS of the pusher furnaces, how it is operated, what each interlock does, how a lockout is handled and how the system is tested, so that the burners are always started, run and stopped safely and the safety functions are proven to work."),
 H("3. Responsibilities"),
 B("Furnace operator (authorised): starts and stops the burners from the BMS, checks the flames each shift, reports every lockout."),
 B("Shift supervisor: authorises resets after a lockout of a whole chamber and any restart after an over-temperature trip."),
 B("Maintenance Head: keeps the BMS settings sheet, the authorised list and the test plan; controls any bypass permit."),
 B("Burner / BMS supplier or competent gas engineer: settings, annual function check, modifications."),
 H("4. Safety rules"),
 B("No interlock, flame detector, pressure switch or safety valve is ever bridged, blocked or forced. Bypassing a BMS is the most common cause of furnace explosions."),
 B("Never shorten the pre-purge; never light a burner by hand or with an open flame; never repeat ignition attempts without a new purge."),
 B("Gas smell: stop, do not switch anything, follow SOP-HT-11 (EI-HT-05 part B)."),
 B("Applicable safety standards for industrial furnace combustion systems (e.g. ISO 13577-2 / EN 746-2, NFPA 86) and local gas rules set the minimum purge, safety and response times; the competent engineer confirms which apply."),
 H("5. The burner management sequence"),seq,
 P("Note: above about 750 °C the chamber is hot enough to ignite gas by itself; the standards have special rules for this case. Follow the burner manufacturer's sequence for hot restarts — do not assume a hot furnace needs no purge.",{i:true,c:"555555",before:60}),
 H("6. Interlocks"),ilk,
 H("7. Operating steps"),
 P([t("Key points: "),t("⚠ Safety",{b:true,c:"B02A2A"}),t(" · "),t("● Critical",{b:true,c:"8A5A00"}),t(" · "),t("◆ Quality",{b:true,c:ACC})]),
 table([700,7238,1700],rows),
 H("8. Periodic tests of the safety functions"),tests,
 P("Record every test with the date, the result and the name; a failed test means the burner or chamber does not run until it is repaired and re-tested. Monthly and 6-monthly tests can be planned with the predictive maintenance checksheet F-MT-01.",{before:60}),
 H("9. Records"),
 B("BMS settings sheet (Annex A) and burner register (Annex B), signed by the competent engineer."),
 B("Shift log (flame checks), lockouts on the CALOR Alarms page, test records, supplier service reports, bypass permits."),
 H("10. Related documents"),P("WI-HT-01 · WI-HT-02 Furnace start-up · WI-HT-03 Furnace shut-down · SOP-HT-11 Emergency response · F-HT-02A / F-HT-03A checksheets · F-MT-01 Predictive maintenance checksheet · Burner and BMS manufacturers' manuals · Furnace manual · Gas safety rules of the site."),
 H("11. Revisions"),revs,P(" ",{after:120,kn:true}),sign,
 HB("Annex A. BMS settings sheet (one per furnace)"),P("Furnace: ________   BMS controller / model: ______________________   Date: ____________"),sett,
 H3("Fault codes of the BMS controller (copy from its manual)"),faults,
 HB("Annex B. Burner register"),burners];
const doc=new Document({
 styles:{default:{document:{run:{font:FONT,size:20}}}},
 numbering:{config:[{reference:"bul",levels:[{level:0,format:LevelFormat.BULLET,text:"•",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:360,hanging:240}}}}]}]},
 sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1000,bottom:1000,left:1134,right:1134}}},
  headers:{default:new Header({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:9638}],children:[t(`${DOCNO} rev 0 · ${TITLE}`,{size:16,c:"76838C"}),t("\tMass Wire and Steels Pvt. Ltd. · Bhiwadi",{size:16,c:"76838C"})]})]})},
  footers:{default:new Footer({children:[new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:9638}],children:[t("Controlled document: printed copies are uncontrolled unless stamped. Check the revision in force on the Procedures & WIs page.",{size:14,c:"76838C"}),new TextRun({children:["\tPage ",PageNumber.CURRENT," of ",PageNumber.TOTAL_PAGES],font:FONT,size:16,color:"76838C"})]})]})},
  children:body}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('/home/user/grain-boundary-project/documents/WI-HT-12_Burner_Management_System.docx',b);console.log('ok');});
