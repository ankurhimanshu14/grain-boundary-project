/* Module SPEC: process specifications (CQI-9 HTSA 1.6). Runs inside the shell: ACTIVE, onDoc, onWin, MWS and `location` come from the
   wrapper (build.py). Pattern: UI/UX Reuse Handover §5 (POL). The rules are those of the CALOR page Process_Specifications.html. */

/* 1. collection prefix (shared store only) */
const NS=c=>S.db&&S.db.local?c:"spec-"+c;

/* 2. constants */
const MODNAME="Process specifications";
const COLS=["specs","config"];
const COL_LABEL={specs:"Specifications",config:"Settings"};
const ID_RE=/^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const LKEY="mws-spec-local-v1";
const PROC={HT:"Hardening & tempering",IA:"Isothermal annealing",NORM:"Normalizing"};
const TABLE={HT:"A",IA:"E",NORM:"E"};
const ROLE={HT:{h:"Austenitizing",mid:"Quench",t:"Tempering",after:"Air cooling"},
  IA:{h:"Austenitizing",mid:"Controlled cooling",t:"Isothermal transformation hold",after:"Air cooling"},
  NORM:{h:"Preheating",mid:"Transfer",t:"Austenitizing",after:"Still-air or fan cooling"}};
const MEDIA={oil:"Quench oil",polymer:"Polymer quenchant",water:"Water / brine"};
const SCALES=["HRC","HRB","HB","HV"];
const FORMS={wi:"Work instruction",job:"Job card",recipe:"Computer-based recipe (SCADA / PLC)",other:"Other similar document"};
const NOTIFY={none:"Not required: customer requirements not affected",notified:"Customer notified",approved:"Customer approval obtained (e.g. PPAP)"};
const STATUS={draft:["warn","Draft"],approved:["ok","Approved"],obsolete:["","Obsolete"]};
const DEF={plant:"Mass Wire and Steels Pvt. Ltd. · Bhiwadi",furnaces:"F-01, F-02, F-03, F-04",posH:"5,4,4",posT:"4,4,4",xfer:18,ccXfer:2,
  tol:10,pushTol:0.5,qDelay:30,dip:8.5,dipTol:0.5,transfer:5,ccTol:1,fanTol:5,reviewDays:365,reviewSoon:30,activeDays:90,implDays:7,auth:"",
  runs:"F-01: IA, HT\nF-02: IA, NORM, HT\nF-03: IA, NORM\nF-04: IA, NORM",tanks:"F-01: water\nF-02: oil"};
const SETF=[["plant","Plant","text"],["furnaces","Furnaces (comma separated)","text"],["posH","Tray positions per zone, hardening chamber","text"],["posT","Tray positions per zone, tempering chamber","text"],
  ["xfer","Transfer hardening → tempering chamber, min (measured)","number"],["ccXfer","Isothermal annealing: transfers in and out of the cooling chamber, min","number"],
  ["tol","Default set value tolerance ± °C","number"],["pushTol","Default push time tolerance ± min","number"],["qDelay","Default quench delay, s","number"],["dip","Default dip time, min","number"],
  ["dipTol","Default dip time tolerance ± min","number"],["transfer","Default transfer to tempering, min","number"],["ccTol","Default controlled cooling time tolerance ± min","number"],
  ["fanTol","Default fan cooling time tolerance ± min","number"],["reviewDays","Periodic review every (days)","number"],["reviewSoon","Show a review as due this many days before","number"],
  ["activeDays","Active processes: parts loaded in the last (days)","number"],["implDays","Record the implementation within (days of the approval)","number"]];
/* the controlled documents of this module (QMS/SPEC); the build embeds them in MWS.docs */
const DOCS=[
  ["SPEC/00_SPEC_Master_List.md","Master list"],
  ["SPEC/01_Procedure/MWSPL-QP-SPEC-01_Process_Specifications.md","MWSPL-QP-SPEC-01 Process specifications"],
  ["SPEC/02_Work_Instructions/MWSPL-WI-SPEC-01_Write_and_Approve_a_Specification.md","MWSPL-WI-SPEC-01 Write and approve"],
  ["SPEC/02_Work_Instructions/MWSPL-WI-SPEC-02_Change_a_Specification.md","MWSPL-WI-SPEC-02 Change a specification"],
  ["SPEC/02_Work_Instructions/MWSPL-WI-SPEC-03_Periodic_Review_and_Self-Assessment.md","MWSPL-WI-SPEC-03 Periodic review"],
  ["SPEC/03_Formats/MWSPL-F-SPEC-01_Process_Specification.md","MWSPL-F-SPEC-01 Process specification"],
  ["SPEC/03_Formats/MWSPL-F-SPEC-02_Change_Review.md","MWSPL-F-SPEC-02 Change review"],
  ["SPEC/03_Formats/MWSPL-F-SPEC-03_Authorization_List.md","MWSPL-F-SPEC-03 Authorization list"],
  ["SPEC/03_Formats/MWSPL-F-SPEC-04_Register_and_Review.md","MWSPL-F-SPEC-04 Register and review"],
  ["SPEC/03_Formats/MWSPL-F-SPEC-05_KPI.md","MWSPL-F-SPEC-05 KPIs"],
  ["SPEC/04_Application/mwspl-spec-module.md","Module description"]];

/* 3. helpers */
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{if(v===""||v==null)return null;const n=Number(String(v).replace(",","."));return isFinite(n)?n:null;};
const fx=(v,d=1)=>v==null||!isFinite(v)?"—":(Math.round(v*10**d)/10**d).toString();
const clone=o=>JSON.parse(JSON.stringify(o??null));
const pad=n=>String(n).padStart(2,"0");
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>iso(new Date());
const isDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||""));
const addDays=(s,n)=>{const d=new Date(s+"T00:00:00");d.setDate(d.getDate()+n);return iso(d);};
const daysBetween=(a,b)=>Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/864e5);
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtD=s=>isDate(s)?`${s.slice(8,10)}-${MON[+s.slice(5,7)-1]}-${s.slice(0,4)}`:"—";
const curFY=()=>{const d=new Date();return d.getMonth()>=3?d.getFullYear():d.getFullYear()-1;};
const fyLabel=y=>`FY ${y}-${String(y+1).slice(2)}`;
const inFY=(s,y)=>isDate(s)&&s>=`${y}-04-01`&&s<=`${y+1}-03-31`;
const getp=(o,p)=>p.split(".").reduce((a,k)=>a==null?a:a[k],o);
const setp=(o,p,v)=>{const k=p.split(".");let a=o;k.slice(0,-1).forEach(x=>{if(a[x]==null||typeof a[x]!=="object")a[x]={};a=a[x];});a[k.at(-1)]=v;};
const pill=(c,t)=>`<span class="pill ${c||""}">${esc(t)}</span>`;
const plural=(n,w,p)=>`${n} ${n===1?w:(p||w+"s")}`;
const isNA=v=>/^(n\/?a|not available)$/i.test(String(v||"").trim());
const pos=str=>String(str||"").split(/[\s,;]+/).map(Number).filter(n=>n>0);
const sum=a=>a.reduce((x,y)=>x+y,0);
const nextCode=(p,list)=>p+"-"+String(Math.max(0,...list.map(x=>+(String(x.id).match(/(\d+)$/)||[0,0])[1]))+1).padStart(4,"0");

/* 4. state */
const S={view:"dash",db:null,dbState:"connecting",canWrite:true,dl:null,specs:[],cfg:{...DEF},docSel:DOCS[0][0],imp:null,modal:null,pending:false,fy:curFY(),
  filt:{proc:"",f:"",st:"",q:""},unsub:[],q:{}};
const C=()=>S.cfg;

/* 5. domain logic (the rules of the CALOR Specifications page) */
function fill(s){
  const c=C(),d={id:"",rev:0,status:"draft",part:"",name:"",customer:"",drawing:"",grade:"",proc:"HT",furnaces:[],pcs:"",wt:"",fixture:"",
    h:["","",""],t:["","",""],htol:[c.tol,c.tol,c.tol],ttol:[c.tol,c.tol,c.tol],push:"",pushTol:c.pushTol,
    q:{medium:"oil",tLo:"",tHi:"",delay:c.qDelay,dip:c.dip,dipTol:"",transfer:c.transfer,agit:"Required"},
    cc:{time:"",timeTol:"",method:"",target:"",targetTol:""},nm:{transfer:"",fan:"none",fanTime:"",fanTol:""},
    req:{hMin:"",hMax:"",scale:"HRC",core:"",micro:"",decarb:"",grain:"",other:"",sample:"",method:""},
    form:"",formRef:"",chg:{cust:"",notify:"",notifyRef:"",cp:false,valid:""},implDate:"",implBy:"",
    notes:"",prep:"",revBy:"",appr:"",apprDate:"",change:"",revs:[],reviews:[],log:[]};
  const o={...d,...(s||{})};["q","cc","nm","req","chg"].forEach(k=>o[k]={...d[k],...((s&&s[k])||{})});
  ["h","t","htol","ttol"].forEach(k=>o[k]=[0,1,2].map(i=>((s&&s[k])||d[k])[i]??d[k][i]));
  ["furnaces","revs","reviews","log"].forEach(k=>{if(!Array.isArray(o[k]))o[k]=[];});
  return o;
}
const furnaces=()=>[...new Set(String(C().furnaces||"").split(/[,;\s]+/).filter(Boolean).concat(S.specs.flatMap(s=>s.furnaces)))].sort();
const mapOf=txt=>{const m={};String(txt||"").split(/[\n;]+/).forEach(l=>{const x=l.match(/^\s*([^:]+):(.*)$/);if(x)m[x[1].trim().toUpperCase()]=x[2].trim();});return m;};
const runsOf=f=>{const v=mapOf(C().runs)[String(f).toUpperCase()];return v==null?null:v.split(/[,\s]+/).map(x=>x.toUpperCase()).filter(x=>PROC[x]);};
const tankOf=f=>{const v=mapOf(C().tanks)[String(f).toUpperCase()];return v?v.toLowerCase():null;};
const docNo=s=>`${s.id||"PS-new"} rev ${s.rev}`;
/* the revision in force: the record when approved, else the last approved revision while a new one is drafted */
function eff(s){if(s.status==="approved")return s;if(s.status==="draft"&&s.rev>0){const r=s.revs.at(-1);return r&&r.status==="approved"?r:null;}return null;}
function calc(s){
  const p=num(s.push),PH=pos(C().posH),PT=pos(C().posT);if(p==null||p<=0)return null;
  const zh=PH.map(n=>n*p),zt=PT.map(n=>n*p);
  const cool=s.proc==="IA"?num(s.cc.time):null,xfer=s.proc==="IA"?(num(C().ccXfer)||0):null;
  const gap=s.proc==="IA"?(cool||0)+xfer:(num(C().xfer)??DEF.xfer);
  const pcs=num(s.pcs),wt=num(s.wt),trayKg=pcs!=null&&wt!=null?pcs*wt:null;
  return {zh,zt,ch:sum(zh),ct:sum(zt),gap,cool,xfer,idle:cool!=null?p-gap:null,total:sum(zh)+sum(zt)+gap,trays:60/p,pcsH:pcs!=null?60/p*pcs:null,trayKg,kgH:trayKg!=null?60/p*trayKg:null};
}
/* who may approve: the HT organization in this browser (holder / deputy of the HT position and of positions marked authorized), else Settings */
function authList(){
  try{const o=JSON.parse(localStorage.getItem("org-reg")||"null");
    if(o&&Array.isArray(o.positions)&&Array.isArray(o.people)){const nm=id=>(o.people.find(p=>p.id===id)||{}).name;const L=[];
      o.positions.filter(p=>p.ht||p.specAuth).forEach(p=>[p.holder,p.deputy].forEach(id=>{const n=nm(id);if(n&&!L.some(x=>x.name===n))L.push({name:n,position:p.title||""});}));
      if(L.length)return {src:"HT organization (CALOR, this browser)",list:L};}}catch(e){}
  return {src:"Settings",list:String(C().auth||"").split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean).map(n=>({name:n,position:""}))};
}
const isAuth=n=>{const x=String(n||"").trim().toLowerCase();return !!x&&authList().list.some(a=>String(a.name).trim().toLowerCase()===x);};
/* active processes: parts loaded on the CALOR Daily production page (this browser) in the last activeDays */
function activeParts(){
  try{const o=JSON.parse(localStorage.getItem("prod-reg")||"null");if(!o||!Array.isArray(o.reports))return null;
    const from=addDays(today(),-(+C().activeDays||90)),m=new Map();
    o.reports.filter(r=>isDate(r.date)&&r.date>=from).forEach(r=>((r.tl&&r.tl.trays)||[]).forEach(t=>(t.items||[]).forEach(it=>{const p=String(it.part||"").trim();if(!p||isNA(p))return;
      const k=p.toUpperCase()+"|"+r.furnace,x=m.get(k);if(!x||x.last<r.date)m.set(k,{part:p,furnace:r.furnace,last:r.date});})));
    return [...m.values()];}catch(e){return null;}
}
const hardTxt=s=>{const a=num(s.req.hMin),b=num(s.req.hMax);return a==null&&b==null?"—":`${a??"…"} – ${b??"…"} ${s.req.scale}`;};
function params(s){
  const R=ROLE[s.proc]||ROLE.HT,P=[],n=num,t=v=>String(v??"").trim();
  const pm=(step,param,v,tl,u)=>P.push({step,param,txt:n(v)!=null?`${n(v)}${n(tl)!=null?" ± "+n(tl):""} ${u}`:"—",ok:n(v)!=null&&n(tl)!=null,miss:n(v)==null?"value":n(tl)==null?"tolerance":""});
  const mx=(step,param,v,u)=>P.push({step,param,txt:n(v)!=null?`≤ ${n(v)} ${u}`:"—",ok:n(v)!=null,miss:n(v)==null?"maximum":""});
  const rg=(step,param,lo,hi,u)=>P.push({step,param,txt:n(lo)!=null||n(hi)!=null?`${n(lo)??"?"} – ${n(hi)??"?"} ${u}`:"—",ok:n(lo)!=null&&n(hi)!=null&&n(lo)<=n(hi),miss:n(lo)==null||n(hi)==null?"lower and upper limit":n(lo)>n(hi)?"limits in order":""});
  const st=(step,param,v,opt)=>P.push({step,param,txt:t(v)||"—",ok:!!t(v),miss:t(v)?"":"value",opt:!!opt});
  mx("Loading","Pieces per tray",s.pcs,"pcs");st("Loading","Loading pattern / fixture",s.fixture,true);
  pm("Pusher","Push time",s.push,s.pushTol,"min");
  [0,1,2].forEach(i=>pm(`Hardening chamber · ${R.h}`,`Zone ${i+1} set value`,s.h[i],s.htol[i],"°C"));
  if(s.proc==="HT"){st("Quench","Quench medium",MEDIA[s.q.medium]);rg("Quench","Quenchant temperature",s.q.tLo,s.q.tHi,"°C");mx("Quench","Quench delay",s.q.delay,"s");
    pm("Quench","Dip time",s.q.dip,s.q.dipTol,"min");st("Quench","Agitation",s.q.agit);mx("Quench","Transfer to the tempering chamber",s.q.transfer,"min");}
  if(s.proc==="IA"){pm("Controlled cooling","Cooling (air blowing) time",s.cc.time,s.cc.timeTol,"min");st("Controlled cooling","Method",s.cc.method);
    if(n(s.cc.target)!=null)pm("Controlled cooling","Target temperature before the tempering chamber",s.cc.target,s.cc.targetTol,"°C");}
  if(s.proc==="NORM")mx("Transfer","Transfer between the chambers",s.nm.transfer,"min");
  [0,1,2].forEach(i=>pm(`Tempering chamber · ${R.t}`,`Zone ${i+1} set value`,s.t[i],s.ttol[i],"°C"));
  if(s.proc==="NORM"&&s.nm.fan==="required")pm("After exit","Fan cooling time",s.nm.fanTime,s.nm.fanTol,"min");else st("After exit","Cooling",R.after);
  {const a=n(s.req.hMin),b=n(s.req.hMax);P.push({step:"Testing",param:"Surface hardness",txt:hardTxt(s),ok:a!=null||b!=null,miss:a==null&&b==null?"requirement":""});}
  st("Testing","Sampling (quantity and frequency)",s.req.sample);
  return P;
}
const paramMiss=s=>params(s).filter(p=>!p.ok&&!p.opt).map(p=>`${p.step.split(" · ")[0]}: ${p.param.toLowerCase()} (${p.miss})`);
function chgMissing(s){const c=s.chg||{},m=[],t=v=>String(v??"").trim();
  if(!t(c.cust))m.push("change review: customer requirements checked");
  if(!c.notify)m.push("change review: customer notification decision");else if(c.notify!=="none"&&!t(c.notifyRef))m.push("change review: notification / approval reference");
  if(!c.cp)m.push("change review: control plan and PFMEA reviewed");if(!t(c.valid))m.push("change review: validation (trial or first-off result)");return m;}
/* approval gate */
function missing(s){
  const m=[],e=v=>String(v??"").trim()==="";
  if(e(s.part))m.push("part no.");if(e(s.name))m.push("part name");if(e(s.grade))m.push("steel grade");
  if(!s.furnaces.length)m.push("approved furnaces");if(num(s.wt)==null)m.push("part weight");
  m.push(...paramMiss(s));if(!s.req.scale)m.push("hardness scale");if(e(s.req.decarb))m.push("decarburization limit");
  if(!s.form)m.push("where it is available at the line (work instruction, job card, recipe)");
  if(e(s.prep))m.push("prepared by");if(e(s.revBy))m.push("reviewed by");
  if(e(s.appr))m.push("approved by");else if(!isAuth(s.appr))m.push(authList().list.length?`approval by an authorized person (${String(s.appr).trim()} is not authorized)`:"an authorized person: enter who may approve (Authorization tab)");
  if(!isDate(s.apprDate))m.push("approval date");else if(s.apprDate>today())m.push("approval date not in the future");
  if(s.rev>0){if(e(s.change))m.push("reason for the change");m.push(...chgMissing(s));}
  return m;
}
/* line-practice advice; a crit item blocks the approval */
function advice(s){
  const a=[],h=s.h.map(num),t=s.t.map(num),aus=Math.max(...h.slice(1).filter(v=>v!=null),-Infinity);
  const nr=s.furnaces.filter(f=>{const r=runsOf(f);return r&&!r.includes(s.proc);});
  if(nr.length)a.push(["crit",`${nr.join(", ")} ${nr.length>1?"do":"does"} not run ${PROC[s.proc].toLowerCase()}${s.proc==="HT"?" (no quench tank)":""}: remove ${nr.length>1?"them":"it"} or correct the processes per furnace.`]);
  if(s.proc==="HT"||s.proc==="IA"){
    if(h.slice(1).some(v=>v!=null&&v<=800))a.push(["warn","Hardening chamber zones 2–3 at or below 800 °C: austenitizing on this line is above 800 °C."]);
    if(t.some(v=>v!=null&&isFinite(aus)&&v>=aus))a.push(["warn",`${ROLE[s.proc].t} set value is not below the austenitizing set value.`]);}
  if(s.proc==="NORM"){if(h.some(v=>v!=null&&(v<700||v>750)))a.push(["warn","Normalizing preheat in the hardening chamber is normally 700–750 °C on this line."]);
    if(t.some(v=>v!=null&&v<=800))a.push(["warn","Normalizing austenitizes in the tempering chamber: a set value at or below 800 °C is unusual."]);}
  if(s.proc==="IA"){const c=calc(s),cc=num(s.cc.time);
    if(c&&cc!=null&&c.gap>=num(s.push))a.push(["crit",`The controlled cooling cycle (cooling ${cc} + transfers ${c.xfer} = ${fx(c.gap)} min) does not fit in the push time ${s.push} min: it must end before the next push.`]);
    else if(c&&cc!=null&&c.idle<1)a.push(["warn",`Only ${fx(c.idle)} min of the ${s.push} min push time is left after the controlled cooling cycle.`]);}
  if(s.proc==="HT"){if(num(s.q.tLo)!=null&&num(s.q.tHi)!=null&&num(s.q.tLo)>num(s.q.tHi))a.push(["crit","Quenchant temperature: the lower limit is above the upper limit."]);
    s.furnaces.forEach(f=>{const tk=tankOf(f);if(!tk)a.push(["warn",`${f} has no quench tank (Settings → quench tank per furnace).`]);
      else if(!String(MEDIA[s.q.medium]||"").toLowerCase().startsWith(tk))a.push(["warn",`${f} quenches in ${tk}, not ${String(MEDIA[s.q.medium]).toLowerCase()}.`]);});}
  if(num(s.req.hMin)!=null&&num(s.req.hMax)!=null&&num(s.req.hMin)>num(s.req.hMax))a.push(["crit","Hardness: the minimum is above the maximum."]);
  const c=calc(s);if(c&&c.trayKg!=null&&c.trayKg>200)a.push(["warn",`Load per tray ${fx(c.trayKg)} kg is above the 200 kg of the HK trays.`]);
  const dup=isNA(s.part)?[]:S.specs.filter(x=>x.id!==s.id&&x.status!=="obsolete"&&x.part&&!isNA(x.part)&&x.part.trim().toLowerCase()===String(s.part).trim().toLowerCase()&&x.proc===s.proc);
  if(dup.length)a.push(["warn",`Another specification for this part and process exists: ${dup.map(docNo).join(", ")}.`]);
  return a;
}
/* periodic review: due reviewDays after the later of the approval of the revision in force and the last review without change */
function review(s){
  const e=eff(s);if(!e||!isDate(e.apprDate))return {st:"none"};
  const rv=(s.reviews||[]).filter(r=>r.rev===e.rev&&isDate(r.date)&&r.date>=e.apprDate).map(r=>r.date).sort().at(-1);
  const base=rv||e.apprDate,due=addDays(base,+C().reviewDays||365),left=daysBetween(today(),due);
  return {st:left<0?"overdue":left<=(+C().reviewSoon||30)?"soon":"ok",due,left,base,last:rv||""};
}
const implLate=e=>!isDate(e.implDate)&&isDate(e.apprDate)&&daysBetween(e.apprDate,today())>(+C().implDays||7);
/* HTSA 1.6 self-assessment */
function assess16(){
  const I=[],add=(lvl,req,ev,act)=>I.push({lvl,req,ev,act:act||""}),A=authList(),IF=S.specs.map(s=>({s,e:eff(s)})).filter(x=>x.e);
  const nm=x=>`${x.s.id} rev ${x.e.rev} (${x.e.part})`,lim=(L,f)=>L.slice(0,6).map(f).join("; ")+(L.length>6?` … (${L.length} in all)`:"");
  if(!A.list.length)add("crit","Authorization to establish process specifications is defined","Nobody is authorized.","Enter the authorized people (Authorization tab) or the HT organization in CALOR.");
  else add("ok","Authorization to establish process specifications is defined",`${A.list.map(a=>a.name+(a.position?` (${a.position})`:"")).join(", ")}: from ${A.src}.`);
  const un=IF.filter(x=>!isAuth(x.e.appr));
  add(!IF.length?"info":un.length?"crit":"ok","Specifications approved by an authorized person",!IF.length?"No specification in force.":un.length?`Approved by a person not (or no longer) authorized: ${lim(un,x=>nm(x)+" by "+(x.e.appr||"—"))}.`:`All ${IF.length} specifications in force were approved by an authorized person.`,un.length?"Re-approve by an authorized person (new revision) or correct the authorization.":"");
  const AP=activeParts();
  if(!IF.length)add("crit","Written process specifications for all active processes","No approved specification in force.","Write and approve the process specifications.");
  else if(AP==null)add("info","Written process specifications for all active processes",`${plural(IF.length,"specification")} in force (${[...new Set(IF.map(x=>PROC[x.e.proc]))].join(", ")}). No CALOR production data in this browser to check them against.`);
  else{const miss=AP.filter(a=>!IF.some(x=>x.e.part.trim().toUpperCase()===a.part.toUpperCase()&&x.e.furnaces.includes(a.furnace)));
    add(miss.length?"crit":"ok","Written process specifications for all active processes",miss.length?`Loaded in the last ${C().activeDays} days without a specification in force for the furnace: ${lim(miss,a=>`${a.part} on ${a.furnace} (last ${fmtD(a.last)})`)}.`:`All ${plural(AP.length,"part / furnace combination")} of the last ${C().activeDays} days have a specification in force.`,miss.length?"Write and approve them, or add the furnace by a new revision.":"");}
  const pb=IF.map(x=>({x,m:paramMiss(x.e)})).filter(y=>y.m.length);
  if(IF.length)add(pb.length?"crit":"ok","All steps with their parameters and operating tolerances",pb.length?`Missing: ${lim(pb,y=>nm(y.x)+": "+y.m.join(", "))}.`:`Every step of the ${plural(IF.length,"specification")} in force has its parameters with a tolerance, a maximum or a range.`,pb.length?"Make a new revision that adds the missing tolerances.":"");
  const nf=IF.filter(x=>!x.e.form);
  if(IF.length)add(nf.length?"crit":"ok","Available as work instruction, job card or recipe",nf.length?`Not stated for: ${lim(nf,nm)}.`:[...new Set(IF.map(x=>FORMS[x.e.form]))].join(", ")+".",nf.length?"State where each specification is available at the line (new revision).":"");
  const cr=IF.filter(x=>x.e.rev>0).map(x=>({x,m:chgMissing(x.e)})).filter(y=>y.m.length),nch=IF.filter(x=>x.e.rev>0).length;
  if(IF.length)add(cr.length?"crit":nch?"ok":"info","Changes reviewed for continued conformity with customer requirements",cr.length?`Revisions in force without a complete change review: ${lim(cr,y=>nm(y.x))}.`:nch?`${plural(nch,"revision")} in force with the change review recorded.`:"No revision after rev 0 in force yet.");
  const ni=IF.filter(x=>!isDate(x.e.implDate)),late=ni.filter(x=>implLate(x.e));
  if(IF.length)add(late.length?"crit":ni.length?"warn":"ok","Changes documented with the date implemented and the approver",ni.length?`Implementation date not recorded for: ${lim(ni,x=>nm(x)+" approved "+fmtD(x.e.apprDate))}.`:"Every specification in force shows its approver and the date it was implemented.",ni.length?`Record the implementation (within ${C().implDays} days of the approval).`:"");
  const od=IF.filter(x=>review(x.s).st==="overdue");
  if(od.length)add("warn","Periodic review",`Overdue: ${lim(od,nm)}.`,"Review the specifications (Review tab).");
  const crit=I.filter(i=>i.lvl==="crit"),noSpec=I.some(i=>i.lvl==="crit"&&/^Written/.test(i.req));
  return {I,score:noSpec?"nia":crit.length?"ns":"s"};
}
const SCORE={s:["ok","Satisfactory","acc"],ns:["warn","Not satisfactory","cond"],nia:["bad","Needs immediate action","rej"]};
const LV={ok:["ok","Met"],warn:["warn","Attention"],crit:["bad","Not met"],info:["acc","Note"]};
/* KPIs (F-SPEC-05) */
function kp(){
  const IF=S.specs.map(s=>({s,e:eff(s)})).filter(x=>x.e),AP=activeParts(),A=assess16();
  const noSpec=AP==null?null:AP.filter(a=>!IF.some(x=>x.e.part.trim().toUpperCase()===a.part.toUpperCase()&&x.e.furnaces.includes(a.furnace))).length;
  const dr30=S.specs.filter(s=>s.status==="draft"&&(()=>{const d=(s.log[0]||{}).d;return isDate(d)&&daysBetween(d,today())>30;})()).length;
  return {inForce:IF.length,parts:new Set(IF.map(x=>x.e.part.trim().toLowerCase())).size,drafts:S.specs.filter(s=>s.status==="draft").length,
    soon:S.specs.filter(s=>review(s).st==="soon").length,over:S.specs.filter(s=>review(s).st==="overdue").length,noSpec,
    implLate:IF.filter(x=>implLate(x.e)).length,implOpen:IF.filter(x=>!isDate(x.e.implDate)).length,
    chgOpen:IF.filter(x=>x.e.rev>0&&chgMissing(x.e).length).length,dr30,score:A.score,notMet:A.I.filter(i=>i.lvl==="crit").length};
}
/* every approved revision (the record and its snapshots) for the monthly grid and the change list */
const allRevs=()=>S.specs.flatMap(s=>[...s.revs,s].filter(r=>r&&r.status!=="draft"&&isDate(r.apprDate)).map(r=>({s,r})));

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
/* one write at a time per document */
function dbSet(c,id,v){if(!ID_RE.test(id))return Promise.reject({message:"invalid record id "+id});const k=c+"/"+id;
  const p=(S.q[k]||Promise.resolve()).catch(()=>{}).then(()=>S.db.set(c,id,JSON.parse(JSON.stringify(v))));S.q[k]=p;return p;}
function dbDel(c,id){const k=c+"/"+id;const p=(S.q[k]||Promise.resolve()).catch(()=>{}).then(()=>S.db.del(c,id));S.q[k]=p;return p;}
async function save(s,logText){
  if(!needDb())return false;const o=fill(s);if(logText)o.log.push({d:today(),t:logText});
  try{await dbSet("specs",o.id,o);return true;}catch(e){toast("Not saved: "+errMsg(e));return false;}
}
async function saveCfg(){if(!needDb())return;try{await dbSet("config","settings",S.cfg);toast("Settings saved");}catch(e){toast("Not saved: "+errMsg(e));}}
function startStore(store,state){
  S.unsub.forEach(u=>{try{u();}catch(e){}});S.db=store;S.dbState=state;
  S.unsub=[store.sub("specs",L=>{S.specs=L.map(fill).sort((a,b)=>a.id<b.id?-1:1);safeRender();}),
    store.sub("config",L=>{const c=L.find(x=>x.id==="settings");S.cfg={...DEF,...(c||{})};delete S.cfg.id;safeRender();})];
  render();
}
/* do not re-render under the user's hands: wait while a modal is open or an input has focus */
function safeRender(){
  const a=document.activeElement;if(S.modal||(a&&$("#main")&&$("#main").contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=true;return;}
  render();
}
onDoc("focusout",()=>setTimeout(()=>{if(S.pending&&!S.modal){const a=document.activeElement;if(!(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=false;render();}}},0));

/* 7. navigation */
const NAV=[["",[["dash","Dashboard"]]],["P",[["specs","Register"],["auth","Authorization & settings"]]],["D",[["line","At the line"]]],
  ["C",[["review","Review & HTSA 1.6"],["kpi","KPIs"]]],["A",[["changes","Revisions"]]],["",[["rules","Rules"],["docs","Documentation"],["data","Data"]]]];
const navHtml=()=>`<div class="wrap">${NAV.map(([p,it])=>`<div class="grp">${p?`<span class="pd">${p}</span>`:""}${it.map(([k,l])=>`<a href="#${k}" ${S.view===k?'aria-current="page"':""}>${l}</a>`).join("")}</div>`).join("")}</div>`;
function route(){const v=(location.hash||"").slice(1);S.view=VIEWS[v]?v:"dash";}
const banner=()=>S.dbState==="local"?`<div class="banner warn">Local mode: records are kept in this browser only. Back up from the <a href="#data">Data</a> tab.</div>`
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
const stPill=s=>{const e=eff(s);return s.status==="draft"&&e?pill("warn",`Rev ${s.rev} draft · rev ${e.rev} in force`):pill(...STATUS[s.status]);};
const rvPill=s=>{const r=review(s);return r.st==="none"?"":r.st==="overdue"?pill("bad","Review overdue"):r.st==="soon"?pill("warn","Review due "+fmtD(r.due)):pill("ok","Review "+fmtD(r.due));};
function vDash(){
  const k=kp(),A=assess16(),sc=SCORE[A.score];
  if(!S.specs.length)return `<div class="empty"><h2>No process specifications yet</h2><p>Write the first specification, or load the example set-up to see how the module works.</p><div class="row" style="justify-content:center"><button class="pri w" data-new-spec>New specification</button><button class="w" data-std>Load starter set-up</button></div></div>`;
  const att=[...S.specs.filter(s=>review(s).st==="overdue").map(s=>[`#review`,`${docNo(eff(s)||s)} ${s.part}: periodic review overdue`,"bad"]),
    ...S.specs.map(s=>({s,e:eff(s)})).filter(x=>x.e&&implLate(x.e)).map(x=>[`#line`,`${docNo(x.e)} ${x.e.part}: implementation not recorded`,"bad"]),
    ...S.specs.filter(s=>s.status==="draft").map(s=>[`#specs`,`${docNo(s)} ${s.part}: draft waiting for approval`,"warn"])];
  return `<div class="tiles">
    <a class="tile" href="#specs"><span class="k">In force</span><span class="v">${k.inForce}</span><span class="small muted">${plural(k.parts,"part")}</span></a>
    <a class="tile ${k.drafts?"warn":""}" href="#specs"><span class="k">Drafts</span><span class="v">${k.drafts}</span><span class="small muted">waiting for approval</span></a>
    <a class="tile ${k.over?"bad":k.soon?"warn":"ok"}" href="#review"><span class="k">Reviews</span><span class="v">${k.over}</span><span class="small muted">overdue · ${k.soon} due soon</span></a>
    <a class="tile ${k.implLate?"bad":k.implOpen?"warn":"ok"}" href="#line"><span class="k">Implementation</span><span class="v">${k.implOpen}</span><span class="small muted">not recorded · ${k.implLate} late</span></a>
    <a class="tile ${k.noSpec==null?"":k.noSpec?"bad":"ok"}" href="#review"><span class="k">Active parts without spec</span><span class="v">${k.noSpec??"—"}</span><span class="small muted">${k.noSpec==null?"no CALOR production data":"last "+C().activeDays+" days"}</span></a>
    <a class="tile ${sc[0]}" href="#review"><span class="k">HTSA 1.6</span><span class="v" style="font-size:20px;padding:6px 0">${sc[1]}</span><span class="small muted">${plural(k.notMet,"item")} not met</span></a></div>
  <div class="pdca"><div><span class="ph">P</span><br>Authorization, processes per furnace, write the specification with every step and tolerance.</div><div><span class="ph">D</span><br>Approve, make it available at the line (job card / recipe), record the implementation.</div><div><span class="ph">C</span><br>Periodic review, active parts against specs in force, HTSA 1.6 score, KPIs.</div><div><span class="ph">A</span><br>New revision with a change review; make obsolete.</div></div>
  <div class="panel"><div class="row between"><h3>Needs attention</h3><button class="pri w" data-new-spec>New specification</button></div>${att.length?`<ul class="issues">${att.slice(0,12).map(([h,t,c])=>`<li><a href="${h}">${esc(t)}</a> ${pill(c,c==="bad"?"Action":"Attention")}</li>`).join("")}</ul>`:`<p class="muted">Nothing open.</p>`}</div>`;
}
function vSpecs(){
  const f=S.filt,L=S.specs.filter(s=>(!f.proc||s.proc===f.proc)&&(!f.f||s.furnaces.includes(f.f))&&(!f.st||s.status===f.st)&&(!f.q||(s.id+" "+s.part+" "+s.name+" "+s.customer+" "+s.grade).toLowerCase().includes(f.q.toLowerCase())));
  return `<div class="row between"><h2>Specification register</h2><div class="row"><button class="pri w" data-new-spec>New specification</button><button data-csv>Register CSV</button></div></div>
  <div class="fields"><label class="f"><span>Process</span><select data-filt="proc"><option value="">All</option>${Object.entries(PROC).map(([k,v])=>`<option value="${k}" ${f.proc===k?"selected":""}>${v}</option>`).join("")}</select></label>
    <label class="f"><span>Furnace</span><select data-filt="f"><option value="">All</option>${furnaces().map(x=>`<option ${f.f===x?"selected":""}>${esc(x)}</option>`).join("")}</select></label>
    <label class="f"><span>Status</span><select data-filt="st"><option value="">All</option>${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${f.st===k?"selected":""}>${v[1]}</option>`).join("")}</select></label>
    <label class="f"><span>Search</span><input data-filt="q" value="${esc(f.q)}" placeholder="part, name, customer, grade"></label></div>
  ${L.length?`<div class="tw"><table><thead><tr><th>Spec</th><th>Part</th><th>Process</th><th>Furnaces</th><th class="n">Push</th><th>Hardness</th><th>Status</th><th>Review</th></tr></thead><tbody>${L.map(s=>{const e=eff(s)||s;
    return `<tr class="click" data-spec="${esc(s.id)}"><td class="mono">${esc(docNo(s))}</td><td><b>${esc(s.part)}</b><br><span class="small muted">${esc(s.name)}${s.grade?" · "+esc(s.grade):""}</span></td><td>${esc(PROC[s.proc])}<br><span class="small muted">Table ${TABLE[s.proc]}</span></td><td>${esc(s.furnaces.join(", ")||"—")}</td><td class="n">${esc(e.push||"—")}</td><td>${esc(hardTxt(e))}</td><td>${stPill(s)}</td><td>${rvPill(s)}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No specification matches the filter.</p></div>`}`;
}
function vAuth(){
  const A=authList(),c=C();
  return `<div class="grid2"><div class="panel"><h3>Authorized to approve process specifications</h3>
    <p class="small muted">Source now: <b>${esc(A.src)}</b>. In a browser where CALOR's HT organization page holds positions, its holder and deputy of the heat treat position and of positions marked "authorized" are used; otherwise the names below.</p>
    ${A.list.length?`<ul class="issues">${A.list.map(a=>`<li>${esc(a.name)}${a.position?` <span class="muted">(${esc(a.position)})</span>`:""}</li>`).join("")}</ul>`:`<p class="banner bad">Nobody is authorized: no specification can be approved.</p>`}
    <label class="f" style="margin-top:10px"><span>Authorized names (one per line), used when no HT organization is found</span><textarea data-cfg="auth" rows="4">${esc(c.auth)}</textarea></label></div>
  <div class="panel"><h3>Processes and quench per furnace</h3>
    <label class="f"><span>Processes per furnace (one line per furnace, e.g. "F-01: IA, HT"). A specification cannot be approved for a furnace that does not run its process.</span><textarea data-cfg="runs" rows="5">${esc(c.runs)}</textarea></label>
    <label class="f" style="margin-top:8px"><span>Quench tank per furnace ("F-01: water"); furnaces without a line have no quench</span><textarea data-cfg="tanks" rows="3">${esc(c.tanks)}</textarea></label></div></div>
  <div class="panel"><h3>Line layout and defaults</h3><p class="small muted">Defaults fill new specifications only; saved specifications keep their values.</p>
    <div class="fields">${SETF.map(([k,l,t])=>`<label class="f"><span>${esc(l)}</span><input data-cfg="${k}" type="${t}" value="${esc(c[k])}"></label>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="pri w" data-save-cfg>Save settings</button><span class="small muted">Changes are kept only after Save.</span></div></div>`;
}
function vLine(){
  const L=S.specs.map(s=>({s,e:eff(s)})).filter(x=>x.e);
  return `<h2>At the line: job cards and implementation</h2><p class="muted">Every specification in force must be available at the line (job card, work instruction or recipe) and its implementation recorded within ${C().implDays} days of the approval.</p>
  ${L.length?`<div class="tw"><table><thead><tr><th>Spec in force</th><th>Part</th><th>Furnaces</th><th>Available as</th><th>Approved</th><th>Implemented</th><th></th></tr></thead><tbody>${L.map(({s,e})=>`<tr><td class="mono">${esc(docNo(e))}</td><td>${esc(e.part)} · ${esc(e.name)}</td><td>${esc(e.furnaces.join(", "))}</td><td>${esc(FORMS[e.form]||"—")}${e.formRef?`<br><span class="small muted">${esc(e.formRef)}</span>`:""}</td><td>${fmtD(e.apprDate)}<br><span class="small muted">${esc(e.appr)}</span></td>
    <td>${isDate(e.implDate)?`${fmtD(e.implDate)}<br><span class="small muted">${esc(e.implBy)}</span>`:implLate(e)?pill("bad","Not recorded · late"):pill("warn","Not recorded")}</td>
    <td><div class="row"><button data-job="${esc(s.id)}">Job card</button>${!isDate(e.implDate)&&s.status==="approved"?`<button class="w" data-impl="${esc(s.id)}">Record implementation</button>`:""}</div></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty"><p>No specification in force.</p></div>`}`;
}
function vReview(){
  const A=assess16(),sc=SCORE[A.score],L=S.specs.filter(s=>eff(s)).sort((a,b)=>(review(a).due||"")<(review(b).due||"")?-1:1);
  return `<div class="panel"><div class="row between"><h3>HTSA 1.6 · Documented system to create process specifications</h3><button data-h16>Evidence (print)</button></div>
    <p><span class="verdict ${sc[2]}">${sc[1]}</span> <span class="muted">${plural(A.I.filter(i=>i.lvl==="ok").length,"item")} met · ${plural(A.I.filter(i=>i.lvl==="crit").length,"item")} not met · ${plural(A.I.filter(i=>i.lvl==="warn").length,"item")} needing attention</span></p>
    <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th><th>Action</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${pill(...LV[i.lvl])}</td><td>${esc(i.act)}</td></tr>`).join("")}</tbody></table></div></div>
  <div class="panel"><h3>Periodic review (every ${C().reviewDays} days)</h3>
    ${L.length?`<div class="tw"><table><thead><tr><th>Spec in force</th><th>Part</th><th>Approved</th><th>Last review</th><th>Due</th><th></th></tr></thead><tbody>${L.map(s=>{const e=eff(s),r=review(s);
      return `<tr><td class="mono">${esc(docNo(e))}</td><td>${esc(e.part)}</td><td>${fmtD(e.apprDate)}</td><td>${r.last?fmtD(r.last):"—"}</td><td>${rvPill(s)}</td><td><div class="row"><button class="w" data-review="${esc(s.id)}">Record review</button><button class="w" data-spec="${esc(s.id)}">Open</button></div></td></tr>`;}).join("")}</tbody></table></div>`:`<p class="muted">No specification in force.</p>`}</div>`;
}
function vKpi(){
  const y=S.fy,k=kp(),R=allRevs(),months=[...Array(12)].map((_,i)=>{const m=(i+3)%12,yr=i<9?y:y+1;return `${yr}-${pad(m+1)}`;});
  const cnt=f=>months.map(m=>f(m));
  const rows=[["SPEC-3","Revisions approved",cnt(m=>R.filter(x=>x.r.apprDate.slice(0,7)===m).length),"sum"],
    ["SPEC-3b","Implementations recorded",cnt(m=>R.filter(x=>isDate(x.r.implDate)&&x.r.implDate.slice(0,7)===m).length),"sum"],
    ["SPEC-3c","Periodic reviews without change",cnt(m=>S.specs.flatMap(s=>s.reviews).filter(r=>String(r.date).slice(0,7)===m).length),"sum"]];
  return `<div class="row between"><h2>KPIs · ${fyLabel(y)}</h2><div class="row"><button data-fy="-1">← ${fyLabel(y-1)}</button><button data-fy="1">${fyLabel(y+1)} →</button></div></div>
  <div class="panel"><h3>Current position (F-SPEC-05 §2)</h3><div class="tw"><table><thead><tr><th>Code</th><th>KPI</th><th class="n">Now</th><th class="n">Target (to confirm)</th></tr></thead><tbody>
    ${[["SPEC-1","Active part / furnace combinations without a specification in force",k.noSpec??"—",0],["SPEC-2","Specifications with the periodic review overdue",k.over,0],["SPEC-4","Specifications in force without the implementation recorded in time",k.implLate,0],
      ["SPEC-5","Revisions in force with an incomplete change review",k.chgOpen,0],["SPEC-6","Drafts waiting for approval longer than 30 days",k.dr30,0],["SPEC-7","HTSA 1.6 score",SCORE[k.score][1],"Satisfactory"]]
      .map(([c,l,v,t])=>`<tr><td class="mono">${c}</td><td>${l}</td><td class="n"><b>${esc(v)}</b></td><td class="n">${esc(t)}</td></tr>`).join("")}</tbody></table></div></div>
  <div class="panel"><h3>Monthly grid (F-SPEC-05 §1)</h3><div class="tw"><table><thead><tr><th>Code</th><th>Activity</th>${months.map(m=>`<th class="n">${MON[+m.slice(5)-1]}</th>`).join("")}<th class="n">YTD</th></tr></thead><tbody>
    ${rows.map(([c,l,v])=>`<tr><td class="mono">${c}</td><td>${l}</td>${v.map(n=>`<td class="n">${n||""}</td>`).join("")}<td class="n"><b>${sum(v)}</b></td></tr>`).join("")}</tbody></table></div>
    <p class="small muted">The monthly values of SPEC-1, -2, -4, -5, -6 and -7 are read on the first working day of each month and written on F-SPEC-05; the application holds the current position only.</p></div>`;
}
function vChanges(){
  const R=allRevs().filter(x=>x.r.rev>0).sort((a,b)=>a.r.apprDate<b.r.apprDate?1:-1);
  return `<h2>Revisions after rev 0</h2>${R.length?`<div class="tw"><table><thead><tr><th>Spec</th><th>Part</th><th>Approved</th><th>Reason for the change</th><th>Change review</th><th>Implemented</th></tr></thead><tbody>${R.map(({s,r})=>{const m=chgMissing(r);
    return `<tr class="click" data-spec="${esc(s.id)}"><td class="mono">${esc(docNo(r))}</td><td>${esc(r.part)}</td><td>${fmtD(r.apprDate)}<br><span class="small muted">${esc(r.appr)}</span></td><td>${esc(r.change)}</td><td>${m.length?pill("bad",m.length+" missing"):pill("ok","Complete")}<br><span class="small muted">${esc(NOTIFY[r.chg.notify]||"")}${r.chg.notifyRef?" · "+esc(r.chg.notifyRef):""}</span></td><td>${isDate(r.implDate)?fmtD(r.implDate):"—"}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No revision after rev 0 yet.</p></div>`}`;
}
function vRules(){
  const c=C();
  const R=[["Approval gate","Part no., name, steel grade, approved furnaces, part weight, every step with its tolerance / maximum / range, hardness scale, decarburization limit, where it is available at the line, prepared / reviewed / approved by (an authorized person), approval date (not in the future). After rev 0 also the reason for the change and the complete change review. No critical advice may remain."],
    ["Critical advice","A furnace that does not run the process; a controlled cooling cycle (cooling + "+c.ccXfer+" min transfers) that does not fit in the push time; quenchant or hardness limits in the wrong order."],
    ["Document control","Approved = locked. A change is a new revision: the approved revision stays in force until the new one is approved. Discard restores it. Obsolete needs a reason. Only a never-approved draft can be deleted (armed delete)."],
    ["Implementation","Date implemented and by whom, not before the approval and not in the future; not recorded "+c.implDays+" days after the approval = HTSA 1.6 item not met."],
    ["Periodic review","Due "+c.reviewDays+" days after the approval of the revision in force or after the last review without change; shown as due "+c.reviewSoon+" days before."],
    ["Active processes","Parts loaded on the CALOR Daily production page in this browser in the last "+c.activeDays+" days, per furnace, must each have a specification in force approved for that furnace."],
    ["Line timing","Time per zone = positions ("+c.posH+" / "+c.posT+") × push. Between the chambers: "+c.xfer+" min measured (HT, NORM) or the controlled cooling cycle (IA). Through the line = hardening + between + tempering."],
    ["HTSA 1.6 score","Needs immediate action: no specification in force or an active part without one. Not satisfactory: any item not met. Satisfactory: otherwise."],
    ["“N/A”","Means not available: accepted as an entry, never used to match (duplicates, active parts)."]];
  return `<h2>Rules of this module</h2><div class="tw"><table><tbody>${R.map(([a,b])=>`<tr><td style="width:200px"><b>${a}</b></td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>`;
}
/* documentation: the markdown files embedded by the build (MWS.docs), else fetched from docs/ next to the HTML */
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
function vDocs(){
  return `<h2>Documentation</h2><div class="docs"><div class="doclist panel">${DOCS.map(([p,t])=>`<button data-doc="${esc(p)}" aria-current="${S.docSel===p}">${esc(t)}</button>`).join("")}</div><div class="doc" id="docview"><p class="muted">Loading…</p></div></div>`;
}
function showDoc(){
  const el=$("#docview");if(!el)return;const p=S.docSel,t=MWS.docs&&MWS.docs[p];
  if(t!=null){el.innerHTML=md(t);return;}
  fetch("docs/"+p).then(r=>r.ok?r.text():Promise.reject()).then(x=>{if($("#docview")&&S.docSel===p)$("#docview").innerHTML=md(x);})
    .catch(()=>{if($("#docview"))$("#docview").innerHTML=`<p class="banner warn">This document is not embedded in this build and could not be loaded from docs/${esc(p)}.</p>`;});
}
function vData(){
  const calor=(()=>{try{const o=JSON.parse(localStorage.getItem("psr-reg")||"null");return o&&Array.isArray(o.specs)?o.specs.length:0;}catch(e){return 0;}})();
  return `<h2>Data</h2><div class="grid2">
  <div class="panel"><h3>Back up and restore</h3><p class="small muted">${plural(S.specs.length,"specification")} · storage: ${S.dbState==="on"?"shared record store":"this browser"}.</p>
    <div class="row"><button class="pri" data-export>Export JSON</button><button data-csv>Register CSV</button></div>
    <div class="row w" style="margin-top:10px"><label class="f"><span>Import a JSON export</span><input type="file" id="impfile" accept=".json,application/json"></label></div>
    ${S.imp?`<div class="banner" style="margin-top:8px">${esc(S.imp.msg)}<div class="row" style="margin-top:6px"><button class="pri" data-imp="merge">Merge (add and update)</button><button class="danger" data-imp="replace">Replace everything</button><button data-imp="cancel">Cancel</button></div></div>`:""}</div>
  <div class="panel"><h3>From the CALOR Specifications page</h3><p class="small muted">CALOR (this browser) holds ${plural(calor,"specification")} in its register. Importing copies them here with the same numbers, revisions and logs; existing records with the same number are updated.</p>
    <button class="w" data-calor ${calor?"":"disabled"}>Import from CALOR</button></div>
  <div class="panel"><h3>Starter set-up</h3><p class="small muted">Three example specifications (HT on F-02, IA on F-03, NORM on F-04) and example authorized names, all marked "(example)".</p><button class="w" data-std>Load starter set-up</button></div>
  <div class="panel"><h3>Clear all</h3><p class="small muted">Deletes every specification and the settings of this module. Type <b>CLEAR ALL</b> to enable.</p>
    <div class="row w"><input id="clrtxt" placeholder="CLEAR ALL" style="max-width:180px"><button class="danger" data-clear>Clear all</button></div></div></div>`;
}
const VIEWS={dash:vDash,specs:vSpecs,auth:vAuth,line:vLine,review:vReview,kpi:vKpi,changes:vChanges,rules:vRules,docs:vDocs,data:vData};
const AFTER={docs:showDoc};

/* modal record sheet */
const LOCK=s=>s.status!=="draft";
function mf(path,label,o={}){
  const ed=S.modal.ed,v=getp(ed,path),dis=o.free?"":LOCK(ed)?"disabled":"",id="m-"+path.replace(/\./g,"-");
  let ctl;
  if(o.opts)ctl=`<select id="${id}" data-p="${path}" ${dis}>${o.blank?`<option value="">—</option>`:""}${Object.entries(o.opts).map(([k,t])=>`<option value="${esc(k)}" ${String(v)===k?"selected":""}>${esc(t)}</option>`).join("")}</select>`;
  else if(o.area)ctl=`<textarea id="${id}" data-p="${path}" rows="${o.area}" ${dis}>${esc(v)}</textarea>`;
  else ctl=`<input id="${id}" data-p="${path}" ${o.type?`type="${o.type}"`:""} ${o.num?'inputmode="decimal"':""} value="${esc(v)}" ${o.list?`list="${o.list}"`:""} ${dis}>`;
  return `<label class="f ${o.req?"req":""} ${o.wide?"wide":""}" for="${id}"><span>${esc(label)}</span>${ctl}</label>`;
}
function openModal(m){S.modal=m;$("#modal").hidden=false;redraw();}
function closeModal(){S.modal=null;const el=$("#modal");if(el){el.hidden=true;el.innerHTML="";}document.body.classList.remove("pm");if(S.pending){S.pending=false;render();}}
function redraw(){const el=$("#modal");if(!S.modal||!el)return;const st=el.scrollTop;el.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${(DRAW[S.modal.kind])()}</div>`;el.scrollTop=st;}
const sheet=(title,body,foot)=>`<div class="row between"><h2>${title}</h2><button data-close aria-label="Close">✕</button></div>${body}<div class="sticky-foot"><span class="msg" id="mmsg">${S.modal.msg||""}</span>${foot}</div>`;
function specModal(id){const s=S.specs.find(x=>x.id===id);openModal({kind:"spec",ed:s?clone(s):fill({furnaces:[],q:{dipTol:C().dipTol},cc:{timeTol:C().ccTol},nm:{fanTol:C().fanTol}}),msg:""});}
function DRAW_SPEC(){
  const e=S.modal.ed,R=ROLE[e.proc],c=calc(e),adv=advice(e),miss=missing(e),locked=LOCK(e),inForce=S.specs.find(x=>x.id===e.id);
  const zone=(k,tk,lab)=>`<div class="grid-in"><span class="h">${lab}</span><span class="h">Zone 1</span><span class="h">Zone 2</span><span class="h">Zone 3</span>
    <span>Set value °C</span>${[0,1,2].map(i=>`<input data-p="${k}.${i}" inputmode="decimal" value="${esc(e[k][i])}" ${locked?"disabled":""} aria-label="${lab} zone ${i+1} set value">`).join("")}
    <span>Tolerance ± °C</span>${[0,1,2].map(i=>`<input data-p="${tk}.${i}" inputmode="decimal" value="${esc(e[tk][i])}" ${locked?"disabled":""} aria-label="${lab} zone ${i+1} tolerance">`).join("")}</div>`;
  const mid=e.proc==="HT"?`<div class="fields">${mf("q.medium","Quench medium",{opts:MEDIA})}${mf("q.tLo","Quenchant temperature from °C",{num:1})}${mf("q.tHi","to °C",{num:1})}${mf("q.delay","Quench delay max (s)",{num:1,req:1})}${mf("q.dip","Dip time (min)",{num:1,req:1})}${mf("q.dipTol","Dip time tolerance ± (min)",{num:1,req:1})}${mf("q.agit","Agitation")}${mf("q.transfer","Transfer to tempering max (min)",{num:1,req:1})}</div>`
    :e.proc==="IA"?`<div class="fields">${mf("cc.time","Cooling (air blowing) time (min)",{num:1,req:1})}${mf("cc.timeTol","Tolerance ± (min)",{num:1,req:1})}${mf("cc.method","Method",{req:1})}${mf("cc.target","Target temperature °C",{num:1})}${mf("cc.targetTol","Target tolerance ± °C",{num:1})}</div>`
    :`<div class="fields">${mf("nm.transfer","Transfer between the chambers max (min)",{num:1,req:1})}${mf("nm.fan","Fan cooling after exit",{opts:{none:"Not required",required:"Required"}})}${e.nm.fan==="required"?mf("nm.fanTime","Fan cooling time (min)",{num:1})+mf("nm.fanTol","Tolerance ± (min)",{num:1}):""}</div>`;
  const body=`<p class="muted">${inForce?stPill(inForce):pill("warn","New · draft")} ${e.status==="obsolete"&&e.obsReason?" · obsolete: "+esc(e.obsReason):""}</p>
  <fieldset><legend>Part</legend><div class="fields">${mf("part","Part no.",{req:1})}${mf("name","Part name",{req:1})}${mf("customer","Customer")}${mf("drawing","Drawing no.")}${mf("grade","Steel grade",{req:1})}
    ${mf("proc","Process",{opts:Object.fromEntries(Object.entries(PROC).map(([k,v])=>[k,v+" (Table "+TABLE[k]+")"]))})}${mf("pcs","Pieces per tray",{num:1,req:1})}${mf("wt","Part weight (kg)",{num:1,req:1})}${mf("fixture","Tray / fixture / loading pattern")}</div>
    <div style="margin-top:8px"><span class="small muted">Approved furnaces *</span><div>${furnaces().map(f=>{const r=runsOf(f);return `<label class="chk"><input type="checkbox" data-fur="${esc(f)}" ${e.furnaces.includes(f)?"checked":""} ${locked?"disabled":""}>${esc(f)}${r&&!r.includes(e.proc)?' <span class="small muted">(does not run this process)</span>':""}</label>`;}).join("")}</div></div></fieldset>
  <fieldset><legend>Thermal cycle</legend><div class="fields">${mf("push","Push time (min)",{num:1,req:1})}${mf("pushTol","Push tolerance ± (min)",{num:1,req:1})}</div>
    <div style="margin-top:10px">${zone("h","htol","Hardening · "+R.h)}</div><h4 style="margin:12px 0 6px">${R.mid}</h4>${mid}<div style="margin-top:10px">${zone("t","ttol","Tempering · "+R.t)}</div>
    ${c?`<p class="small" style="margin-top:8px">Hardening ${fx(c.ch,0)} min (${c.zh.map(x=>fx(x,0)).join(" / ")}) · between the chambers ${fx(c.gap)} min · tempering ${fx(c.ct,0)} min (${c.zt.map(x=>fx(x,0)).join(" / ")}) · <b>through the line ${fx(c.total,0)} min</b> · ${fx(c.trays)} trays/h${c.kgH!=null?` · ${fx(c.kgH,0)} kg/h · ${fx(c.trayKg)} kg per tray`:""}</p>`:""}</fieldset>
  <fieldset><legend>Steps and parameters (operating tolerances)</legend><div class="tw"><table><thead><tr><th>Step</th><th>Parameter</th><th>Value</th><th></th></tr></thead><tbody>${params(e).map(p=>`<tr><td>${esc(p.step)}</td><td>${esc(p.param)}</td><td>${esc(p.txt)}</td><td>${p.ok?pill("ok","✓"):p.opt?pill("","optional"):pill("bad","missing "+p.miss)}</td></tr>`).join("")}</tbody></table></div></fieldset>
  <fieldset><legend>Product requirements and testing</legend><div class="fields">${mf("req.hMin","Hardness min",{num:1,req:1})}${mf("req.hMax","Hardness max",{num:1})}${mf("req.scale","Scale",{opts:Object.fromEntries(SCALES.map(x=>[x,x]))})}${mf("req.core","Core hardness")}${mf("req.micro","Microstructure")}${mf("req.decarb","Decarburization limit",{req:1})}${mf("req.grain","Grain size")}${mf("req.other","Other")}${mf("req.sample","Sampling (quantity and frequency)",{req:1})}${mf("req.method","Test method")}</div></fieldset>
  <fieldset><legend>At the line</legend><div class="fields">${mf("form","Available at the line as",{opts:FORMS,blank:1,req:1})}${mf("formRef","Reference (recipe no., WI no.)")}${mf("notes","Notes",{area:2,wide:1})}</div></fieldset>
  ${e.rev>0?`<fieldset><legend>Change review (rev ${e.rev}) · F-SPEC-02</legend><div class="fields">${mf("change","Reason for the change",{area:2,wide:1,req:1})}${mf("chg.cust","Customer requirements checked (what, result)",{area:2,wide:1,req:1})}${mf("chg.notify","Customer notification",{opts:NOTIFY,blank:1,req:1})}${mf("chg.notifyRef","Notification / approval reference")}
    <label class="chk wide"><input type="checkbox" data-pc="chg.cp" ${e.chg.cp?"checked":""} ${locked?"disabled":""}>Control plan and PFMEA reviewed</label>${mf("chg.valid","Validation (trial or first-off result)",{area:2,wide:1,req:1})}</div></fieldset>`:""}
  <fieldset><legend>Approval</legend><div class="fields">${mf("prep","Prepared by",{req:1})}${mf("revBy","Reviewed by",{req:1})}${mf("appr","Approved by (authorized)",{req:1,list:"authlist"})}${mf("apprDate","Approval date",{type:"date",req:1})}</div>
    <datalist id="authlist">${authList().list.map(a=>`<option value="${esc(a.name)}">`).join("")}</datalist>
    ${e.status==="approved"?`<p class="small">Implemented: ${isDate(e.implDate)?fmtD(e.implDate)+" by "+esc(e.implBy):implLate(e)?pill("bad","not recorded · late"):pill("warn","not recorded")}</p>`:""}</fieldset>
  ${adv.length?`<div class="banner ${adv.some(a=>a[0]==="crit")?"bad":"warn"}" style="margin-top:12px"><b>Advice</b><ul class="issues">${adv.map(([l,t])=>`<li>${pill(l==="crit"?"bad":"warn",l==="crit"?"Blocks approval":"Check")} ${esc(t)}</li>`).join("")}</ul></div>`:""}
  ${e.status==="draft"&&miss.length?`<div class="banner" style="margin-top:12px"><b>Before approval:</b> ${esc(miss.join(" · "))}</div>`:""}
  ${e.revs.length?`<fieldset><legend>Revision history</legend><div class="tw"><table><thead><tr><th>Rev</th><th>Approved</th><th>By</th><th>Implemented</th><th>Reason</th></tr></thead><tbody>${[...e.revs,e.status!=="draft"?e:null].filter(Boolean).map(r=>`<tr><td>${r.rev}</td><td>${fmtD(r.apprDate)}</td><td>${esc(r.appr)}</td><td>${fmtD(r.implDate)}</td><td>${esc(r.change||(r.rev?"":"First issue"))}</td></tr>`).join("")}</tbody></table></div></fieldset>`:""}
  ${e.log.length?`<details style="margin-top:10px"><summary class="small">Log (${e.log.length})</summary><ul class="small">${e.log.slice().reverse().map(l=>`<li>${fmtD(l.d)} · ${esc(l.t)}</li>`).join("")}</ul></details>`:""}`;
  const neverApproved=e.status==="draft"&&e.rev===0&&!e.revs.length;
  const foot=`${e.status==="draft"?`<button class="w" data-save-spec>Save draft</button><button class="pri w" data-approve>Approve</button>`:""}
    ${e.status==="draft"&&e.rev>0?`<button class="w" data-discard>Discard revision</button>`:""}
    ${e.status==="approved"?`<button class="w" data-revise>New revision</button>${!isDate(e.implDate)?`<button class="w" data-impl="${esc(e.id)}">Record implementation</button>`:""}<button class="w" data-obs>Make obsolete</button>`:""}
    ${e.id&&eff(e)?`<button data-job="${esc(e.id)}">Job card</button>`:""}
    ${neverApproved&&e.id&&S.specs.some(x=>x.id===e.id)?`<button class="danger w" data-del-spec>Delete</button>`:""}<button data-close>Close</button>`;
  return sheet(`${esc(e.id||"New specification")}${e.id?" rev "+e.rev:""} · ${esc(e.part||"")}`,body,foot);
}
function DRAW_IMPL(){const m=S.modal;return sheet(`Record implementation · ${esc(m.id)}`,`<p class="muted">The date the approved revision was put into use at the line (job card / recipe at every approved furnace).</p>
  <div class="fields"><label class="f req"><span>Implemented on</span><input type="date" id="im-date" value="${esc(m.date)}"></label><label class="f req"><span>By</span><input id="im-by" value="${esc(m.by)}"></label></div>`,
  `<button class="pri w" data-save-impl>Save</button><button data-close>Cancel</button>`);}
function DRAW_REV(){const m=S.modal;return sheet(`Record periodic review · ${esc(m.id)}`,`<p class="muted">Review without a change (F-SPEC-04 result NC). A review that needs a change is a new revision instead.</p>
  <div class="fields"><label class="f req"><span>Reviewed on</span><input type="date" id="rv-date" value="${esc(m.date)}"></label><label class="f req"><span>By</span><input id="rv-by" value="${esc(m.by)}"></label><label class="f wide"><span>What was checked (drawing, customer specification, results of the year)</span><textarea id="rv-note">${esc(m.note)}</textarea></label></div>`,
  `<button class="pri w" data-save-rev>Save</button><button data-close>Cancel</button>`);}
function DRAW_OBS(){const m=S.modal;return sheet(`Make obsolete · ${esc(m.id)}`,`<label class="f req"><span>Reason (e.g. part no longer heat treated, replaced by PS-…)</span><textarea id="ob-why">${esc(m.why)}</textarea></label>`,
  `<button class="danger w" data-save-obs>Make obsolete</button><button data-close>Cancel</button>`);}
/* sketch of temperature vs time through the line (set values per zone, ± tolerance band; schematic, not a measured curve) */
function profileSvg(e,c){
  if(!c)return `<p class="small muted">Enter the push time to draw the temperature–time sketch.</p>`;
  const AMB=30,R=ROLE[e.proc],H=[0,1,2].map(i=>num(e.h[i])),T=[0,1,2].map(i=>num(e.t[i]));
  if(H.some(v=>v==null)||T.some(v=>v==null))return `<p class="small muted">Enter every zone set value to draw the temperature–time sketch.</p>`;
  const HT=[0,1,2].map(i=>num(e.htol[i])||0),TT=[0,1,2].map(i=>num(e.ttol[i])||0);
  const P=[],band=[],segs=[];let t=0;
  const zones=(set,tol,dur,pre,from)=>{set.forEach((v,i)=>{const d=dur[i],r=Math.min(d*.35,i?d*.15:d*.6);
    P.push([t+r,v]);band.push([t,t+d,v-tol[i],v+tol[i]]);segs.push([t,t+d,pre+(i+1),v]);t+=d;P.push([t,v]);});};
  P.push([0,AMB]);zones(H,HT,c.zh,"H",AMB);const tH=t;
  let mid,midLbl;
  if(e.proc==="HT"){const q=num(e.q.tHi)!=null&&num(e.q.tLo)!=null?(num(e.q.tLo)+num(e.q.tHi))/2:(e.q.medium==="water"?30:60),
      dl=(num(e.q.delay)||30)/60,dp=num(e.q.dip)||8.5;
    P.push([t+dl,H[2]]);P.push([t+dl+.3,q]);P.push([t+dl+dp,q]);P.push([t+c.gap,Math.max(q,AMB)]);midLbl=`Quench · dip ${fx(dp,1)} min`;}
  else if(e.proc==="IA"){const tg=num(e.cc.target),cool=c.cool||0;P.push([t+cool,tg!=null?tg:T[0]]);P.push([t+c.gap,tg!=null?tg:T[0]]);midLbl=`Controlled cooling ${fx(cool,0)} min`;
    if(tg!=null)band.push([t,t+cool,tg-(num(e.cc.targetTol)||0),tg+(num(e.cc.targetTol)||0)]);}
  else{P.push([t+c.gap,H[2]-30]);midLbl=`Transfer ${fx(c.gap,0)} min`;}
  segs.push([t,t+c.gap,"mid",null]);t+=c.gap;const tT=t;
  zones(T,TT,c.zt,"T");const tE=t;
  const after=e.proc==="NORM"&&e.nm.fan==="required"?(num(e.nm.fanTime)||20):Math.max(20,c.total*.08);
  P.push([t+after,AMB+20]);t+=after;
  const W=760,Hh=270,L=46,Rr=12,Tp=26,B=50,xs=v=>L+v/t*(W-L-Rr),Ymax=Math.ceil((Math.max(...H,...T)+60)/100)*100,ys=v=>Tp+(1-v/Ymax)*(Hh-Tp-B);
  const step=t>600?120:t>300?60:30,ticks=[];for(let v=0;v<=t;v+=step)ticks.push(v);
  const yt=[];for(let v=0;v<=Ymax;v+=Ymax>800?200:100)yt.push(v);
  const g=[];
  yt.forEach(v=>g.push(`<line x1="${L}" x2="${W-Rr}" y1="${ys(v)}" y2="${ys(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L-6}" y="${ys(v)+4}" text-anchor="end" class="ax">${v}</text>`));
  ticks.forEach(v=>g.push(`<text x="${xs(v)}" y="${Hh-B+14}" text-anchor="middle" class="ax">${v}</text>`));
  band.forEach(b=>g.push(`<rect x="${xs(b[0])}" y="${ys(b[3])}" width="${Math.max(0,xs(b[1])-xs(b[0]))}" height="${Math.max(1,ys(b[2])-ys(b[3]))}" fill="var(--accent-2)"/>`));
  [[0,tH,`Hardening chamber · ${pos(C().posH).reduce((a,b)=>a+b,0)} trays`],[tH,tT,R.mid],[tT,tE,`Tempering chamber · ${pos(C().posT).reduce((a,b)=>a+b,0)} trays`],[tE,t,e.proc!=="NORM"?"Air cooling":e.nm.fan==="required"?"Fan cooling":"Still air"]].forEach(([a,b,lb],i)=>{
    if(i)g.push(`<line x1="${xs(a)}" x2="${xs(a)}" y1="${Tp-8}" y2="${Hh-B}" stroke="var(--muted)" stroke-dasharray="3 3" stroke-width="1"/>`);
    g.push(`<text x="${i===3?W-Rr:(xs(a)+xs(b))/2}" y="${Hh-B+30}" text-anchor="${i===3?"end":"middle"}" class="lb">${esc(i===1?midLbl:lb)}</text>`);});
  segs.filter(s=>s[2]!=="mid").forEach(s=>g.push(`<text x="${(xs(s[0])+xs(s[1]))/2}" y="${ys(s[3])-7}" text-anchor="middle" class="vl">${s[3]}</text><text x="${(xs(s[0])+xs(s[1]))/2}" y="${Hh-B-5}" text-anchor="middle" class="zl">${s[2]}</text>`));
  const pts=P.map(p=>`${xs(p[0]).toFixed(1)},${ys(p[1]).toFixed(1)}`).join(" ");
  return `<figure class="prof"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Temperature against time through the line: ${esc(R.h)} ${H.join(" / ")} °C, ${esc(midLbl)}, ${esc(R.t)} ${T.join(" / ")} °C, ${fx(c.total,0)} min through the line">
  <style>.prof .ax{font:11px var(--f-mono,monospace);fill:var(--muted)}.prof .lb{font:600 11.5px var(--f-body,sans-serif);fill:var(--ink)}.prof .vl{font:600 11px var(--f-mono,monospace);fill:var(--ink)}.prof .zl{font:10.5px var(--f-mono,monospace);fill:var(--muted)}</style>
  ${g.join("")}<line x1="${L}" x2="${W-Rr}" y1="${Hh-B}" y2="${Hh-B}" stroke="var(--muted)" stroke-width="1"/>
  <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <text x="${L}" y="12" class="ax">°C</text><text x="${L}" y="${Hh-4}" class="ax">time from loading into the hardening chamber, min</text></svg>
  <figcaption class="small muted">Sketch: set value per zone with its tolerance band (shaded), push ${esc(e.push)} min, ${fx(c.total,0)} min through the line. Ramps, the quench / cooling curve and the cooling after exit are schematic, not measured.</figcaption></figure>`;
}
function DRAW_JOB(){const s=S.modal.s,e=eff(s),R=ROLE[e.proc],c=calc(e);
  const mid=e.proc==="HT"?`${MEDIA[e.q.medium]} ${e.q.tLo||"?"}–${e.q.tHi||"?"} °C · delay ≤ ${e.q.delay} s · dip ${e.q.dip} ± ${e.q.dipTol||"?"} min · agitation ${e.q.agit} · transfer ≤ ${e.q.transfer} min`
    :e.proc==="IA"?`Controlled cooling ${e.cc.time} ± ${e.cc.timeTol||"?"} min · ${e.cc.method}${e.cc.target?` · target ${e.cc.target} ± ${e.cc.targetTol||"?"} °C`:""}`:`Transfer ≤ ${e.nm.transfer} min · fan cooling ${e.nm.fan==="required"?e.nm.fanTime+" ± "+(e.nm.fanTol||"?")+" min":"not required"}`;
  return sheet(`Job card · ${esc(docNo(e))}`,`<div id="jobcard"><p class="small muted">${esc(C().plant)} · Job card of the revision in force · printed ${fmtD(today())} · uncontrolled when printed</p>
  <h2>${esc(e.part)} · ${esc(e.name)}</h2><p>${esc(PROC[e.proc])} · steel ${esc(e.grade)} · furnaces ${esc(e.furnaces.join(", "))} · ${esc(e.pcs)} pcs per tray${e.fixture?" · "+esc(e.fixture):""}</p>
  <div class="tw"><table><thead><tr><th></th><th class="n">Zone 1</th><th class="n">Zone 2</th><th class="n">Zone 3</th></tr></thead><tbody>
  <tr><td><b>Hardening · ${R.h}</b></td>${[0,1,2].map(i=>`<td class="n">${esc(e.h[i])} ± ${esc(e.htol[i])} °C</td>`).join("")}</tr>
  <tr><td><b>Tempering · ${R.t}</b></td>${[0,1,2].map(i=>`<td class="n">${esc(e.t[i])} ± ${esc(e.ttol[i])} °C</td>`).join("")}</tr></tbody></table></div>
  <p><b>Push</b> ${esc(e.push)} ± ${esc(e.pushTol)} min${c?` · through the line ${fx(c.total,0)} min`:""}<br><b>${R.mid}</b> ${esc(mid)}<br><b>Requirements</b> ${esc(hardTxt(e))}${e.req.core?" · core "+esc(e.req.core):""}${e.req.micro?" · "+esc(e.req.micro):""} · decarburization ${esc(e.req.decarb)} · sampling ${esc(e.req.sample)}</p>
  <h3>Temperature – time</h3>${profileSvg(e,c)}
  <p class="small">Approved ${fmtD(e.apprDate)} by ${esc(e.appr)}</p></div>`,`<button class="pri" data-print>Print</button><button data-close>Close</button>`);}
function DRAW_H16(){const A=assess16(),sc=SCORE[A.score];return sheet("HTSA 1.6 evidence",`<div id="jobcard"><p class="small muted">${esc(C().plant)} · CQI-9 HTSA 1.6 self-assessment · ${fmtD(today())}</p>
  <p><span class="verdict ${sc[2]}">${sc[1]}</span></p><div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${esc(LV[i.lvl][1])}</td></tr>`).join("")}</tbody></table></div>
  <h3 style="margin-top:12px">Specifications in force</h3><div class="tw"><table><thead><tr><th>Spec</th><th>Part</th><th>Furnaces</th><th>Approved</th><th>Implemented</th><th>Review due</th></tr></thead><tbody>${S.specs.filter(s=>eff(s)).map(s=>{const e=eff(s);return `<tr><td>${esc(docNo(e))}</td><td>${esc(e.part)}</td><td>${esc(e.furnaces.join(", "))}</td><td>${fmtD(e.apprDate)} ${esc(e.appr)}</td><td>${fmtD(e.implDate)}</td><td>${fmtD(review(s).due)}</td></tr>`;}).join("")}</tbody></table></div></div>`,
  `<button class="pri" data-print>Print</button><button data-close>Close</button>`);}
const DRAW={spec:DRAW_SPEC,impl:DRAW_IMPL,rev:DRAW_REV,obs:DRAW_OBS,job:DRAW_JOB,h16:DRAW_H16};
const msg=(t,ok)=>{if(!S.modal)return;S.modal.msg=t?`<span style="color:var(--${ok?"ok":"bad"})">${esc(t)}</span>`:"";const el=$("#mmsg");if(el)el.innerHTML=S.modal.msg;};

/* actions on a specification */
async function saveSpec(){const e=S.modal.ed;if(!String(e.part).trim()){msg("Enter the part no. first.");return;}
  const isNew=!e.id;if(isNew){e.id=nextCode("PS",S.specs);}
  if(await save(e,isNew?"Specification created (draft)":"Draft saved")){S.modal.ed=fill(S.specs.find(x=>x.id===e.id)||e);msg("Saved.",1);redraw();}else if(isNew)e.id="";}
async function approve(){const e=S.modal.ed,m=missing(e),crit=advice(e).filter(a=>a[0]==="crit");
  if(m.length||crit.length){msg("Not approved. Missing: "+[...m,...crit.map(a=>a[1])].join(" · "));return;}
  if(!e.id)e.id=nextCode("PS",S.specs);e.status="approved";
  if(await save(e,`Revision ${e.rev} approved by ${e.appr}`)){toast(`${docNo(e)} approved`);closeModal();}else e.status="draft";}
async function revise(){const e=S.modal.ed,snap=clone(e);delete snap.revs;delete snap.log;delete snap.reviews;
  e.revs.push(snap);e.rev+=1;e.status="draft";Object.assign(e,{appr:"",apprDate:"",change:"",implDate:"",implBy:"",chg:{cust:"",notify:"",notifyRef:"",cp:false,valid:""}});
  if(await save(e,`New revision ${e.rev} started (rev ${e.rev-1} stays in force)`)){S.modal.ed=fill(S.specs.find(x=>x.id===e.id));msg("Revision "+e.rev+" started; rev "+(e.rev-1)+" stays in force until it is approved.",1);redraw();}}
async function discard(){const e=S.modal.ed,last=e.revs.at(-1);if(!last)return;const o={...clone(last),revs:e.revs.slice(0,-1),log:e.log,reviews:e.reviews};
  if(await save(o,`Revision ${e.rev} discarded; rev ${last.rev} in force`)){toast("Revision discarded");closeModal();}}
function armedDelete(b,fn){if(b.classList.contains("armed")){fn();return;}b.classList.add("armed");const t=b.textContent;b.textContent="Confirm delete";setTimeout(()=>{if(b.isConnected){b.classList.remove("armed");b.textContent=t;}},4000);}
async function stdOps(){if(!needDb())return;const d=today(),who={prep:"A. Verma (example)",revBy:"S. Gupta (example)",appr:"R. Sharma (example)"};
  S.cfg={...S.cfg,auth:"R. Sharma (example)\nS. Gupta (example)"};await dbSet("config","settings",S.cfg);
  const L=[fill({id:"PS-0001",part:"EX-1001",name:"Example shaft",customer:"Example customer",grade:"42CrMo4",proc:"HT",furnaces:["F-02"],pcs:"60",wt:"1.8",h:["840","870","870"],t:["560","580","580"],push:"12",
      q:{medium:"oil",tLo:"50",tHi:"80",delay:"30",dip:"8.5",dipTol:"0.5",transfer:"5",agit:"Required"},form:"job",formRef:"Job card",req:{hMin:"28",hMax:"32",scale:"HRC",micro:"Tempered martensite",decarb:"≤ 0.10 mm total",sample:"2 pcs per batch (first and last tray)",method:"WI hardness testing"},
      ...who,status:"approved",apprDate:addDays(d,-200),implDate:addDays(d,-198),implBy:"Shift supervisor (example)",log:[{d:addDays(d,-200),t:"Example created"}]}),
    fill({id:"PS-0002",part:"EX-2001",name:"Example gear blank",grade:"20MnCr5",proc:"IA",furnaces:["F-03"],pcs:"24",wt:"3.5",h:["880","930","930"],t:["650","650","650"],push:"18",
      cc:{time:"12",timeTol:"1",method:"Forced-air cooling",target:"650",targetTol:"20"},form:"recipe",formRef:"SCADA recipe R-2001",req:{hMin:"156",hMax:"207",scale:"HB",micro:"Ferrite and pearlite, no bainite",decarb:"≤ 0.15 mm total",grain:"ASTM 5–8",sample:"1 pc per batch"},
      ...who,status:"approved",apprDate:addDays(d,-30),log:[{d:addDays(d,-30),t:"Example created"}]}),
    fill({id:"PS-0003",part:"EX-3001",name:"Example flange",grade:"C45",proc:"NORM",furnaces:["F-04"],pcs:"30",wt:"2.2",h:["720","740","750"],t:["860","880","880"],push:"10",nm:{transfer:"20",fan:"none"},
      req:{hMin:"170",hMax:"220",scale:"HB",decarb:"≤ 0.2 mm",sample:"1 pc per batch"},prep:"A. Verma (example)",log:[{d,t:"Example created (draft)"}]})];
  for(const s of L)await dbSet("specs",s.id,s);toast("Starter set-up loaded");}

/* 9. data: export / import / CSV / clear */
async function download(name,text,type){
  if(S.dl){try{await S.dl.save({filename:name,data:new Blob([text],{type})});return;}catch(e){if(e&&e.code==="declined")return;}}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
const exportJson=()=>download(`mws-spec-${today()}.json`,JSON.stringify({app:"mws-spec-manager",v:1,saved:new Date().toISOString(),specs:S.specs,config:S.cfg},null,1),"application/json");
function csv(){const q=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const H=["Spec","Rev","Status","Part","Name","Customer","Grade","Process","Furnaces","Push","Hardness","Approved","Approved by","Implemented","Review due"];
  const R=S.specs.map(s=>{const e=eff(s)||s;return [s.id,s.rev,STATUS[s.status][1],s.part,s.name,s.customer,s.grade,PROC[s.proc],s.furnaces.join(" "),e.push,hardTxt(e),e.apprDate,e.appr,e.implDate,review(s).due||""];});
  download(`mws-spec-register-${today()}.csv`,"﻿"+[H,...R].map(r=>r.map(q).join(",")).join("\r\n"),"text/csv");}
function readImport(f){f.text().then(t=>{let o;try{o=JSON.parse(t);}catch(e){toast("Not a JSON file");return;}
  const specs=Array.isArray(o&&o.specs)?o.specs.filter(s=>s&&ID_RE.test(String(s.id||""))):null;
  if(!specs){toast("No specifications in this file");return;}
  S.imp={specs:specs.map(fill),config:o.config&&typeof o.config==="object"?o.config:null,msg:`${f.name}: ${plural(specs.length,"specification")}${o.config?" and settings":""}.`};render();});}
async function doImport(mode){if(!S.imp||!needDb())return;const I=S.imp;S.imp=null;
  if(mode==="replace")for(const s of S.specs)if(!I.specs.some(x=>x.id===s.id))await dbDel("specs",s.id);
  for(const s of I.specs)await dbSet("specs",s.id,s);if(I.config){const c={...DEF,...I.config};delete c.id;await dbSet("config","settings",c);}
  toast(`${plural(I.specs.length,"specification")} imported (${mode})`);render();}
async function importCalor(){if(!needDb())return;let o=null;try{o=JSON.parse(localStorage.getItem("psr-reg")||"null");}catch(e){}
  if(!o||!Array.isArray(o.specs)){toast("No CALOR specifications in this browser");return;}
  const L=o.specs.filter(s=>s&&ID_RE.test(String(s.id||""))).map(fill);for(const s of L)await dbSet("specs",s.id,s);
  if(o.settings){const keep={};Object.keys(DEF).forEach(k=>{if(o.settings[k]!=null)keep[k]=o.settings[k];});S.cfg={...S.cfg,...keep};await dbSet("config","settings",S.cfg);}
  toast(`${plural(L.length,"specification")} imported from CALOR`);}
async function clearAll(){if(($("#clrtxt")||{}).value!=="CLEAR ALL"){toast("Type CLEAR ALL to clear");return;}if(!needDb())return;
  for(const s of S.specs)await dbDel("specs",s.id);await dbDel("config","settings");toast("All specification data cleared");}

/* 10. wiring */
onDoc("click",e=>{
  const b=e.target.closest("button,tr.click,a[data-docref]");if(!b)return;const d=b.dataset;
  if(b.closest("#modal")||d.close!==undefined){
    if(d.close!==undefined){closeModal();return;}
    if(d.saveSpec!==undefined){saveSpec();return;}if(d.approve!==undefined){approve();return;}if(d.revise!==undefined){revise();return;}if(d.discard!==undefined){discard();return;}
    if(d.obs!==undefined){openModal({kind:"obs",id:S.modal.ed.id,why:""});return;}
    if(d.delSpec!==undefined){armedDelete(b,async()=>{const id=S.modal.ed.id;try{await dbDel("specs",id);toast(id+" deleted");closeModal();}catch(x){msg("Not deleted: "+errMsg(x));}});return;}
    if(d.saveImpl!==undefined){const m=S.modal,dt=$("#im-date").value,by=$("#im-by").value.trim(),s=clone(S.specs.find(x=>x.id===m.id));
      if(!isDate(dt)||!by){msg("Enter the date and who implemented it.");return;}if(dt<s.apprDate){msg("Not before the approval date ("+fmtD(s.apprDate)+").");return;}if(dt>today()){msg("Not in the future.");return;}
      s.implDate=dt;s.implBy=by;save(s,`Implemented at the line on ${dt} by ${by}`).then(ok=>{if(ok){toast("Implementation recorded");closeModal();}});return;}
    if(d.saveRev!==undefined){const m=S.modal,dt=$("#rv-date").value,by=$("#rv-by").value.trim(),s=clone(S.specs.find(x=>x.id===m.id)),ef=eff(s);
      if(!isDate(dt)||!by){msg("Enter the date and the reviewer.");return;}if(dt>today()||dt<ef.apprDate){msg("Between the approval of the revision in force and today.");return;}
      s.reviews.push({date:dt,by,rev:ef.rev,note:$("#rv-note").value.trim(),res:"nc"});save(s,`Periodic review without change by ${by}`).then(ok=>{if(ok){toast("Review recorded");closeModal();}});return;}
    if(d.saveObs!==undefined){const why=$("#ob-why").value.trim(),s=clone(S.specs.find(x=>x.id===S.modal.id));if(!why){msg("Give the reason.");return;}
      s.status="obsolete";s.obsReason=why;s.obsDate=today();save(s,"Made obsolete: "+why).then(ok=>{if(ok){toast(s.id+" made obsolete");closeModal();}});return;}
    if(d.print!==undefined){document.body.classList.add("pm");window.print();setTimeout(()=>document.body.classList.remove("pm"),500);return;}
  }
  if(d.impl){const s=S.specs.find(x=>x.id===d.impl);openModal({kind:"impl",id:d.impl,date:today(),by:"",msg:""});return;}
  if(d.job){const s=S.specs.find(x=>x.id===d.job);if(s&&eff(s))openModal({kind:"job",s});return;}
  if(d.review){openModal({kind:"rev",id:d.review,date:today(),by:"",note:"",msg:""});return;}
  if(d.h16!==undefined){openModal({kind:"h16"});return;}
  if(d.spec){specModal(d.spec);return;}
  if(d.newSpec!==undefined){if(needDb())specModal(null);return;}
  if(d.std!==undefined){stdOps();return;}
  if(d.saveCfg!==undefined){document.querySelectorAll("[data-cfg]").forEach(i=>{const k=i.dataset.cfg,t=(SETF.find(x=>x[0]===k)||[])[2];S.cfg[k]=t==="number"?(num(i.value)??DEF[k]):i.value;});saveCfg();return;}
  if(d.fy){S.fy+=+d.fy;render();return;}
  if(d.doc){S.docSel=d.doc;render();return;}
  if(d.docref){e.preventDefault();const p=DOCS.find(x=>x[0].endsWith(d.docref.replace(/^(\.\.\/)+/,"").replace(/^\.\//,"")));if(p){S.docSel=p[0];render();}return;}
  if(d.export!==undefined){exportJson();return;}if(d.csv!==undefined){csv();return;}
  if(d.imp){if(d.imp==="cancel"){S.imp=null;render();}else doImport(d.imp);return;}
  if(d.calor!==undefined){importCalor();return;}
  if(d.clear!==undefined){armedDelete(b,clearAll);return;}
});
onDoc("input",e=>{const el=e.target;
  if(el.dataset.p&&S.modal&&S.modal.ed&&el.tagName!=="SELECT"){setp(S.modal.ed,el.dataset.p,el.value);return;}
  if(el.dataset.filt==="q"){S.filt.q=el.value;clearTimeout(S._ft);S._ft=setTimeout(()=>{render();const i=$("[data-filt=q]");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},250);}
});
onDoc("change",e=>{const el=e.target;
  if(el.dataset.p&&S.modal&&S.modal.ed&&el.tagName==="SELECT"){setp(S.modal.ed,el.dataset.p,el.value);redraw();return;}
  if(el.dataset.pc&&S.modal){setp(S.modal.ed,el.dataset.pc,el.checked);return;}
  if(el.dataset.fur&&S.modal){const f=el.dataset.fur,L=S.modal.ed.furnaces;S.modal.ed.furnaces=el.checked?[...new Set([...L,f])].sort():L.filter(x=>x!==f);redraw();return;}
  if(el.dataset.filt&&el.dataset.filt!=="q"){S.filt[el.dataset.filt]=el.value;render();return;}
  if(el.id==="impfile"&&el.files[0]){readImport(el.files[0]);el.value="";}
});
onDoc("keydown",e=>{if(e.key==="Escape"&&S.modal)closeModal();});
onWin("hashchange",()=>{route();S.pending=false;render();window.scrollTo(0,0);});

/* 11. integration API */
MWS.spec={closeModal,
  stats:()=>{const k=kp();return {db:S.dbState,n:S.specs.length,inForce:k.inForce,drafts:k.drafts,over:k.over,soon:k.soon,implLate:k.implLate,noSpec:k.noSpec,score:k.score,label:SCORE[k.score][1],cls:SCORE[k.score][0]};},
  summary:()=>{const k=kp();return `${plural(k.inForce,"process specification")} in force (${plural(k.parts,"part")}), HTSA 1.6 ${SCORE[k.score][1].toLowerCase()}${k.over?`, ${k.over} review(s) overdue`:""}.`;},
  inForce:()=>S.specs.map(s=>eff(s)).filter(Boolean).map(e=>({id:e.id,rev:e.rev,part:e.part,name:e.name,proc:e.proc,furnaces:e.furnaces,push:e.push,h:e.h,t:e.t,htol:e.htol,ttol:e.ttol,req:e.req}))};

window.__SPECM={S,eff,calc,missing,assess16,review,kp,profileSvg};

/* 12. boot */
async function boot(){
  route();render();
  const [dl,user,db]=await Promise.all([useCap("downloads"),useCap("user"),useCap("db")]);
  S.dl=dl;
  if(user){try{const c=await user.can("data.write");S.canWrite=c!==false;}catch(e){}}
  if(db)startStore(sharedDb(db),"on");else startStore(localDb(),"local");
}
boot();
