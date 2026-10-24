/* Module TREND: data collected and analysed over time, and the reaction to it (CQI-9 HTSA 1.8). Runs inside the shell: ACTIVE, onDoc, onWin,
   MWS and `location` come from the wrapper (build.py). The rules are copied from CALOR's Trend_Analysis.html. Reads the SCADA reviews (MWS.scada, HTSA 1.9),
   the SAT records (MWS.tc, HTSA 3.3) and CALOR's hardness / production / quench / alarm registers (MWS.calor). */

/* 1. collection prefix (shared store only) */
const NS=c=>S.db&&S.db.local?c:"trend-"+c;

/* 2. constants */
const ID_RE=/^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const LKEY="mws-trend-local-v1";
const ROLES=["HT Manager","Quality Manager","Production Manager","Maintenance Head","HT Engineer","Director"];
/* where the data comes from: f = the filter fields the source takes */
const SRC={
  scada:{t:"Zone temperature: SCADA reviews",kind:"process",from:"SCADA review",f:["furnace","chamber","metric"]},
  sat:{t:"SAT difference of a thermocouple position",kind:"process",from:"Thermocouples",f:["pos"]},
  hard:{t:"Surface hardness (mean of each test)",kind:"product",from:"CALOR hardness register",f:["part","furnace"]},
  core:{t:"Core hardness (mean of each test)",kind:"product",from:"CALOR hardness register",f:["part","furnace"]},
  decarb:{t:"Decarburization depth",kind:"product",from:"CALOR hardness register",f:["part","furnace"]},
  ncr:{t:"Tests not conforming per month (%)",kind:"product",from:"CALOR hardness register",f:["furnace"]},
  rework:{t:"Rework (re-heat-treated) items per week",kind:"product",from:"CALOR daily production",f:["furnace"]},
  quench:{t:"Quench media test result",kind:"process",from:"CALOR quench media",f:["tank","param"]},
  alarms:{t:"Alarms per week",kind:"process",from:"CALOR alarm log",f:["furnace"]},
  manual:{t:"Data entered here (other systems)",kind:"",from:"entered here",f:[]}};
const KIND={product:"Product characteristic",process:"Process parameter"};
const DEC={act:"Action",watch:"Watch (no action yet)",none:"No action needed"};
const METRICS=[["intol","Readings in tolerance, all thermocouples (%)"],...[1,2,3,4,5,6].map(k=>["dev:"+k,`Mean deviation from the set value, TC-0${k} (°C)`]),...[1,2,3,4,5,6].map(k=>["sd:"+k,`Scatter (standard deviation), TC-0${k} (°C)`]),...[1,2,3].map(z=>["wall:"+z,`Wall difference zone ${z}: left − right (°C)`])];
const DEF={plant:"Mass Wire and Steels Pvt. Ltd. · Bhiwadi",winDays:365,baseN:20,minPts:5,freq:30,planDays:365,furnaces:"F-01, F-02, F-03, F-04"};
const LIMITS={winDays:[30,3650],baseN:[5,100],minPts:[3,50],freq:[1,365],planDays:[30,3650]};
const SETF=[["plant","Plant","text"],["winDays","Charts show the last (days)","number"],["baseN","Control limits from the first (points)","number"],["minPts","Points needed for control limits","number"],
  ["freq","Default chart review interval (days)","number"],["planDays","Review the analysis plan every (days)","number"],["furnaces","Furnaces in use (each needs a process parameter)","text"]];
const CALOR_KEYS=["hmt-reg","prod-reg","qmt-reg","fop-reg"];
const DOCS=[
  ["TREND/00_TREND_Master_List.md","Master list"],
  ["TREND/01_Procedure/MWSPL-QP-TREND-01_Trend_Analysis.md","MWSPL-QP-TREND-01 Data analysis over time"],
  ["TREND/02_Work_Instructions/MWSPL-WI-TREND-01_Analysis_Plan.md","MWSPL-WI-TREND-01 Determining the parameters"],
  ["TREND/02_Work_Instructions/MWSPL-WI-TREND-02_Chart_Review.md","MWSPL-WI-TREND-02 Chart review and reaction"],
  ["TREND/03_Formats/MWSPL-F-TREND-01_Analysis_Plan.md","MWSPL-F-TREND-01 Analysis plan"],
  ["TREND/03_Formats/MWSPL-F-TREND-02_Chart_Review_Record.md","MWSPL-F-TREND-02 Chart review record"],
  ["TREND/04_Application/mwspl-trend-module.md","Module description"]];

/* 3. helpers */
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{if(v===""||v==null)return null;const n=Number(String(v).replace(",","."));return isFinite(n)?n:null;};
const txt=v=>String(v??"").trim();
const up=v=>txt(v).toUpperCase();
const clone=o=>JSON.parse(JSON.stringify(o??null));
const pad=n=>String(n).padStart(2,"0");
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>iso(new Date());
const isDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||""));
const dnum=s=>isDate(s)?Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/864e5:NaN;
const dstr=n=>{const d=new Date(n*864e5);return isFinite(d)?d.toISOString().slice(0,10):"";};
const addDays=(s,n)=>dstr(dnum(s)+n);
const weekOf=s=>{const n=dnum(s),wd=(new Date(n*864e5).getUTCDay()+6)%7;return dstr(n-wd);};
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtD=s=>isDate(s)?`${s.slice(8,10)}-${MON[+s.slice(5,7)-1]}-${s.slice(0,4)}`:"—";
const getp=(o,p)=>p.split(".").reduce((a,k)=>a==null?a:a[k],o);
const setp=(o,p,v)=>{const k=p.split(".");let a=o;k.slice(0,-1).forEach(x=>{if(a[x]==null||typeof a[x]!=="object")a[x]={};a=a[x];});a[k.at(-1)]=v;};
const pill=(c,t)=>`<span class="pill ${c||""}">${esc(t)}</span>`;
const plural=(n,w,p)=>`${n} ${n===1?w:(p||w+"s")}`;
const maxNo=L=>Math.max(0,...L.map(x=>+(String(x.id).match(/(\d+)$/)||[0,0])[1]));
const arr=v=>Array.isArray(v)?v:[];
const isObj=v=>!!v&&typeof v==="object"&&!Array.isArray(v);
const uniq=a=>[...new Set(a)];
const lim=(L,n=6)=>L.slice(0,n).join("; ")+(L.length>n?` … (${L.length} in all)`:"");
/* "N/A" means not available: an entry, never an identity */
const isNA=v=>/^(n\/?a|not available)$/i.test(txt(v));
const r2=v=>v==null||!isFinite(v)?null:Math.round(v*100)/100;
const fv=v=>v==null||!isFinite(v)?"—":String(Math.round(v*100)/100);
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const sdev=a=>{if(a.length<2)return null;const m=mean(a);return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/(a.length-1));};
const fNo=s=>{const m=String(s||"").match(/(\d+)/);return m?"F-"+pad(+m[1]):"";};

/* 4. state */
const S={view:"dash",db:null,dbState:"connecting",canWrite:true,dl:null,params:[],reviews:[],cfg:{...DEF},plan:{rev:0,appr:"",apprDate:"",dirty:false,log:[]},
  docSel:DOCS[0][0],imp:null,modal:null,pending:false,unsub:[],q:{},filt:{pf:""},ch:{}};
const C=()=>S.cfg;
const set=k=>{const n=num(S.cfg[k]),[lo,hi]=LIMITS[k];return n==null||Math.round(n)<lo||Math.round(n)>hi?DEF[k]:Math.round(n);};
const furnaces=()=>uniq(String(C().furnaces||"").split(/[\s,;]+/).map(fNo).filter(Boolean));

/* 5. domain logic */
const PARF={id:"",name:"",kind:"product",src:"manual",part:"",furnace:"",chamber:"",metric:"intol",pos:"",tank:"",param:"",unit:"",lsl:"",usl:"",freq:"",owner:"",react:"",active:true,created:"",data:[],log:[]};
function fillPar(p){const x={...clone(PARF),...(isObj(p)?p:{})};["name","part","furnace","chamber","metric","pos","tank","param","unit","lsl","usl","freq","owner","react","created"].forEach(k=>{x[k]=x[k]==null?"":String(x[k]);});
  if(!SRC[x.src])x.src="manual";if(x.src!=="manual")x.kind=SRC[x.src].kind;if(!KIND[x.kind])x.kind="product";x.active=x.active!==false;
  x.data=arr(x.data).filter(isObj).map(d=>({d:String(d.d||""),v:num(d.v),note:String(d.note||"")})).filter(d=>isDate(d.d)&&d.v!=null);x.log=arr(x.log).filter(isObj);return x;}
function fillRev(r){return {id:"",param:"",date:"",by:"",findings:"",dec:"",reason:"",action:"",owner:"",due:"",done:"",verify:"",snap:{},log:[],...(isObj(r)?r:{}),log:arr(r&&r.log)};}
const parById=id=>S.params.find(p=>p.id===id)||null;
const freqOf=p=>num(p.freq)>0?Math.round(num(p.freq)):set("freq");
const planDue=()=>isDate(S.plan.apprDate)?addDays(S.plan.apprDate,set("planDays")):null;

/* reading the other modules and CALOR's registers */
const CAL=k=>{try{return MWS.calor&&MWS.calor.get?MWS.calor.get(k):null;}catch(e){return null;}};
const tests=()=>arr((CAL("hmt-reg")||{}).tests);
const nums=a=>arr(a).map(num).filter(v=>v!=null);
const surf=t=>arr(t.samples).flatMap(s=>nums(s.r));
const testNc=t=>{const r=t.req||{},lo=num(r.hMin),hi=num(r.hMax),cl=num(r.cMin),ch=num(r.cMax),dm=num(r.decarbMax);
  return surf(t).some(v=>(lo!=null&&v<lo)||(hi!=null&&v>hi))||nums(t.core).some(v=>(cl!=null&&v<cl)||(ch!=null&&v>ch))||(dm!=null&&num(t.decarb)!=null&&num(t.decarb)>dm)||t.micro==="nok";};
const quench=()=>CAL("qmt-reg")||{};
const scadaHist=()=>{try{return MWS.scada&&MWS.scada.history?MWS.scada.history():[];}catch(e){return [];}};
const satPos=()=>{try{return MWS.tc&&MWS.tc.satSeries?MWS.tc.satSeries():[];}catch(e){return [];}};
/* the choices the data offers, for the parameter dialog */
function choices(){const T=tests(),Q=quench();
  return {parts:uniq(T.map(t=>txt(t.part)).filter(v=>v&&!isNA(v))).sort(),
    furnaces:uniq([...furnaces(),...scadaHist().map(h=>h.furnace),...T.map(t=>t.furnace)].filter(Boolean)).sort(),
    tanks:arr(Q.tanks).map(t=>[t.id,`${t.id} · ${t.furnace||""} ${t.name||""} (${t.media||""})`]),
    qparams:tk=>{const t=arr(Q.tanks).find(x=>x.id===tk);return arr(Q.plan).filter(p=>(!t||p.m===t.media)&&p.kind!=="ok").map(p=>[p.k,`${p.n}${p.u?" ("+p.u+")":""}`]);},
    pos:satPos().map(x=>[x.key,`${x.name} (${plural(x.pts.length,"SAT")})`])};}
function fillWeeks(W){const ks=Object.keys(W).sort();if(!ks.length)return [];const out=[];for(let w=ks[0];w<=weekOf(today());w=addDays(w,7))out.push({d:w,v:W[w]||0,note:"week of "+fmtD(w)});return out;}

/* the series of a parameter: points {d, v, note} and the limits the source gives */
let SC={};
function series(p){
  if(p.id&&SC[p.id])return SC[p.id];
  let pts=[],lsl=null,usl=null,unit=p.unit,src="";
  const okF=f=>!p.furnace||f===p.furnace,okP=x=>!p.part||up(x)===up(p.part);
  if(p.src==="manual"){pts=p.data.map(d=>({d:d.d,v:d.v,note:d.note}));src="entered here";}
  else if(["hard","core","decarb"].includes(p.src)){
    const T=tests().filter(t=>isDate(t.date)&&okF(t.furnace)&&okP(t.part)).sort((a,b)=>(a.date+(a.time||""))<(b.date+(b.time||""))?-1:1);
    T.forEach(t=>{const v=p.src==="hard"?mean(surf(t)):p.src==="core"?mean(nums(t.core)):num(t.decarb);if(v!=null&&isFinite(v))pts.push({d:t.date,v:r2(v),note:`${t.id} · ${t.part||""} ${t.batch||""}`.trim()});});
    const r=(T.at(-1)||{}).req||{};
    if(p.src==="hard"){lsl=num(r.hMin);usl=num(r.hMax);unit=unit||r.scale||"";}else if(p.src==="core"){lsl=num(r.cMin);usl=num(r.cMax);unit=unit||r.scale||"";}else{usl=num(r.decarbMax);unit=unit||"mm";}
    src="CALOR hardness register";}
  else if(p.src==="ncr"){const M={};tests().filter(t=>isDate(t.date)&&okF(t.furnace)).forEach(t=>{const m=t.date.slice(0,7)+"-01";(M[m]=M[m]||{n:0,nc:0});M[m].n++;if(testNc(t))M[m].nc++;});
    pts=Object.keys(M).sort().map(m=>({d:m,v:r2(100*M[m].nc/M[m].n),note:`${M[m].nc} of ${M[m].n} tests`}));unit=unit||"%";src="CALOR hardness register";}
  else if(p.src==="rework"){const W={};arr((CAL("prod-reg")||{}).reports).filter(r=>isDate(r.date)&&okF(r.furnace)).forEach(r=>{const w=weekOf(r.date);W[w]=W[w]||0;arr(r.tl&&r.tl.trays).forEach(t=>arr(t.items).forEach(it=>{if(it&&it.rw)W[w]++;}));});
    pts=fillWeeks(W);unit=unit||"items";src="CALOR daily production";}
  else if(p.src==="alarms"){const W={};arr((CAL("fop-reg")||{}).events).filter(e=>e.kind==="alarm"&&okF(e.furnace)&&isDate(String(e.start||"").slice(0,10))).forEach(e=>{const w=weekOf(e.start.slice(0,10));W[w]=(W[w]||0)+1;});
    pts=fillWeeks(W);unit=unit||"alarms";src="CALOR alarm log";}
  else if(p.src==="scada"){const [m,k]=String(p.metric||"intol").split(":");
    scadaHist().filter(h=>h.furnace===p.furnace&&(!p.chamber||h.chamber===p.chamber)).forEach(h=>{const tc=arr(h.tcs);let v=null;
      if(m==="intol"){const L=tc.filter(t=>t&&!t.offline&&t.pct!=null&&t.n);const n=L.reduce((a,t)=>a+t.n,0);v=n?L.reduce((a,t)=>a+t.pct*t.n,0)/n:null;}
      else if(m==="dev"){const t=tc[+k-1];v=t&&!t.offline?t.mean:null;}
      else if(m==="sd"){const t=tc[+k-1];v=t&&!t.offline?t.sd:null;}
      else if(m==="wall"){const z=+k-1,L=tc[z*2+1],R=tc[z*2];v=L&&R&&L.mean!=null&&R.mean!=null&&!L.offline&&!R.offline?L.mean-R.mean:null;}
      if(v!=null&&isFinite(v))pts.push({d:h.day,v:r2(v),note:`${h.id} · ${h.furnace} ${h.chamber}`});
      if(m==="dev"&&h.tol){lsl=-h.tol;usl=+h.tol;}});
    if(m==="intol")usl=null;unit=unit||(m==="intol"?"%":"°C");src="SCADA review (reviewed records)";}
  else if(p.src==="sat"){const x=satPos().find(q=>q.key===p.pos);if(x){pts=x.pts.slice();lsl=-x.tol;usl=x.tol;}unit=unit||"°C";src="Thermocouples (valid SATs)";}
  else if(p.src==="quench"){const Q=quench(),tk=arr(Q.tanks).find(t=>t.id===p.tank),pl=arr(Q.plan).find(x=>x.k===p.param&&(!tk||x.m===tk.media));
    arr(Q.tests).filter(t=>t.tank===p.tank&&isDate(t.date)).sort((a,b)=>(a.date+(a.time||""))<(b.date+(b.time||""))?-1:1).forEach(t=>{const v=num((t.vals||{})[p.param]);if(v!=null)pts.push({d:t.date,v,note:t.id});});
    if(pl){lsl=num(pl.lo);usl=num(pl.hi);unit=unit||pl.u||"";}src="CALOR quench media";}
  /* the plan's own limits replace the source's */
  if(num(p.lsl)!=null)lsl=num(p.lsl);if(num(p.usl)!=null)usl=num(p.usl);
  pts.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
  const o={pts,lsl,usl,unit,src};if(p.id)SC[p.id]=o;return o;
}

/* analysis: individuals chart, run rules, capability */
const lastRev=p=>S.reviews.filter(r=>r.param===p.id&&isDate(r.date)).sort((a,b)=>a.date<b.date?-1:1).at(-1)||null;
function anal(p){
  const s=series(p),from=addDays(today(),-set("winDays")),P=s.pts.filter(x=>x.d>=from&&x.d<=today()),v=P.map(x=>x.v);
  const base=v.slice(0,set("baseN")),m=mean(base),mr=base.slice(1).map((x,i)=>Math.abs(x-base[i])),sig=base.length>=set("minPts")&&mr.length?mean(mr)/1.128:null;
  const ucl=sig!=null?m+3*sig:null,lcl=sig!=null?m-3*sig:null,sdA=sdev(v),mA=mean(v),{lsl,usl}=s;let cpk=null;
  if(sdA>0&&(lsl!=null||usl!=null))cpk=Math.min(usl!=null?(usl-mA)/(3*sdA):Infinity,lsl!=null?(mA-lsl)/(3*sdA):Infinity);
  /* signals per point, the worst level kept */
  const sg=P.map(()=>({lvl:"",rules:[]})),add=(i,lvl,t)=>{const g=sg[i];if(!g.rules.includes(t))g.rules.push(t);if(lvl==="crit"||!g.lvl)g.lvl=lvl;};
  v.forEach((x,i)=>{
    if((usl!=null&&x>usl)||(lsl!=null&&x<lsl))add(i,"crit","outside the specification");
    if(sig!=null&&sig>0){
      if(x>ucl||x<lcl)add(i,"warn","beyond the control limits");
      if(i>=7){const w=v.slice(i-7,i+1);if(w.every(y=>y>m)||w.every(y=>y<m))add(i,"warn","8 points on one side of the mean (shift)");}
      if(i>=5){const w=v.slice(i-5,i+1);let inc=true,dec=true;for(let j=1;j<w.length;j++){if(!(w[j]>w[j-1]))inc=false;if(!(w[j]<w[j-1]))dec=false;}if(inc||dec)add(i,"warn",`6 points ${inc?"rising":"falling"} (trend)`);}
      if(i>=2){const w=v.slice(i-2,i+1);if(w.filter(y=>y>m+2*sig).length>=2&&x>m+2*sig||w.filter(y=>y<m-2*sig).length>=2&&x<m-2*sig)add(i,"warn","2 of 3 points beyond 2 sigma");}
    }});
  const sigs=P.map((x,i)=>({...x,i,...sg[i]})).filter(x=>x.lvl);
  const lr=p.id?lastRev(p):null,open=sigs.filter(x=>!lr||x.d>lr.date),last=P.at(-1)||null,fr=freqOf(p);
  /* review due: the last review (else the parameter's start) + its interval */
  const start=lr?lr.date:(isDate(p.created)?p.created:(P[0]||{}).d),due=isDate(start)?addDays(start,fr):null;
  const revSt=!due?"none":due>=today()?"ok":addDays(due,fr)<today()?"late":"overdue";
  const stale=!!last&&addDays(last.d,Math.max(fr,7))<today();
  const lvl=!P.length||open.some(x=>x.lvl==="crit")||revSt==="late"?"crit":open.length||revSt==="overdue"||stale||sig==null?"warn":"good";
  return {s,P,m,sig,ucl,lcl,lsl,usl,cpk,sigs,open,lr,last,due,revSt,stale,lvl,n:P.length,baseN:base.length,mA,sdA};
}
const actLate=r=>r.dec==="act"&&!isDate(r.done)&&isDate(r.due)&&r.due<today();
const actOpen=r=>r.dec==="act"&&(!isDate(r.done)||!txt(r.verify));
/* the furnace a process parameter covers */
function parFurn(p){if(p.furnace)return p.furnace;if(p.src==="sat")return String(p.pos||"").split("|")[0];
  if(p.src==="quench")return (arr(quench().tanks).find(t=>t.id===p.tank)||{}).furnace||"";const m=String(p.name||"").match(/\bF-?0?(\d)\b/i);return m?"F-0"+m[1]:"";}
function srcTxt(p){const s=SRC[p.src];if(p.src==="scada")return `${s.from} · ${p.furnace||"?"} ${p.chamber||"both chambers"} · ${(METRICS.find(x=>x[0]===p.metric)||[,""])[1]}`;
  if(p.src==="sat")return `${s.from} · ${((satPos().find(x=>x.key===p.pos))||{}).name||p.pos}`;
  if(p.src==="quench")return `${s.from} · tank ${p.tank} · ${p.param}`;
  return [s.from,p.part&&"part "+p.part,p.furnace].filter(Boolean).join(" · ");}

/* HTSA 1.8 */
const SCORE={s:["ok","Satisfactory","acc"],ns:["warn","Not satisfactory","cond"],nia:["bad","Needs immediate action","rej"]};
const LV={ok:["ok","Met"],warn:["warn","Attention"],crit:["bad","Not met"],info:["acc","Note"]};
const PLV={good:["ok","In control"],warn:["warn","Attention"],crit:["bad","Act"]};
function assess18(){
  const I=[],add=(lvl,req,ev,act)=>I.push({lvl,req,ev,act}),P=S.params.filter(p=>p.active),A=P.map(p=>({p,a:anal(p)})),pl=S.plan,pd=planDue();
  /* the system: an approved plan, reviewed */
  const R1="A system to collect, analyze and react to data over time";
  if(!P.length)add("crit",R1,"No parameter in the analysis plan.","Determine the parameters (WI-TREND-01) and approve the plan.");
  else if(!isDate(pl.apprDate))add("crit",R1,`${plural(P.length,"parameter")} listed, but the analysis plan is not approved.`,"Approve the analysis plan.");
  else add(pl.dirty||pd<today()?"warn":"ok",R1,`Analysis plan rev ${pl.rev}, approved ${fmtD(pl.apprDate)} by ${pl.appr}: ${plural(P.length,"parameter")}, each charted and reviewed at its interval.${pl.dirty?" Changed since the approval.":pd<today()?` Plan review overdue since ${fmtD(pd)}.`:""}`,pl.dirty?"Approve the changed plan.":pd<today()?"Review and re-approve the plan.":"");
  /* the parameters determined: product and process, every furnace */
  const np=P.filter(p=>p.kind==="product"),nq=P.filter(p=>p.kind==="process"),noF=furnaces().filter(f=>!nq.some(p=>parFurn(p)===f));
  add(!np.length||!nq.length?"crit":noF.length?"warn":"ok","Parameters included in the analysis determined by the organization",`${plural(np.length,"product characteristic")}: ${lim(np.map(p=>p.name))||"none"}. ${plural(nq.length,"process parameter")}: ${lim(nq.map(p=>p.name))||"none"}.${noF.length?` No process parameter for ${noF.join(", ")}.`:""}`,
    !np.length||!nq.length?`Add ${!np.length?"product characteristics (e.g. hardness, tensile strength, scrap)":"process parameters (e.g. zone temperatures, SAT differences, quench media)"} to the plan.`:noF.length?"Add a process parameter for each furnace in use.":"");
  /* data collected */
  const none=A.filter(x=>!x.a.n),few=A.filter(x=>x.a.n&&x.a.sig==null),stale=A.filter(x=>x.a.n&&x.a.stale);
  add(!P.length||none.length?"crit":few.length||stale.length?"warn":"ok","Data collected over time",!P.length?"No parameter.":[none.length?`No data in the last ${set("winDays")} days: ${lim(none.map(x=>x.p.name))}.`:"",few.length?`Fewer than ${set("minPts")} points (no control limits yet): ${lim(few.map(x=>x.p.name))}.`:"",stale.length?`No new data within the review interval: ${lim(stale.map(x=>x.p.name+" (last "+fmtD(x.a.last.d)+")"))}.`:"",!none.length&&!few.length&&!stale.length?`${plural(A.reduce((a,x)=>a+x.a.n,0),"data point")} over the last ${set("winDays")} days across ${plural(P.length,"parameter")}.`:""].filter(Boolean).join(" "),
    none.length?"Collect the data of these parameters (or correct their source / filter).":few.length||stale.length?"Keep collecting the data.":"");
  /* ongoing analysis */
  const late=A.filter(x=>x.a.revSt==="late"),over=A.filter(x=>x.a.revSt==="overdue");
  add(late.length?"crit":over.length?"warn":P.length?"ok":"crit","Ongoing trend or historical analysis",!P.length?"No parameter.":late.length||over.length?`Chart review overdue: ${lim(late.concat(over).map(x=>x.p.name+" (due "+fmtD(x.a.due)+")"))}.`:`Every chart reviewed within its interval; the last reviews: ${lim(A.filter(x=>x.a.lr).map(x=>x.p.name+" "+fmtD(x.a.lr.date)))||"—"}.`,
    late.length||over.length?"Review these charts (WI-TREND-02).":"");
  /* reaction */
  const oc=A.filter(x=>x.a.open.some(s=>s.lvl==="crit")),ow=A.filter(x=>x.a.open.length&&!oc.includes(x)),lateA=S.reviews.filter(actLate),noVer=S.reviews.filter(r=>r.dec==="act"&&isDate(r.done)&&!txt(r.verify));
  add(oc.length||lateA.length?"crit":ow.length||noVer.length?"warn":"ok","Reaction to the data",[oc.length?`Points outside the specification not yet reviewed: ${lim(oc.map(x=>x.p.name))}.`:"",ow.length?`Signals not yet reviewed: ${lim(ow.map(x=>x.p.name+" ("+x.a.open.length+")"))}.`:"",lateA.length?`Actions past their due date: ${lim(lateA.map(r=>r.id+" "+((parById(r.param)||{}).name||"")))}.`:"",noVer.length?`Actions done but not verified: ${lim(noVer.map(r=>r.id))}.`:"",!oc.length&&!ow.length&&!lateA.length&&!noVer.length?`Every signal reviewed; ${plural(S.reviews.filter(r=>r.dec==="act").length,"action")} decided from the data, ${S.reviews.filter(r=>r.dec==="act"&&txt(r.verify)).length} verified.`:""].filter(Boolean).join(" "),
    oc.length||ow.length?"Review the signals and decide the reaction.":lateA.length||noVer.length?"Complete and verify the actions.":"");
  const crit=I.filter(i=>i.lvl==="crit").length,anyData=A.some(x=>x.a.n);
  return {I,A,crit,score:!P.length||!anyData?"nia":crit?"ns":"s"};
}
function kp(){const H=assess18(),A=H.A.map(x=>x.a);
  return {score:H.score,crit:H.crit,params:H.A.length,product:H.A.filter(x=>x.p.kind==="product").length,process:H.A.filter(x=>x.p.kind==="process").length,
    signals:A.reduce((x,a)=>x+a.open.length,0),outSpec:A.filter(a=>a.open.some(s=>s.lvl==="crit")).length,reviewsDue:A.filter(a=>a.revSt==="overdue"||a.revSt==="late").length,
    actionsOpen:S.reviews.filter(actOpen).length,actionsLate:S.reviews.filter(actLate).length,planOk:isDate(S.plan.apprDate)&&!S.plan.dirty,planRev:isDate(S.plan.apprDate)?S.plan.rev:null};}

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
async function savePlan(t){S.plan.log=S.plan.log||[];if(t)S.plan.log.push({d:today(),t});try{await dbSet("config","plan",S.plan);return true;}catch(e){toast("Not saved: "+errMsg(e));return false;}}
/* a parameter added, changed or removed after the plan's approval: the plan needs a new approval */
async function markPlan(t){if(isDate(S.plan.apprDate)&&!S.plan.dirty){S.plan.dirty=true;await savePlan("Changed after approval: "+t);}}
async function saveCfg(){if(!needDb())return;try{await dbSet("config","settings",S.cfg);SC={};toast("Settings saved");}catch(e){toast("Not saved: "+errMsg(e));}}
async function batchPut(c,L){for(let i=0;i<L.length;i+=8)await Promise.all(L.slice(i,i+8).map(o=>dbSet(c,o.id,o)));}
function startStore(store,state){
  S.unsub.forEach(u=>{try{u();}catch(e){}});S.db=store;S.dbState=state;
  S.unsub=[store.sub("params",L=>{S.params=L.map(fillPar).sort((a,b)=>a.id<b.id?-1:1);SC={};safeRender();}),
    store.sub("reviews",L=>{S.reviews=L.map(fillRev).sort((a,b)=>a.id<b.id?-1:1);safeRender();}),
    store.sub("config",L=>{const c=L.find(x=>x.id==="settings"),p=L.find(x=>x.id==="plan");S.cfg={...DEF,...(c||{})};delete S.cfg.id;
      S.plan={rev:0,appr:"",apprDate:"",dirty:false,log:[],...(p||{})};delete S.plan.id;SC={};safeRender();})];
  render();
}
function safeRender(){
  const a=document.activeElement;if(S.modal||(a&&$("#main")&&$("#main").contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=true;return;}
  render();
}
onDoc("focusout",()=>setTimeout(()=>{if(S.pending&&!S.modal){const a=document.activeElement;if(!(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=false;render();}}},0));

/* 7. navigation */
const NAV=[["",[["dash","Dashboard"]]],["P",[["plan","Analysis plan"]]],["D",[["charts","Charts"]]],["C",[["signals","Signals & reviews"],["review","HTSA 1.8"]]],["A",[["act","Actions"]]],
  ["",[["settings","Settings"],["rules","Rules"],["docs","Docs"],["data","Data"]]]];
const navHtml=()=>`<div class="wrap">${NAV.map(([p,it])=>`<div class="grp">${p?`<span class="pd">${p}</span>`:""}${it.map(([k,l])=>`<a href="#${k}" ${S.view===k?'aria-current="page"':""}>${l}</a>`).join("")}</div>`).join("")}</div>`;
function route(){const v=(location.hash||"").slice(1);S.view=VIEWS[v]?v:"dash";}
const banner=()=>S.dbState==="local"?`<div class="banner warn">${MWS.sync&&MWS.sync.linked()?`Records are kept in this browser and saved to the Google Drive folder <b>${esc(MWS.sync.folder())}</b>.`:`Local mode: records are kept in this browser only. Link a Google Drive folder (button at the top right) or back up from the <a href="#data">Data</a> tab.`}</div>`
  :S.dbState==="connecting"?`<div class="banner">Connecting to the record store…</div>`:S.dbState==="error"?`<div class="banner bad">The record store reported an error; changes may not be saved.</div>`:"";
function render(){
  if(!ACTIVE()){MWS.bg();return;}
  SC={};S.ch={};
  $("#nav").innerHTML=navHtml();
  const ds=$("#dbstate");if(ds)ds.textContent=S.dbState==="on"?"Shared · live":S.dbState==="local"?"Local · this browser":S.dbState==="error"?"Store error":"Connecting…";
  document.body.classList.toggle("ro",!S.canWrite);
  $("#main").innerHTML=`<div class="stack">${banner()}${(VIEWS[S.view]||VIEWS.dash)()}</div>`;
  (AFTER[S.view]||(()=>{}))();
}

/* 8. charts: individuals chart with mean, control and specification limits (hand-built SVG) */
let CHN=0;
function ichart(a,o={}){
  const P=a.P;if(!P.length)return `<div class="empty small"><p>No data in the last ${set("winDays")} days.</p></div>`;
  const W=760,H=o.h||220,L=48,R=46,T=12,B=26,id="tc"+(++CHN);
  const t0=dnum(P[0].d),t1=dnum(P.at(-1).d),X=d=>L+(t1>t0?(dnum(d)-t0)/(t1-t0):.5)*(W-L-R);
  const ys=P.map(x=>x.v).concat([a.ucl,a.lcl,a.lsl,a.usl,a.m].filter(v=>v!=null&&isFinite(v)));let y0=Math.min(...ys),y1=Math.max(...ys);const pyd=(y1-y0)*.08||1;y0-=pyd;y1+=pyd;
  const Y=v=>T+(y1-v)/(y1-y0)*(H-T-B);
  const span=y1-y0,raw=span/5,mag=10**Math.floor(Math.log10(raw)),stp=[1,2,5,10].map(f=>f*mag).find(s=>s>=raw)||mag*10,ticks=[];for(let v=Math.ceil(y0/stp)*stp;v<=y1+1e-9;v+=stp)ticks.push(r2(v));
  const hl=(v,lab,dash,w,col)=>v==null||!isFinite(v)?"":`<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="${col}" stroke-width="${w}" ${dash?`stroke-dasharray="${dash}"`:""}/><text x="${W-R+4}" y="${(Y(v)+3.5).toFixed(1)}" class="tl">${esc(lab)}</text>`;
  const path=P.map((x,i)=>(i?"L":"M")+X(x.d).toFixed(1)+" "+Y(x.v).toFixed(1)).join(" ");
  const bi=Math.min(a.baseN,P.length)-1,sg=new Map(a.sigs.map(s=>[s.i,s]));
  const xl=[P[0].d,P[Math.floor((P.length-1)/2)].d,P.at(-1).d].filter((v,i,ar)=>ar.indexOf(v)===i);
  S.ch[id]={P,unit:a.s.unit||"",sg,t0,t1,W,L,R};
  return `<div class="tviz" data-ch="${id}">
  <div class="lgs"><span class="lg"><i style="background:var(--s1)"></i>${esc(o.name||"value")}${a.s.unit?" ("+esc(a.s.unit)+")":""}</span><span class="lg"><i style="background:var(--muted)"></i>mean</span>${a.sig!=null?`<span class="lg"><i class="dot2"></i>control limits (± 3σ, first ${a.baseN} points)</span>`:""}${a.lsl!=null||a.usl!=null?`<span class="lg"><i class="dash"></i>specification</span>`:""}${a.sigs.some(s=>s.lvl==="warn")?`<span class="lg"><i class="dot" style="background:var(--warn)"></i>signal</span>`:""}${a.sigs.some(s=>s.lvl==="crit")?`<span class="lg"><i class="dot"></i>outside the specification</span>`:""}</div>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc((o.name||"")+": individuals chart of "+P.length+" points")}">
    ${ticks.map(v=>`<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--line)"/><text x="${L-6}" y="${(Y(v)+3.5).toFixed(1)}" text-anchor="end" class="tl">${v}</text>`).join("")}
    ${bi>0&&bi<P.length-1?`<line x1="${X(P[bi].d).toFixed(1)}" x2="${X(P[bi].d).toFixed(1)}" y1="${T}" y2="${H-B}" stroke="var(--muted)" stroke-dasharray="2 3" opacity=".6"/>`:""}
    ${hl(a.usl,"USL","6 4",1.5,"var(--ink)")}${hl(a.lsl,"LSL","6 4",1.5,"var(--ink)")}${hl(a.ucl,"UCL","2 3",1.5,"var(--muted)")}${hl(a.lcl,"LCL","2 3",1.5,"var(--muted)")}${hl(a.m,"mean","",1,"var(--muted)")}
    <path d="${path}" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round"/>
    ${P.map((x,i)=>{const g=sg.get(i);return `<circle cx="${X(x.d).toFixed(1)}" cy="${Y(x.v).toFixed(1)}" r="${g?5:3.5}" fill="${g?(g.lvl==="crit"?"var(--bad)":"var(--warn)"):"var(--s1)"}" stroke="var(--panel)" stroke-width="2"/>`;}).join("")}
    ${xl.map((d,i)=>`<text x="${X(d).toFixed(1)}" y="${H-8}" text-anchor="${i===0?"start":i===xl.length-1?"end":"middle"}" class="tl">${fmtD(d)}</text>`).join("")}
    <line class="xh" x1="0" x2="0" y1="${T}" y2="${H-B}" stroke="var(--ink)" opacity="0"/>
    <rect class="hit" x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="transparent"/>
  </svg><div class="ttip" hidden></div></div>`;
}
/* crosshair + tooltip: the nearest point in time */
function chartHover(ev){const v=ev.target.closest&&ev.target.closest(".tviz");if(!v)return;const c=S.ch[v.dataset.ch];if(!c)return;
  const svg=v.querySelector("svg"),xh=svg.querySelector(".xh"),tip=v.querySelector(".ttip");
  if(ev.type==="pointerleave"||!ev.target.classList.contains("hit")){tip.hidden=true;xh.setAttribute("opacity","0");return;}
  const b=svg.getBoundingClientRect(),x=(ev.clientX-b.left)/b.width*c.W,t=c.t0+(c.t1>c.t0?(x-c.L)/(c.W-c.L-c.R)*(c.t1-c.t0):0);
  let k=0;c.P.forEach((q,i)=>{if(Math.abs(dnum(q.d)-t)<Math.abs(dnum(c.P[k].d)-t))k=i;});const q=c.P[k],xx=c.L+(c.t1>c.t0?(dnum(q.d)-c.t0)/(c.t1-c.t0):.5)*(c.W-c.L-c.R),g=c.sg.get(k);
  xh.setAttribute("x1",xx);xh.setAttribute("x2",xx);xh.setAttribute("opacity",".35");
  tip.innerHTML=`<b>${fmtD(q.d)}</b> · ${fv(q.v)} ${esc(c.unit)}${q.note?`<br><span class="muted">${esc(q.note)}</span>`:""}${g?`<br>${g.lvl==="crit"?"✕":"!"} ${esc(g.rules.join("; "))}`:""}`;
  tip.hidden=false;const px=xx/c.W*b.width;tip.style.left=Math.min(b.width-tip.offsetWidth-4,Math.max(0,px+12))+"px";}
onDoc("pointermove",chartHover);onDoc("pointerdown",chartHover);onDoc("pointerout",e=>{if(e.target.classList&&e.target.classList.contains("hit"))chartHover({type:"pointerleave",target:e.target});});
/* a small trend line for the plan table */
function spark(a){const P=a.P;if(P.length<2)return "";const W=120,H=30,t0=dnum(P[0].d),t1=dnum(P.at(-1).d),vs=P.map(x=>x.v),y0=Math.min(...vs),y1=Math.max(...vs),X=d=>2+(t1>t0?(dnum(d)-t0)/(t1-t0):.5)*(W-4),Y=v=>2+(y1>y0?(y1-v)/(y1-y0):.5)*(H-4);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path d="${P.map((x,i)=>(i?"L":"M")+X(x.d).toFixed(1)+" "+Y(x.v).toFixed(1)).join(" ")}" fill="none" stroke="var(--s1)" stroke-width="1.5"/>${a.sigs.slice(-12).map(s=>`<circle cx="${X(s.d).toFixed(1)}" cy="${Y(s.v).toFixed(1)}" r="2.5" fill="${s.lvl==="crit"?"var(--bad)":"var(--warn)"}"/>`).join("")}</svg>`;}
const statBox=a=>`<div class="tstat"><span><b>${plural(a.n,"point")}</b> in ${set("winDays")} days</span><span>Mean <b>${fv(a.mA)}</b></span><span>σ (moving range) <b>${fv(a.sig)}</b></span><span>Control limits <b>${a.sig!=null?fv(a.lcl)+" – "+fv(a.ucl):"not yet ("+a.n+" of "+set("minPts")+" points)"}</b></span><span>Specification <b>${a.lsl!=null||a.usl!=null?(a.lsl!=null?fv(a.lsl):"—")+" – "+(a.usl!=null?fv(a.usl):"—"):"none"}</b></span><span>Cpk <b>${fv(a.cpk)}</b></span></div>`;
const sigList=(a,L)=>L.length?`<ul class="issues">${L.map(s=>`<li>${pill(s.lvl==="crit"?"bad":"warn",fmtD(s.d))} ${fv(s.v)} ${esc(a.s.unit||"")} · ${esc(s.rules.join("; "))}${a.lr&&s.d<=a.lr.date?' <span class="small muted">(reviewed)</span>':""}</li>`).join("")}</ul>`:"";

/* 9. views */
const planPill=()=>{const p=S.plan,pd=planDue();return !isDate(p.apprDate)?pill("bad","Not approved"):p.dirty?pill("warn",`Rev ${p.rev} · changed since the approval`):pd<today()?pill("warn",`Rev ${p.rev} · plan review overdue`):pill("ok",`Rev ${p.rev} approved ${fmtD(p.apprDate)}`);};
function attention(){const out=[],A=assess18().A;
  if(!isDate(S.plan.apprDate)&&S.params.length)out.push([`data-planappr`,"The analysis plan is not approved","bad"]);else if(S.plan.dirty)out.push([`data-planappr`,"The analysis plan changed since its approval","warn"]);
  A.filter(x=>x.a.open.some(s=>s.lvl==="crit")).forEach(x=>out.push([`data-rev="${esc(x.p.id)}"`,`${x.p.name}: point outside the specification to review`,"bad"]));
  A.filter(x=>x.a.revSt==="late").forEach(x=>out.push([`data-rev="${esc(x.p.id)}"`,`${x.p.name}: chart review late (due ${fmtD(x.a.due)})`,"bad"]));
  S.reviews.filter(actLate).forEach(r=>out.push([`data-open-rev="${esc(r.id)}"`,`${r.id} ${(parById(r.param)||{}).name||""}: action past its due date ${fmtD(r.due)}`,"bad"]));
  A.filter(x=>x.a.open.length&&!x.a.open.some(s=>s.lvl==="crit")).forEach(x=>out.push([`data-rev="${esc(x.p.id)}"`,`${x.p.name}: ${plural(x.a.open.length,"signal")} to review`,"warn"]));
  A.filter(x=>x.a.revSt==="overdue").forEach(x=>out.push([`data-rev="${esc(x.p.id)}"`,`${x.p.name}: chart review due since ${fmtD(x.a.due)}`,"warn"]));
  A.filter(x=>!x.a.n).forEach(x=>out.push([`data-open-par="${esc(x.p.id)}"`,`${x.p.name}: no data in the last ${set("winDays")} days`,"bad"]));
  return out;}
function vDash(){
  if(!S.params.length)return `<div class="empty"><h2>No analysis plan yet</h2><p>Determine the product characteristics and process parameters the organization analyses over time (WI-TREND-01), then chart and review them. The starter set-up shows how the module works, with example data and the SCADA reviews and SAT records already in the other modules.</p><div class="row" style="justify-content:center"><button class="pri w" data-new-par>Add parameter</button><button class="w" data-std>Load starter set-up</button></div></div>`;
  const H=assess18(),sc=SCORE[H.score],k=kp(),att=attention();
  return `<div class="tiles">
    <a class="tile ${sc[0]}" href="#review"><span class="k">HTSA 1.8</span><span class="v" style="font-size:20px;padding:6px 0">${sc[1]}</span><span class="small muted">${plural(H.crit,"item")} not met</span></a>
    <a class="tile" href="#plan"><span class="k">Parameters</span><span class="v">${k.params}</span><span class="small muted">${k.product} product · ${k.process} process</span></a>
    <a class="tile ${k.outSpec?"bad":k.signals?"warn":"ok"}" href="#signals"><span class="k">Signals to review</span><span class="v">${k.signals}</span><span class="small muted">${plural(k.outSpec,"parameter")} outside the specification</span></a>
    <a class="tile ${k.reviewsDue?"warn":"ok"}" href="#signals"><span class="k">Chart reviews due</span><span class="v">${k.reviewsDue}</span><span class="small muted">past their interval</span></a>
    <a class="tile ${k.actionsLate?"bad":k.actionsOpen?"warn":"ok"}" href="#act"><span class="k">Actions open</span><span class="v">${k.actionsOpen}</span><span class="small muted">${k.actionsLate} past the due date</span></a>
    <a class="tile ${k.planOk?"ok":"warn"}" href="#plan"><span class="k">Analysis plan</span><span class="v">${k.planRev!=null?"Rev "+k.planRev:"—"}</span><span class="small muted">${k.planOk?"approved":isDate(S.plan.apprDate)?"changed since the approval":"not approved"}</span></a></div>
  <div class="grid2"><div class="panel"><div class="row between"><h3>Needs attention</h3><button class="pri w" data-new-par>Add parameter</button></div>
    ${att.length?`<ul class="issues">${att.slice(0,12).map(([a,t,c])=>`<li><button class="link" ${a}>${esc(t)}</button> ${pill(c,c==="bad"?"Not met":"Attention")}</li>`).join("")}</ul>`:`<p class="muted">Nothing open.</p>`}</div>
  <div class="panel"><h3>The parameters</h3><div class="tw"><table><tbody>${H.A.map(({p,a})=>`<tr class="click" data-open-par="${esc(p.id)}"><td><b>${esc(p.name)}</b><br><span class="small muted">${esc(KIND[p.kind])}</span></td><td>${spark(a)}</td><td>${pill(...PLV[a.lvl])}</td></tr>`).join("")}</tbody></table></div></div></div>`;
}
function vPlan(){
  const pl=S.plan,pd=planDue(),f=S.filt.pf;
  const L=S.params.filter(p=>f==="product"||f==="process"?p.kind===f:true).map(p=>({p,a:anal(p)})).filter(x=>f!=="att"||x.a.lvl!=="good").sort((a,b)=>(b.p.active-a.p.active)||a.p.kind.localeCompare(b.p.kind)||a.p.name.localeCompare(b.p.name));
  return `<div class="panel"><div class="row between"><h3>Analysis plan (F-TREND-01)</h3><div class="row"><button class="w" data-planappr>${isDate(pl.apprDate)?"Approve a new revision":"Approve the plan"}</button><button data-planprint>Print the plan</button><button class="pri w" data-new-par>Add parameter</button></div></div>
    <p>${planPill()}</p><p class="small muted">The parameters the organization has determined to analyse over time: where the data comes from, the limits, the review interval, the owner and what a signal triggers. ${isDate(pl.apprDate)?`Approved by ${esc(pl.appr)}; next plan review ${fmtD(pd)}.`:"Approve the plan once the parameters are determined."}</p>
    ${pl.log.length?`<details><summary class="small muted">History of the plan</summary><ul class="small">${pl.log.slice().reverse().map(l=>`<li>${fmtD(l.d)} · ${esc(l.t)}</li>`).join("")}</ul></details>`:""}</div>
  <div class="segs" role="group" aria-label="Filter">${[["","All"],["product","Product"],["process","Process"],["att","Needing attention"]].map(([k,t])=>`<button data-pf="${k}" aria-pressed="${f===k}">${t}</button>`).join("")}</div>
  ${L.length?`<div class="tw"><table><thead><tr><th>Parameter</th><th>Data from</th><th>Trend</th><th class="n">Last</th><th class="n">Mean · Cpk</th><th>Signals</th><th>Review</th><th>Status</th><th></th></tr></thead><tbody>${L.map(({p,a})=>`<tr class="${p.active?"":"muted"}">
    <td><button class="link" data-open-par="${esc(p.id)}"><b>${esc(p.name)}</b></button><br><span class="small muted">${esc(p.id)} · ${esc(KIND[p.kind])} · ${esc(p.owner||"no owner")}${p.active?"":" · not active"}</span></td>
    <td class="small">${esc(srcTxt(p))}<br><span class="muted">${plural(a.n,"point")}</span></td><td>${spark(a)}</td>
    <td class="n">${a.last?`${fv(a.last.v)} ${esc(a.s.unit||"")}<br><span class="small muted">${fmtD(a.last.d)}</span>`:"—"}</td>
    <td class="n">${fv(a.mA)}<br><span class="small muted">${a.cpk!=null?"Cpk "+fv(a.cpk):"no specification"}</span></td>
    <td>${a.open.length?pill(a.open.some(s=>s.lvl==="crit")?"bad":"warn",plural(a.open.length,"signal")+" to review"):a.sigs.length?`<span class="small muted">${plural(a.sigs.length,"signal")} reviewed</span>`:`<span class="small muted">none</span>`}</td>
    <td>${a.lr?fmtD(a.lr.date):"never"}<br><span class="small ${a.revSt==="late"?"c-bad":a.revSt==="overdue"?"c-warn":"muted"}">next ${fmtD(a.due)}</span></td>
    <td>${pill(...PLV[a.lvl])}</td><td><button data-rev="${esc(p.id)}">Review</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty"><p>${S.params.length?"No parameter for this selection.":"No parameters yet."}</p></div>`}`;
}
function vCharts(){
  const f=S.filt.pf,L=S.params.filter(p=>p.active&&(f==="product"||f==="process"?p.kind===f:true)).map(p=>({p,a:anal(p)})).filter(x=>f!=="att"||x.a.lvl!=="good");
  return `<div class="row between"><h2>Charts</h2><div class="segs" role="group" aria-label="Filter">${[["","All"],["product","Product"],["process","Process"],["att","Needing attention"]].map(([k,t])=>`<button data-pf="${k}" aria-pressed="${f===k}">${t}</button>`).join("")}</div></div>
  <p class="muted">Each parameter of the plan over the last ${set("winDays")} days: individuals chart with the mean and the control limits from the first ${set("baseN")} points (σ = average moving range ÷ 1.128), the specification, Cpk and the run-rule signals.</p>
  ${L.length?L.map(({p,a})=>`<div class="panel"><div class="row between"><h3>${esc(p.name)}</h3><div class="row">${pill(...PLV[a.lvl])}<button data-open-par="${esc(p.id)}">Parameter</button><button class="pri" data-rev="${esc(p.id)}">Review</button></div></div>
    <p class="small muted">${esc(KIND[p.kind])} · ${esc(srcTxt(p))} · owner ${esc(p.owner||"—")} · review every ${freqOf(p)} days, ${a.lr?"last "+fmtD(a.lr.date):"never reviewed"}, next ${fmtD(a.due)}</p>
    ${ichart(a,{name:p.name})}${statBox(a)}${a.open.length?`<p class="small"><b>Signals to review</b></p>${sigList(a,a.open.slice(-6).reverse())}`:""}</div>`).join(""):`<div class="empty"><p>No parameter to chart.</p></div>`}`;
}
function vSignals(){
  const A=S.params.filter(p=>p.active).map(p=>({p,a:anal(p)}));
  const sig=A.flatMap(({p,a})=>a.open.map(s=>({p,a,s}))).sort((x,y)=>x.s.d<y.s.d?1:-1);
  const due=A.filter(x=>x.a.revSt!=="ok"&&x.a.revSt!=="none").sort((x,y)=>x.a.due<y.a.due?-1:1);
  const R=S.reviews.slice().sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:a.id<b.id?1:-1);
  return `<div class="panel"><h3>Signals waiting for a review</h3>${sig.length?`<div class="tw"><table><thead><tr><th>Date</th><th>Parameter</th><th class="n">Value</th><th>Signal</th><th></th></tr></thead><tbody>${sig.slice(0,40).map(({p,a,s})=>`<tr><td>${fmtD(s.d)}</td><td><b>${esc(p.name)}</b></td><td class="n">${fv(s.v)} ${esc(a.s.unit||"")}</td><td>${pill(s.lvl==="crit"?"bad":"warn",s.rules.join("; "))}</td><td><button data-rev="${esc(p.id)}">Review</button></td></tr>`).join("")}</tbody></table></div>${sig.length>40?`<p class="small muted">The 40 latest of ${sig.length} signals are shown.</p>`:""}`:`<p class="muted">No signal waiting for a review.</p>`}</div>
  <div class="panel"><h3>Chart reviews due</h3>${due.length?`<div class="tw"><table><thead><tr><th>Parameter</th><th>Last review</th><th>Due</th><th>State</th><th></th></tr></thead><tbody>${due.map(({p,a})=>`<tr><td><b>${esc(p.name)}</b></td><td>${a.lr?fmtD(a.lr.date):"never"}</td><td>${fmtD(a.due)}</td><td>${pill(a.revSt==="late"?"bad":"warn",a.revSt==="late"?"Late":"Due")}</td><td><button data-rev="${esc(p.id)}">Review</button></td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">Every chart reviewed within its interval.</p>`}</div>
  <div class="panel"><h3>Reviews recorded (F-TREND-02)</h3>${R.length?`<div class="tw"><table><thead><tr><th>Review</th><th>Parameter</th><th>What the data showed</th><th>Decision</th></tr></thead><tbody>${R.slice(0,60).map(r=>`<tr class="click" data-open-rev="${esc(r.id)}"><td class="mono">${esc(r.id)}<br><span class="small muted">${fmtD(r.date)} · ${esc(r.by)}</span></td><td>${esc((parById(r.param)||{}).name||r.param)}</td><td class="small">${esc(r.findings)}</td><td><b>${esc(DEC[r.dec]||"—")}</b>${r.dec==="act"?`<br><span class="small muted">${esc(r.action)} · ${esc(r.owner)} · due ${fmtD(r.due)}${isDate(r.done)?" · done "+fmtD(r.done):""}</span>`:r.reason?`<br><span class="small muted">${esc(r.reason)}</span>`:""}</td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">No review recorded.</p>`}</div>`;
}
function vReview(){
  const H=assess18(),sc=SCORE[H.score];
  return `<div class="panel"><div class="row between"><h3>HTSA 1.8 · Does the heat treater collect and analyze data over time, and react to this data?</h3><button data-h18>Evidence (print)</button></div>
    <p><span class="verdict ${sc[2]}">${sc[1]}</span> <span class="muted">${plural(H.I.filter(i=>i.lvl==="ok").length,"item")} met · ${plural(H.crit,"item")} not met · ${plural(H.I.filter(i=>i.lvl==="warn").length,"item")} needing attention</span></p>
    <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th><th>Action</th></tr></thead><tbody>${H.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${pill(...LV[i.lvl])}</td><td>${esc(i.act)}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted" style="margin-top:8px">The question asks for a system to collect, analyze and react to product or process data over time; methods of analysis include ongoing trend or historical analysis of product characteristics or process parameters (e.g. product property trend charts such as tensile strength, scrap trends, variation in process parameter recordings such as temperature); the organization determines which parameters are included. Wording to confirm against the controlled CQI-9 copy.</p></div>`;}
function vAct(){
  const L=S.reviews.filter(actOpen).sort((a,b)=>(a.due||"9")<(b.due||"9")?-1:1),D=S.reviews.filter(r=>r.dec==="act"&&!actOpen(r)).sort((a,b)=>a.done<b.done?1:-1);
  const row=r=>`<tr class="click" data-open-rev="${esc(r.id)}"><td class="mono">${esc(r.id)}<br><span class="small muted">${fmtD(r.date)}</span></td><td>${esc((parById(r.param)||{}).name||r.param)}</td><td class="small">${esc(r.action)}</td><td>${esc(r.owner)}</td><td>${fmtD(r.due)}</td><td>${!actOpen(r)?pill("ok","Done and verified"):isDate(r.done)?pill("warn","Done, to verify"):actLate(r)?pill("bad","Past due"):pill("","Open")}</td></tr>`;
  const head=`<thead><tr><th>Review</th><th>Parameter</th><th>Action</th><th>Owner</th><th>Due</th><th>State</th></tr></thead>`;
  return `<div class="panel"><h3>Actions decided from the data</h3><p class="small muted">An action closes when it is done and its effect is seen in the later data (verification).</p>${L.length?`<div class="tw"><table>${head}<tbody>${L.map(row).join("")}</tbody></table></div>`:`<p class="muted">No open action.</p>`}</div>
  <div class="panel"><h3>Completed actions</h3>${D.length?`<div class="tw"><table>${head}<tbody>${D.slice(0,30).map(row).join("")}</tbody></table></div>`:`<p class="muted">None yet.</p>`}</div>`;}
function vSettings(){const c=C();
  return `<div class="panel"><h3>Settings</h3><div class="fields">${SETF.map(([k,l,t])=>`<label class="f"><span>${esc(l)}</span><input data-cfg="${k}" type="${t}" value="${esc(c[k])}"></label>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="pri w" data-save-cfg>Save settings</button><span class="small muted">Changes are kept only after Save. Figures are site rules, not CQI-9 values.</span></div></div>`;}
function vRules(){const R=[["Analysis plan","The parameters determined by the organization (WI-TREND-01), each with its source, filter, unit, specification limits (empty = from the source), review interval (empty = "+set("freq")+" days), owner and reaction rule. Approved with revision, approver and date; a parameter added, changed or removed afterwards marks the plan changed (approve again). Plan review every "+set("planDays")+" days."],
    ["Data","SCADA review: the reviews recorded in the SCADA module (not idle, not example): readings in tolerance (n-weighted over the thermocouples online), mean deviation and scatter per TC (specification ± the record's tolerance), wall difference left − right per zone. Thermocouples: the valid SATs of every element at a position (± the SAT tolerance). CALOR registers (Data tab): hardness tests (mean surface / core, decarburization; limits of the latest test's requirement), nonconforming tests per month, rework items and alarms per week (empty weeks count 0), quench tests (limits of the test plan). Entered: date and value lines."],
    ["Analysis","Individuals chart over the last "+set("winDays")+" days. Mean and control limits from the first "+set("baseN")+" points, σ = average moving range ÷ 1.128, needs "+set("minPts")+" points. Cpk from the overall standard deviation. Signals: outside the specification (act), beyond the control limits, 8 points on one side of the mean, 6 rising or falling, 2 of 3 beyond 2σ."],
    ["Review","A signal is open until a review dated on or after it. Review due = last review (else the parameter's start) + interval; overdue after the due date, late after a further interval. Gate: date (not in the future), reviewed by, what the data shows, decision; action → action, owner, due date; watch / no action → reason. An action closes when done and verified."],
    ["HTSA 1.8 score","Needs immediate action: no parameter or no data at all. Not satisfactory: any item not met (plan not approved, no product or no process parameter, a parameter without data, a chart review late, a point outside the specification not reviewed, an action past due). Satisfactory: otherwise."]];
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
function vData(){const n=S.params.length;
  return `<h2>Data</h2><div class="grid2">
  <div class="panel"><h3>Back up and restore</h3><p class="small muted">${plural(n,"parameter")} · ${plural(S.reviews.length,"review")} · storage: ${S.dbState==="on"?"shared record store":"this browser"}.</p>
    <div class="row"><button class="pri" data-export>Export JSON</button><button data-csv>Analysis plan CSV</button></div>
    <div class="row w" style="margin-top:10px"><label class="f"><span>Import a JSON export</span><input type="file" id="impfile" accept=".json,application/json"></label></div>
    ${S.imp?`<div class="banner" style="margin-top:8px">${esc(S.imp.msg)}<div class="row" style="margin-top:6px"><button class="pri" data-imp="merge">Merge (add and update)</button><button class="danger" data-imp="replace">Replace everything</button><button data-imp="cancel">Cancel</button></div></div>`:""}</div>
  ${MWS.calor&&MWS.calor.panel?MWS.calor.panel(CALOR_KEYS,"Parameters with data from CALOR's hardness, production, quench media and alarm registers read them from here."):""}
  <div class="panel"><h3>Starter set-up</h3><p class="small muted">An approved analysis plan with five example series (hardness trending up, tensile strength, scrap with a spike, a zone deviation shift, quench oil), a SAT parameter and a SCADA parameter when those modules hold records, and monthly reviews; all marked "(example)".</p><button class="w" data-std ${n?"disabled":""}>Load starter set-up</button>${n?`<p class="small muted">Only on an empty module.</p>`:""}</div>
  <div class="panel"><h3>Clear all</h3><p class="small muted">Deletes every record and the settings of this module. Type <b>CLEAR ALL</b> to enable.</p>
    <div class="row w"><input id="clrtxt" placeholder="CLEAR ALL" style="max-width:180px"><button class="danger" data-clear>Clear all</button></div></div></div>`;}
const VIEWS={dash:vDash,plan:vPlan,charts:vCharts,signals:vSignals,review:vReview,act:vAct,settings:vSettings,rules:vRules,docs:vDocs,data:vData};
const AFTER={docs:showDoc};

/* 10. modal record sheets */
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
function parModal(id,init){const p=parById(id);openModal({kind:"par",ed:p?clone(p):fillPar({created:today(),owner:"HT Manager",...(init||{})}),msg:""});}
function DRAW_PAR(){
  const E=S.modal.ed,known=parById(E.id),sr=SRC[E.src],CH=choices(),a=anal(E),R=S.reviews.filter(r=>r.param===E.id).sort((x,y)=>x.date<y.date?1:-1);
  const fo=CH.furnaces.map(f=>[f,f]);
  const body=`<p class="muted">${known?pill(...PLV[a.lvl])+" "+esc(E.id):pill("warn","New parameter")} · ${esc(KIND[E.kind])}</p>
  <datalist id="tr-parts">${CH.parts.map(x=>`<option value="${esc(x)}"></option>`).join("")}</datalist>
  <fieldset><legend>Parameter: what is analysed and where the data comes from</legend><div class="fields">
    ${mf("name","Name",{req:1,wide:1,ph:"e.g. Surface hardness EX-1001, F-02 tempering: readings in tolerance"})}
    ${mf("src","Data from",{opts:Object.entries(SRC).map(([k,v])=>[k,v.t]),req:1})}
    ${E.src==="manual"?mf("kind","Kind",{opts:Object.entries(KIND)}):`<label class="f"><span>Kind</span><input value="${esc(KIND[E.kind])}" disabled></label>`}
    ${sr.f.includes("part")?mf("part","Part no. (empty = every part)",{list:"tr-parts"}):""}
    ${sr.f.includes("furnace")?mf("furnace",E.src==="scada"?"Furnace":"Furnace (empty = every furnace)",{opts:fo,blank:1,blankTxt:E.src==="scada"?"—":"every furnace",req:E.src==="scada"}):""}
    ${sr.f.includes("chamber")?mf("chamber","Chamber",{opts:[["Hardening","Hardening"],["Tempering","Tempering"]],blank:1,blankTxt:"either"}):""}
    ${sr.f.includes("metric")?mf("metric","What is charted",{opts:METRICS,wide:1}):""}
    ${sr.f.includes("pos")?mf("pos","Thermocouple position",{opts:CH.pos,blank:1,req:1,wide:1,hint:CH.pos.length?"":"No SAT records in the Thermocouples module yet."}):""}
    ${sr.f.includes("tank")?mf("tank","Quench tank",{opts:CH.tanks,blank:1,req:1,hint:CH.tanks.length?"":"No CALOR quench media data found (Data tab)."}):""}
    ${sr.f.includes("param")?mf("param","Test parameter",{opts:CH.qparams(E.tank),blank:1,req:1}):""}
    ${mf("unit","Unit",{hint:E.src==="manual"?"":"empty = from the source"})}${mf("lsl","Lower specification limit",{type:"number",hint:E.src==="manual"?"":"empty = from the source"})}${mf("usl","Upper specification limit",{type:"number",hint:E.src==="manual"?"":"empty = from the source"})}
    ${mf("freq","Review the chart every (days)",{type:"number",hint:`empty = ${set("freq")} days`})}${mf("owner","Owner",{opts:ROLES.map(r=>[r,r]),blank:1,req:1})}
    ${mf("react","Reaction rule (what a signal triggers)",{area:2,wide:1,ph:"e.g. a point outside the specification: hold the lot and inform the HT Manager; a trend: review at the weekly meeting"})}
    <label class="chk"><input type="checkbox" data-p="active" ${E.active?"checked":""}> Analysed (in the plan)</label></div></fieldset>
  <fieldset><legend>Chart · ${esc(a.s.src||sr.t)}</legend>${ichart(a,{name:E.name||"value"})}${statBox(a)}${a.sigs.length?sigList(a,a.sigs.slice(-8).reverse()):""}</fieldset>
  ${E.src==="manual"?`<fieldset><legend>Data · ${plural(E.data.length,"point")} entered</legend>
    <label class="f wide"><span>Add data: one point per line, date and value (and a note), e.g. 2026-10-14 52.3 batch B-102; pasted Excel columns and dd.mm.yyyy work</span><textarea id="m-paste" rows="3"></textarea></label>
    <div class="row" style="margin-top:6px"><button data-paste>Add the data</button></div>
    ${E.data.length?`<details><summary class="small muted">The points entered</summary><div class="tw"><table><thead><tr><th>Date</th><th class="n">Value</th><th>Note</th><th></th></tr></thead><tbody>${E.data.slice().sort((x,y)=>x.d<y.d?-1:1).map(d=>`<tr><td>${fmtD(d.d)}</td><td class="n">${fv(d.v)}</td><td>${esc(d.note)}</td><td><button data-ddel="${E.data.indexOf(d)}" aria-label="Remove the point of ${fmtD(d.d)}">✕</button></td></tr>`).join("")}</tbody></table></div></details>`:""}</fieldset>`:""}
  ${known?`<fieldset><legend>Reviews</legend>${R.length?`<ul class="small">${R.map(r=>`<li><button class="link" data-open-rev="${esc(r.id)}">${esc(r.id)}</button> ${fmtD(r.date)} ${esc(r.by)}: ${esc(DEC[r.dec]||"")} · ${esc(r.findings)}</li>`).join("")}</ul>`:`<p class="muted small">Not reviewed yet.</p>`}</fieldset>`:""}
  ${hist(E)}`;
  const foot=[`<button class="pri w" data-save-par>Save</button>`,known?`<button class="w" data-par-rev>Review…</button><button data-par-print>Print</button>`:"",known&&!R.length?`<button class="danger" data-del-par>Delete</button>`:"",`<button data-close>Close</button>`].join("");
  return sheet(esc(known?E.name:"New parameter"),body,foot);
}
function newRev(p){const a=anal(p);return fillRev({param:p.id,date:today(),dec:a.open.length?"":"none",owner:p.owner||"",
  snap:{n:a.n,mean:r2(a.mA),cpk:r2(a.cpk),last:a.last?a.last.v:null,open:a.open.map(s=>`${s.d} ${s.v}: ${s.rules.join("; ")}`)}});}
function missRev(r){const m=[];if(!isDate(r.date))m.push("date");else if(r.date>today())m.push("a date not in the future");if(!txt(r.by))m.push("reviewed by");if(!txt(r.findings))m.push("what the data shows");if(!DEC[r.dec])m.push("the decision");
  if(r.dec==="act"){if(!txt(r.action))m.push("the action");if(!r.owner)m.push("owner");if(!isDate(r.due))m.push("due date");}
  if((r.dec==="none"||r.dec==="watch")&&!txt(r.reason))m.push("the reason");
  if(isDate(r.done)&&r.done>today())m.push("a done date not in the future");return m;}
function DRAW_REV(){
  const E=S.modal.ed,known=S.reviews.find(r=>r.id===E.id),p=parById(E.param),a=p?anal(p):null,m=missRev(E);
  const body=`${a?`<fieldset><legend>The data · ${esc(a.s.src)}</legend>${ichart(a,{name:p.name})}${statBox(a)}
      ${known?(arr(E.snap&&E.snap.open).length?`<p class="small muted">Signals when reviewed: ${esc(E.snap.open.join(" · "))}</p>`:`<p class="small muted">No open signal when reviewed: a periodic review.</p>`):a.open.length?sigList(a,a.open):`<p class="small muted">No new signal since the last review: a periodic review.</p>`}
      ${p.react?`<p class="small"><b>Reaction rule:</b> ${esc(p.react)}</p>`:""}</fieldset>`:""}
  <fieldset><legend>Review (F-TREND-02): what the data shows and the reaction</legend><div class="fields">
    ${mf("date","Date",{type:"date",req:1})}${mf("by","Reviewed by",{req:1})}
    ${mf("findings","What the data shows (trend, shift, capability, cause found)",{area:3,wide:1,req:1})}
    ${mf("dec","Decision",{opts:Object.entries(DEC),blank:1,req:1})}
    ${E.dec==="act"?mf("action","Action",{area:2,wide:1,req:1})+mf("owner","Owner",{opts:ROLES.map(r=>[r,r]),blank:1,req:1})+mf("due","Due",{type:"date",req:1})+mf("done","Done on",{type:"date"})+mf("verify","Verified (effect seen in the data)",{area:2,wide:1}):mf("reason","Reason",{area:2,wide:1,req:1})}</div>
    <p class="small muted" id="rev-miss">${m.length?"To save: "+esc(m.join(", "))+".":"Complete."}</p></fieldset>${hist(E)}`;
  const foot=[`<button class="pri w" data-save-rev>Save</button>`,known?`<button class="danger" data-del-rev>Delete</button>`:"",`<button data-close>Close</button>`].join("");
  return sheet(esc((known?E.id:"Review")+" · "+(p?p.name:E.param)),body,foot);
}
function DRAW_PLAN(){const m=S.modal,next=isDate(S.plan.apprDate)?(+S.plan.rev||0)+1:Math.max(1,+S.plan.rev||0);
  return sheet("Approve the analysis plan",`<p class="muted">Records revision ${next} of the analysis plan (${plural(S.params.filter(p=>p.active).length,"parameter")} in use) as approved. A periodic review without changes is also recorded as a new revision.</p>
  <div class="fields"><label class="f req"><span>Approved by</span><input id="pl-by" value="${esc(m.by)}"></label><label class="f req"><span>Date</span><input type="date" id="pl-date" value="${esc(m.date)}"></label>
  ${next>1?`<label class="f wide req"><span>Change / review note</span><input id="pl-chg" value="${esc(m.chg)}"></label>`:""}</div>`,`<button class="pri w" data-save-plan>Approve</button><button data-close>Cancel</button>`);}
function DRAW_PRINT(){return sheet(esc(S.modal.title),`<div id="jobcard">${S.modal.html()}</div>`,`<button class="pri" data-print>Print</button><button data-close>Close</button>`);}
const pHead=t=>`<p class="small muted">${esc(C().plant)} · ${esc(t)} · printed ${fmtD(today())}</p>`;
const tblH=(head,rows)=>rows.length?`<div class="tw"><table><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:`<p class="muted">None.</p>`;
const planRows=()=>S.params.filter(p=>p.active).map(p=>{const a=anal(p);return [p.id,p.name,KIND[p.kind],srcTxt(p),a.s.unit||"",fv(a.lsl),fv(a.usl),freqOf(p),p.owner,p.react];});
const parBlock=p=>{const a=anal(p),R=S.reviews.filter(r=>r.param===p.id).sort((x,y)=>x.date<y.date?1:-1);
  return `<div class="pblk"><h3>${esc(p.name)} <span class="small muted">· ${esc(KIND[p.kind])} · ${esc(srcTxt(p))} · owner ${esc(p.owner)}</span></h3>${ichart(a,{name:p.name,h:190})}${statBox(a)}
  ${tblH(["Review","Date","By","What the data showed","Decision"],R.slice(0,4).map(r=>[r.id,fmtD(r.date),r.by,r.findings,(DEC[r.dec]||"")+(r.dec==="act"?": "+r.action+" ("+r.owner+", due "+fmtD(r.due)+(isDate(r.done)?", done "+fmtD(r.done):"")+")":r.reason?": "+r.reason:"")]))}</div>`;};
const planHtml=()=>`${pHead("Analysis plan (MWSPL-F-TREND-01, CQI-9 HTSA 1.8)")}<h2>Analysis plan ${isDate(S.plan.apprDate)?`rev ${S.plan.rev}, approved ${fmtD(S.plan.apprDate)} by ${esc(S.plan.appr)}${S.plan.dirty?" · CHANGED SINCE THE APPROVAL":""}`:"· NOT APPROVED"}</h2>
  ${tblH(["No.","Parameter","Kind","Data from","Unit","LSL","USL","Review (days)","Owner","Reaction rule"],planRows())}<p class="small" style="margin-top:14px">Approved ____________________ Date __________</p>`;
function h18Html(){const H=assess18(),sc=SCORE[H.score];
  return `${pHead("CQI-9 HTSA 1.8 evidence")}<p><span class="verdict ${sc[2]}">${sc[1]}</span></p>
  ${tblH(["Requirement","Evidence","Result","Action"],H.I.map(i=>[i.req,i.ev,LV[i.lvl][1],i.act||""]))}
  <h3>Analysis plan${isDate(S.plan.apprDate)?` · rev ${S.plan.rev}, approved ${fmtD(S.plan.apprDate)} by ${esc(S.plan.appr)}`:" · not approved"}</h3>
  ${tblH(["Parameter","Kind","Data from","Review (days)","Owner","Points","Cpk","Status"],H.A.map(({p,a})=>[p.name,KIND[p.kind],srcTxt(p),freqOf(p),p.owner,a.n,a.cpk!=null?fv(a.cpk):"",PLV[a.lvl][1]]))}
  ${H.A.map(x=>parBlock(x.p)).join("")}`;}
const DRAW={par:DRAW_PAR,rev:DRAW_REV,plan:DRAW_PLAN,print:DRAW_PRINT};

/* 11. actions */
const STRUCT=["name","src","kind","part","furnace","chamber","metric","pos","tank","param","lsl","usl","freq","owner","active"];
async function savePar(){const E=fillPar(S.modal.ed),known=parById(E.id);
  const err=!txt(E.name)?"Enter the name.":E.src==="scada"&&!E.furnace?"Choose the furnace.":E.src==="sat"&&!E.pos?"Choose the thermocouple position.":E.src==="quench"&&(!E.tank||!E.param)?"Choose the tank and the test parameter.":!E.owner?"Choose the owner."
    :num(E.lsl)!=null&&num(E.usl)!=null&&num(E.lsl)>=num(E.usl)?"The lower specification limit must be below the upper.":S.params.some(p=>p.id!==E.id&&up(p.name)===up(E.name))?"A parameter of this name exists.":"";
  if(err){msg(err);return false;}
  let t="Added to the analysis plan",ch=[];
  if(!known)E.id="TP-"+String(maxNo(S.params)+1).padStart(4,"0");else{ch=STRUCT.filter(k=>String(known[k])!==String(E[k]));t=ch.length?"Changed: "+ch.join(", "):E.data.length!==known.data.length?"Data updated":"Saved";}
  if(!await put("params",E,t))return false;
  if(!known||ch.length)await markPlan(`parameter ${E.name} ${known?"changed":"added"}`);
  S.modal.ed=clone(E);SC={};return true;}
async function saveRev(){const E=fillRev(S.modal.ed),known=S.reviews.find(r=>r.id===E.id),m=missRev(E);if(m.length){msg("To save: "+m.join(", ")+".");return false;}
  if(!known)E.id="RV-"+String(maxNo(S.reviews)+1).padStart(4,"0");
  if(!await put("reviews",E,!known?"Review recorded":isDate(E.done)&&txt(E.verify)?"Action done and verified":"Updated"))return false;S.modal.ed=clone(E);return true;}
function pasteData(){const E=S.modal.ed,el=$("#m-paste");if(!el)return;let n=0,bad=0;
  el.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).forEach(l=>{const m=l.match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{4})[\s,;\t]+(-?[\d.,]+)\s*(.*)$/);if(!m){bad++;return;}
    let d=m[1];if(!isDate(d)){const q=d.split(/[./-]/);d=`${q[2]}-${pad(+q[1])}-${pad(+q[0])}`;}const v=num(m[2]);if(!isDate(d)||isNaN(dnum(d))||v==null||d>today()){bad++;return;}E.data.push({d,v,note:m[3]||""});n++;});
  redraw();msg(n?`${plural(n,"point")} added${bad?`, ${bad} line${bad===1?"":"s"} not read`:""}: save to keep them.`:"No line read: date and value per line.",!!n&&!bad);}
async function stdOps(){if(!needDb())return;if(S.params.length){toast("Only on an empty module.");return;}
  const td=today(),d=n=>addDays(td,-n),ex=" (example)",P=[],R=[];
  let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;},nrm=()=>{let s=0;for(let i=0;i<6;i++)s+=rnd();return s-3;};
  const mk=p=>{const x=fillPar({id:"TP-"+String(P.length+1).padStart(4,"0"),created:d(240),freq:"30",log:[{d:d(240),t:"Added to the analysis plan"}],...p});P.push(x);return x;};
  const ser=(n,step,f)=>Array.from({length:n},(_,i)=>({d:d((n-1-i)*step),v:r2(f(i,n)),note:""}));
  const h=mk({name:"Surface hardness EX-1001"+ex,kind:"product",src:"manual",unit:"HRC",lsl:"45",usl:"52",owner:"Quality Manager",react:"A point outside the specification: hold the lot (nonconforming product procedure) and inform the HT Manager. A trend: check the tempering zone temperatures and the quench at the next review.",
    data:ser(40,5,(i,n)=>48.4+0.55*nrm()+(i>n-8?0.45*(i-(n-8)):0))});
  const ts=mk({name:"Tensile strength EX-1001, customer data"+ex,kind:"product",src:"manual",unit:"MPa",lsl:"1100",usl:"1300",owner:"Quality Manager",freq:"60",react:"Below 1150 MPa: compare with the hardness of the same lots.",data:ser(16,14,()=>1205+18*nrm())});
  const sc=mk({name:"Scrap after heat treatment, F-02"+ex,kind:"product",src:"manual",unit:"kg / week",usl:"60",owner:"Production Manager",react:"Above 60 kg in a week: Pareto of the scrap causes at the weekly meeting.",data:ser(30,7,i=>Math.max(0,28+9*nrm()+(i===22?42:0)))});
  const z=mk({name:"F-02 hardening zone 2: mean deviation TC-03"+ex,kind:"process",src:"manual",unit:"°C",lsl:"-10",usl:"10",owner:"Maintenance Head",freq:"14",react:"A shift of the mean: compare the two wall thermocouples and plan a SAT.",data:ser(45,4,(i,n)=>0.4+0.9*nrm()+(i>n-10?1.6:0))});
  const q=mk({name:"F-02 quench oil temperature"+ex,kind:"process",src:"manual",unit:"°C",lsl:"50",usl:"80",owner:"Maintenance Head",react:"Above 75 °C: check the cooler and the cooling water.",data:ser(60,3,()=>66+2.2*nrm())});
  /* the other modules' records, when they hold data: added to the plan today (the plan shows as changed) */
  const now={created:td,log:[{d:td,t:"Added to the analysis plan"}]},n0=P.length;
  const SP=satPos().filter(x=>x.pts.length>=3),sp=SP.find(x=>x.key==="F-03|Tempering|01")||SP.sort((a,b)=>b.pts.length-a.pts.length)[0];
  if(sp)mk({...now,name:`SAT difference ${sp.name}`,src:"sat",pos:sp.key,owner:"Maintenance Head",freq:"90",react:"Beyond 70 % of the SAT tolerance: plan the replacement of the thermocouple; outside the tolerance: the SAT failure reaction plan (MWSPL-QP-TC-01)."});
  const sh=scadaHist();if(sh.length){const x=sh.at(-1);mk({...now,name:`${x.furnace} ${x.chamber.toLowerCase()} chamber: readings in tolerance`,src:"scada",furnace:x.furnace,chamber:x.chamber,metric:"intol",lsl:"95",owner:"HT Manager",freq:"7",react:"Below 95 %: open an 8D from the SCADA review of that day."});}
  const rv=(p,days,f,dec,x)=>R.push(fillRev({id:"RV-"+String(R.length+1).padStart(4,"0"),param:p.id,date:d(days),by:"HT Manager"+ex,findings:f,dec,owner:p.owner,log:[{d:d(days),t:"Review recorded"}],...(x||{})}));
  rv(h,62,"Stable around 48.4 HRC, Cpk above 1.33; no signal.","none",{reason:"In control and capable."});
  rv(h,32,"Stable; two lots near 49.5 HRC within the normal scatter.","watch",{reason:"Watch the next lots."});
  rv(z,40,"Mean deviation within ±1 °C, walls agree.","none",{reason:"In control."});
  rv(z,12,"Mean deviation of TC-03 moved up by about 1.5 °C in the last week; the left wall did not move.","act",{action:"SAT of TC-03 brought forward; compare with TC-04 at the next export.",owner:"Maintenance Head",due:d(-5)});
  rv(sc,30,"One week with 70 kg: a lot cracked in the quench (8D opened).","act",{action:"Quench delay checked and the loading standard revised.",owner:"Production Manager",due:d(20),done:d(18),verify:"Scrap back below 35 kg a week since."});
  rv(q,25,"Oil temperature 60–72 °C, stable.","none",{reason:"In control."});
  rv(ts,70,"All lots 1160–1250 MPa.","none",{reason:"Capable."});
  S.plan={rev:1,appr:"R. Sharma, HT Manager"+ex,apprDate:d(200),dirty:false,log:[{d:d(200),t:"Rev 1 approved by R. Sharma, HT Manager (example)"}]};
  if(P.length>n0){S.plan.dirty=true;S.plan.log.push({d:td,t:"Changed after approval: parameters from the SCADA review / Thermocouples modules added"});}await savePlan();
  await batchPut("params",P);await batchPut("reviews",R);toast("Starter set-up loaded");render();}
function armedDelete(b,fn){if(b.classList.contains("armed")){fn();return;}b.classList.add("armed");const t=b.textContent;b.textContent="Confirm";setTimeout(()=>{if(b.isConnected){b.classList.remove("armed");b.textContent=t;}},4000);}
async function download(name,text,type){
  if(S.dl){try{await S.dl.save({filename:name,data:new Blob([text],{type})});return;}catch(e){if(e&&e.code==="declined")return;}}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
const exportJson=()=>download(`mws-trend-${today()}.json`,JSON.stringify({app:"mws-trend-manager",v:1,saved:new Date().toISOString(),params:S.params,reviews:S.reviews,plan:S.plan,config:S.cfg},null,1),"application/json");
const csvQ=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
const csv=()=>download(`mws-trend-plan-${today()}.csv`,"﻿"+[["No.","Parameter","Kind","Data from","Unit","LSL","USL","Review (days)","Owner","Reaction rule"],...planRows()].map(r=>r.map(csvQ).join(",")).join("\r\n"),"text/csv");
function readImport(f){f.text().then(t=>{let o;try{o=JSON.parse(t);}catch(e){toast("Not a JSON file");return;}
  if(!o||o.app!=="mws-trend-manager"||!Array.isArray(o.params)){toast("Not an export of this module");return;}
  const ok=o.params.filter(x=>x&&ID_RE.test(String(x.id||""))),rv=arr(o.reviews).filter(x=>x&&ID_RE.test(String(x.id||"")));
  S.imp={params:ok.map(fillPar),reviews:rv.map(fillRev),plan:o.plan||null,config:o.config||null,msg:`${f.name}: ${plural(ok.length,"parameter")}, ${plural(rv.length,"review")}.`};render();});}
async function doImport(mode){if(!S.imp||!needDb())return;const I=S.imp;S.imp=null;
  if(mode==="replace"){for(const x of S.params)if(!I.params.some(y=>y.id===x.id))await dbDel("params",x.id);for(const x of S.reviews)if(!I.reviews.some(y=>y.id===x.id))await dbDel("reviews",x.id);}
  await batchPut("params",I.params);await batchPut("reviews",I.reviews);
  if(I.plan){const c={...I.plan};delete c.id;await dbSet("config","plan",c);}if(I.config){const c={...DEF,...I.config};delete c.id;await dbSet("config","settings",c);}
  toast("Imported ("+mode+")");render();}
async function clearAll(){if(($("#clrtxt")||{}).value!=="CLEAR ALL"){toast("Type CLEAR ALL to clear");return;}if(!needDb())return;
  for(const x of S.params)await dbDel("params",x.id);for(const x of S.reviews)await dbDel("reviews",x.id);await dbDel("config","settings");await dbDel("config","plan");toast("All trend analysis data cleared");}

/* 12. wiring */
onDoc("click",async e=>{
  const b=e.target.closest("button,tr.click,a[data-docref]");if(!b)return;const d=b.dataset;
  if(b.closest("#modal")||d.close!==undefined){
    if(d.close!==undefined){closeModal();return;}
    const m=S.modal;
    if(d.savePar!==undefined){if(await savePar()){redraw();msg("Saved.",1);}return;}
    if(d.paste!==undefined){pasteData();return;}
    if(d.ddel){m.ed.data.splice(+d.ddel,1);redraw();msg("Point removed: save to keep the change.");return;}
    if(d.parRev!==undefined){const p=parById(m.ed.id);if(p)openModal({kind:"rev",ed:newRev(p),msg:""});return;}
    if(d.parPrint!==undefined){const p=parById(m.ed.id);if(p)openModal({kind:"print",title:"Trend analysis · "+p.name,html:()=>pHead("Trend analysis (CQI-9 HTSA 1.8)")+parBlock(p)});return;}
    if(d.delPar!==undefined){armedDelete(b,async()=>{const n=m.ed.name;await dbDel("params",m.ed.id);await markPlan(`parameter ${n} removed`);toast("Deleted");closeModal();});return;}
    if(d.saveRev!==undefined){if(await saveRev()){redraw();msg("Saved.",1);}return;}
    if(d.delRev!==undefined){armedDelete(b,async()=>{await dbDel("reviews",m.ed.id);toast("Deleted");closeModal();});return;}
    if(d.openRev){const r=S.reviews.find(x=>x.id===d.openRev);if(r)openModal({kind:"rev",ed:clone(r),msg:""});return;}
    if(d.savePlan!==undefined){const by=txt($("#pl-by").value),dt=$("#pl-date").value,chg=$("#pl-chg")?txt($("#pl-chg").value):"";
      if(!by||!isDate(dt)){msg("Enter who approves and the date.");return;}if(dt>today()){msg("Not in the future.");return;}if($("#pl-chg")&&!chg){msg("Enter the change or review note.");return;}
      if(!needDb())return;const rev=isDate(S.plan.apprDate)?(+S.plan.rev||0)+1:Math.max(1,+S.plan.rev||0);
      S.plan={...S.plan,rev,appr:by,apprDate:dt,dirty:false};if(await savePlan(`Rev ${rev} approved by ${by}${chg?": "+chg:""}`)){toast("Analysis plan approved");closeModal();render();}return;}
    if(d.print!==undefined){document.body.classList.add("pm");window.print();setTimeout(()=>document.body.classList.remove("pm"),500);return;}
    return;
  }
  if(d.openPar){parModal(d.openPar);return;}
  if(d.newPar!==undefined){if(needDb())parModal(null);return;}
  if(d.rev){const p=parById(d.rev);if(p&&needDb())openModal({kind:"rev",ed:newRev(p),msg:""});return;}
  if(d.openRev){const r=S.reviews.find(x=>x.id===d.openRev);if(r)openModal({kind:"rev",ed:clone(r),msg:""});return;}
  if(d.planappr!==undefined){if(needDb())openModal({kind:"plan",by:"",date:today(),chg:"",msg:""});return;}
  if(d.planprint!==undefined){openModal({kind:"print",title:"Analysis plan",html:planHtml});return;}
  if(d.h18!==undefined){openModal({kind:"print",title:"HTSA 1.8 evidence",html:h18Html});return;}
  if(d.pf!==undefined){S.filt.pf=d.pf;render();return;}
  if(d.std!==undefined){stdOps();return;}
  if(d.saveCfg!==undefined){document.querySelectorAll("[data-cfg]").forEach(i=>{const k=i.dataset.cfg,t=(SETF.find(x=>x[0]===k)||[])[2];S.cfg[k]=t==="number"?(num(i.value)>0?num(i.value):DEF[k]):i.value;});saveCfg();return;}
  if(d.doc){S.docSel=d.doc;render();return;}
  if(d.docref){e.preventDefault();const p=DOCS.find(x=>x[0].endsWith(d.docref.replace(/^(\.\.\/)+/,"").replace(/^\.\//,"")));if(p){S.docSel=p[0];location.hash="#docs";render();}return;}
  if(d.export!==undefined){exportJson();return;}if(d.csv!==undefined){csv();return;}
  if(d.imp){if(d.imp==="cancel"){S.imp=null;render();}else doImport(d.imp);return;}
  if(d.clear!==undefined){armedDelete(b,clearAll);return;}
});
let RT=0;
const soon=()=>{clearTimeout(RT);RT=setTimeout(()=>{const a=document.activeElement,id=a&&a.id;SC={};redraw();const n=id&&document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(n.value.length,n.value.length);}catch(x){}}},700);};
onDoc("input",e=>{const el=e.target;
  if(S.modal&&S.modal.ed&&el.dataset.p&&el.tagName!=="SELECT"&&el.type!=="checkbox"){setp(S.modal.ed,el.dataset.p,el.value);
    if(S.modal.kind==="par"&&/^(lsl|usl|part|unit|freq)$/.test(el.dataset.p))soon();
    if(S.modal.kind==="rev"){const p=$("#rev-miss");if(p){const m=missRev(S.modal.ed);p.textContent=m.length?"To save: "+m.join(", ")+".":"Complete.";}}}
});
onDoc("change",e=>{const el=e.target;
  if(S.modal&&S.modal.ed&&el.dataset.p){const E=S.modal.ed;
    if(el.type==="checkbox"){setp(E,el.dataset.p,el.checked);return;}
    if(el.tagName==="SELECT"){setp(E,el.dataset.p,el.value);if(el.dataset.p==="src"){E.kind=SRC[E.src].kind||E.kind||"product";}if(el.dataset.p==="tank")E.param="";SC={};redraw();return;}}
  if(el.id==="impfile"&&el.files[0]){readImport(el.files[0]);el.value="";}
});
onDoc("keydown",e=>{if(e.key==="Escape"&&S.modal)closeModal();});
onWin("hashchange",()=>{route();S.pending=false;render();window.scrollTo(0,0);});

/* 13. integration API */
MWS.trend={closeModal,
  /* another module's data changed (SCADA reviews, SAT records): redraw when nothing is being edited */
  refresh:()=>{SC={};safeRender();},
  hasData:()=>S.params.length>0,
  stats:()=>{const k=kp();return {db:S.dbState,...k,label:SCORE[k.score][1],cls:SCORE[k.score][0]};},
  summary:()=>{const k=kp();return `${plural(k.params,"parameter")} analysed (${k.product} product, ${k.process} process), ${plural(k.signals,"signal")} to review, ${plural(k.actionsOpen,"action")} open; HTSA 1.8 ${SCORE[k.score][1].toLowerCase()}.`;}};
window.__TRM={S,assess18,anal,series,choices,missRev,newRev,kp,parFurn};

/* 14. boot */
async function boot(){
  route();render();
  const [dl,user,db]=await Promise.all([useCap("downloads"),useCap("user"),useCap("db")]);
  S.dl=dl;
  if(user){try{const c=await user.can("data.write");S.canWrite=c!==false;}catch(e){}}
  if(db)startStore(sharedDb(db),"on");else startStore(localDb(),"local");
}
boot();
