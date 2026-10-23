/* Module ORG: heat treat organization and the designated heat treat person (CQI-9 HTSA 1.1). Runs inside the shell: ACTIVE, onDoc, onWin,
   MWS and `location` come from the wrapper (build.py). The rules are those of the CALOR page Organization_Personnel.html (HTSA 1.1 part). */

/* 1. collection prefix (shared store only) */
const NS=c=>S.db&&S.db.local?c:"org-"+c;

/* 2. constants */
const ID_RE=/^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const LKEY="mws-org-local-v1";
const EMP={full:"Full-time",part:"Part-time",contract:"Contract / consultant"};
const SITE={on:"On site",off:"Off site / other location"};
const DEF={plant:"Mass Wire and Steels Pvt. Ltd. · Bhiwadi",minYears:5,reviewDays:365};
const SETF=[["plant","Plant","text"],["minYears","HTSA 1.1 minimum heat treat experience (years; confirm against the controlled copy)","number"],["reviewDays","Review the organization chart and job descriptions every (days)","number"]];
const STRUCT={title:"title",reportsTo:"reporting line",holder:"holder",deputy:"deputy",ht:"heat treat position",fte:"full-time",site:"location",dedicated:"dedicated"};
const DOCS=[
  ["ORG/00_ORG_Master_List.md","Master list"],
  ["ORG/01_Procedure/MWSPL-QP-ORG-01_Heat_Treat_Organization_and_Qualification.md","MWSPL-QP-ORG-01 Heat treat organization"],
  ["ORG/02_Work_Instructions/MWSPL-WI-ORG-01_Appoint_and_Qualify_the_Heat_Treat_Person.md","MWSPL-WI-ORG-01 Appoint and qualify"],
  ["ORG/02_Work_Instructions/MWSPL-WI-ORG-02_Organization_Chart_and_Job_Descriptions.md","MWSPL-WI-ORG-02 Chart and job descriptions"],
  ["ORG/03_Formats/MWSPL-F-ORG-01_Job_Description.md","MWSPL-F-ORG-01 Job description"],
  ["ORG/03_Formats/MWSPL-F-ORG-02_Qualification_Record.md","MWSPL-F-ORG-02 Qualification record"],
  ["ORG/03_Formats/MWSPL-F-ORG-03_Organization_Chart_Approval.md","MWSPL-F-ORG-03 Organization chart approval"],
  ["ORG/04_Application/mwspl-org-module.md","Module description"]];

/* 3. helpers */
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{if(v===""||v==null)return null;const n=Number(String(v).replace(",","."));return isFinite(n)?n:null;};
const txt=v=>String(v??"").trim();
const clone=o=>JSON.parse(JSON.stringify(o??null));
const pad=n=>String(n).padStart(2,"0");
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>iso(new Date());
const thisMonth=()=>today().slice(0,7);
const isDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||""));
const isMonth=s=>/^\d{4}-\d{2}$/.test(String(s||""));
const mnum=s=>isMonth(s)?+s.slice(0,4)*12+(+s.slice(5,7)-1):NaN;
const addDays=(s,n)=>{const d=new Date(s+"T00:00:00");d.setDate(d.getDate()+n);return iso(d);};
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtD=s=>isDate(s)?`${s.slice(8,10)}-${MON[+s.slice(5,7)-1]}-${s.slice(0,4)}`:"—";
const fmtM=s=>isMonth(s)?`${MON[+s.slice(5,7)-1]} ${s.slice(0,4)}`:"now";
const yrs=y=>`${(Math.round(y*10)/10).toString()} yr`;
const getp=(o,p)=>p.split(".").reduce((a,k)=>a==null?a:a[k],o);
const setp=(o,p,v)=>{const k=p.split(".");let a=o;k.slice(0,-1).forEach(x=>{if(a[x]==null||typeof a[x]!=="object")a[x]={};a=a[x];});a[k.at(-1)]=v;};
const pill=(c,t)=>`<span class="pill ${c||""}">${esc(t)}</span>`;
const plural=(n,w,p)=>`${n} ${n===1?w:(p||w+"s")}`;
const maxNo=L=>Math.max(0,...L.map(x=>+(String(x.id).match(/(\d+)$/)||[0,0])[1]));

/* 4. state */
const S={view:"dash",db:null,dbState:"connecting",canWrite:true,dl:null,positions:[],people:[],cfg:{...DEF},chart:{rev:0,apprDate:"",appr:"",dirty:false,log:[]},
  docSel:DOCS[0][0],imp:null,modal:null,pending:false,unsub:[],q:{}};
const C=()=>S.cfg;
const MIN=()=>num(C().minYears)??5;

/* 5. domain logic (HTSA 1.1 rules of the CALOR HT organization page) */
const blankJd=()=>({rev:0,status:"draft",purpose:"",resp:"",auth:"",edu:"",knowledge:"",minYears:"",other:"",prep:"",appr:"",apprDate:"",change:"",revs:[]});
function fillPos(o){const p={id:"",title:"",dept:"",reportsTo:"",holder:"",deputy:"",ht:false,fte:"full",site:"on",dedicated:false,specAuth:false,log:[],...(o||{})};
  p.jd={...blankJd(),...((o&&o.jd)||{})};if(!Array.isArray(p.jd.revs))p.jd.revs=[];if(!Array.isArray(p.log))p.log=[];return p;}
function fillPer(o){const p={id:"",name:"",empNo:"",employment:"full",site:"on",joined:"",htHere:true,edu:[],exp:[],trn:[],notes:"",log:[],...(o||{})};
  ["edu","exp","trn","log"].forEach(k=>{if(!Array.isArray(p[k]))p[k]=[];});return p;}
const posById=id=>S.positions.find(p=>p.id===id)||null;
const perById=id=>S.people.find(p=>p.id===id)||null;
const pname=id=>{const p=perById(id);return p?p.name:"";};
const htPos=()=>S.positions.filter(p=>p.ht);
const heldBy=pid=>S.positions.filter(p=>p.holder===pid);
const roots=()=>S.positions.filter(p=>!p.reportsTo||!posById(p.reportsTo));
const kids=id=>S.positions.filter(p=>p.reportsTo===id);
function loops(){const bad=new Set();S.positions.forEach(p=>{let x=p,seen=new Set();while(x&&x.reportsTo){if(seen.has(x.id)){bad.add(p.id);break;}seen.add(x.id);x=posById(x.reportsTo);}});return bad;}
const chartDue=()=>isDate(S.chart.apprDate)?addDays(S.chart.apprDate,+C().reviewDays||365):null;
/* HTSA 1.6: who may approve process specifications (used by the Specifications module) */
function authorized(){const L=[],seen=new Set();
  S.positions.filter(p=>p.ht||p.specAuth).sort((a,b)=>b.ht-a.ht).forEach(p=>[[p.holder,p.title],[p.deputy,"deputy, "+p.title]].forEach(([id,pos])=>{const per=perById(id);if(per&&!seen.has(per.id)){seen.add(per.id);L.push({name:per.name,position:pos});}}));
  return L;}
/* qualification: heat treat experience (dated entries + service here since joining, overlaps once) and metallurgical education */
function mergedMonths(entries){
  const iv=entries.map(e=>[mnum(e.from),isMonth(e.to)?mnum(e.to):mnum(thisMonth())]).filter(([a,b])=>isFinite(a)&&isFinite(b)&&b>=a).map(([a,b])=>[a,b+1]).sort((x,y)=>x[0]-y[0]);
  let tot=0,cur=null;iv.forEach(([a,b])=>{if(!cur){cur=[a,b];return;}if(a<=cur[1])cur[1]=Math.max(cur[1],b);else{tot+=cur[1]-cur[0];cur=[a,b];}});if(cur)tot+=cur[1]-cur[0];return tot;}
const hereEntry=p=>p.htHere!==false&&isDate(p.joined)&&p.joined<=today()?{org:"this organization",from:p.joined.slice(0,7),to:"",ht:true}:null;
function qual(p,minY){
  const here=hereEntry(p),ht=mergedMonths([...p.exp.filter(e=>e.ht),...(here?[here]:[])])/12,hereY=here?mergedMonths([here])/12:0;
  const edu=p.edu.filter(e=>e.met).reduce((a,e)=>a+(num(e.years)||0),0),min=minY??MIN(),p1=ht>=min,p2=ht>0&&edu>0&&ht+edu>=min;
  const bad=p.exp.filter(e=>isMonth(e.from)&&isMonth(e.to)&&e.to<e.from).length;
  return {ht,edu,hereY,qualified:p1||p2,bad,
    path:p1?`${yrs(ht)} heat treat experience (minimum ${min})`:p2?`${yrs(edu)} metallurgical education + ${yrs(ht)} heat treat experience = ${yrs(edu+ht)} (minimum ${min})`:"",
    short:p1||p2?"":`${yrs(ht)} heat treat experience${edu?` + ${yrs(edu)} metallurgical education`:""}: below the minimum of ${min} years`};}
/* job descriptions: the revision in force and the approval gate */
const jdEff=p=>p.jd.status==="approved"?p.jd:(p.jd.revs||[]).filter(r=>r.status==="approved").at(-1)||null;
function jdMissing(p){const j=p.jd,m=[];
  if(!txt(j.purpose))m.push("purpose of the position");if(!txt(j.resp))m.push("responsibilities");if(!txt(j.edu))m.push("required education");
  if(p.ht&&!txt(j.knowledge))m.push("metallurgical and heat treat knowledge");
  if(num(j.minYears)==null)m.push("minimum years of experience");else if(p.ht&&num(j.minYears)<MIN())m.push(`minimum experience of at least ${MIN()} years (HTSA 1.1)`);
  if(!txt(j.prep))m.push("prepared by");if(!txt(j.appr))m.push("approved by");if(j.rev>0&&!txt(j.change))m.push("reason for the change");return m;}
const jdPill=p=>{const e=jdEff(p);return p.jd.status==="draft"&&e?pill("warn",`Rev ${p.jd.rev} draft · rev ${e.rev} in force`):p.jd.status==="approved"?pill("ok","Approved rev "+p.jd.rev):pill("warn","Draft");};
const jdDue=p=>{const e=jdEff(p);return e&&isDate(e.apprDate)?addDays(e.apprDate,+C().reviewDays||365):null;};

/* HTSA 1.1 */
const SCORE={s:["ok","Satisfactory","acc"],ns:["warn","Not satisfactory","cond"],nia:["bad","Needs immediate action","rej"]};
const LV={ok:["ok","Met"],warn:["warn","Attention"],crit:["bad","Not met"],info:["acc","Note"]};
function assess(){
  const I=[],add=(lvl,req,ev,act)=>I.push({lvl,req,ev,act}),H=htPos(),min=MIN();
  if(!H.length)add("crit","A heat treat position is defined","No position is marked as the heat treat position.","Mark the heat treat position (e.g. HT Manager) on the position record.");
  if(H.length>1)add("info","One designated heat treat position",`${H.length} positions are marked: ${H.map(p=>p.title).join(", ")}.`,"");
  const p=H[0]||null,per=p?perById(p.holder):null,q=per?qual(per):null;
  if(p){
    if(!per)add("crit","The heat treat position is filled",`${p.title} is vacant.`,"Appoint a qualified heat treat person.");
    else add("ok","The heat treat position is filled",`${p.title}: ${per.name}${per.empNo?" ("+per.empNo+")":""}.`,"");
    const other=per?heldBy(per.id).filter(x=>x.id!==p.id):[];
    add(p.dedicated&&!other.length?"ok":"crit","Dedicated to heat treatment",!p.dedicated?`${p.title}: heat treatment is not marked as the main duty of the position.`:other.length?`${per.name} also holds ${other.map(x=>x.title).join(", ")}.`:`Heat treatment is the main duty of ${p.title}.`,
      !p.dedicated?"Make heat treatment the main duty of the position (job description).":other.length?"Free the heat treat person from the other position(s).":"");
    if(per){
      const ft=p.fte==="full"&&per.employment==="full";
      add(ft?"ok":"crit","Full-time",ft?`Position full-time; ${per.name} employed full-time.`:`Position ${p.fte==="full"?"full-time":"part-time"}; ${per.name}: ${EMP[per.employment]||"employment not recorded"}.`,ft?"":"A full-time heat treat person is required.");
      const os=p.site==="on"&&per.site==="on";
      add(os?"ok":"crit","On site",os?`Position and ${per.name} on site (${C().plant}).`:`Position: ${SITE[p.site]||"?"}; ${per.name}: ${SITE[per.site]||"?"}.`,os?"":"The heat treat person must work on site.");
    }
    const inChart=!!(p.reportsTo&&posById(p.reportsTo))||(roots().length===1&&roots()[0].id===p.id),lp=loops().has(p.id),due=chartDue();
    if(!inChart||lp)add("crit","Shown in the organization chart",lp?"The reporting line of the position loops back on itself.":`${p.title} has no “reports to” position, so it hangs outside the chart.`,"Set the reporting line of the position.");
    else if(!isDate(S.chart.apprDate))add("crit","Shown in the organization chart",`${p.title} is in the chart, but the chart is not approved.`,"Approve the organization chart.");
    else if(S.chart.dirty)add("warn","Shown in the organization chart",`${p.title} is in the chart (rev ${S.chart.rev}, approved ${fmtD(S.chart.apprDate)}), but positions changed after the approval.`,"Approve the changed chart (new revision).");
    else if(due&&due<today())add("warn","Shown in the organization chart",`Chart rev ${S.chart.rev} approved ${fmtD(S.chart.apprDate)}: periodic review overdue since ${fmtD(due)}.`,"Review and re-approve the chart.");
    else add("ok","Shown in the organization chart",`${p.title} reports to ${posById(p.reportsTo)?posById(p.reportsTo).title:"—"}; chart rev ${S.chart.rev} approved ${fmtD(S.chart.apprDate)} by ${S.chart.appr}.`,"");
    const e=jdEff(p);
    if(!e)add("crit","Job description with the qualifications",`No approved job description for ${p.title}${p.jd.status==="draft"?" (draft rev "+p.jd.rev+")":""}.`,"Complete and approve the job description.");
    else{const gaps=[!txt(e.edu)&&"education",!txt(e.knowledge)&&"metallurgical and heat treat knowledge",(num(e.minYears)==null||num(e.minYears)<min)&&`minimum experience ≥ ${min} years`].filter(Boolean);
      add(gaps.length?"crit":"ok","Job description with the qualifications",gaps.length?`Job description rev ${e.rev} does not state: ${gaps.join(", ")}.`:`Job description rev ${e.rev} (approved ${fmtD(e.apprDate)}): education “${e.edu}”, knowledge stated, minimum ${e.minYears} years.`,gaps.length?"Revise the job description.":"");}
    if(per){
      if(q.qualified)add("ok",`Qualification of the heat treat person (≥ ${min} years)`,`${per.name}: ${q.path}.`,"");
      else add("crit",`Qualification of the heat treat person (≥ ${min} years)`,`${per.name}: ${q.short}.`,"Record the person's heat treat experience and metallurgical education, or appoint a person who meets the minimum.");
      if(q.bad)add("warn","Experience entries are consistent",`${plural(q.bad,"experience entry","experience entries")} ends before it starts.`,"Correct the dates.");
    }
    const dep=perById(p.deputy);
    if(!dep)add("info","Cover for absences","No deputy named for the heat treat position.","Name a deputy so the expertise is available during absences.");
    else{const dq=qual(dep);add(dq.qualified?"ok":"info","Cover for absences",`Deputy ${dep.name}: ${dq.qualified?dq.path:dq.short}.`,"");}
  }
  const crit=I.filter(i=>i.lvl==="crit").length,vacant=!H.length||!per;
  return {I,score:vacant||(q&&!q.qualified)?"nia":crit?"ns":"s",p,per,q,crit};
}

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
async function saveChart(t){S.chart.log=S.chart.log||[];if(t)S.chart.log.push({d:today(),t});try{await dbSet("config","chart",S.chart);return true;}catch(e){toast("Not saved: "+errMsg(e));return false;}}
async function markChart(t){if(isDate(S.chart.apprDate)&&!S.chart.dirty){S.chart.dirty=true;await saveChart("Changed after approval: "+t);}}
async function saveCfg(){if(!needDb())return;try{await dbSet("config","settings",S.cfg);toast("Settings saved");}catch(e){toast("Not saved: "+errMsg(e));}}
async function batchPut(c,L){for(let i=0;i<L.length;i+=8)await Promise.all(L.slice(i,i+8).map(o=>dbSet(c,o.id,o)));}
function startStore(store,state){
  S.unsub.forEach(u=>{try{u();}catch(e){}});S.db=store;S.dbState=state;
  S.unsub=[store.sub("positions",L=>{S.positions=L.map(fillPos).sort((a,b)=>a.id<b.id?-1:1);safeRender();}),
    store.sub("people",L=>{S.people=L.map(fillPer).sort((a,b)=>a.name.localeCompare(b.name));safeRender();}),
    store.sub("config",L=>{const c=L.find(x=>x.id==="settings"),h=L.find(x=>x.id==="chart");S.cfg={...DEF,...(c||{})};delete S.cfg.id;
      S.chart={rev:0,apprDate:"",appr:"",dirty:false,log:[],...(h||{})};delete S.chart.id;safeRender();})];
  render();
}
function safeRender(){
  const a=document.activeElement;if(S.modal||(a&&$("#main")&&$("#main").contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=true;return;}
  render();
}
onDoc("focusout",()=>setTimeout(()=>{if(S.pending&&!S.modal){const a=document.activeElement;if(!(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=false;render();}}},0));

/* 7. navigation */
const NAV=[["",[["dash","Dashboard"]]],["P",[["chart","Organization chart"],["pos","Positions & job descriptions"],["people","People & qualification"]]],
  ["C",[["review","HTSA 1.1"]]],["A",[["changes","Changes"]]],["",[["settings","Settings"],["rules","Rules"],["docs","Documentation"],["data","Data"]]]];
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
const chartPill=()=>{const c=S.chart,due=chartDue();return !isDate(c.apprDate)?pill("bad","Chart not approved"):c.dirty?pill("warn",`Rev ${c.rev} · changed since approval`):due&&due<today()?pill("warn",`Rev ${c.rev} · review overdue`):pill("ok",`Rev ${c.rev} approved ${fmtD(c.apprDate)}`);};
function personBox(per,label,empty){
  if(!per)return `<div class="panel"><span class="small muted">${esc(label)}</span><h3>${esc(empty)}</h3></div>`;
  const q=qual(per);
  return `<div class="panel"><span class="small muted">${esc(label)}</span><h3><button class="link" data-open-p="${esc(per.id)}">${esc(per.name)}</button></h3>
    <p class="small">${esc(heldBy(per.id).map(x=>x.title).join(", ")||"no position")} · ${esc(EMP[per.employment]||"")} · ${esc(SITE[per.site]||"")}</p>
    <p>${q.qualified?pill("ok","HTSA 1.1 minimum met"):pill("bad","Below the HTSA 1.1 minimum")} <span class="small muted">${yrs(q.ht)} heat treat experience${q.hereY?` (incl. ${yrs(q.hereY)} here)`:""} · ${yrs(q.edu)} metallurgical education</span></p></div>`;}
function vDash(){
  if(!S.positions.length&&!S.people.length)return `<div class="empty"><h2>No heat treat organization recorded yet</h2><p>Add the positions and people, or load the example set-up to see how the module works.</p><div class="row" style="justify-content:center"><button class="pri w" data-new-pos>Add a position</button><button class="w" data-std>Load starter set-up</button></div></div>`;
  const A=assess(),sc=SCORE[A.score],dep=A.p?perById(A.p.deputy):null;
  const jdOpen=S.positions.filter(p=>p.jd.status==="draft").length,jdOver=S.positions.filter(p=>jdDue(p)&&jdDue(p)<today()).length;
  return `<div class="tiles">
    <a class="tile ${sc[0]}" href="#review"><span class="k">HTSA 1.1</span><span class="v" style="font-size:20px;padding:6px 0">${sc[1]}</span><span class="small muted">${plural(A.crit,"item")} not met</span></a>
    <a class="tile ${A.per?(A.q.qualified?"ok":"bad"):"bad"}" href="#review"><span class="k">Heat treat person</span><span class="v" style="font-size:20px;padding:6px 0">${esc(A.per?A.per.name:"Vacant")}</span><span class="small muted">${A.per?yrs(A.q.ht)+" HT experience":A.p?esc(A.p.title):"no heat treat position"}</span></a>
    <a class="tile ${dep?"ok":"warn"}" href="#chart"><span class="k">Deputy</span><span class="v" style="font-size:20px;padding:6px 0">${esc(dep?dep.name:"None")}</span><span class="small muted">covers absences</span></a>
    <a class="tile ${!isDate(S.chart.apprDate)?"bad":S.chart.dirty?"warn":"ok"}" href="#chart"><span class="k">Organization chart</span><span class="v">${S.chart.rev||"—"}</span><span class="small muted">${isDate(S.chart.apprDate)?(S.chart.dirty?"changed since approval":"approved "+fmtD(S.chart.apprDate)):"not approved"}</span></a>
    <a class="tile ${jdOpen||jdOver?"warn":"ok"}" href="#pos"><span class="k">Job descriptions</span><span class="v">${S.positions.length-jdOpen}/${S.positions.length}</span><span class="small muted">approved · ${jdOver} review overdue</span></a></div>
  <div class="pdca"><div><span class="ph">P</span><br>Positions with their reporting lines; the heat treat position; job descriptions with the qualifications.</div><div><span class="ph">D</span><br>Appoint the people; record their education and heat treat experience; approve the chart and the job descriptions.</div><div><span class="ph">C</span><br>HTSA 1.1: dedicated, qualified, full-time, on site, in the chart, approved job description.</div><div><span class="ph">A</span><br>Re-approve the chart after a change; revise job descriptions; qualify or appoint.</div></div>
  <div class="grid2">${personBox(A.per,"Heat treat person (HTSA 1.1)",A.p?A.p.title+": vacant":"No heat treat position marked")}${A.p?personBox(dep,"Deputy","No deputy named"):""}</div>
  <div class="panel"><div class="row between"><h3>Needs attention</h3><div class="row"><button class="pri w" data-new-pos>Add a position</button><button class="w" data-new-per>Add a person</button></div></div>
    ${A.I.filter(i=>i.lvl==="crit"||i.lvl==="warn").length?`<ul class="issues">${A.I.filter(i=>i.lvl==="crit"||i.lvl==="warn").map(i=>`<li><a href="#review">${esc(i.req)}</a>: ${esc(i.ev)} ${pill(i.lvl==="crit"?"bad":"warn",i.lvl==="crit"?"Action":"Attention")}</li>`).join("")}</ul>`:`<p class="muted">Nothing open.</p>`}</div>`;
}
function vChart(){
  const bad=loops(),c=S.chart,due=chartDue();
  const node=p=>{const h=perById(p.holder),d=perById(p.deputy);return `<button class="node ${p.ht?"ht":""} ${h?"":"vac"}" data-open-pos="${esc(p.id)}"><b>${esc(p.title||"(no title)")}</b><span>${h?esc(h.name):"vacant"}</span>${d?`<span class="small muted">deputy ${esc(d.name)}</span>`:""}${p.ht?`<span class="pill acc">Heat treat person</span>`:""}</button>`;};
  const draw=(p,dep)=>dep>30?"":`<li>${node(p)}${kids(p.id).length?`<ul>${kids(p.id).map(x=>draw(x,dep+1)).join("")}</ul>`:""}</li>`;
  return `<div class="panel"><div class="row between"><h3>Organization chart</h3><div class="row">${chartPill()}<button class="pri w" data-chartappr>${isDate(c.apprDate)?"Approve as a new revision":"Approve the chart"}</button><button data-pack>Evidence (print)</button></div></div>
    <p class="small muted">${isDate(c.apprDate)?`Revision ${c.rev}, approved ${fmtD(c.apprDate)} by ${esc(c.appr)}${due?` · next review ${fmtD(due)}`:""}.`:"Not approved yet."} Built from the positions' reporting lines; the heat treat position is outlined, vacant positions are dashed. Click a position to open it.</p>
    ${S.positions.length?`<div class="tw"><div class="orgtree"><ul>${roots().map(p=>draw(p,0)).join("")}</ul></div></div>${bad.size?`<p class="banner bad">Reporting lines that loop back: ${esc([...bad].map(id=>posById(id).title).join(", "))}.</p>`:""}`:`<div class="empty"><p>No positions yet.</p></div>`}</div>`;
}
function vPos(){
  const L=S.positions.slice().sort((a,b)=>(b.ht-a.ht)||a.title.localeCompare(b.title));
  return `<div class="row between"><h2>Positions and job descriptions</h2><button class="pri w" data-new-pos>Add a position</button></div>
  ${L.length?`<div class="tw"><table><thead><tr><th>Position</th><th>Reports to</th><th>Holder</th><th>Deputy</th><th>Employment</th><th>Job description</th></tr></thead><tbody>${L.map(p=>{const m=p.jd.status==="draft"?jdMissing(p):[],e=jdEff(p);
    return `<tr class="click" data-open-pos="${esc(p.id)}"><td><b>${esc(p.title)}</b> ${p.ht?pill("acc","Heat treat position"):""}${p.ht||p.specAuth?" "+pill("ok","Approves specifications"):""}<br><span class="small muted">${esc(p.dept)}${p.dedicated?(p.dept?" · ":"")+"dedicated":""}</span></td>
      <td>${esc(posById(p.reportsTo)?posById(p.reportsTo).title:"—")}</td><td>${esc(pname(p.holder)||"vacant")}</td><td>${esc(pname(p.deputy)||"—")}</td><td>${p.fte==="full"?"Full-time":"Part-time"} · ${esc(SITE[p.site]||"")}</td>
      <td>${jdPill(p)}${e?`<br><span class="small muted">rev ${e.rev} · ${fmtD(e.apprDate)}${jdDue(p)&&jdDue(p)<today()?" · review overdue":""}</span>`:""}${m.length?`<br><span class="small muted">Missing: ${esc(m.slice(0,3).join(", "))}${m.length>3?" …":""}</span>`:""}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No positions yet.</p></div>`}`;
}
function vPeople(){
  return `<div class="row between"><h2>People and qualification</h2><button class="pri w" data-new-per>Add a person</button></div>
  <p class="muted">Heat treat experience = dated heat treat entries plus the service here since joining (when that is heat treat work), overlaps counted once. HTSA 1.1 minimum: ${MIN()} years of heat treat experience, or heat treat experience and metallurgical education together.</p>
  ${S.people.length?`<div class="tw"><table><thead><tr><th>Person</th><th>Position(s)</th><th>Employment</th><th class="n">Heat treat experience</th><th class="n">Metallurgical education</th><th>HTSA 1.1 minimum</th></tr></thead><tbody>${S.people.map(p=>{const q=qual(p),dp=S.positions.filter(x=>x.deputy===p.id);
    return `<tr class="click" data-open-p="${esc(p.id)}"><td><b>${esc(p.name)}</b><br><span class="small muted">${esc(p.empNo)}</span></td><td>${esc(heldBy(p.id).map(x=>x.title).join(", ")||"—")}${dp.length?`<br><span class="small muted">deputy: ${esc(dp.map(x=>x.title).join(", "))}</span>`:""}</td>
      <td>${esc(EMP[p.employment]||"")} · ${esc(SITE[p.site]||"")}</td><td class="n">${yrs(q.ht)}</td><td class="n">${yrs(q.edu)}</td><td>${q.qualified?pill("ok","Met"):pill("","Not met")}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No people yet.</p></div>`}`;
}
function vReview(){
  const A=assess(),sc=SCORE[A.score];
  return `<div class="panel"><div class="row between"><h3>HTSA 1.1 · Is there a dedicated and qualified heat treat person on-site?</h3><button data-pack>Evidence (print)</button></div>
    <p><span class="verdict ${sc[2]}">${sc[1]}</span> <span class="muted">${plural(A.I.filter(i=>i.lvl==="ok").length,"item")} met · ${plural(A.crit,"item")} not met · ${plural(A.I.filter(i=>i.lvl==="warn").length,"item")} needing attention</span></p>
    <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th><th>Action</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${pill(...LV[i.lvl])}</td><td>${esc(i.act)}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted" style="margin-top:8px">The question asks for a dedicated, qualified, full-time heat treat person on site, shown in the organization chart, with a job description stating the qualifications (metallurgical and heat treat knowledge) and evidence of at least ${MIN()} years of heat treat experience or a combination of formal metallurgical education and heat treat experience.</p></div>
  <div class="panel"><h3>Who may approve process specifications (HTSA 1.6)</h3><p class="small muted">Holder and deputy of the heat treat position and of positions marked "authorized to approve process specifications". The Specifications module uses this list for its approval gate.</p>
    ${authorized().length?`<ul class="issues">${authorized().map(a=>`<li>${esc(a.name)} <span class="muted">(${esc(a.position)})</span></li>`).join("")}</ul>`:`<p class="muted">Nobody yet.</p>`}</div>`;
}
function vChanges(){
  const R=S.positions.flatMap(p=>[...(p.jd.revs||[]),p.jd].filter(r=>r&&r.status==="approved"&&isDate(r.apprDate)).map(r=>({p,r}))).sort((a,b)=>a.r.apprDate<b.r.apprDate?1:-1);
  return `<div class="panel"><h3>Organization chart</h3>${chartPill()}${S.chart.log&&S.chart.log.length?`<ul class="small">${S.chart.log.slice().reverse().map(l=>`<li>${fmtD(l.d)} · ${esc(l.t)}</li>`).join("")}</ul>`:`<p class="muted">No history yet.</p>`}</div>
  <div class="panel"><h3>Job description revisions</h3>${R.length?`<div class="tw"><table><thead><tr><th>Position</th><th>Rev</th><th>Approved</th><th>By</th><th>Reason for the change</th></tr></thead><tbody>${R.map(({p,r})=>`<tr class="click" data-open-pos="${esc(p.id)}"><td>${esc(p.title)}</td><td>${r.rev}</td><td>${fmtD(r.apprDate)}</td><td>${esc(r.appr)}</td><td>${esc(r.change||"first issue")}</td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">None approved yet.</p>`}</div>`;
}
function vSettings(){const c=C();
  return `<div class="panel"><h3>Settings</h3><div class="fields">${SETF.map(([k,l,t])=>`<label class="f"><span>${esc(l)}</span><input data-cfg="${k}" type="${t}" value="${esc(c[k])}"></label>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="pri w" data-save-cfg>Save settings</button><span class="small muted">Changes are kept only after Save.</span></div></div>`;}
function vRules(){
  const R=[["Heat treat position","One position is marked as the heat treat position (a second one is refused). Its holder is the heat treat person of HTSA 1.1."],
    ["Dedicated, full-time, on site","The position is marked dedicated (heat treatment is the main duty), the holder holds no other position, position and person are full-time and on site."],
    ["Organization chart","Built from the reporting lines (a line that loops back is refused). Approved with a revision number; a change of title, reporting line, holder, deputy, heat treat flag, full-time, location or dedicated after the approval, or a position added or deleted, marks it changed until re-approved. Review every "+C().reviewDays+" days."],
    ["Job description","Approval gate: purpose, responsibilities, required education, minimum years (for the heat treat position: metallurgical and heat treat knowledge and at least "+MIN()+" years), prepared and approved by, reason for a change after rev 0. Approved = locked; a new revision keeps the approved one in force until it is approved."],
    ["Qualification","Heat treat experience = dated entries marked heat treat work plus the service here since joining (when ticked), overlaps once, an open entry to this month. Metallurgical education = the years of education entries marked metallurgical. Met when experience ≥ "+MIN()+" years, or experience and education together ≥ "+MIN()+" with both above zero. Certificate / letter references are optional."],
    ["HTSA 1.1 score","Needs immediate action: no heat treat position, vacant, or the holder below the minimum. Not satisfactory: any other item not met. Satisfactory: otherwise. A deputy is a note (cover for absences), not a 1.1 requirement."]];
  return `<h2>Rules of this module</h2><div class="tw"><table><tbody>${R.map(([a,b])=>`<tr><td style="width:200px"><b>${a}</b></td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>`;
}
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
  fetch("docs/"+p).then(r=>r.ok?r.text():Promise.reject()).then(x=>{if($("#docview")&&S.docSel===p)$("#docview").innerHTML=md(x);})
    .catch(()=>{if($("#docview"))$("#docview").innerHTML=`<p class="banner warn">This document is not embedded in this build and could not be loaded from docs/${esc(p)}.</p>`;});
}
const calorOrg=()=>{try{const o=JSON.parse(localStorage.getItem("org-reg")||"null");return o&&Array.isArray(o.positions)&&Array.isArray(o.people)?o:null;}catch(e){return null;}};
function vData(){
  const co=calorOrg(),n=S.positions.length+S.people.length;
  return `<h2>Data</h2><div class="grid2">
  <div class="panel"><h3>Back up and restore</h3><p class="small muted">${plural(S.positions.length,"position")} · ${plural(S.people.length,"person","people")} · storage: ${S.dbState==="on"?"shared record store":"this browser"}.</p>
    <div class="row"><button class="pri" data-export>Export JSON</button><button data-csv>People CSV</button></div>
    <div class="row w" style="margin-top:10px"><label class="f"><span>Import a JSON export</span><input type="file" id="impfile" accept=".json,application/json"></label></div>
    ${S.imp?`<div class="banner" style="margin-top:8px">${esc(S.imp.msg)}<div class="row" style="margin-top:6px"><button class="pri" data-imp="merge">Merge (add and update)</button><button class="danger" data-imp="replace">Replace everything</button><button data-imp="cancel">Cancel</button></div></div>`:""}</div>
  <div class="panel"><h3>From the CALOR HT organization page</h3><p class="small muted">${co?`CALOR (this browser) holds ${plural(co.positions.length,"position")} and ${plural(co.people.length,"person","people")}. Importing copies them here with their numbers, job descriptions, qualification entries and the chart approval; records with the same number are updated.`:"No CALOR HT organization in this browser."}</p>
    <button class="w" data-calor ${co?"":"disabled"}>Import from CALOR</button></div>
  <div class="panel"><h3>Starter set-up</h3><p class="small muted">Director, Quality Manager, HT Manager (the heat treat person, with a qualified deputy), HT Engineer, Production Manager, Maintenance Head and Shift supervisor, approved job descriptions and chart; all marked "(example)".</p><button class="w" data-std ${n?"disabled":""}>Load starter set-up</button>${n?`<p class="small muted">Only on an empty module.</p>`:""}</div>
  <div class="panel"><h3>Clear all</h3><p class="small muted">Deletes every position, person, the chart approval and the settings of this module. Type <b>CLEAR ALL</b> to enable.</p>
    <div class="row w"><input id="clrtxt" placeholder="CLEAR ALL" style="max-width:180px"><button class="danger" data-clear>Clear all</button></div></div></div>`;
}
const VIEWS={dash:vDash,chart:vChart,pos:vPos,people:vPeople,review:vReview,changes:vChanges,settings:vSettings,rules:vRules,docs:vDocs,data:vData};
const AFTER={docs:showDoc};

/* 9. modal record sheets */
function mf(path,label,o={}){
  const ed=S.modal.ed,v=getp(ed,path),id="m-"+path.replace(/\./g,"-"),dis=o.dis?"disabled":"";
  let ctl;
  if(o.opts)ctl=`<select id="${id}" data-p="${path}" ${dis}>${o.blank?`<option value="">—</option>`:""}${o.opts.map(([k,t])=>`<option value="${esc(k)}" ${String(v)===String(k)?"selected":""}>${esc(t)}</option>`).join("")}</select>`;
  else if(o.area)ctl=`<textarea id="${id}" data-p="${path}" rows="${o.area}" ${dis}>${esc(v)}</textarea>`;
  else ctl=`<input id="${id}" data-p="${path}" ${o.type?`type="${o.type}"`:""} value="${esc(v)}" ${o.ph?`placeholder="${esc(o.ph)}"`:""} ${dis}>`;
  return `<label class="f ${o.req?"req":""} ${o.wide?"wide":""}" for="${id}"><span>${esc(label)}</span>${ctl}${o.hint?`<span class="small muted">${esc(o.hint)}</span>`:""}</label>`;
}
const ck=(path,text,dis)=>`<label class="chk wide"><input type="checkbox" data-pc="${path}" ${getp(S.modal.ed,path)?"checked":""} ${dis?"disabled":""}> ${esc(text)}</label>`;
function openModal(m){S.modal=m;$("#modal").hidden=false;redraw();}
function closeModal(){S.modal=null;const el=$("#modal");if(el){el.hidden=true;el.innerHTML="";}document.body.classList.remove("pm");if(S.pending){S.pending=false;render();}}
function redraw(){const el=$("#modal");if(!S.modal||!el)return;const st=el.scrollTop;el.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${(DRAW[S.modal.kind])()}</div>`;el.scrollTop=st;}
const sheet=(title,body,foot)=>`<div class="row between"><h2>${title}</h2><button data-close aria-label="Close">✕</button></div>${body}<div class="sticky-foot"><span class="msg" id="mmsg">${S.modal.msg||""}</span>${foot}</div>`;
const msg=(t,ok)=>{if(!S.modal)return;S.modal.msg=t?`<span style="color:var(--${ok?"ok":"bad"})">${esc(t)}</span>`:"";const el=$("#mmsg");if(el)el.innerHTML=S.modal.msg;};
function posModal(id){const p=posById(id);openModal({kind:"pos",ed:p?clone(p):fillPos({}),msg:""});}
function perModal(id){const p=perById(id);openModal({kind:"per",ed:p?clone(p):fillPer({}),msg:""});}
function DRAW_POS(){
  const E=S.modal.ed,known=posById(E.id),lock=E.jd.status!=="draft",m=jdMissing(E),eff=known?jdEff(known):null;
  const others=S.positions.filter(p=>p.id!==E.id).map(p=>[p.id,p.title]),people=S.people.map(p=>[p.id,p.name]);
  const body=`<p class="muted">${E.ht?pill("acc","Heat treat position")+" ":""}${known?jdPill(known):pill("warn","New")}</p>
  <fieldset><legend>Position (place in the organization chart)</legend><div class="fields">${mf("title","Position title",{req:1})}${mf("dept","Department")}${mf("reportsTo","Reports to",{opts:others,blank:1})}
    ${mf("holder","Holder",{opts:people,blank:1,hint:people.length?"":"Add the person first."})}${mf("deputy","Deputy (covers absences)",{opts:people,blank:1})}
    ${mf("fte","Position is",{opts:[["full","Full-time"],["part","Part-time"]]})}${mf("site","Location",{opts:Object.entries(SITE)})}
    ${ck("ht","This is the heat treat position (HTSA 1.1): the dedicated and qualified heat treat person on site")}${ck("dedicated","Heat treatment is the main duty of this position (dedicated)")}
    ${ck("specAuth","Authorized to establish and approve process specifications (HTSA 1.6; the heat treat position always is; holder and deputy)")}</div></fieldset>
  <fieldset><legend>Job description (MWSPL-F-ORG-01) · ${E.jd.rev>0?"revision "+E.jd.rev:"controlled document"} · ${lock?"approved, locked":"draft"}</legend><div class="fields">
    ${mf("jd.purpose","Purpose of the position",{area:2,wide:1,req:1,dis:lock})}${mf("jd.resp","Responsibilities",{area:3,wide:1,req:1,dis:lock})}${mf("jd.auth","Authority (e.g. stop the line, release product, approve recipes)",{area:2,wide:1,dis:lock})}
    ${mf("jd.edu","Required education",{area:2,wide:1,req:1,dis:lock,ph:"e.g. B.E. / B.Tech in Metallurgical Engineering"})}${mf("jd.knowledge","Metallurgical and heat treat knowledge required",{area:2,wide:1,req:E.ht,dis:lock,ph:"e.g. phase transformations, hardenability, tempering, quenching, CQI-9 pyrometry, metallurgical testing"})}
    ${mf("jd.minYears","Minimum years of heat treat experience",{type:"number",req:1,dis:lock,hint:E.ht?`HTSA 1.1: at least ${MIN()} (or education + experience)`:""})}${mf("jd.other","Other requirements (training, skills)",{area:2,wide:1,dis:lock})}
    ${mf("jd.prep","Prepared by",{req:1,dis:lock})}${mf("jd.appr","Approved by",{req:1,dis:lock})}${E.jd.rev>0?mf("jd.change","Reason for the change",{area:2,wide:1,req:1,dis:lock}):""}</div>
    <p class="small ${lock?"muted":""}" style="margin-top:6px">${lock?`Approved by ${esc(E.jd.appr)} on ${fmtD(E.jd.apprDate)}. Start a new revision to change it.`:m.length?"To approve the job description: "+esc(m.join(", "))+".":"Ready to approve."}</p>
    ${E.jd.revs.length?`<ul class="small">${E.jd.revs.map(r=>`<li>Rev ${r.rev}: ${r.status==="approved"?"approved "+fmtD(r.apprDate)+" by "+esc(r.appr):esc(r.status)}${r.change?" · "+esc(r.change):""}</li>`).join("")}</ul>`:""}</fieldset>
  ${E.log.length?`<details style="margin-top:10px"><summary class="small">Log (${E.log.length})</summary><ul class="small">${E.log.slice().reverse().map(l=>`<li>${fmtD(l.d)} · ${esc(l.t)}</li>`).join("")}</ul></details>`:""}`;
  const foot=`<button class="pri w" data-save-pos>Save</button>${E.jd.status==="approved"?`<button class="w" data-jdrev>New JD revision</button>`:`<button class="w" data-jdappr>Approve job description</button>`}
    ${E.jd.status==="draft"&&E.jd.rev>0&&eff?`<button class="w" data-jddisc>Discard JD revision</button>`:""}${known?`<button data-jdprint>Print JD</button>`:""}
    ${known&&!kids(E.id).length?`<button class="danger w" data-del-pos>Delete</button>`:""}<button data-close>Close</button>`;
  return sheet(esc(known?E.title:"Add a position"),body,foot);
}
const ROWS={
  edu:{t:"Education",h:["Qualification","Field","Institute","Year passed","Duration (years)","Metallurgical","Reference (optional)"],f:["qual","field","inst","year","years","met","ref"],ty:{year:"number",years:"number",met:"check"},blank:{qual:"",field:"",inst:"",year:"",years:"",met:false,ref:""}},
  exp:{t:"Experience",h:["Organization","Role","From (month)","To (empty = now)","Heat treat work","Reference (optional)"],f:["org","role","from","to","ht","ref"],ty:{from:"month",to:"month",ht:"check"},blank:{org:"",role:"",from:"",to:"",ht:true,ref:""}},
  trn:{t:"Training and certificates",h:["Course / certificate","Date","Provider","Reference (optional)"],f:["course","date","provider","ref"],ty:{date:"date"},blank:{course:"",date:"",provider:"",ref:""}}};
function rowsTable(k){const R=ROWS[k],L=S.modal.ed[k];
  return `<h4 style="margin:12px 0 6px">${R.t}</h4>${L.length?`<div class="tw"><table><thead><tr>${R.h.map(h=>`<th>${esc(h)}</th>`).join("")}<th></th></tr></thead><tbody>${L.map((r,i)=>`<tr>${R.f.map(f=>{const ty=R.ty[f]||"text",id=`${k}.${i}.${f}`;
    return `<td>${ty==="check"?`<input type="checkbox" data-r="${id}" ${r[f]?"checked":""} aria-label="${esc(R.h[R.f.indexOf(f)])}">`:`<input type="${ty}" data-r="${id}" value="${esc(r[f]??"")}" aria-label="${esc(R.h[R.f.indexOf(f)])}" style="min-width:${ty==="month"||ty==="date"?"140":"90"}px">`}</td>`;}).join("")}<td><button class="w" data-rdel="${k}.${i}" aria-label="Remove">✕</button></td></tr>`).join("")}</tbody></table></div>`:`<p class="small muted">None entered.</p>`}
    <button class="w" data-radd="${k}" style="margin-top:6px">Add ${R.t.toLowerCase().replace(/ and .*/,"")} entry</button>`;}
const qBox=q=>`<p><b>Heat treat experience</b> ${yrs(q.ht)}${q.hereY?` <span class="muted">(incl. ${yrs(q.hereY)} in this organization)</span>`:""} · <b>Metallurgical education</b> ${yrs(q.edu)}<br>
  <b>HTSA 1.1 minimum (${MIN()} years)</b> ${q.qualified?pill("ok","Met")+" "+esc(q.path):pill("bad","Not met")+" "+esc(q.short)}${q.bad?`<br>${pill("warn","Dates")} ${plural(q.bad,"experience entry","experience entries")} ends before it starts`:""}</p>`;
function DRAW_PER(){
  const E=S.modal.ed,known=perById(E.id),q=qual(E);
  const body=`<fieldset><legend>Person</legend><div class="fields">${mf("name","Name",{req:1})}${mf("empNo","Employee no.")}${mf("employment","Employment",{opts:Object.entries(EMP)})}${mf("site","Works",{opts:Object.entries(SITE)})}${mf("joined","Joined this organization",{type:"date"})}
    ${ck("htHere","Work here since joining is heat treat work (counts as heat treat experience)")}${mf("notes","Notes",{area:2,wide:1})}</div></fieldset>
  <fieldset><legend>Qualification (MWSPL-F-ORG-02) · as entered; a certificate / letter reference is optional</legend>${rowsTable("edu")}${rowsTable("exp")}${rowsTable("trn")}<div id="qbox" style="margin-top:10px">${qBox(q)}</div></fieldset>
  ${E.log.length?`<details style="margin-top:10px"><summary class="small">Log (${E.log.length})</summary><ul class="small">${E.log.slice().reverse().map(l=>`<li>${fmtD(l.d)} · ${esc(l.t)}</li>`).join("")}</ul></details>`:""}`;
  return sheet(esc(known?E.name:"Add a person"),body,`<button class="pri w" data-save-per>Save</button>${known?`<button data-perprint>Print qualification record</button>`:""}${known&&!S.positions.some(p=>p.holder===E.id||p.deputy===E.id)?`<button class="danger w" data-del-per>Delete</button>`:""}<button data-close>Close</button>`);
}
function DRAW_CHARTAPPR(){const m=S.modal,next=isDate(S.chart.apprDate)?(+S.chart.rev||0)+1:Math.max(1,+S.chart.rev||0);
  return sheet("Approve the organization chart",`<p class="muted">Approving issues revision ${next} of the chart (MWSPL-F-ORG-03): ${plural(S.positions.length,"position")} with their reporting lines, holders and deputies.</p>
  <div class="fields"><label class="f req"><span>Approved by</span><input id="ca-by" value="${esc(m.by)}"></label><label class="f req"><span>Date</span><input type="date" id="ca-date" value="${esc(m.date)}"></label></div>`,
  `<button class="pri w" data-save-chart>Approve</button><button data-close>Cancel</button>`);}
function DRAW_PRINT(){return sheet(esc(S.modal.title),`<div id="jobcard">${S.modal.html()}</div>`,`<button class="pri" data-print>Print</button><button data-close>Close</button>`);}
const pHead=t=>`<p class="small muted">${esc(C().plant)} · ${esc(t)} · printed ${fmtD(today())}</p>`;
const kv=R=>`<div class="tw"><table><tbody>${R.map(([a,b])=>`<tr><td style="width:220px"><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>`;
function jdHtml(p){const e=jdEff(p)||p.jd;
  return `${pHead("Job description (MWSPL-F-ORG-01)")}<h2>${esc(p.title)} · rev ${e.rev}${p.jd.status==="draft"&&!jdEff(p)?" · DRAFT":""}</h2>
  ${kv([["Department",p.dept],["Reports to",(posById(p.reportsTo)||{}).title||"—"],["Holder / deputy",`${pname(p.holder)||"vacant"} / ${pname(p.deputy)||"—"}`],["Position",`${p.fte==="full"?"Full-time":"Part-time"} · ${SITE[p.site]}${p.dedicated?" · dedicated to heat treatment":""}${p.ht?" · heat treat position (HTSA 1.1)":""}`],
    ["Purpose",e.purpose],["Responsibilities",e.resp],["Authority",e.auth],["Required education",e.edu],["Metallurgical and heat treat knowledge",e.knowledge],["Minimum heat treat experience",e.minYears?e.minYears+" years":""],["Other requirements",e.other],
    ["Prepared by",e.prep],["Approved by / date",`${e.appr} · ${fmtD(e.apprDate)}`],["Reason for the change",e.change||"first issue"]])}`;}
function perHtml(p){const q=qual(p);
  return `${pHead("Qualification record (MWSPL-F-ORG-02)")}<h2>${esc(p.name)}${p.empNo?" · "+esc(p.empNo):""}</h2>
  ${kv([["Position(s)",heldBy(p.id).map(x=>x.title).join(", ")||"—"],["Employment",`${EMP[p.employment]} · ${SITE[p.site]}`],["Joined",fmtD(p.joined)],["Heat treat experience",yrs(q.ht)+(q.hereY?` (incl. ${yrs(q.hereY)} here)`:"")],["Metallurgical education",yrs(q.edu)],["HTSA 1.1 minimum ("+MIN()+" years)",q.qualified?"Met: "+q.path:"Not met: "+q.short]])}
  <h3>Education</h3>${p.edu.length?`<div class="tw"><table><thead><tr><th>Qualification</th><th>Field</th><th>Institute</th><th>Year</th><th>Years</th><th>Metallurgical</th><th>Reference</th></tr></thead><tbody>${p.edu.map(e=>`<tr><td>${esc(e.qual)}</td><td>${esc(e.field)}</td><td>${esc(e.inst)}</td><td>${esc(e.year)}</td><td>${esc(e.years)}</td><td>${e.met?"yes":"no"}</td><td>${esc(e.ref)}</td></tr>`).join("")}</tbody></table></div>`:"<p>None.</p>"}
  <h3>Experience</h3>${p.exp.length?`<div class="tw"><table><thead><tr><th>Organization</th><th>Role</th><th>From</th><th>To</th><th>Heat treat</th><th>Reference</th></tr></thead><tbody>${p.exp.map(e=>`<tr><td>${esc(e.org)}</td><td>${esc(e.role)}</td><td>${fmtM(e.from)}</td><td>${fmtM(e.to)}</td><td>${e.ht?"yes":"no"}</td><td>${esc(e.ref)}</td></tr>`).join("")}</tbody></table></div>`:"<p>None.</p>"}
  <h3>Training</h3>${p.trn.length?`<ul>${p.trn.map(t=>`<li>${esc(t.course)} · ${fmtD(t.date)} · ${esc(t.provider)}${t.ref?" · "+esc(t.ref):""}</li>`).join("")}</ul>`:"<p>None.</p>"}`;}
function packHtml(){const A=assess(),sc=SCORE[A.score];
  const draw=(p,d)=>d>30?"":`<li><b>${esc(p.title)}</b>${p.ht?" ★":""} — ${esc(pname(p.holder)||"vacant")}${pname(p.deputy)?` (deputy ${esc(pname(p.deputy))})`:""}${kids(p.id).length?`<ul>${kids(p.id).map(c=>draw(c,d+1)).join("")}</ul>`:""}</li>`;
  return `${pHead("CQI-9 HTSA 1.1 evidence pack")}<p><span class="verdict ${sc[2]}">${sc[1]}</span></p>
  <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${esc(LV[i.lvl][1])}</td></tr>`).join("")}</tbody></table></div>
  <h3 style="margin-top:12px">Organization chart ${isDate(S.chart.apprDate)?`rev ${S.chart.rev}, approved ${fmtD(S.chart.apprDate)} by ${esc(S.chart.appr)}${S.chart.dirty?" (changed since)":""}`:"(not approved)"}</h3><ul>${roots().map(p=>draw(p,0)).join("")}</ul>
  ${A.p?jdHtml(A.p):""}${A.per?perHtml(A.per):""}`;}
const DRAW={pos:DRAW_POS,per:DRAW_PER,chartappr:DRAW_CHARTAPPR,print:DRAW_PRINT};

/* 10. actions */
async function savePos(text){const E=fillPos(S.modal.ed),old=posById(E.id);
  if(!txt(E.title)){msg("Enter the position title.");return false;}
  if(E.reportsTo&&E.id){let x=posById(E.reportsTo),n=0;while(x&&n<100){if(x.id===E.id){msg("That reporting line would loop back to this position.");return false;}x=posById(x.reportsTo);n++;}}
  if(E.holder&&E.holder===E.deputy){msg("The deputy must be another person.");return false;}
  if(E.ht){const o=S.positions.find(p=>p.ht&&p.id!==E.id);if(o){msg(`${o.title} is already the heat treat position. Untick it there first.`);return false;}}
  if(!old){E.id="POS-"+pad(maxNo(S.positions)+1);}
  const lines=[];
  if(old){const ch=Object.keys(STRUCT).filter(k=>String(old[k]??"")!==String(E[k]??""));
    if(old.holder!==E.holder)lines.push(`Holder ${pname(old.holder)||"vacant"} → ${pname(E.holder)||"vacant"}`);
    if(!!old.specAuth!==!!E.specAuth)lines.push(E.specAuth?"Authorized to approve process specifications (HTSA 1.6)":"Authorization for process specifications withdrawn");
    if(ch.length)await markChart(`${E.title}: ${ch.map(k=>STRUCT[k]).join(", ")} changed`);}
  else await markChart(`position ${E.title} added`);
  lines.forEach(l=>E.log.push({d:today(),t:l}));
  const ok=await put("positions",E,text||(old?"Position updated":"Position created"));if(ok){S.modal.ed=clone(E);}return ok;}
async function savePer(){const E=fillPer(S.modal.ed),old=perById(E.id);
  if(!txt(E.name)){msg("Enter the name.");return false;}
  for(const [n,e] of E.exp.entries()){const nm=txt(e.role)||txt(e.org)?`“${txt(e.role)||txt(e.org)}”`:`line ${n+1}`;
    if((e.from&&!isMonth(e.from))||(e.to&&!isMonth(e.to))){msg(`Experience ${nm}: the dates must be months.`);return false;}
    if(isMonth(e.from)&&isMonth(e.to)&&e.to<e.from){msg(`Experience ${nm}: the end is before the start.`);return false;}
    if(isMonth(e.from)&&e.from>thisMonth()){msg(`Experience ${nm} starts in the future.`);return false;}
    if(e.ht&&!isMonth(e.from)){msg(`Experience ${nm}: enter the start month (heat treat experience is counted from dated entries).`);return false;}}
  for(const e of E.edu){const y=num(e.years);if(e.years!==""&&(y==null||y<0||y>10)){msg(`Education “${e.qual}”: the duration must be 0–10 years.`);return false;}}
  if(E.joined&&E.joined>today()){msg("The joining date is in the future.");return false;}
  if(!old)E.id="P-"+String(maxNo(S.people)+1).padStart(3,"0");
  const ok=await put("people",E,old?"Record updated":"Person added");if(ok)S.modal.ed=clone(E);return ok;}
async function stdOps(){if(!needDb())return;if(S.positions.length||S.people.length){toast("Only on an empty module.");return;}
  const td=today(),d=n=>addDays(td,-n),ym=n=>{const t=new Date(td+"T00:00:00");t.setMonth(t.getMonth()-n);return iso(t).slice(0,7);};
  const P=[],Q=[];let pn=0,qn=0;
  const per=x=>{const p=fillPer({id:"P-"+String(++pn).padStart(3,"0"),log:[{d:d(300),t:"Person added (example)"}],...x});P.push(p);return p;};
  const md_=per({name:"Director (example)",empNo:"E-001",joined:d(4000),htHere:false,edu:[{qual:"B.E. Mechanical",field:"Mechanical engineering",inst:"Example university",year:"1995",years:"4",met:false,ref:"HR file E-001"}]});
  const ht=per({name:"R. Sharma (example)",empNo:"E-014",joined:d(2200),edu:[{qual:"B.Tech",field:"Metallurgical engineering",inst:"Example institute of technology",year:"2010",years:"4",met:true,ref:"Degree certificate, HR file E-014"}],
    exp:[{org:"Example forge and heat treat Ltd.",role:"Heat treat engineer",from:ym(190),to:ym(75),ht:true,ref:"Experience letter"},{org:"Mass Wire and Steels",role:"HT Manager",from:ym(74),to:"",ht:true,ref:"Appointment letter E-014"}],
    trn:[{course:"CQI-9 4th edition HTSA training",date:d(500),provider:"Example training provider",ref:"Certificate C-2291"},{course:"Pyrometry: SAT and TUS",date:d(380),provider:"Example training provider",ref:"Certificate C-2412"}]});
  const dep=per({name:"A. Verma (example)",empNo:"E-031",joined:d(900),edu:[{qual:"B.Tech",field:"Metallurgical and materials engineering",inst:"Example university",year:"2021",years:"4",met:true,ref:"Degree certificate, HR file E-031"}],
    exp:[{org:"Mass Wire and Steels",role:"HT Engineer",from:ym(29),to:"",ht:true,ref:"Appointment letter E-031"}],trn:[{course:"Metallography and hardness testing",date:d(200),provider:"In-house",ref:"Training record T-118"}]});
  const qm=per({name:"S. Gupta (example)",empNo:"E-007",joined:d(3000),htHere:false,edu:[{qual:"M.Sc.",field:"Chemistry",inst:"Example university",year:"2005",years:"2",met:false,ref:"HR file E-007"}],exp:[{org:"Mass Wire and Steels",role:"Quality Manager",from:ym(98),to:"",ht:false,ref:""}]});
  const pm=per({name:"V. Singh (example)",empNo:"E-011",joined:d(2600),exp:[{org:"Mass Wire and Steels",role:"Production Manager",from:ym(85),to:"",ht:true,ref:""}]});
  const mh=per({name:"K. Yadav (example)",empNo:"E-019",joined:d(1900),htHere:false,edu:[{qual:"Diploma",field:"Electrical engineering",inst:"Example polytechnic",year:"2008",years:"3",met:false,ref:"HR file E-019"}]});
  const appr={prep:"HR executive (example)",appr:"Director (example)",status:"approved",apprDate:d(280),rev:0};
  const pos=x=>{const p=fillPos({id:"POS-"+pad(++qn),log:[{d:d(300),t:"Position created (example)"}],...x});Q.push(p);return p;};
  const D=pos({title:"Director",dept:"Management",holder:md_.id,jd:{purpose:"Lead the plant.",resp:"Business, resources, quality policy, management review.",edu:"Graduate engineer",minYears:"15",...appr}});
  pos({title:"Quality Manager",dept:"Quality",reportsTo:D.id,holder:qm.id,specAuth:true,jd:{purpose:"Quality system and customer quality.",resp:"IATF 16949 system, audits, customer complaints, CQI-9 self-assessment.",edu:"Graduate (science or engineering)",minYears:"8",...appr}});
  const H=pos({title:"HT Manager",dept:"Heat treatment",reportsTo:D.id,holder:ht.id,deputy:dep.id,ht:true,dedicated:true,jd:{purpose:"Responsible for the heat treatment process and its metallurgical results: the dedicated heat treat person on site (CQI-9 HTSA 1.1).",
    resp:"Process specifications and recipes; pyrometry (SAT, TUS, thermocouples); quench media; metallurgical testing and release; reaction plans and 8D for heat treat problems; training of operators; CQI-9 self-assessment of the heat treat process.",
    auth:"Stop the line or put product on hold; approve process specifications; release or reject heat-treated product.",edu:"B.E. / B.Tech in Metallurgical Engineering (or equivalent)",
    knowledge:"Physical metallurgy of steels (phase transformations, hardenability, tempering), heat treat processes (hardening and tempering, isothermal annealing, normalizing), quenching, CQI-9 pyrometry, hardness and metallography.",minYears:"5",other:"CQI-9 training; internal auditor.",...appr}});
  pos({title:"HT Engineer",dept:"Heat treatment",reportsTo:H.id,holder:dep.id,dedicated:true,jd:{purpose:"Support the HT Manager; deputy for the heat treat position.",resp:"Daily process checks, SCADA review, SAT and quench tests, metallurgical tests.",edu:"B.Tech in Metallurgical Engineering",knowledge:"Heat treat processes and testing",minYears:"1",...appr}});
  const PM=pos({title:"Production Manager",dept:"Production",reportsTo:D.id,holder:pm.id,jd:{purpose:"Production of the heat treat lines.",resp:"Loading, shifts, production reports, alarm response.",edu:"Graduate engineer",minYears:"5",...appr}});
  pos({title:"Maintenance Head",dept:"Maintenance",reportsTo:D.id,holder:mh.id,jd:{purpose:"Maintenance of furnaces and utilities.",resp:"Preventive maintenance, burners, instruments, thermocouple replacement.",edu:"Diploma / degree in engineering",minYears:"5",...appr}});
  pos({title:"Shift supervisor",dept:"Production",reportsTo:PM.id,jd:{purpose:"Run the shift.",resp:"Loading to the loading standards, push cycle, alarms, records.",edu:"Diploma",minYears:"2",prep:"HR executive (example)"}});
  await batchPut("people",P);await batchPut("positions",Q);
  S.chart={rev:2,apprDate:d(120),appr:"Director (example)",dirty:false,log:[{d:d(400),t:"Revision 1 approved by Director (example)"},{d:d(120),t:"Revision 2 approved by Director (example)"}]};await dbSet("config","chart",S.chart);
  toast("Starter set-up loaded");render();}
async function importCalor(){if(!needDb())return;const o=calorOrg();if(!o){toast("No CALOR HT organization in this browser");return;}
  const P=o.people.filter(p=>p&&ID_RE.test(String(p.id||""))).map(p=>fillPer({...p,log:[...(p.log||[]),{d:today(),t:"Imported from CALOR"}]}));
  const Q=o.positions.filter(p=>p&&ID_RE.test(String(p.id||""))).map(p=>{const x=fillPos({...p,log:[...(p.log||[]),{d:today(),t:"Imported from CALOR"}]});delete x.key;delete x.qa;return x;});
  await batchPut("people",P);await batchPut("positions",Q);
  if(o.chart){const c={rev:0,apprDate:"",appr:"",dirty:false,log:[],...o.chart};delete c.snap;S.chart=c;await saveChart("Imported from CALOR");}
  if(o.settings){const keep={};Object.keys(DEF).forEach(k=>{if(o.settings[k]!=null)keep[k]=o.settings[k];});S.cfg={...S.cfg,...keep};await dbSet("config","settings",S.cfg);}
  toast(`${plural(Q.length,"position")} and ${plural(P.length,"person","people")} imported from CALOR`);}
function armedDelete(b,fn){if(b.classList.contains("armed")){fn();return;}b.classList.add("armed");const t=b.textContent;b.textContent="Confirm delete";setTimeout(()=>{if(b.isConnected){b.classList.remove("armed");b.textContent=t;}},4000);}
async function download(name,text,type){
  if(S.dl){try{await S.dl.save({filename:name,data:new Blob([text],{type})});return;}catch(e){if(e&&e.code==="declined")return;}}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
const exportJson=()=>download(`mws-org-${today()}.json`,JSON.stringify({app:"mws-org-manager",v:1,saved:new Date().toISOString(),positions:S.positions,people:S.people,chart:S.chart,config:S.cfg},null,1),"application/json");
const csvQ=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
const csv=()=>download(`mws-org-people-${today()}.csv`,"﻿"+[["Person","Employee no.","Position(s)","Employment","Site","Joined","Heat treat experience (years)","Metallurgical education (years)","HTSA 1.1 minimum"],
  ...S.people.map(p=>{const q=qual(p);return [p.name,p.empNo,heldBy(p.id).map(x=>x.title).join("; "),EMP[p.employment],SITE[p.site],p.joined,fx1(q.ht),fx1(q.edu),q.qualified?"met":"not met"];})].map(r=>r.map(csvQ).join(",")).join("\r\n"),"text/csv");
const fx1=v=>(Math.round(v*10)/10).toString();
function readImport(f){f.text().then(t=>{let o;try{o=JSON.parse(t);}catch(e){toast("Not a JSON file");return;}
  if(!o||o.app!=="mws-org-manager"||!Array.isArray(o.positions)||!Array.isArray(o.people)){toast("Not an export of this module");return;}
  const ok=a=>a.filter(x=>x&&ID_RE.test(String(x.id||"")));
  S.imp={positions:ok(o.positions).map(fillPos),people:ok(o.people).map(fillPer),chart:o.chart||null,config:o.config||null,msg:`${f.name}: ${plural(ok(o.positions).length,"position")}, ${plural(ok(o.people).length,"person","people")}.`};render();});}
async function doImport(mode){if(!S.imp||!needDb())return;const I=S.imp;S.imp=null;
  for(const c of ["positions","people"]){if(mode==="replace")for(const x of S[c])if(!I[c].some(y=>y.id===x.id))await dbDel(c,x.id);await batchPut(c,I[c]);}
  if(I.chart){const c={...I.chart};delete c.id;await dbSet("config","chart",c);}if(I.config){const c={...DEF,...I.config};delete c.id;await dbSet("config","settings",c);}
  toast("Imported ("+mode+")");render();}
async function clearAll(){if(($("#clrtxt")||{}).value!=="CLEAR ALL"){toast("Type CLEAR ALL to clear");return;}if(!needDb())return;
  for(const c of ["positions","people"])for(const x of S[c])await dbDel(c,x.id);await dbDel("config","settings");await dbDel("config","chart");toast("All organization data cleared");}

/* 11. wiring */
onDoc("click",async e=>{
  const b=e.target.closest("button,tr.click,a[data-docref]");if(!b)return;const d=b.dataset;
  if(b.closest("#modal")||d.close!==undefined){
    if(d.close!==undefined){closeModal();return;}
    const m=S.modal;
    if(d.savePos!==undefined){if(await savePos()){msg("Saved.",1);toast("Position saved");}return;}
    if(d.jdappr!==undefined){const miss=jdMissing(m.ed);if(miss.length){msg("To approve the job description: "+miss.join(", ")+".");return;}
      m.ed.jd.status="approved";m.ed.jd.apprDate=today();if(await savePos(`Job description rev ${m.ed.jd.rev} approved by ${txt(m.ed.jd.appr)}`)){redraw();msg(`Job description rev ${m.ed.jd.rev} approved.`,1);}else{m.ed.jd.status="draft";m.ed.jd.apprDate="";}return;}
    if(d.jdrev!==undefined){const snap=clone(m.ed.jd);delete snap.revs;m.ed.jd.revs=[...(m.ed.jd.revs||[]),snap];m.ed.jd.rev+=1;m.ed.jd.status="draft";m.ed.jd.appr="";m.ed.jd.apprDate="";m.ed.jd.change="";
      if(await savePos(`Job description rev ${m.ed.jd.rev} started (rev ${m.ed.jd.rev-1} stays in force)`)){redraw();msg(`Revision ${m.ed.jd.rev} started.`,1);}return;}
    if(d.jddisc!==undefined){armedDelete(b,async()=>{const prev=m.ed.jd.revs.pop();m.ed.jd={...prev,revs:m.ed.jd.revs};if(await savePos("Job description draft discarded")){redraw();msg("Draft discarded.",1);}});return;}
    if(d.jdprint!==undefined){const p=fillPos(m.ed);openModal({kind:"print",title:"Job description · "+p.title,html:()=>jdHtml(p)});return;}
    if(d.delPos!==undefined){armedDelete(b,async()=>{const t=m.ed.title;await dbDel("positions",m.ed.id);await markChart(`position ${t} removed`);toast(t+" deleted");closeModal();});return;}
    if(d.savePer!==undefined){if(await savePer()){redraw();msg("Saved.",1);toast("Person saved");}return;}
    if(d.perprint!==undefined){const p=fillPer(m.ed);openModal({kind:"print",title:"Qualification record · "+p.name,html:()=>perHtml(p)});return;}
    if(d.delPer!==undefined){armedDelete(b,async()=>{await dbDel("people",m.ed.id);toast("Deleted");closeModal();});return;}
    if(d.radd){m.ed[d.radd].push({...ROWS[d.radd].blank});redraw();return;}
    if(d.rdel){const [k,i]=d.rdel.split(".");m.ed[k].splice(+i,1);redraw();return;}
    if(d.saveChart!==undefined){const by=$("#ca-by").value.trim(),dt=$("#ca-date").value;if(!by||!isDate(dt)){msg("Enter who approves and the date.");return;}if(dt>today()){msg("Not in the future.");return;}
      if(loops().size){msg("A reporting line loops back on itself: correct it first.");return;}if(!needDb())return;
      const rev=isDate(S.chart.apprDate)?(+S.chart.rev||0)+1:Math.max(1,+S.chart.rev||0);
      S.chart={...S.chart,rev,appr:by,apprDate:dt,dirty:false};if(await saveChart(`Revision ${rev} approved by ${by}`)){toast("Organization chart approved");closeModal();render();}return;}
    if(d.print!==undefined){document.body.classList.add("pm");window.print();setTimeout(()=>document.body.classList.remove("pm"),500);return;}
    if(d.openP){perModal(d.openP);return;}
    return;
  }
  if(d.openPos){posModal(d.openPos);return;}
  if(d.openP){perModal(d.openP);return;}
  if(d.newPos!==undefined){if(needDb())posModal(null);return;}
  if(d.newPer!==undefined){if(needDb())perModal(null);return;}
  if(d.chartappr!==undefined){if(!S.positions.length){toast("Add the positions first.");return;}if(needDb())openModal({kind:"chartappr",by:"",date:today(),msg:""});return;}
  if(d.pack!==undefined){openModal({kind:"print",title:"HTSA 1.1 evidence pack",html:packHtml});return;}
  if(d.std!==undefined){stdOps();return;}
  if(d.saveCfg!==undefined){document.querySelectorAll("[data-cfg]").forEach(i=>{const k=i.dataset.cfg,t=(SETF.find(x=>x[0]===k)||[])[2];S.cfg[k]=t==="number"?(num(i.value)>0?num(i.value):DEF[k]):i.value;});saveCfg();return;}
  if(d.doc){S.docSel=d.doc;render();return;}
  if(d.docref){e.preventDefault();const p=DOCS.find(x=>x[0].endsWith(d.docref.replace(/^(\.\.\/)+/,"").replace(/^\.\//,"")));if(p){S.docSel=p[0];render();}return;}
  if(d.export!==undefined){exportJson();return;}if(d.csv!==undefined){csv();return;}
  if(d.imp){if(d.imp==="cancel"){S.imp=null;render();}else doImport(d.imp);return;}
  if(d.calor!==undefined){importCalor();return;}
  if(d.clear!==undefined){armedDelete(b,clearAll);return;}
});
let QT=0;
onDoc("input",e=>{const el=e.target;if(!S.modal||!S.modal.ed)return;
  if(el.dataset.r){const [k,i,f]=el.dataset.r.split(".");S.modal.ed[k][+i][f]=el.type==="checkbox"?el.checked:el.value;
    clearTimeout(QT);QT=setTimeout(()=>{const q=$("#qbox");if(q&&S.modal)q.innerHTML=qBox(qual(fillPer(S.modal.ed)));},150);return;}
  if(el.dataset.p&&el.tagName!=="SELECT"){setp(S.modal.ed,el.dataset.p,el.value);
    if(S.modal.kind==="per"&&el.dataset.p==="joined"){clearTimeout(QT);QT=setTimeout(()=>{const q=$("#qbox");if(q&&S.modal)q.innerHTML=qBox(qual(fillPer(S.modal.ed)));},150);}}
});
onDoc("change",e=>{const el=e.target;
  if(S.modal&&S.modal.ed){
    if(el.dataset.p&&el.tagName==="SELECT"){setp(S.modal.ed,el.dataset.p,el.value);redraw();return;}
    if(el.dataset.pc){setp(S.modal.ed,el.dataset.pc,el.checked);redraw();return;}
    if(el.dataset.r&&el.type==="checkbox"){const [k,i,f]=el.dataset.r.split(".");S.modal.ed[k][+i][f]=el.checked;const q=$("#qbox");if(q)q.innerHTML=qBox(qual(fillPer(S.modal.ed)));return;}
  }
  if(el.id==="impfile"&&el.files[0]){readImport(el.files[0]);el.value="";}
});
onDoc("keydown",e=>{if(e.key==="Escape"&&S.modal)closeModal();});
onWin("hashchange",()=>{route();S.pending=false;render();window.scrollTo(0,0);});

/* 12. integration API */
MWS.org={closeModal,authorized,
  hasData:()=>S.positions.length>0,
  stats:()=>{const A=assess();return {db:S.dbState,score:A.score,label:SCORE[A.score][1],cls:SCORE[A.score][0],crit:A.crit,person:A.per?A.per.name:"",qualified:!!(A.q&&A.q.qualified),ht:A.q?A.q.ht:0,
    deputy:A.p?pname(A.p.deputy):"",chart:S.chart.rev,chartOk:isDate(S.chart.apprDate)&&!S.chart.dirty,positions:S.positions.length,people:S.people.length};},
  summary:()=>{const A=assess();return A.per?`Heat treat person ${A.per.name} (${A.p.title}), ${A.q.qualified?"qualified":"below the minimum"}; HTSA 1.1 ${SCORE[A.score][1].toLowerCase()}.`:`No heat treat person appointed; HTSA 1.1 ${SCORE[A.score][1].toLowerCase()}.`;}};
window.__ORGM={S,assess,qual,mergedMonths,jdMissing,jdEff,loops,authorized};

/* 13. boot */
async function boot(){
  route();render();
  const [dl,user,db]=await Promise.all([useCap("downloads"),useCap("user"),useCap("db")]);
  S.dl=dl;
  if(user){try{const c=await user.can("data.write");S.canWrite=c!==false;}catch(e){}}
  if(db)startStore(sharedDb(db),"on");else startStore(localDb(),"local");
}
boot();
