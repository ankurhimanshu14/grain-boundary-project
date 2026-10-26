/* Module VALID: heat treat process validation, initially and after relocation, major rebuild or modification (CQI-9 HTSA 1.7). Runs inside the shell:
   ACTIVE, onDoc, onWin, MWS and `location` come from the wrapper (build.py). Reads the specifications in force (MWS.spec, HTSA 1.6), the authorized people
   (MWS.org, HTSA 1.1), the SAT status (MWS.tc, HTSA 3.3), the quench tanks (MWS.quench, HTSA 3.14) and CALOR's production register (MWS.calor). */

/* 1. collection prefix (shared store only) */
const NS=c=>S.db&&S.db.local?c:"valid-"+c;

/* 2. constants */
const ID_RE=/^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const LKEY="mws-valid-local-v1";
const PROC={HT:"Hardening & tempering",IA:"Isothermal annealing",NORM:"Normalizing"};
/* the equipment a process line can integrate */
const EQ={hc:"Hardening chamber",qt:"Quench tank",cc:"Controlled cooling chamber",tc:"Tempering chamber",fan:"Fan cooling after exit",push:"Pusher, extractor and transfer",comb:"Burners and combustion",ctrl:"Controls, recording and over-temperature protection"};
const LINE_EQ={HT:["hc","qt","tc","push","comb","ctrl"],IA:["hc","cc","tc","push","comb","ctrl"],NORM:["hc","tc","fan","push","comb","ctrl"]};
/* kinds of equipment change; `true` = always a revalidation, null = decided by the assessment (WI-PV-02) */
const KIND={relocation:["Relocation of process equipment",true],location:["Change of heat treat location",true],rebuild:["Major rebuild",true],modification:["Modification",null],repair:["Repair / like-for-like replacement",null]};
const TRIG={initial:"Initial validation",relocation:"After relocation of equipment",location:"After a change of heat treat location",rebuild:"After a major rebuild",modification:"After a major modification",other:"Other (e.g. after a validation not passed)"};
const NEEDCHG=["relocation","location","rebuild","modification"];
/* the four elements of a validation (F-PV-01); `p` = processes the item applies to (all when missing) */
const ELEM=[
  {k:"eq",t:"A. Robust heat treat equipment",items:[
    ["tus","Temperature uniformity survey of each chamber of the line passed over the operating range"],
    ["otp","Over-temperature protection tested"],
    ["comb","Burners, combustion and furnace atmosphere set up (open direct-fired chambers: scaling / decarburization)"],
    ["push","Pusher, extractor and the push / transfer timing verified"],
    ["quench","Quench tank: medium, temperature, agitation, quench delay and dip time verified",["HT"]],
    ["cool","Controlled cooling: air flow and the cooling cycle within the push time verified",["IA"]],
    ["fan","Fan cooling after exit verified",["NORM"]],
    ["eqrec","Equipment survey / qualification record updated (furnace class, instrumentation type)"]]},
  {k:"ctl",t:"B. Process control, monitoring and calibration",items:[
    ["cal","Controllers and recorders (SCADA) calibrated"],
    ["sat","System accuracy test of the control thermocouples passed"],
    ["alarm","Alarms and interlocks tested"],
    ["param","Process parameters set and recorded per the process specification (set values, push time, quench / cooling)"],
    ["qmed","Quench medium analysed and within limits (HTSA 3.14)",["HT"]],
    ["mon","Monitoring and second-level data review in place (HTSA 1.9)"]]},
  {k:"test",t:"C. Test equipment calibration",items:[
    ["hard","Hardness testers calibrated and verified on certified test blocks"],
    ["lab","Metallurgical laboratory equipment calibrated (microscope, sample preparation)"],
    ["meth","Test methods and the people testing defined (qualified)"]]}];
const ITEMS=ELEM.flatMap(e=>e.items.map(([k,t,p])=>({k,t,p,e:e.k})));
const itApplies=(it,proc)=>!it.p||it.p.includes(proc);
const RES={ok:"OK",nok:"Not OK",na:"Not applicable"};
const CONC={valid:["ok","Validated"],not:["bad","Not validated"]};
const DEF={plant:"Mass Wire and Steels Pvt. Ltd. · Bhiwadi",reviewDays:365,graceDays:30,minLots:3,minPcs:5,cpkMin:1.33,approvers:"",
  runs:"F-01: IA, HT\nF-02: IA, NORM, HT\nF-03: IA, NORM\nF-04: IA, NORM"};
const SETF=[["plant","Plant","text"],["reviewDays","Review the validation procedure every (days)","number"],
  ["graceDays","A major change must be revalidated within (days; production waits for the validation)","number"],
  ["minLots","Product sampling: minimum trial lots per validation","number"],["minPcs","Product sampling: minimum hardness readings per lot","number"],
  ["cpkMin","Capability target (Cpk of all readings; below it a justification is needed)","number"],
  ["approvers","Who may approve a validation (one name per line; with the HT organization module the heat treat person, the deputy and the authorized positions count too)","area"],
  ["runs","Processes per furnace = the process lines (one line per furnace, e.g. F-01: IA, HT)","area"]];
const DOCS=[
  ["VALID/00_VALID_Master_List.md","Master list"],
  ["VALID/01_Procedure/MWSPL-QP-PV-01_Process_Validation.md","MWSPL-QP-PV-01 Heat treat process validation"],
  ["VALID/02_Work_Instructions/MWSPL-WI-PV-01_Validating_a_Process_Line.md","MWSPL-WI-PV-01 Validating a process line"],
  ["VALID/02_Work_Instructions/MWSPL-WI-PV-02_Equipment_Change_Assessment.md","MWSPL-WI-PV-02 Equipment change assessment"],
  ["VALID/03_Formats/MWSPL-F-PV-01_Process_Validation_Report.md","MWSPL-F-PV-01 Process validation report"],
  ["VALID/03_Formats/MWSPL-F-PV-02_Equipment_Change_Assessment.md","MWSPL-F-PV-02 Equipment change assessment"],
  ["VALID/03_Formats/MWSPL-F-PV-03_Validation_Matrix.md","MWSPL-F-PV-03 Validation matrix"],
  ["VALID/04_Application/mwspl-valid-module.md","Module description"]];
const CALOR_KEYS=["prod-reg"];

/* 3. helpers */
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{if(v===""||v==null)return null;const n=Number(String(v).replace(",","."));return isFinite(n)?n:null;};
const txt=v=>String(v??"").trim();
const clone=o=>JSON.parse(JSON.stringify(o??null));
const pad=n=>String(n).padStart(2,"0");
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>iso(new Date());
const isDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||""));
const addDays=(s,n)=>{const d=new Date(s+"T00:00:00");d.setDate(d.getDate()+Math.round(n));return iso(d);};
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtD=s=>isDate(s)?`${s.slice(8,10)}-${MON[+s.slice(5,7)-1]}-${s.slice(0,4)}`:"—";
const getp=(o,p)=>p.split(".").reduce((a,k)=>a==null?a:a[k],o);
const setp=(o,p,v)=>{const k=p.split(".");let a=o;k.slice(0,-1).forEach(x=>{if(a[x]==null||typeof a[x]!=="object")a[x]={};a=a[x];});a[k.at(-1)]=v;};
const pill=(c,t)=>`<span class="pill ${c||""}">${esc(t)}</span>`;
const plural=(n,w,p)=>`${n} ${n===1?w:(p||w+"s")}`;
const maxNo=L=>Math.max(0,...L.map(x=>+(String(x.id).match(/(\d+)$/)||[0,0])[1]));
const lines=v=>String(v||"").split(/[\n,;]+/).map(txt).filter(Boolean);
const arr=v=>Array.isArray(v)?v:[];
const r2=v=>v==null?null:Math.round(v*100)/100;
const CAL=k=>{try{return MWS.calor&&MWS.calor.get?MWS.calor.get(k):null;}catch(e){return null;}};

/* 4. state */
const S={view:"dash",db:null,dbState:"connecting",canWrite:true,dl:null,vals:[],chgs:[],cfg:{...DEF},proc:{no:"MWSPL-QP-PV-01",rev:0,prep:"",appr:"",apprDate:"",change:"",log:[]},
  docSel:DOCS[0][0],imp:null,modal:null,pending:false,unsub:[],q:{},filt:{line:"",st:""}};
const C=()=>S.cfg;

/* 5. domain logic */
function fillVal(o){const d={id:"",line:"",trigger:"initial",change:"",spec:"",part:"",plan:"",start:"",items:{},trials:[],scale:"",lsl:"",usl:"",
  conc:"",summary:"",justify:"",prep:"",appr:"",apprDate:"",status:"draft",log:[]};
  const x={...d,...(o||{})};if(!x.items||typeof x.items!=="object")x.items={};ITEMS.forEach(it=>{x.items[it.k]={r:"",ref:"",date:"",note:"",...(x.items[it.k]||{})};});
  x.trials=arr(x.trials).map(t=>({lot:"",date:"",part:"",pos:"",vals:"",micro:"",decarb:"",note:"",...(t||{})}));if(!Array.isArray(x.log))x.log=[];return x;}
function fillChg(o){const d={id:"",date:"",furnace:"",equip:[],kind:"modification",what:"",by:"",major:"",why:"",aBy:"",aDate:"",log:[]};
  const x={...d,...(o||{})};if(!Array.isArray(x.equip))x.equip=[];if(!Array.isArray(x.log))x.log=[];return x;}
const valById=id=>S.vals.find(v=>v.id===id)||null;
const chgById=id=>S.chgs.find(c=>c.id===id)||null;
function runsMap(){return String(C().runs||"").split(/\n/).map(l=>{const m=l.match(/^\s*([A-Za-z]-?\d+)\s*:\s*(.*)$/);return m?{f:m[1].toUpperCase(),p:m[2].split(/[\s,;]+/).map(x=>x.toUpperCase()).filter(x=>PROC[x])}:null;}).filter(Boolean);}
const furnaces=()=>runsMap().map(r=>r.f);
/* the process lines: furnace × process with the equipment integrated (F-PV-03) */
function lineList(){return runsMap().flatMap(r=>r.p.map(p=>({key:`${r.f}|${p}`,f:r.f,p,name:`${r.f} ${PROC[p]}`,equip:LINE_EQ[p]})));}
const lineOf=k=>lineList().find(l=>l.key===k)||(k?{key:k,f:k.split("|")[0],p:k.split("|")[1],name:`${k.split("|")[0]} ${PROC[k.split("|")[1]]||k.split("|")[1]||""}`,equip:LINE_EQ[k.split("|")[1]]||[],gone:true}:null);
const lineName=k=>(lineOf(k)||{name:k||"—"}).name;
/* a change: major (always for relocation, location change, rebuild; else the assessment), assessed, the lines it affects */
const forced=c=>KIND[c.kind]&&KIND[c.kind][1]===true;
const isMajor=c=>forced(c)||c.major==="yes";
const assessed=c=>forced(c)||(!!c.major&&txt(c.aBy)&&isDate(c.aDate)&&(c.major==="yes"||!!txt(c.why)));
const affects=(c,L)=>c.kind==="location"?(!c.furnace||c.furnace===L.f):(c.furnace===L.f&&c.equip.some(e=>L.equip.includes(e)));
const linesOf=c=>lineList().filter(L=>affects(c,L));
function chgMissing(c){const m=[];if(!isDate(c.date))m.push("date");if(c.kind!=="location"&&!c.furnace)m.push("furnace");if(c.kind!=="location"&&!c.equip.length)m.push("equipment changed");
  if(!txt(c.what))m.push("what was done");if(!txt(c.by))m.push("recorded by");
  if(!forced(c)){if(!c.major)m.push("assessment: major or not");else if(c.major==="no"&&!txt(c.why))m.push("why it is not major");if(!txt(c.aBy)||!isDate(c.aDate))m.push("assessed by / date");}
  return m;}
/* approvers: Settings names + the HT organization module's authorized people */
function approvers(){const L=lines(C().approvers).map(n=>({name:n,src:"Settings"}));
  try{if(MWS.org&&MWS.org.hasData&&MWS.org.hasData())MWS.org.authorized().forEach(a=>{if(!L.some(x=>x.name.toLowerCase()===a.name.toLowerCase()))L.push({name:a.name,src:a.position});});}catch(e){}
  return L;}
const isApprover=n=>{const L=approvers();return !L.length||L.some(a=>a.name.toLowerCase()===txt(n).toLowerCase());};
/* specifications in force for a line (Specifications module) */
function specsFor(L){try{return (MWS.spec&&MWS.spec.inForce?MWS.spec.inForce():[]).filter(e=>e.proc===L.p&&arr(e.furnaces).includes(L.f));}catch(e){return [];}}
/* product sampling: readings of a lot and of the whole validation */
const nums=s=>(String(s||"").match(/-?\d+(?:[.,]\d+)?/g)||[]).map(x=>+x.replace(",","."));
function trialCalc(t,V){const v=nums(t.vals),lo=num(V.lsl),hi=num(V.usl),n=v.length;if(!n)return {n:0,pass:false,out:0};
  const out=v.filter(x=>(lo!=null&&x<lo)||(hi!=null&&x>hi)).length,mean=v.reduce((a,b)=>a+b,0)/n;
  return {n,min:Math.min(...v),max:Math.max(...v),mean:r2(mean),out,pass:!out&&t.micro!=="nok"&&t.decarb!=="nok"};}
function smpCalc(V){const T=V.trials.map(t=>({t,c:trialCalc(t,V)})),lots=T.filter(x=>x.c.n),all=lots.flatMap(x=>nums(x.t.vals)),n=all.length,lo=num(V.lsl),hi=num(V.usl);
  let mean=null,sd=null,cpk=null;if(n){mean=all.reduce((a,b)=>a+b,0)/n;if(n>1){sd=Math.sqrt(all.reduce((a,b)=>a+(b-mean)**2,0)/(n-1));
    if(sd>0){const c=[hi!=null?(hi-mean)/(3*sd):null,lo!=null?(mean-lo)/(3*sd):null].filter(x=>x!=null);cpk=c.length?Math.min(...c):null;}}}
  const short=lots.filter(x=>x.c.n<+C().minPcs),fail=lots.filter(x=>!x.c.pass),low=cpk!=null&&cpk<+C().cpkMin;
  return {T,lots:lots.length,n,mean:r2(mean),sd:r2(sd),cpk:r2(cpk),short,fail,low,lastDate:lots.map(x=>x.t.date).filter(isDate).sort().at(-1)||"",
    ok:lots.length>=+C().minLots&&!short.length&&!fail.length&&(!low||!!txt(V.justify))&&cpk!=null};}
/* approval gate of a validation (F-PV-01) */
function valMissing(V){const m=[],L=lineOf(V.line);
  if(!V.line)m.push("process line");else if(L&&L.gone)m.push("a process line run now (Settings: processes per furnace)");
  if(!V.trigger)m.push("trigger");if(NEEDCHG.includes(V.trigger)&&!V.change)m.push("the equipment change record");
  const c=chgById(V.change);if(c&&L&&!affects(c,L))m.push(`a change that affects ${L.name}`);
  if(!txt(V.spec))m.push("process specification in force");if(!txt(V.part))m.push("representative part");if(!txt(V.plan))m.push("sampling plan");
  const its=ITEMS.filter(it=>itApplies(it,L?L.p:"")),un=its.filter(it=>!V.items[it.k].r),noRef=its.filter(it=>V.items[it.k].r==="ok"&&(!txt(V.items[it.k].ref)||!isDate(V.items[it.k].date))),
    naN=its.filter(it=>["na","nok"].includes(V.items[it.k].r)&&!txt(V.items[it.k].note)),nok=its.filter(it=>V.items[it.k].r==="nok");
  if(un.length)m.push(`${plural(un.length,"item")} not answered`);if(noRef.length)m.push(`evidence reference and date of ${plural(noRef.length,"item")} OK`);
  if(naN.length)m.push(`a note on every Not OK / Not applicable item (${naN.length})`);
  const sc=smpCalc(V);
  if(num(V.lsl)==null&&num(V.usl)==null)m.push("hardness limits of the specification");
  if(sc.lots<+C().minLots)m.push(`at least ${C().minLots} trial lots with readings (${sc.lots})`);
  if(sc.short.length)m.push(`at least ${C().minPcs} readings per lot (${sc.short.map(x=>x.t.lot||"lot").join(", ")})`);
  V.trials.forEach((t,i)=>{if(nums(t.vals).length&&(!txt(t.lot)||!isDate(t.date)))m.push(`lot ${i+1}: lot no. and date`);});
  if(!V.conc)m.push("conclusion");
  else if(V.conc==="valid"){if(nok.length)m.push(`"validated" with ${plural(nok.length,"item")} Not OK`);if(sc.fail.length)m.push(`"validated" with ${plural(sc.fail.length,"lot")} not passing`);
    if(sc.cpk==null&&sc.lots)m.push("readings enough for the capability (at least 2, not all equal)");if(sc.low&&!txt(V.justify))m.push(`a justification for Cpk ${sc.cpk} below ${C().cpkMin}`);}
  if(!txt(V.summary))m.push("summary");
  if(!txt(V.prep))m.push("prepared by");if(!txt(V.appr))m.push("approved by");else if(!isApprover(V.appr))m.push(`approved by a person allowed to approve (${approvers().map(a=>a.name).join(", ")})`);
  if(c&&sc.lastDate&&sc.lastDate<c.date)m.push("trial lots after the change date");
  return m;}
const approved=V=>V.status==="approved"&&isDate(V.apprDate);
/* production recorded on a furnace (CALOR's production register) from a day on */
function prodDays(f,from){const R=CAL("prod-reg");if(!R)return null;
  return [...new Set(arr(R.reports).filter(r=>r&&r.furnace===f&&isDate(r.date)&&r.date>=from&&arr(r.tl&&r.tl.trays).some(t=>arr(t.items).length)).map(r=>r.date))].sort();}
/* the validation state of a process line */
function lineState(L){
  const V=S.vals.filter(v=>v.line===L.key&&approved(v)).sort((a,b)=>a.apprDate<b.apprDate?-1:a.apprDate>b.apprDate?1:a.id<b.id?-1:1);
  const lastOk=V.filter(v=>v.conc==="valid").at(-1)||null,last=V.at(-1)||null,init=V.find(v=>v.conc==="valid")||null;
  const after=S.chgs.filter(c=>affects(c,L)&&isDate(c.date)&&(!lastOk||c.date>lastOk.apprDate));
  const pend=after.filter(isMajor),unass=after.filter(c=>!forced(c)&&!assessed(c)),drafts=S.vals.filter(v=>v.line===L.key&&!approved(v));
  const firstPend=pend.map(c=>c.date).sort()[0]||"",due=firstPend?addDays(firstPend,+C().graceDays||30):"",prod=firstPend?prodDays(L.f,firstPend):null;
  let st,lvl;
  if(!lastOk){st=last&&last.conc==="not"?"failed":"none";lvl="crit";}
  else if(last&&last.conc==="not"){st="failed";lvl="crit";}
  else if(pend.length){st="reval";lvl=(due&&due<today())||(prod&&prod.length)?"crit":"warn";}
  else{st="ok";lvl=unass.length?"warn":"good";}
  return {L,V,lastOk,last,init,pend,unass,drafts,due,prod:prod||[],st,lvl};}
const LST={none:["bad","Never validated"],failed:["bad","Not validated"],reval:["warn","Revalidation due"],ok:["ok","Validated"]};
const stPill=s=>s.st==="reval"?pill(s.lvl==="crit"?"bad":"warn",s.lvl==="crit"?"Revalidation overdue":"Revalidation due"):s.st==="ok"&&s.unass.length?pill("warn","Validated · change to assess"):pill(...LST[s.st]);
const procDue=()=>isDate(S.proc.apprDate)?addDays(S.proc.apprDate,+C().reviewDays||365):null;
/* automatic hints from the other modules */
function hints(V){const H={},L=lineOf(V.line);if(!L)return H;
  try{if(MWS.tc&&MWS.tc.hasData&&MWS.tc.hasData()){const T=[...MWS.tc.chamber(L.f,"Hardening"),...MWS.tc.chamber(L.f,"Tempering")].filter(t=>t.sat!=="na"),bad=T.filter(t=>!["ok","soon"].includes(t.sat));
    if(T.length)H.sat=[bad.length?"bad":"ok",bad.length?`Thermocouples module: ${bad.length} of ${T.length} thermocouples of ${L.f} without a SAT in date (${bad.slice(0,4).map(t=>t.tag+" "+t.satTxt).join("; ")}).`:`Thermocouples module: all ${T.length} thermocouples of ${L.f} with a SAT in date.`];}}catch(e){}
  try{if(L.p==="HT"&&MWS.quench&&MWS.quench.tanks){const Q=MWS.quench.tanks().filter(q=>q.furnace===L.f);H.qmed=Q.length?[Q.some(q=>q.lvl==="crit")?"bad":Q.some(q=>q.lvl==="warn")?"warn":"ok",`Quench media module: ${Q.map(q=>`${q.id} ${q.media} ${q.label.toLowerCase()}`).join("; ")}.`]:["bad",`Quench media module: no quench tank registered on ${L.f}.`];}}catch(e){}
  const sp=specsFor(L);if(sp.length)H.param=["ok",`Specifications in force for ${L.name}: ${sp.map(e=>`${e.id} rev ${e.rev} (${e.part})`).join(", ")}.`];
  else if(MWS.spec&&MWS.spec.inForce)H.param=["warn",`No specification in force for ${L.name} in the Specifications module.`];
  return H;}

/* HTSA 1.7 */
const SCORE={s:["ok","Satisfactory","acc"],ns:["warn","Not satisfactory","cond"],nia:["bad","Needs immediate action","rej"]};
const LV={ok:["ok","Met"],warn:["warn","Attention"],crit:["bad","Not met"],info:["acc","Note"]};
function assess17(){
  const I=[],add=(lvl,req,ev,act)=>I.push({lvl,req,ev,act}),pr=S.proc,due=procDue(),LS=lineList().map(lineState);
  if(!isDate(pr.apprDate))add("crit","A documented process validation procedure",`${pr.no||"The validation procedure"} is not approved.`,"Approve MWSPL-QP-PV-01 (Procedure & process lines).");
  else if(due&&due<today())add("warn","A documented process validation procedure",`${pr.no} rev ${pr.rev} approved ${fmtD(pr.apprDate)} by ${pr.appr}: review overdue since ${fmtD(due)}.`,"Review the procedure and record the review (new revision).");
  else add("ok","A documented process validation procedure",`${pr.no} rev ${pr.rev} approved ${fmtD(pr.apprDate)} by ${pr.appr}.`,"");
  if(!LS.length)add("crit","Process lines defined (the equipment integrated in each process)","No process line: Settings list no process per furnace.","Enter the processes run on each furnace (Settings).");
  else add("ok","Process lines defined (the equipment integrated in each process)",`${plural(LS.length,"process line")}: ${LS.map(s=>s.L.name).join(", ")}; each with its chambers, quench / cooling, pusher, combustion and controls.`,"");
  const nv=LS.filter(s=>s.st==="none"||s.st==="failed");
  if(nv.length)add("crit","Initial validation of each process",`${nv.map(s=>`${s.L.name} (${LST[s.st][1].toLowerCase()})`).join("; ")}.`,"Validate the line (WI-PV-01) before it runs production.");
  else if(LS.length)add("ok","Initial validation of each process",`Every line validated: ${LS.map(s=>`${s.L.name} ${s.init?s.init.id+" "+fmtD(s.init.apprDate):""}`).join("; ")}.`,"");
  const cov=(c,s)=>!s.lastOk||c.date>s.lastOk.apprDate;
  const reloc=S.chgs.filter(c=>c.kind==="relocation"||c.kind==="location"),relOpen=reloc.filter(c=>LS.some(s=>affects(c,s.L)&&cov(c,s)));
  if(!reloc.length)add("info","Validated after relocation or a change of location","No relocation or location change recorded.","");
  else if(relOpen.length)add("crit","Validated after relocation or a change of location",`${relOpen.map(c=>`${c.id} ${fmtD(c.date)} ${c.furnace||"site"}: ${LS.filter(s=>affects(c,s.L)&&cov(c,s)).map(s=>s.L.name).join(", ")} not revalidated`).join("; ")}.`,"Revalidate every line affected (WI-PV-01).");
  else add("ok","Validated after relocation or a change of location",`${plural(reloc.length,"change")} revalidated.`,"");
  const mods=S.chgs.filter(c=>c.kind==="rebuild"||c.kind==="modification"||c.kind==="repair"),unass=mods.filter(c=>!assessed(c)),maj=mods.filter(isMajor);
  const majOpen=maj.filter(c=>LS.some(s=>affects(c,s.L)&&cov(c,s)&&s.lastOk)),late=LS.filter(s=>s.st==="reval"&&s.lvl==="crit");
  if(late.length)add("crit","Validated after a major rebuild or modification",late.map(s=>`${s.L.name}: ${s.pend.map(c=>c.id).join(", ")} of ${fmtD(s.pend[0].date)} not revalidated${s.due<today()?" (due "+fmtD(s.due)+")":""}${s.prod.length?`; production recorded on ${s.L.f} on ${s.prod.slice(0,4).map(fmtD).join(", ")}${s.prod.length>4?" …":""}`:""}`).join("; ")+".","Stop production on the line, revalidate (WI-PV-01) and assess the product made since the change.");
  const dueL=LS.filter(s=>s.st==="reval"&&s.lvl!=="crit");
  if(dueL.length)add("warn","Revalidation in progress after a major change",dueL.map(s=>`${s.L.name}: ${s.pend.map(c=>c.id).join(", ")} of ${fmtD(s.pend[0].date)}, due ${fmtD(s.due)}`).join("; ")+".","Finish the revalidation within "+C().graceDays+" days; production waits for it.");
  if(!late.length&&!dueL.length){if(majOpen.length)add("warn","Validated after a major rebuild or modification",`${majOpen.map(c=>`${c.id} ${fmtD(c.date)} ${c.furnace}: revalidation due`).join("; ")}.`,"Finish the revalidation within "+C().graceDays+" days; production waits for it.");
  else if(!mods.length)add("info","Validated after a major rebuild or modification","No rebuild or modification recorded.","Record every rebuild and modification (WI-PV-02).");
  else add("ok","Validated after a major rebuild or modification",`${plural(maj.length,"major change")} revalidated; ${plural(mods.length-maj.length,"change")} assessed not major.`,"");}
  if(unass.length)add("warn","Equipment changes assessed",`${unass.map(c=>`${c.id} ${KIND[c.kind][0].toLowerCase()} ${fmtD(c.date)}`).join("; ")}: not assessed (major or not).`,"Assess each change with WI-PV-02.");
  const A=S.vals.filter(v=>approved(v)&&v.conc==="valid"),inc=A.filter(v=>valMissing(v).length);
  if(!A.length)add("crit","Validation content: equipment, process control and calibration, test equipment calibration, product sampling","No approved validation.","Validate with F-PV-01.");
  else if(inc.length)add("warn","Validation content: equipment, process control and calibration, test equipment calibration, product sampling",`${inc.map(v=>`${v.id}: ${valMissing(v).slice(0,3).join(", ")}`).join("; ")}.`,"Complete the record (imported or older records).");
  else add("ok","Validation content: equipment, process control and calibration, test equipment calibration, product sampling",`${plural(A.length,"approved validation")} with the four elements complete.`,"");
  const just=A.filter(v=>smpCalc(v).low);
  if(A.length)add(just.length?"warn":"ok","Strategic product sampling",just.length?`${just.map(v=>`${v.id} Cpk ${smpCalc(v).cpk}`).join(", ")}: capability below ${C().cpkMin}, justified.`:`Every approved validation: at least ${C().minLots} lots × ${C().minPcs} readings, all within the limits, Cpk ≥ ${C().cpkMin}.`,just.length?"Review the justification; consider more lots or a process improvement.":"");
  const crit=I.filter(i=>i.lvl==="crit").length;
  return {I,crit,LS,score:!isDate(pr.apprDate)||!LS.some(s=>s.lastOk)?"nia":crit?"ns":"s"};
}
function kp(){const A=assess17(),L=A.LS;return {score:A.score,crit:A.crit,lines:L.length,ok:L.filter(s=>s.st==="ok").length,never:L.filter(s=>s.st==="none"||s.st==="failed").length,
  reval:L.filter(s=>s.st==="reval").length,revalLate:L.filter(s=>s.st==="reval"&&s.lvl==="crit").length,unass:S.chgs.filter(c=>!assessed(c)).length,
  drafts:S.vals.filter(v=>!approved(v)).length,changes:S.chgs.length};}

/* 6. db plumbing: shared store (claude.use("db")) or localStorage with the same calls */
function toast(t){MWS.toast(t);}
const needDb=()=>{if(!S.db){toast("The record store is not ready yet.");return false;}if(!S.canWrite){toast("View only: you cannot change records.");return false;}return true;};
function localDb(){
  let data={};try{data=JSON.parse(localStorage.getItem(LKEY)||"{}")||{};}catch(e){data={};}
  const subs={},emit=c=>(subs[c]||[]).forEach(f=>f(Object.entries(data[c]||{}).map(([id,v])=>({...v,id}))));
  const persist=()=>{try{localStorage.setItem(LKEY,JSON.stringify(data));return true;}catch(e){return false;}};
  onWin("storage",e=>{if(e.key!==LKEY)return;try{data=JSON.parse(e.newValue||"{}")||{};}catch(x){data={};}Object.keys(subs).forEach(emit);});
  return {local:true,
    sub(c,f){(subs[c]=subs[c]||[]).push(f);setTimeout(()=>f(Object.entries(data[c]||{}).map(([id,v])=>({...v,id}))),0);return ()=>{subs[c]=(subs[c]||[]).filter(x=>x!==f);};},
    set(c,id,v){(data[c]=data[c]||{})[id]=clone(v);if(!persist())return Promise.reject({code:"quota_exceeded",message:"The browser storage is full."});emit(c);return Promise.resolve();},
    del(c,id){if(data[c])delete data[c][id];persist();emit(c);return Promise.resolve();}};
}
function sharedDb(db){
  return {local:false,
    sub(c,f){return db.collection(NS(c)).onSnapshot(sn=>f(sn.docs.map(d=>({...d.data(),id:d.id}))),err=>{S.dbState="error";toast("Record store: "+errMsg(err));render();});},
    set(c,id,v){return db.collection(NS(c)).doc(id).set(v);},
    del(c,id){return db.collection(NS(c)).doc(id).delete();}};
}
const errMsg=e=>({invalid_argument:"not allowed (check your access level)",quota_exceeded:"the store is full",resource_exhausted:"too many changes at once, try again",revoked:"access was withdrawn",unavailable:"the store is not reachable, try again"}[e&&e.code]||(e&&e.message)||"failed");
function dbSet(c,id,v){if(!ID_RE.test(id))return Promise.reject({message:"invalid record id "+id});const k=c+"/"+id;
  const p=(S.q[k]||Promise.resolve()).catch(()=>{}).then(()=>S.db.set(c,id,JSON.parse(JSON.stringify(v))));S.q[k]=p;return p;}
function dbDel(c,id){const k=c+"/"+id;const p=(S.q[k]||Promise.resolve()).catch(()=>{}).then(()=>S.db.del(c,id));S.q[k]=p;return p;}
async function put(c,o,logText){if(!needDb())return false;if(logText){o.log=o.log||[];o.log.push({d:today(),t:logText});}
  try{await dbSet(c,o.id,o);return true;}catch(e){toast("Not saved: "+errMsg(e));return false;}}
async function saveProc(t){S.proc.log=S.proc.log||[];if(t)S.proc.log.push({d:today(),t});try{await dbSet("config","proc",S.proc);return true;}catch(e){toast("Not saved: "+errMsg(e));return false;}}
async function saveCfg(){if(!needDb())return;try{await dbSet("config","settings",S.cfg);toast("Settings saved");}catch(e){toast("Not saved: "+errMsg(e));}}
async function batchPut(c,L){for(let i=0;i<L.length;i+=8)await Promise.all(L.slice(i,i+8).map(o=>dbSet(c,o.id,o)));}
function startStore(store,state){
  S.unsub.forEach(u=>{try{u();}catch(e){}});S.db=store;S.dbState=state;
  S.unsub=[store.sub("vals",L=>{S.vals=L.map(fillVal).sort((a,b)=>a.id<b.id?-1:1);safeRender();}),
    store.sub("changes",L=>{S.chgs=L.map(fillChg).sort((a,b)=>a.id<b.id?-1:1);safeRender();}),
    store.sub("config",L=>{const c=L.find(x=>x.id==="settings"),p=L.find(x=>x.id==="proc");S.cfg={...DEF,...(c||{})};delete S.cfg.id;
      S.proc={no:"MWSPL-QP-PV-01",rev:0,prep:"",appr:"",apprDate:"",change:"",log:[],...(p||{})};delete S.proc.id;safeRender();})];
  render();
}
function safeRender(){
  const a=document.activeElement;if(S.modal||(a&&$("#main")&&$("#main").contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=true;return;}
  render();
}
onDoc("focusout",()=>setTimeout(()=>{if(S.pending&&!S.modal){const a=document.activeElement;if(!(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=false;render();}}},0));

/* 7. navigation */
const NAV=[["",[["dash","Dashboard"]]],["P",[["proc","Procedure & process lines"]]],["D",[["changes","Equipment changes"],["vals","Validations"]]],
  ["C",[["review","HTSA 1.7"]]],["A",[["act","Actions"]]],["",[["settings","Settings"],["rules","Rules"],["docs","Docs"],["data","Data"]]]];
const navHtml=()=>`<div class="wrap">${NAV.map(([p,it])=>`<div class="grp">${p?`<span class="pd">${p}</span>`:""}${it.map(([k,l])=>`<a href="#${k}" ${S.view===k?'aria-current="page"':""}>${l}</a>`).join("")}</div>`).join("")}</div>`;
function route(){const v=(location.hash||"").slice(1);S.view=VIEWS[v]?v:"dash";}
const banner=()=>S.dbState==="local"?`<div class="banner warn">${MWS.sync&&MWS.sync.linked()?`Records are kept in this browser and saved to the Google Drive folder <b>${esc(MWS.sync.folder())}</b>.`:`Local mode: records are kept in this browser only. Link a Google Drive folder (button at the top right) or back up from the <a href="#data">Data</a> tab.`}</div>`
  :S.dbState==="connecting"?`<div class="banner">Connecting to the record store…</div>`:S.dbState==="error"?`<div class="banner bad">The record store reported an error; changes may not be saved.</div>`:"";
function render(){
  if(!ACTIVE()){MWS.bg();return;}
  $("#nav").innerHTML=navHtml();
  const ds=$("#dbstate");if(ds)ds.textContent=S.dbState==="on"?"Shared · live":S.dbState==="local"?"Local · this browser":S.dbState==="error"?"Store error":"Connecting…";
  document.body.classList.toggle("ro",!S.canWrite);
  $("#main").innerHTML=`<div class="stack">${banner()}${(VIEWS[S.view]||VIEWS.dash)()}</div>`;
  (AFTER[S.view]||(()=>{}))();
}

/* 8. views */
const procPill=()=>{const p=S.proc,due=procDue();return !isDate(p.apprDate)?pill("bad","Not approved"):due&&due<today()?pill("warn",`Rev ${p.rev} · review overdue`):pill("ok",`Rev ${p.rev} approved ${fmtD(p.apprDate)}`);};
const valPill=V=>approved(V)?pill(...CONC[V.conc]||["","—"]):pill("warn","Draft");
const chgPill=c=>!assessed(c)?pill("warn","To assess"):isMajor(c)?pill("acc","Major: revalidate"):pill("","Not major");
function attention(){const out=[],A=assess17();
  if(!isDate(S.proc.apprDate))out.push([`data-procappr`,"The validation procedure is not approved","bad"]);
  A.LS.forEach(s=>{const dr=s.drafts[0];
    if(s.st==="none"||s.st==="failed")out.push([dr?`data-open="${esc(dr.id)}"`:`data-new-val="${esc(s.L.key)}"`,`${s.L.name}: ${LST[s.st][1].toLowerCase()}${dr?" · "+dr.id+" in work":""}`,"bad"]);
    else if(s.st==="reval")out.push([dr?`data-open="${esc(dr.id)}"`:`data-new-val="${esc(s.L.key)}" data-chg-ref="${esc(s.pend[0].id)}"`,`${s.L.name}: revalidation after ${s.pend.map(c=>c.id).join(", ")} ${s.lvl==="crit"?"overdue":"due "+fmtD(s.due)}${s.prod.length?` · production recorded since ${fmtD(s.prod[0])}`:""}${dr?" · "+dr.id+" in work":""}`,s.lvl==="crit"?"bad":"warn"]);});
  S.chgs.filter(c=>!assessed(c)).forEach(c=>out.push([`data-open-chg="${esc(c.id)}"`,`${c.id} ${KIND[c.kind][0]} ${c.furnace} ${fmtD(c.date)}: assess (major or not)`,"warn"]));
  return out;}
function vDash(){
  if(!S.vals.length&&!S.chgs.length&&!isDate(S.proc.apprDate))return `<div class="empty"><h2>No process validation recorded yet</h2><p>Approve the validation procedure, then record the validation of every process line (furnace × process) and every relocation, rebuild or modification of the equipment. The starter set-up shows how the module works on the plant's lines.</p><div class="row" style="justify-content:center"><button class="pri w" data-new-val>New validation</button><button class="w" data-std>Load starter set-up</button></div></div>`;
  const A=assess17(),sc=SCORE[A.score],k=kp(),att=attention();
  return `<div class="tiles">
    <a class="tile ${sc[0]}" href="#review"><span class="k">HTSA 1.7</span><span class="v" style="font-size:20px;padding:6px 0">${sc[1]}</span><span class="small muted">${plural(A.crit,"item")} not met</span></a>
    <a class="tile ${k.ok===k.lines&&k.lines?"ok":"bad"}" href="#proc"><span class="k">Process lines validated</span><span class="v">${k.ok}/${k.lines}</span><span class="small muted">${k.never} never / not validated</span></a>
    <a class="tile ${k.revalLate?"bad":k.reval?"warn":""}" href="#act"><span class="k">Revalidation due</span><span class="v">${k.reval}</span><span class="small muted">${k.revalLate} overdue</span></a>
    <a class="tile ${k.unass?"warn":""}" href="#changes"><span class="k">Changes to assess</span><span class="v">${k.unass}</span><span class="small muted">of ${k.changes} recorded</span></a>
    <a class="tile ${k.drafts?"warn":""}" href="#vals"><span class="k">Validations in work</span><span class="v">${k.drafts}</span><span class="small muted">not yet approved</span></a></div>
  <div class="grid2"><div class="panel"><div class="row between"><h3>Needs attention</h3><button class="pri w" data-new-val>New validation</button></div>
    ${att.length?`<ul class="issues">${att.slice(0,12).map(([a,t,c])=>`<li><button class="link" ${a}>${esc(t)}</button> ${pill(c,c==="bad"?"Not met":"Attention")}</li>`).join("")}</ul>`:`<p class="muted">Nothing open.</p>`}</div>
  <div class="panel"><h3>Process lines</h3>${matrixTable(A.LS,true)}</div></div>`;
}
function matrixTable(LS,brief){
  return `<div class="tw"><table><thead><tr><th>Process line</th>${brief?"":"<th>Equipment integrated</th><th>Initial validation</th>"}<th>Latest validation</th>${brief?"":"<th>Changes since</th>"}<th>Status</th></tr></thead><tbody>${LS.map(s=>`<tr>
    <td><b>${esc(s.L.name)}</b></td>${brief?"":`<td class="small">${esc(s.L.equip.map(e=>EQ[e]).join(", "))}</td><td>${s.init?`<button class="link" data-open="${esc(s.init.id)}">${esc(s.init.id)}</button> ${fmtD(s.init.apprDate)}`:"—"}</td>`}
    <td>${s.last?`<button class="link" data-open="${esc(s.last.id)}">${esc(s.last.id)}</button> ${fmtD(s.last.apprDate)}<br><span class="small muted">${esc(TRIG[s.last.trigger]||"")}</span>`:s.drafts.length?`<span class="small muted">${esc(s.drafts[0].id)} in work</span>`:"—"}</td>
    ${brief?"":`<td class="small">${s.pend.length||s.unass.length?[...new Set([...s.pend,...s.unass])].map(c=>`<button class="link" data-open-chg="${esc(c.id)}">${esc(c.id)}</button> ${esc(KIND[c.kind][0].toLowerCase())}`).join("<br>"):"—"}</td>`}
    <td>${stPill(s)}</td></tr>`).join("")}</tbody></table></div>`;}
function vProc(){const A=assess17();
  return `<div class="panel"><div class="row between"><h3>Process validation procedure</h3><button class="w" data-procappr>${isDate(S.proc.apprDate)?"Approve a new revision":"Approve the procedure"}</button></div>
    <p>${esc(S.proc.no)} ${procPill()}</p><p class="small muted">The procedure itself is the document MWSPL-QP-PV-01 (<a href="#docs" data-docref="01_Procedure/MWSPL-QP-PV-01_Process_Validation.md">open it</a>). Its approval and review are recorded here.</p>
    ${S.proc.log.length?`<ul class="small">${S.proc.log.slice().reverse().map(l=>`<li>${fmtD(l.d)} · ${esc(l.t)}</li>`).join("")}</ul>`:""}</div>
  <div class="panel"><div class="row between"><h3>Process lines (F-PV-03)</h3><button data-mprint>Print F-PV-03</button></div>
    <p class="small muted">A process line is one process on one furnace with every piece of equipment integrated in it (Settings: processes per furnace). A change to a piece of equipment affects every line that uses it; a change of location affects every line.</p>
    ${A.LS.length?matrixTable(A.LS,false):`<p class="muted">No process line: enter the processes per furnace in Settings.</p>`}</div>`;}
function vChanges(){const L=S.chgs.slice().reverse();
  return `<div class="row between"><h2>Equipment changes (F-PV-02)</h2><button class="pri w" data-new-chg>Record a change</button></div>
  <p class="muted">Every relocation, change of location, rebuild, modification or major repair of the equipment of a process line. Relocation, change of location and a major rebuild always need a revalidation; a modification or repair is assessed (WI-PV-02).</p>
  ${L.length?`<div class="tw"><table><thead><tr><th>Change</th><th>Date</th><th>Furnace</th><th>Kind · equipment</th><th>What was done</th><th>Assessment</th><th>Lines affected</th></tr></thead><tbody>${L.map(c=>{const LS=linesOf(c).map(lineState);
    return `<tr class="click" data-open-chg="${esc(c.id)}"><td class="mono">${esc(c.id)}</td><td>${fmtD(c.date)}</td><td>${esc(c.furnace||"Site")}</td><td>${esc(KIND[c.kind][0])}<br><span class="small muted">${esc(c.equip.map(e=>EQ[e]).join(", "))}</span></td><td class="small">${esc(c.what)}</td><td>${chgPill(c)}${c.major==="no"&&c.why?`<br><span class="small muted">${esc(c.why)}</span>`:""}</td>
    <td class="small">${isMajor(c)?LS.map(s=>`${esc(s.L.name)} ${s.lastOk&&s.lastOk.apprDate>=c.date?pill("ok","revalidated "+s.lastOk.id):pill("warn","open")}`).join("<br>")||"—":"—"}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No equipment change recorded.</p></div>`}`;}
function vVals(){const f=S.filt;
  const L=S.vals.filter(v=>(!f.line||v.line===f.line)&&(!f.st||(f.st==="draft"?!approved(v):approved(v)&&v.conc===f.st))).slice().reverse();
  return `<div class="row between"><h2>Validations (F-PV-01)</h2><button class="pri w" data-new-val>New validation</button></div>
  <div class="row"><select data-filt="line"><option value="">All process lines</option>${lineList().map(l=>`<option value="${esc(l.key)}" ${f.line===l.key?"selected":""}>${esc(l.name)}</option>`).join("")}</select>
    <select data-filt="st"><option value="">All</option>${[["draft","In work"],["valid","Validated"],["not","Not validated"]].map(([k,t])=>`<option value="${k}" ${f.st===k?"selected":""}>${t}</option>`).join("")}</select></div>
  ${L.length?`<div class="tw"><table><thead><tr><th>Validation</th><th>Process line</th><th>Trigger</th><th>Part · specification</th><th>Sampling</th><th>Approved</th><th>Result</th></tr></thead><tbody>${L.map(v=>{const sc=smpCalc(v);
    return `<tr class="click" data-open="${esc(v.id)}"><td class="mono">${esc(v.id)}</td><td><b>${esc(lineName(v.line))}</b></td><td>${esc(TRIG[v.trigger]||"")}${v.change?`<br><span class="small muted">${esc(v.change)}</span>`:""}</td><td>${esc(v.part)}<br><span class="small muted">${esc(v.spec)}</span></td>
    <td>${sc.lots} lots · ${sc.n} readings${sc.cpk!=null?`<br><span class="small muted">Cpk ${sc.cpk}</span>`:""}</td><td>${approved(v)?`${fmtD(v.apprDate)}<br><span class="small muted">${esc(v.appr)}</span>`:"—"}</td><td>${valPill(v)}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No validation matches.</p></div>`}`;}
function vReview(){
  const A=assess17(),sc=SCORE[A.score];
  return `<div class="panel"><div class="row between"><h3>HTSA 1.7 · Has the heat treat process been validated initially and after the process equipment has been relocated, or had a major rebuild or modification?</h3><button data-h17>Evidence (print)</button></div>
    <p><span class="verdict ${sc[2]}">${sc[1]}</span> <span class="muted">${plural(A.I.filter(i=>i.lvl==="ok").length,"item")} met · ${plural(A.crit,"item")} not met · ${plural(A.I.filter(i=>i.lvl==="warn").length,"item")} needing attention</span></p>
    <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th><th>Action</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${pill(...LV[i.lvl])}</td><td>${esc(i.act)}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted" style="margin-top:8px">The question asks for a validation of each process initially, after relocation of process equipment or a change of heat treat location, and after a major rebuild of any equipment; a process line may combine the equipment integrated in one process (hardening, quenching, tempering). Validation consists of robust equipment, rigorous process control and monitoring with calibrations, test equipment calibration and strategic product sampling. Wording to confirm against the controlled CQI-9 copy.</p></div>`;}
function vAct(){const att=attention(),A=assess17(),nv=S.vals.filter(v=>approved(v)&&v.conc==="not");
  return `<div class="panel"><h3>Open items</h3>${att.length?`<ul class="issues">${att.map(([a,t,c])=>`<li><button class="link" ${a}>${esc(t)}</button> ${pill(c,c==="bad"?"Not met":"Attention")}</li>`).join("")}</ul>`:`<p class="muted">Nothing open.</p>`}</div>
  <div class="panel"><h3>Production after a change, before the revalidation</h3><p class="small muted">From CALOR's production register (read on the Data tab). Product made on a line between a major change and its revalidation is assessed (hold, test, release or rework).</p>
    ${CAL("prod-reg")?(A.LS.filter(s=>s.prod.length).length?`<ul>${A.LS.filter(s=>s.prod.length).map(s=>`<li><b>${esc(s.L.name)}</b>: ${s.prod.map(fmtD).join(", ")} (after ${esc(s.pend.map(c=>c.id).join(", "))})</li>`).join("")}</ul>`:`<p class="muted">None.</p>`):`<p class="muted">CALOR's production register is not read.</p>`}</div>
  <div class="panel"><h3>Validations concluded not validated</h3>${nv.length?`<ul>${nv.map(v=>`<li><button class="link" data-open="${esc(v.id)}">${esc(v.id)}</button> ${esc(lineName(v.line))} ${fmtD(v.apprDate)}: ${esc(v.summary)}</li>`).join("")}</ul>`:`<p class="muted">None.</p>`}</div>`;}
function vSettings(){const c=C();
  return `<div class="panel"><h3>Settings</h3><div class="fields">${SETF.map(([k,l,t])=>t==="area"?`<label class="f wide"><span>${esc(l)}</span><textarea data-cfg="${k}" rows="4">${esc(c[k])}</textarea></label>`:`<label class="f"><span>${esc(l)}</span><input data-cfg="${k}" type="${t}" ${t==="number"?'step="any"':""} value="${esc(c[k])}"></label>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="pri w" data-save-cfg>Save settings</button><span class="small muted">Changes are kept only after Save. Figures are site rules to confirm against the controlled CQI-9 copy and customer requirements, not CQI-9 values.</span></div></div>`;}
function vRules(){const c=C();
  const R=[["Procedure","MWSPL-QP-PV-01 is approved (number, revision, approved by, date) and reviewed every "+c.reviewDays+" days; a review is recorded as a new revision."],
    ["Process lines","One line per furnace and process (Settings: processes per furnace). Equipment per process: hardening & tempering = hardening chamber, quench tank, tempering chamber; isothermal annealing = hardening chamber, controlled cooling chamber, tempering chamber; normalizing = hardening chamber, tempering chamber, fan cooling; every line also uses the pusher / extractor, the combustion and the controls."],
    ["Changes","Relocation of equipment, change of location and a major rebuild always need a revalidation; a modification or a repair is assessed (major or not, with the reason; assessed by, date). A change affects every line of the furnace that uses an equipment changed; a change of location affects every line (of the furnace named, or of the site)."],
    ["Line status","Validated = the latest approved validation concludes validated and no major change since. Revalidation due = a major change after the latest validation; overdue after "+c.graceDays+" days or as soon as CALOR's production register shows production on the furnace since the change. Never validated / not validated = no approved validation concluding validated, or the latest concludes not validated."],
    ["Validation gate","Line, trigger (and the change record for a revalidation, which must affect the line), process specification, representative part, sampling plan; every item of elements A–C that applies answered (OK with evidence reference and date; Not OK / Not applicable with a note); hardness limits; at least "+c.minLots+" lots with lot no. and date, at least "+c.minPcs+" readings each, trial lots after the change; conclusion (validated only without Not OK items or failing lots, with a capability Cpk ≥ "+c.cpkMin+" or a justification); summary; prepared and approved by a person allowed to approve. Approved = locked."],
    ["Product sampling","A lot passes when every reading is within the limits and the microstructure and decarburization are not Not OK. Cpk = the lower of (USL − mean) / 3σ and (mean − LSL) / 3σ over all readings (σ = sample standard deviation)."],
    ["HTSA 1.7 score","Needs immediate action: the procedure is not approved or no process line is validated. Not satisfactory: a line never / not validated, a relocation not revalidated, a major change revalidation overdue or with production since. Satisfactory: otherwise."]];
  return `<h2>Rules of this module</h2><div class="tw"><table><tbody>${R.map(([a,b])=>`<tr><td style="width:200px"><b>${a}</b></td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>`;}
function md(src){
  const inl=t=>esc(t).replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g,"$1<i>$2</i>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,(m,a,h)=>/\.md$/.test(h)?`<a href="#docs" data-docref="${esc(h)}">${a}</a>`:`<a href="${esc(h)}" target="_blank" rel="noopener">${a}</a>`);
  const L=String(src).replace(/\r/g,"").split("\n"),out=[];let i=0;
  while(i<L.length){const l=L[i];
    if(/^```/.test(l)){const b=[];i++;while(i<L.length&&!/^```/.test(L[i]))b.push(L[i++]);i++;out.push(`<pre>${esc(b.join("\n"))}</pre>`);continue;}
    const h=l.match(/^(#{1,4})\s+(.*)$/);if(h){out.push(`<h${h[1].length}>${inl(h[2])}</h${h[1].length}>`);i++;continue;}
    if(/^\|/.test(l)&&i+1<L.length&&/^\|\s*:?-{2,}/.test(L[i+1])){const row=x=>x.replace(/^\||\|$/g,"").split("|").map(c=>c.trim());const hd=row(l);i+=2;const rs=[];
      while(i<L.length&&/^\|/.test(L[i]))rs.push(row(L[i++]));out.push(`<div class="tw"><table><thead><tr>${hd.map(c=>`<th>${inl(c)}</th>`).join("")}</tr></thead><tbody>${rs.map(r=>`<tr>${r.map(c=>`<td>${inl(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);continue;}
    if(/^\s*([-*]|\d+\.)\s+/.test(l)){const ol=/^\s*\d+\./.test(l),it=[];while(i<L.length&&/^\s*([-*]|\d+\.)\s+/.test(L[i])){it.push(L[i].replace(/^\s*([-*]|\d+\.)\s+/,"").replace(/^\[ \]\s*/,"☐ ").replace(/^\[x\]\s*/i,"☑ "));i++;}
      out.push(`<${ol?"ol":"ul"}>${it.map(x=>`<li>${inl(x)}</li>`).join("")}</${ol?"ol":"ul"}>`);continue;}
    if(/^>\s?/.test(l)){const b=[];while(i<L.length&&/^>\s?/.test(L[i]))b.push(L[i++].replace(/^>\s?/,""));out.push(`<div class="banner">${inl(b.join(" "))}</div>`);continue;}
    if(/^---+\s*$/.test(l)){out.push("<hr>");i++;continue;}
    if(!l.trim()){i++;continue;}
    const p=[];while(i<L.length&&L[i].trim()&&!/^(#{1,4}\s|```|\||\s*([-*]|\d+\.)\s|>)/.test(L[i]))p.push(L[i++]);out.push(`<p>${inl(p.join(" "))}</p>`);}
  return out.join("\n");
}
function vDocs(){return `<h2>Documentation</h2><div class="docs"><div class="doclist panel">${DOCS.map(([p,t])=>`<button data-doc="${esc(p)}" aria-current="${S.docSel===p}">${esc(t)}</button>`).join("")}</div><div class="doc" id="docview"><p class="muted">Loading…</p></div></div>`;}
function showDoc(){
  const el=$("#docview");if(!el)return;const p=S.docSel,t=MWS.docs&&MWS.docs[p];
  if(t!=null){el.innerHTML=md(t);return;}
  el.innerHTML=`<p class="banner warn">This document is not embedded in this build (${esc(p)}).</p>`;
}
function vData(){const n=S.vals.length+S.chgs.length;
  return `<h2>Data</h2><div class="grid2">
  <div class="panel"><h3>Back up and restore</h3><p class="small muted">${plural(S.vals.length,"validation")}, ${plural(S.chgs.length,"change")} · storage: ${S.dbState==="on"?"shared record store":"this browser"}.</p>
    <div class="row"><button class="pri" data-export>Export JSON</button><button data-csv>Validations CSV</button></div>
    <div class="row w" style="margin-top:10px"><label class="f"><span>Import a JSON export</span><input type="file" id="impfile" accept=".json,application/json"></label></div>
    ${S.imp?`<div class="banner" style="margin-top:8px">${esc(S.imp.msg)}<div class="row" style="margin-top:6px"><button class="pri" data-imp="merge">Merge (add and update)</button><button class="danger" data-imp="replace">Replace everything</button><button data-imp="cancel">Cancel</button></div></div>`:""}</div>
  ${MWS.calor&&MWS.calor.panel?`<div class="panel">${MWS.calor.panel(CALOR_KEYS,"The production register shows production on a furnace between a major change and its revalidation.")}</div>`:""}
  <div class="panel"><h3>Starter set-up</h3><p class="small muted">An approved procedure, the initial validation of the plant's process lines (F-04 normalizing never validated), a rebuild of the F-03 hardening chamber with the isothermal annealing line revalidated and the normalizing line not yet, a modification of the F-02 quench agitation with its revalidation in work, and a like-for-like repair assessed not major; all marked "(example)".</p><button class="w" data-std ${n?"disabled":""}>Load starter set-up</button>${n?`<p class="small muted">Only on an empty module.</p>`:""}</div>
  <div class="panel"><h3>Clear all</h3><p class="small muted">Deletes every record and the settings of this module. Type <b>CLEAR ALL</b> to enable.</p>
    <div class="row w"><input id="clrtxt" placeholder="CLEAR ALL" style="max-width:180px"><button class="danger" data-clear>Clear all</button></div></div></div>`;}
const VIEWS={dash:vDash,proc:vProc,changes:vChanges,vals:vVals,review:vReview,act:vAct,settings:vSettings,rules:vRules,docs:vDocs,data:vData};
const AFTER={docs:showDoc};

/* 9. modal record sheets */
function mf(path,label,o={}){
  const ed=S.modal.ed,v=getp(ed,path),id="m-"+path.replace(/\./g,"-"),dis=o.dis?"disabled":"";
  let ctl;
  if(o.opts)ctl=`<select id="${id}" data-p="${path}" ${dis}>${o.blank?`<option value="">—</option>`:""}${o.opts.map(([k,t])=>`<option value="${esc(k)}" ${String(v)===String(k)?"selected":""}>${esc(t)}</option>`).join("")}</select>`;
  else if(o.area)ctl=`<textarea id="${id}" data-p="${path}" rows="${o.area}" ${dis}>${esc(v)}</textarea>`;
  else ctl=`<input id="${id}" data-p="${path}" ${o.type?`type="${o.type}"`:""} ${o.list?`list="${o.list}"`:""} value="${esc(v)}" ${o.ph?`placeholder="${esc(o.ph)}"`:""} ${dis}>`;
  return `<label class="f ${o.req?"req":""} ${o.wide?"wide":""}" for="${id}"><span>${esc(label)}</span>${ctl}${o.hint?`<span class="small muted">${esc(o.hint)}</span>`:""}</label>`;
}
function openModal(m){S.modal=m;$("#modal").hidden=false;redraw();}
function closeModal(){S.modal=null;const el=$("#modal");if(el){el.hidden=true;el.innerHTML="";}document.body.classList.remove("pm");if(S.pending){S.pending=false;render();}}
function redraw(){const el=$("#modal");if(!S.modal||!el)return;const st=el.scrollTop;el.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${(DRAW[S.modal.kind])()}</div>`;el.scrollTop=st;}
const sheet=(title,body,foot)=>`<div class="row between"><h2>${title}</h2><button data-close aria-label="Close">✕</button></div>${body}<div class="sticky-foot"><span class="msg" id="mmsg">${S.modal.msg||""}</span>${foot}</div>`;
const msg=(t,ok)=>{if(!S.modal)return;S.modal.msg=t?`<span style="color:var(--${ok?"ok":"bad"})">${esc(t)}</span>`:"";const el=$("#mmsg");if(el)el.innerHTML=S.modal.msg;};
/* fill the specification, part and limits of a line from the Specifications module (only empty fields) */
function fromSpec(E){const L=lineOf(E.line);if(!L)return;const sp=specsFor(L)[0];if(!sp)return;
  if(!txt(E.spec))E.spec=`${sp.id} rev ${sp.rev}`;if(!txt(E.part))E.part=sp.part||"";const q=sp.req||{};
  if(!txt(E.lsl)&&num(q.hMin)!=null)E.lsl=String(q.hMin);if(!txt(E.usl)&&num(q.hMax)!=null)E.usl=String(q.hMax);if(!txt(E.scale)&&q.scale)E.scale=q.scale;}
function valModal(id,init){const v=valById(id);const E=v?clone(v):fillVal({start:today(),...(init||{})});if(!v)fromSpec(E);openModal({kind:"val",ed:E,msg:""});}
function DRAW_VAL(){
  const E=S.modal.ed,known=valById(E.id),lock=approved(E),L=lineOf(E.line),miss=valMissing(E),H=hints(E),sc=smpCalc(E),chs=L?S.chgs.filter(c=>affects(c,L)):S.chgs;
  const itemRows=el=>el.items.map(([k,t,p])=>({k,t,p})).filter(it=>itApplies(it,L?L.p:"")).map(it=>{const a=E.items[it.k],h=H[it.k];
    return `<tr><td>${esc(it.t)}${h?`<br><span class="small c-${h[0]==="ok"?"ok":h[0]==="bad"?"bad":"warn"}">${esc(h[1])}</span>`:""}</td><td><select data-it="${it.k}.r" ${lock?"disabled":""}><option value="">—</option>${Object.entries(RES).map(([k,l])=>`<option value="${k}" ${a.r===k?"selected":""}>${l}</option>`).join("")}</select></td>
      <td><input data-it="${it.k}.ref" value="${esc(a.ref)}" ${lock?"disabled":""}></td><td><input type="date" data-it="${it.k}.date" value="${esc(a.date)}" ${lock?"disabled":""}></td><td><input data-it="${it.k}.note" value="${esc(a.note)}" ${lock?"disabled":""}></td></tr>`;}).join("");
  const body=`<p class="muted">${known?valPill(known):pill("warn","New · draft")} ${L?`· ${esc(L.equip.map(e=>EQ[e]).join(", "))}`:""}</p>
  <fieldset><legend>Protocol</legend><div class="fields">
    ${mf("line","Process line",{opts:lineList().map(l=>[l.key,l.name]),blank:1,req:1,dis:lock})}${mf("trigger","Trigger",{opts:Object.entries(TRIG),req:1,dis:lock})}
    ${NEEDCHG.includes(E.trigger)||E.change?mf("change","Equipment change record",{opts:chs.map(c=>[c.id,`${c.id} · ${fmtD(c.date)} · ${KIND[c.kind][0]}`]),blank:1,req:NEEDCHG.includes(E.trigger),dis:lock}):""}
    ${mf("spec","Process specification in force (no., rev)",{req:1,dis:lock})}${mf("part","Representative part",{req:1,dis:lock})}${mf("start","Validation started",{type:"date",dis:lock})}
    ${mf("plan","Sampling plan: lots, trays, positions (first / last tray; front / back, top / bottom; each wall), readings per lot, tests",{area:3,wide:1,req:1,dis:lock})}</div>
    ${!lock&&L&&specsFor(L).length?`<p class="small muted">Specifications in force for ${esc(L.name)}: ${esc(specsFor(L).map(e=>`${e.id} rev ${e.rev} (${e.part})`).join(", "))} <button data-usespec>Use the first</button></p>`:""}</fieldset>
  ${ELEM.map(el=>`<fieldset><legend>${esc(el.t)}</legend><div class="tw"><table class="fq"><thead><tr><th>Item</th><th>Result</th><th>Evidence (reference)</th><th>Date</th><th>Note (Not OK / N.A.)</th></tr></thead><tbody>${itemRows(el)}</tbody></table></div></fieldset>`).join("")}
  <fieldset><legend>D. Strategic product sampling</legend><div class="fields">${mf("scale","Hardness scale",{ph:"HRC / HB",dis:lock})}${mf("lsl","Lower limit",{dis:lock})}${mf("usl","Upper limit",{dis:lock})}</div>
    <div class="tw"><table class="fq"><thead><tr><th>Lot no.</th><th>Date</th><th>Part</th><th>Positions sampled</th><th>Readings (paste)</th><th>Micro</th><th>Decarb</th><th>Result</th>${lock?"":"<th></th>"}</tr></thead><tbody>${sc.T.map(({t,c},i)=>`<tr>
      <td><input data-tr="${i}.lot" value="${esc(t.lot)}" ${lock?"disabled":""}></td><td><input type="date" data-tr="${i}.date" value="${esc(t.date)}" ${lock?"disabled":""}></td><td><input data-tr="${i}.part" value="${esc(t.part)}" ${lock?"disabled":""}></td>
      <td><input data-tr="${i}.pos" value="${esc(t.pos)}" ${lock?"disabled":""}></td><td><textarea data-tr="${i}.vals" rows="2" ${lock?"disabled":""}>${esc(t.vals)}</textarea></td>
      ${["micro","decarb"].map(f=>`<td><select data-tr="${i}.${f}" ${lock?"disabled":""}><option value="">—</option><option value="ok" ${t[f]==="ok"?"selected":""}>OK</option><option value="nok" ${t[f]==="nok"?"selected":""}>Not OK</option></select></td>`).join("")}
      <td data-trres="${i}">${trRes(c)}</td>${lock?"":`<td><button data-trdel="${i}" aria-label="Remove lot">✕</button></td>`}</tr>`).join("")}</tbody></table></div>
    ${lock?"":`<p class="row"><button data-tradd>Add a lot</button></p>`}
    <p class="small" id="smpsum">${smpTxt(sc)}</p>
    <div class="fields">${mf("justify",`Justification when the capability is below ${C().cpkMin} (else leave empty)`,{area:2,wide:1,dis:lock})}</div></fieldset>
  <fieldset><legend>Conclusion and approval</legend><div class="fields">${mf("conc","Conclusion",{opts:Object.entries(CONC).map(([k,v])=>[k,v[1]]),blank:1,req:1,dis:lock})}
    ${mf("summary","Summary (what was shown; for Not validated: why and what is corrected)",{area:2,wide:1,req:1,dis:lock})}${mf("prep","Prepared by",{req:1,dis:lock})}${mf("appr","Approved by",{req:1,dis:lock,list:"pv-appr"})}</div>
    <datalist id="pv-appr">${approvers().map(a=>`<option value="${esc(a.name)}">${esc(a.src)}</option>`).join("")}</datalist>
    ${lock?`<p>${pill(...CONC[E.conc])} ${pill("",`Approved ${fmtD(E.apprDate)} by ${E.appr}`)}</p>`:""}</fieldset>
  ${!lock&&miss.length?`<div class="banner" style="margin-top:10px"><b>To approve:</b> ${esc(miss.join(" · "))}</div>`:""}`;
  const foot=[!lock?`<button class="pri w" data-save-val>Save</button><button class="w" data-approve>Approve</button>`:"",known?`<button data-vprint>Print F-PV-01</button>`:"",
    known&&!lock?`<button class="danger w" data-del-val>Delete</button>`:"",`<button data-close>Close</button>`].join("");
  return sheet(esc(known?E.id+" · "+lineName(E.line):"New validation"),body,foot);}
const trRes=c=>!c.n?`<span class="small muted">—</span>`:`${pill(c.pass?"ok":"bad",c.pass?"Pass":"Fail")}<br><span class="small muted">n ${c.n} · ${c.min}–${c.max} · x̄ ${c.mean}${c.out?` · ${c.out} out`:""}</span>`;
const smpTxt=sc=>`${sc.lots} lots with readings (minimum ${C().minLots}) · ${sc.n} readings${sc.mean!=null?` · mean ${sc.mean}`:""}${sc.sd!=null?` · σ ${sc.sd}`:""} · Cpk ${sc.cpk!=null?sc.cpk:"—"} (target ${C().cpkMin}) ${sc.lots?(sc.fail.length?pill("bad",plural(sc.fail.length,"lot")+" not passing"):sc.low?pill("warn","Capability below target"):sc.lots>=+C().minLots&&!sc.short.length?pill("ok","Sampling complete"):pill("warn","Sampling incomplete")):""}`;
function chgModal(id){const c=chgById(id);openModal({kind:"chg",ed:c?clone(c):fillChg({date:today()}),msg:""});}
function DRAW_CHG(){const E=S.modal.ed,known=chgById(E.id),miss=chgMissing(E),fz=forced(E),LS=linesOf(E).map(lineState),used=S.vals.some(v=>v.change===E.id);
  const body=`<p class="muted">${known?chgPill(known):pill("warn","New")}</p>
  <fieldset><legend>The change</legend><div class="fields">${mf("date","Date",{type:"date",req:1})}${mf("kind","Kind",{opts:Object.entries(KIND).map(([k,v])=>[k,v[0]]),req:1})}
    ${mf("furnace",E.kind==="location"?"Furnace (empty = every furnace of the site)":"Furnace",{opts:furnaces().map(f=>[f,f]),blank:1,req:E.kind!=="location"})}${mf("by","Recorded by",{req:1})}
    <div class="f wide"><span>Equipment changed</span><div class="row">${Object.entries(EQ).map(([k,t])=>`<label class="chk"><input type="checkbox" data-eq="${k}" ${E.equip.includes(k)?"checked":""}> ${esc(t)}</label>`).join("")}</div></div>
    ${mf("what","What was done",{area:2,wide:1,req:1})}</div></fieldset>
  <fieldset><legend>Assessment (WI-PV-02)</legend>${fz?`<p>${pill("acc","Revalidation always required")} <span class="small muted">${esc(KIND[E.kind][0])}</span></p>`:`<div class="fields">${mf("major","Major (can change temperature, uniformity, atmosphere, timing, quenching / cooling, control or recording)?",{opts:[["yes","Yes: revalidate"],["no","No"]],blank:1,req:1})}
    ${mf("why","Why it is not major",{area:2,wide:1,req:E.major==="no"})}${mf("aBy","Assessed by",{req:1})}${mf("aDate","Assessment date",{type:"date",req:1})}</div>`}
    ${isMajor(E)?`<p class="small"><b>Process lines to revalidate:</b> ${LS.length?LS.map(s=>`${esc(s.L.name)} ${s.lastOk&&known&&s.lastOk.apprDate>=E.date?pill("ok","revalidated "+s.lastOk.id):`<button data-new-val="${esc(s.L.key)}" data-chg-ref="${esc(E.id)}" ${known?"":"disabled"}>Start validation</button>`}`).join(" · "):"none (check the furnace and the equipment)"}</p>`:""}</fieldset>
  ${miss.length?`<div class="banner" style="margin-top:10px"><b>To complete:</b> ${esc(miss.join(" · "))}</div>`:""}`;
  return sheet(esc(known?E.id+" · "+KIND[E.kind][0]:"Record an equipment change"),body,`<button class="pri w" data-save-chg>Save</button>${known?`<button data-cprint>Print F-PV-02</button>`:""}${known&&!used?`<button class="danger w" data-del-chg>Delete</button>`:""}<button data-close>Close</button>`);}
function DRAW_PROCAPPR(){const m=S.modal,next=isDate(S.proc.apprDate)?(+S.proc.rev||0)+1:Math.max(0,+S.proc.rev||0);
  return sheet("Approve the validation procedure",`<p class="muted">Records revision ${next} of the procedure as approved (the document MWSPL-QP-PV-01). A periodic review without changes is also recorded as a new revision.</p>
  <div class="fields"><label class="f req"><span>Document number</span><input id="pa-no" value="${esc(S.proc.no)}"></label><label class="f req"><span>Prepared by</span><input id="pa-prep" value="${esc(m.prep)}"></label><label class="f req"><span>Approved by</span><input id="pa-by" value="${esc(m.by)}"></label><label class="f req"><span>Date</span><input type="date" id="pa-date" value="${esc(m.date)}"></label>
  ${next>0?`<label class="f wide req"><span>Change / review note</span><input id="pa-chg" value="${esc(m.chg)}"></label>`:""}</div>`,`<button class="pri w" data-save-proc>Approve</button><button data-close>Cancel</button>`);}
function DRAW_PRINT(){return sheet(esc(S.modal.title),`<div id="jobcard">${S.modal.html()}</div>`,`<button class="pri" data-print>Print</button><button data-close>Close</button>`);}
const pHead=t=>`<p class="small muted">${esc(C().plant)} · ${esc(t)} · printed ${fmtD(today())}</p>`;
const kv=R=>`<div class="tw"><table><tbody>${R.map(([a,b])=>`<tr><td style="width:220px"><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>`;
function valHtml(V){const L=lineOf(V.line),sc=smpCalc(V),c=chgById(V.change);
  return `${pHead("Process validation report (MWSPL-F-PV-01, CQI-9 HTSA 1.7)")}<h2>${esc(V.id)} · ${esc(lineName(V.line))}${approved(V)?"":" · DRAFT"}</h2>
  ${kv([["Equipment integrated",L?L.equip.map(e=>EQ[e]).join(", "):"—"],["Trigger",TRIG[V.trigger]||""],["Change",c?`${c.id} ${fmtD(c.date)} ${KIND[c.kind][0]}: ${c.what}`:"—"],["Specification",V.spec],["Representative part",V.part],["Started",fmtD(V.start)],["Sampling plan",V.plan]])}
  ${ELEM.map(el=>`<h3>${esc(el.t)}</h3><div class="tw"><table><thead><tr><th>Item</th><th>Result</th><th>Evidence</th><th>Date</th><th>Note</th></tr></thead><tbody>${el.items.filter(([k,t,p])=>itApplies({p},L?L.p:"")).map(([k,t])=>{const a=V.items[k];return `<tr><td>${esc(t)}</td><td>${esc(RES[a.r]||"—")}</td><td>${esc(a.ref)}</td><td>${fmtD(a.date)}</td><td>${esc(a.note)}</td></tr>`;}).join("")}</tbody></table></div>`).join("")}
  <h3>D. Strategic product sampling</h3><p>Limits ${esc(V.lsl||"—")} – ${esc(V.usl||"—")} ${esc(V.scale)}</p>
  <div class="tw"><table><thead><tr><th>Lot</th><th>Date</th><th>Part</th><th>Positions</th><th>n</th><th>Min</th><th>Max</th><th>Mean</th><th>Micro / decarb</th><th>Result</th></tr></thead><tbody>${sc.T.map(({t,c})=>`<tr><td>${esc(t.lot)}</td><td>${fmtD(t.date)}</td><td>${esc(t.part)}</td><td>${esc(t.pos)}</td><td>${c.n}</td><td>${c.n?c.min:""}</td><td>${c.n?c.max:""}</td><td>${c.n?c.mean:""}</td><td>${esc((RES[t.micro]||"—")+" / "+(RES[t.decarb]||"—"))}</td><td>${c.n?(c.pass?"Pass":"Fail"):""}</td></tr>`).join("")}</tbody></table></div>
  <p>${sc.lots} lots · ${sc.n} readings · mean ${sc.mean??"—"} · σ ${sc.sd??"—"} · Cpk ${sc.cpk??"—"} (target ${C().cpkMin})${txt(V.justify)?" · justification: "+esc(V.justify):""}</p>
  ${kv([["Conclusion",V.conc?CONC[V.conc][1]:"—"],["Summary",V.summary],["Prepared by",V.prep],["Approved by / date",`${V.appr} · ${fmtD(V.apprDate)}`]])}
  <p class="small" style="margin-top:14px">Signatures: prepared ____________________ &nbsp; approved ____________________</p>`;}
function chgHtml(c){const LS=linesOf(c).map(lineState);
  return `${pHead("Equipment change assessment (MWSPL-F-PV-02)")}<h2>${esc(c.id)} · ${esc(KIND[c.kind][0])}</h2>
  ${kv([["Date",fmtD(c.date)],["Furnace",c.furnace||"Site (every furnace)"],["Equipment changed",c.equip.map(e=>EQ[e]).join(", ")],["What was done",c.what],["Recorded by",c.by],
    ["Major",forced(c)?"Yes (always for this kind)":c.major==="yes"?"Yes":c.major==="no"?"No":"not assessed"],["Why not major",c.why],["Assessed by / date",forced(c)?"—":`${c.aBy} · ${fmtD(c.aDate)}`],
    ["Process lines affected",LS.map(s=>s.L.name).join(", ")],["Revalidation",isMajor(c)?LS.map(s=>`${s.L.name}: ${s.lastOk&&s.lastOk.apprDate>=c.date?s.lastOk.id+" "+fmtD(s.lastOk.apprDate):"open"}`).join("; "):"not required"]])}`;}
function matrixHtml(){const LS=lineList().map(lineState);
  return `${pHead("Process line validation matrix (MWSPL-F-PV-03)")}<div class="tw"><table><thead><tr><th>Process line</th><th>Equipment integrated</th><th>Initial validation</th><th>Changes since the latest validation</th><th>Latest validation</th><th>Status</th></tr></thead><tbody>${LS.map(s=>`<tr><td>${esc(s.L.name)}</td><td>${esc(s.L.equip.map(e=>EQ[e]).join(", "))}</td><td>${s.init?esc(s.init.id)+" "+fmtD(s.init.apprDate):"—"}</td><td>${esc([...s.pend,...s.unass].map(c=>c.id+" "+KIND[c.kind][0]).join("; ")||"—")}</td><td>${s.last?esc(s.last.id)+" "+fmtD(s.last.apprDate):"—"}</td><td>${esc(LST[s.st][1])}</td></tr>`).join("")}</tbody></table></div>`;}
function h17Html(){const A=assess17(),sc=SCORE[A.score];
  return `${pHead("CQI-9 HTSA 1.7 evidence")}<p><span class="verdict ${sc[2]}">${sc[1]}</span></p>
  <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${esc(LV[i.lvl][1])}</td></tr>`).join("")}</tbody></table></div>
  <h3>Process lines (MWSPL-F-PV-03)</h3>${matrixHtml().replace(/^<p[^>]*>.*?<\/p>/,"")}
  <h3>Equipment changes</h3><div class="tw"><table><thead><tr><th>Change</th><th>Date</th><th>Furnace</th><th>Kind</th><th>Major</th><th>Lines</th></tr></thead><tbody>${S.chgs.map(c=>`<tr><td>${esc(c.id)}</td><td>${fmtD(c.date)}</td><td>${esc(c.furnace||"Site")}</td><td>${esc(KIND[c.kind][0])}</td><td>${!assessed(c)?"not assessed":isMajor(c)?"yes":"no"}</td><td>${esc(linesOf(c).map(l=>l.name).join(", "))}</td></tr>`).join("")||`<tr><td colspan="6">None.</td></tr>`}</tbody></table></div>`;}
const DRAW={val:DRAW_VAL,chg:DRAW_CHG,procappr:DRAW_PROCAPPR,print:DRAW_PRINT};

/* 10. actions */
async function saveVal(text){const E=fillVal(S.modal.ed),known=valById(E.id);
  if(!E.line){msg("Choose the process line.");return false;}
  if(!known)E.id="PV-"+String(maxNo(S.vals)+1).padStart(4,"0");
  if(await put("vals",E,text||(known?"Saved":"Started"))){S.modal.ed=clone(E);return true;}return false;}
async function saveChg(){const E=fillChg(S.modal.ed),known=chgById(E.id);
  if(!isDate(E.date)){msg("Enter the date.");return false;}if(E.date>today()){msg("The date is in the future.");return false;}if(!txt(E.what)){msg("Enter what was done.");return false;}
  if(isDate(E.aDate)&&E.aDate<E.date){msg("The assessment is dated before the change.");return false;}
  if(!known)E.id="EC-"+String(maxNo(S.chgs)+1).padStart(4,"0");
  if(await put("changes",E,known?"Saved":"Recorded")){S.modal.ed=clone(E);return true;}return false;}
async function stdOps(){if(!needDb())return;if(S.vals.length||S.chgs.length){toast("Only on an empty module.");return;}
  const d=today(),D=n=>addDays(d,n),ex=" (example)",HM="R. Sharma"+ex,QM="S. Gupta"+ex,MH="K. Yadav"+ex;
  const LIM={HT:["HRC",28,34,"EX-1001"],IA:["HB",150,180,"EX-2001"],NORM:["HB",160,210,"EX-3001"]};
  const rd=(lo,hi,seed,n)=>Array.from({length:n},(_,i)=>{const m=(lo+hi)/2,w=(hi-lo)/9;return (Math.round((m+(((i*7+seed*3)%11)-5)/5*w*1.4)*10)/10);}).join(" ");
  let vn=0;
  const mk=(key,trig,day,o)=>{const p=key.split("|")[1],[scale,lo,hi,part]=LIM[p],L=lineOf(key);vn++;
    const items=Object.fromEntries(ITEMS.map(it=>[it.k,itApplies(it,p)?{r:"ok",ref:{tus:`TUS-${key.slice(0,4)}-${day<-300?"init":"rev"}`,sat:"SAT records",hard:"Cal cert HT-RW-01, daily verification",param:"SCADA record of the trial lots"}[it.k]||`Record ${it.k.toUpperCase()}-${vn}`,date:D(day-6),note:""}:{r:"",ref:"",date:"",note:""}]));
    const trials=[0,1,2].map(i=>({lot:`TL-${String(vn).padStart(2,"0")}-${i+1}`,date:D(day-5+i),part,pos:"First / last tray; front, back, top, bottom",vals:rd(lo,hi,vn+i,10),micro:"ok",decarb:"ok",note:""}));
    return fillVal({id:"PV-"+String(vn).padStart(4,"0"),line:key,trigger:trig,spec:`Specification in force for ${L.name}${ex}`,part,start:D(day-14),
      plan:"3 trial lots of the representative part; 10 readings per lot from the first and last tray (front / back, top / bottom, both walls); surface and core hardness, microstructure, decarburization.",
      items,trials,scale,lsl:String(lo),usl:String(hi),conc:"valid",summary:"Every element verified; all lots within the limits.",prep:HM,appr:QM,apprDate:D(day),status:"approved",log:[{d:D(day),t:"Approved"+ex}],...(o||{})});};
  const V=[];
  [["F-01|HT",-720],["F-01|IA",-715],["F-02|HT",-700],["F-02|IA",-695],["F-02|NORM",-690],["F-03|IA",-680],["F-03|NORM",-675],["F-04|IA",-660]].forEach(([k,day])=>V.push(mk(k,"initial",day,{summary:"Initial validation from the commissioning and PPAP records"+ex+"."})));
  const C1={id:"EC-0001",date:D(-125),furnace:"F-03",equip:["hc","comb"],kind:"rebuild",what:"Hardening chamber refractory relined; burners of zones 2 and 3 replaced with a new type"+ex+".",by:MH,log:[{d:D(-125),t:"Recorded"+ex}]};
  const C2={id:"EC-0002",date:D(-12),furnace:"F-02",equip:["qt"],kind:"modification",what:"Quench tank agitation: second agitator added, new circulation pump"+ex+".",by:MH,major:"yes",aBy:HM,aDate:D(-11),log:[{d:D(-12),t:"Recorded"+ex}]};
  const C3={id:"EC-0003",date:D(-40),furnace:"F-01",equip:["ctrl"],kind:"repair",what:"Zone 2 control thermocouple replaced with the same type and length; SAT passed"+ex+".",by:MH,major:"no",why:"Like-for-like replacement; the SAT after the replacement covers it (HTSA 3.3).",aBy:HM,aDate:D(-40),log:[{d:D(-40),t:"Recorded"+ex}]};
  const C4={id:"EC-0004",date:D(-3),furnace:"F-04",equip:["push"],kind:"modification",what:"Pusher cylinder seals replaced; push timer relay changed"+ex+".",by:MH,log:[{d:D(-3),t:"Recorded"+ex}]};
  V.push(mk("F-03|IA","rebuild",-100,{change:"EC-0001",summary:"Revalidated after the rebuild: TUS of the hardening chamber, combustion set-up and three trial lots"+ex+"."}));
  const dr=mk("F-03|NORM","rebuild",-104,{change:"EC-0001",status:"draft",appr:"",apprDate:"",conc:"",summary:""});dr.trials=dr.trials.slice(0,1);V.push(dr);
  const d2=mk("F-02|HT","modification",-4,{change:"EC-0002",status:"draft",appr:"",apprDate:"",conc:"",summary:""});d2.trials=[];["quench","qmed","param"].forEach(k=>{d2.items[k]={r:"",ref:"",date:"",note:""};});V.push(d2);
  await dbSet("config","settings",{...S.cfg,approvers:HM+"\n"+QM});
  S.proc={no:"MWSPL-QP-PV-01",rev:0,prep:HM,appr:QM,apprDate:D(-330),change:"",log:[{d:D(-330),t:"Rev 0 approved by "+QM}]};await saveProc();
  await batchPut("changes",[C1,C2,C3,C4].map(fillChg));await batchPut("vals",V);toast("Starter set-up loaded");render();}
function armedDelete(b,fn){if(b.classList.contains("armed")){fn();return;}b.classList.add("armed");const t=b.textContent;b.textContent="Confirm";setTimeout(()=>{if(b.isConnected){b.classList.remove("armed");b.textContent=t;}},4000);}
async function download(name,text,type){
  if(S.dl){try{await S.dl.save({filename:name,data:new Blob([text],{type})});return;}catch(e){if(e&&e.code==="declined")return;}}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
const exportJson=()=>download(`mws-valid-${today()}.json`,JSON.stringify({app:"mws-valid-manager",v:1,saved:new Date().toISOString(),vals:S.vals,changes:S.chgs,proc:S.proc,config:S.cfg},null,1),"application/json");
const csvQ=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
const csv=()=>download(`mws-valid-validations-${today()}.csv`,"﻿"+[["Validation","Process line","Trigger","Change","Specification","Part","Lots","Readings","Cpk","Conclusion","Approved by","Approved","Status"],
  ...S.vals.map(v=>{const sc=smpCalc(v);return [v.id,lineName(v.line),TRIG[v.trigger]||"",v.change,v.spec,v.part,sc.lots,sc.n,sc.cpk??"",v.conc?CONC[v.conc][1]:"",v.appr,v.apprDate,v.status];})].map(r=>r.map(csvQ).join(",")).join("\r\n"),"text/csv");
function readImport(f){f.text().then(t=>{let o;try{o=JSON.parse(t);}catch(e){toast("Not a JSON file");return;}
  if(!o||o.app!=="mws-valid-manager"||!Array.isArray(o.vals)){toast("Not an export of this module");return;}
  const ok=o.vals.filter(x=>x&&ID_RE.test(String(x.id||""))),ch=arr(o.changes).filter(x=>x&&ID_RE.test(String(x.id||"")));
  S.imp={vals:ok.map(fillVal),changes:ch.map(fillChg),proc:o.proc||null,config:o.config||null,msg:`${f.name}: ${plural(ok.length,"validation")}, ${plural(ch.length,"change")}.`};render();});}
async function doImport(mode){if(!S.imp||!needDb())return;const I=S.imp;S.imp=null;
  if(mode==="replace"){for(const x of S.vals)if(!I.vals.some(y=>y.id===x.id))await dbDel("vals",x.id);for(const x of S.chgs)if(!I.changes.some(y=>y.id===x.id))await dbDel("changes",x.id);}
  await batchPut("vals",I.vals);await batchPut("changes",I.changes);
  if(I.proc){const c={...I.proc};delete c.id;await dbSet("config","proc",c);}if(I.config){const c={...DEF,...I.config};delete c.id;await dbSet("config","settings",c);}
  toast("Imported ("+mode+")");render();}
async function clearAll(){if(($("#clrtxt")||{}).value!=="CLEAR ALL"){toast("Type CLEAR ALL to clear");return;}if(!needDb())return;
  for(const x of S.vals)await dbDel("vals",x.id);for(const x of S.chgs)await dbDel("changes",x.id);await dbDel("config","settings");await dbDel("config","proc");toast("All process validation data cleared");}

/* 11. wiring */
onDoc("click",async e=>{
  const b=e.target.closest("button,tr.click,a[data-docref]");if(!b)return;const d=b.dataset;
  if(b.closest("#modal")||d.close!==undefined){
    if(d.close!==undefined){closeModal();return;}
    const m=S.modal;
    if(d.saveVal!==undefined){if(await saveVal()){redraw();msg("Saved.",1);}return;}
    if(d.approve!==undefined){const miss=valMissing(fillVal(m.ed));if(miss.length){msg("To approve: "+miss.join(", ")+".");return;}
      m.ed.status="approved";m.ed.apprDate=today();if(await saveVal(`Approved by ${txt(m.ed.appr)}: ${CONC[m.ed.conc][1]}`)){redraw();msg("Approved.",1);}else{m.ed.status="draft";m.ed.apprDate="";}return;}
    if(d.delVal!==undefined){armedDelete(b,async()=>{await dbDel("vals",m.ed.id);toast("Deleted");closeModal();});return;}
    if(d.usespec!==undefined){fromSpec(m.ed);redraw();return;}
    if(d.tradd!==undefined){m.ed.trials.push({lot:"",date:today(),part:m.ed.part||"",pos:"",vals:"",micro:"",decarb:"",note:""});redraw();return;}
    if(d.trdel!==undefined){m.ed.trials.splice(+d.trdel,1);redraw();return;}
    if(d.vprint!==undefined){const v=fillVal(m.ed);openModal({kind:"print",title:"Process validation report · "+v.id,html:()=>valHtml(v)});return;}
    if(d.saveChg!==undefined){if(await saveChg()){redraw();msg("Saved.",1);}return;}
    if(d.delChg!==undefined){armedDelete(b,async()=>{await dbDel("changes",m.ed.id);toast("Deleted");closeModal();});return;}
    if(d.cprint!==undefined){const c=fillChg(m.ed);openModal({kind:"print",title:"Equipment change assessment · "+c.id,html:()=>chgHtml(c)});return;}
    if(d.newVal!==undefined){valModal(null,{line:d.newVal,trigger:(chgById(d.chgRef)||{}).kind==="repair"?"modification":(chgById(d.chgRef)||{}).kind||"initial",change:d.chgRef||""});return;}
    if(d.saveProc!==undefined){const no=txt($("#pa-no").value),prep=txt($("#pa-prep").value),by=txt($("#pa-by").value),dt=$("#pa-date").value,chg=$("#pa-chg")?txt($("#pa-chg").value):"";
      if(!no||!prep||!by||!isDate(dt)){msg("Enter the number, prepared by, approved by and the date.");return;}if(dt>today()){msg("Not in the future.");return;}if($("#pa-chg")&&!chg){msg("Enter the change or review note.");return;}
      if(!needDb())return;const rev=isDate(S.proc.apprDate)?(+S.proc.rev||0)+1:Math.max(0,+S.proc.rev||0);
      S.proc={...S.proc,no,rev,prep,appr:by,apprDate:dt,change:chg};if(await saveProc(`Rev ${rev} approved by ${by}${chg?": "+chg:""}`)){toast("Procedure approved");closeModal();render();}return;}
    if(d.print!==undefined){document.body.classList.add("pm");window.print();setTimeout(()=>document.body.classList.remove("pm"),500);return;}
    return;
  }
  if(d.open){valModal(d.open);return;}
  if(d.newVal!==undefined){if(needDb()){const c=chgById(d.chgRef);valModal(null,{line:d.newVal||"",trigger:c?(c.kind==="repair"?"modification":c.kind):"initial",change:d.chgRef||""});}return;}
  if(d.openChg){chgModal(d.openChg);return;}
  if(d.newChg!==undefined){if(needDb())chgModal(null);return;}
  if(d.procappr!==undefined){if(needDb())openModal({kind:"procappr",prep:S.proc.prep||"",by:"",date:today(),chg:"",msg:""});return;}
  if(d.h17!==undefined){openModal({kind:"print",title:"HTSA 1.7 evidence",html:h17Html});return;}
  if(d.mprint!==undefined){openModal({kind:"print",title:"Process line validation matrix",html:matrixHtml});return;}
  if(d.std!==undefined){stdOps();return;}
  if(d.saveCfg!==undefined){document.querySelectorAll("[data-cfg]").forEach(i=>{const k=i.dataset.cfg,t=(SETF.find(x=>x[0]===k)||[])[2];S.cfg[k]=t==="number"?(num(i.value)>0?num(i.value):DEF[k]):i.value;});saveCfg();return;}
  if(d.doc){S.docSel=d.doc;render();return;}
  if(d.docref){e.preventDefault();const p=DOCS.find(x=>x[0].endsWith(d.docref.replace(/^(\.\.\/)+/,"").replace(/^\.\//,"")));if(p){S.docSel=p[0];location.hash="#docs";render();}return;}
  if(d.export!==undefined){exportJson();return;}if(d.csv!==undefined){csv();return;}
  if(d.imp){if(d.imp==="cancel"){S.imp=null;render();}else doImport(d.imp);return;}
  if(d.clear!==undefined){armedDelete(b,clearAll);return;}
});
onDoc("input",e=>{const el=e.target;
  if(S.modal&&S.modal.ed){const E=S.modal.ed;
    if(el.dataset.it&&el.tagName!=="SELECT"){const [k,f]=el.dataset.it.split(".");E.items[k][f]=el.value;return;}
    if(el.dataset.tr&&el.tagName!=="SELECT"){const [i,f]=el.dataset.tr.split(".");E.trials[+i][f]=el.value;
      if(f==="vals"){const sc=smpCalc(E),c=sc.T[+i]&&sc.T[+i].c,r=document.querySelector(`[data-trres="${i}"]`),s=$("#smpsum");if(r&&c)r.innerHTML=trRes(c);if(s)s.innerHTML=smpTxt(sc);}return;}
    if(el.dataset.p&&el.tagName!=="SELECT"){setp(E,el.dataset.p,el.value);
      if(/^(lsl|usl)$/.test(el.dataset.p)){const sc=smpCalc(E),s=$("#smpsum");if(s)s.innerHTML=smpTxt(sc);sc.T.forEach(({c},i)=>{const r=document.querySelector(`[data-trres="${i}"]`);if(r)r.innerHTML=trRes(c);});}return;}
  }
});
onDoc("change",e=>{const el=e.target;
  if(S.modal&&S.modal.ed){const E=S.modal.ed;
    if(el.dataset.it&&el.tagName==="SELECT"){const [k,f]=el.dataset.it.split(".");E.items[k][f]=el.value;redraw();return;}
    if(el.dataset.tr&&el.tagName==="SELECT"){const [i,f]=el.dataset.tr.split(".");E.trials[+i][f]=el.value;redraw();return;}
    if(el.dataset.eq){E.equip=el.checked?[...new Set([...E.equip,el.dataset.eq])]:E.equip.filter(x=>x!==el.dataset.eq);redraw();return;}
    if(el.dataset.p&&el.tagName==="SELECT"){setp(E,el.dataset.p,el.value);if(el.dataset.p==="line")fromSpec(E);if(el.dataset.p==="trigger"&&!NEEDCHG.includes(E.trigger))E.change=E.change&&E.trigger==="other"?E.change:"";redraw();return;}
  }
  if(el.dataset.filt){S.filt[el.dataset.filt]=el.value;render();return;}
  if(el.id==="impfile"&&el.files[0]){readImport(el.files[0]);el.value="";}
});
onDoc("keydown",e=>{if(e.key==="Escape"&&S.modal)closeModal();});
onWin("hashchange",()=>{route();S.pending=false;render();window.scrollTo(0,0);});

/* 12. integration API */
MWS.valid={closeModal,
  /* another module's data changed (specifications, thermocouples, quench media): redraw when nothing is being edited */
  refresh:()=>safeRender(),
  /* the validation state of each process line (for other modules) */
  lines:()=>lineList().map(lineState).map(s=>({key:s.L.key,name:s.L.name,st:s.st,lvl:s.lvl,last:s.last?s.last.id:"",lastDate:s.last?s.last.apprDate:""})),
  hasData:()=>S.vals.length+S.chgs.length>0,
  stats:()=>{const k=kp();return {db:S.dbState,...k,label:SCORE[k.score][1],cls:SCORE[k.score][0],procOk:isDate(S.proc.apprDate)};},
  summary:()=>{const k=kp();return `${k.ok} of ${plural(k.lines,"process line")} validated, ${k.reval} awaiting revalidation, ${plural(k.unass,"change")} to assess; HTSA 1.7 ${SCORE[k.score][1].toLowerCase()}.`;}};
window.__VALM={S,assess17,lineList,lineState,valMissing,chgMissing,smpCalc,trialCalc,affects,linesOf,isMajor,assessed,hints,kp};

/* 13. boot */
async function boot(){
  route();render();
  const [dl,user,db]=await Promise.all([useCap("downloads"),useCap("user"),useCap("db")]);
  S.dl=dl;
  if(user){try{const c=await user.can("data.write");S.canWrite=c!==false;}catch(e){}}
  if(db)startStore(sharedDb(db),"on");else startStore(localDb(),"local");
}
boot();
