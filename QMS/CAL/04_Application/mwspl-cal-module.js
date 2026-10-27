/* Module CAL: calibration, verification and certification of process and test equipment (CQI-9 HTSA 3.2). Runs inside the shell: ACTIVE,
   onDoc, onWin, MWS and `location` come from the wrapper (build.py). Intervals per the Process Tables Sections 1.0 and 2.0, non-contact
   thermometry, the documented offset procedure (P3.2.3) with its authority, offsets, calibration labels (P3.2.5.1) and reports (P3.2.5.2).
   Shows the test equipment of the Thermocouples module (MWS.tc, HTSA 3.3) and takes approvers from the HT organization (MWS.org). */

/* 1. collection prefix (shared store only) */
const NS=c=>S.db&&S.db.local?c:"cal-"+c;

/* 2. constants */
const ID_RE=/^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const LKEY="mws-cal-local-v1";
const CHAMBERS=["Hardening","Tempering"];
/* equipment kinds: label, default type, interval ("3m" = months, "90d" = days), accuracy ± abs, ± % of reading, unit, Process Table section — typical values, to confirm */
const KINDS={
  ctrl:["Temperature controller","cal","3m",1.1,0.2,"°C","2.0"],
  rec:["Recorder / SCADA recording channels","cal","3m",1.1,0.2,"°C","2.0"],
  otp:["Over-temperature controller","cal","3m",1.1,0.2,"°C","2.0"],
  fti:["Field test instrument (SAT / TUS)","cal","12m",0.6,0.1,"°C","2.0"],
  ir:["Non-contact thermometer (pyrometer / infrared)","cal","12m",3,0.5,"°C","2.0"],
  qtemp:["Quench medium temperature indicator","cal","12m",2,0,"°C","1.0"],
  timer:["Timer (push cycle, dip, cooling)","verif","12m",1,1,"s","1.0"],
  flow:["Flow / pressure gauge (combustion, cooling air)","cal","12m",0,2,"","1.0"],
  hard:["Hardness tester","cal","12m",0,1.5,"HRC","1.0"],
  block:["Hardness test block (certified)","cert","60m",0,0,"","1.0"],
  micro:["Microscope / stage micrometer","cal","12m",0,1,"µm","1.0"],
  other:["Other process or test equipment","cal","12m",0,0,"","1.0"]};
const TYPES={cal:"Calibration",verif:"Verification",cert:"Certification"};
const ESTAT={inuse:"In use",spare:"Spare (calibrate before use)",out:"Out of service",scrap:"Scrapped"};
const LBL={id:"equipment identification",date:"calibration date",due:"next due date",by:"calibrated by"};
const OFFB={cal:"Calibration record (as found)",sat:"System accuracy test (SAT)",tus:"Temperature uniformity survey",other:"Other documented evidence"};
const OFFCHK={confirmed:"Offset confirmed (kept)",changed:"Offset changed (new offset record)",removed:"Offset removed"};
const DEF={plant:"Mass Wire and Steels Pvt. Ltd. · Bhiwadi",furnaces:"F-01, F-02, F-03, F-04",soon:14,offMax:3,reviewDays:365,revDays:7,kint:{},approvers:""};
const SETF=[["plant","Plant","text"],["furnaces","Furnaces (comma separated)","text"],["soon","Due soon (days before)","number"],
  ["offMax","Largest offset allowed (± °C, P3.2.3 — site limit, to confirm)","number"],["reviewDays","Offset procedure: periodic review (days)","number"],
  ["revDays","A calibration report is to be reviewed within (days)","number"],
  ["approvers","Who may accept a calibration report (one name per line; with the HT organization module its authorized people count too)","area"]];
const DOCS=[
  ["CAL/00_CAL_Master_List.md","Master list"],
  ["CAL/01_Procedure/MWSPL-QP-CAL-01_Calibration_of_Process_and_Test_Equipment.md","MWSPL-QP-CAL-01 Calibration of process and test equipment"],
  ["CAL/02_Work_Instructions/MWSPL-WI-CAL-01_Calibration_Labels_and_Reports.md","MWSPL-WI-CAL-01 Calibration, labels and reports"],
  ["CAL/02_Work_Instructions/MWSPL-WI-CAL-02_Instrument_Offsets.md","MWSPL-WI-CAL-02 Instrument offsets (P3.2.3)"],
  ["CAL/03_Formats/MWSPL-F-CAL-01_Equipment_Register_and_Schedule.md","MWSPL-F-CAL-01 Equipment register and schedule"],
  ["CAL/03_Formats/MWSPL-F-CAL-02_Calibration_Report.md","MWSPL-F-CAL-02 Calibration report"],
  ["CAL/03_Formats/MWSPL-F-CAL-03_Offset_Approval_Record.md","MWSPL-F-CAL-03 Offset approval record"],
  ["CAL/03_Formats/MWSPL-F-CAL-04_Calibration_Label.md","MWSPL-F-CAL-04 Calibration label"],
  ["CAL/04_Application/mwspl-cal-module.md","Module description"]];

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
const dayDiff=(a,b)=>Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/864e5);
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtD=s=>isDate(s)?`${s.slice(8,10)}-${MON[+s.slice(5,7)-1]}-${s.slice(0,4)}`:"—";
const getp=(o,p)=>p.split(".").reduce((a,k)=>a==null?a:a[k],o);
const setp=(o,p,v)=>{const k=p.split(".");let a=o;k.slice(0,-1).forEach(x=>{if(a[x]==null||typeof a[x]!=="object")a[x]={};a=a[x];});a[k.at(-1)]=v;};
const pill=(c,t)=>`<span class="pill ${c||""}">${esc(t)}</span>`;
const plural=(n,w,p)=>`${n} ${n===1?w:(p||w+"s")}`;
const maxNo=L=>Math.max(0,...L.map(x=>+(String(x.id).match(/(\d+)$/)||[0,0])[1]));
const lines=v=>String(v||"").split(/[\n,;]+/).map(txt).filter(Boolean);
const nlines=v=>String(v||"").split(/\n+/).map(txt).filter(Boolean);
const arr=v=>Array.isArray(v)?v:[];
const r2=v=>v==null?"—":String(Math.round(v*100)/100);
const sgn=v=>v==null?"—":(v>0?"+":"")+r2(v);
/* intervals: days ("90", "90d") or calendar months ("3m"); a plain number saved before is days */
const ivOf=v=>{const m=String(v??"").trim().match(/^(\d+(?:\.\d+)?)\s*([dm]?)$/i);return m&&+m[1]>0?{n:+m[1],u:(m[2]||"d").toLowerCase()}:null;};
const ivAdd=(s,v,sg=1)=>{const p=ivOf(v);if(!p||!isDate(s))return "";if(p.u==="d")return addDays(s,sg*p.n);
  const d=new Date(s+"T00:00:00"),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+sg*Math.round(p.n));d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return iso(d);};
const ivDays=v=>{const p=ivOf(v);return p?(p.u==="m"?p.n*30.44:p.n):null;};
const ivTxt=v=>{const p=ivOf(v);return p?plural(p.n,p.u==="m"?"month":"day"):"—";};
/* number + unit (days / months) for an interval; read back with ivRead */
const ivBox=(key,v,dis)=>{const p=ivOf(v)||{n:"",u:"m"};return `<span class="ivb" data-iv="${esc(key)}"><input type="number" min="1" step="1" value="${esc(p.n)}" ${dis?"disabled":""} aria-label="Interval"><select ${dis?"disabled":""} aria-label="Unit"><option value="d" ${p.u==="d"?"selected":""}>days</option><option value="m" ${p.u==="m"?"selected":""}>months</option></select></span>`;};
const ivRead=el=>{const n=num(el.querySelector("input").value),u=el.querySelector("select").value;return n>0?(u==="m"?Math.round(n)+"m":Math.round(n)+"d"):"";};

/* 4. state */
const S={view:"dash",db:null,dbState:"connecting",canWrite:true,dl:null,eqs:[],cals:[],offs:[],cfg:{...DEF},op:null,
  docSel:DOCS[0][0],imp:null,modal:null,pending:false,unsub:[],q:{},filt:{k:"",f:"",st:""}};
const C=()=>S.cfg;
const DEFOP={no:"MWSPL-WI-CAL-02",rev:0,prep:"",appr:"",apprDate:"",change:"",auth:"",how:"",dirty:false,log:[]};

/* 5. domain logic */
const furnaces=()=>lines(C().furnaces).map(x=>x.toUpperCase());
const kd=k=>KINDS[k]||KINDS.other;
const kInt=k=>ivOf((C().kint||{})[k])?String(C().kint[k]):kd(k)[2];
function fillEq(o){const x={id:"",tag:"",kind:"ctrl",name:"",furnace:"",chamber:"",loop:"",make:"",model:"",serial:"",lo:"",hi:"",unit:"",accAbs:"",accPct:"",interval:"",type:"",ptRef:"",loc:"",emis:"",status:"inuse",notes:"",log:[],...(o||{})};
  if(!x.type)x.type=kd(x.kind)[1];if(!Array.isArray(x.log))x.log=[];return x;}
function fillCal(o){const d={id:"",eq:"",type:"cal",date:"",due:"",by:"",ext:"int",lab:"",accred:"",certNo:"",method:"",std:{id:"",cert:"",due:"",trace:""},env:"",pts:[],adj:"none",offChk:"",emis:"",
  lbl:{id:false,date:false,due:false,by:false,lim:"",chkBy:""},rev:{by:"",date:"",remarks:""},act:{impact:"",contain:"",action:"",by:"",date:""},closed:false,notes:"",log:[]};
  const x={...d,...(o||{})};["std","lbl","rev","act"].forEach(k=>{x[k]={...d[k],...((o&&o[k])||{})};});
  x.pts=arr(x.pts).map(p=>({nom:"",found:"",left:"",...(p||{})}));if(!Array.isArray(x.log))x.log=[];return x;}
function fillOff(o){const x={id:"",eq:"",date:"",value:"",basis:"cal",ref:"",why:"",enteredBy:"",apprBy:"",apprDate:"",where:"",verBy:"",verDate:"",removed:"",removedWhy:"",log:[],...(o||{})};if(!Array.isArray(x.log))x.log=[];return x;}
const eqById=id=>S.eqs.find(e=>e.id===id)||null;
const calById=id=>S.cals.find(r=>r.id===id)||null;
const offById=id=>S.offs.find(o=>o.id===id)||null;
const eqName=e=>e?`${e.tag}${e.name?" · "+e.name:""}`:"—";
const byDate=(a,b)=>(a.date||"")<(b.date||"")?-1:(a.date||"")>(b.date||"")?1:(a.id<b.id?-1:1);
const accOf=e=>({abs:num(e.accAbs)??kd(e.kind)[3],pct:num(e.accPct)??kd(e.kind)[4],unit:e.unit||kd(e.kind)[5]});
const accTxt=e=>{const a=accOf(e);return a.abs||a.pct?`± ${a.abs?a.abs+" "+a.unit:""}${a.abs&&a.pct?" or ":""}${a.pct?a.pct+" % of reading":""}${a.abs&&a.pct?", the greater":""}`:"not set";};
const limAt=(e,nom)=>{const a=accOf(e);const L=Math.max(a.abs||0,(a.pct||0)/100*Math.abs(nom||0));return L>0?L:null;};
const intOf=e=>ivOf(e.interval)?String(e.interval):kInt(e.kind);
const judged=e=>e.status==="inuse"||e.status==="spare";
/* approvers of calibration reports: Settings + HT organization */
function approvers(){const L=lines(C().approvers).map(n=>({name:n,src:"Settings"}));
  try{if(MWS.org&&MWS.org.hasData&&MWS.org.hasData())MWS.org.authorized().forEach(a=>{if(!L.some(x=>x.name.toLowerCase()===a.name.toLowerCase()))L.push({name:a.name,src:a.position});});}catch(e){}
  return L;}
const isApprover=n=>{const L=approvers();return !L.length||L.some(a=>a.name.toLowerCase()===txt(n).toLowerCase());};
/* offset authority = the names in the offset procedure (P3.2.3: who has the authority to approve the use of offsets) */
const authLines=()=>nlines(S.op.auth);
const authNames=()=>authLines().map(l=>txt(l.split(/\s+[—–]\s+|\s+-\s+/)[0])).filter(Boolean);
const isOffAuth=n=>!!txt(n)&&authNames().some(a=>a.toLowerCase()===txt(n).toLowerCase());

/* one calibration / verification / certification record */
function evalCal(r){const e=eqById(r.eq),issues=[];if(!e)return {res:null,issues:[{j:"invalid",txt:"No equipment."}],pts:[]};
  const pts=r.pts.filter(p=>num(p.nom)!=null&&num(p.found)!=null).map(p=>{const nom=num(p.nom),f=num(p.found),l=num(p.left)??f,lim=limAt(e,nom);
    return {nom,found:f,left:l,ef:f-nom,el:l-nom,lim,of:lim!=null&&Math.abs(f-nom)>lim+1e-9,ol:lim!=null&&Math.abs(l-nom)>lim+1e-9};});
  if(r.type!=="cert"&&!pts.length)return {res:null,issues:[{j:"incomplete",txt:"No calibration point with nominal and as-found values."}],pts};
  if(isDate(r.std.due)&&isDate(r.date)&&r.std.due<r.date)issues.push({j:"invalid",txt:`Reference standard ${r.std.id||""} out of calibration (due ${fmtD(r.std.due)}) on the calibration day.`});
  if(r.type==="cert"&&!txt(r.certNo))issues.push({j:"invalid",txt:"Certification without a certificate number."});
  if(pts.length&&pts.every(p=>p.lim==null))issues.push({j:"warn",txt:"No accuracy requirement set for the equipment: the points are recorded, not judged."});
  const lo=num(e.lo),hi=num(e.hi);if(lo!=null&&hi!=null&&hi>lo&&pts.length){if(!pts.some(p=>p.nom<=lo+(hi-lo)*.34)||!pts.some(p=>p.nom>=hi-(hi-lo)*.34))issues.push({j:"warn",txt:`Points do not cover the range of use ${e.lo}–${e.hi} ${accOf(e).unit} (low and high end).`});}
  const of=pts.filter(p=>p.of),ol=pts.filter(p=>p.ol);
  if(of.length)issues.push({j:ol.length?"fail":"oof",txt:`As found out of tolerance at ${of.map(p=>`${p.nom} (${sgn(p.ef)} ${accOf(e).unit}, limit ± ${r2(p.lim)})`).join(", ")}.`});
  if(ol.length)issues.push({j:"fail",txt:`As left out of tolerance at ${ol.map(p=>`${p.nom} (${sgn(p.el)})`).join(", ")}: the equipment must not be used.`});
  if(of.length&&!ol.length&&r.adj==="none")issues.push({j:"warn",txt:"Found out of tolerance but no adjustment recorded."});
  const res=issues.some(i=>i.j==="invalid"||i.j==="incomplete")?"invalid":ol.length?"fail":of.length?"oof":"pass";
  return {res,issues,pts,of,ol};}
const RES={pass:["ok","In tolerance"],oof:["warn","Found out of tolerance"],fail:["bad","Out of tolerance"],invalid:["bad","Invalid"],none:["","No points"]};
const okCal=r=>{const k=evalCal(r).res;return k==="pass"||k==="oof";};
const dueOf=r=>isDate(r.due)?r.due:isDate(r.date)?ivAdd(r.date,intOf(eqById(r.eq)||{kind:"other"})):"";
const calsOf=id=>S.cals.filter(r=>r.eq===id&&isDate(r.date)).sort(byDate);
/* the state of a piece of equipment on a day: the latest valid record */
function eqState(e,day){day=day||today();if(!judged(e))return {st:"out"};
  const L=calsOf(e.id).filter(r=>r.date<=day).map(r=>({r,k:evalCal(r)})).filter(x=>x.k.res&&x.k.res!=="invalid"),last=L.at(-1);
  if(!last)return {st:e.status==="spare"?"spare":"none"};
  if(last.k.res==="fail")return {st:"fail",last:last.r};
  const due=dueOf(last.r),left=dayDiff(day,due);
  return {st:left<0?(e.status==="spare"?"spare":"overdue"):left<=(+C().soon||14)?"soon":"ok",last:last.r,due,left};}
const EST={ok:["ok","Current"],soon:["warn","Due soon"],overdue:["bad","Overdue"],none:["bad","Never calibrated"],fail:["bad","Out of tolerance"],spare:["","Spare · calibrate before use"],out:["","Not in use"]};
const ELV={ok:"good",soon:"warn",overdue:"crit",none:"crit",fail:"crit",spare:"info",out:"info"};
/* test equipment held in the Thermocouples module (read-only here) */
function tcEquip(){try{return MWS.tc&&MWS.tc.testEquip?MWS.tc.testEquip():[];}catch(e){return [];}}
const tcState=q=>!isDate(q.calDue)?"none":q.calDue<today()?"overdue":dayDiff(today(),q.calDue)<=(+C().soon||14)?"soon":"ok";
/* calibration report (P3.2.5.2) and label (P3.2.5.1) — elements as implemented, to confirm against the controlled copy */
function repMissing(r){const m=[],e=eqById(r.eq),k=evalCal(r);if(!e)return ["equipment"];
  if(!txt(e.tag)||!txt(e.serial))m.push("equipment identification and serial no.");if(!isDate(r.date))m.push("calibration date");if(!isDate(dueOf(r)))m.push("next due date");
  if(!txt(r.by))m.push("calibrated by");if(r.ext==="ext"){if(!txt(r.lab))m.push("calibration laboratory");if(!txt(r.accred))m.push("laboratory accreditation (scope / certificate no.)");}
  if(!txt(r.certNo))m.push("report / certificate no.");if(!txt(r.method))m.push("method / procedure used");
  if(r.type!=="cert"){if(!txt(r.std.id))m.push("reference standard");if(!txt(r.std.cert)||!isDate(r.std.due))m.push("reference standard certificate and calibration due");if(!txt(r.std.trace))m.push("traceability of the reference standard (national / international standard)");
    if(!k.pts.length)m.push("calibration points with the as-found values");else if(r.type==="cal"&&r.adj!=="none"&&r.pts.some(p=>num(p.nom)!=null&&num(p.left)==null))m.push("as-left value at every point");
    if(limAt(e,0)==null&&!accOf(e).pct)m.push("accuracy requirement of the equipment");}
  if(e.kind==="ir"&&!txt(r.emis))m.push("emissivity setting of the non-contact thermometer");
  if(k.res==="oof"&&r.adj==="none")m.push("adjustment made");if(r.adj==="offset"&&!S.offs.some(o=>o.eq===e.id&&o.date===r.date))m.push("the offset record (F-CAL-03) for the offset applied");
  if(activeOffs(e.id,r.date).filter(o=>o.date<r.date).length&&!r.offChk)m.push("statement on the offset in use");
  return m;}
const lblMissing=r=>Object.keys(LBL).filter(k=>!r.lbl[k]).map(k=>LBL[k]).concat(txt(r.lbl.chkBy)?[]:["label checked by"]);
const reviewed=r=>txt(r.rev.by)&&isDate(r.rev.date);
/* reaction to equipment found out of tolerance: product since the last good calibration */
const lastGoodBefore=r=>calsOf(r.eq).filter(x=>x.id!==r.id&&x.date<r.date&&evalCal(x).res==="pass").at(-1)||null;
const riskTxt=r=>{const e=eqById(r.eq)||{},a=lastGoodBefore(r);return `${e.furnace?e.furnace+" "+(e.chamber?e.chamber.toLowerCase()+" chamber ":""):""}${e.loop?"("+e.loop+") ":""}product processed from ${a?fmtD(a.date)+" ("+a.id+", last calibration in tolerance)":"the start of the records (no earlier calibration in tolerance)"} to ${fmtD(r.date)}`;};
function missingAct(r){const k=evalCal(r).res;if(k!=="oof"&&k!=="fail")return [];const a=r.act,m=[];
  if(!txt(a.impact))m.push("product-impact assessment");if(!txt(a.contain))m.push("containment / disposition");if(!txt(a.action))m.push("corrective action");if(!txt(a.by))m.push("owner");if(!isDate(a.date))m.push("date");
  if(k==="fail"&&!calsOf(r.eq).some(x=>x.date>r.date&&okCal(x)))m.push("a later calibration in tolerance (or the equipment taken out of service)");return m;}
/* offsets (P3.2.3) */
const offActive=(o,day)=>{day=day||today();return isDate(o.date)&&o.date<=day&&!(isDate(o.removed)&&o.removed<=day);};
const activeOffs=(eq,day)=>S.offs.filter(o=>o.eq===eq&&offActive(o,day));
function offMissing(o){const m=[],v=num(o.value);
  if(!o.eq)m.push("equipment");if(!isDate(o.date))m.push("date entered");if(v==null)m.push("offset value");if(!o.basis||!txt(o.ref))m.push("basis and its record no.");if(!txt(o.why))m.push("reason");
  if(!txt(o.enteredBy))m.push("entered by");if(!txt(o.apprBy)||!isDate(o.apprDate))m.push("approval (by, date)");else{if(!isOffAuth(o.apprBy))m.push("approval by a person the offset procedure authorizes");if(isDate(o.date)&&o.apprDate>o.date)m.push("approval before the offset is entered");}
  if(!txt(o.where))m.push("where the offset is documented");if(!txt(o.verBy)||!isDate(o.verDate))m.push("read-back verification (by, date)");
  if(isDate(o.removed)&&!txt(o.removedWhy))m.push("why the offset was removed");return m;}
function offIssues(o){const I=[],v=num(o.value),mx=+C().offMax;
  if(v!=null&&mx>0&&Math.abs(v)>mx)I.push({j:"crit",txt:`${sgn(v)} °C is beyond the largest offset allowed (± ${mx} °C): correct the cause instead.`});
  offMissing(o).forEach(t=>I.push({j:/approval/.test(t)?"crit":"warn",txt:"Missing: "+t}));
  if(offActive(o)){const later=calsOf(o.eq).filter(r=>r.date>o.date);if(later.length&&!later.some(r=>r.offChk))I.push({j:"warn",txt:`Calibrated after the offset (${later.at(-1).id}) without re-evaluating it.`});}
  return I;}
const offLv=o=>{const I=offIssues(o);return I.some(i=>i.j==="crit")?"crit":I.length?"warn":"ok";};
/* the offset procedure */
const opOk=()=>isDate(S.op.apprDate)&&!S.op.dirty;
const opDue=()=>isDate(S.op.apprDate)?addDays(S.op.apprDate,+C().reviewDays||365):"";

/* HTSA 3.2 */
const SCORE={s:["ok","Satisfactory","acc"],ns:["warn","Not satisfactory","cond"],nia:["bad","Needs immediate action","rej"]};
const LV={ok:["ok","Met"],warn:["warn","Attention"],crit:["bad","Not met"],info:["acc","Note"]};
function assess32(){
  const I=[],add=(lvl,req,ev,act)=>I.push({lvl,req,ev,act}),E=S.eqs.filter(judged),ES=E.map(e=>({e,s:eqState(e)})),TQ=tcEquip();
  /* 1. register with the Process Table frequencies */
  const noRef=E.filter(e=>!txt(e.ptRef)),long=E.filter(e=>ivOf(e.interval)&&ivDays(e.interval)>ivDays(kInt(e.kind))+0.5);
  if(!E.length)add("crit","Equipment register with the frequencies of the Process Tables, Sections 1.0 and 2.0","No process or test equipment registered.","Register the controllers, recorders, over-temperature controllers, test instruments, timers, gauges and testers with their interval (F-CAL-01).");
  else add(long.length?"crit":noRef.length?"warn":"ok","Equipment register with the frequencies of the Process Tables, Sections 1.0 and 2.0",long.length?`${long.map(e=>`${e.tag} ${ivTxt(e.interval)} (Process Table ${ivTxt(kInt(e.kind))})`).join("; ")}: interval longer than the Process Table frequency.`:noRef.length?`${plural(noRef.length,"item")} without the Process Table reference: ${noRef.slice(0,6).map(e=>e.tag).join(", ")}${noRef.length>6?" …":""}.`:`${plural(E.length,"item")} with interval and Process Table reference.`,long.length?"Shorten the interval to the Process Table frequency.":noRef.length?"Add the Process Table item to each.":"");
  /* 2. current */
  const bad=ES.filter(x=>ELV[x.s.st]==="crit"),soon=ES.filter(x=>x.s.st==="soon"),tqBad=TQ.filter(q=>["none","overdue"].includes(tcState(q)));
  if(E.length)add(bad.length||tqBad.length?"crit":soon.length?"warn":"ok","Calibrations, verifications and certifications current",
    bad.length||tqBad.length?[...bad.map(x=>`${x.e.tag}: ${EST[x.s.st][1].toLowerCase()}${x.s.due?" (due "+fmtD(x.s.due)+")":""}`),...tqBad.map(q=>`${q.ident} (Thermocouples): calibration ${tcState(q)==="none"?"due date missing":"expired "+fmtD(q.calDue)}`)].slice(0,10).join("; ")+(bad.length+tqBad.length>10?" …":"")+".":soon.length?`Due soon: ${soon.map(x=>x.e.tag+" "+fmtD(x.s.due)).join(", ")}.`:`Every item in use current${TQ.length?`, also the ${plural(TQ.length,"test thermocouple / instrument","test thermocouples / instruments")} of the Thermocouples module`:""}.`,
    bad.length||tqBad.length?"Calibrate before further use; assess the product made with equipment out of date.":soon.length?"Plan the calibrations due.":"");
  /* 3. non-contact */
  const ir=ES.filter(x=>x.e.kind==="ir"),irBad=ir.filter(x=>ELV[x.s.st]==="crit");
  add(irBad.length?"crit":ir.length?"ok":"info","Non-contact thermometry devices calibrated per the Process Tables",irBad.length?`${irBad.map(x=>x.e.tag+": "+EST[x.s.st][1].toLowerCase()).join("; ")}.`:ir.length?`${plural(ir.length,"device")} calibrated and current${ir.some(x=>x.s.last&&!txt(x.s.last.emis))?" (emissivity setting not recorded on one)":""}.`:"No non-contact thermometer in use.",irBad.length?"Calibrate against a blackbody source at the temperatures of use; record the emissivity setting.":"");
  /* 4. offset procedure documented */
  const due=opDue();
  add(!isDate(S.op.apprDate)?"crit":S.op.dirty||(due&&due<today())?"warn":"ok","Documented offset procedure (P3.2.3)",!isDate(S.op.apprDate)?"The offset procedure is not approved.":S.op.dirty?`${S.op.no} rev ${S.op.rev}: changed since the approval.`:due<today()?`${S.op.no} rev ${S.op.rev}: periodic review overdue (due ${fmtD(due)}).`:`${S.op.no} rev ${S.op.rev}, approved ${fmtD(S.op.apprDate)} by ${S.op.appr}; review due ${fmtD(due)}.`,!opOk()?"Approve the offset procedure (a new revision after the change).":"");
  /* 5. authority and how the approval is documented */
  const na=!authLines().length,nh=!txt(S.op.how);
  add(na||nh?"crit":"ok","The offset procedure names who may approve offsets and how the approval is documented",na||nh?[na?"no person / position authorized":"",nh?"how the approval is documented not stated":""].filter(Boolean).join("; ")+".":`Authorized: ${authLines().join("; ")}. Documented: ${S.op.how}`,na||nh?"Complete the offset procedure (authority, approval record).":"");
  /* 6. offsets comply with P3.2.3 */
  const act=S.offs.filter(o=>offActive(o)),oc=act.filter(o=>offLv(o)==="crit"),ow=act.filter(o=>offLv(o)==="warn");
  add(oc.length?"crit":ow.length?"warn":act.length?"ok":"info","Offsets applied comply with P3.2.3",oc.length||ow.length?[...oc,...ow].map(o=>`${o.id} ${(eqById(o.eq)||{}).tag||o.eq} ${sgn(num(o.value))} °C: ${offIssues(o).map(i=>i.txt.replace(/^Missing: /,"").replace(/:\s.*$/,"")).slice(0,3).join(", ")}`).join("; ")+".":act.length?`${plural(act.length,"offset")} in use, each approved by an authorized person, within ± ${C().offMax} °C, documented and verified.`:"No offset in use.",oc.length?"Approve or remove the offset; correct the measurement chain when the offset is beyond the limit.":ow.length?"Complete the offset records.":"");
  /* 7. labels */
  const lastOf=ES.filter(x=>x.s.last),lb=lastOf.filter(x=>lblMissing(x.s.last).length);
  if(lastOf.length)add(lb.length?"warn":"ok","Calibration labels meet P3.2.5.1",lb.length?`${lb.slice(0,8).map(x=>`${x.e.tag}: ${lblMissing(x.s.last).join(", ")}`).join("; ")}${lb.length>8?" …":""}.`:`The labels of the ${plural(lastOf.length,"latest calibration")} checked with every element.`,lb.length?"Check the label at the equipment and record it (F-CAL-04).":"");
  /* 8. reports */
  const rb=lastOf.filter(x=>repMissing(x.s.last).length),rn=lastOf.filter(x=>!repMissing(x.s.last).length&&!reviewed(x.s.last)),late=rn.filter(x=>dayDiff(x.s.last.date,today())>(+C().revDays||7));
  if(lastOf.length)add(rb.length?"crit":late.length?"crit":rn.length?"warn":"ok","Calibration reports meet P3.2.5.2",rb.length?`${rb.slice(0,6).map(x=>`${x.s.last.id} ${x.e.tag}: ${repMissing(x.s.last).slice(0,3).join(", ")}${repMissing(x.s.last).length>3?" …":""}`).join("; ")}${rb.length>6?" …":""}.`:rn.length?`${rn.map(x=>x.s.last.id).join(", ")}: complete, not yet reviewed${late.length?` (${late.map(x=>x.s.last.id).join(", ")} for more than ${C().revDays} days)`:""}.`:`The ${plural(lastOf.length,"latest report")} complete and reviewed.`,rb.length||rn.length?"Complete the reports and have them reviewed (F-CAL-02).":"");
  /* 9. reaction */
  const oof=S.cals.filter(r=>["oof","fail"].includes(evalCal(r).res)&&!r.closed);
  if(S.cals.length)add(oof.length?"crit":"ok","Reaction to equipment found out of tolerance",oof.length?`${oof.map(r=>`${r.id} ${(eqById(r.eq)||{}).tag||""}: ${missingAct(r).join(", ")||"to close"}`).join("; ")}.`:"No open out-of-tolerance finding.",oof.length?"Assess the product since the last calibration in tolerance, contain and correct.":"");
  const crit=I.filter(i=>i.lvl==="crit").length;
  return {I,crit,ES,score:!E.length||!S.cals.length?"nia":crit?"ns":"s"};
}
function kp(){const A=assess32(),ES=A.ES,TQ=tcEquip();return {score:A.score,crit:A.crit,items:ES.length+TQ.length,
  ok:ES.filter(x=>x.s.st==="ok"||x.s.st==="soon").length+TQ.filter(q=>["ok","soon"].includes(tcState(q))).length,
  overdue:ES.filter(x=>["overdue","none"].includes(x.s.st)).length+TQ.filter(q=>["none","overdue"].includes(tcState(q))).length,
  soon:ES.filter(x=>x.s.st==="soon").length,failed:ES.filter(x=>x.s.st==="fail").length,
  open:S.cals.filter(r=>["oof","fail"].includes(evalCal(r).res)&&!r.closed).length,
  offBad:S.offs.filter(o=>offActive(o)&&offLv(o)!=="ok").length,offs:S.offs.filter(o=>offActive(o)).length,
  toReview:ES.filter(x=>x.s.last&&!reviewed(x.s.last)).length,opOk:opOk(),opRev:isDate(S.op.apprDate)?S.op.rev:null};}

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
async function saveCfg(){if(!needDb())return;try{await dbSet("config","settings",S.cfg);toast("Settings saved");}catch(e){toast("Not saved: "+errMsg(e));}}
async function saveOp(t){if(!needDb())return false;S.op.log=S.op.log||[];if(t)S.op.log.push({d:today(),t});try{await dbSet("config","offproc",S.op);return true;}catch(e){toast("Not saved: "+errMsg(e));return false;}}
async function batchPut(c,L){for(let i=0;i<L.length;i+=8)await Promise.all(L.slice(i,i+8).map(o=>dbSet(c,o.id,o)));}
S.op={...DEFOP};
function startStore(store,state){
  S.unsub.forEach(u=>{try{u();}catch(e){}});S.db=store;S.dbState=state;
  S.unsub=[store.sub("equip",L=>{S.eqs=L.map(fillEq).sort((a,b)=>a.tag<b.tag?-1:1);safeRender();}),
    store.sub("cals",L=>{S.cals=L.map(fillCal).sort((a,b)=>a.id<b.id?-1:1);safeRender();}),
    store.sub("offsets",L=>{S.offs=L.map(fillOff).sort((a,b)=>a.id<b.id?-1:1);safeRender();}),
    store.sub("config",L=>{const c=L.find(x=>x.id==="settings"),p=L.find(x=>x.id==="offproc");S.cfg={...DEF,...(c||{})};delete S.cfg.id;if(!S.cfg.kint||typeof S.cfg.kint!=="object")S.cfg.kint={};
      S.op={...DEFOP,...(p||{})};delete S.op.id;if(!Array.isArray(S.op.log))S.op.log=[];safeRender();})];
  render();
}
function safeRender(){
  const a=document.activeElement;if(S.modal||(a&&$("#main")&&$("#main").contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=true;return;}
  render();
}
onDoc("focusout",()=>setTimeout(()=>{if(S.pending&&!S.modal){const a=document.activeElement;if(!(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=false;render();}}},0));

/* 7. navigation */
const NAV=[["",[["dash","Dashboard"]]],["P",[["equip","Register & schedule"],["proc","Offset procedure"]]],["D",[["cals","Calibrations"],["offsets","Offsets"]]],
  ["C",[["review","HTSA 3.2"]]],["A",[["act","Actions"]]],["",[["settings","Settings"],["rules","Rules"],["docs","Docs"],["data","Data"]]]];
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
const inView=e=>(!S.filt.k||e.kind===S.filt.k)&&(!S.filt.f||(S.filt.f==="lab"?!e.furnace:e.furnace===S.filt.f))&&(!S.filt.st||eqState(e).st===S.filt.st||(S.filt.st==="bad"&&ELV[eqState(e).st]==="crit"));
const filtRow=()=>`<div class="row"><select data-filt="k"><option value="">All kinds</option>${Object.entries(KINDS).map(([k,v])=>`<option value="${k}" ${S.filt.k===k?"selected":""}>${esc(v[0])}</option>`).join("")}</select>
  <select data-filt="f"><option value="">All locations</option>${furnaces().map(f=>`<option ${S.filt.f===f?"selected":""}>${f}</option>`).join("")}<option value="lab" ${S.filt.f==="lab"?"selected":""}>Laboratory / site</option></select>
  <select data-filt="st"><option value="">Any status</option><option value="bad" ${S.filt.st==="bad"?"selected":""}>Not current</option>${["ok","soon","overdue","none","fail","spare","out"].map(k=>`<option value="${k}" ${S.filt.st===k?"selected":""}>${EST[k][1]}</option>`).join("")}</select></div>`;
function attention(){const out=[],A=assess32();
  A.ES.filter(x=>ELV[x.s.st]==="crit"||x.s.st==="soon").forEach(x=>out.push([x.s.st==="fail"?`data-open-cal="${esc(x.s.last.id)}"`:`data-new-cal="${esc(x.e.id)}"`,`${x.e.tag} ${x.e.name}: ${EST[x.s.st][1].toLowerCase()}${x.s.due?" · due "+fmtD(x.s.due):""}`,ELV[x.s.st]==="crit"?"bad":"warn"]));
  tcEquip().filter(q=>["none","overdue"].includes(tcState(q))).forEach(q=>out.push([`data-gotc`,`${q.ident} (Thermocouples module): calibration ${tcState(q)==="none"?"due date missing":"expired "+fmtD(q.calDue)}`,"bad"]));
  S.cals.filter(r=>["oof","fail"].includes(evalCal(r).res)&&!r.closed).forEach(r=>out.push([`data-open-cal="${esc(r.id)}"`,`${r.id} ${(eqById(r.eq)||{}).tag||""}: found out of tolerance, reaction ${missingAct(r).length?"open":"to close"}`,"bad"]));
  S.offs.filter(o=>offActive(o)&&offLv(o)!=="ok").forEach(o=>out.push([`data-open-off="${esc(o.id)}"`,`${o.id} offset ${sgn(num(o.value))} °C on ${(eqById(o.eq)||{}).tag||o.eq}: ${offIssues(o)[0].txt.replace(/^Missing: /,"missing ")}`,offLv(o)==="crit"?"bad":"warn"]));
  if(!opOk())out.unshift([`data-goproc`,isDate(S.op.apprDate)?"Offset procedure changed since its approval":"The offset procedure is not approved","bad"]);
  A.ES.filter(x=>x.s.last&&!repMissing(x.s.last).length&&!reviewed(x.s.last)).forEach(x=>out.push([`data-open-cal="${esc(x.s.last.id)}"`,`${x.s.last.id} ${x.e.tag}: report to review`,"warn"]));
  return out;}
function vDash(){
  if(!S.eqs.length&&!S.cals.length)return `<div class="empty"><h2>No calibrated equipment registered yet</h2><p>Register the process and test equipment with the calibration, verification or certification interval of the Process Tables, Sections 1.0 and 2.0, then record each calibration. The starter set-up shows how the module works on F-01 … F-04.</p><div class="row" style="justify-content:center"><button class="pri w" data-add-defaults>Add the equipment of this plant</button><button class="w" data-std>Load starter set-up</button></div></div>`;
  const A=assess32(),sc=SCORE[A.score],k=kp(),att=attention();
  return `<div class="tiles">
    <a class="tile ${sc[0]}" href="#review"><span class="k">HTSA 3.2</span><span class="v" style="font-size:20px;padding:6px 0">${sc[1]}</span><span class="small muted">${plural(A.crit,"item")} not met</span></a>
    <a class="tile ${k.ok===k.items&&k.items?"ok":"bad"}" href="#equip"><span class="k">Equipment current</span><span class="v">${k.ok}/${k.items}</span><span class="small muted">${k.overdue} overdue / never · ${k.soon} due soon</span></a>
    <a class="tile ${k.open?"bad":""}" href="#act"><span class="k">Out of tolerance open</span><span class="v">${k.open}</span><span class="small muted">product assessment</span></a>
    <a class="tile ${k.offBad?"bad":""}" href="#offsets"><span class="k">Offsets in use</span><span class="v">${k.offs}</span><span class="small muted">${k.offBad} not compliant</span></a>
    <a class="tile ${k.opOk?"ok":"bad"}" href="#proc"><span class="k">Offset procedure</span><span class="v" style="font-size:20px;padding:6px 0">${k.opRev!=null?"Rev "+k.opRev:"Not approved"}</span><span class="small muted">${esc(S.op.no)}</span></a>
    <a class="tile ${k.toReview?"warn":""}" href="#cals"><span class="k">Reports to review</span><span class="v">${k.toReview}</span><span class="small muted">latest records</span></a></div>
  <div class="grid2"><div class="panel"><div class="row between"><h3>Needs attention</h3><button class="pri w" data-new-cal>Record a calibration</button></div>
    ${att.length?`<ul class="issues">${att.slice(0,14).map(([a,t,c])=>`<li><button class="link" ${a}>${esc(t)}</button> ${pill(c,c==="bad"?"Not met":"Attention")}</li>`).join("")}</ul>${att.length>14?`<p class="small muted">${att.length-14} more on <a href="#act">Actions</a>.</p>`:""}`:`<p class="muted">Nothing open.</p>`}</div>
  <div class="panel"><h3>Due in the next 60 days</h3>${dueTable(60)}</div></div>`;}
function dueTable(days){const L=S.eqs.filter(judged).map(e=>({e,s:eqState(e)})).filter(x=>x.s.due&&dayDiff(today(),x.s.due)<=days).sort((a,b)=>a.s.due<b.s.due?-1:1);
  const T=tcEquip().filter(q=>isDate(q.calDue)&&dayDiff(today(),q.calDue)<=days);
  return L.length||T.length?`<div class="tw"><table><thead><tr><th>Due</th><th>Equipment</th><th>Status</th></tr></thead><tbody>${L.map(x=>`<tr class="click" data-new-cal="${esc(x.e.id)}"><td>${fmtD(x.s.due)}</td><td><b>${esc(x.e.tag)}</b> ${esc(x.e.name)}</td><td>${pill(...EST[x.s.st])}</td></tr>`).join("")}${T.map(q=>`<tr><td>${fmtD(q.calDue)}</td><td><b>${esc(q.ident)}</b> <span class="small muted">Thermocouples module</span></td><td>${pill(...EST[tcState(q)])}</td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">Nothing due.</p>`;}
function vEquip(){const L=S.eqs.filter(inView),TQ=tcEquip();
  return `<div class="row between"><h2>Equipment register and schedule (F-CAL-01)</h2><div class="row"><button class="pri w" data-new-eq>Add equipment</button><button data-add-defaults>Add the equipment of this plant</button><button data-eqprint>Print F-CAL-01</button></div></div>
  <p class="muted">Every piece of process and test equipment that needs calibration, verification or certification, with the interval of the applicable Process Table (Section 1.0 process and test equipment, Section 2.0 pyrometry). Due = the latest valid record + the interval (or the due date of the report when shorter).</p>${filtRow()}
  ${L.length?`<div class="tw"><table><thead><tr><th>Tag</th><th>Equipment</th><th>Location</th><th>Type · interval</th><th>Accuracy</th><th>Process Table</th><th>Last</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>${L.map(e=>{const s=eqState(e),o=activeOffs(e.id);
    return `<tr><td class="mono"><button class="link" data-open-eq="${esc(e.id)}">${esc(e.tag)}</button></td><td>${esc(e.name)}<br><span class="small muted">${esc(kd(e.kind)[0])}${e.serial?" · s/n "+esc(e.serial):""}</span></td><td>${esc(e.furnace||e.loc||"—")}${e.chamber?" "+esc(e.chamber):""}${e.loop?`<br><span class="small muted">${esc(e.loop)}</span>`:""}</td>
    <td>${esc(TYPES[e.type])}<br><span class="small muted">${ivTxt(intOf(e))}</span></td><td class="small">${esc(accTxt(e))}</td><td class="small">${esc(e.ptRef||"—")}</td><td>${s.last?`<button class="link" data-open-cal="${esc(s.last.id)}">${fmtD(s.last.date)}</button>`:"—"}</td><td>${fmtD(s.due)}</td>
    <td>${pill(...EST[s.st])}${o.length?" "+pill(offLv(o[0])==="ok"?"acc":"warn","offset "+sgn(num(o[0].value)))+"":""}</td><td><button data-new-cal="${esc(e.id)}">Record</button></td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No equipment matches.</p></div>`}
  ${TQ.length?`<div class="panel"><h3>Test thermocouples and instruments (Thermocouples module, HTSA 3.3)</h3><p class="small muted">Kept in the Thermocouples module with their calibration observations; counted here for HTSA 3.2.</p><div class="tw"><table><thead><tr><th>Ident</th><th>Kind</th><th>Certificate</th><th>Calibrated</th><th>Due</th><th>Status</th><th>Notes</th></tr></thead><tbody>${TQ.map(q=>`<tr><td><b>${esc(q.ident)}</b></td><td>${q.kind==="testtc"?"Test thermocouple":"Test instrument"}</td><td>${esc(q.cert||"—")}</td><td>${fmtD(q.calDate)}</td><td>${fmtD(q.calDue)}</td><td>${pill(...EST[tcState(q)])}</td><td class="small">${esc(q.issues.join("; "))}</td></tr>`).join("")}</tbody></table></div><p><a class="btn" href="#tc/eq">Open in Thermocouples</a></p></div>`:""}`;}
function vCals(){const L=S.cals.filter(r=>{const e=eqById(r.eq);return !e||inView(e);}).slice().sort(byDate).reverse();
  return `<div class="row between"><h2>Calibrations, verifications and certifications (F-CAL-02)</h2><button class="pri w" data-new-cal>Record a calibration</button></div>${filtRow()}
  ${L.length?`<div class="tw"><table><thead><tr><th>Record</th><th>Date</th><th>Equipment</th><th>Type · by</th><th>Largest error (as found / as left)</th><th>Result</th><th>Label</th><th>Report</th></tr></thead><tbody>${L.map(r=>{const e=eqById(r.eq),k=evalCal(r),mf=k.pts.length?k.pts.reduce((a,p)=>Math.abs(p.ef)>Math.abs(a.ef)?p:a):null,ml=k.pts.length?k.pts.reduce((a,p)=>Math.abs(p.el)>Math.abs(a.el)?p:a):null;
    return `<tr class="click" data-open-cal="${esc(r.id)}"><td class="mono">${esc(r.id)}</td><td>${fmtD(r.date)}<br><span class="small muted">due ${fmtD(dueOf(r))}</span></td><td><b>${esc(e?e.tag:r.eq)}</b> ${esc(e?e.name:"")}</td><td>${esc(TYPES[r.type])}<br><span class="small muted">${esc(r.ext==="ext"?r.lab||"external":r.by)}</span></td>
    <td>${mf?`${sgn(mf.ef)} / ${sgn(ml.el)} ${esc(e?accOf(e).unit:"")}`:"—"}</td><td>${pill(...RES[k.res||"none"])}${["oof","fail"].includes(k.res)?" "+pill(r.closed?"ok":"bad",r.closed?"closed":"reaction open"):""}</td>
    <td>${lblMissing(r).length?pill("warn",lblMissing(r).length+" missing"):pill("ok","Checked")}</td><td>${repMissing(r).length?pill("warn",repMissing(r).length+" missing"):reviewed(r)?pill("ok","Reviewed"):pill("warn","To review")}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No record matches.</p></div>`}`;}
function vOffsets(){const L=S.offs.slice().sort(byDate).reverse();
  return `<div class="row between"><h2>Offsets (F-CAL-03)</h2><button class="pri w" data-new-off>Record an offset</button></div>
  <p class="muted">An offset (bias) entered into a controller, recorder or SCADA channel to adjust the instrumentation is applied only per the offset procedure ${esc(S.op.no)} (P3.2.3): based on a documented calibration or SAT result, approved beforehand by a person the procedure authorizes, within ± ${esc(C().offMax)} °C, documented where it is applied, read back after entry and re-evaluated at every later calibration.</p>
  ${L.length?`<div class="tw"><table><thead><tr><th>Offset</th><th>Entered</th><th>Equipment</th><th>Value</th><th>Basis</th><th>Approved</th><th>Documented in</th><th>Status</th></tr></thead><tbody>${L.map(o=>{const e=eqById(o.eq),lv=offLv(o),I=offIssues(o);
    return `<tr class="click" data-open-off="${esc(o.id)}"><td class="mono">${esc(o.id)}</td><td>${fmtD(o.date)}</td><td><b>${esc(e?e.tag:o.eq)}</b> ${esc(e?e.name:"")}</td><td>${sgn(num(o.value))} °C</td><td class="small">${esc(OFFB[o.basis]||"")} ${esc(o.ref)}</td><td>${o.apprBy?`${esc(o.apprBy)}<br><span class="small muted">${fmtD(o.apprDate)}</span>`:"—"}</td><td class="small">${esc(o.where||"—")}</td>
    <td>${offActive(o)?pill(lv==="ok"?"ok":lv==="crit"?"bad":"warn",lv==="ok"?"In use":"In use · "+I.length+" issue"+(I.length>1?"s":"")):pill("",isDate(o.removed)?"Removed "+fmtD(o.removed):"Not yet active")}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No offset recorded.</p></div>`}`;}
function vProc(){const op=S.op,due=opDue();
  return `<div class="panel"><div class="row between"><h3>Offset procedure (P3.2.3)</h3><button class="w" data-opappr>${isDate(op.apprDate)?"Approve a new revision":"Approve the procedure"}</button></div>
    <p><b>${esc(op.no)}</b> ${isDate(op.apprDate)?pill(op.dirty?"warn":"ok",`Rev ${op.rev} approved ${fmtD(op.apprDate)} by ${op.appr}${op.dirty?" · changed since":""}`):pill("bad","Not approved")} ${due?`<span class="small muted">review due ${fmtD(due)}</span>`:""}</p>
    <p class="small muted">The procedure is the document MWSPL-WI-CAL-02 (<a href="#docs" data-docref="02_Work_Instructions/MWSPL-WI-CAL-02_Instrument_Offsets.md">open it</a>). The two things HTSA 3.2 asks it to state are kept here and used by the offset records: who has the authority to approve the use of an offset, and how that approval is documented. A change marks the procedure for a new revision.</p>
    <div class="fields"><label class="f wide req"><span>Authorized to approve offsets (one per line: name — position)</span><textarea id="op-auth" rows="3">${esc(op.auth)}</textarea></label>
    <label class="f wide req"><span>How the approval is documented</span><textarea id="op-how" rows="2">${esc(op.how)}</textarea></label></div>
    <div class="row" style="margin-top:10px"><button class="pri" data-save-op>Save</button>${MWS.org&&MWS.org.hasData&&MWS.org.hasData()?`<button data-op-org>Fill from the HT organization</button>`:""}<span class="small muted">Largest offset allowed: ± ${esc(C().offMax)} °C (Settings).</span></div>
    ${op.log.length?`<h4>History</h4><ul class="small">${op.log.slice().reverse().map(l=>`<li>${fmtD(l.d)} · ${esc(l.t)}</li>`).join("")}</ul>`:""}</div>`;}
function vReview(){const A=assess32(),sc=SCORE[A.score];
  return `<div class="panel"><div class="row between"><h3>HTSA 3.2 · Are process equipment calibrations, verifications, and certifications current?</h3><button data-h32>Evidence (print)</button></div>
    <p><span class="verdict ${sc[2]}">${sc[1]}</span> <span class="muted">${plural(A.I.filter(i=>i.lvl==="ok").length,"item")} met · ${plural(A.crit,"item")} not met · ${plural(A.I.filter(i=>i.lvl==="warn").length,"item")} needing attention</span></p>
    <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th><th>Action</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${pill(...LV[i.lvl])}</td><td>${esc(i.act)}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted" style="margin-top:8px">The question refers to the Process Tables, Sections 1.0 and 2.0, for the calibration, verification and certification frequencies; non-contact thermometry; the documented offset procedure of P3.2.3 with the authority and how the approval is documented; offsets complying with P3.2.3; labels per P3.2.5.1 and reports per P3.2.5.2. Intervals, accuracies, the offset limit and the label and report elements are settings to confirm against the controlled CQI-9 copy.</p></div>`;}
function vAct(){const att=attention(),F=S.cals.filter(r=>["oof","fail"].includes(evalCal(r).res)).sort(byDate).reverse();
  return `<div class="panel"><h3>Open items</h3>${att.length?`<ul class="issues">${att.map(([a,t,c])=>`<li><button class="link" ${a}>${esc(t)}</button> ${pill(c,c==="bad"?"Not met":"Attention")}</li>`).join("")}</ul>`:`<p class="muted">Nothing open.</p>`}</div>
  <div class="panel"><h3>Equipment found out of tolerance and the reaction</h3>${F.length?`<div class="tw"><table><thead><tr><th>Record</th><th>Equipment</th><th>Finding</th><th>Product at risk</th><th>Reaction</th><th>Status</th></tr></thead><tbody>${F.map(r=>`<tr class="click" data-open-cal="${esc(r.id)}"><td class="mono">${esc(r.id)}<br>${fmtD(r.date)}</td><td>${esc((eqById(r.eq)||{}).tag||"")}</td><td class="small">${esc(evalCal(r).issues.filter(i=>i.j==="oof"||i.j==="fail").map(i=>i.txt).join(" "))}</td><td class="small">${esc(riskTxt(r))}</td><td class="small">${missingAct(r).length?"Missing: "+esc(missingAct(r).join(", ")):esc(r.act.action)}</td><td>${pill(r.closed?"ok":"bad",r.closed?"Closed":"Open")}</td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">None.</p>`}</div>`;}
function vSettings(){const c=C();
  return `<div class="panel"><h3>Settings</h3><div class="fields">${SETF.map(([k,l,t])=>t==="area"?`<label class="f wide"><span>${esc(l)}</span><textarea data-cfg="${k}" rows="3">${esc(c[k])}</textarea></label>`:`<label class="f ${k==="offMax"?"wide":""}"><span>${esc(l)}</span><input data-cfg="${k}" type="${t}" ${t==="number"?'step="any"':""} value="${esc(c[k])}"></label>`).join("")}</div>
    <h4>Frequencies per kind (Process Tables, Sections 1.0 and 2.0)</h4><p class="small muted">The longest interval allowed for each kind; equipment may have a shorter one. Defaults are typical values, flagged to confirm against the applicable Process Table.</p>
    <div class="tw"><table><thead><tr><th>Kind</th><th>Type</th><th>Section</th><th>Interval</th><th>Default accuracy</th></tr></thead><tbody>${Object.entries(KINDS).map(([k,v])=>`<tr><td>${esc(v[0])}</td><td>${esc(TYPES[v[1]])}</td><td>${v[6]}</td><td>${ivBox("kint:"+k,kInt(k))}</td><td class="small">${esc(accTxt({kind:k}))}</td></tr>`).join("")}</tbody></table></div>
    <div class="row" style="margin-top:12px"><button class="pri w" data-save-cfg>Save settings</button><span class="small muted">Changes are kept only after Save.</span></div></div>`;}
function vRules(){const c=C();
  const R=[["Register","Every piece of process and test equipment in use or kept as a spare has a type (calibration, verification, certification), an interval not longer than the frequency of its kind (Settings) and the Process Table reference."],
    ["Calibration points","Error = reading − nominal, as found and as left (as left = as found when nothing was adjusted). Limit at a point = the equipment's ± value or ± % of the reading, the greater. As found beyond the limit = found out of tolerance (reaction); as left beyond = out of tolerance (do not use). Invalid: the reference standard out of calibration on the day, a certification without a certificate no., no points."],
    ["Current","The latest valid record counts; due = its due date (else its date + the interval). Overdue / never calibrated / out of tolerance = not current; due soon "+c.soon+" days before. Spare equipment: calibrate before use. The test thermocouples and instruments of the Thermocouples module count with their calibration due date."],
    ["Non-contact thermometry","Infrared / optical pyrometers are calibrated at the interval of their kind; the record states the emissivity setting."],
    ["Offset procedure","MWSPL-WI-CAL-02 approved, reviewed every "+c.reviewDays+" days, naming who may approve offsets and how the approval is documented; a change to these marks it for a new revision."],
    ["Offsets (P3.2.3)","Each offset: equipment, value within ± "+c.offMax+" °C, basis with its record no. (calibration, SAT, TUS), reason, entered by, approval by an authorized person on or before the entry date, where it is documented, read-back verification; removal with the reason. A calibration after the offset states whether the offset was confirmed, changed or removed."],
    ["Labels (P3.2.5.1)","At the equipment: identification, calibration date, next due date, calibrated by (and any limitation of use); checked and recorded with the calibration (to confirm the elements against the controlled copy)."],
    ["Reports (P3.2.5.2)","Equipment identification and serial, date, next due, calibrated by (laboratory and accreditation when external), report no., method, reference standard with certificate, calibration due and traceability, points with as-found and as-left values, accuracy requirement, the adjustment or offset applied, the emissivity for non-contact devices; reviewed and accepted within "+c.revDays+" days by a person allowed (Settings + HT organization)."],
    ["Found out of tolerance","Reaction: product-impact assessment for the product since the last calibration in tolerance, containment / disposition, corrective action, owner, date; out of tolerance as left also needs a later calibration in tolerance."],
    ["HTSA 3.2 score","Needs immediate action: no equipment or no calibration record. Not satisfactory: any item not met. Satisfactory: otherwise."]];
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
function showDoc(){const el=$("#docview");if(!el)return;const p=S.docSel,t=MWS.docs&&MWS.docs[p];
  if(t!=null){el.innerHTML=md(t);return;}el.innerHTML=`<p class="banner warn">This document is not embedded in this build (${esc(p)}).</p>`;}
function vData(){const n=S.eqs.length+S.cals.length+S.offs.length;
  return `<h2>Data</h2><div class="grid2">
  <div class="panel"><h3>Back up and restore</h3><p class="small muted">${plural(S.eqs.length,"item")} of equipment, ${plural(S.cals.length,"record")}, ${plural(S.offs.length,"offset")} · storage: ${S.dbState==="on"?"shared record store":"this browser"}.</p>
    <div class="row"><button class="pri" data-export>Export JSON</button><button data-csv>Schedule CSV</button></div>
    <div class="row w" style="margin-top:10px"><label class="f"><span>Import a JSON export</span><input type="file" id="impfile" accept=".json,application/json"></label></div>
    ${S.imp?`<div class="banner" style="margin-top:8px">${esc(S.imp.msg)}<div class="row" style="margin-top:6px"><button class="pri" data-imp="merge">Merge (add and update)</button><button class="danger" data-imp="replace">Replace everything</button><button data-imp="cancel">Cancel</button></div></div>`:""}</div>
  ${MWS.calor&&MWS.calor.panel?`<div class="panel">${MWS.calor.panel(["hmt-reg","eqq-reg"],"CALOR's hardness testers (with their calibration due date) and the controller / recorder calibration dates of its Equipment page can be imported here.")}<button class="w" data-calor ${MWS.calor.get&&(MWS.calor.get("hmt-reg")||MWS.calor.get("eqq-reg"))?"":"disabled"}>Import from CALOR</button></div>`:""}
  <div class="panel"><h3>Starter set-up</h3><p class="small muted">The equipment of F-01 … F-04 and the laboratory with a year of calibration records: F-04 hardening controllers overdue, the F-02 hardening zone 3 controller found out of tolerance with the reaction open, an approved offset on F-03 and an offset on F-04 entered without approval, the offset procedure rev 1, one label and one report incomplete; all marked "(example)".</p><button class="w" data-std ${n?"disabled":""}>Load starter set-up</button>${n?`<p class="small muted">Only on an empty module.</p>`:""}</div>
  <div class="panel"><h3>Clear all</h3><p class="small muted">Deletes every record, the offset procedure and the settings of this module. Type <b>CLEAR ALL</b> to enable.</p>
    <div class="row w"><input id="clrtxt" placeholder="CLEAR ALL" style="max-width:180px"><button class="danger" data-clear>Clear all</button></div></div></div>`;}
const VIEWS={dash:vDash,equip:vEquip,proc:vProc,cals:vCals,offsets:vOffsets,review:vReview,act:vAct,settings:vSettings,rules:vRules,docs:vDocs,data:vData};
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
const eqOpts=()=>S.eqs.filter(e=>e.status!=="scrap").map(e=>[e.id,`${e.tag} · ${e.name}`]);
function DRAW_EQ(){const E=S.modal.ed,known=eqById(E.id),used=known&&(S.cals.some(r=>r.eq===E.id)||S.offs.some(o=>o.eq===E.id)),s=known?eqState(known):null;
  return sheet(esc(known?`${E.tag} · ${E.name}`:"Add equipment"),`${s?`<p class="muted">${pill(...EST[s.st])} ${s.due?"due "+fmtD(s.due):""}</p>`:""}<div class="fields">
    ${mf("tag","Tag (as marked)",{req:1})}${mf("name","Name",{req:1,wide:1})}${mf("kind","Kind",{opts:Object.entries(KINDS).map(([k,v])=>[k,v[0]])})}${mf("type","Type",{opts:Object.entries(TYPES)})}
    ${mf("furnace","Furnace",{opts:furnaces().map(f=>[f,f]),blank:1})}${mf("chamber","Chamber",{opts:CHAMBERS.map(c=>[c,c]),blank:1})}${mf("loop","Loop / channels / zone",{})}${mf("loc","Location (laboratory, site)",{})}
    ${mf("make","Make",{})}${mf("model","Model",{})}${mf("serial","Serial no.",{req:1})}${mf("status","Status",{opts:Object.entries(ESTAT)})}
    ${mf("lo","Range of use from",{})}${mf("hi","to",{})}${mf("unit","Unit",{ph:kd(E.kind)[5]})}
    ${mf("accAbs","Accuracy ± (unit)",{ph:String(kd(E.kind)[3])})}${mf("accPct","Accuracy ± % of reading",{ph:String(kd(E.kind)[4])})}
    <label class="f req"><span>Interval</span>${ivBox("eq",intOf(E))}<span class="small muted">Longest for this kind (Process Table): ${esc(ivTxt(kInt(E.kind)))}</span></label>${mf("ptRef","Process Table reference (table, section 1.0 / 2.0 item)",{wide:1,req:1})}
    ${E.kind==="ir"?mf("emis","Emissivity setting in use",{}):""}${mf("notes","Notes",{area:2,wide:1})}</div>`,
    `<button class="pri w" data-save-eq>Save</button>${known?`<button data-new-cal="${esc(E.id)}">Record a calibration</button>`:""}${known&&!used?`<button class="danger w" data-del-eq>Delete</button>`:""}<button data-close>Close</button>`);}
function resHtml(E){const k=evalCal(E),e=eqById(E.eq);if(!e)return `<p class="muted small">Choose the equipment.</p>`;
  if(!k.res)return `<p class="muted small">${esc(k.issues.map(i=>i.txt).join(" "))}</p>`;
  return `<div class="row" style="gap:10px;align-items:center">${pill(...RES[k.res])}<span class="small">Accuracy ${esc(accTxt(e))} · due ${fmtD(dueOf(E))}</span></div>
  ${k.issues.length?`<ul class="small">${k.issues.map(i=>`<li class="c-${i.j==="fail"||i.j==="invalid"||i.j==="incomplete"?"bad":i.j==="oof"||i.j==="warn"?"warn":"ok"}">${esc(i.txt)}</li>`).join("")}</ul>`:""}
  ${k.pts.length?`<div class="tw"><table><thead><tr><th>Nominal</th><th>As found</th><th>Error</th><th>As left</th><th>Error</th><th>Limit</th></tr></thead><tbody>${k.pts.map(p=>`<tr><td>${r2(p.nom)}</td><td>${r2(p.found)}</td><td class="${p.of?"c-bad":""}">${sgn(p.ef)}</td><td>${r2(p.left)}</td><td class="${p.ol?"c-bad":""}">${sgn(p.el)}</td><td>${p.lim==null?"—":"± "+r2(p.lim)}</td></tr>`).join("")}</tbody></table></div>`:""}`;}
function DRAW_CAL(){const E=S.modal.ed,known=calById(E.id),e=eqById(E.eq),k=evalCal(E),rm=repMissing(E),lock=reviewed(E),ma=missingAct(E),offs=e?activeOffs(e.id,E.date||today()).filter(o=>o.date<(E.date||today())):[];
  const body=`<p class="muted">${known?pill(...RES[k.res||"none"]):pill("warn","New")} ${lock?pill("ok",`Report reviewed ${fmtD(E.rev.date)} by ${E.rev.by}`):""}</p>
  <fieldset><legend>Equipment and record</legend><div class="fields">${mf("eq","Equipment",{opts:eqOpts(),blank:1,req:1,dis:lock||known})}${mf("type","Type",{opts:Object.entries(TYPES),dis:lock})}
    ${mf("date","Date",{type:"date",req:1,dis:lock})}${mf("due","Next due",{type:"date",req:1,dis:lock,hint:e?`interval ${ivTxt(intOf(e))}`:""})}${mf("by","Calibrated by",{req:1,dis:lock})}
    ${mf("ext","Done by",{opts:[["int","In-house"],["ext","External laboratory"]],dis:lock})}${E.ext==="ext"?mf("lab","Laboratory",{req:1,dis:lock})+mf("accred","Accreditation (e.g. NABL certificate no.)",{req:1,dis:lock}):""}
    ${mf("certNo","Report / certificate no.",{req:1,dis:lock})}${mf("method","Method / procedure",{req:1,dis:lock})}${e&&e.kind==="ir"?mf("emis","Emissivity setting",{req:1,dis:lock}):""}</div></fieldset>
  ${E.type!=="cert"?`<fieldset><legend>Reference standard</legend><div class="fields">${mf("std.id","Standard (ident)",{req:1,dis:lock})}${mf("std.cert","Its certificate no.",{req:1,dis:lock})}${mf("std.due","Its calibration due",{type:"date",req:1,dis:lock})}${mf("std.trace","Traceability (national / international standard)",{wide:1,req:1,dis:lock})}${mf("env","Ambient conditions",{dis:lock})}</div></fieldset>`:""}
  <fieldset><legend>Points (as found / as left)</legend><p class="small muted">As left empty = as found (nothing adjusted). ${e?"Accuracy "+esc(accTxt(e))+".":""}</p>
    <div class="tw"><table class="fq"><thead><tr><th>Nominal</th><th>As found</th><th>As left</th>${lock?"":"<th></th>"}</tr></thead><tbody>${E.pts.map((p,i)=>`<tr>${["nom","found","left"].map(f=>`<td><input data-pt="${i}.${f}" value="${esc(p[f])}" ${lock?"disabled":""} style="min-width:80px"></td>`).join("")}${lock?"":`<td><button data-ptdel="${i}" aria-label="Remove">✕</button></td>`}</tr>`).join("")}</tbody></table></div>
    ${lock?"":`<p class="row"><button data-ptadd>Add a point</button></p>`}
    <div class="fields">${mf("adj","Adjustment",{opts:[["none","None"],["adjusted","Adjusted (calibrated)"],["offset","Offset applied (record F-CAL-03)"]],dis:lock})}
    ${offs.length?mf("offChk",`Offset in use: ${offs.map(o=>o.id+" "+sgn(num(o.value))+" °C").join(", ")}`,{opts:Object.entries(OFFCHK),blank:1,req:1,dis:lock}):""}${mf("notes","Notes",{area:2,wide:1,dis:lock})}</div>
    <div id="calres">${resHtml(E)}</div></fieldset>
  ${["oof","fail"].includes(k.res)?`<fieldset><legend>Reaction: found out of tolerance</legend><p class="small">Product at risk: ${esc(riskTxt(E))}</p><div class="fields">
    ${mf("act.impact","Product-impact assessment",{area:2,wide:1,req:1,dis:E.closed})}${mf("act.contain","Containment / disposition",{area:2,wide:1,req:1,dis:E.closed})}${mf("act.action","Corrective action",{area:2,wide:1,req:1,dis:E.closed})}
    ${mf("act.by","Owner",{req:1,dis:E.closed})}${mf("act.date","Date",{type:"date",req:1,dis:E.closed})}</div>${!E.closed&&ma.length?`<p class="small muted">To close: ${esc(ma.join(", "))}</p>`:""}</fieldset>`:""}
  <fieldset><legend>Calibration label at the equipment (P3.2.5.1)</legend><div class="row" style="flex-wrap:wrap;gap:14px">${Object.entries(LBL).map(([k2,t])=>`<label class="chk"><input type="checkbox" data-lbl="${k2}" ${E.lbl[k2]?"checked":""} ${lock?"disabled":""}> ${esc(t)}</label>`).join("")}</div>
    <div class="fields">${mf("lbl.lim","Limitation of use shown (if any)",{dis:lock})}${mf("lbl.chkBy","Label checked by",{dis:lock})}</div></fieldset>
  <fieldset><legend>Report review (P3.2.5.2)</legend><div class="fields">${mf("rev.by","Reviewed and accepted by",{dis:lock,list:"cal-appr"})}${mf("rev.date","Date",{type:"date",dis:lock})}${mf("rev.remarks","Remarks",{wide:1,dis:lock})}</div>
    <datalist id="cal-appr">${approvers().map(a=>`<option value="${esc(a.name)}">${esc(a.src)}</option>`).join("")}</datalist>
    ${!lock&&rm.length?`<div class="banner" style="margin-top:8px"><b>To accept the report:</b> ${esc(rm.join(" · "))}</div>`:""}</fieldset>`;
  const foot=[!lock?`<button class="pri w" data-save-cal>Save</button><button class="w" data-rev-cal>Accept report</button>`:`<button class="w" data-unrev>Reopen report</button>`,
    ["oof","fail"].includes(k.res)&&!E.closed?`<button class="w" data-close-act>Close the reaction</button>`:"",known?`<button data-cal-print>Print F-CAL-02</button><button data-lbl-print>Print label</button>`:"",known&&!reviewed(known)?`<button class="danger w" data-del-cal>Delete</button>`:"",`<button data-close>Close</button>`].join("");
  return sheet(esc(known?`${E.id} · ${e?e.tag:""}`:"Record a calibration"),body,foot);}
function DRAW_OFF(){const E=S.modal.ed,known=offById(E.id),I=offIssues(E),e=eqById(E.eq);
  return sheet(esc(known?`${E.id} · offset on ${e?e.tag:""}`:"Record an offset"),`<p class="muted">Per ${esc(S.op.no)}${isDate(S.op.apprDate)?" rev "+S.op.rev:" (not approved)"}: authorized to approve — ${esc(authNames().join(", ")||"nobody named")}.</p><div class="fields">
    ${mf("eq","Equipment",{opts:eqOpts().filter(([id])=>{const q=eqById(id);return ["ctrl","rec","otp","qtemp","ir","other"].includes(q.kind);}),blank:1,req:1})}${mf("value","Offset (°C, + raises the reading)",{req:1})}${mf("date","Entered on",{type:"date",req:1})}${mf("enteredBy","Entered by",{req:1})}
    ${mf("basis","Basis",{opts:Object.entries(OFFB),req:1})}${mf("ref","Record no. (calibration, SAT, TUS)",{req:1})}${mf("why","Reason",{area:2,wide:1,req:1})}
    ${mf("apprBy","Approved by",{req:1,list:"off-auth"})}${mf("apprDate","Approved on",{type:"date",req:1})}${mf("where","Documented in (controller parameter log, SCADA register …)",{wide:1,req:1})}
    ${mf("verBy","Read back / verified by",{req:1})}${mf("verDate","Verified on",{type:"date",req:1})}${mf("removed","Removed on",{type:"date"})}${mf("removedWhy","Why removed (when removed)",{wide:1})}</div>
    <datalist id="off-auth">${authNames().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
    <div id="offres">${offRes(E)}</div>`,
    `<button class="pri w" data-save-off>Save</button>${known?`<button data-off-print>Print F-CAL-03</button><button class="danger w" data-del-off>Delete</button>`:""}<button data-close>Close</button>`);}
const offRes=E=>{const I=offIssues(E);return I.length?`<div class="banner" style="margin-top:8px"><b>${I.some(i=>i.j==="crit")?"Does not comply with P3.2.3":"To complete"}:</b><ul class="small">${I.map(i=>`<li class="c-${i.j==="crit"?"bad":"warn"}">${esc(i.txt)}</li>`).join("")}</ul></div>`:`<p>${pill("ok","Complies with the offset procedure")}</p>`;};
function DRAW_OPAPPR(){const m=S.modal,next=isDate(S.op.apprDate)?(+S.op.rev||0)+1:Math.max(0,+S.op.rev||0);
  return sheet("Approve the offset procedure",`<p class="muted">Records revision ${next} of the offset procedure as approved, with the authority and the approval record as they stand now. A periodic review without changes is also recorded as a new revision.</p>
  <div class="fields"><label class="f req"><span>Document number</span><input id="pa-no" value="${esc(S.op.no)}"></label><label class="f req"><span>Prepared by</span><input id="pa-prep" value="${esc(m.prep)}"></label><label class="f req"><span>Approved by</span><input id="pa-by" value="${esc(m.by)}"></label><label class="f req"><span>Date</span><input type="date" id="pa-date" value="${esc(m.date)}"></label>
  ${next>0?`<label class="f wide req"><span>Change / review note</span><input id="pa-chg" value="${esc(m.chg)}"></label>`:""}</div>`,`<button class="pri w" data-save-opappr>Approve</button><button data-close>Cancel</button>`);}
function DRAW_PRINT(){return sheet(esc(S.modal.title),`<div id="jobcard">${S.modal.html()}</div>`,`<button class="pri" data-print>Print</button><button data-close>Close</button>`);}
const pHead=t=>`<p class="small muted">${esc(C().plant)} · ${esc(t)} · printed ${fmtD(today())}</p>`;
const kv=R=>`<div class="tw"><table><tbody>${R.map(([a,b])=>`<tr><td style="width:240px"><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>`;
function calHtml(r){const e=eqById(r.eq)||fillEq({}),k=evalCal(r);
  return `${pHead("Calibration report (MWSPL-F-CAL-02, CQI-9 HTSA 3.2, P3.2.5.2)")}<h2>${esc(r.id)} · ${esc(e.tag)} ${esc(e.name)}${reviewed(r)?"":" · NOT REVIEWED"}</h2>
  ${kv([["Equipment",`${e.tag} · ${kd(e.kind)[0]} · ${e.make} ${e.model} · serial ${e.serial}`],["Location",`${e.furnace||e.loc||"—"} ${e.chamber||""} ${e.loop||""}`],["Type",TYPES[r.type]],["Date · next due",`${fmtD(r.date)} · ${fmtD(dueOf(r))}`],
    ["Calibrated by",r.ext==="ext"?`${r.lab} (${r.accred}) · ${r.by}`:r.by],["Report no. · method",`${r.certNo} · ${r.method}`],["Reference standard",r.type==="cert"?"—":`${r.std.id} · certificate ${r.std.cert} · due ${fmtD(r.std.due)} · ${r.std.trace}`],
    ["Accuracy requirement",accTxt(e)],...(e.kind==="ir"?[["Emissivity setting",r.emis]]:[]),["Adjustment",{none:"None",adjusted:"Adjusted",offset:"Offset applied"}[r.adj]],["Offset in use",r.offChk?OFFCHK[r.offChk]:"—"],["Result",RES[k.res||"none"][1]],["Findings",k.issues.map(i=>i.txt).join(" ")||"—"],["Notes",r.notes]])}
  ${k.pts.length?`<h3>Points</h3><div class="tw"><table><thead><tr><th>Nominal</th><th>As found</th><th>Error</th><th>As left</th><th>Error</th><th>Limit</th></tr></thead><tbody>${k.pts.map(p=>`<tr><td>${r2(p.nom)}</td><td>${r2(p.found)}</td><td>${sgn(p.ef)}</td><td>${r2(p.left)}</td><td>${sgn(p.el)}</td><td>${p.lim==null?"—":"± "+r2(p.lim)}</td></tr>`).join("")}</tbody></table></div>`:""}
  ${["oof","fail"].includes(k.res)?kv([["Product at risk",riskTxt(r)],["Product impact",r.act.impact],["Containment / disposition",r.act.contain],["Corrective action",r.act.action],["Owner · date",`${r.act.by} · ${fmtD(r.act.date)}`]]):""}
  ${kv([["Label checked",Object.keys(LBL).filter(x=>r.lbl[x]).map(x=>LBL[x]).join(", ")+(r.lbl.lim?" · limitation: "+r.lbl.lim:"")+" · by "+(r.lbl.chkBy||"—")],["Reviewed and accepted",reviewed(r)?`${r.rev.by} · ${fmtD(r.rev.date)}${r.rev.remarks?" · "+r.rev.remarks:""}`:"—"]])}
  <p class="small" style="margin-top:14px">Signatures: calibrated ____________________ &nbsp; accepted ____________________</p>`;}
function lblHtml(r){const e=eqById(r.eq)||fillEq({});
  return `<div style="border:2px solid var(--ink);border-radius:8px;padding:12px 16px;max-width:340px;font-size:14px"><div style="font-weight:700;letter-spacing:.06em">CALIBRATED · ${esc(C().plant.split("·")[0])}</div>
  <div>Equipment: <b>${esc(e.tag)}</b>${e.serial?" · s/n "+esc(e.serial):""}</div><div>${esc(TYPES[r.type])} date: <b>${fmtD(r.date)}</b></div><div>Next due: <b>${fmtD(dueOf(r))}</b></div>
  <div>By: <b>${esc(r.ext==="ext"?r.lab:r.by)}</b> · report ${esc(r.certNo)}</div>${r.lbl.lim?`<div>Limitation: <b>${esc(r.lbl.lim)}</b></div>`:""}${activeOffs(r.eq,r.date).length?`<div>Offset in use: ${activeOffs(r.eq,r.date).map(o=>sgn(num(o.value))+" °C ("+o.id+")").join(", ")}</div>`:""}</div><p class="small muted">MWSPL-F-CAL-04 · elements per P3.2.5.1, to confirm.</p>`;}
function offHtml(o){const e=eqById(o.eq)||fillEq({}),I=offIssues(o);
  return `${pHead("Offset approval record (MWSPL-F-CAL-03, P3.2.3)")}<h2>${esc(o.id)} · ${esc(e.tag)} ${esc(e.name)}</h2>${kv([["Offset",sgn(num(o.value))+" °C"],["Entered on · by",`${fmtD(o.date)} · ${o.enteredBy}`],["Basis",`${OFFB[o.basis]||""} · ${o.ref}`],["Reason",o.why],["Approved by · on",`${o.apprBy} · ${fmtD(o.apprDate)}`],["Documented in",o.where],["Read back by · on",`${o.verBy} · ${fmtD(o.verDate)}`],["Removed",isDate(o.removed)?fmtD(o.removed)+" · "+o.removedWhy:"—"],["Procedure",`${S.op.no} rev ${S.op.rev}`],["Compliance",I.length?I.map(i=>i.txt).join(" "):"Complies"]])}
  <p class="small" style="margin-top:14px">Signatures: approved ____________________ &nbsp; entered ____________________ &nbsp; verified ____________________</p>`;}
function regHtml(){return `${pHead("Equipment register and calibration schedule (MWSPL-F-CAL-01)")}<div class="tw"><table><thead><tr><th>Tag</th><th>Equipment</th><th>Location</th><th>Type</th><th>Interval</th><th>Accuracy</th><th>Process Table</th><th>Last</th><th>Due</th><th>Status</th></tr></thead><tbody>${S.eqs.filter(judged).map(e=>{const s=eqState(e);return `<tr><td>${esc(e.tag)}</td><td>${esc(e.name)}</td><td>${esc(e.furnace||e.loc)} ${esc(e.chamber)}</td><td>${esc(TYPES[e.type])}</td><td>${esc(ivTxt(intOf(e)))}</td><td>${esc(accTxt(e))}</td><td>${esc(e.ptRef)}</td><td>${s.last?fmtD(s.last.date)+" "+s.last.id:"—"}</td><td>${fmtD(s.due)}</td><td>${esc(EST[s.st][1])}</td></tr>`;}).join("")}${tcEquip().map(q=>`<tr><td>${esc(q.ident)}</td><td>${q.kind==="testtc"?"Test thermocouple":"Test instrument"} (Thermocouples)</td><td>—</td><td>Calibration</td><td>—</td><td>—</td><td>—</td><td>${fmtD(q.calDate)}</td><td>${fmtD(q.calDue)}</td><td>${esc(EST[tcState(q)][1])}</td></tr>`).join("")}</tbody></table></div>`;}
function h32Html(){const A=assess32(),sc=SCORE[A.score];
  return `${pHead("CQI-9 HTSA 3.2 evidence")}<p><span class="verdict ${sc[2]}">${sc[1]}</span></p>
  <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${esc(LV[i.lvl][1])}</td></tr>`).join("")}</tbody></table></div>
  <h3>Offset procedure</h3>${kv([["Document",`${S.op.no} rev ${S.op.rev} · approved ${fmtD(S.op.apprDate)} by ${S.op.appr||"—"}`],["Authorized to approve offsets",authLines().join("; ")||"—"],["How the approval is documented",S.op.how||"—"],["Largest offset allowed",`± ${C().offMax} °C`]])}
  <h3>Offsets in use</h3><div class="tw"><table><thead><tr><th>Offset</th><th>Equipment</th><th>Value</th><th>Approved</th><th>Compliance</th></tr></thead><tbody>${S.offs.filter(o=>offActive(o)).map(o=>`<tr><td>${esc(o.id)}</td><td>${esc((eqById(o.eq)||{}).tag||"")}</td><td>${sgn(num(o.value))} °C</td><td>${esc(o.apprBy)} ${fmtD(o.apprDate)}</td><td>${esc(offIssues(o).map(i=>i.txt).join(" ")||"Complies")}</td></tr>`).join("")||`<tr><td colspan="5">None.</td></tr>`}</tbody></table></div>
  <h3>Register and schedule (F-CAL-01)</h3>${regHtml().replace(/^<p[^>]*>.*?<\/p>/,"")}`;}
const DRAW={eq:DRAW_EQ,cal:DRAW_CAL,off:DRAW_OFF,opappr:DRAW_OPAPPR,print:DRAW_PRINT};

/* 10. actions */
function calModal(id,eqId){const r=calById(id);let E;
  if(r)E=clone(r);else{const e=eqById(eqId);E=fillCal({eq:e?e.id:"",type:e?e.type:"cal",date:today(),due:e?ivAdd(today(),intOf(e)):"",pts:e&&e.type!=="cert"?defPts(e).map(n=>({nom:String(n),found:"",left:""})):[],emis:e?e.emis:""});}
  openModal({kind:"cal",ed:E,msg:""});}
function defPts(e){const lo=num(e.lo),hi=num(e.hi);if(lo==null||hi==null)return [""];if(lo===hi)return [lo];return [lo,Math.round((lo+hi)/2),hi];}
async function saveCal(text){const E=fillCal(S.modal.ed),known=calById(E.id),e=eqById(E.eq);
  if(!e||!isDate(E.date)){msg("Choose the equipment and the date.");return false;}if(E.date>today()){msg("The date is in the future.");return false;}
  if(isDate(E.due)&&E.due<=E.date){msg("The next due date must be after the date.");return false;}
  if(isDate(E.due)&&E.due>ivAdd(E.date,intOf(e))){msg(`The next due date is beyond the interval of ${ivTxt(intOf(e))}.`);return false;}
  if(!known)E.id="CR-"+String(maxNo(S.cals)+1).padStart(4,"0");
  if(await put("cals",E,text||(known?"Saved":"Recorded"))){S.modal.ed=clone(E);return true;}return false;}
async function saveOff(){const E=fillOff(S.modal.ed),known=offById(E.id);
  if(!E.eq||!isDate(E.date)||num(E.value)==null){msg("Enter the equipment, the date and the offset.");return false;}if(E.date>today()){msg("The date is in the future.");return false;}
  if(isDate(E.removed)&&E.removed<E.date){msg("Removed before it was entered.");return false;}
  if(!known)E.id="OF-"+String(maxNo(S.offs)+1).padStart(4,"0");
  if(await put("offsets",E,known?"Saved":"Recorded")){S.modal.ed=clone(E);return true;}return false;}
/* the equipment of this plant (CLAUDE.md / MWSPL.md): per furnace 3 zone controllers, the SCADA recording channels and an over-temperature
   controller per chamber, push and cooling timers, quench temperature and dip timer on F-01 / F-02; laboratory test equipment */
function plantEquip(){const ex=S.exTag||"",L=[];const PT={ctrl:"Process Table A / E 2.0 — control instrumentation 〈confirm item〉",rec:"Process Table A / E 2.0 — recording instrumentation 〈confirm item〉",otp:"Process Table A / E 2.0 — over-temperature instrumentation 〈confirm item〉",timer:"Process Table A / E 1.0 — process timers 〈confirm item〉",qtemp:"Process Table A 1.0 / 3.0 — quench temperature 〈confirm item〉",fti:"Process Table A / E 2.0 — field test instrumentation 〈confirm item〉",ir:"Process Table A / E 2.0 — non-contact thermometry 〈confirm item〉",hard:"Process Table A 1.0 / 4.0 — hardness testing 〈confirm item〉",block:"Process Table A 1.0 — test blocks 〈confirm item〉",micro:"Process Table A 1.0 / 4.0 — metallography 〈confirm item〉",flow:"Process Table A / E 1.0 — combustion 〈confirm item〉"};
  furnaces().forEach(f=>{CHAMBERS.forEach(ch=>{const c=ch[0],lo=ch==="Hardening"?"700":"500",hi=ch==="Hardening"?"960":"900";
      [1,2,3].forEach(z=>L.push({tag:`${f}-${c}-TIC-${z}`,name:`${ch} zone ${z} temperature controller`+ex,kind:"ctrl",furnace:f,chamber:ch,loop:`Zone ${z} (TC-0${2*z-1} right / TC-0${2*z} left)`,lo,hi,ptRef:PT.ctrl}));
      L.push({tag:`${f}-${c}-SCADA`,name:`${ch} chamber SCADA recording channels`+ex,kind:"rec",furnace:f,chamber:ch,loop:"PV-1 … PV-6 (TC-01 … TC-06)",lo,hi,ptRef:PT.rec});
      L.push({tag:`${f}-${c}-OTC`,name:`${ch} chamber over-temperature controller`+ex,kind:"otp",furnace:f,chamber:ch,loop:"Excess-temperature cut-off",lo,hi,ptRef:PT.otp});});
    L.push({tag:`${f}-PUSH-T`,name:"Push cycle timer"+ex,kind:"timer",furnace:f,lo:"300",hi:"900",unit:"s",ptRef:PT.timer});
    L.push({tag:`${f}-CC-T`,name:"Controlled cooling chamber air-blow timer"+ex,kind:"timer",furnace:f,lo:"60",hi:"600",unit:"s",ptRef:PT.timer});
    L.push({tag:`${f}-GAS-PG`,name:"Combustion gas pressure gauge"+ex,kind:"flow",furnace:f,lo:"0",hi:"100",unit:"mbar",accAbs:"2",ptRef:PT.flow});
    if(f==="F-01"||f==="F-02"){L.push({tag:`${f}-Q-TI`,name:`Quench tank temperature indicator (${f==="F-01"?"water":"oil"})`+ex,kind:"qtemp",furnace:f,lo:f==="F-01"?"20":"40",hi:f==="F-01"?"50":"90",ptRef:PT.qtemp});
      L.push({tag:`${f}-DIP-T`,name:"Quench dip timer"+ex,kind:"timer",furnace:f,lo:"300",hi:"600",unit:"s",ptRef:PT.timer});}});
  [{tag:"FTI-01",name:"Data logger DL-04 (TUS field test instrument)"+ex,kind:"fti",loc:"Metrology",lo:"0",hi:"1100",ptRef:PT.fti},
   {tag:"IR-01",name:"Hand-held infrared pyrometer"+ex,kind:"ir",loc:"Production",lo:"500",hi:"1000",emis:"0.85",ptRef:PT.ir},
   {tag:"HT-R1",name:"Rockwell hardness tester"+ex,kind:"hard",loc:"Laboratory",lo:"20",hi:"65",ptRef:PT.hard},
   {tag:"HT-B1",name:"Brinell hardness tester"+ex,kind:"hard",loc:"Laboratory",lo:"150",hi:"350",unit:"HBW",ptRef:PT.hard},
   {tag:"TB-HRC-45",name:"Rockwell test block 45 HRC"+ex,kind:"block",loc:"Laboratory",ptRef:PT.block},
   {tag:"MIC-01",name:"Metallurgical microscope with stage micrometer"+ex,kind:"micro",loc:"Laboratory",lo:"10",hi:"1000",ptRef:PT.micro}].forEach(x=>L.push(x));
  return L.map(x=>fillEq({...x,serial:x.serial||"MW-"+x.tag.replace(/[^0-9A-Z]/g,""),interval:kInt(x.kind)}));}
async function addDefaults(){if(!needDb())return;let n=maxNo(S.eqs);const L=plantEquip().filter(x=>!S.eqs.some(e=>e.tag===x.tag)).map(x=>({...x,id:"CE-"+String(++n).padStart(4,"0"),log:[{d:today(),t:"Added with the equipment of this plant"}]}));
  if(!L.length){toast("Every item is already registered.");return;}await batchPut("equip",L);toast(plural(L.length,"item")+" added");}
async function stdOps(){if(!needDb())return;if(S.eqs.length||S.cals.length||S.offs.length){toast("Only on an empty module.");return;}
  const td=today(),D=n=>addDays(td,n),ex=" (example)";let seed=11;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const HM="R. Sharma"+ex,QM="S. Gupta"+ex;
  await dbSet("config","settings",{...S.cfg,approvers:HM+"\n"+QM});
  S.op={...DEFOP,rev:1,prep:"K. Yadav"+ex,appr:HM,apprDate:D(-200),change:"Authority extended to the Quality Manager.",auth:`${HM} — HT Manager\n${QM} — Quality Manager`,how:"Offset approval record MWSPL-F-CAL-03 signed by the authorized person before the offset is entered; the offset is written in the controller parameter log book and the SCADA offset register with the F-CAL-03 number.",
    log:[{d:D(-400),t:"Rev 0 approved by "+HM},{d:D(-200),t:"Rev 1 approved by "+HM+": authority extended to the Quality Manager."}]};await saveOp();
  S.exTag=ex;let n=0;const EQ=plantEquip().map(x=>({...x,id:"CE-"+String(++n).padStart(4,"0"),make:x.kind==="ctrl"||x.kind==="otp"?"Yokogawa":x.kind==="rec"?"Siemens":"",log:[{d:D(-420),t:"Registered"+ex}]}));S.exTag="";
  const C2=[];let cn=0;
  const mkCal=(e,d,o)=>{const lo=num(e.lo),hi=num(e.hi),pts=e.type==="cert"?[]:defPts(e).map(nm=>{const L=limAt(e,nm)||1,ef=Math.round((rnd()-.5)*L*1.1*100)/100;return {nom:String(nm),found:String(Math.round((nm+ef)*100)/100),left:""};});
    const ext=["fti","ir","hard","block","micro"].includes(e.kind);
    return fillCal({id:"CR-"+String(++cn).padStart(4,"0"),eq:e.id,type:e.type,date:D(-d),due:ivAdd(D(-d),intOf(e)),by:ext?"Lab engineer"+ex:"K. Yadav"+ex,ext:ext?"ext":"int",lab:ext?"Accredited calibration laboratory"+ex:"",accred:ext?"NABL CC-2291"+ex:"",
      certNo:(ext?"EXT/":"INT/")+cn,method:e.kind==="ir"?"Blackbody comparison WI-CAL-01 §5"+ex:e.kind==="block"?"Supplier certificate"+ex:"WI-CAL-01 §4: simulated input at three points"+ex,
      std:e.type==="cert"?{id:"",cert:"",due:"",trace:""}:{id:"Calibrator CAL-STD-02"+ex,cert:"CAL/STD/0912",due:D(150),trace:"NPL India, unbroken chain (example)"},env:"25 °C",pts,emis:e.kind==="ir"?"0.85":"",adj:"none",
      lbl:{id:true,date:true,due:true,by:true,lim:"",chkBy:"K. Yadav"+ex},rev:{by:QM,date:D(-d+2),remarks:""},log:[{d:D(-d),t:"Recorded"+ex}],...(o||{})});};
  EQ.forEach(e=>{const iv=Math.round(ivDays(intOf(e)));
    if(e.furnace==="F-04"&&e.chamber==="Hardening"&&e.kind==="ctrl"){C2.push(mkCal(e,iv+iv+10),mkCal(e,iv+10));return;}
    C2.push(mkCal(e,Math.round(iv*1.3)));C2.push(mkCal(e,Math.max(5,Math.round(iv*.3+rnd()*iv*.3))));});
  /* F-02 hardening zone 3 controller found out of tolerance last week, adjusted, reaction open */
  const z3=EQ.find(e=>e.tag==="F-02-H-TIC-3");const r3=mkCal(z3,8,{adj:"adjusted",pts:[{nom:"700",found:"700.6",left:"700.2"},{nom:"830",found:"832.4",left:"830.3"},{nom:"960",found:"963.4",left:"960.3"}],rev:{by:"",date:"",remarks:""},
    notes:"Reading high at the upper end; cold-junction module replaced."+ex,act:{impact:"",contain:"Batches of F-02 hardening since the last calibration listed for review."+ex,action:"",by:"",date:""}});
  const i3=C2.findIndex(r=>r.eq===z3.id&&dayDiff(r.date,td)<60);if(i3>=0)C2.splice(i3,1);C2.push(r3);
  /* F-01 SCADA hardening: label without the due date; F-03 OTC tempering: report not reviewed */
  const rs=EQ.find(e=>e.tag==="F-01-H-SCADA"),ri=C2.filter(r=>r.eq===rs.id).sort(byDate).at(-1);ri.lbl.due=false;ri.notes="Old label left on the panel; new label without the due date."+ex;
  const ot=EQ.find(e=>e.tag==="F-03-T-OTC"),oi=C2.filter(r=>r.eq===ot.id).sort(byDate).at(-1);oi.rev={by:"",date:"",remarks:""};oi.date=D(-3);oi.due=ivAdd(D(-3),intOf(ot));
  /* offsets: F-03 tempering zone 2 approved and re-evaluated; F-04 hardening zone 2 entered without approval and beyond the limit */
  const f3=EQ.find(e=>e.tag==="F-03-T-TIC-2"),f4=EQ.find(e=>e.tag==="F-04-H-TIC-2");
  const OF=[fillOff({id:"OF-0001",eq:f3.id,date:D(-50),value:"2",basis:"sat",ref:"SAT-0031 (Thermocouples)",why:"SAT difference +2.1 °C on TC-03 within tolerance; offset to centre the control reading until the element is replaced."+ex,enteredBy:"K. Yadav"+ex,apprBy:HM,apprDate:D(-51),where:"Controller parameter log book p. 14; SCADA offset register line 7"+ex,verBy:QM,verDate:D(-50),log:[{d:D(-50),t:"Recorded"+ex}]}),
    fillOff({id:"OF-0002",eq:f4.id,date:D(-12),value:"-4.5",basis:"other",ref:"Operator note"+ex,why:"Zone 2 read high against the hand-held pyrometer."+ex,enteredBy:"Shift operator"+ex,where:"",log:[{d:D(-12),t:"Recorded during the HTSA review"+ex}]})];
  const r2c=C2.filter(r=>r.eq===f3.id).sort(byDate).at(-1);if(r2c&&r2c.date>OF[0].date)r2c.offChk="confirmed";
  await batchPut("equip",EQ);await batchPut("cals",C2);await batchPut("offsets",OF);toast("Starter set-up loaded");render();}
/* import from CALOR: hardness testers (hmt-reg: calDue) and the controller / recorder calibration dates of the Equipment page (eqq-reg) */
async function calorImport(){if(!needDb())return;const H=MWS.calor.get("hmt-reg"),Q=MWS.calor.get("eqq-reg");let n=maxNo(S.eqs),c=maxNo(S.cals);const EQ=[],CR=[];
  const addEq=x=>{const have=S.eqs.find(e=>e.tag===x.tag)||EQ.find(e=>e.tag===x.tag);if(have)return have;const e=fillEq({...x,id:"CE-"+String(++n).padStart(4,"0"),interval:kInt(x.kind),log:[{d:today(),t:"Imported from CALOR"}]});EQ.push(e);return e;};
  const addCal=(e,date,note)=>{if(!isDate(date)||S.cals.some(r=>r.eq===e.id&&r.date===date))return;CR.push(fillCal({id:"CR-"+String(++c).padStart(4,"0"),eq:e.id,type:e.type,date,due:ivAdd(date,intOf(e)),notes:note,log:[{d:today(),t:"Imported from CALOR"}]}));};
  if(H&&Array.isArray(H.equip))H.equip.forEach(q=>{const kind=/microscope/i.test(q.kind||"")?"micro":/rockwell|brinell|vickers/i.test(q.kind||"")?"hard":"other";
    const e=addEq({tag:q.id,name:q.name||q.kind,kind,serial:q.serial||"",loc:"Laboratory",accAbs:q.tol!=null?String(q.tol):"",status:q.active===false?"out":"inuse"});
    if(isDate(q.calDue))addCal(e,ivAdd(q.calDue,intOf(e),-1),`Calibration date derived from CALOR's calibration due ${fmtD(q.calDue)}; complete the record.`);});
  if(Q&&Array.isArray(Q.recs))Q.recs.forEach(r=>{const c0=r.chamber[0];
    if(isDate(r.ctrlCal))addCal(addEq({tag:`${r.furnace}-${c0}-CTRL`,name:`${r.chamber} chamber controllers (CALOR equipment record)`,kind:"ctrl",furnace:r.furnace,chamber:r.chamber}),r.ctrlCal,"From CALOR's equipment qualification record; complete the record.");
    if(isDate(r.recCal))addCal(addEq({tag:`${r.furnace}-${c0}-REC`,name:`${r.chamber} chamber recorder (CALOR equipment record)`,kind:"rec",furnace:r.furnace,chamber:r.chamber}),r.recCal,"From CALOR's equipment qualification record; complete the record.");});
  if(!EQ.length&&!CR.length){toast("Nothing new to import.");return;}await batchPut("equip",EQ);await batchPut("cals",CR);toast(`Imported ${plural(EQ.length,"item")} and ${plural(CR.length,"record")}`);}
function armedDelete(b,fn){if(b.classList.contains("armed")){fn();return;}b.classList.add("armed");const t=b.textContent;b.textContent="Confirm";setTimeout(()=>{if(b.isConnected){b.classList.remove("armed");b.textContent=t;}},4000);}
async function download(name,text,type){
  if(S.dl){try{await S.dl.save({filename:name,data:new Blob([text],{type})});return;}catch(e){if(e&&e.code==="declined")return;}}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
const exportJson=()=>download(`mws-cal-${today()}.json`,JSON.stringify({app:"mws-cal-manager",v:1,saved:new Date().toISOString(),equip:S.eqs,cals:S.cals,offsets:S.offs,config:S.cfg,offproc:S.op},null,1),"application/json");
const csvQ=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
const csv=()=>download(`mws-cal-schedule-${today()}.csv`,"﻿"+[["Tag","Equipment","Kind","Furnace","Chamber","Type","Interval (d)","Accuracy","Process Table","Last record","Last date","Due","Status","Offset in use"],
  ...S.eqs.map(e=>{const s=eqState(e),o=activeOffs(e.id);return [e.tag,e.name,kd(e.kind)[0],e.furnace,e.chamber,TYPES[e.type],ivTxt(intOf(e)),accTxt(e),e.ptRef,s.last?s.last.id:"",s.last?s.last.date:"",s.due||"",EST[s.st][1],o.map(x=>x.value).join(" ")];})].map(r=>r.map(csvQ).join(",")).join("\r\n"),"text/csv");
function readImport(f){f.text().then(t=>{let o;try{o=JSON.parse(t);}catch(e){toast("Not a JSON file");return;}
  if(!o||o.app!=="mws-cal-manager"||!Array.isArray(o.equip)){toast("Not an export of this module");return;}
  const ok=L=>arr(L).filter(x=>x&&ID_RE.test(String(x.id||"")));
  S.imp={equip:ok(o.equip).map(fillEq),cals:ok(o.cals).map(fillCal),offsets:ok(o.offsets).map(fillOff),config:o.config||null,offproc:o.offproc||null,msg:`${f.name}: ${plural(ok(o.equip).length,"item")}, ${plural(ok(o.cals).length,"record")}, ${plural(ok(o.offsets).length,"offset")}.`};render();});}
async function doImport(mode){if(!S.imp||!needDb())return;const I=S.imp;S.imp=null;
  if(mode==="replace"){for(const x of S.eqs)if(!I.equip.some(y=>y.id===x.id))await dbDel("equip",x.id);for(const x of S.cals)if(!I.cals.some(y=>y.id===x.id))await dbDel("cals",x.id);for(const x of S.offs)if(!I.offsets.some(y=>y.id===x.id))await dbDel("offsets",x.id);}
  await batchPut("equip",I.equip);await batchPut("cals",I.cals);await batchPut("offsets",I.offsets);
  if(I.config){const c={...DEF,...I.config};delete c.id;await dbSet("config","settings",c);}if(I.offproc){const p={...DEFOP,...I.offproc};delete p.id;await dbSet("config","offproc",p);}toast("Imported ("+mode+")");render();}
async function clearAll(){if(($("#clrtxt")||{}).value!=="CLEAR ALL"){toast("Type CLEAR ALL to clear");return;}if(!needDb())return;
  for(const x of S.eqs)await dbDel("equip",x.id);for(const x of S.cals)await dbDel("cals",x.id);for(const x of S.offs)await dbDel("offsets",x.id);await dbDel("config","settings");await dbDel("config","offproc");toast("All calibration data cleared");}

/* 11. wiring */
onDoc("click",async e=>{
  const b=e.target.closest("button,tr.click,a[data-docref]");if(!b)return;const d=b.dataset;
  if(b.closest("#modal")||d.close!==undefined){
    if(d.close!==undefined){closeModal();return;}
    const m=S.modal;
    if(d.saveEq!==undefined){const E=fillEq(m.ed);if(!txt(E.tag)||!txt(E.name)){msg("Enter the tag and the name.");return;}if(S.eqs.some(x=>x.id!==E.id&&x.tag.toLowerCase()===E.tag.toLowerCase())){msg("Another item has this tag.");return;}
      {const el=document.querySelector("#modal [data-iv=eq]");E.interval=el?ivRead(el):E.interval;}if(!ivOf(E.interval)){msg("Enter the interval (days or months).");return;}
      const known=eqById(E.id);if(!known)E.id="CE-"+String(maxNo(S.eqs)+1).padStart(4,"0");if(await put("equip",E,known?"Saved":"Added")){toast("Saved");closeModal();}return;}
    if(d.delEq!==undefined){armedDelete(b,async()=>{await dbDel("equip",m.ed.id);toast("Deleted");closeModal();});return;}
    if(d.newCal!==undefined){calModal(null,d.newCal);return;}
    if(d.saveCal!==undefined){if(await saveCal()){redraw();msg("Saved.",1);}return;}
    if(d.revCal!==undefined){const E=fillCal(m.ed),miss=repMissing(E);if(!txt(E.rev.by)||!isDate(E.rev.date))miss.push("reviewed by and date");else{if(!isApprover(E.rev.by))miss.push(`accepted by a person allowed (${approvers().map(a=>a.name).join(", ")})`);if(isDate(E.date)&&E.rev.date<E.date)miss.push("review not before the calibration");if(E.rev.date>today())miss.push("review not in the future");}
      if(miss.length){msg("To accept: "+miss.join(", ")+".");return;}if(await saveCal(`Report accepted by ${E.rev.by}`)){redraw();msg("Report accepted.",1);}return;}
    if(d.unrev!==undefined){armedDelete(b,async()=>{const by=m.ed.rev.by;m.ed.rev={by:"",date:"",remarks:m.ed.rev.remarks};if(await saveCal("Report reopened (was accepted by "+by+")")){redraw();msg("Report reopened.",1);}});return;}
    if(d.closeAct!==undefined){const miss=missingAct(fillCal(m.ed));if(miss.length){msg("To close: "+miss.join(", ")+".");return;}m.ed.closed=true;if(await saveCal("Reaction closed")){redraw();msg("Reaction closed.",1);}return;}
    if(d.ptadd!==undefined){m.ed.pts.push({nom:"",found:"",left:""});redraw();return;}
    if(d.ptdel!==undefined){m.ed.pts.splice(+d.ptdel,1);redraw();return;}
    if(d.calPrint!==undefined){const r=fillCal(m.ed);openModal({kind:"print",title:"Calibration report · "+r.id,html:()=>calHtml(r)});return;}
    if(d.lblPrint!==undefined){const r=fillCal(m.ed);openModal({kind:"print",title:"Calibration label · "+r.id,html:()=>lblHtml(r)});return;}
    if(d.delCal!==undefined){armedDelete(b,async()=>{await dbDel("cals",m.ed.id);toast("Deleted");closeModal();});return;}
    if(d.saveOff!==undefined){if(await saveOff()){redraw();msg("Saved.",1);}return;}
    if(d.delOff!==undefined){armedDelete(b,async()=>{await dbDel("offsets",m.ed.id);toast("Deleted");closeModal();});return;}
    if(d.offPrint!==undefined){const o=fillOff(m.ed);openModal({kind:"print",title:"Offset approval record · "+o.id,html:()=>offHtml(o)});return;}
    if(d.saveOpappr!==undefined){const no=txt($("#pa-no").value),prep=txt($("#pa-prep").value),by=txt($("#pa-by").value),dt=$("#pa-date").value,chg=$("#pa-chg")?txt($("#pa-chg").value):"";
      if(!no||!prep||!by||!isDate(dt)){msg("Enter the number, prepared by, approved by and the date.");return;}if(dt>today()){msg("Not in the future.");return;}if($("#pa-chg")&&!chg){msg("Enter the change or review note.");return;}
      if(!authLines().length||!txt(S.op.how)){msg("State who may approve offsets and how the approval is documented first (and save).");return;}
      const rev=isDate(S.op.apprDate)?(+S.op.rev||0)+1:Math.max(0,+S.op.rev||0);S.op={...S.op,no,rev,prep,appr:by,apprDate:dt,change:chg,dirty:false};
      if(await saveOp(`Rev ${rev} approved by ${by}${chg?": "+chg:""}`)){toast("Offset procedure approved");closeModal();render();}return;}
    if(d.print!==undefined){document.body.classList.add("pm");window.print();setTimeout(()=>document.body.classList.remove("pm"),500);return;}
    return;
  }
  if(d.openEq){openModal({kind:"eq",ed:clone(eqById(d.openEq)),msg:""});return;}
  if(d.newEq!==undefined){if(needDb())openModal({kind:"eq",ed:fillEq({}),msg:""});return;}
  if(d.openCal){calModal(d.openCal);return;}
  if(d.newCal!==undefined){if(needDb())calModal(null,d.newCal);return;}
  if(d.openOff){openModal({kind:"off",ed:clone(offById(d.openOff)),msg:""});return;}
  if(d.newOff!==undefined){if(needDb())openModal({kind:"off",ed:fillOff({date:today()}),msg:""});return;}
  if(d.addDefaults!==undefined){addDefaults();return;}
  if(d.opappr!==undefined){if(needDb())openModal({kind:"opappr",prep:S.op.prep||"",by:"",date:today(),chg:"",msg:""});return;}
  if(d.saveOp!==undefined){const a=$("#op-auth").value,h=$("#op-how").value;if(a===S.op.auth&&h===S.op.how){toast("No change");return;}const was=isDate(S.op.apprDate);S.op.auth=a;S.op.how=h;if(was)S.op.dirty=true;if(await saveOp("Authority / approval record changed"+(was?" (new revision needed)":""))){toast("Saved");render();}return;}
  if(d.opOrg!==undefined){try{const L=MWS.org.authorized();if(L.length){$("#op-auth").value=L.map(a=>`${a.name} — ${a.position}`).join("\n");toast("Filled: save to keep");}}catch(x){}return;}
  if(d.eqprint!==undefined){openModal({kind:"print",title:"Equipment register and schedule",html:regHtml});return;}
  if(d.h32!==undefined){openModal({kind:"print",title:"HTSA 3.2 evidence",html:h32Html});return;}
  if(d.goproc!==undefined){location.hash="#proc";return;}
  if(d.gotc!==undefined){window.location.hash="#tc/eq";return;}
  if(d.std!==undefined){stdOps();return;}
  if(d.calor!==undefined){calorImport();return;}
  if(d.saveCfg!==undefined){document.querySelectorAll("[data-cfg]").forEach(i=>{const k=i.dataset.cfg,t=(SETF.find(x=>x[0]===k)||[])[2];S.cfg[k]=t==="number"?(num(i.value)>=0&&i.value!==""?num(i.value):DEF[k]):i.value;});
    const ki={};document.querySelectorAll("[data-iv^='kint:']").forEach(el=>{const k=el.dataset.iv.slice(5),v=ivRead(el);if(v&&v!==KINDS[k][2])ki[k]=v;});S.cfg.kint=ki;saveCfg();return;}
  if(d.doc){S.docSel=d.doc;render();return;}
  if(d.docref){e.preventDefault();const p=DOCS.find(x=>x[0].endsWith(d.docref.replace(/^(\.\.\/)+/,"").replace(/^\.\//,"")));if(p){S.docSel=p[0];location.hash="#docs";render();}return;}
  if(d.export!==undefined){exportJson();return;}if(d.csv!==undefined){csv();return;}
  if(d.imp){if(d.imp==="cancel"){S.imp=null;render();}else doImport(d.imp);return;}
  if(d.clear!==undefined){armedDelete(b,clearAll);return;}
});
const live=()=>{if(!S.modal||!S.modal.ed)return;if(S.modal.kind==="cal"){const el=$("#calres");if(el)el.innerHTML=resHtml(fillCal(S.modal.ed));}
  if(S.modal.kind==="off"){const el=$("#offres");if(el)el.innerHTML=offRes(fillOff(S.modal.ed));}};
onDoc("input",e=>{const el=e.target;if(!(S.modal&&S.modal.ed))return;const E=S.modal.ed;
  const ivb=el.closest&&el.closest("#modal [data-iv=eq]");if(ivb){E.interval=ivRead(ivb);return;}
  if(el.dataset.pt){const [i,f]=el.dataset.pt.split(".");E.pts[+i][f]=el.value;live();return;}
  if(el.dataset.p&&el.tagName!=="SELECT"){setp(E,el.dataset.p,el.value);live();}});
onDoc("change",e=>{const el=e.target;
  if(S.modal&&S.modal.ed){const E=S.modal.ed;
    {const ivb=el.closest&&el.closest("#modal [data-iv=eq]");if(ivb){E.interval=ivRead(ivb);return;}}
    if(el.dataset.lbl){E.lbl[el.dataset.lbl]=el.checked;return;}
    if(el.dataset.p&&el.tagName==="SELECT"){setp(E,el.dataset.p,el.value);
      if(S.modal.kind==="eq"&&el.dataset.p==="kind"){E.type=kd(E.kind)[1];}
      if(S.modal.kind==="cal"&&el.dataset.p==="eq"){const q=eqById(el.value);if(q){E.type=q.type;E.emis=q.emis;if(isDate(E.date))E.due=ivAdd(E.date,intOf(q));if(!E.pts.some(p=>txt(p.found)))E.pts=q.type==="cert"?[]:defPts(q).map(n=>({nom:String(n),found:"",left:""}));}}
      redraw();return;}
    if(el.dataset.p==="date"&&S.modal.kind==="cal"){const q=eqById(E.eq);if(q&&isDate(el.value)&&!calById(E.id)){E.due=ivAdd(el.value,intOf(q));const d=$("#m-due");if(d)d.value=E.due;live();}return;}}
  if(el.dataset.filt){S.filt[el.dataset.filt]=el.value;render();return;}
  if(el.id==="impfile"&&el.files[0]){readImport(el.files[0]);el.value="";}});
onDoc("keydown",e=>{if(e.key==="Escape"&&S.modal)closeModal();});
onWin("hashchange",()=>{route();S.pending=false;render();window.scrollTo(0,0);});

/* 12. integration API */
MWS.cal={closeModal,
  refresh:()=>safeRender(),
  /* the calibrated equipment of a chamber with its state (Process validation, the SCADA review) */
  chamber:(f,ch)=>S.eqs.filter(e=>judged(e)&&e.furnace===f&&(!ch||!e.chamber||e.chamber===ch)).map(e=>{const s=eqState(e);return {tag:e.tag,name:e.name,kind:e.kind,st:s.st,label:EST[s.st][1],due:s.due||"",offsets:activeOffs(e.id).map(o=>num(o.value))};}),
  hasData:()=>S.eqs.length+S.cals.length>0,
  stats:()=>{const k=kp();return {db:S.dbState,...k,label:SCORE[k.score][1],cls:SCORE[k.score][0]};},
  summary:()=>{const k=kp();return `${k.ok} of ${plural(k.items,"item")} of equipment current, ${plural(k.open,"out-of-tolerance finding")} open, ${plural(k.offs,"offset")} in use (${k.offBad} not compliant), offset procedure ${k.opOk?"rev "+k.opRev:"not approved"}; HTSA 3.2 ${SCORE[k.score][1].toLowerCase()}.`;}};
window.__CALM={S,evalCal,eqState,repMissing,lblMissing,offIssues,offMissing,missingAct,assess32,kp,plantEquip,tcEquip,authNames};

/* 13. boot */
async function boot(){
  route();render();
  const [dl,user,db]=await Promise.all([useCap("downloads"),useCap("user"),useCap("db")]);
  S.dl=dl;
  if(user){try{const c=await user.can("data.write");S.canWrite=c!==false;}catch(e){}}
  if(db)startStore(sharedDb(db),"on");else startStore(localDb(),"local");
}
boot();
