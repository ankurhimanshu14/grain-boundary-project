/* Module APQP: advanced quality planning and the feasibility study of each part (CQI-9 HTSA 1.2). Runs inside the shell: ACTIVE, onDoc, onWin,
   MWS and `location` come from the wrapper (build.py). Reads the specifications in force (MWS.spec, HTSA 1.6) and the authorized people (MWS.org, HTSA 1.1). */

/* 1. collection prefix (shared store only) */
const NS=c=>S.db&&S.db.local?c:"apqp-"+c;

/* 2. constants */
const ID_RE=/^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const LKEY="mws-apqp-local-v1";
const PROC={HT:"Hardening & tempering",IA:"Isothermal annealing",NORM:"Normalizing"};
const SRC={new:"New part",change:"Change (drawing, material, customer requirement)",process:"Process change / other furnace",transfer:"Transfer from another heat treater"};
const CONC={feasible:["ok","Feasible as specified"],changes:["warn","Feasible with the changes listed"],not:["bad","Not feasible"]};
const ANS={yes:"Yes",no:"No",na:"Not applicable"};
/* the feasibility questions of a heat treat part (F-APQP-01); `p` = processes the question applies to (all when missing) */
const FEAS=[
  {k:"def",t:"Part adequately defined: drawing and revision, material grade and every heat treat requirement (surface / core hardness, case, microstructure, decarburization, grain size)"},
  {k:"csr",t:"Customer-specific requirements and the customer's heat treat specification reviewed and understood"},
  {k:"mat",t:"Material grade and section suitable for the process (hardenability, as-received condition, cleanliness)"},
  {k:"furn",t:"The process runs on the furnace(s) proposed"},
  {k:"temp",t:"Set values within the qualified range of the chambers (TUS) and the tolerance achievable for the furnace class"},
  {k:"load",t:"Part fits the tray and a defined load build; net load within the tray maximum"},
  {k:"quench",t:"Quench medium and severity suitable (F-01 water, F-02 oil); distortion and cracking risk assessed",p:["HT"]},
  {k:"cool",t:"Controlled cooling cycle (transfers + cooling) fits within the push time",p:["IA"]},
  {k:"test",t:"Testing capability: hardness and metallurgical tests, sampling, equipment and laboratory available"},
  {k:"cap",t:"Capacity: furnace hours available for the required volume"},
  {k:"sc",t:"Special characteristics identified and can be met with the required capability"},
  {k:"post",t:"Shot blasting, handling, packaging and traceability requirements can be met"}];
const qApplies=(q,proc)=>!q.p||q.p.includes(proc);
/* planning outputs (F-APQP-02): what has to exist before the part is released for production */
const DEL=[["flow","Process flow diagram"],["pfmea","PFMEA (HTSA 1.3)"],["cp","Control plan (HTSA 1.4)"],["spec","Process specification (HTSA 1.6)"],["lb","Loading standard / load build"],["trial","Trial lot and its test results"],["ppap","PPAP / customer approval"]];
const DST={open:["warn","Open"],done:["ok","Done"],na:["","Not applicable"]};
const DEF={plant:"Mass Wire and Steels Pvt. Ltd. · Bhiwadi",reviewDays:365,hrsMonth:600,capPct:85,trayKg:200,approvers:"",
  runs:"F-01: IA, HT\nF-02: IA, NORM, HT\nF-03: IA, NORM\nF-04: IA, NORM"};
const SETF=[["plant","Plant","text"],["reviewDays","Review the APQP procedure every (days)","number"],["hrsMonth","Furnace hours available per furnace and month","number"],
  ["capPct","Capacity warning above % of the hours available","number"],["trayKg","Tray maximum net load (kg; HK trays)","number"],
  ["approvers","Who may approve a feasibility study (one name per line; with the HT organization module the heat treat person, the deputy and the authorized positions count too)","area"],
  ["runs","Processes per furnace (one line per furnace, e.g. F-01: IA, HT)","area"]];
const DOCS=[
  ["APQP/00_APQP_Master_List.md","Master list"],
  ["APQP/01_Procedure/MWSPL-QP-APQP-01_Advanced_Quality_Planning.md","MWSPL-QP-APQP-01 Advanced quality planning"],
  ["APQP/02_Work_Instructions/MWSPL-WI-APQP-01_Feasibility_Study.md","MWSPL-WI-APQP-01 Feasibility study"],
  ["APQP/02_Work_Instructions/MWSPL-WI-APQP-02_Part_Families.md","MWSPL-WI-APQP-02 Part families"],
  ["APQP/03_Formats/MWSPL-F-APQP-01_Team_Feasibility_Commitment.md","MWSPL-F-APQP-01 Team feasibility commitment"],
  ["APQP/03_Formats/MWSPL-F-APQP-02_Quality_Planning_Checklist.md","MWSPL-F-APQP-02 Quality planning checklist"],
  ["APQP/03_Formats/MWSPL-F-APQP-03_Part_Family_Register.md","MWSPL-F-APQP-03 Part family register"],
  ["APQP/04_Application/mwspl-apqp-module.md","Module description"]];

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
const addDays=(s,n)=>{const d=new Date(s+"T00:00:00");d.setDate(d.getDate()+n);return iso(d);};
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtD=s=>isDate(s)?`${s.slice(8,10)}-${MON[+s.slice(5,7)-1]}-${s.slice(0,4)}`:"—";
const getp=(o,p)=>p.split(".").reduce((a,k)=>a==null?a:a[k],o);
const setp=(o,p,v)=>{const k=p.split(".");let a=o;k.slice(0,-1).forEach(x=>{if(a[x]==null||typeof a[x]!=="object")a[x]={};a=a[x];});a[k.at(-1)]=v;};
const pill=(c,t)=>`<span class="pill ${c||""}">${esc(t)}</span>`;
const plural=(n,w,p)=>`${n} ${n===1?w:(p||w+"s")}`;
const maxNo=L=>Math.max(0,...L.map(x=>+(String(x.id).match(/(\d+)$/)||[0,0])[1]));
/* "N/A" means not available: an entry, never an identity */
const isNA=v=>/^(n\/?a|not available)$/i.test(txt(v));
const pkey=v=>isNA(v)?"":txt(v).toUpperCase();
const lines=v=>String(v||"").split(/[\n,;]+/).map(txt).filter(Boolean);

/* 4. state */
const S={view:"dash",db:null,dbState:"connecting",canWrite:true,dl:null,studies:[],cfg:{...DEF},proc:{no:"MWSPL-QP-APQP-01",rev:0,prep:"",appr:"",apprDate:"",change:"",log:[]},
  docSel:DOCS[0][0],imp:null,modal:null,pending:false,unsub:[],q:{},filt:{q:"",st:""}};
const C=()=>S.cfg;

/* 5. domain logic */
function fillStudy(o){const d={id:"",scope:"part",part:"",name:"",famName:"",famDef:"",parts:"",customer:"",drawing:"",drawRev:"",grade:"",proc:"HT",furnaces:[],source:"new",
  started:"",target:"",vol:"",pcs:"",wt:"",push:"",team:"",csr:{ref:"",by:"",date:"",notes:""},ans:{},conc:"",changes:"",risks:"",prep:"",appr:"",apprDate:"",
  rev:0,status:"draft",change:"",revs:[],del:{},chgDone:false,rel:{by:"",date:"",ref:""},cancel:{date:"",why:""},log:[]};
  const x={...d,...(o||{})};x.csr={...d.csr,...((o&&o.csr)||{})};x.rel={...d.rel,...((o&&o.rel)||{})};x.cancel={...d.cancel,...((o&&o.cancel)||{})};
  if(!Array.isArray(x.furnaces))x.furnaces=[];if(!Array.isArray(x.revs))x.revs=[];if(!Array.isArray(x.log))x.log=[];
  if(!x.ans||typeof x.ans!=="object")x.ans={};FEAS.forEach(q=>{x.ans[q.k]={a:"",note:"",...(x.ans[q.k]||{})};});
  if(!x.del||typeof x.del!=="object")x.del={};DEL.forEach(([k])=>{x.del[k]={st:"open",ref:"",date:"",note:"",...(x.del[k]||{})};});
  return x;}
const byId=id=>S.studies.find(s=>s.id===id)||null;
const furnaces=()=>runsMap().map(r=>r.f);
function runsMap(){return String(C().runs||"").split(/\n/).map(l=>{const m=l.match(/^\s*([A-Za-z]-?\d+)\s*:\s*(.*)$/);return m?{f:m[1].toUpperCase(),p:m[2].split(/[\s,;]+/).map(x=>x.toUpperCase()).filter(Boolean)}:null;}).filter(Boolean);}
const runsOn=(f,proc)=>{const r=runsMap().find(x=>x.f===f);return r?r.p.includes(proc):null;};
/* the parts a study covers (a family covers every part listed) */
const partsOf=s=>s.scope==="family"?lines(s.parts).filter(p=>!isNA(p)):(txt(s.part)&&!isNA(s.part)?[txt(s.part)]:[]);
const titleOf=s=>s.scope==="family"?`Family: ${s.famName||"(unnamed)"}`:`${s.part||"(no part)"}${s.name?" · "+s.name:""}`;
/* the approved revision in force (approved = locked; a new revision keeps the last approved one in force) */
const effOf=s=>s.status==="approved"?s:(s.revs||[]).filter(r=>r.status==="approved").at(-1)||null;
const cancelled=s=>isDate(s.cancel.date);
const released=s=>isDate(s.rel.date);
/* specifications in force (Specifications module): per part key */
function specMap(){const m={};try{(MWS.spec&&MWS.spec.inForce?MWS.spec.inForce():[]).forEach(e=>{const k=pkey(e.part);if(k)(m[k]=m[k]||[]).push(e);});}catch(e){}return m;}
const specHas=()=>{try{return !!(MWS.spec&&MWS.spec.inForce&&MWS.spec.inForce().length);}catch(e){return false;}};
/* approvers: Settings names + the HT organization module's authorized people */
function approvers(){const L=lines(C().approvers).map(n=>({name:n,src:"Settings"}));
  try{if(MWS.org&&MWS.org.hasData&&MWS.org.hasData())MWS.org.authorized().forEach(a=>{if(!L.some(x=>x.name.toLowerCase()===a.name.toLowerCase()))L.push({name:a.name,src:a.position});});}catch(e){}
  return L;}
const isApprover=n=>{const L=approvers();return !L.length||L.some(a=>a.name.toLowerCase()===txt(n).toLowerCase());};
/* capacity: furnace hours a month for the volume (pcs / tray, push) */
function capCalc(s){const v=num(s.vol),p=num(s.pcs),t=num(s.push);if(!(v>0&&p>0&&t>0))return null;
  const trays=Math.ceil(v/p),hrs=Math.round(trays*t/60*10)/10,pct=Math.round(hrs/(+C().hrsMonth||600)*1000)/10;
  const kg=num(s.wt)!=null?Math.round(num(s.wt)*p*10)/10:null;return {trays,hrs,pct,kg,over:pct>(+C().capPct||85),kgOver:kg!=null&&kg>(+C().trayKg||200)};}
/* automatic hints for the questions the module can check */
function autoHints(s){const H={};
  const bad=s.furnaces.filter(f=>runsOn(f,s.proc)===false);if(bad.length)H.furn=["bad",`${bad.join(", ")} does not run ${PROC[s.proc]} (Settings: processes per furnace).`];
  else if(s.furnaces.length)H.furn=["ok",`${s.furnaces.join(", ")} run${s.furnaces.length===1?"s":""} ${PROC[s.proc]}.`];
  const c=capCalc(s);if(c){H.cap=[c.over?"warn":"ok",`${c.trays} trays = ${c.hrs} furnace hours a month, ${c.pct} % of ${C().hrsMonth} h${c.over?" (above "+C().capPct+" %)":""}.`];
    if(c.kg!=null)H.load=[c.kgOver?"bad":"ok",`Net load ${c.kg} kg per tray (maximum ${C().trayKg} kg).`];}
  if(s.proc==="HT"){const q=s.furnaces.map(f=>f==="F-01"?"F-01 water":f==="F-02"?"F-02 oil":f+" no quench tank");if(q.length)H.quench=[s.furnaces.some(f=>f!=="F-01"&&f!=="F-02")?"bad":"ok",q.join(", ")+"."];}
  return H;}
/* approval gate of a feasibility study */
function feasMissing(s){const m=[];
  if(s.scope==="family"){if(!txt(s.famName))m.push("family name");if(!txt(s.famDef))m.push("family definition (what the parts have in common)");if(partsOf(s).length<1)m.push("the parts of the family");}
  else if(!txt(s.part)||isNA(s.part))m.push("part number");
  if(!txt(s.customer))m.push("customer");if(s.scope==="part"&&!txt(s.drawing))m.push("drawing / specification");if(!txt(s.grade))m.push("material grade");
  if(!s.furnaces.length)m.push("furnace(s)");
  if(!txt(s.csr.ref))m.push("customer requirements reviewed (reference)");if(!txt(s.csr.by)||!isDate(s.csr.date))m.push("customer requirements reviewed by / date");
  const qs=FEAS.filter(q=>qApplies(q,s.proc)),un=qs.filter(q=>!s.ans[q.k].a),nn=qs.filter(q=>["no","na"].includes(s.ans[q.k].a)&&!txt(s.ans[q.k].note));
  if(un.length)m.push(`${plural(un.length,"question")} not answered`);if(nn.length)m.push(`a note on every "No" / "Not applicable" (${nn.map(q=>FEAS.indexOf(q)+1).join(", ")})`);
  if(!s.conc)m.push("conclusion");else if(s.conc!=="feasible"&&!txt(s.changes))m.push(s.conc==="changes"?"the changes needed":"why it is not feasible");
  if(s.conc==="feasible"&&qs.some(q=>s.ans[q.k].a==="no"))m.push(`conclusion "feasible as specified" with a question answered No`);
  if(lines(s.team).length<2)m.push("team (at least two names)");
  if(!txt(s.prep))m.push("prepared by");if(!txt(s.appr))m.push("approved by");else if(!isApprover(s.appr))m.push(`approved by a person allowed to approve (${approvers().map(a=>a.name).join(", ")})`);
  if(s.rev>0&&!txt(s.change))m.push("reason for the new revision");
  return m;}
/* release gate: planning outputs done (or not applicable with a note), the specification in force, the changes made */
function relMissing(s){const m=[],e=effOf(s),sm=specMap();
  if(!e)m.push("an approved feasibility study");else if(e.conc==="not")m.push("a feasible conclusion");
  if(e&&e.conc==="changes"&&!s.chgDone)m.push("confirmation that the changes listed are made");
  DEL.forEach(([k,t])=>{const d=s.del[k];if(d.st==="open")m.push(t);else if(d.st==="na"&&!txt(d.note))m.push(t+": why not applicable");else if(d.st==="done"&&!txt(d.ref)&&k!=="spec")m.push(t+": reference");});
  if(s.del.spec.st==="done"&&specHas()){const miss=partsOf(s).filter(p=>!sm[pkey(p)]);if(miss.length)m.push("a process specification in force for "+miss.join(", "));}
  if(!txt(s.rel.by))m.push("released by");if(!isDate(s.rel.date))m.push("release date");else if(e&&e.apprDate>s.rel.date)m.push("release not before the feasibility approval");
  return m;}
const relDue=s=>!released(s)&&!cancelled(s)&&isDate(s.target)&&s.target<today();
/* stage of a study */
function stageOf(s){if(cancelled(s))return ["","Cancelled"];if(released(s))return ["ok","Released for production"];const e=effOf(s);
  if(!e)return ["warn",s.ans&&Object.values(s.ans).some(a=>a.a)?"Feasibility in work":"Planning"];
  if(e.conc==="not")return ["bad","Not feasible"];if(s.status==="draft")return ["warn",`Rev ${s.rev} in work · rev ${e.rev} in force`];return [e.conc==="changes"?"warn":"acc","Feasible · planning outputs open"];}
/* every part to be covered: parts with a specification in force + parts named in studies */
function coverage(){const sm=specMap(),P={};
  Object.entries(sm).forEach(([k,L])=>{P[k]={part:L[0].part,spec:L.map(e=>`${e.id} rev ${e.rev}`).join(", "),proc:L[0].proc,studies:[]};});
  S.studies.forEach(s=>partsOf(s).forEach(p=>{const k=pkey(p);if(!k)return;(P[k]=P[k]||{part:p,spec:"",proc:s.proc,studies:[]}).studies.push(s);}));
  return Object.values(P).filter(x=>x.spec||x.studies.some(s=>!cancelled(s))).map(x=>{const live=x.studies.filter(s=>!cancelled(s)),ap=live.filter(s=>effOf(s)),best=ap.find(s=>effOf(s).conc!=="not")||ap[0]||live[0]||null;
    const st=!best?"none":!effOf(best)?"draft":effOf(best).conc==="not"?"not":released(best)?"released":"approved";
    return {...x,best,st};}).sort((a,b)=>a.part.localeCompare(b.part));}
const COV={none:["bad","No feasibility study"],draft:["bad","Study not approved"],not:["bad","Concluded not feasible"],approved:["acc","Feasible · planning open"],released:["ok","Feasible · released"]};
const procDue=()=>isDate(S.proc.apprDate)?addDays(S.proc.apprDate,+C().reviewDays||365):null;

/* HTSA 1.2 */
const SCORE={s:["ok","Satisfactory","acc"],ns:["warn","Not satisfactory","cond"],nia:["bad","Needs immediate action","rej"]};
const LV={ok:["ok","Met"],warn:["warn","Attention"],crit:["bad","Not met"],info:["acc","Note"]};
function assess12(){
  const I=[],add=(lvl,req,ev,act)=>I.push({lvl,req,ev,act}),pr=S.proc,due=procDue(),cov=coverage(),sm=specMap();
  if(!isDate(pr.apprDate))add("crit","A documented advanced quality planning procedure",`${pr.no||"The APQP procedure"} is not approved.`,"Approve MWSPL-QP-APQP-01 (Procedure & families).");
  else if(due&&due<today())add("warn","A documented advanced quality planning procedure",`${pr.no} rev ${pr.rev} approved ${fmtD(pr.apprDate)} by ${pr.appr}: review overdue since ${fmtD(due)}.`,"Review the procedure and record the review (new revision).");
  else add("ok","A documented advanced quality planning procedure",`${pr.no} rev ${pr.rev} approved ${fmtD(pr.apprDate)} by ${pr.appr}.`,"");
  const none=cov.filter(c=>c.st==="none"),draft=cov.filter(c=>c.st==="draft"),inProd=c=>!!sm[pkey(c.part)];
  if(!cov.length)add("crit","A feasibility study for each part","No parts are known: no specification in force and no study recorded.","Record a feasibility study for every part (or part family) heat treated.");
  else if(none.length)add("crit","A feasibility study for each part",`${plural(none.length,"part")} without a study: ${none.slice(0,8).map(c=>c.part).join(", ")}${none.length>8?" …":""}${none.some(inProd)?" (specification in force)":""}.`,"Perform the feasibility study (WI-APQP-01), for a single part or within a part family (WI-APQP-02).");
  else add("ok","A feasibility study for each part",`Every one of the ${plural(cov.length,"part")} has a study.`,"");
  const unappr=draft.filter(inProd);
  if(draft.length)add(unappr.length?"crit":"warn","Feasibility internally approved",`${plural(draft.length,"part")} with a study not yet approved: ${draft.slice(0,8).map(c=>c.part).join(", ")}${unappr.length?` (${plural(unappr.length,"part")} already with a specification in force)`:""}.`,"Complete the study and have it approved before the part is run.");
  else if(cov.length)add("ok","Feasibility internally approved",`${plural(cov.filter(c=>["approved","released"].includes(c.st)).length,"part")} with an approved study.`,"");
  const notAp=S.studies.filter(s=>effOf(s)&&!isApprover(effOf(s).appr));
  if(notAp.length)add("warn","Approved by a person allowed to approve",`${notAp.map(s=>`${s.id} (${effOf(s).appr})`).join(", ")}: approver not on the list.`,"Check the list in Settings / the HT organization module, or re-approve.");
  const fam=S.studies.filter(s=>s.scope==="family"&&!cancelled(s));
  add(fam.length?"ok":"info","Part families defined by the heat treater",fam.length?`${plural(fam.length,"part family","part families")}: ${fam.map(s=>`${s.famName} (${plural(partsOf(s).length,"part")})`).join("; ")}.`:"No part families: every part has its own study.",
    "");
  const notF=cov.filter(c=>c.st==="not"&&inProd(c)),chg=S.studies.filter(s=>effOf(s)&&effOf(s).conc==="changes"&&!released(s)&&!cancelled(s));
  if(notF.length)add("crit","Parts run only when feasible",`${notF.map(c=>c.part).join(", ")}: concluded not feasible but a specification is in force.`,"Stop and review: change the process / furnace and repeat the study, or withdraw the specification.");
  else if(chg.length)add("warn","Parts run only when feasible",`${chg.map(s=>titleOf(s)).join("; ")}: feasible only with changes, not yet confirmed and released.`,"Make the changes and release the part (Planning outputs).");
  else add("ok","Parts run only when feasible","No part in production with a negative or open conclusion.","");
  const csrOpen=S.studies.filter(s=>!effOf(s)&&!cancelled(s)&&(!txt(s.csr.ref)||!isDate(s.csr.date)));
  add(csrOpen.length?"warn":"ok","Customer requirements incorporated",csrOpen.length?`${csrOpen.map(s=>s.id).join(", ")}: customer requirements not yet reviewed.`:"Every approved study records the customer requirements reviewed (reference, by, date).",csrOpen.length?"Review the customer-specific requirements and the customer's heat treat specification.":"");
  const appOpen=cov.filter(c=>c.st==="approved"&&inProd(c)),late=S.studies.filter(relDue);
  if(appOpen.length||late.length)add("warn","Quality planning completed before production",[appOpen.length?`${appOpen.map(c=>c.part).join(", ")}: specification in force, planning not released`:"",late.length?`${late.map(s=>s.id+" target "+fmtD(s.target)).join(", ")}: past the target date`:""].filter(Boolean).join(" · "),"Finish the planning outputs (PFMEA, control plan, specification, load build, trial, PPAP) and release.");
  else add("ok","Quality planning completed before production",`${plural(S.studies.filter(released).length,"study","studies")} released with every planning output.`,"");
  const crit=I.filter(i=>i.lvl==="crit").length,anyAp=S.studies.some(s=>effOf(s));
  return {I,crit,cov,score:!isDate(pr.apprDate)||(cov.length&&!anyAp)||!cov.length?"nia":crit?"ns":"s"};
}
function kp(){const A=assess12(),c=A.cov;return {score:A.score,crit:A.crit,parts:c.length,covered:c.filter(x=>["approved","released"].includes(x.st)).length,
  none:c.filter(x=>x.st==="none").length,drafts:S.studies.filter(s=>!effOf(s)&&!cancelled(s)).length,not:c.filter(x=>x.st==="not").length,
  open:S.studies.filter(s=>effOf(s)&&!released(s)&&!cancelled(s)&&effOf(s).conc!=="not").length,late:S.studies.filter(relDue).length,released:S.studies.filter(released).length};}

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
  S.unsub=[store.sub("studies",L=>{S.studies=L.map(fillStudy).sort((a,b)=>a.id<b.id?-1:1);safeRender();}),
    store.sub("config",L=>{const c=L.find(x=>x.id==="settings"),p=L.find(x=>x.id==="proc");S.cfg={...DEF,...(c||{})};delete S.cfg.id;
      S.proc={no:"MWSPL-QP-APQP-01",rev:0,prep:"",appr:"",apprDate:"",change:"",log:[],...(p||{})};delete S.proc.id;safeRender();})];
  render();
}
function safeRender(){
  const a=document.activeElement;if(S.modal||(a&&$("#main")&&$("#main").contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=true;return;}
  render();
}
onDoc("focusout",()=>setTimeout(()=>{if(S.pending&&!S.modal){const a=document.activeElement;if(!(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=false;render();}}},0));

/* 7. navigation */
const NAV=[["",[["dash","Dashboard"]]],["P",[["proc","Procedure & part families"],["studies","Feasibility studies"]]],["D",[["outputs","Planning outputs & release"]]],
  ["C",[["cover","Parts coverage"],["review","HTSA 1.2"]]],["A",[["act","Actions"]]],["",[["settings","Settings"],["rules","Rules"],["docs","Documentation"],["data","Data"]]]];
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
const procPill=()=>{const p=S.proc,due=procDue();return !isDate(p.apprDate)?pill("bad","Not approved"):due&&due<today()?pill("warn",`Rev ${p.rev} · review overdue`):pill("ok",`Rev ${p.rev} approved ${fmtD(p.apprDate)}`);};
const concPill=s=>{const e=effOf(s);return e&&e.conc?pill(...CONC[e.conc]):pill("","—");};
function attention(){const out=[],A=assess12();
  A.cov.filter(c=>["none","draft","not"].includes(c.st)).forEach(c=>out.push([c.best?`data-open="${esc(c.best.id)}"`:`data-new-part="${esc(c.part)}"`,`${c.part}: ${COV[c.st][1]}${c.spec?" (specification "+c.spec+" in force)":""}`,"bad"]));
  S.studies.filter(relDue).forEach(s=>out.push([`data-open="${esc(s.id)}"`,`${s.id} ${titleOf(s)}: planning past the target ${fmtD(s.target)}`,"warn"]));
  S.studies.filter(s=>effOf(s)&&effOf(s).conc==="changes"&&!released(s)&&!cancelled(s)).forEach(s=>out.push([`data-open="${esc(s.id)}"`,`${s.id} ${titleOf(s)}: feasible only with changes: ${effOf(s).changes}`,"warn"]));
  if(!isDate(S.proc.apprDate))out.unshift([`data-procappr`,"The APQP procedure is not approved","bad"]);
  return out;}
function vDash(){
  if(!S.studies.length&&!isDate(S.proc.apprDate))return `<div class="empty"><h2>No quality planning recorded yet</h2><p>Approve the APQP procedure, then record a feasibility study for every part or part family. The starter set-up shows how the module works with the example parts of the Specifications module.</p><div class="row" style="justify-content:center"><button class="pri w" data-new-study>New feasibility study</button><button class="w" data-std>Load starter set-up</button></div></div>`;
  const A=assess12(),sc=SCORE[A.score],k=kp(),att=attention();
  return `<div class="tiles">
    <a class="tile ${sc[0]}" href="#review"><span class="k">HTSA 1.2</span><span class="v" style="font-size:20px;padding:6px 0">${sc[1]}</span><span class="small muted">${plural(A.crit,"item")} not met</span></a>
    <a class="tile ${k.covered===k.parts&&k.parts?"ok":"bad"}" href="#cover"><span class="k">Parts with an approved study</span><span class="v">${k.covered}/${k.parts}</span><span class="small muted">${k.none} without a study</span></a>
    <a class="tile ${k.drafts?"warn":""}" href="#studies"><span class="k">Studies in work</span><span class="v">${k.drafts}</span><span class="small muted">not yet approved</span></a>
    <a class="tile ${k.not?"bad":""}" href="#cover"><span class="k">Not feasible</span><span class="v">${k.not}</span><span class="small muted">parts</span></a>
    <a class="tile ${k.late?"bad":k.open?"warn":""}" href="#outputs"><span class="k">Planning open</span><span class="v">${k.open}</span><span class="small muted">${k.late} past target</span></a>
    <a class="tile ok" href="#outputs"><span class="k">Released</span><span class="v">${k.released}</span><span class="small muted">for production</span></a></div>
  <div class="grid2"><div class="panel"><div class="row between"><h3>Needs attention</h3><button class="pri w" data-new-study>New feasibility study</button></div>
    ${att.length?`<ul class="issues">${att.slice(0,12).map(([a,t,c])=>`<li><button class="link" ${a}>${esc(t)}</button> ${pill(c,c==="bad"?"Not met":"Attention")}</li>`).join("")}</ul>`:`<p class="muted">Nothing open.</p>`}</div>
  <div class="panel"><h3>APQP procedure</h3><p>${esc(S.proc.no)} ${procPill()}</p><p class="small muted">${isDate(S.proc.apprDate)?`Approved by ${esc(S.proc.appr)}; review due ${fmtD(procDue())}.`:"Approve the procedure before the first study."}</p>
    <p class="small muted">Feasibility is approved by: ${approvers().length?approvers().map(a=>esc(a.name)).join(", "):"anyone (no list set)"}.</p></div></div>`;
}
function vProc(){
  const fam=S.studies.filter(s=>s.scope==="family");
  return `<div class="panel"><div class="row between"><h3>Advanced quality planning procedure</h3><button class="w" data-procappr>${isDate(S.proc.apprDate)?"Approve a new revision":"Approve the procedure"}</button></div>
    <p>${esc(S.proc.no)} ${procPill()}</p><p class="small muted">The procedure itself is the document MWSPL-QP-APQP-01 (<a href="#docs" data-docref="01_Procedure/MWSPL-QP-APQP-01_Advanced_Quality_Planning.md">open it</a>). Its approval and review are recorded here.</p>
    ${S.proc.log.length?`<ul class="small">${S.proc.log.slice().reverse().map(l=>`<li>${fmtD(l.d)} · ${esc(l.t)}</li>`).join("")}</ul>`:""}</div>
  <div class="panel"><div class="row between"><h3>Part families (F-APQP-03)</h3><button class="w" data-new-family>New part family study</button></div>
    <p class="small muted">Similar parts may share one feasibility study. The heat treater defines the family (same process route and furnace, material group, section and weight range, requirements), and every part named in it is covered by the family's approved study.</p>
    ${fam.length?`<div class="tw"><table><thead><tr><th>Study</th><th>Family</th><th>Definition</th><th>Parts</th><th>Process</th><th>Feasibility</th></tr></thead><tbody>${fam.map(s=>`<tr class="click" data-open="${esc(s.id)}"><td class="mono">${esc(s.id)}</td><td><b>${esc(s.famName)}</b></td><td class="small">${esc(s.famDef)}</td><td>${esc(partsOf(s).join(", "))}</td><td>${esc(PROC[s.proc])}<br><span class="small muted">${esc(s.furnaces.join(", "))}</span></td><td>${concPill(s)}<br>${pill(...stageOf(s))}</td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">No part family yet.</p>`}</div>`;
}
function vStudies(){
  const f=S.filt,q=f.q.toLowerCase();
  const L=S.studies.filter(s=>(!q||[s.id,s.part,s.name,s.famName,s.parts,s.customer,s.grade].join(" ").toLowerCase().includes(q))&&(!f.st||(f.st==="draft"?!effOf(s)&&!cancelled(s):f.st==="open"?effOf(s)&&!released(s)&&!cancelled(s):f.st==="rel"?released(s):cancelled(s)))).slice().reverse();
  return `<div class="row between"><h2>Feasibility studies</h2><div class="row"><button class="pri w" data-new-study>New study (part)</button><button class="w" data-new-family>New study (part family)</button></div></div>
  <div class="row"><input data-filt="q" placeholder="Search part, customer, grade" value="${esc(f.q)}" style="max-width:280px"><select data-filt="st"><option value="">All</option>${[["draft","In work"],["open","Feasible · planning open"],["rel","Released"],["can","Cancelled"]].map(([k,t])=>`<option value="${k}" ${f.st===k?"selected":""}>${t}</option>`).join("")}</select></div>
  ${L.length?`<div class="tw"><table><thead><tr><th>Study</th><th>Part / family</th><th>Customer</th><th>Process · furnaces</th><th>Rev</th><th>Conclusion</th><th>Stage</th></tr></thead><tbody>${L.map(s=>{const e=effOf(s);
    return `<tr class="click" data-open="${esc(s.id)}"><td class="mono">${esc(s.id)}</td><td><b>${esc(titleOf(s))}</b>${s.scope==="family"?`<br><span class="small muted">${esc(partsOf(s).join(", "))}</span>`:""}</td><td>${esc(s.customer)}</td><td>${esc(PROC[s.proc])}<br><span class="small muted">${esc(s.furnaces.join(", "))}</span></td><td>${e?`${e.rev} · ${fmtD(e.apprDate)}`:`${s.rev} draft`}</td><td>${concPill(s)}</td><td>${pill(...stageOf(s))}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No study matches.</p></div>`}`;
}
function vOutputs(){
  const L=S.studies.filter(s=>effOf(s)&&!cancelled(s));
  return `<h2>Planning outputs & release (F-APQP-02)</h2><p class="muted">After the feasibility is approved, the planning outputs are completed and the part is released for production. The process specification is read from the Specifications module.</p>
  ${L.length?`<div class="tw"><table><thead><tr><th>Study</th>${DEL.map(([,t])=>`<th>${esc(t.replace(/ \(.*\)/,""))}</th>`).join("")}<th>Target</th><th>Release</th></tr></thead><tbody>${L.map(s=>`<tr class="click" data-open="${esc(s.id)}"><td><span class="mono">${esc(s.id)}</span><br><b>${esc(titleOf(s))}</b></td>${DEL.map(([k])=>`<td>${pill(...DST[s.del[k].st])}</td>`).join("")}<td>${relDue(s)?pill("bad",fmtD(s.target)):fmtD(s.target)}</td><td>${released(s)?pill("ok",fmtD(s.rel.date)):effOf(s).conc==="not"?pill("bad","Not feasible"):pill("warn","Open")}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty"><p>No approved feasibility study yet.</p></div>`}`;
}
function vCover(){const cov=coverage();
  return `<h2>Parts coverage</h2><p class="muted">Every part with a process specification in force (Specifications module) and every part named in a study. HTSA 1.2 asks for an internally approved feasibility study for each part (or its part family).</p>
  ${!specHas()?`<p class="banner warn">The Specifications module holds no specification in force: only the parts named in studies are listed.</p>`:""}
  ${cov.length?`<div class="tw"><table><thead><tr><th>Part</th><th>Specification in force</th><th>Study</th><th>Status</th><th></th></tr></thead><tbody>${cov.map(c=>`<tr><td><b>${esc(c.part)}</b><br><span class="small muted">${esc(PROC[c.proc]||"")}</span></td><td>${esc(c.spec||"—")}</td><td>${c.best?`<button class="link" data-open="${esc(c.best.id)}">${esc(c.best.id)}${c.best.scope==="family"?" · family "+esc(c.best.famName):""}</button>`:"—"}</td><td>${pill(...COV[c.st])}</td><td>${c.st==="none"?`<button data-new-part="${esc(c.part)}">Start study</button>`:""}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty"><p>No parts known yet.</p></div>`}`;}
function vReview(){
  const A=assess12(),sc=SCORE[A.score];
  return `<div class="panel"><div class="row between"><h3>HTSA 1.2 · Does the heat treater perform advanced quality planning?</h3><button data-h12>Evidence (print)</button></div>
    <p><span class="verdict ${sc[2]}">${sc[1]}</span> <span class="muted">${plural(A.I.filter(i=>i.lvl==="ok").length,"item")} met · ${plural(A.crit,"item")} not met · ${plural(A.I.filter(i=>i.lvl==="warn").length,"item")} needing attention</span></p>
    <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th><th>Action</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${pill(...LV[i.lvl])}</td><td>${esc(i.act)}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted" style="margin-top:8px">The question asks for a documented advanced quality planning procedure, a feasibility study performed and internally approved for each part, with similar parts allowed to be grouped into part families as defined by the heat treater. Wording to confirm against the controlled CQI-9 copy.</p></div>`;}
function vAct(){const att=attention(),sm=specMap();
  const notF=S.studies.filter(s=>effOf(s)&&effOf(s).conc==="not");
  return `<div class="panel"><h3>Open items</h3>${att.length?`<ul class="issues">${att.map(([a,t,c])=>`<li><button class="link" ${a}>${esc(t)}</button> ${pill(c,c==="bad"?"Not met":"Attention")}</li>`).join("")}</ul>`:`<p class="muted">Nothing open.</p>`}</div>
  <div class="panel"><h3>Concluded not feasible</h3>${notF.length?`<div class="tw"><table><thead><tr><th>Study</th><th>Part / family</th><th>Why</th><th>Specification in force</th></tr></thead><tbody>${notF.map(s=>`<tr class="click" data-open="${esc(s.id)}"><td class="mono">${esc(s.id)}</td><td>${esc(titleOf(s))}</td><td>${esc(effOf(s).changes)}</td><td>${partsOf(s).some(p=>sm[pkey(p)])?pill("bad","Yes: review"):pill("ok","No")}</td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">None.</p>`}</div>`;}
function vSettings(){const c=C();
  return `<div class="panel"><h3>Settings</h3><div class="fields">${SETF.map(([k,l,t])=>t==="area"?`<label class="f wide"><span>${esc(l)}</span><textarea data-cfg="${k}" rows="4">${esc(c[k])}</textarea></label>`:`<label class="f"><span>${esc(l)}</span><input data-cfg="${k}" type="${t}" value="${esc(c[k])}"></label>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="pri w" data-save-cfg>Save settings</button><span class="small muted">Changes are kept only after Save. Figures are site rules, not CQI-9 values.</span></div></div>`;}
function vRules(){const c=C();
  const R=[["Procedure","MWSPL-QP-APQP-01 is approved (number, revision, approved by, date) and reviewed every "+c.reviewDays+" days; a review is recorded as a new revision."],
    ["Part or part family","A study is for one part or for a part family defined by the heat treater (name, definition: what the parts have in common, the parts). An approved family study covers every part named in it; adding a part needs a new revision."],
    ["Feasibility gate","Part (or family name, definition and parts), customer, drawing (part study), grade, furnaces, the customer requirements reviewed (reference, by, date), every question that applies answered (a note on every No / Not applicable), a conclusion (feasible / feasible with changes / not feasible, with the changes or the reason), a team of at least two, prepared and approved by a person allowed to approve, the reason for a new revision. Approved = locked; a new revision keeps the approved one in force."],
    ["Automatic checks","The furnaces run the process (Settings: processes per furnace), quench tank per furnace for hardening (F-01 water, F-02 oil), net load per tray (maximum "+c.trayKg+" kg), furnace hours for the volume (warning above "+c.capPct+" % of "+c.hrsMonth+" h a month). They are hints for the team's answers."],
    ["Release","An approved feasible study, the changes confirmed when it was feasible only with changes, every planning output done (with a reference) or not applicable (with a note), a process specification in force for each part when the Specifications module holds specifications, released by, a date not before the feasibility approval."],
    ["Coverage","Parts = parts with a specification in force + parts named in studies. A part counts as covered when an approved study (its own or its family's) concludes feasible. N/A is never a part number."],
    ["HTSA 1.2 score","Needs immediate action: the procedure is not approved, no part is known, or no study is approved. Not satisfactory: a part without a study, a study not approved for a part with a specification in force, a part not feasible but in production. Satisfactory: otherwise."]];
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
function vData(){const n=S.studies.length;
  return `<h2>Data</h2><div class="grid2">
  <div class="panel"><h3>Back up and restore</h3><p class="small muted">${plural(n,"study","studies")} · storage: ${S.dbState==="on"?"shared record store":"this browser"}.</p>
    <div class="row"><button class="pri" data-export>Export JSON</button><button data-csv>Studies CSV</button></div>
    <div class="row w" style="margin-top:10px"><label class="f"><span>Import a JSON export</span><input type="file" id="impfile" accept=".json,application/json"></label></div>
    ${S.imp?`<div class="banner" style="margin-top:8px">${esc(S.imp.msg)}<div class="row" style="margin-top:6px"><button class="pri" data-imp="merge">Merge (add and update)</button><button class="danger" data-imp="replace">Replace everything</button><button data-imp="cancel">Cancel</button></div></div>`:""}</div>
  <div class="panel"><h3>Starter set-up</h3><p class="small muted">An approved procedure and studies for the example parts of the Specifications module (EX-1001 released, a family of gear blanks, EX-3001 not yet approved), a new part feasible only with changes and one not feasible; all marked "(example)".</p><button class="w" data-std ${n?"disabled":""}>Load starter set-up</button>${n?`<p class="small muted">Only on an empty module.</p>`:""}</div>
  <div class="panel"><h3>Clear all</h3><p class="small muted">Deletes every record and the settings of this module. Type <b>CLEAR ALL</b> to enable.</p>
    <div class="row w"><input id="clrtxt" placeholder="CLEAR ALL" style="max-width:180px"><button class="danger" data-clear>Clear all</button></div></div></div>`;}
const VIEWS={dash:vDash,proc:vProc,studies:vStudies,outputs:vOutputs,cover:vCover,review:vReview,act:vAct,settings:vSettings,rules:vRules,docs:vDocs,data:vData};
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
function studyModal(id,init){const s=byId(id);openModal({kind:"study",ed:s?clone(s):fillStudy({started:today(),...(init||{})}),msg:""});}
function DRAW_STUDY(){
  const E=S.modal.ed,known=byId(E.id),lock=E.status!=="draft"||cancelled(E),e=known?effOf(known):null,miss=feasMissing(E),H=autoHints(E),fam=E.scope==="family";
  const sm=specMap(),specs=partsOf(E).map(p=>[p,sm[pkey(p)]]),qs=FEAS.filter(q=>qApplies(q,E.proc)),c=capCalc(E);
  const body=`<p class="muted">${known?pill(...stageOf(known)):pill("warn","New · draft")} ${e&&E.status==="draft"?`· rev ${e.rev} stays in force until rev ${E.rev} is approved`:""}</p>
  <fieldset><legend>${fam?"Part family":"Part"}</legend><div class="fields">
    ${fam?mf("famName","Family name",{req:1,dis:lock})+mf("famDef","Definition: what the parts have in common (process, furnace, material group, section / weight range, requirements)",{area:2,wide:1,req:1,dis:lock})+mf("parts","Parts of the family (one per line or separated by commas)",{area:2,wide:1,req:1,dis:lock})
      :mf("part","Part number",{req:1,dis:lock})+mf("name","Part name",{dis:lock})+mf("drawing","Drawing / customer specification",{req:1,dis:lock})+mf("drawRev","Drawing revision",{dis:lock})}
    ${mf("customer","Customer",{req:1,dis:lock})}${mf("grade","Material grade",{req:1,dis:lock})}${mf("proc","Process",{opts:Object.entries(PROC),dis:lock})}${mf("source","Reason for planning",{opts:Object.entries(SRC),dis:lock})}
    <div class="f wide"><span>Furnaces proposed</span><div class="row">${furnaces().map(f=>`<label class="chk"><input type="checkbox" data-fu="${f}" ${E.furnaces.includes(f)?"checked":""} ${lock?"disabled":""}> ${f}${runsOn(f,E.proc)===false?' <span class="small muted">(does not run '+esc(E.proc)+')</span>':""}</label>`).join("")}</div></div>
    ${mf("started","Planning started",{type:"date",dis:lock})}${mf("target","Target: ready for production",{type:"date"})}</div>
    ${specs.length&&specHas()?`<p class="small muted">Specification in force: ${specs.map(([p,L])=>`${esc(p)} ${L?esc(L.map(x=>x.id+" rev "+x.rev).join(", ")):"none"}`).join(" · ")}</p>`:""}</fieldset>
  <fieldset><legend>Customer requirements</legend><div class="fields">${mf("csr.ref","Customer-specific requirements and specification reviewed (document, revision)",{req:1,wide:1,dis:lock})}${mf("csr.by","Reviewed by",{req:1,dis:lock})}${mf("csr.date","Date",{type:"date",req:1,dis:lock})}${mf("csr.notes","Requirements to note (special characteristics, testing, packaging, PPAP level)",{area:2,wide:1,dis:lock})}</div></fieldset>
  <fieldset><legend>Volume and capacity</legend><div class="fields">${mf("vol","Volume (pieces a month)",{dis:lock})}${mf("pcs","Pieces per tray",{dis:lock})}${mf("wt","Part weight (kg)",{dis:lock})}${mf("push","Push time (min)",{dis:lock})}</div>
    ${c?`<p class="small">${c.trays} trays a month · ${c.hrs} furnace hours (${c.pct} % of ${C().hrsMonth} h)${c.kg!=null?` · ${c.kg} kg per tray`:""} ${c.over||c.kgOver?pill("warn","Check"):pill("ok","Within limits")}</p>`:`<p class="small muted">Enter volume, pieces per tray and push time for the capacity check.</p>`}</fieldset>
  <fieldset><legend>Feasibility questions (F-APQP-01)</legend><div class="tw"><table class="fq"><thead><tr><th>#</th><th>Question</th><th>Answer</th><th>Note (required for No / Not applicable)</th></tr></thead><tbody>${qs.map(q=>{const a=E.ans[q.k],h=H[q.k];
    return `<tr><td>${FEAS.indexOf(q)+1}</td><td>${esc(q.t)}${h?`<br><span class="small c-${h[0]==="ok"?"ok":h[0]==="bad"?"bad":"warn"}">${esc(h[1])}</span>`:""}</td><td><select data-ans="${q.k}" ${lock?"disabled":""}><option value="">—</option>${Object.entries(ANS).map(([k,t])=>`<option value="${k}" ${a.a===k?"selected":""}>${t}</option>`).join("")}</select></td><td><input data-anote="${q.k}" value="${esc(a.note)}" ${lock?"disabled":""}></td></tr>`;}).join("")}</tbody></table></div></fieldset>
  <fieldset><legend>Conclusion and approval</legend><div class="fields">${mf("conc","Conclusion",{opts:Object.entries(CONC).map(([k,v])=>[k,v[1]]),blank:1,req:1,dis:lock})}
    ${mf("changes",E.conc==="not"?"Why it is not feasible":"Changes needed (process, furnace, fixture, requirement deviation to agree with the customer)",{area:2,wide:1,req:E.conc&&E.conc!=="feasible",dis:lock})}
    ${mf("risks","Risks and special characteristics carried into the PFMEA / control plan",{area:2,wide:1,dis:lock})}
    ${mf("team","Team (one name and function per line)",{area:3,wide:1,req:1,dis:lock})}${mf("prep","Prepared by",{req:1,dis:lock})}${mf("appr","Approved by",{req:1,dis:lock,list:"apqp-appr"})}
    ${E.rev>0?mf("change","Reason for the new revision",{area:2,wide:1,req:1,dis:lock}):""}</div>
    <datalist id="apqp-appr">${approvers().map(a=>`<option value="${esc(a.name)}">${esc(a.src)}</option>`).join("")}</datalist>
    ${E.status==="approved"?`<p>${pill("ok",`Rev ${E.rev} approved ${fmtD(E.apprDate)} by ${E.appr}`)}</p>`:""}</fieldset>
  ${e?`<fieldset><legend>Planning outputs and release (F-APQP-02)</legend><div class="tw"><table><thead><tr><th>Output</th><th>Status</th><th>Reference</th><th>Date</th><th>Note</th></tr></thead><tbody>${DEL.map(([k,t])=>{const d=E.del[k],dl=released(E)||cancelled(E);
      const auto=k==="spec"&&specHas()?`<br><span class="small muted">${specs.map(([p,L])=>`${esc(p)}: ${L?esc(L.map(x=>x.id+" rev "+x.rev).join(", ")):"no specification in force"}`).join(" · ")}</span>`:"";
      return `<tr><td>${esc(t)}${auto}</td><td><select data-del="${k}.st" ${dl?"disabled":""}>${Object.entries(DST).map(([v,[,l]])=>`<option value="${v}" ${d.st===v?"selected":""}>${l}</option>`).join("")}</select></td><td><input data-del="${k}.ref" value="${esc(d.ref)}" ${dl?"disabled":""}></td><td><input type="date" data-del="${k}.date" value="${esc(d.date)}" ${dl?"disabled":""}></td><td><input data-del="${k}.note" value="${esc(d.note)}" ${dl?"disabled":""}></td></tr>`;}).join("")}</tbody></table></div>
    ${e.conc==="changes"?`<label class="chk"><input type="checkbox" data-chg ${E.chgDone?"checked":""} ${released(E)?"disabled":""}> The changes listed are made: ${esc(e.changes)}</label>`:""}
    <div class="fields">${mf("rel.by","Released for production by",{dis:released(E)})}${mf("rel.date","Release date",{type:"date",dis:released(E)})}${mf("rel.ref","PPAP / release reference",{dis:released(E)})}</div>
    ${released(E)?`<p>${pill("ok","Released "+fmtD(E.rel.date)+" by "+E.rel.by)}</p>`:relMissing(E).length?`<p class="small muted">To release: ${esc(relMissing(E).join(" · "))}</p>`:""}</fieldset>`:""}
  ${!lock&&miss.length?`<div class="banner" style="margin-top:10px"><b>To approve the feasibility:</b> ${esc(miss.join(" · "))}</div>`:""}`;
  const foot=[!lock?`<button class="pri w" data-save-study>Save</button><button class="w" data-approve>Approve feasibility</button>`:"",
    E.status==="approved"&&!released(E)&&!cancelled(E)?`<button class="w" data-revise>New revision</button>`:"",E.status==="draft"&&e?`<button class="danger w" data-discard>Discard revision</button>`:"",
    e&&!released(E)&&!cancelled(E)?`<button class="w" data-save-del>Save outputs</button><button class="pri w" data-release>Release</button>`:"",
    known?`<button data-fprint>Print F-APQP-01</button>`:"",e?`<button data-cprint>Print F-APQP-02</button>`:"",
    known&&!e?`<button class="danger w" data-del-study>Delete</button>`:"",known&&e&&!released(E)&&!cancelled(E)?`<button class="danger" data-cancel>Cancel planning</button>`:"",`<button data-close>Close</button>`].join("");
  return sheet(esc(known?E.id+" · "+titleOf(E):fam?"New part family study":"New feasibility study"),body,foot);}
function DRAW_PROCAPPR(){const m=S.modal,next=isDate(S.proc.apprDate)?(+S.proc.rev||0)+1:Math.max(0,+S.proc.rev||0);
  return sheet("Approve the APQP procedure",`<p class="muted">Records revision ${next} of the procedure as approved (the document MWSPL-QP-APQP-01). A periodic review without changes is also recorded as a new revision.</p>
  <div class="fields"><label class="f req"><span>Document number</span><input id="pa-no" value="${esc(S.proc.no)}"></label><label class="f req"><span>Prepared by</span><input id="pa-prep" value="${esc(m.prep)}"></label><label class="f req"><span>Approved by</span><input id="pa-by" value="${esc(m.by)}"></label><label class="f req"><span>Date</span><input type="date" id="pa-date" value="${esc(m.date)}"></label>
  ${next>0?`<label class="f wide req"><span>Change / review note</span><input id="pa-chg" value="${esc(m.chg)}"></label>`:""}</div>`,`<button class="pri w" data-save-proc>Approve</button><button data-close>Cancel</button>`);}
function DRAW_CANCEL(){return sheet("Cancel the planning",`<p class="muted">The part is not taken up (customer did not order, quotation declined, not feasible). The study stays on record.</p><div class="fields"><label class="f wide req"><span>Why</span><input id="cn-why"></label></div>`,`<button class="danger w" data-save-cancel>Cancel the planning</button><button data-close>Back</button>`);}
function DRAW_PRINT(){return sheet(esc(S.modal.title),`<div id="jobcard">${S.modal.html()}</div>`,`<button class="pri" data-print>Print</button><button data-close>Close</button>`);}
const pHead=t=>`<p class="small muted">${esc(C().plant)} · ${esc(t)} · printed ${fmtD(today())}</p>`;
const kv=R=>`<div class="tw"><table><tbody>${R.map(([a,b])=>`<tr><td style="width:220px"><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>`;
function feasHtml(s){const e=effOf(s)&&s.status!=="approved"?effOf(s):s,qs=FEAS.filter(q=>qApplies(q,e.proc)),c=capCalc(e);
  return `${pHead("Team feasibility commitment (MWSPL-F-APQP-01, CQI-9 HTSA 1.2)")}<h2>${esc(s.id)} · ${esc(titleOf(e))} · rev ${e.rev}${e.status!=="approved"?" · DRAFT":""}</h2>
  ${kv([...(e.scope==="family"?[["Family definition",e.famDef],["Parts",partsOf(e).join(", ")]]:[["Part",`${e.part} ${e.name}`],["Drawing",`${e.drawing}${e.drawRev?" rev "+e.drawRev:""}`]]),
    ["Customer",e.customer],["Material grade",e.grade],["Process",PROC[e.proc]],["Furnaces",e.furnaces.join(", ")],["Reason",SRC[e.source]],
    ["Customer requirements reviewed",`${e.csr.ref} · ${e.csr.by} · ${fmtD(e.csr.date)}`],["Requirements to note",e.csr.notes],["Volume / capacity",c?`${e.vol} pcs a month · ${e.pcs} pcs per tray · push ${e.push} min → ${c.hrs} h (${c.pct} %)`:"—"]])}
  <h3>Questions</h3><div class="tw"><table><thead><tr><th>#</th><th>Question</th><th>Answer</th><th>Note</th></tr></thead><tbody>${qs.map(q=>`<tr><td>${FEAS.indexOf(q)+1}</td><td>${esc(q.t)}</td><td>${esc(ANS[e.ans[q.k].a]||"—")}</td><td>${esc(e.ans[q.k].note)}</td></tr>`).join("")}</tbody></table></div>
  ${kv([["Conclusion",e.conc?CONC[e.conc][1]:"—"],["Changes / reason",e.changes],["Risks and special characteristics",e.risks],["Team",lines(e.team).join("; ")],["Prepared by",e.prep],["Approved by / date",`${e.appr} · ${fmtD(e.apprDate)}`],["Reason for the revision",e.rev>0?e.change:"first issue"]])}
  <p class="small" style="margin-top:14px">Signatures: team ____________________ &nbsp; approved ____________________</p>`;}
function chkHtml(s){const e=effOf(s);
  return `${pHead("Quality planning checklist (MWSPL-F-APQP-02)")}<h2>${esc(s.id)} · ${esc(titleOf(s))}</h2>
  ${kv([["Feasibility",e?`rev ${e.rev} approved ${fmtD(e.apprDate)} by ${e.appr}: ${CONC[e.conc][1]}`:"not approved"],["Target",fmtD(s.target)]])}
  <div class="tw"><table><thead><tr><th>Output</th><th>Status</th><th>Reference</th><th>Date</th><th>Note</th></tr></thead><tbody>${DEL.map(([k,t])=>`<tr><td>${esc(t)}</td><td>${DST[s.del[k].st][1]}</td><td>${esc(s.del[k].ref)}</td><td>${fmtD(s.del[k].date)}</td><td>${esc(s.del[k].note)}</td></tr>`).join("")}</tbody></table></div>
  ${kv([["Changes made",e&&e.conc==="changes"?(s.chgDone?"yes":"no"):"—"],["Released by / date",released(s)?`${s.rel.by} · ${fmtD(s.rel.date)}${s.rel.ref?" · "+s.rel.ref:""}`:"not released"]])}`;}
function h12Html(){const A=assess12(),sc=SCORE[A.score];
  return `${pHead("CQI-9 HTSA 1.2 evidence")}<p><span class="verdict ${sc[2]}">${sc[1]}</span></p>
  <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${esc(LV[i.lvl][1])}</td></tr>`).join("")}</tbody></table></div>
  <h3>Parts coverage</h3><div class="tw"><table><thead><tr><th>Part</th><th>Specification</th><th>Study</th><th>Status</th></tr></thead><tbody>${A.cov.map(c=>`<tr><td>${esc(c.part)}</td><td>${esc(c.spec||"—")}</td><td>${c.best?esc(c.best.id):"—"}</td><td>${esc(COV[c.st][1])}</td></tr>`).join("")}</tbody></table></div>
  <h3>Part families (MWSPL-F-APQP-03)</h3>${S.studies.filter(s=>s.scope==="family").map(s=>`<p><b>${esc(s.famName)}</b> (${esc(s.id)}): ${esc(s.famDef)} · parts ${esc(partsOf(s).join(", "))}</p>`).join("")||"<p>None.</p>"}`;}
const DRAW={study:DRAW_STUDY,procappr:DRAW_PROCAPPR,cancel:DRAW_CANCEL,print:DRAW_PRINT};

/* 10. actions */
async function saveStudy(text){const E=fillStudy(S.modal.ed),known=byId(E.id);
  if(E.scope==="part"&&!txt(E.part)&&!txt(E.name)){msg("Enter the part number.");return false;}if(E.scope==="family"&&!txt(E.famName)){msg("Enter the family name.");return false;}
  if(E.scope==="part"&&txt(E.part)&&!isNA(E.part)&&!known){const dup=S.studies.find(s=>s.scope==="part"&&!cancelled(s)&&pkey(s.part)===pkey(E.part));if(dup){msg(`${dup.id} is already the study of ${E.part}: open it (a change is a new revision).`);return false;}}
  if(!known)E.id="AQ-"+String(maxNo(S.studies)+1).padStart(4,"0");
  if(await put("studies",E,text||(known?"Saved":"Started"))){S.modal.ed=clone(E);return true;}return false;}
async function stdOps(){if(!needDb())return;if(S.studies.length){toast("Only on an empty module.");return;}
  const d=today(),D=n=>addDays(d,n),ex=" (example)",team="R. Sharma, HT Manager"+ex+"\nS. Gupta, Quality Manager"+ex+"\nA. Verma, Production Manager"+ex;
  const yes=(proc,notes)=>Object.fromEntries(FEAS.map(q=>[q.k,qApplies(q,proc)?{a:"yes",note:(notes||{})[q.k]||""}:{a:"",note:""}]));
  const done=(refs,na)=>Object.fromEntries(DEL.map(([k])=>[k,na&&na[k]?{st:"na",ref:"",date:"",note:na[k]}:{st:"done",ref:(refs||{})[k]||"",date:D(-150),note:""}]));
  const base={customer:"Example customer",team,prep:"A. Verma"+ex,appr:"R. Sharma"+ex,status:"approved",csr:{ref:"Customer CSR rev 3, heat treat spec HT-07 rev B",by:"S. Gupta"+ex,date:D(-200),notes:"Surface hardness is a special characteristic (SC)."},log:[{d,t:"Example"}]};
  const L=[fillStudy({...base,id:"AQ-0001",part:"EX-1001",name:"Example shaft",drawing:"DRG-1001",drawRev:"C",grade:"42CrMo4",proc:"HT",furnaces:["F-02"],source:"new",started:D(-220),target:D(-120),vol:"12000",pcs:"60",wt:"1.8",push:"12",
      ans:yes("HT"),conc:"feasible",risks:"Surface hardness SC; quench cracking at the keyway (PFMEA).",apprDate:D(-190),rev:0,del:done({flow:"PFD-1001 rev 0",pfmea:"PF-0001 rev 1",cp:"CP-0001 rev 1",lb:"LB-0001 rev 0",trial:"Trial lot T-1001: MT-0001 pass",ppap:"PSW EX-1001 approved"}),
      rel:{by:"S. Gupta"+ex,date:D(-130),ref:"PSW EX-1001"}}),
    fillStudy({...base,id:"AQ-0002",scope:"family",famName:"IA gear blanks 20MnCr5"+ex,famDef:"Isothermal annealing on F-03; 20MnCr5 / 16MnCr5 forgings; section 30–60 mm; 2–5 kg; hardness 140–180 HB",parts:"EX-2001\nEX-2002",
      grade:"20MnCr5 / 16MnCr5",proc:"IA",furnaces:["F-03"],source:"new",started:D(-260),target:D(-160),vol:"8000",pcs:"24",wt:"3.5",push:"18",ans:yes("IA"),conc:"feasible",apprDate:D(-240),
      del:done({flow:"PFD-IA rev 0",pfmea:"PF-0002 rev 0",cp:"CP-0002 rev 0",lb:"LB-0002 rev 0",trial:"MT-0004 pass",ppap:"PSW EX-2001"}),rel:{by:"S. Gupta"+ex,date:D(-170),ref:"PSW EX-2001"}}),
    fillStudy({...base,id:"AQ-0003",part:"EX-3001",name:"Example flange",drawing:"DRG-3001",drawRev:"A",grade:"C45",proc:"NORM",furnaces:["F-04"],source:"new",started:D(-30),target:D(20),vol:"5000",pcs:"30",wt:"2.2",push:"10",
      ans:Object.fromEntries(FEAS.map(q=>[q.k,qApplies(q,"NORM")&&!["sc","post"].includes(q.k)?{a:"yes",note:""}:{a:"",note:""}])),status:"draft",appr:"",apprDate:"",conc:"",csr:{ref:"",by:"",date:"",notes:""}}),
    fillStudy({...base,id:"AQ-0004",part:"EX-4001",name:"Example pinion",drawing:"DRG-4001",drawRev:"0",grade:"EN19",proc:"HT",furnaces:["F-01"],source:"new",started:D(-40),target:D(-3),vol:"20000",pcs:"80",wt:"2.4",push:"12",
      ans:yes("HT",{quench:"",load:""}),conc:"changes",changes:"New fixture for 80 pcs per tray (net load 192 kg); agree the water quench with the customer (drawing says oil).",apprDate:D(-25),
      del:{flow:{st:"done",ref:"PFD-4001 rev 0",date:D(-20),note:""},pfmea:{st:"done",ref:"PF-0001 rev 2",date:D(-10),note:""}}}),
    fillStudy({...base,id:"AQ-0005",part:"EX-5001",name:"Example axle",drawing:"DRG-5001",drawRev:"B",grade:"EN8",proc:"HT",furnaces:["F-03"],source:"process",started:D(-60),
      ans:{...yes("HT"),furn:{a:"no",note:"F-03 has no quench tank"},quench:{a:"no",note:"No quench on F-03"}},conc:"not",changes:"Hardening needs F-01 or F-02; both full. Quote declined.",apprDate:D(-55),
      cancel:{date:D(-50),why:"Quote declined: not feasible on F-03"}})];
  L[3].ans.cap={a:"yes",note:"53 % of the hours"};
  await dbSet("config","settings",{...S.cfg,approvers:"R. Sharma"+ex+"\nS. Gupta"+ex});
  S.proc={no:"MWSPL-QP-APQP-01",rev:0,prep:"S. Gupta"+ex,appr:"R. Sharma"+ex,apprDate:D(-300),change:"",log:[{d:D(-300),t:"Rev 0 approved by R. Sharma (example)"}]};await saveProc();
  await batchPut("studies",L);toast("Starter set-up loaded");render();}
function armedDelete(b,fn){if(b.classList.contains("armed")){fn();return;}b.classList.add("armed");const t=b.textContent;b.textContent="Confirm";setTimeout(()=>{if(b.isConnected){b.classList.remove("armed");b.textContent=t;}},4000);}
async function download(name,text,type){
  if(S.dl){try{await S.dl.save({filename:name,data:new Blob([text],{type})});return;}catch(e){if(e&&e.code==="declined")return;}}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
const exportJson=()=>download(`mws-apqp-${today()}.json`,JSON.stringify({app:"mws-apqp-manager",v:1,saved:new Date().toISOString(),studies:S.studies,proc:S.proc,config:S.cfg},null,1),"application/json");
const csvQ=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
const csv=()=>download(`mws-apqp-studies-${today()}.csv`,"﻿"+[["Study","Scope","Part / family","Parts","Customer","Grade","Process","Furnaces","Rev","Status","Conclusion","Approved by","Approved","Target","Released","Stage"],
  ...S.studies.map(s=>{const e=effOf(s);return [s.id,s.scope,s.scope==="family"?s.famName:s.part,partsOf(s).join("; "),s.customer,s.grade,PROC[s.proc],s.furnaces.join(" "),s.rev,s.status,e&&e.conc?CONC[e.conc][1]:"",e?e.appr:"",e?e.apprDate:"",s.target,s.rel.date,stageOf(s)[1]];})].map(r=>r.map(csvQ).join(",")).join("\r\n"),"text/csv");
function readImport(f){f.text().then(t=>{let o;try{o=JSON.parse(t);}catch(e){toast("Not a JSON file");return;}
  if(!o||o.app!=="mws-apqp-manager"||!Array.isArray(o.studies)){toast("Not an export of this module");return;}
  const ok=o.studies.filter(x=>x&&ID_RE.test(String(x.id||"")));
  S.imp={studies:ok.map(fillStudy),proc:o.proc||null,config:o.config||null,msg:`${f.name}: ${plural(ok.length,"study","studies")}.`};render();});}
async function doImport(mode){if(!S.imp||!needDb())return;const I=S.imp;S.imp=null;
  if(mode==="replace")for(const x of S.studies)if(!I.studies.some(y=>y.id===x.id))await dbDel("studies",x.id);await batchPut("studies",I.studies);
  if(I.proc){const c={...I.proc};delete c.id;await dbSet("config","proc",c);}if(I.config){const c={...DEF,...I.config};delete c.id;await dbSet("config","settings",c);}
  toast("Imported ("+mode+")");render();}
async function clearAll(){if(($("#clrtxt")||{}).value!=="CLEAR ALL"){toast("Type CLEAR ALL to clear");return;}if(!needDb())return;
  for(const x of S.studies)await dbDel("studies",x.id);await dbDel("config","settings");await dbDel("config","proc");toast("All quality planning data cleared");}

/* 11. wiring */
onDoc("click",async e=>{
  const b=e.target.closest("button,tr.click,a[data-docref]");if(!b)return;const d=b.dataset;
  if(b.closest("#modal")||d.close!==undefined){
    if(d.close!==undefined){closeModal();return;}
    const m=S.modal;
    if(d.saveStudy!==undefined){if(await saveStudy()){redraw();msg("Saved.",1);}return;}
    if(d.approve!==undefined){const miss=feasMissing(fillStudy(m.ed));if(miss.length){msg("To approve: "+miss.join(", ")+".");return;}
      m.ed.status="approved";m.ed.apprDate=today();if(await saveStudy(`Feasibility rev ${m.ed.rev} approved by ${txt(m.ed.appr)}: ${CONC[m.ed.conc][1]}`)){redraw();msg(`Rev ${m.ed.rev} approved.`,1);}else{m.ed.status="draft";m.ed.apprDate="";}return;}
    if(d.revise!==undefined){const snap=clone(m.ed);delete snap.revs;delete snap.log;m.ed.revs=[...(m.ed.revs||[]),snap];m.ed.rev+=1;m.ed.status="draft";m.ed.appr="";m.ed.apprDate="";m.ed.change="";
      if(await saveStudy(`Rev ${m.ed.rev} started (rev ${m.ed.rev-1} stays in force)`)){redraw();msg(`Revision ${m.ed.rev} started.`,1);}return;}
    if(d.discard!==undefined){armedDelete(b,async()=>{const prev=m.ed.revs.pop();m.ed={...m.ed,...prev,revs:m.ed.revs,log:m.ed.log,del:m.ed.del,rel:m.ed.rel,chgDone:m.ed.chgDone,target:m.ed.target};if(await saveStudy("Draft revision discarded")){redraw();msg("Draft discarded.",1);}});return;}
    if(d.saveDel!==undefined){if(await saveStudy("Planning outputs updated")){redraw();msg("Saved.",1);}return;}
    if(d.release!==undefined){const miss=relMissing(fillStudy(m.ed));if(miss.length){msg("To release: "+miss.join(", ")+".");return;}if(m.ed.rel.date>today()){msg("The release date is in the future.");return;}
      if(await saveStudy(`Released for production by ${txt(m.ed.rel.by)}`)){redraw();msg("Released.",1);toast("Released for production");}return;}
    if(d.cancel!==undefined){openModal({kind:"cancel",id:m.ed.id,msg:""});return;}
    if(d.saveCancel!==undefined){const why=txt($("#cn-why").value);if(!why){msg("Enter why.");return;}const s=clone(byId(m.id));s.cancel={date:today(),why};if(await put("studies",fillStudy(s),"Planning cancelled: "+why)){toast("Planning cancelled");closeModal();}return;}
    if(d.delStudy!==undefined){armedDelete(b,async()=>{await dbDel("studies",m.ed.id);toast("Deleted");closeModal();});return;}
    if(d.fprint!==undefined){const s=fillStudy(m.ed);openModal({kind:"print",title:"Team feasibility commitment · "+s.id,html:()=>feasHtml(s)});return;}
    if(d.cprint!==undefined){const s=fillStudy(m.ed);openModal({kind:"print",title:"Quality planning checklist · "+s.id,html:()=>chkHtml(s)});return;}
    if(d.saveProc!==undefined){const no=txt($("#pa-no").value),prep=txt($("#pa-prep").value),by=txt($("#pa-by").value),dt=$("#pa-date").value,chg=$("#pa-chg")?txt($("#pa-chg").value):"";
      if(!no||!prep||!by||!isDate(dt)){msg("Enter the number, prepared by, approved by and the date.");return;}if(dt>today()){msg("Not in the future.");return;}if($("#pa-chg")&&!chg){msg("Enter the change or review note.");return;}
      if(!needDb())return;const rev=isDate(S.proc.apprDate)?(+S.proc.rev||0)+1:Math.max(0,+S.proc.rev||0);
      S.proc={...S.proc,no,rev,prep,appr:by,apprDate:dt,change:chg};if(await saveProc(`Rev ${rev} approved by ${by}${chg?": "+chg:""}`)){toast("Procedure approved");closeModal();render();}return;}
    if(d.print!==undefined){document.body.classList.add("pm");window.print();setTimeout(()=>document.body.classList.remove("pm"),500);return;}
    return;
  }
  if(d.open){studyModal(d.open);return;}
  if(d.newStudy!==undefined){if(needDb())studyModal(null);return;}
  if(d.newFamily!==undefined){if(needDb())studyModal(null,{scope:"family"});return;}
  if(d.newPart!==undefined){if(needDb()){const sp=(specMap()[pkey(d.newPart)]||[])[0];studyModal(null,{part:d.newPart,...(sp?{name:sp.name||"",proc:sp.proc||"HT",furnaces:sp.furnaces||[],push:sp.push||""}:{})});}return;}
  if(d.procappr!==undefined){if(needDb())openModal({kind:"procappr",prep:S.proc.prep||"",by:"",date:today(),chg:"",msg:""});return;}
  if(d.h12!==undefined){openModal({kind:"print",title:"HTSA 1.2 evidence",html:h12Html});return;}
  if(d.std!==undefined){stdOps();return;}
  if(d.saveCfg!==undefined){document.querySelectorAll("[data-cfg]").forEach(i=>{const k=i.dataset.cfg,t=(SETF.find(x=>x[0]===k)||[])[2];S.cfg[k]=t==="number"?(num(i.value)>0?num(i.value):DEF[k]):i.value;});saveCfg();return;}
  if(d.doc){S.docSel=d.doc;render();return;}
  if(d.docref){e.preventDefault();const p=DOCS.find(x=>x[0].endsWith(d.docref.replace(/^(\.\.\/)+/,"").replace(/^\.\//,"")));if(p){S.docSel=p[0];location.hash="#docs";render();}return;}
  if(d.export!==undefined){exportJson();return;}if(d.csv!==undefined){csv();return;}
  if(d.imp){if(d.imp==="cancel"){S.imp=null;render();}else doImport(d.imp);return;}
  if(d.clear!==undefined){armedDelete(b,clearAll);return;}
});
let RT=0;
const soon=()=>{clearTimeout(RT);RT=setTimeout(()=>{const a=document.activeElement,id=a&&(a.id||a.dataset.anote&&("an:"+a.dataset.anote));redraw();
  const n=id&&(id.startsWith("an:")?document.querySelector(`[data-anote="${id.slice(3)}"]`):document.getElementById(id));if(n){n.focus();try{n.setSelectionRange(n.value.length,n.value.length);}catch(x){}}},600);};
onDoc("input",e=>{const el=e.target;
  if(S.modal&&S.modal.ed){
    if(el.dataset.anote){S.modal.ed.ans[el.dataset.anote].note=el.value;return;}
    if(el.dataset.del){const [k,f]=el.dataset.del.split(".");S.modal.ed.del[k][f]=el.value;return;}
    if(el.dataset.p&&el.tagName!=="SELECT"){setp(S.modal.ed,el.dataset.p,el.value);if(/^(vol|pcs|wt|push|changes)$/.test(el.dataset.p))soon();return;}
  }
  if(el.dataset.filt==="q"){S.filt.q=el.value;clearTimeout(RT);RT=setTimeout(()=>{render();const i=$("[data-filt=q]");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},250);}
});
onDoc("change",e=>{const el=e.target;
  if(S.modal&&S.modal.ed){const E=S.modal.ed;
    if(el.dataset.ans){E.ans[el.dataset.ans].a=el.value;redraw();return;}
    if(el.dataset.fu){E.furnaces=el.checked?[...new Set([...E.furnaces,el.dataset.fu])].sort():E.furnaces.filter(f=>f!==el.dataset.fu);redraw();return;}
    if(el.dataset.del&&el.tagName==="SELECT"){const [k,f]=el.dataset.del.split(".");E.del[k][f]=el.value;if(k==="spec"&&el.value==="done"&&!E.del.spec.ref){const sm=specMap();E.del.spec.ref=partsOf(E).map(p=>(sm[pkey(p)]||[]).map(x=>x.id+" rev "+x.rev).join(", ")).filter(Boolean).join("; ");}redraw();return;}
    if(el.dataset.chg!==undefined){E.chgDone=el.checked;redraw();return;}
    if(el.dataset.p&&el.tagName==="SELECT"){setp(E,el.dataset.p,el.value);redraw();return;}
  }
  if(el.dataset.filt==="st"){S.filt.st=el.value;render();return;}
  if(el.id==="impfile"&&el.files[0]){readImport(el.files[0]);el.value="";}
});
onDoc("keydown",e=>{if(e.key==="Escape"&&S.modal)closeModal();});
onWin("hashchange",()=>{route();S.pending=false;render();window.scrollTo(0,0);});

/* 12. integration API */
MWS.apqp={closeModal,
  /* another module's data changed (specifications, organization): redraw when nothing is being edited */
  refresh:()=>safeRender(),
  /* the parts with an approved feasible study (for other modules) */
  feasible:()=>coverage().filter(c=>["approved","released"].includes(c.st)).map(c=>({part:c.part,study:c.best.id,released:c.st==="released"})),
  hasData:()=>S.studies.length>0,
  stats:()=>{const k=kp();return {db:S.dbState,...k,label:SCORE[k.score][1],cls:SCORE[k.score][0]};},
  summary:()=>{const k=kp();return `${k.covered} of ${plural(k.parts,"part")} with an approved feasibility study, ${k.drafts} in work, ${k.open} with planning open; HTSA 1.2 ${SCORE[k.score][1].toLowerCase()}.`;}};
window.__APQPM={S,assess12,coverage,feasMissing,relMissing,capCalc,autoHints,effOf,stageOf,approvers,partsOf};

/* 13. boot */
async function boot(){
  route();render();
  const [dl,user,db]=await Promise.all([useCap("downloads"),useCap("user"),useCap("db")]);
  S.dl=dl;
  if(user){try{const c=await user.can("data.write");S.canWrite=c!==false;}catch(e){}}
  if(db)startStore(sharedDb(db),"on");else startStore(localDb(),"local");
}
boot();
