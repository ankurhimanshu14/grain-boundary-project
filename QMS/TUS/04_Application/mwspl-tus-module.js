/* Module TUS: temperature uniformity surveys per the Process Tables (CQI-9 HTSA 3.4). Runs inside the shell: ACTIVE, onDoc, onWin, MWS and
   `location` come from the wrapper (build.py). The survey rules are copied from CALOR's Temperature_Uniformity_Survey.html; HTSA 3.4 adds
   the upper tolerance at any time, the soak time of the internal specification, alternate methods, uniformity-affecting changes and the report.
   Reads the equipment changes of Process validation (MWS.valid, HTSA 1.7) and the authorized people (MWS.org, HTSA 1.1). */

/* 1. collection prefix (shared store only) */
const NS=c=>S.db&&S.db.local?c:"tus-"+c;

/* 2. constants */
const ID_RE=/^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const LKEY="mws-tus-local-v1";
const CHAMBERS=["Hardening","Tempering"];
const KINDS={periodic:"Periodic",initial:"Initial",change:"After a change (P3.4.1.2)",resurvey:"Re-survey after a failure"};
const METHODS={std:"Standard: survey thermocouples in the qualified work zone",travel:"Travelling data logger with the load through the chamber",alt:"Alternate method (P3.4.8)"};
const CKINDS={burner:"Burners / combustion setting",refr:"Refractory, roof or hearth work",tc:"Control thermocouple relocation or depth change",ctrl:"Controller / PID tuning",door:"Doors, seals, openings",load:"Baffles, load supports, tray guides",repair:"Other repair or rebuild",other:"Other"};
const DEFLOC=["Zone 1 right","Zone 1 centre","Zone 1 left","Zone 2 right","Zone 2 centre","Zone 2 left","Zone 3 right","Zone 3 centre","Zone 3 left"];
/* equipment of Process validation that belongs to a chamber (P3.4.1.2 hints) */
const EQCH={hc:["Hardening"],tc:["Tempering"],comb:CHAMBERS,ctrl:CHAMBERS};
const DEF={plant:"Mass Wire and Steels Pvt. Ltd. · Bhiwadi",furnaces:"F-01, F-02, F-03, F-04",tol:10,warnPct:80,interval:365,soon:30,endTol:15,minTc:9,step:2,soakMin:30,soakRef:"",approvers:""};
const SETF=[["plant","Plant","text"],["furnaces","Furnaces (comma separated)","text"],["tol","Default tolerance (± °C) for a range without its own","number"],
  ["warnPct","Warning band (% of the tolerance)","number"],["interval","Default survey interval (days)","number"],["soon","Due soon (days before)","number"],
  ["endTol","A survey counts for a range end within ± (°C)","number"],["minTc","Minimum survey thermocouples (P3.4, to confirm)","number"],["step","Default reading interval (min)","number"],
  ["soakMin","Soak time at temperature for the pass / fail (min) — from the internal process specification (P3.4.5.1)","number"],
  ["soakRef","Internal process specification that defines the soak time (document, revision, section)","text"],
  ["approvers","Who may approve a survey report (one name per line; with the HT organization module the heat treat person, the deputy and the authorized positions count too)","area"]];
const DOCS=[
  ["TUS/00_TUS_Master_List.md","Master list"],
  ["TUS/01_Procedure/MWSPL-QP-TUS-01_Temperature_Uniformity_Surveys.md","MWSPL-QP-TUS-01 Temperature uniformity surveys"],
  ["TUS/02_Work_Instructions/MWSPL-WI-TUS-01_Performing_a_TUS.md","MWSPL-WI-TUS-01 Performing a TUS"],
  ["TUS/02_Work_Instructions/MWSPL-WI-TUS-02_Evaluation_Report_and_Reaction.md","MWSPL-WI-TUS-02 Evaluation, report and reaction"],
  ["TUS/03_Formats/MWSPL-F-TUS-01_Qualified_Ranges_and_Schedule.md","MWSPL-F-TUS-01 Qualified ranges and schedule"],
  ["TUS/03_Formats/MWSPL-F-TUS-02_TUS_Report.md","MWSPL-F-TUS-02 TUS report"],
  ["TUS/03_Formats/MWSPL-F-TUS-03_Uniformity_Change_Record.md","MWSPL-F-TUS-03 Uniformity change record"],
  ["TUS/04_Application/mwspl-tus-module.md","Module description"]];

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
const arr=v=>Array.isArray(v)?v:[];
const r1=v=>v==null?"—":String(Math.round(v*10)/10);
const sgn=v=>v==null?"—":(v>0?"+":"")+r1(v);
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
/* reading time of reading i: start + i × step (HH:MM) */
const hm=(start,i,step)=>{const m=String(start||"").match(/^(\d{1,2}):(\d{2})/);if(!m)return "";const t=(+m[1]*60+ +m[2]+i*(+step||0))%1440;return pad(Math.floor(t/60))+":"+pad(t%60);};

/* 4. state */
const S={view:"dash",db:null,dbState:"connecting",canWrite:true,dl:null,ranges:[],surveys:[],chgs:[],cfg:{...DEF},
  docSel:DOCS[0][0],imp:null,modal:null,pending:false,unsub:[],q:{},filt:{f:"",ch:""},ch:{}};
const C=()=>S.cfg;

/* 5. domain logic */
const furnaces=()=>lines(C().furnaces).map(x=>x.toUpperCase());
function fillRange(o){const x={id:"",furnace:"",chamber:"Hardening",lo:"",hi:"",tol:"",interval:"",ref:"",cls:"",note:"",active:true,log:[],...(o||{})};if(!Array.isArray(x.log))x.log=[];return x;}
function fillSurvey(o){const d={id:"",furnace:"",chamber:"Hardening",sp:"",kind:"periodic",method:"std",alt:{ref:"",why:"",appr:"",date:""},date:"",start:"",step:"",instr:"",instrSer:"",instrCal:"",tcCert:"",tcCal:"",by:"",
  stab:"",tcs:[],rd:[],notes:"",exc:{on:false,why:""},chg:"",check:{by:"",date:"",remarks:""},act:{cause:"",action:"",impact:"",by:"",date:""},closed:false,log:[]};
  const x={...d,...(o||{})};["alt","exc","check","act"].forEach(k=>{x[k]={...d[k],...((o&&o[k])||{})};});
  x.tcs=arr(x.tcs).map(c=>({tag:"",loc:"",corr:"",...(c||{})}));x.rd=arr(x.rd).map(r=>arr(r).map(v=>v==null?"":String(v)));if(!Array.isArray(x.log))x.log=[];return x;}
function fillChg(o){const x={id:"",date:"",furnace:"",chamber:"",kind:"burner",what:"",by:"",need:"",why:"",dBy:"",dDate:"",vref:"",log:[],...(o||{})};if(!Array.isArray(x.log))x.log=[];return x;}
const svById=id=>S.surveys.find(t=>t.id===id)||null;
const rgById=id=>S.ranges.find(r=>r.id===id)||null;
const chById=id=>S.chgs.find(c=>c.id===id)||null;
const byDate=(a,b)=>((a.date||"")+(a.start||""))<((b.date||"")+(b.start||""))?-1:((a.date||"")+(a.start||""))>((b.date||"")+(b.start||""))?1:0;
const endTol=()=>+C().endTol||15;
const rangesOf=(f,ch)=>S.ranges.filter(r=>r.active!==false&&r.furnace===f&&r.chamber===ch);
const rangeFor=t=>{const sp=num(t.sp);if(sp==null)return null;return rangesOf(t.furnace,t.chamber).find(r=>sp>=num(r.lo)-endTol()&&sp<=num(r.hi)+endTol())||null;};
const stepOf=t=>num(t.step)||+C().step||2;
/* paste: one row per reading, one column per survey thermocouple; a leading time column (hh:mm) is skipped */
function parseRd(text,n){return String(text||"").split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{let c=l.split(/[\t;]+|\s{2,}|,(?=\s*-?\d)|\s+/).map(txt).filter(x=>x!=="");
  if(c.length&&/^\d{1,2}:\d{2}(:\d{2})?$/.test(c[0]))c=c.slice(1);return c.slice(0,Math.max(n,1)).map(v=>num(v)==null?"":String(num(v)));}).filter(r=>r.some(v=>v!==""));}
const rdText=t=>t.rd.map((r,i)=>(t.start?hm(t.start,i,stepOf(t))+"\t":"")+r.join("\t")).join("\n");
/* approvers: Settings names + the HT organization module's authorized people */
function approvers(){const L=lines(C().approvers).map(n=>({name:n,src:"Settings"}));
  try{if(MWS.org&&MWS.org.hasData&&MWS.org.hasData())MWS.org.authorized().forEach(a=>{if(!L.some(x=>x.name.toLowerCase()===a.name.toLowerCase()))L.push({name:a.name,src:a.position});});}catch(e){}
  return L;}
const isApprover=n=>{const L=approvers();return !L.length||L.some(a=>a.name.toLowerCase()===txt(n).toLowerCase());};

/* the result of one survey (CALOR's rules + HTSA 3.4: the upper tolerance at any time, the soak time of the internal specification) */
function calc(t){
  const sp=num(t.sp),tcs=t.tcs,rg=rangeFor(t),tol=num(rg&&rg.tol)??+C().tol,step=stepOf(t),soak=+C().soakMin||0;
  const rows=t.rd.map((r,i)=>({i,v:tcs.map((c,j)=>{const x=num(r&&r[j]);return x==null?null:x+(num(c.corr)||0);})})).filter(r=>r.v.some(x=>x!=null));
  const issues=[];
  if(sp==null||!rows.length)return {sp,tol,rg,rows,n:0,res:null,issues,per:[],step};
  /* stabilisation: entered, else the first reading with every thermocouple within ± tolerance */
  const auto=rows.find(r=>r.v.every(x=>x==null||Math.abs(x-sp)<=tol)),from=num(t.stab)!=null?Math.max(0,num(t.stab)-1):auto?auto.i:null;
  const pre=from==null?rows:rows.filter(r=>r.i<from),judged=from==null?[]:rows.filter(r=>r.i>=from);
  const per=tcs.map((c,j)=>{const xs=judged.map(r=>r.v[j]).filter(x=>x!=null),ys=rows.map(r=>r.v[j]).filter(x=>x!=null);
    return {j,tag:c.tag||`TC ${j+1}`,loc:c.loc||"",corr:num(c.corr),n:xs.length,min:xs.length?Math.min(...xs):null,max:xs.length?Math.max(...xs):null,mean:mean(xs),peak:ys.length?Math.max(...ys):null};});
  /* the upper tolerance at any time (P3.4.5.1): every reading, also before stabilisation */
  let peak=null;rows.forEach(r=>r.v.forEach((x,j)=>{if(x!=null&&(!peak||x>peak.v))peak={v:x,i:r.i,j};}));
  const overAny=peak&&peak.v-sp>tol,excOk=t.exc.on&&!!txt(t.exc.why);
  if(overAny&&!excOk)issues.push({j:"fail",txt:`Upper tolerance exceeded: ${per[peak.j].tag} ${r1(peak.v)} °C (${sgn(peak.v-sp)} °C) at reading ${peak.i+1}${hm(t.start,peak.i,step)?" ("+hm(t.start,peak.i,step)+")":""}${from!=null&&peak.i<from?", before stabilisation":""}. The upper tolerance must not be exceeded at any time.`});
  else if(overAny)issues.push({j:"info",txt:`Upper tolerance exceeded at reading ${peak.i+1} (${sgn(peak.v-sp)} °C): accepted as a multi-temperature process cycle — ${t.exc.why}.`});
  else if(t.exc.on&&!txt(t.exc.why))issues.push({j:"warn",txt:"Multi-temperature cycle exception ticked without its reason."});
  if(from==null)issues.push({j:"fail",txt:"Never stabilised: no reading with every survey thermocouple within the tolerance."});
  /* soak time of the internal specification */
  const soakCov=judged.length?(judged.at(-1).i-judged[0].i)*step:0;
  if(from!=null&&soak&&soakCov<soak)issues.push({j:"incomplete",txt:`Soak time not covered: ${soakCov} min of readings after stabilisation, the internal specification asks for ${soak} min.`});
  if(!soak)issues.push({j:"warn",txt:"No soak time set (Settings): the internal process specification must define it."});
  const all=judged.flatMap(r=>r.v.filter(x=>x!=null));
  const hi=all.length?Math.max(...all):null,lo=all.length?Math.min(...all):null,over=hi!=null?hi-sp:null,under=lo!=null?lo-sp:null,w=tol*(+C().warnPct||80)/100;
  const hot=per.filter(p=>p.n).sort((a,b)=>b.max-a.max)[0]||null,cold=per.filter(p=>p.n).sort((a,b)=>a.min-b.min)[0]||null;
  if(hi!=null&&(over>tol||-under>tol)){const b=over>tol?hot:cold;issues.push({j:"fail",txt:`After stabilisation ${b.tag} (${b.loc||"no location"}) at ${r1(over>tol?hi:lo)} °C, ${sgn(over>tol?over:under)} °C from the set value: outside ± ${tol} °C.`});}
  /* validity */
  if(isDate(t.instrCal)&&isDate(t.date)&&t.instrCal<t.date)issues.push({j:"invalid",txt:`Test instrument calibration expired on ${fmtD(t.instrCal)}, before the survey.`});
  if(isDate(t.tcCal)&&isDate(t.date)&&t.tcCal<t.date)issues.push({j:"invalid",txt:`Survey thermocouple calibration expired on ${fmtD(t.tcCal)}, before the survey.`});
  const used=per.filter(p=>p.n).length;
  if(used<(+C().minTc||0))issues.push({j:"warn",txt:`${plural(used,"survey thermocouple")} with readings; at least ${C().minTc} are planned.`});
  per.filter(p=>!p.n&&from!=null).forEach(p=>issues.push({j:"warn",txt:`${p.tag} (${p.loc||"no location"}) has no reading after stabilisation.`}));
  if(!rg)issues.push({j:"warn",txt:`${sp} °C is not within a qualified range of ${t.furnace} ${t.chamber.toLowerCase()} chamber (± ${endTol()} °C).`});
  else if(Math.abs(sp-num(rg.lo))>endTol()&&Math.abs(sp-num(rg.hi))>endTol())issues.push({j:"info",txt:`${sp} °C is inside the range ${rg.lo}–${rg.hi} °C but not at an end: it does not count towards qualifying the range.`});
  if(t.method==="alt"&&(!txt(t.alt.ref)||!txt(t.alt.why)||!txt(t.alt.appr)))issues.push({j:"warn",txt:"Alternate method (P3.4.8) without its reference, justification and approval."});
  const res=issues.some(i=>i.j==="invalid"||i.j==="incomplete")?"invalid":issues.some(i=>i.j==="fail")?"fail":(over!=null&&(over>w||-under>w))||issues.some(i=>i.j==="warn")?"warn":"pass";
  return {sp,tol,w,rg,rows,from,judged,n:judged.length,per,hi,lo,over,under,spread:hi!=null?hi-lo:null,hot,cold,peak,overAny,soakCov,issues,res,step};
}
const okRes=r=>r==="pass"||r==="warn";
const status=t=>{const k=calc(t);return !k.res?"planned":k.res==="fail"?(t.closed?"closed":"open"):k.res;};
const STATUS={planned:["","Planned / no readings"],pass:["ok","Pass"],warn:["warn","Pass, with notes"],invalid:["bad","Invalid / incomplete"],open:["bad","Failed · reaction open"],closed:["ok","Failed · reaction closed"]};
const stPill=t=>pill(...STATUS[status(t)]);
const nearSp=(a,b)=>Math.abs(num(a.sp)-num(b.sp))<=endTol();
const resurveyOf=t=>S.surveys.filter(x=>x.id!==t.id&&x.furnace===t.furnace&&x.chamber===t.chamber&&byDate(t,x)<0&&nearSp(x,t)).sort(byDate).find(x=>okRes(calc(x).res))||null;
const lastPassBefore=t=>S.surveys.filter(x=>x.id!==t.id&&x.furnace===t.furnace&&x.chamber===t.chamber&&byDate(x,t)<0&&nearSp(x,t)&&okRes(calc(x).res)).sort(byDate).at(-1)||null;
const riskTxt=t=>{const a=lastPassBefore(t),b=resurveyOf(t);return `${t.furnace} ${t.chamber.toLowerCase()} chamber, product at about ${t.sp} °C, from ${a?fmtD(a.date)+" ("+a.id+", last passing survey)":"the start of the records (no earlier passing survey)"} to ${b?fmtD(b.date)+" ("+b.id+", passing re-survey)":"the passing re-survey (not yet done)"}`;};
function missingAct(t){if(calc(t).res!=="fail")return [];const a=t.act,m=[];
  if(!txt(a.cause))m.push("root cause");if(!txt(a.action))m.push("corrective action");if(!txt(a.impact))m.push("product-impact assessment");
  if(!txt(a.by))m.push("action owner");if(!isDate(a.date))m.push("action date");if(!resurveyOf(t))m.push("a passing re-survey at this set value");return m;}
/* the report of P3.4.7: what an approved report must hold */
function repMissing(t){const m=[],k=calc(t);
  if(!t.furnace)m.push("furnace");if(!t.chamber)m.push("chamber");if(!isDate(t.date))m.push("survey date");if(!txt(t.start))m.push("start time");
  if(num(t.sp)==null)m.push("set value");else if(!k.rg)m.push("a qualified range covering the set value");
  if(!t.method)m.push("method");if(t.method==="alt"){if(!txt(t.alt.ref))m.push("alternate method reference (P3.4.8)");if(!txt(t.alt.why))m.push("justification of the alternate method");if(!txt(t.alt.appr)||!isDate(t.alt.date))m.push("approval of the alternate method (by, date)");}
  if(!txt(t.instr)||!txt(t.instrSer))m.push("test instrument and serial no.");if(!isDate(t.instrCal))m.push("test instrument calibration due");
  if(!txt(t.tcCert))m.push("survey thermocouple certificate");if(!isDate(t.tcCal))m.push("survey thermocouple calibration due");
  if(t.tcs.length<(+C().minTc||1))m.push(`at least ${C().minTc} survey thermocouples`);
  const noLoc=t.tcs.filter(c=>!txt(c.tag)||!txt(c.loc)),noCorr=t.tcs.filter(c=>num(c.corr)==null);
  if(noLoc.length)m.push("identification and location of every survey thermocouple");if(noCorr.length)m.push("correction factor of every survey thermocouple (0 when none)");
  if(!k.rows.length)m.push("readings");else if(k.res==="invalid")m.push("a valid, complete survey ("+k.issues.filter(i=>i.j==="invalid"||i.j==="incomplete").map(i=>i.txt).join(" ")+")");
  if(t.exc.on&&!txt(t.exc.why))m.push("reason for the multi-temperature cycle exception");
  if(t.kind==="change"&&!t.chg)m.push("the change record it follows");
  if(!txt(t.by))m.push("performed by");
  return m;}
const approved=t=>txt(t.check.by)&&isDate(t.check.date);
/* qualification of a range on a day (CALOR's rangeState) */
function rangeState(r,day){day=day||today();const lo=num(r.lo),hi=num(r.hi),et=endTol();
  const sv=S.surveys.filter(s=>s.furnace===r.furnace&&s.chamber===r.chamber&&isDate(s.date)&&s.date<=day).sort(byDate).map(s=>({s,k:calc(s)})).filter(x=>x.k.res&&x.k.res!=="invalid");
  const end=v=>{const L=sv.filter(x=>Math.abs(num(x.s.sp)-v)<=et);return {latest:L.at(-1)||null,pass:L.filter(x=>okRes(x.k.res)).at(-1)||null};};
  const E={lo:end(lo),hi:end(hi)};
  if([E.lo,E.hi].some(e=>e.latest&&e.latest.k.res==="fail"))return {st:"fail",E};
  if(!E.lo.pass||!E.hi.pass)return {st:E.lo.pass||E.hi.pass?"partial":"none",E};
  const first=[E.lo.pass.s.date,E.hi.pass.s.date].sort()[0],due=addDays(first,num(r.interval)||+C().interval),left=dayDiff(day,due);
  return {st:left<0?"overdue":left<=(+C().soon||30)?"soon":"ok",E,due,left};}
const RST={ok:["ok","Qualified"],soon:["warn","Survey due soon"],overdue:["bad","Survey overdue"],fail:["bad","Last survey failed"],partial:["warn","Only one end surveyed"],none:["bad","Never surveyed"]};
const RLV={ok:"good",soon:"warn",partial:"warn",none:"crit",overdue:"crit",fail:"crit"};
/* changes that alter uniformity (P3.4.1.2): the re-survey = the first valid survey of the chamber on / after the change */
const chChambers=c=>c.chamber?[c.chamber]:CHAMBERS;
function chgState(c){if(!c.need)return {st:"undecided"};if(c.need==="no")return {st:"notreq"};
  const sv=S.surveys.filter(s=>s.furnace===c.furnace&&chChambers(c).includes(s.chamber)&&isDate(s.date)&&s.date>=c.date).sort(byDate),k=sv.map(s=>({s,r:calc(s).res})).filter(x=>x.r&&x.r!=="invalid");
  const ok=chChambers(c).every(ch=>k.some(x=>x.s.chamber===ch&&okRes(x.r)));
  return ok?{st:"done",sv:k.filter(x=>okRes(x.r)).map(x=>x.s)}:{st:"open",sv:k.map(x=>x.s)};}
const CST={undecided:["warn","Decision open"],notreq:["","No re-survey needed"],open:["bad","Re-survey required"],done:["ok","Re-surveyed"]};
function chgMissing(c){const m=[];if(!isDate(c.date))m.push("date");if(!c.furnace)m.push("furnace");if(!txt(c.what))m.push("what was done");if(!txt(c.by))m.push("recorded by");
  if(!c.need)m.push("decision: re-survey or not");else if(c.need==="no"&&!txt(c.why))m.push("why no re-survey is needed");if(c.need&&(!txt(c.dBy)||!isDate(c.dDate)))m.push("decided by / date");return m;}
/* equipment changes recorded in Process validation for a chamber, not yet documented here */
function validPending(){let L=[];try{L=MWS.valid&&MWS.valid.changes?MWS.valid.changes():[];}catch(e){L=[];}
  return L.filter(v=>isDate(v.date)&&(v.kind==="location"||v.equip.some(e=>EQCH[e]))&&!S.chgs.some(c=>c.vref===v.id))
    .map(v=>({...v,chambers:v.kind==="location"?CHAMBERS:[...new Set(v.equip.flatMap(e=>EQCH[e]||[]))]}));}
const chambersAll=()=>furnaces().flatMap(f=>CHAMBERS.map(ch=>({f,ch})));

/* HTSA 3.4 */
const SCORE={s:["ok","Satisfactory","acc"],ns:["warn","Not satisfactory","cond"],nia:["bad","Needs immediate action","rej"]};
const LV={ok:["ok","Met"],warn:["warn","Attention"],crit:["bad","Not met"],info:["acc","Note"]};
function assess34(){
  const I=[],add=(lvl,req,ev,act)=>I.push({lvl,req,ev,act}),R=S.ranges.filter(r=>r.active!==false),RS=R.map(r=>({r,s:rangeState(r)}));
  /* 1. ranges per the Process Tables, Section 2.0 */
  const noRg=chambersAll().filter(x=>!rangesOf(x.f,x.ch).length),noRef=R.filter(r=>!txt(r.ref)||num(r.tol)==null||!num(r.interval));
  if(!R.length)add("crit","Qualified ranges per the Process Tables, Section 2.0","No qualified range is defined.","Enter each chamber's range with tolerance, interval and Process Table reference (F-TUS-01).");
  else if(noRg.length)add("crit","Qualified ranges per the Process Tables, Section 2.0",`${noRg.map(x=>x.f+" "+x.ch.toLowerCase()).join(", ")}: no qualified range.`,"Define the range(s) of each chamber from the Process Table.");
  else if(noRef.length)add("warn","Qualified ranges per the Process Tables, Section 2.0",`${noRef.map(r=>r.id).join(", ")}: tolerance, interval or Process Table reference missing.`,"Complete the range from the Process Table Section 2.0.");
  else add("ok","Qualified ranges per the Process Tables, Section 2.0",`${plural(R.length,"range")} on ${plural(new Set(R.map(r=>r.furnace+r.chamber)).size,"chamber")}, each with tolerance, interval and reference.`,"");
  /* 2. surveys performed at both ends within the interval */
  const bad=RS.filter(x=>RLV[x.s.st]==="crit"),warn=RS.filter(x=>RLV[x.s.st]==="warn");
  if(R.length)add(bad.length?"crit":warn.length?"warn":"ok","Surveys performed per the Process Tables (both range ends, within the interval)",
    bad.length||warn.length?[...bad,...warn].map(x=>`${x.r.furnace} ${x.r.chamber.toLowerCase()} ${x.r.lo}–${x.r.hi} °C: ${RST[x.s.st][1].toLowerCase()}${x.s.due?" (due "+fmtD(x.s.due)+")":""}`).join("; ")+".":`Every range qualified; next due ${fmtD(RS.map(x=>x.s.due).filter(Boolean).sort()[0])}.`,
    bad.length?"Survey the range ends that are missing, overdue or failed before production on them.":warn.length?"Plan the surveys due.":"");
  /* 3. changes that alter uniformity documented (P3.4.1.2) */
  const und=S.chgs.filter(c=>chgState(c).st==="undecided"||chgMissing(c).length),open=S.chgs.filter(c=>chgState(c).st==="open"),vp=validPending();
  if(open.length)add("crit","Actions that alter uniformity documented, re-survey done (P3.4.1.2)",`${open.map(c=>`${c.id} ${c.furnace} ${fmtD(c.date)}: re-survey required, not done`).join("; ")}.`,"Survey the chamber before production on the affected range.");
  else if(und.length||vp.length)add("warn","Actions that alter uniformity documented, re-survey done (P3.4.1.2)",[und.length?`${und.map(c=>c.id).join(", ")}: record or decision incomplete`:"",vp.length?`${plural(vp.length,"Process validation change")} not documented here: ${vp.map(v=>v.id+" "+v.furnace).join(", ")}`:""].filter(Boolean).join(" · ")+".","Document each change and decide the re-survey (F-TUS-03).");
  else add(S.chgs.length?"ok":"info","Actions that alter uniformity documented, re-survey done (P3.4.1.2)",S.chgs.length?`${plural(S.chgs.length,"change")} documented with the decision; re-surveys done.`:"No change recorded.","");
  /* 4. alternate methods (P3.4.8) */
  const alt=S.surveys.filter(t=>t.method==="alt"),altBad=alt.filter(t=>!txt(t.alt.ref)||!txt(t.alt.why)||!txt(t.alt.appr)||!isDate(t.alt.date));
  add(altBad.length?"crit":alt.length?"ok":"info","Alternate test methods meet P3.4.8",altBad.length?`${altBad.map(t=>t.id).join(", ")}: alternate method without reference, justification or approval.`:alt.length?`${plural(alt.length,"survey")} by an approved alternate method.`:"No alternate method used.",altBad.length?"Document the method reference and justification and have it approved, or repeat by the standard method.":"");
  /* 5. upper tolerance never exceeded (P3.4.5.1) */
  const recent=S.surveys.filter(t=>calc(t).res),over=recent.filter(t=>{const k=calc(t);return k.overAny&&!(t.exc.on&&txt(t.exc.why));}),exc=recent.filter(t=>calc(t).overAny&&t.exc.on&&txt(t.exc.why));
  const overOpen=over.filter(t=>!t.closed);
  if(recent.length)add(overOpen.length?"crit":exc.length?"warn":"ok","Upper temperature tolerance not exceeded at any time (P3.4.5.1)",overOpen.length?`${overOpen.map(t=>`${t.id} ${t.furnace} ${t.chamber.toLowerCase()} ${t.sp} °C (${sgn(calc(t).peak.v-num(t.sp))} °C)`).join("; ")}: upper tolerance exceeded, reaction open.`:exc.length?`${exc.map(t=>t.id).join(", ")}: accepted as multi-temperature cycle exceptions; check the reasons.`:`Every reading of ${plural(recent.length,"survey")} at or below set value + tolerance, also before stabilisation.`,overOpen.length?"Treat as a failed survey: reaction, product assessment, re-survey.":"");
  /* 6. soak time defined by the internal specification (P3.4.5.1) */
  const short=recent.filter(t=>calc(t).issues.some(i=>i.j==="incomplete"));
  if(!(+C().soakMin>0)||!txt(C().soakRef))add("crit","Soak time at temperature defined by the internal process specification (P3.4.5.1)",!(+C().soakMin>0)?"No soak time set.":`Soak time ${C().soakMin} min set without the specification that defines it.`,"Set the soak time and its process specification reference (Settings).");
  else add(short.length?"warn":"ok","Soak time at temperature defined by the internal process specification (P3.4.5.1)",`${C().soakMin} min per ${C().soakRef}.${short.length?` ${short.map(t=>t.id).join(", ")}: soak time not covered (incomplete).`:""}`,short.length?"Repeat the incomplete surveys over the full soak time.":"");
  /* 7. reporting (P3.4.7) */
  const live=RS.flatMap(x=>[x.s.E.lo.latest,x.s.E.hi.latest].filter(Boolean).map(e=>e.s)),uniq=[...new Set(live)];
  const repBad=uniq.filter(t=>repMissing(t).length),notAppr=uniq.filter(t=>!repMissing(t).length&&!approved(t));
  if(uniq.length)add(repBad.length?"crit":notAppr.length?"warn":"ok","Survey reports meet P3.4.7",repBad.length?`${repBad.map(t=>`${t.id}: ${repMissing(t).slice(0,3).join(", ")}${repMissing(t).length>3?" …":""}`).join("; ")}.`:notAppr.length?`${notAppr.map(t=>t.id).join(", ")}: complete, not yet approved.`:`The ${plural(uniq.length,"survey")} that qualify the ranges have complete, approved reports.`,repBad.length||notAppr.length?"Complete and approve the reports (F-TUS-02).":"");
  /* 8. reaction to failed surveys */
  const failOpen=S.surveys.filter(t=>status(t)==="open");
  if(S.surveys.length)add(failOpen.length?"crit":"ok","Reaction to failed surveys",failOpen.length?`${failOpen.map(t=>`${t.id}: ${missingAct(t).join(", ")}`).join("; ")}.`:"No failed survey open.",failOpen.length?"Assess the product, correct the cause and re-survey.":"");
  const crit=I.filter(i=>i.lvl==="crit").length;
  return {I,crit,RS,score:!R.length||!S.surveys.length?"nia":crit?"ns":"s"};
}
function kp(){const A=assess34(),RS=A.RS;return {score:A.score,crit:A.crit,ranges:RS.length,ok:RS.filter(x=>x.s.st==="ok"||x.s.st==="soon").length,
  overdue:RS.filter(x=>["overdue","none"].includes(x.s.st)).length,failed:RS.filter(x=>x.s.st==="fail").length,soon:RS.filter(x=>x.s.st==="soon"||x.s.st==="partial").length,
  open:S.surveys.filter(t=>status(t)==="open").length,toApprove:S.surveys.filter(t=>calc(t).res&&!approved(t)).length,
  chgOpen:S.chgs.filter(c=>["open","undecided"].includes(chgState(c).st)).length+validPending().length,surveys:S.surveys.length};}

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
async function batchPut(c,L){for(let i=0;i<L.length;i+=8)await Promise.all(L.slice(i,i+8).map(o=>dbSet(c,o.id,o)));}
function startStore(store,state){
  S.unsub.forEach(u=>{try{u();}catch(e){}});S.db=store;S.dbState=state;
  S.unsub=[store.sub("ranges",L=>{S.ranges=L.map(fillRange).sort((a,b)=>(a.furnace+a.chamber+String(num(a.lo)).padStart(5,"0"))<(b.furnace+b.chamber+String(num(b.lo)).padStart(5,"0"))?-1:1);safeRender();}),
    store.sub("surveys",L=>{S.surveys=L.map(fillSurvey).sort((a,b)=>a.id<b.id?-1:1);safeRender();}),
    store.sub("changes",L=>{S.chgs=L.map(fillChg).sort((a,b)=>a.id<b.id?-1:1);safeRender();}),
    store.sub("config",L=>{const c=L.find(x=>x.id==="settings");S.cfg={...DEF,...(c||{})};delete S.cfg.id;safeRender();})];
  render();
}
function safeRender(){
  const a=document.activeElement;if(S.modal||(a&&$("#main")&&$("#main").contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=true;return;}
  render();
}
onDoc("focusout",()=>setTimeout(()=>{if(S.pending&&!S.modal){const a=document.activeElement;if(!(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=false;render();}}},0));

/* 7. navigation */
const NAV=[["",[["dash","Dashboard"]]],["P",[["ranges","Ranges & schedule"]]],["D",[["surveys","Surveys"],["changes","Changes"]]],
  ["C",[["review","HTSA 3.4"]]],["A",[["act","Actions"]]],["",[["settings","Settings"],["rules","Rules"],["docs","Docs"],["data","Data"]]]];
const navHtml=()=>`<div class="wrap">${NAV.map(([p,it])=>`<div class="grp">${p?`<span class="pd">${p}</span>`:""}${it.map(([k,l])=>`<a href="#${k}" ${S.view===k?'aria-current="page"':""}>${l}</a>`).join("")}</div>`).join("")}</div>`;
function route(){const v=(location.hash||"").slice(1);S.view=VIEWS[v]?v:"dash";}
const banner=()=>S.dbState==="local"?`<div class="banner warn">${MWS.sync&&MWS.sync.linked()?`Records are kept in this browser and saved to the Google Drive folder <b>${esc(MWS.sync.folder())}</b>.`:`Local mode: records are kept in this browser only. Link a Google Drive folder (button at the top right) or back up from the <a href="#data">Data</a> tab.`}</div>`
  :S.dbState==="connecting"?`<div class="banner">Connecting to the record store…</div>`:S.dbState==="error"?`<div class="banner bad">The record store reported an error; changes may not be saved.</div>`:"";
function render(){
  if(!ACTIVE()){MWS.bg();return;}
  $("#nav").innerHTML=navHtml();
  const ds=$("#dbstate");if(ds)ds.textContent=S.dbState==="on"?"Shared · live":S.dbState==="local"?"Local · this browser":S.dbState==="error"?"Store error":"Connecting…";
  document.body.classList.toggle("ro",!S.canWrite);S.ch={};
  $("#main").innerHTML=`<div class="stack">${banner()}${(VIEWS[S.view]||VIEWS.dash)()}</div>`;
  (AFTER[S.view]||(()=>{}))();
}

/* 8. views */
const inView=x=>(!S.filt.f||x.furnace===S.filt.f)&&(!S.filt.ch||x.chamber===S.filt.ch);
const filtRow=()=>`<div class="row"><select data-filt="f"><option value="">All furnaces</option>${furnaces().map(f=>`<option ${S.filt.f===f?"selected":""}>${f}</option>`).join("")}</select><select data-filt="ch"><option value="">Both chambers</option>${CHAMBERS.map(c=>`<option ${S.filt.ch===c?"selected":""}>${c}</option>`).join("")}</select></div>`;
function attention(){const out=[],A=assess34();
  A.RS.filter(x=>RLV[x.s.st]!=="good").forEach(x=>out.push([x.s.st==="fail"&&x.s.E.lo.latest&&x.s.E.lo.latest.k.res==="fail"?`data-open="${esc(x.s.E.lo.latest.s.id)}"`:x.s.st==="fail"&&x.s.E.hi.latest?`data-open="${esc(x.s.E.hi.latest.s.id)}"`:`data-new-sv="${esc(x.r.id)}"`,
    `${x.r.furnace} ${x.r.chamber.toLowerCase()} ${x.r.lo}–${x.r.hi} °C: ${RST[x.s.st][1].toLowerCase()}${x.s.due?" · due "+fmtD(x.s.due):""}`,RLV[x.s.st]==="crit"?"bad":"warn"]));
  S.chgs.filter(c=>["open","undecided"].includes(chgState(c).st)).forEach(c=>out.push([`data-open-chg="${esc(c.id)}"`,`${c.id} ${c.furnace} ${c.chamber||"both chambers"}: ${CST[chgState(c).st][1].toLowerCase()}`,chgState(c).st==="open"?"bad":"warn"]));
  validPending().forEach(v=>out.push([`data-from-valid="${esc(v.id)}"`,`${v.id} (Process validation) ${v.furnace} ${fmtD(v.date)}: ${v.kindTxt.toLowerCase()} not documented as a uniformity change`,"warn"]));
  S.surveys.filter(t=>calc(t).res&&!approved(t)).forEach(t=>out.push([`data-open="${esc(t.id)}"`,`${t.id} ${t.furnace} ${t.chamber.toLowerCase()} ${t.sp} °C: report not approved${repMissing(t).length?" ("+plural(repMissing(t).length,"item")+" missing)":""}`,"warn"]));
  if(!(+C().soakMin>0)||!txt(C().soakRef))out.unshift([`data-goset`,"Soak time of the internal process specification not defined (Settings)","bad"]);
  return out;}
function vDash(){
  if(!S.ranges.length&&!S.surveys.length)return `<div class="empty"><h2>No temperature uniformity survey recorded yet</h2><p>Define the qualified range of every chamber from the Process Tables Section 2.0, then record the surveys at both ends of each range. The starter set-up shows how the module works on F-01 … F-04.</p><div class="row" style="justify-content:center"><button class="pri w" data-add-ranges>Add the default ranges</button><button class="w" data-std>Load starter set-up</button></div></div>`;
  const A=assess34(),sc=SCORE[A.score],k=kp(),att=attention();
  return `<div class="tiles">
    <a class="tile ${sc[0]}" href="#review"><span class="k">HTSA 3.4</span><span class="v" style="font-size:20px;padding:6px 0">${sc[1]}</span><span class="small muted">${plural(A.crit,"item")} not met</span></a>
    <a class="tile ${k.ok===k.ranges&&k.ranges?"ok":"bad"}" href="#ranges"><span class="k">Ranges qualified</span><span class="v">${k.ok}/${k.ranges}</span><span class="small muted">${k.overdue} overdue / never · ${k.failed} failed</span></a>
    <a class="tile ${k.open?"bad":""}" href="#act"><span class="k">Failed surveys open</span><span class="v">${k.open}</span><span class="small muted">reaction and re-survey</span></a>
    <a class="tile ${k.chgOpen?"warn":""}" href="#changes"><span class="k">Changes to close</span><span class="v">${k.chgOpen}</span><span class="small muted">decision or re-survey</span></a>
    <a class="tile ${k.toApprove?"warn":""}" href="#surveys"><span class="k">Reports to approve</span><span class="v">${k.toApprove}</span><span class="small muted">of ${k.surveys} surveys</span></a></div>
  <div class="grid2"><div class="panel"><div class="row between"><h3>Needs attention</h3><button class="pri w" data-new-sv>New survey</button></div>
    ${att.length?`<ul class="issues">${att.slice(0,12).map(([a,t,c])=>`<li><button class="link" ${a}>${esc(t)}</button> ${pill(c,c==="bad"?"Not met":"Attention")}</li>`).join("")}</ul>`:`<p class="muted">Nothing open.</p>`}</div>
  <div class="panel"><h3>Chambers</h3>${chamberTable()}</div></div>`;}
function chamberTable(){
  return `<div class="tw"><table><thead><tr><th>Furnace</th>${CHAMBERS.map(c=>`<th>${c} chamber</th>`).join("")}</tr></thead><tbody>${furnaces().map(f=>`<tr><td><b>${f}</b></td>${CHAMBERS.map(ch=>{const R=rangesOf(f,ch);
    return `<td>${R.length?R.map(r=>{const s=rangeState(r);return `<div>${esc(r.lo)}–${esc(r.hi)} °C ${pill(...RST[s.st])}${s.due?` <span class="small muted">due ${fmtD(s.due)}</span>`:""}</div>`;}).join(""):pill("bad","No range")}</td>`;}).join("")}</tr>`).join("")}</tbody></table></div>`;}
function vRanges(){const L=S.ranges.filter(inView);
  return `<div class="row between"><h2>Qualified ranges and schedule (F-TUS-01)</h2><div class="row"><button class="pri w" data-new-rg>New range</button><button data-rgprint>Print F-TUS-01</button></div></div>
  <p class="muted">Each chamber is qualified over the span it is used at, with the tolerance and the survey interval of the applicable Process Table, Section 2.0. A range is qualified when both ends (± ${endTol()} °C) have a passing survey within the interval.</p>${filtRow()}
  ${L.length?`<div class="tw"><table><thead><tr><th>Range</th><th>Furnace · chamber</th><th>Span</th><th>Tolerance</th><th>Interval</th><th>Process Table reference</th><th>Lower end</th><th>Upper end</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>${L.map(r=>{const s=rangeState(r),e=x=>x.pass?`${fmtD(x.pass.s.date)}<br><span class="small muted">${esc(x.pass.s.id)}</span>`:x.latest?pill("bad",x.latest.s.id+" failed"):"—";
    return `<tr><td class="mono">${esc(r.id)}${r.active===false?" "+pill("","inactive"):""}</td><td><b>${esc(r.furnace)}</b> ${esc(r.chamber)}</td><td>${esc(r.lo)}–${esc(r.hi)} °C</td><td>± ${esc(r.tol||C().tol)} °C${r.cls?`<br><span class="small muted">class ${esc(r.cls)}</span>`:""}</td><td>${esc(r.interval||C().interval)} d</td><td class="small">${esc(r.ref||"—")}</td><td>${e(s.E.lo)}</td><td>${e(s.E.hi)}</td><td>${fmtD(s.due)}</td><td>${pill(...RST[s.st])}</td><td><button data-open-rg="${esc(r.id)}">Edit</button> <button data-new-sv="${esc(r.id)}">Survey</button></td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No range.</p><button class="w" data-add-ranges>Add the default ranges</button></div>`}`;}
function vSurveys(){const L=S.surveys.filter(inView).slice().sort(byDate).reverse();
  return `<div class="row between"><h2>Surveys (F-TUS-02)</h2><button class="pri w" data-new-sv>New survey</button></div>${filtRow()}
  ${L.length?`<div class="tw"><table><thead><tr><th>Survey</th><th>Date</th><th>Furnace · chamber</th><th>Set value</th><th>Kind · method</th><th>Highest at any time</th><th>After stabilisation</th><th>Result</th><th>Report</th></tr></thead><tbody>${L.map(t=>{const k=calc(t);
    return `<tr class="click" data-open="${esc(t.id)}"><td class="mono">${esc(t.id)}</td><td>${fmtD(t.date)}</td><td><b>${esc(t.furnace)}</b> ${esc(t.chamber)}</td><td>${esc(t.sp)} °C ± ${esc(k.tol)}</td><td>${esc(KINDS[t.kind]||"")}<br><span class="small muted">${t.method==="alt"?"Alternate (P3.4.8)":t.method==="travel"?"Travelling logger":"Standard"}</span></td>
    <td>${k.peak?`${sgn(k.peak.v-k.sp)} °C${k.overAny?" "+pill(t.exc.on&&txt(t.exc.why)?"warn":"bad",t.exc.on&&txt(t.exc.why)?"exception":"over"):""}`:"—"}</td><td>${k.hi!=null?`${sgn(k.under)} … ${sgn(k.over)} °C`:"—"}</td><td>${stPill(t)}</td><td>${approved(t)?pill("ok","Approved "+fmtD(t.check.date)):repMissing(t).length?pill("warn",repMissing(t).length+" missing"):pill("warn","To approve")}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No survey matches.</p></div>`}`;}
function vChanges(){const L=S.chgs.slice().reverse(),vp=validPending();
  return `<div class="row between"><h2>Changes that alter uniformity (F-TUS-03)</h2><button class="pri w" data-new-chg>Record a change</button></div>
  <p class="muted">Every action that can alter a chamber's temperature uniformity (P3.4.1.2) is recorded with the decision whether a re-survey is needed. The re-survey is the first valid survey of the chamber on or after the change date.</p>
  ${vp.length?`<div class="panel"><h3>Equipment changes from Process validation not documented here</h3><ul class="issues">${vp.map(v=>`<li><b>${esc(v.id)}</b> ${fmtD(v.date)} ${esc(v.furnace)} · ${esc(v.kindTxt)}: ${esc(v.what)} <span class="small muted">(${esc(v.chambers.join(", ").toLowerCase())} chamber)</span> <button data-from-valid="${esc(v.id)}">Document</button></li>`).join("")}</ul></div>`:""}
  ${L.length?`<div class="tw"><table><thead><tr><th>Change</th><th>Date</th><th>Furnace · chamber</th><th>Kind</th><th>What was done</th><th>Decision</th><th>Re-survey</th></tr></thead><tbody>${L.map(c=>{const s=chgState(c);
    return `<tr class="click" data-open-chg="${esc(c.id)}"><td class="mono">${esc(c.id)}${c.vref?`<br><span class="small muted">${esc(c.vref)}</span>`:""}</td><td>${fmtD(c.date)}</td><td><b>${esc(c.furnace)}</b> ${esc(c.chamber||"both chambers")}</td><td>${esc(CKINDS[c.kind]||c.kind)}</td><td class="small">${esc(c.what)}</td><td>${c.need==="yes"?"Re-survey":c.need==="no"?"Not needed: "+esc(c.why):"—"}</td><td>${pill(...CST[s.st])}${s.sv&&s.sv.length?`<br><span class="small muted">${s.sv.map(x=>x.id).join(", ")}</span>`:""}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No change recorded.</p></div>`}`;}
function vReview(){const A=assess34(),sc=SCORE[A.score];
  return `<div class="panel"><div class="row between"><h3>HTSA 3.4 · Are temperature uniformity surveys performed per requirements in Process Tables?</h3><button data-h34>Evidence (print)</button></div>
    <p><span class="verdict ${sc[2]}">${sc[1]}</span> <span class="muted">${plural(A.I.filter(i=>i.lvl==="ok").length,"item")} met · ${plural(A.crit,"item")} not met · ${plural(A.I.filter(i=>i.lvl==="warn").length,"item")} needing attention</span></p>
    <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th><th>Action</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${pill(...LV[i.lvl])}</td><td>${esc(i.act)}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted" style="margin-top:8px">The question asks for surveys per the Process Tables Section 2.0, documented changes that alter uniformity (P3.4.1.2), alternate methods meeting P3.4.8, the upper tolerance never exceeded (exceptions for multi-temperature cycles, P3.4.5.1), a soak time for the pass / fail defined by the internal process specification (P3.4.5.1) and reporting per P3.4.7. Section numbers and figures to confirm against the controlled CQI-9 copy.</p></div>`;}
function vAct(){const att=attention(),F=S.surveys.filter(t=>calc(t).res==="fail").sort(byDate).reverse();
  return `<div class="panel"><h3>Open items</h3>${att.length?`<ul class="issues">${att.map(([a,t,c])=>`<li><button class="link" ${a}>${esc(t)}</button> ${pill(c,c==="bad"?"Not met":"Attention")}</li>`).join("")}</ul>`:`<p class="muted">Nothing open.</p>`}</div>
  <div class="panel"><h3>Failed surveys and their reaction</h3>${F.length?`<div class="tw"><table><thead><tr><th>Survey</th><th>Why it failed</th><th>Product at risk</th><th>Reaction</th><th>Status</th></tr></thead><tbody>${F.map(t=>`<tr class="click" data-open="${esc(t.id)}"><td class="mono">${esc(t.id)}<br>${fmtD(t.date)}</td><td class="small">${esc(calc(t).issues.filter(i=>i.j==="fail").map(i=>i.txt).join(" "))}</td><td class="small">${esc(riskTxt(t))}</td><td class="small">${missingAct(t).length?"Missing: "+esc(missingAct(t).join(", ")):esc(t.act.action)}</td><td>${stPill(t)}</td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">No failed survey.</p>`}</div>`;}
function vSettings(){const c=C();
  return `<div class="panel"><h3>Settings</h3><div class="fields">${SETF.map(([k,l,t])=>t==="area"?`<label class="f wide"><span>${esc(l)}</span><textarea data-cfg="${k}" rows="3">${esc(c[k])}</textarea></label>`:`<label class="f ${k==="soakMin"||k==="soakRef"?"wide":""}"><span>${esc(l)}</span><input data-cfg="${k}" type="${t}" ${t==="number"?'step="any"':""} value="${esc(c[k])}"></label>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="pri w" data-save-cfg>Save settings</button><span class="small muted">Changes are kept only after Save. Tolerances, intervals, the number of survey thermocouples and the soak time are to confirm against the controlled CQI-9 copy, the furnace class and the internal process specification.</span></div></div>`;}
function vRules(){const c=C();
  const R=[["Ranges","Each chamber has its qualified range(s) with tolerance, interval and the Process Table Section 2.0 reference. A survey counts for a range end when its set value is within ± "+c.endTol+" °C of it. Qualified = both ends passed; due = the older passing end survey + the interval (due soon "+c.soon+" days before)."],
    ["Readings","Corrected reading = reading + the survey thermocouple's correction factor. Stabilisation = the reading entered, else the first reading with every thermocouple within ± tolerance."],
    ["Upper tolerance at any time","Every corrected reading, also before stabilisation, must be at or below set value + tolerance (P3.4.5.1). Otherwise the survey fails, unless the multi-temperature cycle exception is ticked with its reason."],
    ["Soak time","From stabilisation the readings must cover the soak time of the internal process specification ("+c.soakMin+" min, "+(c.soakRef||"reference not set")+"); a shorter survey is incomplete (invalid)."],
    ["Pass / fail","Fail: upper tolerance exceeded, never stabilised, or a reading after stabilisation outside ± tolerance. Pass with notes: within "+c.warnPct+" % of the tolerance band, fewer than "+c.minTc+" thermocouples with readings, a thermocouple without readings, no covering range, an alternate method not approved. Invalid: test instrument or survey thermocouples out of calibration on the survey day, soak not covered."],
    ["Alternate methods","A survey by an alternate method (P3.4.8) needs the method reference, the justification and the approval (by, date)."],
    ["Report (P3.4.7)","Approval needs: furnace, chamber, date, start time, set value with a covering range, method, test instrument with serial and calibration, survey thermocouple certificate and calibration, at least "+c.minTc+" thermocouples each with identification, location and correction factor, readings, a valid complete survey, the exception's reason, the change record for a survey after a change, performed by; approver allowed (Settings + HT organization)."],
    ["Changes (P3.4.1.2)","A change is recorded with the decision (re-survey or not, with the reason; by, date). Re-survey done = a passing valid survey of each chamber concerned on or after the change date. Equipment changes of Process validation on the hardening / tempering chamber, combustion or controls are flagged until documented here."],
    ["Failed survey","Reaction: root cause, corrective action, product-impact assessment (the window from the last passing survey at that set value), owner, date and a passing re-survey."],
    ["HTSA 3.4 score","Needs immediate action: no range or no survey. Not satisfactory: any item not met. Satisfactory: otherwise."]];
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
function vData(){const n=S.ranges.length+S.surveys.length+S.chgs.length;
  return `<h2>Data</h2><div class="grid2">
  <div class="panel"><h3>Back up and restore</h3><p class="small muted">${plural(S.ranges.length,"range")}, ${plural(S.surveys.length,"survey")}, ${plural(S.chgs.length,"change")} · storage: ${S.dbState==="on"?"shared record store":"this browser"}.</p>
    <div class="row"><button class="pri" data-export>Export JSON</button><button data-csv>Surveys CSV</button></div>
    <div class="row w" style="margin-top:10px"><label class="f"><span>Import a JSON export</span><input type="file" id="impfile" accept=".json,application/json"></label></div>
    ${S.imp?`<div class="banner" style="margin-top:8px">${esc(S.imp.msg)}<div class="row" style="margin-top:6px"><button class="pri" data-imp="merge">Merge (add and update)</button><button class="danger" data-imp="replace">Replace everything</button><button data-imp="cancel">Cancel</button></div></div>`:""}</div>
  ${MWS.calor&&MWS.calor.panel?`<div class="panel">${MWS.calor.panel(["tus-reg"],"CALOR's TUS register (ranges and surveys with their readings) can be imported here.")}<button class="w" data-calor ${MWS.calor.get&&MWS.calor.get("tus-reg")?"":"disabled"}>Import from CALOR</button></div>`:""}
  <div class="panel"><h3>Starter set-up</h3><p class="small muted">The default ranges of F-01 … F-04 and CALOR's example surveys (F-01 qualified, F-02 tempering one end only, F-03 hardening upper end failed with the reaction open, F-04 overdue), a burner change on F-03 waiting for its re-survey and one survey with an overshoot during heat-up; all marked "(example)".</p><button class="w" data-std ${n?"disabled":""}>Load starter set-up</button>${n?`<p class="small muted">Only on an empty module.</p>`:""}</div>
  <div class="panel"><h3>Clear all</h3><p class="small muted">Deletes every record and the settings of this module. Type <b>CLEAR ALL</b> to enable.</p>
    <div class="row w"><input id="clrtxt" placeholder="CLEAR ALL" style="max-width:180px"><button class="danger" data-clear>Clear all</button></div></div></div>`;}
const VIEWS={dash:vDash,ranges:vRanges,surveys:vSurveys,changes:vChanges,review:vReview,act:vAct,settings:vSettings,rules:vRules,docs:vDocs,data:vData};
const AFTER={docs:showDoc};

/* readings chart (CALOR's tusChart): band of all survey thermocouples, hottest and coldest, set value ± tolerance, stabilisation */
function tusChart(t,k,key){
  if(!k.rows||!k.rows.length||k.sp==null)return "";
  const W=760,H=250,L=48,R=70,T=12,B=28,sp=k.sp,tol=k.tol,rows=k.rows,hotJ=k.hot?k.hot.j:null,coldJ=k.cold?k.cold.j:null;
  const env=rows.map(r=>{const v=r.v.filter(x=>x!=null);return {i:r.i,lo:Math.min(...v),hi:Math.max(...v)};});
  const all=env.flatMap(e=>[e.lo,e.hi]).concat([sp-tol,sp+tol]);let y0=Math.min(...all),y1=Math.max(...all);const py=(y1-y0)*.08||2;y0-=py;y1+=py;
  const n=Math.max(...rows.map(r=>r.i))+1,X=i=>L+(n>1?i/(n-1):.5)*(W-L-R),Y=v=>T+(y1-v)/(y1-y0)*(H-T-B);
  const path=pts=>pts.map((p,i)=>(i?"L":"M")+X(p[0]).toFixed(1)+" "+Y(p[1]).toFixed(1)).join(" ");
  const area=path(env.map(e=>[e.i,e.hi]))+" "+env.slice().reverse().map(e=>"L"+X(e.i).toFixed(1)+" "+Y(e.lo).toFixed(1)).join(" ")+"Z";
  const line=j=>path(rows.filter(r=>r.v[j]!=null).map(r=>[r.i,r.v[j]]));
  const span=y1-y0,st=span>60?20:span>30?10:5,ticks=[];for(let v=Math.ceil(y0/st)*st;v<=y1;v+=st)ticks.push(v);
  const xl=[0,Math.floor((n-1)/2),n-1].filter((v,i,a)=>a.indexOf(v)===i);
  S.ch[key]={W,L,R,n,k,start:t.start,step:k.step};
  const pk=k.peak&&k.overAny?`<circle cx="${X(k.peak.i).toFixed(1)}" cy="${Y(k.peak.v).toFixed(1)}" r="5" fill="var(--bad)" stroke="var(--panel)" stroke-width="2"/>`:"";
  return `<div class="tviz" data-ch="${key}"><div class="lgs"><span class="lg"><i style="background:var(--sunk);border:1px solid var(--line)"></i>all survey thermocouples (min–max)</span><span class="lg"><i style="background:var(--s2)"></i>hottest: ${esc(k.hot?k.hot.tag:"—")}</span><span class="lg"><i style="background:var(--s1)"></i>coldest: ${esc(k.cold?k.cold.tag:"—")}</span><span class="lg"><i style="border-top:2px dashed var(--ink);background:none"></i>set value ± ${tol} °C</span>${k.from>0?`<span class="lg"><i style="border-top:2px dotted var(--muted);background:none"></i>stabilised</span>`:""}</div>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Survey readings against the set value ± tolerance">
    ${ticks.map(v=>`<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--line)"/><text x="${L-6}" y="${(Y(v)+3.5).toFixed(1)}" text-anchor="end" class="tl">${v}</text>`).join("")}
    <path d="${area}" fill="var(--sunk)" stroke="none"/>
    ${[sp-tol,sp+tol].map(v=>`<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--ink)" stroke-dasharray="5 4" stroke-width="1.5"/>`).join("")}
    <line x1="${L}" x2="${W-R}" y1="${Y(sp).toFixed(1)}" y2="${Y(sp).toFixed(1)}" stroke="var(--muted)" stroke-width="1"/>
    <text x="${W-R+6}" y="${(Y(sp+tol)+4).toFixed(1)}" class="tl">+${tol}</text><text x="${W-R+6}" y="${(Y(sp-tol)+4).toFixed(1)}" class="tl">−${tol}</text>
    ${k.from>0?`<line x1="${X(k.from-.5).toFixed(1)}" x2="${X(k.from-.5).toFixed(1)}" y1="${T}" y2="${H-B}" stroke="var(--muted)" stroke-dasharray="2 3"/>`:""}
    ${coldJ!=null?`<path d="${line(coldJ)}" fill="none" stroke="var(--s1)" stroke-width="2"/>`:""}${hotJ!=null?`<path d="${line(hotJ)}" fill="none" stroke="var(--s2)" stroke-width="2"/>`:""}${pk}
    ${xl.map(i=>`<text x="${X(i).toFixed(1)}" y="${H-8}" text-anchor="${i===0?"start":i===n-1?"end":"middle"}" class="tl">${esc(hm(t.start,i,k.step)||"#"+(i+1))}</text>`).join("")}
    <line class="xh" x1="0" x2="0" y1="${T}" y2="${H-B}" stroke="var(--ink)" opacity="0"/>
    <rect class="hit" x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="transparent"/>
  </svg><div class="ttip" hidden></div></div>`;}
function chartHover(ev){const v=ev.target.closest&&ev.target.closest(".tviz");if(!v)return;const c=S.ch[v.dataset.ch];if(!c)return;
  const svg=v.querySelector("svg"),xh=svg.querySelector(".xh"),tip=v.querySelector(".ttip");
  if(ev.type==="pointerleave"||!ev.target.classList.contains("hit")){tip.hidden=true;xh.setAttribute("opacity","0");return;}
  const b=svg.getBoundingClientRect(),x=(ev.clientX-b.left)/b.width*c.W,i=Math.max(0,Math.min(c.n-1,Math.round((x-c.L)/(c.W-c.L-c.R)*(c.n-1)))),r=c.k.rows.find(q=>q.i===i);
  if(!r){tip.hidden=true;return;}const vals=r.v.map((x,j)=>({x,j})).filter(o=>o.x!=null),mx=vals.reduce((a,o)=>o.x>a.x?o:a),mn=vals.reduce((a,o)=>o.x<a.x?o:a);
  const xx=c.L+(c.n>1?i/(c.n-1):.5)*(c.W-c.L-c.R);xh.setAttribute("x1",xx);xh.setAttribute("x2",xx);xh.setAttribute("opacity",".35");
  tip.innerHTML=`<b>Reading ${i+1}</b>${hm(c.start,i,c.step)?" · "+hm(c.start,i,c.step):""}${c.k.from!=null&&i<c.k.from?" · <span class='muted'>before stabilisation</span>":""}<br>Highest ${r1(mx.x)} °C (${sgn(mx.x-c.k.sp)}) · ${esc(c.k.per[mx.j].tag)}<br>Lowest ${r1(mn.x)} °C (${sgn(mn.x-c.k.sp)}) · ${esc(c.k.per[mn.j].tag)}<br>Spread ${r1(mx.x-mn.x)} °C`;
  tip.hidden=false;const px=xx/c.W*b.width;tip.style.left=Math.min(b.width-tip.offsetWidth-4,Math.max(0,px+12))+"px";}
onDoc("pointermove",chartHover);onDoc("pointerdown",chartHover);onDoc("pointerout",e=>{if(e.target.classList&&e.target.classList.contains("hit"))chartHover({type:"pointerleave",target:e.target});});

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
function redraw(){const el=$("#modal");if(!S.modal||!el)return;const st=el.scrollTop;S.ch={};el.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${(DRAW[S.modal.kind])()}</div>`;el.scrollTop=st;}
const sheet=(title,body,foot)=>`<div class="row between"><h2>${title}</h2><button data-close aria-label="Close">✕</button></div>${body}<div class="sticky-foot"><span class="msg" id="mmsg">${S.modal.msg||""}</span>${foot}</div>`;
const msg=(t,ok)=>{if(!S.modal)return;S.modal.msg=t?`<span style="color:var(--${ok?"ok":"bad"})">${esc(t)}</span>`:"";const el=$("#mmsg");if(el)el.innerHTML=S.modal.msg;};
function svModal(id,init){const t=svById(id);let E;
  if(t)E=clone(t);else{E=fillSurvey({date:today(),step:String(C().step),tcs:DEFLOC.map((l,j)=>({tag:"TUS-"+pad(j+1),loc:l,corr:"0"})),...(init||{})});}
  openModal({kind:"sv",ed:E,rdt:rdText(fillSurvey(E)),msg:""});}
/* the result panel, updated while readings or thermocouples are typed (no redraw of the form) */
function resHtml(E){const k=calc(E);if(!k.res)return `<p class="muted small">Enter the set value and paste the readings to see the result.</p>`;
  return `<div class="row" style="gap:10px;align-items:center">${pill(...STATUS[k.res==="fail"?(E.closed?"closed":"open"):k.res])}<span class="small">Highest at any time ${k.peak?sgn(k.peak.v-k.sp)+" °C":"—"} · after stabilisation ${k.hi!=null?sgn(k.under)+" … "+sgn(k.over)+" °C":"—"} · stabilised at reading ${k.from!=null?k.from+1:"—"} · soak covered ${k.soakCov} / ${C().soakMin} min · hottest ${esc(k.hot?k.hot.tag+" "+k.hot.loc:"—")} · coldest ${esc(k.cold?k.cold.tag+" "+k.cold.loc:"—")}</span></div>
  ${k.issues.length?`<ul class="small">${k.issues.map(i=>`<li class="c-${i.j==="fail"||i.j==="invalid"||i.j==="incomplete"?"bad":i.j==="warn"?"warn":"ok"}">${esc(i.txt)}</li>`).join("")}</ul>`:""}
  ${tusChart(E,k,"m")}
  ${k.per.length?`<details><summary class="small">Per thermocouple</summary><div class="tw"><table><thead><tr><th>TC</th><th>Location</th><th>Corr.</th><th>Peak (any time)</th><th>Min</th><th>Max</th><th>Mean</th></tr></thead><tbody>${k.per.map(p=>`<tr><td>${esc(p.tag)}</td><td>${esc(p.loc)}</td><td>${p.corr==null?"—":sgn(p.corr)}</td><td>${p.peak==null?"—":sgn(p.peak-k.sp)}</td><td>${p.min==null?"—":sgn(p.min-k.sp)}</td><td>${p.max==null?"—":sgn(p.max-k.sp)}</td><td>${p.mean==null?"—":sgn(p.mean-k.sp)}</td></tr>`).join("")}</tbody></table></div></details>`:""}`;}
function DRAW_SV(){
  const E=S.modal.ed,known=svById(E.id),lock=approved(E),k=calc(E),rm=repMissing(E),ma=missingAct(E),chs=S.chgs.filter(c=>c.furnace===E.furnace&&chChambers(c).includes(E.chamber));
  const body=`<p class="muted">${known?stPill(known):pill("warn","New")} ${approved(E)?pill("ok",`Report approved ${fmtD(E.check.date)} by ${E.check.by}`):""} ${k.rg?`· range ${esc(k.rg.lo)}–${esc(k.rg.hi)} °C ± ${esc(k.tol)} °C (${esc(k.rg.ref||"no reference")})`:""}</p>
  <fieldset><legend>Identification</legend><div class="fields">
    ${mf("furnace","Furnace",{opts:furnaces().map(f=>[f,f]),blank:1,req:1,dis:lock})}${mf("chamber","Chamber",{opts:CHAMBERS.map(c=>[c,c]),req:1,dis:lock})}${mf("sp","Set value (°C)",{req:1,dis:lock})}
    ${mf("kind","Kind",{opts:Object.entries(KINDS),dis:lock})}${E.kind==="change"?mf("chg","After the change",{opts:chs.map(c=>[c.id,`${c.id} · ${fmtD(c.date)} · ${CKINDS[c.kind]||c.kind}`]),blank:1,req:1,dis:lock}):""}
    ${mf("date","Survey date",{type:"date",req:1,dis:lock})}${mf("start","Start time",{type:"time",req:1,dis:lock})}${mf("step","Reading interval (min)",{req:1,dis:lock})}${mf("by","Performed by",{req:1,dis:lock})}</div></fieldset>
  <fieldset><legend>Method and equipment</legend><div class="fields">${mf("method","Method",{opts:Object.entries(METHODS),dis:lock})}
    ${E.method==="alt"?mf("alt.ref","Alternate method: reference (procedure / customer approval, P3.4.8)",{req:1,wide:1,dis:lock})+mf("alt.why","Justification (why the standard method cannot be used; correlation with it)",{area:2,wide:1,req:1,dis:lock})+mf("alt.appr","Alternate method approved by",{req:1,dis:lock})+mf("alt.date","Approval date",{type:"date",req:1,dis:lock}):""}
    ${mf("instr","Test instrument",{req:1,dis:lock})}${mf("instrSer","Instrument serial no.",{req:1,dis:lock})}${mf("instrCal","Instrument calibration due",{type:"date",req:1,dis:lock})}
    ${mf("tcCert","Survey thermocouple certificate",{req:1,dis:lock})}${mf("tcCal","Survey thermocouple calibration due",{type:"date",req:1,dis:lock})}</div></fieldset>
  <fieldset><legend>Survey thermocouples (identification, location, correction factor)</legend><div class="tw"><table class="fq"><thead><tr><th>#</th><th>Identification</th><th>Location in the work zone</th><th>Correction (°C)</th>${lock?"":"<th></th>"}</tr></thead><tbody>${E.tcs.map((c,j)=>`<tr><td>${j+1}</td><td><input data-tcr="${j}.tag" value="${esc(c.tag)}" ${lock?"disabled":""}></td><td><input data-tcr="${j}.loc" value="${esc(c.loc)}" ${lock?"disabled":""}></td><td><input data-tcr="${j}.corr" value="${esc(c.corr)}" ${lock?"disabled":""} style="min-width:80px"></td>${lock?"":`<td><button data-tcdel="${j}" aria-label="Remove">✕</button></td>`}</tr>`).join("")}</tbody></table></div>
    ${lock?"":`<p class="row"><button data-tcadd>Add a thermocouple</button></p>`}</fieldset>
  <fieldset><legend>Readings</legend><p class="small muted">One row per reading from the start of heat-up, one column per survey thermocouple in the order above (paste from Excel or the data logger; a leading time column is skipped). Corrections are added by the module.</p>
    <label class="f wide"><span>Readings (${plural(E.rd.length,"row")})</span><textarea id="m-rdtxt" rows="6" ${lock?"disabled":""} style="font-family:var(--f-mono,monospace);white-space:pre">${esc(S.modal.rdt)}</textarea></label>
    <div class="fields">${mf("stab","Stabilised at reading no. (empty = automatic)",{dis:lock})}<label class="chk wide"><input type="checkbox" data-exc ${E.exc.on?"checked":""} ${lock?"disabled":""}> Multi-temperature process cycle: the upper tolerance may be exceeded by design (P3.4.5.1 exception)</label>
    ${E.exc.on?mf("exc.why","Reason and the cycle's process temperatures",{area:2,wide:1,req:1,dis:lock}):""}${mf("notes","Notes / deviations",{area:2,wide:1,dis:lock})}</div>
    <div id="tusres">${resHtml(E)}</div></fieldset>
  ${k.res==="fail"?`<fieldset><legend>Reaction to the failed survey</legend><p class="small">Product at risk: ${esc(riskTxt(E))}</p><div class="fields">
    ${mf("act.cause","Root cause",{area:2,wide:1,req:1,dis:E.closed})}${mf("act.action","Corrective action",{area:2,wide:1,req:1,dis:E.closed})}${mf("act.impact","Product-impact assessment",{area:2,wide:1,req:1,dis:E.closed})}
    ${mf("act.by","Action owner",{req:1,dis:E.closed})}${mf("act.date","Action date",{type:"date",req:1,dis:E.closed})}</div>
    <p class="small">Re-survey: ${resurveyOf(E)?`${esc(resurveyOf(E).id)} ${fmtD(resurveyOf(E).date)} ${pill("ok","passed")}`:pill("warn","not yet")}</p>${!E.closed&&ma.length?`<p class="small muted">To close: ${esc(ma.join(", "))}</p>`:""}</fieldset>`:""}
  <fieldset><legend>Report approval (P3.4.7)</legend><div class="fields">${mf("check.by","Approved by",{dis:lock,list:"tus-appr"})}${mf("check.date","Date",{type:"date",dis:lock})}${mf("check.remarks","Remarks",{wide:1,dis:lock})}</div>
    <datalist id="tus-appr">${approvers().map(a=>`<option value="${esc(a.name)}">${esc(a.src)}</option>`).join("")}</datalist>
    ${!lock&&rm.length?`<div class="banner" style="margin-top:8px"><b>To approve the report:</b> ${esc(rm.join(" · "))}</div>`:""}</fieldset>`;
  const foot=[!lock?`<button class="pri w" data-save-sv>Save</button><button class="w" data-appr-sv>Approve report</button>`:"",lock&&!E.closed?`<button class="w" data-unappr>Reopen report</button>`:"",
    k.res==="fail"&&!E.closed?`<button class="w" data-close-act>Close the reaction</button>`:"",known?`<button data-sv-print>Print F-TUS-02</button>`:"",known&&!approved(known)?`<button class="danger w" data-del-sv>Delete</button>`:"",`<button data-close>Close</button>`].join("");
  return sheet(esc(known?`${E.id} · ${E.furnace} ${E.chamber.toLowerCase()} ${E.sp} °C`:"New survey"),body,foot);}
function DRAW_RG(){const E=S.modal.ed,known=rgById(E.id),used=known&&S.surveys.some(t=>t.furnace===E.furnace&&t.chamber===E.chamber);
  return sheet(esc(known?`${E.id} · ${E.furnace} ${E.chamber.toLowerCase()}`:"New qualified range"),`<div class="fields">
    ${mf("furnace","Furnace",{opts:furnaces().map(f=>[f,f]),blank:1,req:1})}${mf("chamber","Chamber",{opts:CHAMBERS.map(c=>[c,c]),req:1})}${mf("lo","Lower limit (°C)",{req:1})}${mf("hi","Upper limit (°C)",{req:1})}
    ${mf("tol","Tolerance (± °C)",{req:1})}${mf("interval","Survey interval (days)",{req:1})}${mf("cls","Furnace class",{})}${mf("ref","Process Table reference (table, section 2.0 item, furnace class)",{wide:1,req:1})}${mf("note","Note (roles of the chamber over the span)",{wide:1})}
    <label class="chk"><input type="checkbox" data-rgact ${E.active!==false?"checked":""}> In use</label></div>`,
    `<button class="pri w" data-save-rg>Save</button>${known&&!used?`<button class="danger w" data-del-rg>Delete</button>`:""}<button data-close>Close</button>`);}
function DRAW_CHG(){const E=S.modal.ed,known=chById(E.id),s=chgState(E),miss=chgMissing(E);
  return sheet(esc(known?`${E.id} · ${E.furnace} ${E.chamber||"both chambers"}`:"Record a change that can alter uniformity"),`<p class="muted">${known?pill(...CST[s.st]):""} ${E.vref?`· from Process validation ${esc(E.vref)}`:""}</p><div class="fields">
    ${mf("date","Date",{type:"date",req:1})}${mf("furnace","Furnace",{opts:furnaces().map(f=>[f,f]),blank:1,req:1})}${mf("chamber","Chamber",{opts:[["","Both chambers"],...CHAMBERS.map(c=>[c,c])]})}${mf("kind","Kind",{opts:Object.entries(CKINDS)})}
    ${mf("what","What was done",{area:2,wide:1,req:1})}${mf("by","Recorded by",{req:1})}
    ${mf("need","Re-survey required?",{opts:[["yes","Yes: survey before production on the range"],["no","No"]],blank:1,req:1})}${E.need==="no"?mf("why","Why no re-survey is needed",{area:2,wide:1,req:1}):""}${mf("dBy","Decided by",{req:1})}${mf("dDate","Decision date",{type:"date",req:1})}</div>
    ${s.sv&&s.sv.length?`<p class="small">Surveys after the change: ${s.sv.map(x=>`<button class="link" data-open="${esc(x.id)}">${esc(x.id)} ${fmtD(x.date)}</button>`).join(", ")}</p>`:""}
    ${E.need==="yes"&&s.st!=="done"&&known?`<p><button data-new-sv-chg="${esc(E.id)}">Record the re-survey</button></p>`:""}
    ${miss.length?`<div class="banner" style="margin-top:8px"><b>To complete:</b> ${esc(miss.join(" · "))}</div>`:""}`,
    `<button class="pri w" data-save-chg>Save</button>${known&&!S.surveys.some(t=>t.chg===E.id)?`<button class="danger w" data-del-chg>Delete</button>`:""}${known?`<button data-chg-print>Print F-TUS-03</button>`:""}<button data-close>Close</button>`);}
function DRAW_PRINT(){return sheet(esc(S.modal.title),`<div id="jobcard">${S.modal.html()}</div>`,`<button class="pri" data-print>Print</button><button data-close>Close</button>`);}
const pHead=t=>`<p class="small muted">${esc(C().plant)} · ${esc(t)} · printed ${fmtD(today())}</p>`;
const kv=R=>`<div class="tw"><table><tbody>${R.map(([a,b])=>`<tr><td style="width:240px"><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>`;
function svHtml(t){const k=calc(t);S.ch={};
  return `${pHead("Temperature uniformity survey report (MWSPL-F-TUS-02, CQI-9 HTSA 3.4, P3.4.7)")}<h2>${esc(t.id)} · ${esc(t.furnace)} ${esc(t.chamber)} chamber · ${esc(t.sp)} °C${approved(t)?"":" · NOT APPROVED"}</h2>
  ${kv([["Kind",(KINDS[t.kind]||"")+(t.chg?" ("+t.chg+")":"")],["Date · start · reading interval",`${fmtD(t.date)} · ${t.start} · ${k.step} min`],["Qualified range · tolerance",k.rg?`${k.rg.lo}–${k.rg.hi} °C · ± ${k.tol} °C · ${k.rg.ref}`:"no covering range"],
    ["Method",METHODS[t.method]+(t.method==="alt"?` — ${t.alt.ref}; ${t.alt.why}; approved ${t.alt.appr} ${fmtD(t.alt.date)}`:"")],["Test instrument",`${t.instr} · serial ${t.instrSer} · calibration due ${fmtD(t.instrCal)}`],
    ["Survey thermocouples",`certificate ${t.tcCert} · calibration due ${fmtD(t.tcCal)}`],["Soak time (internal specification)",`${C().soakMin} min per ${C().soakRef||"—"} · covered ${k.soakCov} min`],
    ["Stabilised at reading",k.from!=null?String(k.from+1):"—"],["Highest reading at any time",k.peak?`${r1(k.peak.v)} °C (${sgn(k.peak.v-k.sp)}) · ${k.per[k.peak.j].tag} · reading ${k.peak.i+1}`:"—"],
    ["After stabilisation",k.hi!=null?`${sgn(k.under)} … ${sgn(k.over)} °C · spread ${r1(k.spread)} °C · hottest ${k.hot.tag} ${k.hot.loc} · coldest ${k.cold.tag} ${k.cold.loc}`:"—"],
    ["Multi-temperature exception",t.exc.on?t.exc.why:"no"],["Result",STATUS[status(t)][1]],["Findings",k.issues.map(i=>i.txt).join(" ")||"—"],["Notes / deviations",t.notes],["Performed by",t.by],["Approved by · date",approved(t)?`${t.check.by} · ${fmtD(t.check.date)}${t.check.remarks?" · "+t.check.remarks:""}`:"—"]])}
  ${tusChart(t,k,"p")}
  <h3>Survey thermocouples</h3><div class="tw"><table><thead><tr><th>#</th><th>Identification</th><th>Location</th><th>Correction</th><th>Peak</th><th>Min</th><th>Max</th></tr></thead><tbody>${k.per.map((p,j)=>`<tr><td>${j+1}</td><td>${esc(p.tag)}</td><td>${esc(p.loc)}</td><td>${p.corr==null?"—":sgn(p.corr)}</td><td>${p.peak==null?"—":r1(p.peak)}</td><td>${p.min==null?"—":r1(p.min)}</td><td>${p.max==null?"—":r1(p.max)}</td></tr>`).join("")}</tbody></table></div>
  <h3>Readings (as read)</h3><div class="tw"><table><thead><tr><th>#</th><th>Time</th>${t.tcs.map(c=>`<th>${esc(c.tag)}</th>`).join("")}</tr></thead><tbody>${t.rd.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(hm(t.start,i,k.step))}</td>${t.tcs.map((c,j)=>`<td>${esc(r[j]??"")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
  ${k.res==="fail"?kv([["Product at risk",riskTxt(t)],["Root cause",t.act.cause],["Corrective action",t.act.action],["Product impact",t.act.impact],["Owner · date",`${t.act.by} · ${fmtD(t.act.date)}`],["Re-survey",resurveyOf(t)?resurveyOf(t).id+" "+fmtD(resurveyOf(t).date):"not yet"]]):""}
  <p class="small" style="margin-top:14px">Signatures: performed ____________________ &nbsp; approved ____________________</p>`;}
function rgHtml(){return `${pHead("Qualified ranges and survey schedule (MWSPL-F-TUS-01)")}<div class="tw"><table><thead><tr><th>Furnace</th><th>Chamber</th><th>Range</th><th>Tol.</th><th>Interval</th><th>Reference</th><th>Lower end</th><th>Upper end</th><th>Due</th><th>Status</th></tr></thead><tbody>${S.ranges.filter(r=>r.active!==false).map(r=>{const s=rangeState(r),e=x=>x.pass?`${fmtD(x.pass.s.date)} ${x.pass.s.id}`:"—";return `<tr><td>${esc(r.furnace)}</td><td>${esc(r.chamber)}</td><td>${esc(r.lo)}–${esc(r.hi)} °C</td><td>± ${esc(r.tol)}</td><td>${esc(r.interval)} d</td><td>${esc(r.ref)}</td><td>${e(s.E.lo)}</td><td>${e(s.E.hi)}</td><td>${fmtD(s.due)}</td><td>${esc(RST[s.st][1])}</td></tr>`;}).join("")}</tbody></table></div>`;}
function chgHtml(c){const s=chgState(c);return `${pHead("Uniformity-affecting change record (MWSPL-F-TUS-03)")}<h2>${esc(c.id)}</h2>${kv([["Date · furnace · chamber",`${fmtD(c.date)} · ${c.furnace} · ${c.chamber||"both chambers"}`],["Kind",CKINDS[c.kind]||c.kind],["What was done",c.what],["Recorded by",c.by],["Process validation change",c.vref||"—"],["Re-survey required",c.need==="yes"?"yes":c.need==="no"?"no: "+c.why:"not decided"],["Decided by · date",`${c.dBy} · ${fmtD(c.dDate)}`],["Re-survey",CST[s.st][1]+(s.sv&&s.sv.length?" · "+s.sv.map(x=>x.id+" "+fmtD(x.date)).join(", "):"")]])}`;}
function h34Html(){const A=assess34(),sc=SCORE[A.score];
  return `${pHead("CQI-9 HTSA 3.4 evidence")}<p><span class="verdict ${sc[2]}">${sc[1]}</span></p>
  <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${esc(LV[i.lvl][1])}</td></tr>`).join("")}</tbody></table></div>
  <h3>Qualified ranges (F-TUS-01)</h3>${rgHtml().replace(/^<p[^>]*>.*?<\/p>/,"")}
  <h3>Changes that alter uniformity (F-TUS-03)</h3><div class="tw"><table><thead><tr><th>Change</th><th>Date</th><th>Furnace · chamber</th><th>Decision</th><th>Re-survey</th></tr></thead><tbody>${S.chgs.map(c=>`<tr><td>${esc(c.id)}</td><td>${fmtD(c.date)}</td><td>${esc(c.furnace)} ${esc(c.chamber||"both")}</td><td>${c.need==="yes"?"re-survey":c.need==="no"?"not needed: "+esc(c.why):"—"}</td><td>${esc(CST[chgState(c).st][1])}</td></tr>`).join("")||`<tr><td colspan="5">None.</td></tr>`}</tbody></table></div>`;}
const DRAW={sv:DRAW_SV,rg:DRAW_RG,chg:DRAW_CHG,print:DRAW_PRINT};

/* 10. actions */
async function saveSv(text){const E=fillSurvey(S.modal.ed),known=svById(E.id);
  if(!E.furnace||num(E.sp)==null){msg("Enter the furnace and the set value.");return false;}
  if(isDate(E.date)&&E.date>today()){msg("The survey date is in the future.");return false;}
  if(!known)E.id="TUS-"+String(maxNo(S.surveys)+1).padStart(4,"0");
  if(await put("surveys",E,text||(known?"Saved":"Recorded"))){S.modal.ed=clone(E);return true;}return false;}
async function saveChg(){const E=fillChg(S.modal.ed),known=chById(E.id);
  if(!isDate(E.date)||!E.furnace||!txt(E.what)){msg("Enter the date, the furnace and what was done.");return false;}if(E.date>today()){msg("The date is in the future.");return false;}
  if(isDate(E.dDate)&&E.dDate<E.date){msg("The decision is dated before the change.");return false;}
  if(!known)E.id="UC-"+String(maxNo(S.chgs)+1).padStart(4,"0");
  if(await put("changes",E,known?"Saved":"Recorded")){S.modal.ed=clone(E);return true;}return false;}
const defRanges=()=>furnaces().flatMap(f=>[{furnace:f,chamber:"Hardening",lo:"700",hi:"960",tol:String(C().tol),interval:String(C().interval),ref:"Process Table A / E, Section 2.0 〈confirm item and furnace class〉",note:"Preheat for normalizing (zone 1) to austenitizing"},
  {furnace:f,chamber:"Tempering",lo:"500",hi:"900",tol:String(C().tol),interval:String(C().interval),ref:"Process Table A / E, Section 2.0 〈confirm item and furnace class〉",note:"Tempering / isothermal hold to austenitizing for normalizing"}])
  .map((r,i)=>fillRange({id:"R-"+String(maxNo(S.ranges)+i+1).padStart(2,"0"),...r,log:[{d:today(),t:"Default range added"}]}));
async function addRanges(){if(!needDb())return;const L=defRanges().filter(r=>!rangesOf(r.furnace,r.chamber).length);if(!L.length){toast("Every chamber already has a range.");return;}await batchPut("ranges",L);toast(plural(L.length,"range")+" added");}
async function stdOps(){if(!needDb())return;if(S.ranges.length||S.surveys.length||S.chgs.length){toast("Only on an empty module.");return;}
  const td=today(),D=n=>addDays(td,n),ex=" (example)";let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};let no=0;
  await dbSet("config","settings",{...S.cfg,soakMin:30,soakRef:"MWSPL-QP-SPEC-01 §6 / process specifications: 30 min at temperature"+ex,approvers:"R. Sharma"+ex+"\nS. Gupta"+ex});S.cfg.soakMin=30;
  const R=defRanges().map(r=>({...r,cls:"〈confirm〉"}));
  const mk=(f,ch,sp,d,offs,o)=>{const m=22,rd=[];
    for(let i=0;i<m;i++){const warm=i<3?-(3-i)*5:0;rd.push(offs.map(c=>String(Math.round((sp+c+warm+(rnd()-.5)*2.4)*10)/10)));}
    no++;return fillSurvey({id:"TUS-"+String(no).padStart(4,"0"),furnace:f,chamber:ch,sp:String(sp),kind:"periodic",method:"std",date:D(-d),start:"09:00",step:"2",instr:"Data logger DL-04"+ex,instrSer:"DL04-1187",instrCal:D(120),tcCert:"TC-CERT-2291",tcCal:D(60),by:"Metrology"+ex,
      tcs:DEFLOC.map((l,j)=>({tag:"TUS-"+pad(j+1),loc:l,corr:j%3===1?"-0.4":"0.3"})),rd,notes:"Controller and recorder within 1 °C of the set value.",check:{by:"R. Sharma"+ex,date:D(-d),remarks:""},log:[{d:D(-d),t:"Survey recorded"+ex}],...(o||{})});};
  const ok=[-3,-1,1,-2,0,2,-1,1,3],V=[];
  V.push(mk("F-01","Hardening",700,200,ok),mk("F-01","Hardening",960,198,ok),mk("F-01","Tempering",500,190,ok),mk("F-01","Tempering",900,188,ok));
  V.push(mk("F-02","Hardening",700,350,ok),mk("F-02","Hardening",960,349,[-4,-2,0,-3,-1,2,-5,-3,1]),mk("F-02","Tempering",900,100,ok));
  /* F-02 tempering lower end: overshoot during heat-up above the upper tolerance → fails under HTSA 3.4 */
  const os=mk("F-02","Tempering",500,12,ok,{check:{by:"",date:"",remarks:""},notes:"Zone 1 overshoots after the door closes."+ex});os.rd[1]=os.rd[1].map((v,j)=>j===0?"513.6":v);V.push(os);
  V.push(mk("F-03","Hardening",700,40,ok),mk("F-03","Hardening",960,30,[-2,0,1,-3,-1,0,-6,-9,-13],{notes:"Zone 3 left wall reads low; burner 3L flame unstable."+ex,act:{cause:"Burner 3L air / gas ratio drifted; flame lifting."+ex,action:"",impact:"",by:"",date:""}}));
  V.push(mk("F-04","Hardening",700,400,ok),mk("F-04","Hardening",960,399,ok));
  const CH=[fillChg({id:"UC-0001",date:D(-20),furnace:"F-03",chamber:"Hardening",kind:"burner",what:"Burner 3L nozzle and air / gas ratio controller replaced after the failed survey TUS-0010."+ex,by:"K. Yadav"+ex,need:"yes",dBy:"R. Sharma"+ex,dDate:D(-20),log:[{d:D(-20),t:"Recorded"+ex}]}),
    fillChg({id:"UC-0002",date:D(-60),furnace:"F-01",chamber:"Hardening",kind:"door",what:"Entry door seal rope replaced like for like."+ex,by:"K. Yadav"+ex,need:"no",why:"Same seal; no change to burners, controls or zone layout; SCADA trend unchanged after the work."+ex,dBy:"R. Sharma"+ex,dDate:D(-60),log:[{d:D(-60),t:"Recorded"+ex}]})];
  await batchPut("ranges",R);await batchPut("surveys",V);await batchPut("changes",CH);toast("Starter set-up loaded");render();}
/* import CALOR's TUS register (tus-reg): ranges, surveys with readings */
async function calorImport(){if(!needDb())return;const D=MWS.calor&&MWS.calor.get?MWS.calor.get("tus-reg"):null;if(!D||!Array.isArray(D.surveys)){toast("CALOR's TUS register is not available.");return;}
  const R=arr(D.ranges).filter(r=>r&&r.id).map(r=>fillRange({...r,lo:String(r.lo),hi:String(r.hi),tol:String(r.tol),interval:String(r.interval),ref:r.ref||"",log:[{d:today(),t:"Imported from CALOR"}]}));
  const M={"Periodic":"periodic","Initial":"initial","After repair / rebuild":"change","After control thermocouple relocation":"change","Re-survey after failure":"resurvey"};
  const V=D.surveys.filter(t=>t&&t.id&&ID_RE.test(t.id)).map(t=>fillSurvey({...t,kind:M[t.kind]||"periodic",method:/^Travelling/.test(t.method||"")?"travel":"std",instrSer:t.instrSer||"",step:String(t.step||C().step),stab:t.stab?String(t.stab):"",rd:arr(t.rd).map(r=>arr(r).map(v=>v==null?"":String(v))),check:{by:(t.check||{}).by||"",date:(t.check||{}).date||"",remarks:(t.check||{}).remarks||""},log:[...arr(t.log),{d:today(),t:"Imported from CALOR"}]}));
  await batchPut("ranges",R.filter(r=>!rgById(r.id)));await batchPut("surveys",V.filter(t=>!svById(t.id)));toast(`Imported ${plural(R.filter(r=>!rgById(r.id)).length,"range")} and ${plural(V.filter(t=>!svById(t.id)).length,"survey")}`);}
function armedDelete(b,fn){if(b.classList.contains("armed")){fn();return;}b.classList.add("armed");const t=b.textContent;b.textContent="Confirm";setTimeout(()=>{if(b.isConnected){b.classList.remove("armed");b.textContent=t;}},4000);}
async function download(name,text,type){
  if(S.dl){try{await S.dl.save({filename:name,data:new Blob([text],{type})});return;}catch(e){if(e&&e.code==="declined")return;}}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
const exportJson=()=>download(`mws-tus-${today()}.json`,JSON.stringify({app:"mws-tus-manager",v:1,saved:new Date().toISOString(),ranges:S.ranges,surveys:S.surveys,changes:S.chgs,config:S.cfg},null,1),"application/json");
const csvQ=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
const csv=()=>download(`mws-tus-surveys-${today()}.csv`,"﻿"+[["Survey","Date","Furnace","Chamber","Set value","Kind","Method","Tolerance","Highest any time","Min after stab.","Max after stab.","Result","Report approved"],
  ...S.surveys.map(t=>{const k=calc(t);return [t.id,t.date,t.furnace,t.chamber,t.sp,KINDS[t.kind],METHODS[t.method],k.tol,k.peak?r1(k.peak.v-k.sp):"",k.hi!=null?r1(k.under):"",k.hi!=null?r1(k.over):"",STATUS[status(t)][1],approved(t)?t.check.date:""];})].map(r=>r.map(csvQ).join(",")).join("\r\n"),"text/csv");
function readImport(f){f.text().then(t=>{let o;try{o=JSON.parse(t);}catch(e){toast("Not a JSON file");return;}
  if(!o||o.app!=="mws-tus-manager"||!Array.isArray(o.surveys)){toast("Not an export of this module");return;}
  const ok=L=>arr(L).filter(x=>x&&ID_RE.test(String(x.id||"")));
  S.imp={ranges:ok(o.ranges).map(fillRange),surveys:ok(o.surveys).map(fillSurvey),changes:ok(o.changes).map(fillChg),config:o.config||null,msg:`${f.name}: ${plural(ok(o.ranges).length,"range")}, ${plural(ok(o.surveys).length,"survey")}, ${plural(ok(o.changes).length,"change")}.`};render();});}
async function doImport(mode){if(!S.imp||!needDb())return;const I=S.imp;S.imp=null;
  if(mode==="replace"){for(const x of S.ranges)if(!I.ranges.some(y=>y.id===x.id))await dbDel("ranges",x.id);for(const x of S.surveys)if(!I.surveys.some(y=>y.id===x.id))await dbDel("surveys",x.id);for(const x of S.chgs)if(!I.changes.some(y=>y.id===x.id))await dbDel("changes",x.id);}
  await batchPut("ranges",I.ranges);await batchPut("surveys",I.surveys);await batchPut("changes",I.changes);
  if(I.config){const c={...DEF,...I.config};delete c.id;await dbSet("config","settings",c);}toast("Imported ("+mode+")");render();}
async function clearAll(){if(($("#clrtxt")||{}).value!=="CLEAR ALL"){toast("Type CLEAR ALL to clear");return;}if(!needDb())return;
  for(const x of S.ranges)await dbDel("ranges",x.id);for(const x of S.surveys)await dbDel("surveys",x.id);for(const x of S.chgs)await dbDel("changes",x.id);await dbDel("config","settings");toast("All TUS data cleared");}

/* 11. wiring */
onDoc("click",async e=>{
  const b=e.target.closest("button,tr.click,a[data-docref]");if(!b)return;const d=b.dataset;
  if(b.closest("#modal")||d.close!==undefined){
    if(d.close!==undefined){closeModal();return;}
    const m=S.modal;
    if(d.saveSv!==undefined){if(await saveSv()){redraw();msg("Saved.",1);}return;}
    if(d.apprSv!==undefined){const E=fillSurvey(m.ed),miss=repMissing(E);if(!txt(E.check.by)||!isDate(E.check.date))miss.push("approved by and date");else{if(!isApprover(E.check.by))miss.push(`approved by a person allowed to approve (${approvers().map(a=>a.name).join(", ")})`);if(isDate(E.date)&&E.check.date<E.date)miss.push("approval not before the survey");if(E.check.date>today())miss.push("approval not in the future");}
      if(miss.length){msg("To approve: "+miss.join(", ")+".");return;}if(await saveSv(`Report approved by ${E.check.by}`)){redraw();msg("Report approved.",1);}return;}
    if(d.unappr!==undefined){armedDelete(b,async()=>{const by=m.ed.check.by;m.ed.check={by:"",date:"",remarks:m.ed.check.remarks};if(await saveSv("Report reopened (was approved by "+by+")")){redraw();msg("Report reopened.",1);}});return;}
    if(d.closeAct!==undefined){const miss=missingAct(fillSurvey(m.ed));if(miss.length){msg("To close: "+miss.join(", ")+".");return;}m.ed.closed=true;if(await saveSv("Reaction closed")){redraw();msg("Reaction closed.",1);}return;}
    if(d.tcadd!==undefined){m.ed.tcs.push({tag:"TUS-"+pad(m.ed.tcs.length+1),loc:"",corr:"0"});redraw();return;}
    if(d.tcdel!==undefined){m.ed.tcs.splice(+d.tcdel,1);m.ed.rd=m.ed.rd.map(r=>r.filter((_,j)=>j!==+d.tcdel));m.rdt=rdText(fillSurvey(m.ed));redraw();return;}
    if(d.svPrint!==undefined){const t=fillSurvey(m.ed);openModal({kind:"print",title:"TUS report · "+t.id,html:()=>svHtml(t)});return;}
    if(d.delSv!==undefined){armedDelete(b,async()=>{await dbDel("surveys",m.ed.id);toast("Deleted");closeModal();});return;}
    if(d.saveRg!==undefined){const E=fillRange(m.ed);if(!E.furnace||num(E.lo)==null||num(E.hi)==null||num(E.hi)<=num(E.lo)){msg("Enter the furnace and a lower limit below the upper limit.");return;}
      if(!rgById(E.id))E.id="R-"+String(maxNo(S.ranges)+1).padStart(2,"0");if(await put("ranges",E,rgById(E.id)?"Saved":"Added")){toast("Range saved");closeModal();}return;}
    if(d.delRg!==undefined){armedDelete(b,async()=>{await dbDel("ranges",m.ed.id);toast("Deleted");closeModal();});return;}
    if(d.saveChg!==undefined){if(await saveChg()){redraw();msg("Saved.",1);}return;}
    if(d.delChg!==undefined){armedDelete(b,async()=>{await dbDel("changes",m.ed.id);toast("Deleted");closeModal();});return;}
    if(d.chgPrint!==undefined){const c=fillChg(m.ed);openModal({kind:"print",title:"Uniformity change record · "+c.id,html:()=>chgHtml(c)});return;}
    if(d.newSvChg){const c=chById(d.newSvChg);svModal(null,{furnace:c.furnace,chamber:c.chamber||"Hardening",kind:"change",chg:c.id});return;}
    if(d.open){svModal(d.open);return;}
    if(d.print!==undefined){document.body.classList.add("pm");window.print();setTimeout(()=>document.body.classList.remove("pm"),500);return;}
    return;
  }
  if(d.open){svModal(d.open);return;}
  if(d.newSv!==undefined){if(!needDb())return;const r=rgById(d.newSv);if(r){const s=rangeState(r),end=!s.E.lo.pass||s.E.lo.latest&&s.E.lo.latest.k.res==="fail"?r.lo:r.hi;svModal(null,{furnace:r.furnace,chamber:r.chamber,sp:String(end),kind:s.st==="fail"?"resurvey":s.st==="none"?"initial":"periodic"});}else svModal(null);return;}
  if(d.openRg){openModal({kind:"rg",ed:clone(rgById(d.openRg)),msg:""});return;}
  if(d.newRg!==undefined){if(needDb())openModal({kind:"rg",ed:fillRange({tol:String(C().tol),interval:String(C().interval)}),msg:""});return;}
  if(d.addRanges!==undefined){addRanges();return;}
  if(d.openChg){openModal({kind:"chg",ed:clone(chById(d.openChg)),msg:""});return;}
  if(d.newChg!==undefined){if(needDb())openModal({kind:"chg",ed:fillChg({date:today()}),msg:""});return;}
  if(d.fromValid){if(!needDb())return;const v=validPending().find(x=>x.id===d.fromValid);if(v)openModal({kind:"chg",ed:fillChg({date:v.date,furnace:v.furnace,chamber:v.chambers.length===1?v.chambers[0]:"",kind:v.equip.includes("comb")?"burner":v.equip.includes("ctrl")?"ctrl":"repair",what:`${v.kindTxt}: ${v.what}`,vref:v.id}),msg:""});return;}
  if(d.rgprint!==undefined){openModal({kind:"print",title:"Qualified ranges and schedule",html:rgHtml});return;}
  if(d.h34!==undefined){openModal({kind:"print",title:"HTSA 3.4 evidence",html:h34Html});return;}
  if(d.goset!==undefined){location.hash="#settings";return;}
  if(d.std!==undefined){stdOps();return;}
  if(d.calor!==undefined){calorImport();return;}
  if(d.saveCfg!==undefined){document.querySelectorAll("[data-cfg]").forEach(i=>{const k=i.dataset.cfg,t=(SETF.find(x=>x[0]===k)||[])[2];S.cfg[k]=t==="number"?(num(i.value)>=0&&i.value!==""?num(i.value):DEF[k]):i.value;});saveCfg();return;}
  if(d.doc){S.docSel=d.doc;render();return;}
  if(d.docref){e.preventDefault();const p=DOCS.find(x=>x[0].endsWith(d.docref.replace(/^(\.\.\/)+/,"").replace(/^\.\//,"")));if(p){S.docSel=p[0];location.hash="#docs";render();}return;}
  if(d.export!==undefined){exportJson();return;}if(d.csv!==undefined){csv();return;}
  if(d.imp){if(d.imp==="cancel"){S.imp=null;render();}else doImport(d.imp);return;}
  if(d.clear!==undefined){armedDelete(b,clearAll);return;}
});
const live=()=>{const el=$("#tusres");if(el&&S.modal&&S.modal.ed){S.ch={};el.innerHTML=resHtml(fillSurvey(S.modal.ed));}};
onDoc("input",e=>{const el=e.target;if(!(S.modal&&S.modal.ed))return;const E=S.modal.ed;
  if(el.id==="m-rdtxt"){S.modal.rdt=el.value;E.rd=parseRd(el.value,E.tcs.length);live();return;}
  if(el.dataset.tcr){const [j,f]=el.dataset.tcr.split(".");E.tcs[+j][f]=el.value;live();return;}
  if(el.dataset.p&&el.tagName!=="SELECT"){setp(E,el.dataset.p,el.value);if(/^(sp|stab|step|start|instrCal|tcCal|date|exc\.why)$/.test(el.dataset.p))live();}});
onDoc("change",e=>{const el=e.target;
  if(S.modal&&S.modal.ed){const E=S.modal.ed;
    if(el.dataset.exc!==undefined){E.exc.on=el.checked;redraw();return;}
    if(el.dataset.rgact!==undefined){E.active=el.checked;return;}
    if(el.dataset.p&&el.tagName==="SELECT"){setp(E,el.dataset.p,el.value);redraw();return;}}
  if(el.dataset.filt){S.filt[el.dataset.filt]=el.value;render();return;}
  if(el.id==="impfile"&&el.files[0]){readImport(el.files[0]);el.value="";}});
onDoc("keydown",e=>{if(e.key==="Escape"&&S.modal)closeModal();});
onWin("hashchange",()=>{route();S.pending=false;render();window.scrollTo(0,0);});

/* 12. integration API */
MWS.tus={closeModal,
  refresh:()=>safeRender(),
  /* the qualified ranges of a chamber with their state on a day (Process validation, equipment) */
  statusAt:(f,ch,day)=>rangesOf(f,ch).map(r=>{const s=rangeState(r,day);return {id:r.id,lo:num(r.lo),hi:num(r.hi),tol:num(r.tol),st:s.st,label:RST[s.st][1],due:s.due||""};}),
  hasData:()=>S.ranges.length+S.surveys.length>0,
  stats:()=>{const k=kp();return {db:S.dbState,...k,label:SCORE[k.score][1],cls:SCORE[k.score][0]};},
  summary:()=>{const k=kp();return `${k.ok} of ${plural(k.ranges,"qualified range")} in date, ${plural(k.open,"failed survey")} open, ${plural(k.chgOpen,"change")} to close, ${plural(k.toApprove,"report")} to approve; HTSA 3.4 ${SCORE[k.score][1].toLowerCase()}.`;}};
window.__TUSM={S,calc,rangeState,repMissing,missingAct,chgState,chgMissing,validPending,assess34,parseRd,kp};

/* 13. boot */
async function boot(){
  route();render();
  const [dl,user,db]=await Promise.all([useCap("downloads"),useCap("user"),useCap("db")]);
  S.dl=dl;
  if(user){try{const c=await user.can("data.write");S.canWrite=c!==false;}catch(e){}}
  if(db)startStore(sharedDb(db),"on");else startStore(localDb(),"local");
}
boot();
