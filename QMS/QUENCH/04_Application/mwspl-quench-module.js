/* Module QUENCH: quench media analysis (CQI-9 HTSA 3.14). Runs inside the shell: ACTIVE, onDoc, onWin, MWS and `location` come from the
   wrapper (build.py). The rules are copied from CALOR's Quench_Media_Testing.html; the test plan adds the source of each tolerance
   (supplier or heat treater) and every test record its review. */

/* 1. collection prefix (shared store only) */
const NS=c=>S.db&&S.db.local?c:"quench-"+c;

/* 2. constants */
const ID_RE=/^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const LKEY="mws-quench-local-v1";
const MEDIA={oil:"Quench oil",polymer:"Polymer quenchant",water:"Water / brine"};
const SRC={supplier:"Quench medium supplier",ht:"Heat treater"};
/* test plan: m = quenchant, k = parameter key, kind "ok" = OK / not OK check, f = frequency in days, lo / hi = limits, d = decimals,
   lab = laboratory analysis (report no. expected). Typical values, to be confirmed against the controlled CQI-9 copy and the supplier's data sheet. */
const DEF_PLAN=[
  {m:"oil",k:"temp",n:"Oil temperature",u:"°C",method:"Tank indicator, checked with a calibrated thermometer",f:1,lo:50,hi:80,d:0},
  {m:"oil",k:"level",n:"Oil level within the marks",kind:"ok",method:"Visual",f:1},
  {m:"oil",k:"agit",n:"Agitation / circulation working",kind:"ok",method:"Visual: agitator and pump running",f:1},
  {m:"oil",k:"water",n:"Water content",u:"%",method:"Karl Fischer (crackle test as screening)",f:7,lo:"",hi:0.1,d:2,lab:true},
  {m:"oil",k:"visc",n:"Kinematic viscosity at 40 °C",u:"mm²/s",method:"ASTM D445 (laboratory)",f:90,lo:18,hi:26,d:1,lab:true},
  {m:"oil",k:"flash",n:"Flash point (open cup)",u:"°C",method:"ASTM D92 (laboratory)",f:90,lo:180,hi:"",d:0,lab:true},
  {m:"oil",k:"tan",n:"Total acid number",u:"mg KOH/g",method:"ASTM D664 (laboratory)",f:90,lo:"",hi:1,d:2,lab:true},
  {m:"oil",k:"sludge",n:"Precipitation number (sludge)",u:"mL",method:"ASTM D91 (laboratory)",f:90,lo:"",hi:0.5,d:2,lab:true},
  {m:"oil",k:"cmax",n:"Cooling curve: maximum cooling rate",u:"°C/s",method:"ISO 9950 / ASTM D6200 (laboratory)",f:180,lo:70,hi:"",d:0,lab:true},
  {m:"oil",k:"tmax",n:"Cooling curve: temperature at maximum rate",u:"°C",method:"ISO 9950 / ASTM D6200 (laboratory)",f:180,lo:500,hi:700,d:0,lab:true},
  {m:"oil",k:"c300",n:"Cooling curve: cooling rate at 300 °C",u:"°C/s",method:"ISO 9950 / ASTM D6200 (laboratory)",f:180,lo:"",hi:15,d:1,lab:true},
  {m:"polymer",k:"temp",n:"Quenchant temperature",u:"°C",method:"Tank indicator, checked with a calibrated thermometer",f:1,lo:20,hi:45,d:0},
  {m:"polymer",k:"agit",n:"Agitation / circulation working",kind:"ok",method:"Visual: agitator and pump running",f:1},
  {m:"polymer",k:"conc",n:"Concentration",u:"%",method:"Refractometer (with the supplier's factor)",f:1,lo:8,hi:14,d:1},
  {m:"polymer",k:"contam",n:"Free of oil, scale and foam",kind:"ok",method:"Visual",f:7},
  {m:"polymer",k:"ph",n:"pH",u:"",method:"pH meter",f:30,lo:8,hi:10,d:1},
  {m:"polymer",k:"cmax",n:"Cooling curve: maximum cooling rate",u:"°C/s",method:"ISO 9950 / ASTM D6482 (laboratory)",f:180,lo:"",hi:"",d:0,lab:true},
  {m:"polymer",k:"c300",n:"Cooling curve: cooling rate at 300 °C",u:"°C/s",method:"ISO 9950 / ASTM D6482 (laboratory)",f:180,lo:"",hi:"",d:1,lab:true},
  {m:"water",k:"temp",n:"Water temperature",u:"°C",method:"Tank indicator, checked with a calibrated thermometer",f:1,lo:"",hi:35,d:0},
  {m:"water",k:"agit",n:"Agitation / circulation working",kind:"ok",method:"Visual: agitator and pump running",f:1},
  {m:"water",k:"contam",n:"Free of oil, scale and foam",kind:"ok",method:"Visual",f:7},
  {m:"water",k:"salt",n:"Salt concentration (brine only)",u:"%",method:"Hydrometer / refractometer",f:7,lo:"",hi:"",d:1,on:false}];
/* the characteristics Process Table Section 5.0 asks for per quenchant (any one key of a group counts); to confirm against the controlled copy */
const REQ={oil:[["Cooling curve",["cmax","tmax","c300"]],["Water content",["water"]]],polymer:[["Concentration",["conc"]],["Cooling curve",["cmax","c300"]]],
  water:[["Temperature",["temp"]],["Contamination",["contam"]]]};
const CONTAIN=["Product of the window held and segregated for evaluation","Quenching stopped until the quenchant is corrected","No product quenched since the last passing result","Other (see details)"];
const ACTIONS=["Top up with fresh quenchant","Remove water (heat out, settle and drain, or centrifuge)","Filter the quenchant / remove sludge","Adjust concentration (add polymer or water)",
  "Replace the quenchant charge","Repair temperature control (heating / cooling)","Repair agitation / circulation","Remove contamination (skim oil, scale, foreign matter)","Other (see details)"];
const DEF={plant:"Mass Wire and Steels Pvt. Ltd. · Bhiwadi",furnaces:"F-01, F-02, F-03, F-04",warnPct:10,soonDays:7,reviewDays:2,planDays:365};
const SETF=[["plant","Plant","text"],["furnaces","Furnaces","text"],["warnPct","\"Close to a limit\" within % of the tolerance band","number"],["soonDays","Show a test as due this many days before","number"],
  ["reviewDays","Review each result within (days)","number"],["planDays","Review the test plan every (days)","number"]];
const DOCS=[
  ["QUENCH/00_QUENCH_Master_List.md","Master list"],
  ["QUENCH/01_Procedure/MWSPL-QP-QM-01_Quench_Media_Analysis.md","MWSPL-QP-QM-01 Quench media analysis"],
  ["QUENCH/02_Work_Instructions/MWSPL-WI-QM-01_Sampling_and_In-house_Checks.md","MWSPL-WI-QM-01 Sampling and in-house checks"],
  ["QUENCH/02_Work_Instructions/MWSPL-WI-QM-02_Laboratory_Analysis_Review_and_Reaction.md","MWSPL-WI-QM-02 Laboratory analysis, review and reaction"],
  ["QUENCH/03_Formats/MWSPL-F-QM-01_Quench_Media_Test_Plan.md","MWSPL-F-QM-01 Test plan"],
  ["QUENCH/03_Formats/MWSPL-F-QM-02_Quench_Media_Test_Record.md","MWSPL-F-QM-02 Test record"],
  ["QUENCH/04_Application/mwspl-quench-module.md","Module description"]];

/* 3. helpers */
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{if(v===""||v==null)return null;const n=Number(String(v).replace(",","."));return isFinite(n)?n:null;};
const txt=v=>String(v??"").trim();
const clone=o=>JSON.parse(JSON.stringify(o??null));
const pad=n=>String(n).padStart(2,"0");
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>iso(new Date());
const nowTime=()=>{const d=new Date();return pad(d.getHours())+":"+pad(d.getMinutes());};
const isDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||""));
const dnum=s=>isDate(s)?Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/864e5:NaN;
const dstr=n=>new Date(n*864e5).toISOString().slice(0,10);
const addDays=(s,n)=>dstr(dnum(s)+n);
const daysBetween=(a,b)=>dnum(b)-dnum(a);
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtD=s=>isDate(s)?`${s.slice(8,10)}-${MON[+s.slice(5,7)-1]}-${s.slice(0,4)}`:"—";
const getp=(o,p)=>p.split(".").reduce((a,k)=>a==null?a:a[k],o);
const setp=(o,p,v)=>{const k=p.split(".");let a=o;k.slice(0,-1).forEach(x=>{if(a[x]==null||typeof a[x]!=="object")a[x]={};a=a[x];});a[k.at(-1)]=v;};
const pill=(c,t)=>`<span class="pill ${c||""}">${esc(t)}</span>`;
const plural=(n,w,p)=>`${n} ${n===1?w:(p||w+"s")}`;
const maxNo=L=>Math.max(0,...L.map(x=>+(String(x.id).match(/(\d+)$/)||[0,0])[1]));
const arr=v=>Array.isArray(v)?v:[];
const has=v=>v!==""&&v!=null;
const fNo=s=>{const m=String(s||"").match(/(\d+)/);return m?"F-"+pad(+m[1]):"";};

/* 4. state */
const S={view:"dash",db:null,dbState:"connecting",canWrite:true,dl:null,tanks:[],tests:[],cfg:{...DEF},plan:null,docSel:DOCS[0][0],imp:null,modal:null,pending:false,unsub:[],q:{},filt:{tank:""}};
const C=()=>S.cfg;
const blankPlan=()=>({items:DEF_PLAN.map(p=>({lo:"",hi:"",u:"",d:1,kind:"",lab:false,src:"",ref:"",...p,on:p.on!==false})),rev:0,appr:"",apprDate:"",dirty:false,log:[]});

/* 5. domain logic */
function fillTank(o){return {id:"",furnace:"",name:"",media:"oil",product:"",supplier:"",capacity:"",charged:"",active:true,notes:"",log:[],...(o||{}),log:arr(o&&o.log)};}
function fillTest(o){const x={id:"",tank:"",date:"",time:"",by:"",lab:"",report:"",vals:{},notes:"",check:{by:"",date:"",remarks:""},act:{contain:"",cause:"",action:"",detail:"",impact:"",by:"",date:""},closed:false,log:[],...(o||{})};
  x.vals={...(x.vals||{})};x.check={by:"",date:"",remarks:"",...(o&&o.check||{})};x.act={contain:"",cause:"",action:"",detail:"",impact:"",by:"",date:"",...(o&&o.act||{})};x.log=arr(x.log);return x;}
const PL=()=>S.plan||blankPlan();
const tankById=id=>S.tanks.find(t=>t.id===id)||null;
const tName=id=>{const t=tankById(id);return t?`${t.id} · ${t.furnace}`:id||"—";};
const planOf=m=>PL().items.filter(p=>p.m===m&&p.on!==false);
const param=(m,k)=>PL().items.find(p=>p.m===m&&p.k===k)||null;
const tsKey=t=>(t.date||"")+" "+(t.time||"00:00");
const byTime=(a,b)=>tsKey(a)<tsKey(b)?-1:tsKey(a)>tsKey(b)?1:0;
const testsOf=id=>S.tests.filter(t=>t.tank===id).sort(byTime);
const active=()=>S.tanks.filter(t=>t.active!==false);
const freqTxt=f=>({1:"daily",7:"weekly",14:"fortnightly",30:"monthly",90:"quarterly",180:"half-yearly",365:"yearly"}[+f]||`every ${f} days`);
const limTxt=p=>{if(p.kind==="ok")return "OK";const lo=num(p.lo),hi=num(p.hi),u=p.u?" "+p.u:"";
  return lo!=null&&hi!=null?`${lo} – ${hi}${u}`:lo!=null?`≥ ${lo}${u}`:hi!=null?`≤ ${hi}${u}`:"not set";};
const valTxt=(p,v)=>!has(v)?"—":p.kind==="ok"?(v==="ok"?"OK":v==="nok"?"Not OK":v):(num(v)!=null?(+v).toFixed(p.d??1)+(p.u?" "+p.u:""):String(v));
function judge(p,v){
  if(!p||!has(v))return null;
  if(p.kind==="ok")return v==="ok"?"pass":v==="nok"?"fail":null;
  const x=num(v);if(x==null)return null;
  const lo=num(p.lo),hi=num(p.hi);if(lo==null&&hi==null)return "info";
  if((lo!=null&&x<lo)||(hi!=null&&x>hi))return "fail";
  const w=(+C().warnPct||0)/100,m=lo!=null&&hi!=null?(hi-lo)*w:Math.abs(lo!=null?lo:hi)*w;
  if(w&&((lo!=null&&x<lo+m)||(hi!=null&&x>hi-m)))return "warn";
  return "pass";}
const RES={pass:["ok","Within limits"],warn:["warn","Close to a limit"],fail:["bad","Out of limits"],info:["acc","Recorded"]};
const okRes=j=>j==="pass"||j==="warn"||j==="info";
function evalT(t){const tk=tankById(t.tank)||{},rows=[];
  Object.keys(t.vals||{}).forEach(k=>{const v=t.vals[k];if(!has(v))return;const p=param(tk.media,k);if(!p)return;rows.push({p,v,j:judge(p,v)});});
  const order=k=>PL().items.findIndex(p=>p.m===tk.media&&p.k===k);rows.sort((a,b)=>order(a.p.k)-order(b.p.k));
  const fails=rows.filter(r=>r.j==="fail"),warns=rows.filter(r=>r.j==="warn");
  return {rows,fails,warns,n:rows.length,lab:rows.some(r=>r.p.lab),res:!rows.length?null:fails.length?"fail":warns.length?"warn":"pass"};}
const retestOf=(t,k)=>{const tk=tankById(t.tank),p=tk&&param(tk.media,k);return p?testsOf(t.tank).find(x=>x.id!==t.id&&tsKey(x)>tsKey(t)&&okRes(judge(p,x.vals[k]))):null;};
const lastPassBefore=(t,k)=>{const tk=tankById(t.tank),p=tk&&param(tk.media,k);return p?testsOf(t.tank).filter(x=>x.id!==t.id&&tsKey(x)<tsKey(t)&&okRes(judge(p,x.vals[k]))).at(-1)||null:null;};
const riskTxt=(t,k)=>{const a=lastPassBefore(t,k),b=retestOf(t,k);
  return `${a?"from "+fmtD(a.date)+(a.time?" "+a.time:"")+" ("+a.id+", last passing result)":"from the start of the records (no earlier passing result)"} to ${b?fmtD(b.date)+(b.time?" "+b.time:"")+" ("+b.id+", passing re-test)":"the passing re-test (not yet done)"}`;};
/* gate of the reaction plan of a test with a value out of limits */
function missingAct(t){const E=evalT(t);if(!E.fails.length)return [];const a=t.act,m=[];
  if(!a.contain)m.push("containment");if(!txt(a.cause))m.push("root cause");if(!a.action)m.push("corrective action");if(!txt(a.impact))m.push("product-impact assessment");
  if(!txt(a.by))m.push("action owner");if(!isDate(a.date))m.push("action date");
  E.fails.forEach(r=>{if(!retestOf(t,r.p.k))m.push(`a passing re-test of ${r.p.n.toLowerCase()}`);});return m;}
const reviewed=t=>!!txt(t.check.by)&&isDate(t.check.date);
const reviewDue=t=>!reviewed(t)&&evalT(t).n>0;
const reviewLate=t=>reviewDue(t)&&addDays(t.date,+C().reviewDays||2)<today();
const status=t=>{const E=evalT(t);return !E.n?"empty":E.fails.length?(t.closed?"closed":"open"):E.warns.length?"warn":"pass";};
const STATUS={empty:["","No values"],pass:["ok","Within limits"],warn:["warn","Close to a limit"],open:["bad","Out of limits · reaction open"],closed:["ok","Out of limits · reaction closed"]};
/* schedule: next due date per tank and parameter */
function schedule(tk){const ts=testsOf(tk.id),td=today(),soon=+C().soonDays||7;
  return planOf(tk.media).map(p=>{const last=[...ts].reverse().find(x=>has(x.vals[p.k]));if(!last)return {p,st:"none"};
    const f=Math.max(1,+p.f||1),next=addDays(last.date,f),left=daysBetween(td,next),j=judge(p,last.vals[p.k]);
    const st=left<0?"overdue":left<=Math.min(soon,Math.floor(f/4))?"soon":"ok";return {p,last,v:last.vals[p.k],j,next,left,st};});}
function tankState(tk){const sc=schedule(tk),T=testsOf(tk.id),open=T.filter(t=>status(t)==="open");
  const overdue=sc.filter(r=>r.st==="overdue"),none=sc.filter(r=>r.st==="none"),soon=sc.filter(r=>r.st==="soon"&&+r.p.f>1),out=sc.filter(r=>r.j==="fail");
  const lab=T.filter(t=>evalT(t).lab).at(-1)||null,last=T.at(-1)||null,rLate=T.filter(reviewLate);
  const lvl=overdue.length||out.length||open.length||none.length||rLate.length?"crit":soon.length||T.some(reviewDue)?"warn":"good";
  return {sc,open,overdue,none,soon,out,lab,last,rLate,lvl};}
const LVL={crit:["bad","Action needed"],warn:["warn","Attention"],good:["ok","In order"]};
const SCH={none:["bad","Never tested"],overdue:["bad","Overdue"],soon:["warn","Due soon"],ok:["ok","In date"]};
const planDue=()=>isDate(PL().apprDate)?addDays(PL().apprDate,+C().planDays||365):null;

/* HTSA 3.14 */
const SCORE={s:["ok","Satisfactory","acc"],ns:["warn","Not satisfactory","cond"],nia:["bad","Needs immediate action","rej"]};
const LV={ok:["ok","Met"],warn:["warn","Attention"],crit:["bad","Not met"],info:["acc","Note"]};
function assess314(){
  const I=[],add=(lvl,req,ev,act)=>I.push({lvl,req,ev,act}),T=active(),pl=PL(),pd=planDue(),medias=[...new Set(T.map(t=>t.media))];
  /* the test plan: approved, reviewed */
  if(!T.length)add("crit","Quench tanks registered","No quench tank is registered.","Register the quench tanks (Tanks).");
  if(!isDate(pl.apprDate))add("crit","Documented test plan for the quenching media",`The test plan (${plural(pl.items.filter(p=>p.on!==false).length,"parameter")}) is not approved.`,"Approve the test plan (MWSPL-F-QM-01).");
  else add(pl.dirty||pd<today()?"warn":"ok","Documented test plan for the quenching media",`Test plan rev ${pl.rev}, approved ${fmtD(pl.apprDate)} by ${pl.appr}.${pl.dirty?" Changed since the approval.":pd<today()?` Plan review overdue since ${fmtD(pd)}.`:""}`,pl.dirty?"Approve the changed plan.":pd<today()?"Review and re-approve the plan.":"");
  /* the characteristics of Process Table Section 5.0 */
  const miss=medias.flatMap(m=>(REQ[m]||[]).filter(([,ks])=>!planOf(m).some(p=>ks.includes(p.k))).map(([n])=>`${MEDIA[m]}: ${n}`));
  add(!medias.length?"crit":miss.length?"crit":"ok","Analyzed for the quenching characteristics of the Process Table, Section 5.0",!medias.length?"No quenchant in use.":miss.length?`Not in the test plan: ${miss.join("; ")}.`:`${medias.map(m=>`${MEDIA[m]}: ${planOf(m).map(p=>p.n.replace(/ \(.*\)/,"")).join(", ")}`).join(" · ")}.`,
    miss.length?"Add these characteristics to the test plan (confirm against Process Table Section 5.0).":"");
  /* tolerances from the supplier or the heat treater */
  const used=medias.flatMap(m=>planOf(m)),noLim=used.filter(p=>p.kind!=="ok"&&num(p.lo)==null&&num(p.hi)==null),noSrc=used.filter(p=>!SRC[p.src]||(p.src==="supplier"&&!txt(p.ref)));
  add(noLim.length?"crit":noSrc.length?"warn":"ok","Tolerances specified by the quench medium supplier or the heat treater",[noLim.length?`No tolerance: ${noLim.map(p=>`${MEDIA[p.m]} ${p.n}`).join("; ")}.`:"",noSrc.length?`Source of the tolerance not recorded${noSrc.some(p=>p.src==="supplier")?" (or the supplier's reference missing)":""}: ${noSrc.slice(0,8).map(p=>`${MEDIA[p.m]} ${p.n}`).join("; ")}${noSrc.length>8?" …":""}.`:"",
    !noLim.length&&!noSrc.length?`${plural(used.length,"parameter")}: ${used.filter(p=>p.src==="supplier").length} from the supplier, ${used.filter(p=>p.src==="ht").length} set by the heat treater.`:""].filter(Boolean).join(" "),
    noLim.length?"Set the tolerance from the supplier's data sheet or the heat treater's own limit.":noSrc.length?"Record the source of each tolerance and the supplier's reference.":"");
  /* periodic analysis */
  const st=T.map(tk=>({tk,s:tankState(tk)})),over=st.flatMap(x=>x.s.overdue.concat(x.s.none).map(r=>`${x.tk.id} ${r.p.n} (${r.st==="none"?"never":"due "+fmtD(r.next)})`)),soon=st.flatMap(x=>x.s.soon.map(r=>`${x.tk.id} ${r.p.n}`));
  add(!T.length?"crit":over.length?"crit":soon.length?"warn":"ok","Quench medium analyzed periodically (frequency of the test plan)",!T.length?"No tank.":over.length?`Overdue / never tested: ${over.slice(0,8).join("; ")}${over.length>8?` … (${over.length})`:""}.`:soon.length?`Due soon: ${soon.join("; ")}.`:`Every parameter of every tank tested within its frequency.`,
    over.length?"Take the samples and run the analyses due (WI-QM-01).":"");
  /* reviewed and documented */
  const late=S.tests.filter(reviewLate),due=S.tests.filter(t=>reviewDue(t)&&!reviewLate(t)),noRep=S.tests.filter(t=>evalT(t).lab&&!txt(t.report));
  add(late.length?"crit":due.length||noRep.length?"warn":S.tests.length?"ok":"crit","Test results reviewed for conformance and documented",!S.tests.length?"No test recorded.":[late.length?`${plural(late.length,"result")} not reviewed within ${C().reviewDays} days: ${late.slice(0,6).map(t=>t.id).join(", ")}${late.length>6?" …":""}.`:"",due.length?`${plural(due.length,"result")} waiting for review.`:"",noRep.length?`${plural(noRep.length,"laboratory analysis","laboratory analyses")} without a report number: ${noRep.map(t=>t.id).join(", ")}.`:"",
    !late.length&&!due.length&&!noRep.length?`${plural(S.tests.length,"test")} recorded, each judged against its tolerance and reviewed.`:""].filter(Boolean).join(" "),late.length||due.length?"Review the results (WI-QM-02 §2).":noRep.length?"Record the laboratory report numbers.":"");
  /* reaction */
  const open=S.tests.filter(t=>status(t)==="open"),inc=open.filter(t=>missingAct(t).length);
  add(open.length?"crit":"ok","Reaction to results out of limits",open.length?`${plural(open.length,"test")} out of limits with the reaction open: ${open.map(t=>`${t.id} (${missingAct(t).length?missingAct(t).join(", "):"ready to close"})`).join("; ")}.`:`${plural(S.tests.filter(t=>status(t)==="closed").length,"out-of-limit result")} closed with a passing re-test.`,open.length?"Complete the reaction plan and the re-test (WI-QM-02 §3).":"");
  const crit=I.filter(i=>i.lvl==="crit").length;
  return {I,crit,st,score:!T.length||!S.tests.length||!isDate(pl.apprDate)?"nia":crit?"ns":"s"};}
function kp(){const H=assess314(),st=H.st;return {score:H.score,crit:H.crit,tanks:st.length,ok:st.filter(x=>x.s.lvl==="good").length,overdue:st.reduce((a,x)=>a+x.s.overdue.length+x.s.none.length,0),
  out:st.reduce((a,x)=>a+x.s.out.length,0),open:S.tests.filter(t=>status(t)==="open").length,reviews:S.tests.filter(reviewDue).length,reviewsLate:S.tests.filter(reviewLate).length,
  planOk:isDate(PL().apprDate)&&!PL().dirty,planRev:isDate(PL().apprDate)?PL().rev:null};}

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
async function savePlan(t){const p=clone(PL());if(t)p.log.push({d:today(),t});try{await dbSet("config","plan",p);S.plan=p;return true;}catch(e){toast("Not saved: "+errMsg(e));return false;}}
async function saveCfg(){if(!needDb())return;try{await dbSet("config","settings",S.cfg);toast("Settings saved");}catch(e){toast("Not saved: "+errMsg(e));}}
async function batchPut(c,L){for(let i=0;i<L.length;i+=8)await Promise.all(L.slice(i,i+8).map(o=>dbSet(c,o.id,o)));}
function startStore(store,state){
  S.unsub.forEach(u=>{try{u();}catch(e){}});S.db=store;S.dbState=state;
  S.unsub=[store.sub("tanks",L=>{S.tanks=L.map(fillTank).sort((a,b)=>a.id<b.id?-1:1);safeRender();}),
    store.sub("tests",L=>{S.tests=L.map(fillTest).sort(byTime);safeRender();}),
    store.sub("config",L=>{const c=L.find(x=>x.id==="settings"),p=L.find(x=>x.id==="plan");S.cfg={...DEF,...(c||{})};delete S.cfg.id;
      S.plan=p?{...blankPlan(),...p,items:arr(p.items).length?p.items:blankPlan().items,log:arr(p.log)}:null;if(S.plan)delete S.plan.id;safeRender();})];
  render();
}
function safeRender(){
  const a=document.activeElement;if(S.modal||(a&&$("#main")&&$("#main").contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=true;return;}
  render();
}
onDoc("focusout",()=>setTimeout(()=>{if(S.pending&&!S.modal){const a=document.activeElement;if(!(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=false;render();}}},0));

/* 7. navigation */
const NAV=[["",[["dash","Dashboard"]]],["P",[["tanks","Tanks"],["plan","Test plan"]]],["D",[["tests","Test records"]]],["C",[["sched","Schedule & trends"],["review","HTSA 3.14"]]],["A",[["act","Reviews & reactions"]]],
  ["",[["settings","Settings"],["rules","Rules"],["docs","Docs"],["data","Data"]]]];
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
const planPill=()=>{const p=PL(),pd=planDue();return !isDate(p.apprDate)?pill("bad","Not approved"):p.dirty?pill("warn",`Rev ${p.rev} · changed since the approval`):pd<today()?pill("warn",`Rev ${p.rev} · plan review overdue`):pill("ok",`Rev ${p.rev} approved ${fmtD(p.apprDate)}`);};
const resPill=t=>pill(...STATUS[status(t)]);
function attention(){const out=[];
  if(!isDate(PL().apprDate))out.push(["data-planappr","The test plan is not approved","bad"]);else if(PL().dirty)out.push(["data-planappr","The test plan changed since its approval","warn"]);
  S.tests.filter(t=>status(t)==="open").forEach(t=>out.push([`data-open="${esc(t.id)}"`,`${t.id} ${tName(t.tank)}: out of limits (${evalT(t).fails.map(r=>r.p.n).join(", ")}), reaction open`,"bad"]));
  active().forEach(tk=>{const s=tankState(tk);s.overdue.concat(s.none).forEach(r=>out.push([`data-newtest="${esc(tk.id)}"`,`${tk.id} ${tk.furnace}: ${r.p.n} ${r.st==="none"?"never tested":"overdue since "+fmtD(r.next)}`,"bad"]));});
  S.tests.filter(reviewLate).slice(0,6).forEach(t=>out.push([`data-open="${esc(t.id)}"`,`${t.id} ${tName(t.tank)} ${fmtD(t.date)}: result not reviewed`,"bad"]));
  return out;}
function vDash(){
  if(!S.tanks.length)return `<div class="empty"><h2>No quench tanks registered yet</h2><p>Register the quench tanks (F-01 water, F-02 oil), confirm and approve the test plan, then record the checks and the laboratory analyses. The starter set-up shows how the module works.</p><div class="row" style="justify-content:center"><button class="pri w" data-new-tank>Register a tank</button><button class="w" data-std>Load starter set-up</button></div></div>`;
  const H=assess314(),sc=SCORE[H.score],k=kp(),att=attention();
  return `<div class="tiles">
    <a class="tile ${sc[0]}" href="#review"><span class="k">HTSA 3.14</span><span class="v" style="font-size:20px;padding:6px 0">${sc[1]}</span><span class="small muted">${plural(H.crit,"item")} not met</span></a>
    <a class="tile ${k.ok===k.tanks?"ok":"bad"}" href="#sched"><span class="k">Tanks in order</span><span class="v">${k.ok}/${k.tanks}</span><span class="small muted">active quench tanks</span></a>
    <a class="tile ${k.overdue?"bad":"ok"}" href="#sched"><span class="k">Tests overdue / never</span><span class="v">${k.overdue}</span><span class="small muted">parameters</span></a>
    <a class="tile ${k.out||k.open?"bad":"ok"}" href="#act"><span class="k">Out of limits</span><span class="v">${k.out}</span><span class="small muted">${plural(k.open,"reaction")} open</span></a>
    <a class="tile ${k.reviewsLate?"bad":k.reviews?"warn":"ok"}" href="#act"><span class="k">Results to review</span><span class="v">${k.reviews}</span><span class="small muted">${k.reviewsLate} late</span></a>
    <a class="tile ${k.planOk?"ok":"warn"}" href="#plan"><span class="k">Test plan</span><span class="v">${k.planRev!=null?"Rev "+k.planRev:"—"}</span><span class="small muted">${k.planOk?"approved":isDate(PL().apprDate)?"changed since the approval":"not approved"}</span></a></div>
  <div class="grid2"><div class="panel"><div class="row between"><h3>Needs attention</h3><button class="pri w" data-newtest>Record a test</button></div>
    ${att.length?`<ul class="issues">${att.slice(0,12).map(([a,t,c])=>`<li><button class="link" ${a}>${esc(t)}</button> ${pill(c,c==="bad"?"Not met":"Attention")}</li>`).join("")}</ul>`:`<p class="muted">Nothing open.</p>`}</div>
  <div class="panel"><h3>Tanks</h3><div class="tw"><table><thead><tr><th>Tank</th><th>Quenchant</th><th>Last test</th><th>Last laboratory analysis</th><th>Status</th></tr></thead><tbody>${H.st.map(({tk,s})=>`<tr><td><b>${esc(tk.id)}</b> · ${esc(tk.furnace)}</td><td>${esc(MEDIA[tk.media])}<br><span class="small muted">${esc(tk.product||"")}</span></td><td>${s.last?fmtD(s.last.date):"—"}</td><td>${s.lab?fmtD(s.lab.date)+(s.lab.report?" · "+esc(s.lab.report):""):"—"}</td><td>${pill(...LVL[s.lvl])}</td></tr>`).join("")}</tbody></table></div></div></div>`;}
function vTanks(){
  return `<div class="row between"><h2>Quench tanks</h2><button class="pri w" data-new-tank>Register a tank</button></div>
  <p class="muted">F-01 has a water quench and F-02 an oil quench; F-03 and F-04 run isothermal annealing and normalizing only and have no quench tank.</p>
  ${S.tanks.length?`<div class="tw"><table><thead><tr><th>Tank</th><th>Furnace</th><th>Quenchant</th><th>Product</th><th>Supplier</th><th class="n">Capacity (L)</th><th>Charged</th><th>Status</th></tr></thead><tbody>${S.tanks.map(t=>`<tr class="click" data-open-tank="${esc(t.id)}"><td class="mono">${esc(t.id)}</td><td>${esc(t.furnace)}</td><td>${esc(MEDIA[t.media])}</td><td>${esc(t.product)}</td><td>${esc(t.supplier)}</td><td class="n">${esc(t.capacity)}</td><td>${fmtD(t.charged)}</td><td>${t.active!==false?pill(...LVL[tankState(t).lvl]):pill("","Not in use")}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty"><p>No tank yet.</p></div>`}`;}
function vPlan(){const p=PL();
  return `<div class="panel"><div class="row between"><h3>Test plan (MWSPL-F-QM-01)</h3><div class="row"><button class="w" data-planappr>${isDate(p.apprDate)?"Approve a new revision":"Approve the plan"}</button><button data-planprint>Print the plan</button><button class="pri w" data-new-par>Add a parameter</button></div></div>
    <p>${planPill()}</p><p class="small muted">Per quenchant: the characteristics analyzed (Process Table Section 5.0), the method, the frequency and the tolerance with its source. The defaults are typical values: confirm them against the controlled CQI-9 copy and the supplier's data sheet, record the source of each tolerance, then approve.${isDate(p.apprDate)?` Approved by ${esc(p.appr)}; next plan review ${fmtD(planDue())}.`:""}</p>
    ${p.log.length?`<details><summary class="small muted">History of the plan</summary><ul class="small">${p.log.slice().reverse().map(l=>`<li>${fmtD(l.d)} · ${esc(l.t)}</li>`).join("")}</ul></details>`:""}</div>
  ${Object.keys(MEDIA).map(m=>{const L=p.items.map((x,i)=>({x,i})).filter(o=>o.x.m===m),inUse=active().some(t=>t.media===m);
    return `<div class="panel"><h3>${esc(MEDIA[m])} ${inUse?pill("ok","In use: "+active().filter(t=>t.media===m).map(t=>t.id+" "+t.furnace).join(", ")):pill("","No tank")}</h3>
    <div class="tw"><table><thead><tr><th>Characteristic</th><th>Method</th><th>Frequency</th><th>Tolerance</th><th>Source of the tolerance</th><th>In plan</th></tr></thead><tbody>${L.map(({x,i})=>`<tr class="click" data-par="${i}"><td><b>${esc(x.n)}</b>${x.lab?` <span class="small muted">laboratory</span>`:""}</td><td class="small">${esc(x.method)}</td><td>${esc(freqTxt(x.f))}</td><td>${esc(limTxt(x))}</td>
      <td>${SRC[x.src]?esc(SRC[x.src])+(x.ref?`<br><span class="small muted">${esc(x.ref)}</span>`:x.src==="supplier"?`<br>${pill("warn","reference missing")}`:""):pill(inUse&&x.on!==false?"warn":"","not recorded")}</td><td>${x.on!==false?pill("ok","Yes"):pill("","No")}</td></tr>`).join("")}</tbody></table></div></div>`;}).join("")}`;}
function vTests(){const f=S.filt.tank,L=S.tests.filter(t=>!f||t.tank===f).slice().reverse();
  return `<div class="row between"><h2>Test records</h2><div class="row"><select data-filt="tank"><option value="">All tanks</option>${S.tanks.map(t=>`<option value="${esc(t.id)}" ${f===t.id?"selected":""}>${esc(t.id+" · "+t.furnace)}</option>`).join("")}</select><button class="pri w" data-newtest="${esc(f)}">Record a test</button></div></div>
  ${L.length?`<div class="tw"><table><thead><tr><th>Test</th><th>Date</th><th>Tank</th><th>Values</th><th>Laboratory / report</th><th>Result</th><th>Reviewed</th></tr></thead><tbody>${L.slice(0,200).map(t=>{const E=evalT(t);
    return `<tr class="click" data-open="${esc(t.id)}"><td class="mono">${esc(t.id)}</td><td>${fmtD(t.date)} ${esc(t.time)}</td><td>${esc(tName(t.tank))}</td><td class="small">${E.rows.map(r=>`${esc(r.p.n.replace(/ \(.*\)/,""))}: ${esc(valTxt(r.p,r.v))}`).join(" · ")}</td><td class="small">${esc([t.lab,t.report].filter(Boolean).join(" · ")||"—")}</td><td>${resPill(t)}</td><td>${reviewed(t)?`${esc(t.check.by)}<br><span class="small muted">${fmtD(t.check.date)}</span>`:reviewLate(t)?pill("bad","Late"):pill("warn","Due")}</td></tr>`;}).join("")}</tbody></table></div>${L.length>200?`<p class="small muted">The 200 latest are shown.</p>`:""}`:`<div class="empty"><p>No test recorded.</p></div>`}`;}
/* small trend of one numeric parameter with its tolerance */
function mini(p,pts){if(pts.length<2)return "";const W=300,H=110,L=34,R=8,T=8,B=18,lo=num(p.lo),hi=num(p.hi),vs=pts.map(x=>x.v).concat([lo,hi].filter(v=>v!=null));
  let y0=Math.min(...vs),y1=Math.max(...vs);const pd=(y1-y0)*.12||1;y0-=pd;y1+=pd;const t0=dnum(pts[0].d),t1=dnum(pts.at(-1).d),X=d=>L+(t1>t0?(dnum(d)-t0)/(t1-t0):.5)*(W-L-R),Y=v=>T+(y1-v)/(y1-y0)*(H-T-B);
  const hl=(v,lab)=>v==null?"":`<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--muted)" stroke-dasharray="5 3"/><text x="${L-4}" y="${(Y(v)+3).toFixed(1)}" text-anchor="end" class="tl">${v}</text>`;
  const col={pass:"var(--s1)",warn:"var(--warn)",fail:"var(--bad)",info:"var(--s1)"};
  return `<div class="qtrend"><div class="small"><b>${esc(p.n)}</b> <span class="muted">${esc(p.u||"")} · ${esc(limTxt(p))}</span></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.n)}: ${pts.length} results">${hl(lo)}${hl(hi)}
    <path d="${pts.map((x,i)=>(i?"L":"M")+X(x.d).toFixed(1)+" "+Y(x.v).toFixed(1)).join(" ")}" fill="none" stroke="var(--s1)" stroke-width="1.5"/>
    ${pts.map(x=>`<circle cx="${X(x.d).toFixed(1)}" cy="${Y(x.v).toFixed(1)}" r="3.5" fill="${col[x.j]||"var(--s1)"}" stroke="var(--panel)" stroke-width="1.5"><title>${fmtD(x.d)}: ${esc(valTxt(p,x.v))}</title></circle>`).join("")}
    <text x="${L}" y="${H-4}" class="tl">${fmtD(pts[0].d)}</text><text x="${W-R}" y="${H-4}" text-anchor="end" class="tl">${fmtD(pts.at(-1).d)}</text></svg></div>`;}
function vSched(){
  return `<h2>Schedule & trends</h2><p class="muted">Next due = last result + the frequency of the test plan. The trends show each measured characteristic against its tolerance (dashed).</p>
  ${active().map(tk=>{const s=tankState(tk),T=testsOf(tk.id);
    return `<div class="panel"><div class="row between"><h3>${esc(tk.id)} · ${esc(tk.furnace)} · ${esc(MEDIA[tk.media])}</h3><div class="row">${pill(...LVL[s.lvl])}<button class="pri" data-newtest="${esc(tk.id)}">Record a test</button></div></div>
    <div class="tw"><table><thead><tr><th>Characteristic</th><th>Frequency</th><th>Last result</th><th>Result</th><th>Next due</th><th>State</th></tr></thead><tbody>${s.sc.map(r=>`<tr><td>${esc(r.p.n)}</td><td>${esc(freqTxt(r.p.f))}</td><td>${r.last?`${esc(valTxt(r.p,r.v))}<br><span class="small muted">${fmtD(r.last.date)} · ${esc(r.last.id)}</span>`:"—"}</td><td>${r.j?pill(...RES[r.j]):"—"}</td><td>${r.next?fmtD(r.next):"—"}</td><td>${pill(...SCH[r.st])}</td></tr>`).join("")}</tbody></table></div>
    <div class="mini-grid">${planOf(tk.media).filter(p=>p.kind!=="ok").map(p=>mini(p,T.filter(t=>num(t.vals[p.k])!=null).map(t=>({d:t.date,v:num(t.vals[p.k]),j:judge(p,t.vals[p.k])})))).join("")}</div></div>`;}).join("")||`<div class="empty"><p>No tank in use.</p></div>`}`;}
function vReview(){const H=assess314(),sc=SCORE[H.score];
  return `<div class="panel"><div class="row between"><h3>HTSA 3.14 · Is the quenching medium analyzed?</h3><button data-h314>Evidence (print)</button></div>
    <p><span class="verdict ${sc[2]}">${sc[1]}</span> <span class="muted">${plural(H.I.filter(i=>i.lvl==="ok").length,"item")} met · ${plural(H.crit,"item")} not met · ${plural(H.I.filter(i=>i.lvl==="warn").length,"item")} needing attention</span></p>
    <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th><th>Action</th></tr></thead><tbody>${H.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${pill(...LV[i.lvl])}</td><td>${esc(i.act)}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted" style="margin-top:8px">The question asks that the heat treater periodically has the quenching medium analyzed for specific quenching characteristics (e.g. cooling curve, water content, salt concentration) as specified in the applicable Process Tables, Section 5.0; the tolerances are specified by the quench medium supplier or the heat treater; the test results are reviewed for conformance and documented. Wording to confirm against the controlled CQI-9 copy.</p></div>`;}
function vAct(){const R=S.tests.filter(t=>evalT(t).fails.length).slice().reverse(),D=S.tests.filter(reviewDue).sort(byTime),bulk=D.filter(t=>!evalT(t).fails.length);
  return `<div class="panel"><div class="row between"><h3>Results waiting for review</h3>${bulk.length?`<button class="pri w" data-bulkrev>Review ${plural(bulk.length,"result")} within limits…</button>`:""}</div>
    <p class="small muted">Every result is reviewed for conformance within ${C().reviewDays} days and signed with the date. Results within limits can be reviewed together; a result out of limits is reviewed on its own record.</p>
    ${D.length?`<div class="tw"><table><thead><tr><th>Test</th><th>Date</th><th>Tank</th><th>Result</th><th>Review</th></tr></thead><tbody>${D.map(t=>`<tr class="click" data-open="${esc(t.id)}"><td class="mono">${esc(t.id)}</td><td>${fmtD(t.date)}</td><td>${esc(tName(t.tank))}</td><td>${resPill(t)}</td><td>${reviewLate(t)?pill("bad","Late"):pill("warn","Due")}</td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">Nothing to review.</p>`}</div>
  <div class="panel"><h3>Results out of limits</h3>${R.length?`<div class="tw"><table><thead><tr><th>Test</th><th>Tank</th><th>Out of limits</th><th>Product at risk</th><th>Reaction</th></tr></thead><tbody>${R.map(t=>{const E=evalT(t),m=missingAct(t);
    return `<tr class="click" data-open="${esc(t.id)}"><td class="mono">${esc(t.id)}<br><span class="small muted">${fmtD(t.date)}</span></td><td>${esc(tName(t.tank))}</td><td>${E.fails.map(r=>`${esc(r.p.n)}: ${esc(valTxt(r.p,r.v))} (${esc(limTxt(r.p))})`).join("<br>")}</td><td class="small">${E.fails.map(r=>esc(riskTxt(t,r.p.k))).join("<br>")}</td><td>${t.closed?pill("ok","Closed"):m.length?pill("bad",plural(m.length,"item")+" missing"):pill("warn","Ready to close")}</td></tr>`;}).join("")}</tbody></table></div>`:`<p class="muted">None.</p>`}</div>`;}
function vSettings(){const c=C();
  return `<div class="panel"><h3>Settings</h3><div class="fields">${SETF.map(([k,l,t])=>`<label class="f"><span>${esc(l)}</span><input data-cfg="${k}" type="${t}" value="${esc(c[k])}"></label>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="pri w" data-save-cfg>Save settings</button><span class="small muted">Site rules, not CQI-9 figures.</span></div></div>`;}
function vRules(){const c=C(),R=[["Test plan","Per quenchant: characteristic, method, frequency, tolerance (lower / upper limit, or OK / not OK) and its source: the quench medium supplier (with the data sheet reference) or the heat treater. Approved with revision, approver and date; a change afterwards marks the plan changed. Plan review every "+c.planDays+" days."],
    ["Section 5.0 characteristics","Checked in the plan per quenchant in use: oil: a cooling curve characteristic and the water content; polymer: concentration and a cooling curve characteristic; water: temperature and contamination (salt concentration for brine). To confirm against the applicable Process Table."],
    ["Judgement","Out of limits = outside the tolerance; close to a limit = within "+c.warnPct+" % of the band (or of the one limit); recorded = no tolerance set (counts against the plan)."],
    ["Schedule","Next due = last result of the characteristic + its frequency; overdue after that date, never tested without any result."],
    ["Review","Each result is reviewed (by, date) within "+c.reviewDays+" days; later = not met. A laboratory analysis needs its report number."],
    ["Reaction","A result out of limits needs containment, root cause, corrective action, product-impact assessment, owner, date and a passing re-test of each failed characteristic before it closes. Product at risk = from the last passing result to the passing re-test."],
    ["HTSA 3.14 score","Needs immediate action: no tank, no test or no approved test plan. Not satisfactory: any item not met. Satisfactory: otherwise."]];
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
  el.innerHTML=t!=null?md(t):`<p class="banner warn">This document is not embedded in this build (${esc(p)}).</p>`;}
function vData(){const n=S.tanks.length+S.tests.length;
  return `<h2>Data</h2><div class="grid2">
  <div class="panel"><h3>Back up and restore</h3><p class="small muted">${plural(S.tanks.length,"tank")} · ${plural(S.tests.length,"test")} · storage: ${S.dbState==="on"?"shared record store":"this browser"}.</p>
    <div class="row"><button class="pri" data-export>Export JSON</button><button data-csv>Results CSV</button></div>
    <div class="row w" style="margin-top:10px"><label class="f"><span>Import a JSON export</span><input type="file" id="impfile" accept=".json,application/json"></label></div>
    ${S.imp?`<div class="banner" style="margin-top:8px">${esc(S.imp.msg)}<div class="row" style="margin-top:6px"><button class="pri" data-imp="merge">Merge (add and update)</button><button class="danger" data-imp="replace">Replace everything</button><button data-imp="cancel">Cancel</button></div></div>`:""}</div>
  ${MWS.calor&&MWS.calor.panel?MWS.calor.panel(["qmt-reg"],"\"Import from CALOR\" takes the tanks, the test plan and the tests of CALOR's Quench media page."):""}
  <div class="panel"><h3>Import from CALOR</h3><p class="small muted">Tanks, test plan and tests of CALOR's Quench media page (found: ${MWS.calor&&MWS.calor.where?esc(MWS.calor.where("qmt-reg")||"no"):"no"}). Only on an empty module; the source of each tolerance is not in CALOR and stays to be recorded.</p><button class="w" data-calor ${n?"disabled":""}>Import from CALOR</button></div>
  <div class="panel"><h3>Starter set-up</h3><p class="small muted">Tanks Q-01 (F-01 water) and Q-02 (F-02 oil), an approved test plan with the source of each tolerance, daily checks, weekly water content and laboratory analyses, one out-of-limit result closed and one open; all marked "(example)".</p><button class="w" data-std ${n?"disabled":""}>Load starter set-up</button>${n?`<p class="small muted">Only on an empty module.</p>`:""}</div>
  <div class="panel"><h3>Clear all</h3><p class="small muted">Deletes every record and the settings of this module. Type <b>CLEAR ALL</b> to enable.</p>
    <div class="row w"><input id="clrtxt" placeholder="CLEAR ALL" style="max-width:180px"><button class="danger" data-clear>Clear all</button></div></div></div>`;}
const VIEWS={dash:vDash,tanks:vTanks,plan:vPlan,tests:vTests,sched:vSched,review:vReview,act:vAct,settings:vSettings,rules:vRules,docs:vDocs,data:vData};
const AFTER={docs:showDoc};

/* 9. modal record sheets */
function mf(path,label,o={}){
  const ed=S.modal.ed,v=getp(ed,path),id="m-"+path.replace(/\./g,"-"),dis=o.dis?"disabled":"";
  let ctl;
  if(o.opts)ctl=`<select id="${id}" data-p="${path}" ${dis}>${o.blank?`<option value="">${esc(o.blankTxt||"—")}</option>`:""}${o.opts.map(([k,t])=>`<option value="${esc(k)}" ${String(v)===String(k)?"selected":""}>${esc(t)}</option>`).join("")}</select>`;
  else if(o.area)ctl=`<textarea id="${id}" data-p="${path}" rows="${o.area}" ${dis}>${esc(v)}</textarea>`;
  else ctl=`<input id="${id}" data-p="${path}" ${o.type?`type="${o.type}"`:""} ${o.list?`list="${o.list}"`:""} value="${esc(v)}" ${o.ph?`placeholder="${esc(o.ph)}"`:""} ${dis}>`;
  return `<label class="f ${o.req?"req":""} ${o.wide?"wide":""}" for="${id}"><span>${esc(label)}</span>${ctl}${o.hint?`<span class="small muted">${esc(o.hint)}</span>`:""}</label>`;
}
function openModal(m){S.modal=m;$("#modal").hidden=false;redraw();}
function closeModal(){S.modal=null;const el=$("#modal");if(el){el.hidden=true;el.innerHTML="";}document.body.classList.remove("pm");if(S.pending){S.pending=false;render();}}
function redraw(){const el=$("#modal");if(!S.modal||!el)return;const st=el.scrollTop;el.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${(DRAW[S.modal.kind])()}</div>`;el.scrollTop=st;}
const sheet=(title,body,foot)=>`<div class="row between"><h2>${title}</h2><button data-close aria-label="Close">✕</button></div>${body}<div class="sticky-foot"><span class="msg" id="mmsg">${S.modal.msg||""}</span>${foot}</div>`;
const msg=(t,ok)=>{if(!S.modal)return;S.modal.msg=t?`<span style="color:var(--${ok?"ok":"bad"})">${esc(t)}</span>`:"";const el=$("#mmsg");if(el)el.innerHTML=S.modal.msg;};
const hist=E=>E.log&&E.log.length?`<details><summary class="small muted">History</summary><ul class="small">${E.log.slice().reverse().map(x=>`<li>${fmtD(x.d)} · ${esc(x.t)}</li>`).join("")}</ul></details>`:"";
const furnaces=()=>[...new Set(String(C().furnaces||"").split(/[\s,;]+/).map(fNo).filter(Boolean).concat(S.tanks.map(t=>t.furnace)))].sort();
function DRAW_TANK(){const E=S.modal.ed,known=tankById(E.id),used=known&&S.tests.some(t=>t.tank===E.id);
  const body=`<div class="fields">${mf("furnace","Furnace",{opts:furnaces().map(f=>[f,f]),blank:1,req:1})}${mf("name","Name",{ph:"Quench tank F-02"})}${mf("media","Quenchant",{opts:Object.entries(MEDIA),dis:used,hint:used?"Fixed once tests are recorded: register a new tank for another quenchant.":""})}
    ${mf("product","Product (quenchant name / grade)")}${mf("supplier","Supplier")}${mf("capacity","Capacity (litres)",{type:"number"})}${mf("charged","Charged (fresh fill) on",{type:"date"})}${mf("notes","Notes",{area:2,wide:1})}
    <label class="chk"><input type="checkbox" data-p="active" ${E.active!==false?"checked":""}> In use</label></div>${hist(E)}`;
  return sheet(esc(known?E.id+" · "+E.furnace:"Register a quench tank"),body,`<button class="pri w" data-save-tank>Save</button>${known&&!used?`<button class="danger" data-del-tank>Delete</button>`:""}<button data-close>Close</button>`);}
function DRAW_PAR(){const E=S.modal.ed,isNew=S.modal.i==null;
  const body=`<p class="small muted">${isDate(PL().apprDate)?"Saving a change marks the approved plan as changed: approve it again.":"The plan is not approved yet."}</p><div class="fields">
    ${mf("m","Quenchant",{opts:Object.entries(MEDIA),dis:!isNew})}${mf("n","Characteristic",{req:1,wide:1})}${mf("method","Test method",{wide:1})}
    ${mf("kind","Kind",{opts:[["","Measured value"],["ok","OK / not OK check"]]})}${mf("u","Unit")}${mf("lo","Lower limit",{type:"number"})}${mf("hi","Upper limit",{type:"number"})}${mf("d","Decimals",{type:"number"})}
    ${mf("f","Frequency (days)",{type:"number",req:1})}${mf("src","Source of the tolerance",{opts:Object.entries(SRC),blank:1,req:1})}${mf("ref","Reference (supplier data sheet, Process Table, internal limit)",{wide:1})}
    <label class="chk"><input type="checkbox" data-p="lab" ${E.lab?"checked":""}> Laboratory analysis (report no. expected)</label><label class="chk"><input type="checkbox" data-p="on" ${E.on!==false?"checked":""}> In the test plan</label></div>`;
  return sheet(esc(isNew?"New parameter":E.n),body,`<button class="pri w" data-save-par>Save</button>${isNew||S.tests.some(t=>has(t.vals[E.k]))?"":`<button class="danger" data-del-par>Delete</button>`}<button data-close>Close</button>`);}
function valRow(p,E){const v=E.vals[p.k],j=judge(p,v);
  const ctl=p.kind==="ok"?`<select data-v="${esc(p.k)}" id="v-${esc(p.k)}" ${E.closed?"disabled":""}><option value="">—</option><option value="ok" ${v==="ok"?"selected":""}>OK</option><option value="nok" ${v==="nok"?"selected":""}>Not OK</option></select>`
    :`<input data-v="${esc(p.k)}" id="v-${esc(p.k)}" type="number" step="any" value="${esc(v??"")}" ${E.closed?"disabled":""}>`;
  return `<tr><td>${esc(p.n)}${p.lab?` <span class="small muted">laboratory</span>`:""}</td><td>${ctl}</td><td>${esc(p.u||"")}</td><td>${esc(limTxt(p))}</td><td data-vres="${esc(p.k)}">${j?pill(...RES[j]):""}</td></tr>`;}
function DRAW_TEST(){const E=S.modal.ed,known=S.tests.find(t=>t.id===E.id),tk=tankById(E.tank),Ev=evalT(E),m=missingAct(E);
  const body=`<p class="muted">${known?pill(...STATUS[status(E)])+" "+esc(E.id):pill("warn","New test")}</p>
  <fieldset><legend>Sample</legend><div class="fields">${mf("tank","Tank",{opts:active().map(t=>[t.id,`${t.id} · ${t.furnace} · ${MEDIA[t.media]}`]),blank:1,req:1,dis:E.closed})}${mf("date","Date",{type:"date",req:1,dis:E.closed})}${mf("time","Time",{type:"time",dis:E.closed})}
    ${mf("by","Tested / sampled by",{req:1,dis:E.closed})}${mf("lab","Laboratory (in-house / supplier / outside)",{dis:E.closed})}${mf("report","Laboratory report no.",{dis:E.closed,req:Ev.lab})}</div></fieldset>
  ${tk?`<fieldset><legend>Values · ${esc(MEDIA[tk.media])} (fill only what was tested)</legend><div class="tw"><table><thead><tr><th>Characteristic</th><th>Value</th><th>Unit</th><th>Tolerance</th><th>Result</th></tr></thead><tbody>${planOf(tk.media).map(p=>valRow(p,E)).join("")}</tbody></table></div>
    ${mf("notes","Notes",{area:2,wide:1,dis:E.closed})}</fieldset>`:`<p class="banner">Choose the tank to enter the values.</p>`}
  <fieldset><legend>Review for conformance (MWSPL-WI-QM-02 §2)</legend><div class="fields">${mf("check.by","Reviewed by",{req:1})}${mf("check.date","Review date",{type:"date",req:1})}${mf("check.remarks","Remarks (trend, close to a limit, decision)",{area:2,wide:1})}</div></fieldset>
  ${Ev.fails.length?`<fieldset><legend>Reaction plan: out of limits</legend><p class="small">${Ev.fails.map(r=>`<b>${esc(r.p.n)}</b> ${esc(valTxt(r.p,r.v))} (tolerance ${esc(limTxt(r.p))}) · product at risk ${esc(riskTxt(E,r.p.k))}`).join("<br>")}</p>
    <div class="fields">${mf("act.contain","Containment",{opts:CONTAIN.map(x=>[x,x]),blank:1,req:1,dis:E.closed})}${mf("act.cause","Root cause",{area:2,wide:1,req:1,dis:E.closed})}${mf("act.action","Corrective action",{opts:ACTIONS.map(x=>[x,x]),blank:1,req:1,dis:E.closed})}
      ${mf("act.detail","Details",{area:2,wide:1,dis:E.closed})}${mf("act.impact","Product-impact assessment",{area:2,wide:1,req:1,dis:E.closed})}${mf("act.by","Owner",{req:1,dis:E.closed})}${mf("act.date","Date",{type:"date",req:1,dis:E.closed})}</div>
    <p class="small ${m.length?"":"muted"}">${E.closed?"Reaction closed.":m.length?"To close: "+esc(m.join(", "))+".":"Complete: the reaction can be closed."}</p></fieldset>`:""}
  ${hist(E)}`;
  const foot=[`<button class="pri w" data-save-test>Save</button>`,Ev.fails.length&&!E.closed&&known?`<button class="w" data-close-act>Close the reaction</button>`:"",known?`<button data-test-print>Print</button>`:"",known&&!reviewed(known)?`<button class="danger" data-del-test>Delete</button>`:"",`<button data-close>Close</button>`].join("");
  return sheet(esc(known?`${E.id} · ${tName(E.tank)}`:"Record a quench media test"),body,foot);}
function DRAW_PLANAPPR(){const m=S.modal,next=isDate(PL().apprDate)?(+PL().rev||0)+1:Math.max(1,+PL().rev||0);
  return sheet("Approve the test plan",`<p class="muted">Records revision ${next} of the quench media test plan (MWSPL-F-QM-01) as approved.</p>
  <div class="fields"><label class="f req"><span>Approved by</span><input id="pa-by" value="${esc(m.by)}"></label><label class="f req"><span>Date</span><input type="date" id="pa-date" value="${esc(m.date)}"></label>
  ${next>1?`<label class="f wide req"><span>Change / review note</span><input id="pa-chg"></label>`:""}</div>`,`<button class="pri w" data-save-planappr>Approve</button><button data-close>Cancel</button>`);}
function DRAW_BULK(){const n=S.tests.filter(t=>reviewDue(t)&&!evalT(t).fails.length).length;
  return sheet("Review results within limits",`<p class="muted">Signs ${plural(n,"result")} within limits (or close to a limit) as reviewed for conformance. Results out of limits are reviewed on their own record.</p>
  <div class="fields"><label class="f req"><span>Reviewed by</span><input id="bk-by"></label><label class="f req"><span>Review date</span><input type="date" id="bk-date" value="${today()}"></label><label class="f wide"><span>Remarks</span><input id="bk-rem"></label></div>`,`<button class="pri w" data-save-bulk>Sign as reviewed</button><button data-close>Cancel</button>`);}
function DRAW_PRINT(){return sheet(esc(S.modal.title),`<div id="jobcard">${S.modal.html()}</div>`,`<button class="pri" data-print>Print</button><button data-close>Close</button>`);}
const pHead=t=>`<p class="small muted">${esc(C().plant)} · ${esc(t)} · printed ${fmtD(today())}</p>`;
const tblH=(head,rows)=>rows.length?`<div class="tw"><table><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:`<p class="muted">None.</p>`;
function testHtml(t){const E=evalT(t);
  return `${pHead("Quench media test record (MWSPL-F-QM-02, CQI-9 HTSA 3.14)")}<h2>${esc(t.id)} · ${esc(tName(t.tank))} · ${esc(MEDIA[(tankById(t.tank)||{}).media]||"")}</h2>
  ${tblH(["Field","Entry"],[["Date / time",`${fmtD(t.date)} ${t.time}`],["Tested by",t.by],["Laboratory / report",[t.lab,t.report].filter(Boolean).join(" · ")||"—"],["Notes",t.notes]])}
  <h3>Values</h3>${tblH(["Characteristic","Value","Tolerance","Source","Result"],E.rows.map(r=>[r.p.n,valTxt(r.p,r.v),limTxt(r.p),(SRC[r.p.src]||"not recorded")+(r.p.ref?" · "+r.p.ref:""),RES[r.j][1]]))}
  <h3>Review</h3>${tblH(["Reviewed by","Date","Remarks"],[[t.check.by||"—",fmtD(t.check.date),t.check.remarks]])}
  ${E.fails.length?`<h3>Reaction plan</h3>${tblH(["Field","Entry"],[["Product at risk",E.fails.map(r=>r.p.n+": "+riskTxt(t,r.p.k)).join("; ")],["Containment",t.act.contain],["Root cause",t.act.cause],["Corrective action",[t.act.action,t.act.detail].filter(Boolean).join(" · ")],["Product impact",t.act.impact],["Owner / date",`${t.act.by} · ${fmtD(t.act.date)}`],["Status",t.closed?"closed":"open"]])}`:""}
  <p class="small" style="margin-top:14px">Signatures: tested ____________________ reviewed ____________________</p>`;}
const planRows=()=>PL().items.filter(p=>p.on!==false).map(p=>[MEDIA[p.m],p.n,p.method,freqTxt(p.f),limTxt(p),SRC[p.src]||"not recorded",p.ref||""]);
const planHtml=()=>`${pHead("Quench media test plan (MWSPL-F-QM-01)")}<h2>Test plan ${isDate(PL().apprDate)?`rev ${PL().rev}, approved ${fmtD(PL().apprDate)} by ${esc(PL().appr)}${PL().dirty?" · CHANGED SINCE THE APPROVAL":""}`:"· NOT APPROVED"}</h2>${tblH(["Quenchant","Characteristic","Method","Frequency","Tolerance","Tolerance source","Reference"],planRows())}`;
function h314Html(){const H=assess314(),sc=SCORE[H.score];
  return `${pHead("CQI-9 HTSA 3.14 evidence")}<p><span class="verdict ${sc[2]}">${sc[1]}</span></p>${tblH(["Requirement","Evidence","Result","Action"],H.I.map(i=>[i.req,i.ev,LV[i.lvl][1],i.act||""]))}
  <h3>Tanks and schedule</h3>${H.st.map(({tk,s})=>`<p><b>${esc(tk.id)} · ${esc(tk.furnace)} · ${esc(MEDIA[tk.media])}</b> ${esc(tk.product||"")}</p>${tblH(["Characteristic","Frequency","Last result","Result","Next due","State"],s.sc.map(r=>[r.p.n,freqTxt(r.p.f),r.last?valTxt(r.p,r.v)+" ("+fmtD(r.last.date)+")":"—",r.j?RES[r.j][1]:"—",r.next?fmtD(r.next):"—",SCH[r.st][1]]))}`).join("")}
  ${planHtml()}`;}
const DRAW={tank:DRAW_TANK,par:DRAW_PAR,test:DRAW_TEST,planappr:DRAW_PLANAPPR,bulk:DRAW_BULK,print:DRAW_PRINT};

/* 10. actions */
const STRUCT=["n","method","kind","u","lo","hi","f","src","ref","on","lab"];
async function markPlan(t){const p=PL();if(isDate(p.apprDate)&&!p.dirty){S.plan={...clone(p),dirty:true};await savePlan("Changed after approval: "+t);}else await savePlan(t);}
async function saveTank(){const E=fillTank(S.modal.ed),known=tankById(E.id);if(!E.furnace){msg("Choose the furnace.");return;}if(E.charged&&E.charged>today()){msg("The charge date is in the future.");return;}
  if(!known)E.id="Q-"+pad(maxNo(S.tanks)+1);if(!E.name)E.name="Quench tank "+E.furnace;
  if(await put("tanks",E,known?"Saved":"Registered")){S.modal.ed=clone(E);redraw();msg("Saved.",1);}}
async function savePar(){const E=clone(S.modal.ed),i=S.modal.i;if(!txt(E.n)){msg("Enter the characteristic.");return;}if(!(num(E.f)>0)){msg("Enter the frequency in days.");return;}
  if(num(E.lo)!=null&&num(E.hi)!=null&&num(E.lo)>=num(E.hi)){msg("The lower limit must be below the upper.");return;}
  if(!needDb())return;const p=clone(PL());E.f=num(E.f);E.d=num(E.d)??1;E.on=E.on!==false;E.lab=!!E.lab;
  if(i==null){E.k=(E.k||txt(E.n).toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,10)||"p")+"_"+(p.items.length+1);p.items.push(E);}else{const o=p.items[i],ch=STRUCT.filter(k=>String(o[k]??"")!==String(E[k]??""));if(!ch.length){closeModal();return;}p.items[i]=E;}
  S.plan=p;await markPlan(`${MEDIA[E.m]} ${E.n} ${i==null?"added":"changed"}`);toast("Test plan saved");closeModal();render();}
function newTest(tankId){const d=new Date();return fillTest({tank:tankId||(S.filt.tank||(active()[0]||{}).id||""),date:today(),time:nowTime()});}
async function saveTest(){const E=fillTest(S.modal.ed),known=S.tests.find(t=>t.id===E.id),Ev=evalT(E);
  const err=!E.tank?"Choose the tank.":!isDate(E.date)?"Enter the date.":E.date>today()?"The date is in the future.":!txt(E.by)?"Enter who tested.":!Ev.n?"Enter at least one value.":
    (txt(E.check.by)&&!isDate(E.check.date))||(!txt(E.check.by)&&isDate(E.check.date))?"Enter both the reviewer and the review date.":isDate(E.check.date)&&(E.check.date<E.date||E.check.date>today())?"The review date must be on or after the test date and not in the future.":"";
  if(err){msg(err);return false;}
  Object.keys(E.vals).forEach(k=>{if(!has(E.vals[k]))delete E.vals[k];});
  if(!known)E.id="QT-"+String(maxNo(S.tests)+1).padStart(4,"0");
  const lt=!known?"Test recorded":reviewed(E)&&!reviewed(known)?`Reviewed by ${E.check.by}`:"Updated";
  if(!await put("tests",E,lt))return false;S.modal.ed=clone(E);return true;}
async function stdOps(){if(!needDb())return;if(S.tanks.length||S.tests.length){toast("Only on an empty module.");return;}
  const td=today(),D=n=>addDays(td,n),ex=" (example)",T=[];let seq=1;
  const tanks=[fillTank({id:"Q-01",furnace:"F-01",name:"Quench tank F-01",media:"water",product:"Fresh water"+ex,supplier:"Plant supply",capacity:"10000",charged:D(-60),log:[{d:td,t:"Example"}]}),
    fillTank({id:"Q-02",furnace:"F-02",name:"Quench tank F-02",media:"oil",product:"Normal-speed quench oil"+ex,supplier:"Example oil supplier",capacity:"12000",charged:D(-380),log:[{d:td,t:"Example"}]})];
  const plan=blankPlan();plan.items.forEach(p=>{if(p.m==="oil"&&(p.lab||p.k==="temp")){p.src="supplier";p.ref="Supplier data sheet QO-22 rev 3"+ex;}else{p.src="ht";p.ref=p.f===1?"Internal limit, WI-QM-01"+ex:"Internal limit"+ex;}});
  plan.rev=1;plan.appr="R. Sharma, HT Manager"+ex;plan.apprDate=D(-200);plan.log=[{d:D(-200),t:"Rev 1 approved by R. Sharma, HT Manager (example)"}];
  const rv=(d)=>d>=3?{by:"S. Gupta, Laboratory Supervisor"+ex,date:D(-d+1),remarks:""}:{by:"",date:"",remarks:""};
  const add=(tank,d,vals,x={})=>{const t=fillTest({id:"QT-"+String(seq++).padStart(4,"0"),tank,date:D(-d),time:x.time||"08:"+pad(10+(seq*7)%40),by:x.by||["R. Kumar","S. Yadav","A. Meena"][seq%3]+ex,lab:x.lab||"",report:x.report||"",notes:x.notes||"",vals,check:x.check||rv(d),act:x.act||{},closed:!!x.closed,log:[{d:D(-d),t:"Test recorded"}]});T.push(t);return t;};
  for(let d=10;d>=2;d--){const v={temp:String(Math.round(29+Math.sin(d)*3)),agit:"ok"};if(d%7===3)v.contam="ok";add("Q-01",d,v);}
  for(let d=10;d>=0;d--){const v={temp:String(Math.round(64+Math.sin(d+1)*4)),level:"ok",agit:"ok"};if(d%7===1){v.water=d===8?"0.14":(0.03+(d%3)*0.01).toFixed(2);}add("Q-02",d,v,d%7===1?{lab:"In-house laboratory",report:"KF-"+(300-d)}:{});}
  const w=add("Q-02",12,{temp:"64",level:"ok",agit:"ok",water:"0.16"},{lab:"In-house laboratory",report:"KF-288",notes:"Crackle test positive; Karl Fischer confirmed.",check:{by:"R. Sharma, HT Manager"+ex,date:D(-12),remarks:"Out of limits: reaction started."},
    act:{contain:CONTAIN[0],cause:"Leaking cooling coil in the oil cooler",action:ACTIONS[1],detail:"Coil repaired, oil heated out to 110 °C for 6 h.",impact:"Hardness of retained samples from the window checked: all within specification. Product released.",by:"Maintenance Head"+ex,date:D(-11)}});
  add("Q-02",10.5,{water:"0.04"},{lab:"In-house laboratory",report:"KF-289",notes:"Re-test after heat-out"});
  w.closed=true;w.log.push({d:D(-10),t:"Reaction closed"});
  const lab=(d,vals,rep)=>add("Q-02",d,vals,{report:rep,lab:"Supplier laboratory"+ex,by:"Supplier laboratory"+ex,time:"11:00"});
  lab(190,{visc:"21.8",flash:"212",tan:"0.32",sludge:"0.05",cmax:"88",tmax:"610",c300:"7.2"},"LAB-2188");
  lab(95,{visc:"22.6",flash:"208",tan:"0.41",sludge:"0.10"},"LAB-2291");
  lab(5,{visc:"23.1",flash:"205",tan:"0.48",sludge:"0.12",cmax:"84",tmax:"595",c300:"8.4"},"LAB-2418");
  T.forEach(t=>{if(!isDate(t.date))t.date=D(-11);});T.sort(byTime);
  await dbSet("config","plan",plan);S.plan=plan;await batchPut("tanks",tanks);await batchPut("tests",T);toast("Starter set-up loaded");render();}
async function importCalor(){if(!needDb())return;let o=null;try{o=MWS.calor.get("qmt-reg");}catch(e){}
  if(!o||!Array.isArray(o.tests)){toast("No CALOR quench media register found: read the CALOR Drive folder or files on this tab.");return;}
  const tanks=arr(o.tanks).map(t=>fillTank({...t,log:[{d:today(),t:"Imported from CALOR"}]})),tests=arr(o.tests).filter(t=>t&&t.id&&ID_RE.test(String(t.id))).map(t=>fillTest({...t,check:{by:t.check&&t.check.by||"",date:t.check&&t.check.date||"",remarks:t.check&&t.check.remarks||""}}));
  const plan=blankPlan();if(arr(o.plan).length)plan.items=o.plan.map(p=>({lo:"",hi:"",u:"",d:1,kind:"",lab:+p.f>=30,src:"",ref:"",...p,on:p.on!==false}));
  plan.log=[{d:today(),t:"Imported from CALOR (not approved: record the source of each tolerance, then approve)"}];
  await dbSet("config","plan",plan);S.plan=plan;await batchPut("tanks",tanks);await batchPut("tests",tests);toast(`Imported ${plural(tanks.length,"tank")} and ${plural(tests.length,"test")} from CALOR`);render();}
function armedDelete(b,fn){if(b.classList.contains("armed")){fn();return;}b.classList.add("armed");const t=b.textContent;b.textContent="Confirm";setTimeout(()=>{if(b.isConnected){b.classList.remove("armed");b.textContent=t;}},4000);}
async function download(name,text,type){
  if(S.dl){try{await S.dl.save({filename:name,data:new Blob([text],{type})});return;}catch(e){if(e&&e.code==="declined")return;}}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
const exportJson=()=>download(`mws-quench-${today()}.json`,JSON.stringify({app:"mws-quench-manager",v:1,saved:new Date().toISOString(),tanks:S.tanks,tests:S.tests,plan:PL(),config:S.cfg},null,1),"application/json");
const csvQ=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
const csv=()=>download(`mws-quench-results-${today()}.csv`,"﻿"+[["Test","Date","Time","Tank","Furnace","Quenchant","Characteristic","Value","Unit","Tolerance","Result","Tested by","Laboratory","Report","Reviewed by","Review date"],
  ...S.tests.flatMap(t=>{const tk=tankById(t.tank)||{};return evalT(t).rows.map(r=>[t.id,t.date,t.time,t.tank,tk.furnace||"",MEDIA[tk.media]||"",r.p.n,r.v,r.p.u||"",limTxt(r.p),RES[r.j][1],t.by,t.lab,t.report,t.check.by,t.check.date]);})].map(r=>r.map(csvQ).join(",")).join("\r\n"),"text/csv");
function readImport(f){f.text().then(t=>{let o;try{o=JSON.parse(t);}catch(e){toast("Not a JSON file");return;}
  if(!o||o.app!=="mws-quench-manager"||!Array.isArray(o.tests)){toast("Not an export of this module");return;}
  const tk=arr(o.tanks).filter(x=>x&&ID_RE.test(String(x.id||""))),ts=o.tests.filter(x=>x&&ID_RE.test(String(x.id||"")));
  S.imp={tanks:tk.map(fillTank),tests:ts.map(fillTest),plan:o.plan||null,config:o.config||null,msg:`${f.name}: ${plural(tk.length,"tank")}, ${plural(ts.length,"test")}.`};render();});}
async function doImport(mode){if(!S.imp||!needDb())return;const I=S.imp;S.imp=null;
  if(mode==="replace"){for(const x of S.tanks)if(!I.tanks.some(y=>y.id===x.id))await dbDel("tanks",x.id);for(const x of S.tests)if(!I.tests.some(y=>y.id===x.id))await dbDel("tests",x.id);}
  await batchPut("tanks",I.tanks);await batchPut("tests",I.tests);
  if(I.plan){const c={...I.plan};delete c.id;await dbSet("config","plan",c);}if(I.config){const c={...DEF,...I.config};delete c.id;await dbSet("config","settings",c);}
  toast("Imported ("+mode+")");render();}
async function clearAll(){if(($("#clrtxt")||{}).value!=="CLEAR ALL"){toast("Type CLEAR ALL to clear");return;}if(!needDb())return;
  for(const x of S.tanks)await dbDel("tanks",x.id);for(const x of S.tests)await dbDel("tests",x.id);await dbDel("config","settings");await dbDel("config","plan");S.plan=null;toast("All quench media data cleared");}

/* 11. wiring */
onDoc("click",async e=>{
  const b=e.target.closest("button,tr.click,a[data-docref]");if(!b)return;const d=b.dataset;
  if(b.closest("#modal")||d.close!==undefined){
    if(d.close!==undefined){closeModal();return;}
    const m=S.modal;
    if(d.saveTank!==undefined){saveTank();return;}
    if(d.delTank!==undefined){armedDelete(b,async()=>{await dbDel("tanks",m.ed.id);toast("Deleted");closeModal();});return;}
    if(d.savePar!==undefined){savePar();return;}
    if(d.delPar!==undefined){armedDelete(b,async()=>{const p=clone(PL()),n=p.items[m.i].n;p.items.splice(m.i,1);S.plan=p;await markPlan(`${n} removed`);toast("Removed from the plan");closeModal();render();});return;}
    if(d.saveTest!==undefined){if(await saveTest()){redraw();msg("Saved.",1);}return;}
    if(d.closeAct!==undefined){const mm=missingAct(fillTest(m.ed));if(mm.length){msg("To close: "+mm.join(", ")+".");return;}m.ed.closed=true;if(await saveTest()){const t=S.tests.find(x=>x.id===m.ed.id);if(t){t.closed=true;}await put("tests",fillTest(m.ed),"Reaction closed");redraw();msg("Reaction closed.",1);}return;}
    if(d.delTest!==undefined){armedDelete(b,async()=>{await dbDel("tests",m.ed.id);toast("Deleted");closeModal();});return;}
    if(d.testPrint!==undefined){const t=fillTest(m.ed);openModal({kind:"print",title:"Quench media test · "+t.id,html:()=>testHtml(t)});return;}
    if(d.savePlanappr!==undefined){const by=txt($("#pa-by").value),dt=$("#pa-date").value,chg=$("#pa-chg")?txt($("#pa-chg").value):"";
      if(!by||!isDate(dt)){msg("Enter who approves and the date.");return;}if(dt>today()){msg("Not in the future.");return;}if($("#pa-chg")&&!chg){msg("Enter the change or review note.");return;}
      if(!needDb())return;const rev=isDate(PL().apprDate)?(+PL().rev||0)+1:Math.max(1,+PL().rev||0);S.plan={...clone(PL()),rev,appr:by,apprDate:dt,dirty:false};
      if(await savePlan(`Rev ${rev} approved by ${by}${chg?": "+chg:""}`)){toast("Test plan approved");closeModal();render();}return;}
    if(d.saveBulk!==undefined){const by=txt($("#bk-by").value),dt=$("#bk-date").value,rem=txt($("#bk-rem").value);if(!by||!isDate(dt)||dt>today()){msg("Enter the reviewer and a date not in the future.");return;}
      if(!needDb())return;const L=S.tests.filter(t=>reviewDue(t)&&!evalT(t).fails.length&&t.date<=dt);for(const t of L){const x=fillTest(t);x.check={by,date:dt,remarks:rem};await put("tests",x,`Reviewed by ${by}`);}
      toast(`${plural(L.length,"result")} signed as reviewed`);closeModal();render();return;}
    if(d.print!==undefined){document.body.classList.add("pm");window.print();setTimeout(()=>document.body.classList.remove("pm"),500);return;}
    return;
  }
  if(d.open){const t=S.tests.find(x=>x.id===d.open);if(t)openModal({kind:"test",ed:clone(t),msg:""});return;}
  if(d.newtest!==undefined){if(!active().length){toast("Register a tank first");return;}if(needDb())openModal({kind:"test",ed:newTest(d.newtest),msg:""});return;}
  if(d.openTank){const t=tankById(d.openTank);if(t)openModal({kind:"tank",ed:clone(t),msg:""});return;}
  if(d.newTank!==undefined){if(needDb())openModal({kind:"tank",ed:fillTank({furnace:"",media:"oil"}),msg:""});return;}
  if(d.par!==undefined&&b.tagName==="TR"){openModal({kind:"par",i:+d.par,ed:clone(PL().items[+d.par]),msg:""});return;}
  if(d.newPar!==undefined){if(needDb())openModal({kind:"par",i:null,ed:{m:"oil",k:"",n:"",u:"",method:"",f:30,lo:"",hi:"",d:1,kind:"",lab:true,src:"",ref:"",on:true},msg:""});return;}
  if(d.planappr!==undefined){if(needDb())openModal({kind:"planappr",by:"",date:today(),msg:""});return;}
  if(d.planprint!==undefined){openModal({kind:"print",title:"Quench media test plan",html:planHtml});return;}
  if(d.h314!==undefined){openModal({kind:"print",title:"HTSA 3.14 evidence",html:h314Html});return;}
  if(d.bulkrev!==undefined){if(needDb())openModal({kind:"bulk",msg:""});return;}
  if(d.std!==undefined){stdOps();return;}
  if(d.calor!==undefined){importCalor();return;}
  if(d.saveCfg!==undefined){document.querySelectorAll("[data-cfg]").forEach(i=>{const k=i.dataset.cfg,t=(SETF.find(x=>x[0]===k)||[])[2];S.cfg[k]=t==="number"?(num(i.value)>0?num(i.value):DEF[k]):i.value;});saveCfg();return;}
  if(d.doc){S.docSel=d.doc;render();return;}
  if(d.docref){e.preventDefault();const p=DOCS.find(x=>x[0].endsWith(d.docref.replace(/^(\.\.\/)+/,"").replace(/^\.\//,"")));if(p){S.docSel=p[0];location.hash="#docs";render();}return;}
  if(d.export!==undefined){exportJson();return;}if(d.csv!==undefined){csv();return;}
  if(d.imp){if(d.imp==="cancel"){S.imp=null;render();}else doImport(d.imp);return;}
  if(d.clear!==undefined){armedDelete(b,clearAll);return;}
});
onDoc("input",e=>{const el=e.target;if(!S.modal||!S.modal.ed)return;
  if(el.dataset.v!=null){S.modal.ed.vals[el.dataset.v]=el.value;const tk=tankById(S.modal.ed.tank),p=tk&&param(tk.media,el.dataset.v),c=document.querySelector(`[data-vres="${el.dataset.v}"]`),j=judge(p,el.value);if(c)c.innerHTML=j?pill(...RES[j]):"";return;}
  if(el.dataset.p&&el.tagName!=="SELECT"&&el.type!=="checkbox")setp(S.modal.ed,el.dataset.p,el.value);});
onDoc("change",e=>{const el=e.target;
  if(S.modal&&S.modal.ed){const E=S.modal.ed;
    if(el.dataset.v!=null){E.vals[el.dataset.v]=el.value;redraw();return;}
    if(el.dataset.p&&el.type==="checkbox"){setp(E,el.dataset.p,el.checked);return;}
    if(el.dataset.p&&el.tagName==="SELECT"){setp(E,el.dataset.p,el.value);if(el.dataset.p==="tank")E.vals={};redraw();return;}
    if(el.dataset.p&&S.modal.kind==="test"&&el.type==="number"){redraw();return;}}
  if(el.dataset.filt==="tank"){S.filt.tank=el.value;render();return;}
  if(el.id==="impfile"&&el.files[0]){readImport(el.files[0]);el.value="";}
});
onDoc("keydown",e=>{if(e.key==="Escape"&&S.modal)closeModal();});
onWin("hashchange",()=>{route();S.pending=false;render();window.scrollTo(0,0);});

/* 12. integration API */
MWS.quench={closeModal,
  refresh:()=>safeRender(),
  hasData:()=>S.tanks.length>0,
  /* each tank with its state (Process validation, HTSA 1.7) */
  tanks:()=>assess314().st.map(({tk,s})=>({id:tk.id,furnace:tk.furnace,media:MEDIA[tk.media]||tk.media,lvl:s.lvl,label:LVL[s.lvl][1]})),
  stats:()=>{const k=kp();return {db:S.dbState,...k,label:SCORE[k.score][1],cls:SCORE[k.score][0]};},
  summary:()=>{const k=kp();return `${k.ok} of ${plural(k.tanks,"quench tank")} in order, ${plural(k.overdue,"test")} overdue, ${plural(k.reviews,"result")} to review, ${plural(k.open,"reaction")} open; HTSA 3.14 ${SCORE[k.score][1].toLowerCase()}.`;}};
window.__QMM={S,assess314,judge,evalT,schedule,tankState,missingAct,retestOf,reviewDue,reviewLate,kp,PL};

/* 13. boot */
async function boot(){
  route();render();
  const [dl,user,db]=await Promise.all([useCap("downloads"),useCap("user"),useCap("db")]);
  S.dl=dl;
  if(user){try{const c=await user.can("data.write");S.canWrite=c!==false;}catch(e){}}
  if(db)startStore(sharedDb(db),"on");else startStore(localDb(),"local");
}
boot();
