/* Module TC: thermocouples and protection tubes (CQI-9 HTSA 3.3). Runs inside the shell: ACTIVE, onDoc, onWin, MWS and `location` come from the
   wrapper (build.py). Same pattern as the SPEC module (UI/UX Reuse Handover §5). The accuracy, SAT and interval figures are settings
   flagged to confirm against the controlled CQI-9 copy (Section P3.1 tables, P3.3 and the Process Tables). */

/* 1. collection prefix (shared store only) */
const NS=c=>S.db&&S.db.local?c:"tc-"+c;

/* 2. constants */
const COLS=["tcs","eq","sats","tubes","repl","config"];
const ID_RE=/^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const LKEY="mws-tc-local-v1";
const CH=["Hardening","Tempering"];
const USE={control:"Control",monitor:"Monitoring",record:"Recording",load:"Load (expendable)",otp:"Over-temperature"};
const SATUSE=["control","monitor","record"];
const TYPES=["K","N","J","E","T","R","S","B"];
const BASE=["K","N","J","E","T"];
const DEPTHTYPES=["K","E"];
const TSTAT={inuse:["ok","In use"],spare:["","Spare"],removed:["","Removed"]};
/* tube check results; "replaced" is kept for checks recorded before the rule that element and tube are replaced together (no longer offered) */
const TRES={ok:["ok","OK"],worn:["warn","Worn / scaled: replace the thermocouple"],cracked:["bad","Cracked / burnt through: replace the thermocouple"],replaced:["acc","Replaced"]};
/* replacement cases (as in the CALOR SAT register) */
const R_TUBE="Protection tube failure",R_SAT="SAT failure",R_LIFE="Service life reached (annual replacement)",R_DRIFT="Drift trend / correction near limit (preventive)",R_MOVE="Relocation, immersion-depth change or new installation";
const REASONS=[R_SAT,R_LIFE,R_DRIFT,"Physical damage (sheath, insulation, hot junction)","Open circuit / erratic reading","Used beyond temperature limit or in a damaging atmosphere","TUS failure caused by the sensor",R_TUBE,"Wrong type / not traceable to certificate",R_MOVE,"Other"];
const OFFSET=["Yes","No offset was in use","No — reason in notes"];
const TUSDEC=["TUS planned","Assessed: TUS not required (reason in notes)"];
const ACTIONS=["Replace the thermocouple","Apply / adjust the instrument offset","Recalibrate the controller / recorder","Repair wiring / connection","Re-position the thermocouple","Other"];
const DEF={plant:"Mass Wire and Steels Pvt. Ltd. · Bhiwadi",furnaces:"F-01, F-02, F-03, F-04",rangeH:"700-960",rangeT:"500-900",
  satDays:90,satTol:5.5,warnPct:70,satMin:30,satStep:1,satStab:5,soonDays:14,lifeDays:365,
  accFieldBase:"2.2|0.75",accFieldNoble:"1.5|0.25",accTestBase:"1.1|0.4",accTestNoble:"0.6|0.1",
  reuseDeeper:"yes",maxUses:0,tubeCheckDays:30,tubeReplDays:365,pmReviewDays:365};
const SETF=[["plant","Plant","text"],["furnaces","Furnaces (comma separated)","text"],["rangeH","Range of use, hardening chamber (°C, lo-hi)","text"],["rangeT","Range of use, tempering chamber (°C, lo-hi)","text"],
  ["satDays","SAT interval for control / monitoring / recording TCs (days, Process Table)","number"],["satTol","SAT tolerance ± °C (P3.3)","number"],["warnPct","SAT warning at % of the tolerance","number"],["satMin","SAT: minutes of readings per test","number"],["satStep","SAT: minutes between readings","number"],["satStab","SAT: largest furnace range during the test (°C)","number"],
  ["soonDays","Show as due this many days before","number"],["lifeDays","Replace sensing elements after (days, 0 = off)","number"],
  ["accFieldBase","Calibration accuracy, base-metal control / monitoring / recording TCs (± °C | % of reading, the greater)","text"],["accFieldNoble","Same, noble-metal (R / S / B)","text"],
  ["accTestBase","Calibration accuracy, base-metal test TCs","text"],["accTestNoble","Same, noble-metal test TCs","text"],
  ["reuseDeeper","Reused type K / E test TC: insertion depth at least the deepest earlier use (yes / no)","text"],["maxUses","Test TC: maximum number of uses (0 = no limit)","number"],
  ["tubeCheckDays","Default protection tube check interval (days)","number"],["tubeReplDays","Default protection tube replacement interval (days, 0 = on condition only)","number"],
  ["pmReviewDays","Review the PM schedule every (days)","number"]];
const DOCS=[
  ["TC/00_TC_Master_List.md","Master list"],
  ["TC/01_Procedure/MWSPL-QP-TC-01_Thermocouples_and_Protection_Tubes.md","MWSPL-QP-TC-01 Thermocouples and protection tubes"],
  ["TC/02_Work_Instructions/MWSPL-WI-TC-01_Receive_Calibrate_and_Install_a_Thermocouple.md","MWSPL-WI-TC-01 Receive and install"],
  ["TC/02_Work_Instructions/MWSPL-WI-TC-02_System_Accuracy_Test.md","MWSPL-WI-TC-02 System accuracy test"],
  ["TC/02_Work_Instructions/MWSPL-WI-TC-03_Protection_Tube_Check_and_Replacement.md","MWSPL-WI-TC-03 Protection tubes"],
  ["TC/03_Formats/MWSPL-F-TC-01_Thermocouple_Register.md","MWSPL-F-TC-01 Thermocouple register"],
  ["TC/03_Formats/MWSPL-F-TC-02_SAT_Record.md","MWSPL-F-TC-02 SAT record"],
  ["TC/03_Formats/MWSPL-F-TC-03_Protection_Tube_PM_Schedule_and_Check.md","MWSPL-F-TC-03 Tube PM schedule and check"],
  ["TC/04_Application/mwspl-tc-module.md","Module description"]];

/* 3. helpers */
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{if(v===""||v==null)return null;const n=Number(String(v).replace(",","."));return isFinite(n)?n:null;};
const txt=v=>String(v??"").trim();
const fx=(v,d=1)=>v==null||!isFinite(v)?"—":(Math.round(v*10**d)/10**d).toString();
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
const isNA=v=>/^(n\/?a|not available)$/i.test(String(v||"").trim());
const nextCode=(p,list)=>p+"-"+String(Math.max(0,...list.map(x=>+(String(x.id).match(/(\d+)$/)||[0,0])[1]))+1).padStart(4,"0");
const rng=s=>{const m=String(s||"").match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);return m?[+m[1],+m[2]]:[null,null];};
const acc=s=>{const [a,p]=String(s||"").split("|").map(num);return {a:a||0,p:p||0};};

/* 4. state */
const S={view:"dash",db:null,dbState:"connecting",canWrite:true,dl:null,tcs:[],eq:[],sats:[],tubes:[],repl:[],cfg:{...DEF},pm:{rev:0,appr:"",apprDate:"",ref:"",dirty:false,log:[]},
  docSel:DOCS[0][0],imp:null,modal:null,pending:false,filt:{f:"",ch:"",st:"inuse",q:"",tr:""},unsub:[],q:{}};
const C=()=>S.cfg;

/* 5. domain logic */
function fillTc(o){const d={id:"",tag:"",furnace:"",chamber:"Hardening",zone:"",use:"control",type:"K",serial:"",sheath:"",installed:"",status:"inuse",removed:"",reason:"",replacedBy:"",
  useLo:"",useHi:"",cal:{cert:"",lab:"",date:"",lo:"",hi:"",maxErr:""},tube:{mat:"",installed:"",checkDays:"",replDays:""},notes:"",log:[]};
  const x={...d,...(o||{})};x.cal={...d.cal,...((o&&o.cal)||{})};x.tube={...d.tube,...((o&&o.tube)||{})};if(!Array.isArray(x.log))x.log=[];
  /* element and protection tube are installed and replaced together (one assembly): the tube's installation date is the element's */
  if(isDate(x.installed))x.tube.installed=x.installed;return x;}
function fillEq(o){const d={id:"",kind:"testtc",ident:"",type:"K",make:"",model:"",serial:"",lo:"",hi:"",lc:"",lab:"",cert:"",calDate:"",calDue:"",cl:"95",k:"2",obs:[],corr:"",maxErr:"",uses0:"0",active:true,notes:"",log:[]};const x={...d,...(o||{})};if(!Array.isArray(x.log))x.log=[];
  x.obs=(Array.isArray(x.obs)?x.obs:[]).map(r=>({std:String(r&&r.std!=null?r.std:""),mv:String(r&&r.mv!=null?r.mv:""),uuc:String(r&&r.uuc!=null?r.uuc:""),unc:String(r&&r.unc!=null?r.unc:"")}));return x;}
/* the thermal calibration observations of a test TC / instrument: error = UUC (unit under calibration) °C − standard temperature;
   the expanded uncertainty is stated at a confidence level (cl %) with a coverage factor k, as on the certificate */
function obsOf(q){return (q.obs||[]).map((r,i)=>{const std=num(r.std),uuc=num(r.uuc),unc=num(r.unc);return {i,raw:r,std,mv:num(r.mv),uuc,unc,err:std!=null&&uuc!=null?Math.round((uuc-std)*100)/100:null};}).filter(r=>r.std!=null||r.uuc!=null);}
function obsMax(q){const O=obsOf(q).filter(r=>r.err!=null);return O.length?O.reduce((m,r)=>Math.abs(r.err)>Math.abs(m.err)?r:m):null;}
/* the correction of a test TC / instrument at a temperature from its calibration observations: correction = −error (UUC − standard),
   linear between the two observed points either side; outside the observed points the nearest one is used and noted (no extrapolation) */
const CORR_TOL=0.1;
function corrAt(q,T){if(!q||T==null)return null;const O=obsOf(q).filter(r=>r.err!=null).sort((a,b)=>a.std-b.std);if(!O.length)return null;
  const r2=v=>Math.round(v*100)/100+0,ex=O.find(r=>Math.abs(r.std-T)<1e-9);
  if(ex)return {c:r2(-ex.err),T,how:`at the ${ex.std} °C point`,out:false};
  if(T<O[0].std||T>O[O.length-1].std){const n=T<O[0].std?O[0]:O[O.length-1];return {c:r2(-n.err),T,how:`${T<n.std?"below":"above"} the calibration points: the ${n.std} °C point used`,out:true};}
  let i=0;while(O[i+1].std<T)i++;const a=O[i],b=O[i+1],e=a.err+(b.err-a.err)*(T-a.std)/(b.std-a.std);
  return {c:r2(-e),T,how:`interpolated between ${a.std} and ${b.std} °C`,out:false};}
/* the temperature the test equipment saw: the mean test reading, else the set point */
function satTemp(r){const R=readingsOf(r);return R.length?Math.round(R.reduce((x,y)=>x+y.t,0)/R.length*10)/10:num(r.sp);}
/* calibration corrections of a SAT's test instrument and test TC, and whether the corrections entered agree with them */
function satCorrs(r){const T=satTemp(r);return [["instr","instrCorr","test instrument"],["tc","tcCorr","test TC"]].map(([k,f,l])=>{const q=eqById(k==="tc"?r.testTc:r.instr),c=corrAt(q,T),v=num(r[f]);
  return {k,f,l,q,c,v,off:!!(c&&v!=null&&Math.abs(v-c.c)>CORR_TOL+1e-9)};});}
/* completeness of the calibration record (not a validity rule: shown in the dialog and the register) */
function calRecIssues(q){const I=[],O=obsOf(q);
  if(!q.make&&!q.model)I.push("make / model not recorded");if(num(q.lo)==null||num(q.hi)==null)I.push("calibrated range not recorded");else if(num(q.lo)>=num(q.hi))I.push("range: the lower limit is not below the upper");
  if(!q.lc)I.push("least count not recorded");
  if(!O.length)I.push("no thermal calibration observations");else{
    if(O.some(r=>r.std==null||r.uuc==null))I.push("an observation without the standard temperature or the UUC reading");
    if(O.some(r=>r.unc==null))I.push("an observation without its uncertainty");
    if(num(q.cl)==null||num(q.k)==null)I.push("confidence level / coverage factor k not stated");
    const lo=num(q.lo),hi=num(q.hi);if(lo!=null&&hi!=null&&O.some(r=>r.std!=null&&(r.std<lo||r.std>hi)))I.push("an observation outside the calibrated range");
    const m=obsMax(q);if(m&&num(q.maxErr)!=null&&Math.abs(m.err)>Math.abs(num(q.maxErr))+1e-9)I.push(`largest observed error ${fx(m.err)} °C at ${m.std} °C is above the largest error entered (±${q.maxErr} °C)`);}
  return I;}
function fillSat(o){const d={id:"",tc:"",date:"",time:"",by:"",sp:"",instr:"",testTc:"",depth:"",rd:[],fRdg:"",tRdg:"",instrCorr:"",tcCorr:"",notes:"",appr:{by:"",date:""},
  act:{kind:"",cause:"",action:"",impact:"",by:"",date:""},src:null,log:[]};const x={...d,...(o||{})};x.appr={...d.appr,...((o&&o.appr)||{})};x.act={...d.act,...((o&&o.act)||{})};if(x.act.kind==="Replace the element")x.act.kind=ACTIONS[0];if(!Array.isArray(x.log))x.log=[];if(!Array.isArray(x.rd))x.rd=[];x.rd=x.rd.map(y=>({f:y&&y.f!=null?String(y.f):"",t:y&&y.t!=null?String(y.t):""}));return x;}
function fillRepl(o){const x={id:"",oldTc:"",newTc:"",date:"",time:"",oldSerial:"",oldInstalled:"",newSerial:"",newType:"K",cert:"",reason:R_SAT,offset:"",tus:"",satRef:"",by:"",notes:"",log:[],...(o||{})};if(!Array.isArray(x.log))x.log=[];return x;}
function fillTube(o){return {id:"",tc:"",date:"",by:"",res:"ok",note:"",mat:"",...(o||{})};}
const furnaces=()=>[...new Set(String(C().furnaces||"").split(/[,;\s]+/).filter(Boolean).concat(S.tcs.map(t=>t.furnace).filter(Boolean)))].sort();
const tcNo=tag=>{const m=String(tag||"").match(/(\d+)\s*$/);return m?+m[1]:null;};
const wallOf=tag=>{const n=tcNo(tag);return n==null?"":n%2?"right wall":"left wall";};
const zoneOf=e=>num(e.zone)??(tcNo(e.tag)?Math.ceil(tcNo(e.tag)/2):null);
const tcName=e=>e?`${e.furnace} ${e.chamber[0]} ${e.tag||"?"}`:"—";
const tcById=id=>S.tcs.find(x=>x.id===id);
const eqById=id=>S.eq.find(x=>x.id===id);
const inUse=()=>S.tcs.filter(e=>e.status==="inuse");
const useRange=e=>{const [a,b]=rng(e.chamber==="Tempering"?C().rangeT:C().rangeH);return [num(e.useLo)??a,num(e.useHi)??b];};
const isBase=t=>BASE.includes(t);
const limAt=(type,test,T)=>{const c=C(),q=acc(test?(isBase(type)?c.accTestBase:c.accTestNoble):(isBase(type)?c.accFieldBase:c.accFieldNoble));return Math.max(q.a,(q.p/100)*Math.abs(T||0));};

/* P3.1: calibrated before first use, over the range of use, within the accuracy of the tables */
function calIssues(e){const I=[],c=e.cal,[lo,hi]=useRange(e);
  if(!c.cert)I.push("no calibration certificate");
  if(!isDate(c.date))I.push("calibration date missing");else if(isDate(e.installed)&&c.date>e.installed)I.push("calibrated after it was put into use");
  if(num(c.lo)==null||num(c.hi)==null)I.push("calibrated range missing");else if((lo!=null&&num(c.lo)>lo)||(hi!=null&&num(c.hi)<hi))I.push(`calibrated ${c.lo}–${c.hi} °C does not cover the range of use ${lo}–${hi} °C`);
  if(num(c.maxErr)==null)I.push("largest calibration error missing");else{const L=limAt(e.type,false,hi);if(Math.abs(num(c.maxErr))>L)I.push(`calibration error ${c.maxErr} °C beyond ±${fx(L,1)} °C (type ${e.type} at ${hi} °C)`);}
  return I;}
function eqIssues(q,day){const I=[];day=day||today();
  if(!q.cert)I.push("no calibration certificate");if(!isDate(q.calDue))I.push("calibration due date missing");else if(q.calDue<day)I.push("calibration expired "+fmtD(q.calDue));
  const mo=obsMax(q),me=num(q.maxErr)!=null?Math.abs(num(q.maxErr)):mo?Math.abs(mo.err):null;
  if(q.kind==="testtc"&&me!=null){const hi=Math.max(...[rng(C().rangeH)[1],rng(C().rangeT)[1]].filter(x=>x!=null),0);const LL=limAt(q.type,true,hi);if(me>LL)I.push(`calibration error ±${fx(me)} °C beyond the test TC accuracy ±${fx(LL,1)} °C`);}
  return I;}
/* the SAT readings: a series of furnace / test pairs over C().satMin minutes, one every C().satStep minutes;
   a record made before the series has a single pair (fRdg, tRdg) and is read as one reading (legacy) */
const nRd=()=>Math.max(1,Math.round((+C().satMin||30)/(+C().satStep||1)));
const legacy=r=>!(r.rd||[]).length&&(num(r.fRdg)!=null||num(r.tRdg)!=null);
function readingsOf(r){if(legacy(r)){const f=num(r.fRdg),t=num(r.tRdg);return f!=null&&t!=null?[{f,t,i:0}]:[];}
  return (r.rd||[]).map((x,i)=>({f:num(x.f),t:num(x.t),i})).filter(x=>x.f!=null&&x.t!=null);}
function rdTime(r,i){const m=/^(\d{2}):(\d{2})/.exec(r.time||"");if(!m)return "";const sec=Math.round((+m[1]*60+ +m[2]+i*(+C().satStep||1))*60);
  const hh=pad(Math.floor(sec/3600)%24),mm=pad(Math.floor(sec/60)%60),ss=sec%60;return hh+":"+mm+(ss?":"+pad(ss):"");}
/* SAT difference = mean over the readings of furnace − (test + instrument correction + test TC correction) */
function satEval(r){const R=readingsOf(r);if(!R.length)return {diff:null,res:null,invalid:[],notes:[],n:0,list:[]};
  const k0=(num(r.instrCorr)||0)+(num(r.tcCorr)||0),r1=v=>Math.round(v*10)/10,mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const list=R.map(x=>({...x,d:r1(x.f-(x.t+k0))})),dl=list.map(x=>x.f-(x.t+k0)),fl=R.map(x=>x.f);
  const diff=r1(mean(dl)),tol=+C().satTol,inv=[],notes=[];
  const it=eqById(r.instr),tt=eqById(r.testTc);
  if(!it)inv.push("test instrument not identified");else if(!isDate(it.calDue)||it.calDue<r.date)inv.push(`test instrument ${it.ident} out of calibration on the test day`);
  if(!tt)inv.push("test thermocouple not identified");else if(!isDate(tt.calDue)||tt.calDue<r.date)inv.push(`test thermocouple ${tt.ident} out of calibration on the test day`);
  const d=depthIssues(r);inv.push(...d);
  satCorrs(r).forEach(x=>{if(!x.c)return;if(x.off)notes.push(`${x.l} correction ${fx(x.v,2)} °C differs from its calibration (${fx(x.c.c,2)} °C at ${x.c.T} °C, ${x.c.how})`);
    else if(x.c.out)notes.push(`${x.l} correction: ${x.c.T} °C is ${x.c.how}`);});
  [it,tt].forEach(q=>{const sp=num(r.sp);if(q&&sp!=null&&num(q.lo)!=null&&num(q.hi)!=null&&(sp<num(q.lo)||sp>num(q.hi)))notes.push(`set point ${sp} °C outside the calibrated range of ${q.ident} (${q.lo}–${q.hi} °C)`);});
  let res=Math.abs(diff)>tol?"fail":Math.abs(diff)>tol*C().warnPct/100?"warn":"pass";
  const over=dl.filter(x=>Math.abs(x)>tol).length,fRange=r1(Math.max(...fl)-Math.min(...fl));
  if(over){notes.push(`${over} of ${R.length} readings outside ±${tol} °C (${fx(Math.min(...dl))} to ${fx(Math.max(...dl))} °C)`);if(res==="pass")res="warn";}
  if(R.length>1&&fRange>+C().satStab)notes.push(`furnace reading varied by ${fRange} °C during the test (limit ${C().satStab} °C): check the furnace was stable`);
  if(legacy(r))notes.push("single reading (recorded before the "+C().satMin+"-minute series)");
  const sp=num(r.sp);if(sp!=null&&Math.abs(mean(fl)-sp)>15)notes.push(`furnace reading ${fx(mean(fl)-sp)} °C from the set point`);
  return {diff,res,invalid:inv,tol,notes,n:R.length,list,over,fRange,fMean:r1(mean(fl)),tMean:r1(mean(R.map(x=>x.t))),dMin:r1(Math.min(...dl)),dMax:r1(Math.max(...dl))};}
/* the chart of the SAT difference per reading against ±tolerance (one series, no legend) */
function satChart(r,v){if(!v||v.n<2)return "";const n=Math.max(v.n,(r.rd||[]).length),tol=v.tol,W=640,H=170,L=40,Rr=10,T=10,B=26;
  const lim=Math.max(tol*1.4,...v.list.map(x=>Math.abs(x.d)))*1.05,X=i=>L+(n>1?i/(n-1):0)*(W-L-Rr),Y=d=>T+(lim-d)/(2*lim)*(H-T-B);
  const pts=v.list.map(x=>`${fx(X(x.i),1)},${fx(Y(x.d),1)}`).join(" "),tk=[-tol,0,tol];
  return `<svg class="satc" viewBox="0 0 ${W} ${H}" role="img" aria-label="SAT difference per reading"><rect x="${L}" y="${Y(tol)}" width="${W-L-Rr}" height="${Y(-tol)-Y(tol)}" fill="var(--band)"/>
  ${tk.map(t=>`<line x1="${L}" x2="${W-Rr}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line)" ${t?'stroke-dasharray="4 3"':""}/><text x="${L-6}" y="${Y(t)+4}" text-anchor="end">${t>0?"+":""}${fx(t)}</text>`).join("")}
  ${[0,Math.floor((n-1)/2),n-1].map((i,j)=>`<text x="${X(i)}" y="${H-8}" text-anchor="${["start","middle","end"][j]}">${esc(rdTime(r,i))}</text>`).join("")}
  <polyline points="${pts}" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round"/>
  ${v.list.map(x=>`<circle cx="${fx(X(x.i),1)}" cy="${fx(Y(x.d),1)}" r="${Math.abs(x.d)>tol?4:2.5}" fill="${Math.abs(x.d)>tol?"var(--bad)":"var(--s1)"}" stroke="var(--panel)" stroke-width="1.5"><title>${esc(rdTime(r,x.i))} · furnace ${x.f} · test ${x.t} · difference ${fx(x.d)} °C</title></circle>`).join("")}</svg>`;}
/* P3.1.3.3: a reused type K / E test TC has its insertion depth documented (and, by site rule, not shallower than before) */
function depthIssues(r){const tt=eqById(r.testTc);if(!tt||!DEPTHTYPES.includes(tt.type))return [];const I=[];
  const prev=S.sats.filter(x=>x.testTc===r.testTc&&x.id!==r.id&&(x.date<r.date||(x.date===r.date&&x.time<r.time)));
  const uses=prev.length+(num(tt.uses0)||0);
  if(num(r.depth)==null)I.push(`insertion depth of type ${tt.type} test TC ${tt.ident} not documented`);
  else if(uses>0&&C().reuseDeeper!=="no"){const mx=Math.max(0,...prev.map(x=>num(x.depth)||0));if(mx&&num(r.depth)<mx)I.push(`test TC ${tt.ident} reused at ${r.depth} mm, shallower than its earlier use at ${mx} mm`);}
  if(+C().maxUses>0&&uses>=+C().maxUses)I.push(`test TC ${tt.ident} used ${uses + 1} times (limit ${C().maxUses})`);
  return I;}
/* P3.3.5: what a SAT record must hold */
function satMissing(r){const m=[];const tc=tcById(r.tc),it=eqById(r.instr),tt=eqById(r.testTc);
  if(!tc)m.push("thermocouple tested");if(!isDate(r.date))m.push("date");if(!/^\d{2}:\d{2}/.test(r.time||""))m.push("time");if(!r.by)m.push("technician");
  if(num(r.sp)==null)m.push("set point");if(!it)m.push("test instrument");if(!tt)m.push("test thermocouple");
  if(legacy(r)){if(num(r.fRdg)==null)m.push("furnace reading");if(num(r.tRdg)==null)m.push("test reading");}
  else{const k=readingsOf(r).length,n=nRd();if(k<n)m.push(`readings over ${C().satMin} min (${k} of ${n} furnace / test pairs)`);}
  if(r.instrCorr==="")m.push("instrument correction (0 if none)");if(r.tcCorr==="")m.push("test TC correction (0 if none)");
  if(tt&&DEPTHTYPES.includes(tt.type)&&num(r.depth)==null)m.push("insertion depth");
  if(!r.appr.by||!isDate(r.appr.date))m.push("approval (by, date)");
  return m;}
const actMissing=r=>{const a=r.act,m=[];if(!a.kind)m.push("action taken");if(a.kind===ACTIONS[0]&&!S.repl.some(x=>x.satRef===r.id))m.push("a replacement record linked to this SAT (Replace thermocouple…)");if(!a.cause)m.push("cause");if(!a.action)m.push("corrective action");if(!a.impact)m.push("product impact");if(!a.by)m.push("owner");if(!isDate(a.date))m.push("date");return m;};
const satsOf=id=>S.sats.filter(r=>r.tc===id).sort((a,b)=>(a.date+a.time)<(b.date+b.time)?1:-1);
const validSat=r=>{const v=satEval(r);return v.res&&!v.invalid.length&&!satMissing(r).filter(x=>!/approval/.test(x)).length;};
/* replacement records: the verification SAT = the first valid SAT of the fitted element on or after the replacement (not the SAT that found it) */
const replOf=id=>S.repl.filter(r=>r.newTc===id).sort((a,b)=>(a.date+a.time)<(b.date+b.time)?-1:1);
const verifySat=r=>r.newTc?S.sats.filter(x=>x.tc===r.newTc&&x.id!==r.satRef&&x.date>=r.date&&validSat(x)).sort((a,b)=>(a.date+a.time)<(b.date+b.time)?-1:1)[0]||null:null;
function replMissing(r){const m=[];if(!isDate(r.date))m.push("date");if(!r.reason)m.push("reason");if(!r.offset)m.push("controller offset reset");if(r.reason===R_MOVE&&!r.tus)m.push("TUS decision");
  if(!txt(r.newSerial))m.push("fitted element serial");if(!txt(r.by))m.push("replaced by");if(r.offset===OFFSET[2]&&!txt(r.notes))m.push("why the offset was not reset (notes)");return m;}
/* the SAT state of an element: needed only for control / monitoring / recording TCs */
function satState(e){
  if(!SATUSE.includes(e.use))return {st:"na",txt:"not required"};
  const rp=replOf(e.id).at(-1);if(rp&&!verifySat(rp))return {st:"repl",txt:"SAT due after the replacement of "+fmtD(rp.date),due:rp.date,repl:rp};
  const L=satsOf(e.id).filter(r=>!isDate(e.installed)||r.date>=e.installed),V=L.filter(validSat);
  const last=V[0],lastPass=V.find(r=>satEval(r).res!=="fail");
  if(last&&satEval(last).res==="fail"){const reSat=lastPass&&lastPass.date>=last.date?lastPass:null;if(!reSat)return {st:"fail",txt:"last SAT failed "+fmtD(last.date),last};}
  if(!lastPass)return {st:"none",txt:isDate(e.installed)?"no SAT since installed "+fmtD(e.installed):"no SAT",last};
  const due=addDays(lastPass.date,+C().satDays),d=today();
  const st=due<d?"overdue":addDays(d,+C().soonDays)>=due?"soon":"ok";
  return {st,due,last:lastPass,txt:(st==="overdue"?"SAT overdue since ":"SAT due ")+fmtD(due)};}
function lifeOf(e){if(!(+C().lifeDays>0)||!isDate(e.installed))return {st:isDate(e.installed)?"off":"unknown"};const due=addDays(e.installed,+C().lifeDays),d=today();
  return {st:due<d?"over":addDays(d,+C().soonDays)>=due?"soon":"ok",due};}
const tubesOf=id=>S.tubes.filter(t=>t.tc===id).sort((a,b)=>a.date<b.date?1:-1);
function tubeState(e){const t=e.tube,ck=num(t.checkDays),rp=num(t.replDays);
  if(!t.mat||!ck)return {st:"nopm",txt:"not in the PM schedule"};
  const L=tubesOf(e.id).filter(c=>!isDate(e.installed)||c.date>=e.installed),last=L[0],d=today();   /* checks of this assembly only */
  if(last&&(last.res==="worn"||last.res==="cracked"))return {st:"bad",txt:`${TRES[last.res][1]} (${fmtD(last.date)})`,last};
  const from=last&&last.date>(e.installed||"")?last.date:e.installed;if(!isDate(from))return {st:"none",txt:"never checked"};
  const due=addDays(from,ck),rdue=rp&&isDate(e.installed)?addDays(e.installed,rp):null;
  if(rdue&&rdue<d)return {st:"replover",txt:"tube life reached "+fmtD(rdue)+": replace the thermocouple",due,rdue,last};
  const st=due<d?"overdue":addDays(d,+C().soonDays)>=due||(rdue&&addDays(d,+C().soonDays)>=rdue)?"soon":"ok";
  return {st,txt:(st==="overdue"?"check overdue since ":"check due ")+fmtD(due)+(rdue?" · replace by "+fmtD(rdue):""),due,rdue,last};}
const pmReview=()=>{const p=S.pm;if(!isDate(p.apprDate))return {st:"none"};const due=addDays(p.apprDate,+C().pmReviewDays);return {st:due<today()?"overdue":"ok",due};};

/* HTSA 3.3 */
const SCORE={s:["ok","Satisfactory","acc"],ns:["warn","Not satisfactory","cond"],nia:["bad","Needs immediate action","rej"]};
const LV={ok:["ok","Met"],warn:["warn","Attention"],crit:["bad","Not met"],info:["acc","Note"]};
function assess33(){
  const U=inUse(),I=[],add=(req,lvl,ev,act)=>I.push({req,lvl,ev,act});
  const cal=U.map(e=>({e,i:calIssues(e)})).filter(x=>x.i.length);
  add("Thermocouples calibrated before first use, over the range of use, within the P3.1 accuracy",!U.length?"crit":cal.length?"crit":"ok",
    !U.length?"No thermocouple in use is registered.":cal.length?cal.slice(0,6).map(x=>`${tcName(x.e)}: ${x.i.join(", ")}`).join("; ")+(cal.length>6?` … (${cal.length})`:""):`${plural(U.length,"thermocouple")} in use, each with a certificate dated before installation covering its range of use.`,
    cal.length?"Obtain or attach the calibration certificate; replace an element that was not calibrated before use or does not meet the accuracy.":"");
  const need=U.filter(e=>SATUSE.includes(e.use)).map(e=>({e,s:satState(e)}));
  const bad=need.filter(x=>["none","overdue","fail","repl"].includes(x.s.st)),soon=need.filter(x=>x.s.st==="soon");
  add(`Control, monitoring and recording TCs SAT checked every ${C().satDays} days (Process Table, P3.3)`,!need.length?"crit":bad.length?"crit":soon.length?"warn":"ok",
    !need.length?"No control, monitoring or recording thermocouple is registered.":bad.length?bad.slice(0,8).map(x=>`${tcName(x.e)}: ${x.s.txt}`).join("; ")+(bad.length>8?` … (${bad.length})`:""):soon.length?`${plural(soon.length,"SAT")} due within ${C().soonDays} days.`:`${plural(need.length,"thermocouple")} with a passing SAT in date.`,
    bad.length?"Run the SAT (WI-TC-02); a failed SAT needs its reaction and a passing re-SAT.":"");
  const rOpen=S.repl.filter(r=>{const n=tcById(r.newTc);return n&&n.status==="inuse"&&SATUSE.includes(n.use)&&!verifySat(r);}),rInc=S.repl.filter(r=>replMissing(r).length);
  add("Replaced elements recorded and verified by a SAT before use",rOpen.length?"crit":rInc.length?"warn":S.repl.length?"ok":"info",
    rOpen.length?rOpen.map(r=>`${tcName(tcById(r.newTc))}: replaced ${fmtD(r.date)} (${r.reason}), no SAT since`).join("; "):rInc.length?rInc.map(r=>`${r.id}: ${replMissing(r).join(", ")}`).join("; "):S.repl.length?`${plural(S.repl.length,"replacement")} recorded, each verified by a SAT.`:"No replacement recorded.",
    rOpen.length?"Run the SAT of the fitted element (WI-TC-02).":rInc.length?"Complete the replacement records (Thermocouple replacements).":"");
  const kE=S.sats.filter(r=>{const t=eqById(r.testTc);return t&&DEPTHTYPES.includes(t.type);}),dI=kE.map(r=>({r,i:depthIssues(r)})).filter(x=>x.i.length);
  add("Insertion depth of reused type K / E test thermocouples documented (P3.1.3.3)",dI.length?"crit":kE.length?"ok":"info",
    dI.length?dI.slice(0,5).map(x=>`${x.r.id}: ${x.i.join(", ")}`).join("; "):kE.length?`${plural(kE.length,"SAT")} with a type K / E test TC, each with its insertion depth.`:"No SAT with a type K / E test thermocouple recorded.",
    dI.length?"Record the insertion depth on the SAT record; do not reuse a test TC shallower than before.":"");
  const recs=S.sats.map(r=>({r,m:satMissing(r),v:satEval(r)})),inc=recs.filter(x=>x.m.length),inv=recs.filter(x=>x.v.invalid.length&&!x.m.length);
  const openAct=recs.filter(x=>x.v.res==="fail"&&actMissing(x.r).length);
  add("SAT records meet P3.3.5 (identification, instruments and calibration, readings, corrections, difference, result, technician, approval)",inc.length||inv.length||openAct.length?"crit":S.sats.length?"ok":"crit",
    !S.sats.length?"No SAT record.":[inc.length?`${plural(inc.length,"record")} incomplete (${inc.slice(0,4).map(x=>x.r.id+": "+x.m.join(", ")).join("; ")})`:"",inv.length?`${plural(inv.length,"record")} invalid (${inv.slice(0,3).map(x=>x.r.id+": "+x.v.invalid[0]).join("; ")})`:"",openAct.length?`${plural(openAct.length,"failed SAT")} without a complete reaction`:""].filter(Boolean).join(" · ")||`${plural(S.sats.length,"SAT record")} complete and approved.`,
    inc.length||inv.length||openAct.length?"Complete and approve the records; repeat a SAT run with equipment out of calibration.":"");
  const pr=pmReview(),noPm=U.filter(e=>tubeState(e).st==="nopm"),tB=U.map(e=>({e,t:tubeState(e)})),tBad=tB.filter(x=>["bad","overdue","replover","none"].includes(x.t.st)),tSoon=tB.filter(x=>x.t.st==="soon");
  add("Protection tubes checked or replaced to a documented preventive maintenance schedule",!isDate(S.pm.apprDate)||noPm.length||tBad.length||pr.st==="overdue"?"crit":S.pm.dirty||tSoon.length?"warn":"ok",
    [!isDate(S.pm.apprDate)?"PM schedule not approved":`PM schedule rev ${S.pm.rev} approved ${fmtD(S.pm.apprDate)} by ${S.pm.appr}${S.pm.ref?" ("+S.pm.ref+")":""}${S.pm.dirty?", changed since":""}${pr.st==="overdue"?", review overdue":""}`,
      noPm.length?`${plural(noPm.length,"thermocouple")} without a tube interval`:"",tBad.length?tBad.slice(0,6).map(x=>`${tcName(x.e)}: ${x.t.txt}`).join("; "):"",tSoon.length?`${plural(tSoon.length,"tube")} due soon`:""].filter(Boolean).join(" · "),
    "Approve the schedule (PM schedule view), check every tube due (WI-TC-03) and replace worn tubes.");
  const lo=U.map(e=>({e,l:lifeOf(e)})).filter(x=>x.l.st==="over"),ls=U.map(e=>({e,l:lifeOf(e)})).filter(x=>x.l.st==="soon");
  if(+C().lifeDays>0)add(`Sensing elements replaced within ${C().lifeDays} days (site schedule)`,lo.length?"crit":ls.length?"warn":"ok",
    lo.length?lo.slice(0,6).map(x=>`${tcName(x.e)} installed ${fmtD(x.e.installed)}`).join("; "):ls.length?`${plural(ls.length,"element")} due for replacement soon.`:"No element past its life.",lo.length?"Replace the element and run a SAT before use.":"");
  const crit=I.filter(i=>i.lvl==="crit").length;
  const nia=!U.length||need.some(x=>x.e.use==="control"&&(x.s.st==="fail"||(x.s.st==="none"&&!S.sats.some(r=>r.tc===x.e.id))));
  return {I,score:nia?"nia":crit?"ns":"s",crit};}
function kp(){const U=inUse(),need=U.filter(e=>SATUSE.includes(e.use)).map(e=>satState(e)),T=U.map(tubeState),A=assess33();
  return {inUse:U.length,satOk:need.filter(s=>s.st==="ok"||s.st==="soon").length,satNeed:need.length,satOver:need.filter(s=>["none","overdue"].includes(s.st)).length,satFail:need.filter(s=>s.st==="fail").length,
    satSoon:need.filter(s=>s.st==="soon").length,calBad:U.filter(e=>calIssues(e).length).length,tubeBad:T.filter(t=>["bad","overdue","replover","none","nopm"].includes(t.st)).length,tubeSoon:T.filter(t=>t.st==="soon").length,
    lifeOver:U.filter(e=>lifeOf(e).st==="over").length,replOpen:U.filter(e=>satState(e).st==="repl").length,eqBad:S.eq.filter(q=>q.active&&eqIssues(q).length).length,score:A.score,notMet:A.crit};}

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
async function savePm(t){S.pm.log=S.pm.log||[];if(t)S.pm.log.push({d:today(),t});try{await dbSet("config","pm",S.pm);return true;}catch(e){toast("Not saved: "+errMsg(e));return false;}}
async function markPm(t){if(isDate(S.pm.apprDate)&&!S.pm.dirty){S.pm.dirty=true;await savePm(t+" (PM schedule changed after approval)");}}
async function saveCfg(){if(!needDb())return;try{await dbSet("config","settings",S.cfg);toast("Settings saved");}catch(e){toast("Not saved: "+errMsg(e));}}
async function batchPut(c,L){for(let i=0;i<L.length;i+=8)await Promise.all(L.slice(i,i+8).map(o=>dbSet(c,o.id,o)));}
function startStore(store,state){
  S.unsub.forEach(u=>{try{u();}catch(e){}});S.db=store;S.dbState=state;
  const srt=(a,b)=>a.id<b.id?-1:1;
  S.unsub=[store.sub("tcs",L=>{S.tcs=L.map(fillTc).sort((a,b)=>(a.furnace+a.chamber+(tcNo(a.tag)??99)/100+a.id)<(b.furnace+b.chamber+(tcNo(b.tag)??99)/100+b.id)?-1:1);safeRender();}),
    store.sub("eq",L=>{S.eq=L.map(fillEq).sort(srt);safeRender();}),
    store.sub("sats",L=>{S.sats=L.map(fillSat).sort(srt);safeRender();}),
    store.sub("tubes",L=>{S.tubes=L.map(fillTube).sort(srt);safeRender();}),
    store.sub("repl",L=>{S.repl=L.map(fillRepl).sort(srt);safeRender();}),
    store.sub("config",L=>{const c=L.find(x=>x.id==="settings"),p=L.find(x=>x.id==="pm");S.cfg={...DEF,...(c||{})};delete S.cfg.id;
      S.pm={rev:0,appr:"",apprDate:"",ref:"",dirty:false,log:[],...(p||{})};delete S.pm.id;safeRender();})];
  render();
}
function safeRender(){
  const a=document.activeElement;if(S.modal||(a&&$("#main")&&$("#main").contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=true;return;}
  render();
}
onDoc("focusout",()=>setTimeout(()=>{if(S.pending&&!S.modal){const a=document.activeElement;if(!(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=false;render();}}},0));

/* 7. navigation */
const NAV=[["",[["dash","Dashboard"]]],["P",[["tcs","Thermocouples"],["pm","PM schedule & settings"],["eq","Test equipment"]]],["D",[["sat","SAT records"],["tube","Tube checks"],["repl","Thermocouple replacements"]]],
  ["C",[["review","Due list & HTSA 3.3"]]],["A",[["act","Reactions"]]],["",[["rules","Rules"],["docs","Documentation"],["data","Data"]]]];
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
const SATP={repl:["bad","SAT due after replacement"],ok:["ok","SAT ok"],soon:["warn","SAT due soon"],overdue:["bad","SAT overdue"],none:["bad","No SAT"],fail:["bad","SAT failed"],na:["","No SAT needed"]};
const TUBP={ok:["ok","Tube ok"],soon:["warn","Tube due soon"],overdue:["bad","Tube check overdue"],none:["bad","Tube never checked"],nopm:["bad","No tube PM"],bad:["bad","Tube: replace TC"],replover:["bad","Tube life: replace TC"]};
const satPill=(e,inl)=>{const s=satState(e);return pill(SATP[s.st][0],SATP[s.st][1]+(inl&&s.due?" "+fmtD(s.due):""))+(!inl&&s.due?`<br><span class="small muted">${fmtD(s.due)}</span>`:"");};
const tubePill=(e,inl)=>{const t=tubeState(e);return pill(TUBP[t.st][0],TUBP[t.st][1]+(inl&&t.due?" "+fmtD(t.due):""))+(!inl&&t.due?`<br><span class="small muted">${fmtD(t.due)}</span>`:"");};
const resPill=r=>{const v=satEval(r);if(!v.res)return pill("","Incomplete");if(v.invalid.length)return pill("bad","Invalid");return v.res==="fail"?pill("bad","Fail "+fx(v.diff)+" °C"):v.res==="warn"?pill("warn","Pass "+fx(v.diff)+" °C (warning)"):pill("ok","Pass "+fx(v.diff)+" °C");};
function attention(){
  const U=inUse(),out=[];
  U.forEach(e=>{const s=satState(e);if(["fail","overdue","none","repl"].includes(s.st))out.push([s.st==="repl"?`#repl`:`#review`,`${tcName(e)}: ${s.txt}`,"bad"]);});
  S.repl.forEach(r=>{const m=replMissing(r);if(m.length)out.push([`#repl`,`${r.id} replacement record: ${m.join(", ")}`,"warn"]);});
  U.forEach(e=>{const t=tubeState(e);if(["bad","overdue","replover","none","nopm"].includes(t.st))out.push([`#tube`,`${tcName(e)} protection tube: ${t.txt}`,"bad"]);});
  U.forEach(e=>{const i=calIssues(e);if(i.length)out.push([`#tcs`,`${tcName(e)}: ${i[0]}`,"bad"]);});
  U.forEach(e=>{if(lifeOf(e).st==="over")out.push([`#tcs`,`${tcName(e)}: element past its ${C().lifeDays}-day life`,"bad"]);});
  S.sats.forEach(r=>{const v=satEval(r);if(v.res==="fail"&&actMissing(r).length)out.push([`#act`,`${r.id} ${tcName(tcById(r.tc))}: failed SAT, reaction open`,"bad"]);else if(satMissing(r).length)out.push([`#sat`,`${r.id}: record incomplete`,"warn"]);});
  S.eq.filter(q=>q.active).forEach(q=>{const i=eqIssues(q);if(i.length)out.push([`#eq`,`${q.ident}: ${i[0]}`,"warn"]);});
  if(!isDate(S.pm.apprDate))out.push([`#pm`,"Protection tube PM schedule not approved","bad"]);else if(S.pm.dirty)out.push([`#pm`,"PM schedule changed since its approval","warn"]);
  return out;}
function vDash(){
  if(!S.tcs.length)return `<div class="empty"><h2>No thermocouples registered yet</h2><p>Register the thermocouples of each furnace and chamber, or load the example set-up to see how the module works.</p><div class="row" style="justify-content:center"><button class="pri w" data-new-tc>Register a thermocouple</button><button class="w" data-std>Load starter set-up</button></div></div>`;
  const k=kp(),sc=SCORE[k.score],att=attention();
  return `<div class="tiles">
    <a class="tile" href="#tcs"><span class="k">Thermocouples in use</span><span class="v">${k.inUse}</span><span class="small muted">${plural(k.satNeed,"needs","need")} SAT</span></a>
    <a class="tile ${k.satOver||k.satFail?"bad":k.satSoon?"warn":"ok"}" href="#review"><span class="k">SAT in date</span><span class="v">${k.satOk}/${k.satNeed}</span><span class="small muted">${k.satOver} overdue / none · ${k.satFail} failed</span></a>
    <a class="tile ${k.replOpen?"bad":k.lifeOver?"warn":"ok"}" href="#repl"><span class="k">Replacements</span><span class="v">${k.replOpen}</span><span class="small muted">awaiting SAT · ${k.lifeOver} past life</span></a>
    <a class="tile ${k.calBad?"bad":"ok"}" href="#tcs"><span class="k">Calibration (P3.1)</span><span class="v">${k.calBad}</span><span class="small muted">elements with an issue</span></a>
    <a class="tile ${k.tubeBad?"bad":k.tubeSoon?"warn":"ok"}" href="#tube"><span class="k">Protection tubes</span><span class="v">${k.tubeBad}</span><span class="small muted">overdue / to replace · ${k.tubeSoon} soon</span></a>
    <a class="tile ${k.eqBad?"warn":"ok"}" href="#eq"><span class="k">Test equipment</span><span class="v">${k.eqBad}</span><span class="small muted">out of calibration</span></a>
    <a class="tile ${sc[0]}" href="#review"><span class="k">HTSA 3.3</span><span class="v" style="font-size:20px;padding:6px 0">${sc[1]}</span><span class="small muted">${plural(k.notMet,"item")} not met</span></a></div>
  <div class="pdca"><div><span class="ph">P</span><br>Register every thermocouple with its calibration and range of use; tube PM intervals; test equipment.</div><div><span class="ph">D</span><br>SAT of control, monitoring and recording TCs; protection tube checks and replacements.</div><div><span class="ph">C</span><br>Due list, record completeness (P3.3.5), insertion depth, HTSA 3.3 score.</div><div><span class="ph">A</span><br>Failed SAT: cause, action, product impact, re-SAT; replace worn tubes and elements.</div></div>
  ${furnGrid()}
  <div class="panel"><div class="row between"><h3>Needs attention</h3><div class="row"><button class="pri w" data-new-sat>Record a SAT</button><button class="w" data-round>Tube check round</button></div></div>${att.length?`<ul class="issues">${att.slice(0,14).map(([h,t,c])=>`<li><a href="${h}">${esc(t)}</a> ${pill(c,c==="bad"?"Action":"Attention")}</li>`).join("")}</ul>${att.length>14?`<p class="small muted">… and ${att.length-14} more on the due list.</p>`:""}`:`<p class="muted">Nothing open.</p>`}</div>`;
}
/* one chip per thermocouple, per furnace and chamber */
function furnGrid(){
  const lvl=e=>{const s=satState(e).st,t=tubeState(e).st;if(["fail","overdue","none","repl"].includes(s)||["bad","overdue","replover","none","nopm"].includes(t)||calIssues(e).length||lifeOf(e).st==="over")return "bad";if(s==="soon"||t==="soon"||lifeOf(e).st==="soon")return "warn";return "ok";};
  return `<div class="panel"><h3>Furnaces</h3><div class="tw"><table><thead><tr><th>Furnace</th>${CH.map(c=>`<th>${c} chamber</th>`).join("")}</tr></thead><tbody>${furnaces().map(f=>`<tr><td><b>${esc(f)}</b></td>${CH.map(ch=>{const L=inUse().filter(e=>e.furnace===f&&e.chamber===ch);
    return `<td>${L.length?L.map(e=>`<button class="pill ${lvl(e)}" data-tc="${esc(e.id)}" title="${esc(USE[e.use]+" · "+satState(e).txt+" · tube "+tubeState(e).txt)}" style="border:0;cursor:pointer;margin:1px">${esc(e.tag||"?")}</button>`).join(""):`<span class="small muted">none registered</span>`}</td>`;}).join("")}</tr>`).join("")}</tbody></table></div></div>`;}
function vTcs(){
  const f=S.filt,L=S.tcs.filter(e=>(!f.f||e.furnace===f.f)&&(!f.ch||e.chamber===f.ch)&&(!f.st||e.status===f.st)&&(!f.q||(e.tag+" "+e.serial+" "+e.cal.cert+" "+e.id).toLowerCase().includes(f.q.toLowerCase())));
  return `<div class="row between"><h2>Thermocouple register</h2><div class="row"><button class="pri w" data-new-tc>Register a thermocouple</button><button data-csv>Register CSV</button></div></div>
  <div class="fields"><label class="f"><span>Furnace</span><select data-filt="f"><option value="">All</option>${furnaces().map(x=>`<option ${f.f===x?"selected":""}>${esc(x)}</option>`).join("")}</select></label>
    <label class="f"><span>Chamber</span><select data-filt="ch"><option value="">All</option>${CH.map(x=>`<option ${f.ch===x?"selected":""}>${x}</option>`).join("")}</select></label>
    <label class="f"><span>Status</span><select data-filt="st"><option value="">All</option>${Object.entries(TSTAT).map(([k,v])=>`<option value="${k}" ${f.st===k?"selected":""}>${v[1]}</option>`).join("")}</select></label>
    <label class="f"><span>Search</span><input data-filt="q" value="${esc(f.q)}" placeholder="tag, serial, certificate"></label></div>
  ${L.length?`<div class="tw"><table><thead><tr><th>Position</th><th>Use</th><th>Element</th><th>Calibration (P3.1)</th><th>Installed</th><th>SAT</th><th>Protection tube</th></tr></thead><tbody>${L.map(e=>{const ci=calIssues(e),l=lifeOf(e);
    return `<tr class="click" data-tc="${esc(e.id)}"><td><b>${esc(e.furnace)} · ${esc(e.chamber)}</b><br><span class="small muted">${esc(e.tag)} · zone ${zoneOf(e)??"?"} · ${wallOf(e.tag)}</span></td><td>${esc(USE[e.use])}</td>
      <td>Type ${esc(e.type)} · ${esc(e.serial||"—")}<br><span class="small muted">${e.status==="inuse"?"":TSTAT[e.status][1]+(e.removed?" "+fmtD(e.removed):"")+(e.reason?" · "+esc(e.reason):"")}</span></td>
      <td>${e.status!=="inuse"?"":ci.length?pill("bad",ci.length+" issue"+(ci.length>1?"s":"")):pill("ok","OK")}<br><span class="small muted">${esc(e.cal.cert||"no certificate")}</span></td>
      <td>${fmtD(e.installed)}${e.status==="inuse"&&l.st==="over"?"<br>"+pill("bad","Past life"):e.status==="inuse"&&l.st==="soon"?"<br>"+pill("warn","Replace "+fmtD(l.due)):""}</td>
      <td>${e.status==="inuse"?satPill(e):"—"}</td><td>${e.status==="inuse"?tubePill(e):"—"}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No thermocouple matches the filter.</p></div>`}`;
}
function vPm(){
  const c=C(),p=S.pm,pr=pmReview(),U=inUse();
  return `<div class="panel"><div class="row between"><h3>Protection tube preventive maintenance schedule</h3><div class="row"><button class="pri w" data-pmappr>${isDate(p.apprDate)?"Re-approve the schedule":"Approve the schedule"}</button><button data-pmprint>Print schedule</button></div></div>
    <p>${isDate(p.apprDate)?`${pill(p.dirty?"warn":"ok",p.dirty?"Changed since approval":"Approved")} Rev ${p.rev} · approved ${fmtD(p.apprDate)} by ${esc(p.appr)}${p.ref?" · "+esc(p.ref):""} · ${pr.st==="overdue"?pill("bad","Review overdue"):"review due "+fmtD(pr.due)}`:pill("bad","Not approved")}</p>
    <p class="small muted">The schedule is the tube material and the check / replacement interval of every thermocouple in use (edit them on each thermocouple). Changing an interval or adding a thermocouple after the approval marks the schedule as changed.</p>
    ${U.length?`<div class="tw"><table><thead><tr><th>Thermocouple</th><th>Tube material</th><th>Tube installed</th><th class="n">Check every (d)</th><th class="n">Replace after (d)</th><th>Status</th></tr></thead><tbody>${U.map(e=>`<tr class="click" data-tc="${esc(e.id)}"><td>${esc(tcName(e))}</td><td>${esc(e.tube.mat||"—")}</td><td>${fmtD(e.installed)}</td><td class="n">${esc(e.tube.checkDays||"—")}</td><td class="n">${esc(e.tube.replDays||"—")}</td><td>${tubePill(e)}</td></tr>`).join("")}</tbody></table></div>`:""}</div>
  <div class="panel"><h3>Settings</h3><p class="small muted">Accuracy figures are written "± °C | % of reading" (the greater applies). They and the SAT interval / tolerance are typical CQI-9 values to <b>confirm against the controlled copy</b> (Section P3.1 tables, P3.3, Process Tables A and E).</p>
    <div class="fields">${SETF.map(([k,l,t])=>`<label class="f"><span>${esc(l)}</span><input data-cfg="${k}" type="${t}" value="${esc(c[k])}"></label>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="pri w" data-save-cfg>Save settings</button><span class="small muted">Changes are kept only after Save.</span></div></div>`;
}
function vEq(){
  return `<div class="row between"><h2>Test equipment</h2><div class="row"><button class="pri w" data-new-eq>Add test TC / instrument</button><button data-calcsv>Calibration CSV</button></div></div>
  <p class="muted">Test thermocouples and test instruments used for SATs, with their calibration record (make / model, range, least count, thermal calibration observations with error and uncertainty). A SAT is invalid when either was out of calibration on the test day.</p>
  ${S.eq.length?`<div class="tw"><table><thead><tr><th>Ident</th><th>Kind</th><th>Make / model</th><th>Range °C</th><th>Certificate</th><th>Calibrated</th><th>Due</th><th class="n">Uses</th><th>Status</th></tr></thead><tbody>${S.eq.map(q=>{const i=eqIssues(q),u=S.sats.filter(r=>r.testTc===q.id||r.instr===q.id).length+(q.kind==="testtc"?(num(q.uses0)||0):0);
    return `<tr class="click" data-eq="${esc(q.id)}"><td><b>${esc(q.ident)}</b></td><td>${q.kind==="testtc"?"Test TC type "+esc(q.type):"Test instrument"}</td><td>${esc([q.make,q.model].filter(Boolean).join(" ")||"—")}</td><td>${q.lo!==""||q.hi!==""?esc(q.lo+"–"+q.hi):"—"}</td><td>${esc(q.cert||"—")}${calRecIssues(q).length?` <span class="small c-warn" title="${esc(calRecIssues(q).join(" · "))}">· record incomplete</span>`:""}</td><td>${fmtD(q.calDate)}</td><td>${fmtD(q.calDue)}</td><td class="n">${u}</td><td>${!q.active?pill("","Not in use"):i.length?pill("bad",i[0]):pill("ok","In calibration")}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No test equipment registered.</p></div>`}`;
}
/* SAT difference trend per thermocouple position (as the CALOR SAT page): valid SATs of every element that has been at the position,
   tolerance band, warning lines, points coloured by result, element replacements as dashed lines */
const dnum=d=>Math.round(new Date(d+"T00:00:00Z").getTime()/864e5),dstr=n=>new Date(n*864e5).toISOString().slice(0,10);
function trendCard(){
  const f=S.filt,tol=+C().satTol,warn=tol*C().warnPct/100,pk=e=>`${e.furnace}|${e.chamber}|${tcNo(e.tag)}`;
  const P={};S.tcs.filter(e=>SATUSE.includes(e.use)&&tcNo(e.tag)!=null&&(!f.f||e.furnace===f.f)&&(!f.ch||e.chamber===f.ch)).forEach(e=>{(P[pk(e)]=P[pk(e)]||[]).push(e);});
  const key=e=>e.furnace+"|"+e.chamber+"|"+String(tcNo(e.tag)).padStart(2,"0");
  const pos=Object.values(P).map(E=>{const ids=new Set(E.map(e=>e.id)),cur=E.find(e=>e.status==="inuse")||E[E.length-1];
    const h=S.sats.filter(r=>ids.has(r.tc)&&validSat(r)).sort((a,b)=>(a.date+a.time)<(b.date+b.time)?-1:1).map(r=>({r,v:satEval(r),x:dnum(r.date)}));
    const rp=S.repl.filter(r=>(ids.has(r.newTc)||ids.has(r.oldTc))&&isDate(r.date));
    return {cur,h,rp,last:h[h.length-1]};}).sort((a,b)=>key(a.cur)<key(b.cur)?-1:1);
  const shown=pos.filter(x=>x.h.length&&(f.tr!=="attn"||x.h.some(p=>p.v.res!=="pass"))),noH=pos.filter(x=>!x.h.length&&x.cur.status==="inuse").length;
  const W=360,H=150,L=34,Rr=8,T=10,B=22,col={pass:"var(--ok)",warn:"var(--warn)",fail:"var(--bad)"};
  const chart=x=>{const h=x.h,ymax=Math.max(tol*1.6,...h.map(p=>Math.abs(p.v.diff)*1.15));
    let x0=Math.min(...h.map(p=>p.x),...x.rp.map(r=>dnum(r.date))),x1=Math.max(...h.map(p=>p.x),dnum(today()));if(x1-x0<30)x0=x1-30;
    const X=v=>L+8+(v-x0)/(x1-x0)*(W-L-Rr-16),Y=v=>T+(ymax-v)/(2*ymax)*(H-T-B),e=x.cur,lt=x.last,bad=h.some(p=>p.v.res==="fail");
    return `<div class="trc"><h3>${esc(tcName(e))} <span class="small muted" style="font-weight:400">zone ${zoneOf(e)??"?"} · ${esc(wallOf(e.tag))} · latest ${fx(lt.v.diff)} °C · ${fmtD(lt.r.date)}</span></h3>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="SAT differences of ${esc(tcName(e))}">
      <rect x="${L}" y="${Y(tol)}" width="${W-L-Rr}" height="${Y(-tol)-Y(tol)}" fill="var(--band)"/>
      ${[-tol,0,tol].map(v=>`<line x1="${L}" x2="${W-Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L-4}" y="${Y(v)+3.5}" text-anchor="end">${v>0?"+":""}${fx(v)}</text>`).join("")}
      ${[warn,-warn].map(v=>`<line x1="${L}" x2="${W-Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--warn)" stroke-dasharray="4 3"/>`).join("")}
      ${x.rp.map(r=>`<line x1="${fx(X(dnum(r.date)),1)}" x2="${fx(X(dnum(r.date)),1)}" y1="${T}" y2="${H-B}" stroke="var(--s1)" stroke-dasharray="3 3" stroke-width="1.5"><title>${esc(r.id)} · replaced ${fmtD(r.date)} · ${esc(r.oldSerial||"?")} → ${esc(r.newSerial)} · ${esc(r.reason)}</title></line>`).join("")}
      <polyline points="${h.map(p=>fx(X(p.x),1)+","+fx(Y(p.v.diff),1)).join(" ")}" fill="none" stroke="var(--muted)" stroke-width="1.2"/>
      ${h.map(p=>`<circle cx="${fx(X(p.x),1)}" cy="${fx(Y(p.v.diff),1)}" r="4.5" fill="${col[p.v.res]}" stroke="var(--panel)" stroke-width="1.5" data-sat="${esc(p.r.id)}" style="cursor:pointer"><title>${esc(p.r.id)} · ${fmtD(p.r.date)} · ${fx(p.v.diff)} °C · ${p.v.res==="fail"?"fail":p.v.res==="warn"?"warning":"pass"} · element ${esc((tcById(p.r.tc)||{}).serial||"")}</title></circle>`).join("")}
      <text x="${L}" y="${H-6}">${fmtD(dstr(x0))}</text><text x="${W-Rr}" y="${H-6}" text-anchor="end">${fmtD(dstr(x1))}</text>
    </svg></div>`;};
  return `<div class="panel"><div class="row between"><h3>SAT difference trend per thermocouple</h3>
      <div class="row trsel"><select data-filt="f" aria-label="Furnace"><option value="">All furnaces</option>${furnaces().map(x=>`<option ${f.f===x?"selected":""}>${esc(x)}</option>`).join("")}</select>
      <select data-filt="ch" aria-label="Chamber"><option value="">Both chambers</option>${CH.map(x=>`<option ${f.ch===x?"selected":""}>${x}</option>`).join("")}</select>
      <select data-filt="tr" aria-label="Show"><option value="">Every thermocouple</option><option value="attn" ${f.tr==="attn"?"selected":""}>With a warning or failure</option></select></div></div>
    <p class="small muted">Valid SATs only, of every element that has been at the position. A trend towards the limit is the cue for preventive action before a failure. Click a point to open the SAT.</p>
    <div class="trlg small"><span><i class="sw band"></i>within ±${fx(tol)} °C</span><span><i class="ln warn"></i>warning band ±${fx(warn)} °C</span><span><i class="dot" style="background:var(--ok)"></i>pass</span><span><i class="dot" style="background:var(--warn)"></i>warning</span><span><i class="dot" style="background:var(--bad)"></i>fail</span><span><i class="ln repl"></i>element replaced</span></div>
    ${shown.length?`<div class="mini-grid">${shown.map(chart).join("")}</div>`:`<p class="muted">${pos.some(x=>x.h.length)?"No thermocouple with a warning or failure here.":"No valid SAT yet for these thermocouples."}</p>`}
    ${noH&&shown.length?`<p class="small muted" style="margin-top:6px">${plural(noH,"thermocouple")} in use without a valid SAT yet.</p>`:""}</div>`;}
function vSat(){
  const L=S.sats.slice().sort((a,b)=>(a.date+a.time)<(b.date+b.time)?1:-1);
  return `<div class="row between"><h2>SAT records</h2><div class="row"><button class="pri w" data-new-sat>Record a SAT</button><button data-satcsv>SAT CSV</button><button data-rdcsv>Readings CSV</button></div></div>
  <p class="muted">Each SAT records ${C().satMin} minutes of readings (${nRd()} furnace / test pairs, one every ${C().satStep} min). SAT difference = mean of furnace reading − (test reading + instrument correction + test TC correction), tolerance ±${C().satTol} °C.</p>
  ${trendCard()}
  ${L.length?`<div class="tw"><table><thead><tr><th>Record</th><th>Thermocouple</th><th>Date</th><th class="n">Set point</th><th>Test TC · depth</th><th class="n">Readings</th><th>Result</th><th>Record (P3.3.5)</th></tr></thead><tbody>${L.map(r=>{const m=satMissing(r),t=eqById(r.testTc);
    return `<tr class="click" data-sat="${esc(r.id)}"><td class="mono">${esc(r.id)}</td><td>${esc(tcName(tcById(r.tc)))}</td><td>${fmtD(r.date)} ${esc(r.time)}<br><span class="small muted">${esc(r.by)}</span></td><td class="n">${esc(r.sp)}</td><td>${esc(t?t.ident:"—")}${r.depth?` · ${esc(r.depth)} mm`:""}</td><td class="n">${legacy(r)?`<span class="muted">1 (single)</span>`:`${readingsOf(r).length} / ${nRd()}`}</td><td>${resPill(r)}</td><td>${m.length?pill("warn",m.length+" missing"):pill("ok","Complete · approved")}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No SAT recorded yet.</p></div>`}`;
}
function vTube(){
  const L=S.tubes.slice().sort((a,b)=>a.date<b.date?1:-1);
  return `<div class="row between"><h2>Protection tube checks</h2><button class="pri w" data-round>Tube check round</button></div>
  ${L.length?`<div class="tw"><table><thead><tr><th>Date</th><th>Thermocouple</th><th>Result</th><th>By</th><th>Note</th><th></th></tr></thead><tbody>${L.slice(0,300).map(t=>`<tr><td>${fmtD(t.date)}</td><td>${esc(tcName(tcById(t.tc)))}</td><td>${pill(...TRES[t.res]||["",t.res])}${t.mat?` <span class="small muted">${esc(t.mat)}</span>`:""}</td><td>${esc(t.by)}</td><td>${esc(t.note)}</td><td><button class="danger w" data-del-tube="${esc(t.id)}">Delete</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty"><p>No tube check recorded yet.</p></div>`}`;
}
function vReview(){
  const A=assess33(),sc=SCORE[A.score],U=inUse();
  const rows=U.map(e=>({e,s:satState(e),t:tubeState(e),l:lifeOf(e)})).sort((a,b)=>((a.s.due||"0")+(a.t.due||""))<((b.s.due||"0")+(b.t.due||""))?-1:1);
  return `<div class="panel"><div class="row between"><h3>HTSA 3.3 · Are thermocouples and protection tubes checked or replaced per Process Tables?</h3><button data-h33>Evidence (print)</button></div>
    <p><span class="verdict ${sc[2]}">${sc[1]}</span> <span class="muted">${plural(A.I.filter(i=>i.lvl==="ok").length,"item")} met · ${plural(A.I.filter(i=>i.lvl==="crit").length,"item")} not met · ${plural(A.I.filter(i=>i.lvl==="warn").length,"item")} needing attention</span></p>
    <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th><th>Action</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${pill(...LV[i.lvl])}</td><td>${esc(i.act)}</td></tr>`).join("")}</tbody></table></div></div>
  <div class="panel"><h3>Due list</h3>${rows.length?`<div class="tw"><table><thead><tr><th>Thermocouple</th><th>Use</th><th>SAT</th><th>Protection tube</th><th>Element life</th><th></th></tr></thead><tbody>${rows.map(({e,s,t,l})=>`<tr><td>${esc(tcName(e))}</td><td>${esc(USE[e.use])}</td><td>${satPill(e)}</td><td>${tubePill(e)}</td><td>${l.st==="over"?pill("bad","Past life"):l.st==="soon"?pill("warn","Replace "+fmtD(l.due)):l.due?fmtD(l.due):"—"}</td>
    <td><div class="row">${SATUSE.includes(e.use)?`<button class="w" data-new-sat="${esc(e.id)}">SAT</button>`:""}<button class="w" data-tc="${esc(e.id)}">Open</button></div></td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">No thermocouple in use.</p>`}</div>`;
}
function vAct(){
  const F=S.sats.filter(r=>satEval(r).res==="fail").sort((a,b)=>a.date<b.date?1:-1),W=inUse().filter(e=>tubeState(e).st==="bad"),R=S.tcs.filter(e=>e.status==="removed").sort((a,b)=>a.removed<b.removed?1:-1);
  return `<div class="panel"><h3>Failed SATs</h3>${F.length?`<div class="tw"><table><thead><tr><th>Record</th><th>Thermocouple</th><th>Date</th><th class="n">Difference</th><th>Reaction</th><th>Re-SAT</th></tr></thead><tbody>${F.map(r=>{const m=actMissing(r),e=tcById(r.tc),re=S.sats.find(x=>x.tc===r.tc&&x.date>=r.date&&x.id!==r.id&&satEval(x).res!=="fail"&&validSat(x))
      ||(e&&e.replacedBy&&S.sats.find(x=>x.tc===e.replacedBy&&validSat(x)&&satEval(x).res!=="fail"));
    return `<tr class="click" data-sat="${esc(r.id)}"><td class="mono">${esc(r.id)}</td><td>${esc(tcName(e))}</td><td>${fmtD(r.date)}</td><td class="n">${fx(satEval(r).diff)} °C</td><td>${m.length?pill("bad",m.length+" missing"):pill("ok","Complete")}<br><span class="small muted">${esc(r.act.action)}</span></td><td>${re?pill("ok",re.id+" "+fmtD(re.date)):pill("bad","None yet")}</td></tr>`;}).join("")}</tbody></table></div>`:`<p class="muted">No failed SAT.</p>`}</div>
  <div class="panel"><h3>Protection tubes to replace</h3>${W.length?`<ul class="issues">${W.map(e=>`<li><a href="#tube" data-tc="${esc(e.id)}">${esc(tcName(e))}</a>: ${esc(tubeState(e).txt)}. Replace the thermocouple (element and tube) <button class="link" data-replfor="${esc(e.id)}">Replace…</button></li>`).join("")}</ul>`:`<p class="muted">None.</p>`}</div>
  <div class="panel"><h3>Elements awaiting their verification SAT</h3>${inUse().filter(e=>satState(e).st==="repl").map(e=>`<p><a href="#repl">${esc(tcName(e))}</a>: ${esc(satState(e).txt)} <button class="w" data-new-sat="${esc(e.id)}">Record the SAT</button></p>`).join("")||`<p class="muted">None.</p>`}</div>`;
}
const lifePill=l=>l.st==="over"?pill("bad","Past life "+fmtD(l.due)):l.st==="soon"?pill("warn","Due "+fmtD(l.due)):l.st==="ok"?pill("ok","Replace by "+fmtD(l.due)):pill("","—");
function vRepl(){
  const U=inUse(),due=U.map(e=>({e,l:lifeOf(e)})).filter(x=>x.l.st==="over"||x.l.st==="soon").sort((a,b)=>a.l.due<b.l.due?-1:1),unk=U.filter(e=>!isDate(e.installed)).length;
  const L=S.repl.slice().sort((a,b)=>(a.date+a.time)<(b.date+b.time)?1:-1),known=new Set(S.repl.map(r=>r.oldTc).filter(Boolean));
  const legacy=S.tcs.filter(e=>e.status==="removed"&&!known.has(e.id)).sort((a,b)=>a.removed<b.removed?1:-1);
  return `<div class="row between"><h2>Thermocouple replacements</h2><button data-replcsv>Replacements CSV</button></div>
  <div class="panel"><h3>Due for replacement</h3><p class="small muted">Elements are replaced ${C().lifeDays} days after installation (site schedule); listed when past it or due within ${C().soonDays} days. Other reasons are chosen when the replacement is recorded.</p>
    ${due.length?`<div class="tw"><table><thead><tr><th>Thermocouple</th><th>Element</th><th>Installed</th><th>Replace by</th><th></th></tr></thead><tbody>${due.map(({e,l})=>`<tr><td><b>${esc(tcName(e))}</b><br><span class="small muted">${esc(USE[e.use])} · ${esc(wallOf(e.tag))}</span></td><td class="mono">${esc(e.serial||"—")}</td><td>${fmtD(e.installed)}</td><td>${lifePill(l)}</td><td><button class="w" data-replfor="${esc(e.id)}">Record replacement</button></td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">No element due within ${C().soonDays} days.</p>`}
    ${unk?`<p class="small muted">${plural(unk,"thermocouple")} without an installation date: enter it so the replacement can be tracked.</p>`:""}</div>
  <div class="panel"><h3>Replacement history</h3>${L.length||legacy.length?`<div class="tw"><table><thead><tr><th>Record</th><th>Date</th><th>Thermocouple</th><th>Removed element</th><th>Fitted element</th><th>Reason</th><th>Found by SAT</th><th>Verification SAT</th><th>By</th></tr></thead><tbody>${L.map(r=>{const v=verifySat(r),n=tcById(r.newTc)||tcById(r.oldTc),m=replMissing(r),life=isDate(r.oldInstalled)&&isDate(r.date)?Math.round((new Date(r.date)-new Date(r.oldInstalled))/864e5):null;
      return `<tr class="click" data-replrec="${esc(r.id)}"><td class="mono">${esc(r.id)}${m.length?`<br>${pill("warn",m.length+" missing")}`:""}</td><td>${fmtD(r.date)}${r.time?`<br><span class="small muted">${esc(r.time)}</span>`:""}</td><td><b>${esc(tcName(n))}</b></td>
      <td class="mono">${tcById(r.oldTc)?`<button class="link" data-tc="${esc(r.oldTc)}">${esc(r.oldSerial||"—")}</button>`:esc(r.oldSerial||"—")}${life!=null?`<br><span class="small muted">in service ${life} d</span>`:""}</td><td><span class="mono">${tcById(r.newTc)?`<button class="link" data-tc="${esc(r.newTc)}">${esc(r.newSerial)}</button>`:esc(r.newSerial)}</span><br><span class="small muted">type ${esc(r.newType)}${r.cert?" · cert "+esc(r.cert):""}</span></td>
      <td>${esc(r.reason)}${r.offset?`<br><span class="small muted">offset reset: ${esc(r.offset)}</span>`:""}${r.reason===R_MOVE?`<br>${r.tus?`<span class="small muted">TUS: ${esc(r.tus)}</span>`:pill("warn","TUS decision missing")}`:""}</td>
      <td>${r.satRef?`<a href="#sat" data-sat="${esc(r.satRef)}">${esc(r.satRef)}</a>`:"—"}</td><td>${v?`<a href="#sat" data-sat="${esc(v.id)}">${esc(v.id)}</a> ${fmtD(v.date)}<br>${resPill(v)}`:!r.newTc?pill("","fitted element not registered"):(tcById(r.newTc)||{}).status==="removed"?pill("warn","Removed before its SAT")+(S.repl.find(y=>y.oldTc===r.newTc)?`<br><span class="small muted">${esc(S.repl.find(y=>y.oldTc===r.newTc).id)}</span>`:""):pill("bad","SAT required")}</td><td>${esc(r.by)}</td></tr>`;}).join("")}
      ${legacy.map(e=>{const n=tcById(e.replacedBy);return `<tr class="click" data-tc="${esc(e.id)}"><td class="small muted">no record</td><td>${fmtD(e.removed)}</td><td><b>${esc(tcName(e))}</b></td><td class="mono">${esc(e.serial)}</td><td class="mono">${esc(n?n.serial:"—")}</td><td>${esc(e.reason)}</td><td>—</td><td>${n?(satsOf(n.id).some(x=>validSat(x)&&x.date>=e.removed)?pill("ok","SAT done"):pill("bad","SAT required")):"—"}</td><td></td></tr>`;}).join("")}</tbody></table></div>`:`<p class="muted">No replacement recorded.</p>`}
    <p class="small muted" style="margin-top:6px">Record a replacement from the thermocouple (Replace thermocouple…) or from the due list. Every replacement needs the controller offset decision, a TUS decision for a relocation or immersion-depth change, and a SAT of the fitted element before use.</p></div>`;}
function vRules(){
  const c=C();
  const R=[["Calibration (P3.1)","Each thermocouple needs a calibration certificate dated on or before its installation, a calibrated range covering its range of use (hardening chamber "+c.rangeH+" °C, tempering chamber "+c.rangeT+" °C unless set on the thermocouple) and a largest error within ± the greater of "+c.accFieldBase.replace("|"," °C or ")+" % (base metal) / "+c.accFieldNoble.replace("|"," °C or ")+" % (noble metal) at the top of the range. Test TCs: "+c.accTestBase.replace("|"," °C or ")+" % / "+c.accTestNoble.replace("|"," °C or ")+" %."],
    ["SAT (P3.3)","Control, monitoring and recording thermocouples: a passing SAT after installation and then every "+c.satDays+" days. Each SAT records "+c.satMin+" minutes of furnace / test readings, one every "+c.satStep+" min ("+nRd()+" pairs); difference = mean over the readings of furnace − (test + instrument correction + test TC correction); a reading outside the tolerance turns a pass into a warning, a furnace range above "+c.satStab+" °C is flagged; fail beyond ±"+c.satTol+" °C, warning beyond "+c.warnPct+" % of it. A failed SAT stays failed until a later passing SAT (or the replacement's SAT)."],
    ["Valid SAT","Test instrument and test thermocouple identified and in calibration on the test day; for a type K / E test TC the insertion depth recorded"+(c.reuseDeeper!=="no"?", and a reused one not shallower than its deepest earlier use":"")+(+c.maxUses>0?"; not more than "+c.maxUses+" uses":"")+"."],
    ["SAT record (P3.3.5)","Thermocouple tested, date and start time, set point, test instrument and test TC with calibration, the "+c.satMin+"-minute series of furnace and test readings, both corrections, difference, result, technician, approval by name and date. Incomplete records count against HTSA 3.3."],
    ["Failed SAT","Cause, corrective action, product impact, owner and date, then a passing re-SAT (after adjustment or replacement)."],
    ["Protection tubes","Each thermocouple in use has a tube material and a check interval (default "+c.tubeCheckDays+" days) and optionally a replacement interval ("+c.tubeReplDays+" days); the schedule is approved and reviewed every "+c.pmReviewDays+" days. Element and tube form one assembly: they are installed and replaced together, so the tube's installation date is the element's. A worn or cracked tube, or a tube past its replacement interval, stays open until the thermocouple is replaced (reason \"Protection tube failure\" or service life); the new assembly starts its check interval on the replacement date."],
    ["Element life","Sensing elements in use longer than "+c.lifeDays+" days are due for replacement (site schedule); the due list shows them."],
    ["Replacement","Element and protection tube are replaced together. Recorded with the date, the reason (SAT failure, service life, drift, damage, open circuit, exposure, TUS failure, tube failure, wrong type, relocation / immersion change, other), the removed and fitted element, the calibration certificate of the fitted one, the controller offset decision, the TUS decision for a relocation or immersion change, who replaced it and the failed SAT that found it. The old element is kept as removed. The fitted element shows \"SAT due after replacement\" until a valid SAT on or after the replacement date. A failed SAT whose action is \"Replace the thermocouple\" closes only with a replacement record linked to it."],
    ["Furnace readings from SCADA","The SAT dialog can fill the furnace readings from a SCADA export loaded in the SCADA review (this session): the PV of the thermocouple's column (TC-n → PV-n) of that furnace and chamber at each reading time, the nearest row within half the logging step. Readings outside 500–1000 °C or not in the record stay empty. The source file is kept on the SAT record."],
    ["HTSA 3.3 score","Needs immediate action: no thermocouple registered, or a control TC with a failed SAT or never SAT checked. Not satisfactory: any item not met. Satisfactory: otherwise."],
    ["Wall and zone","TC-01 / TC-02 = zone 1 … ; odd numbers on the right wall, even on the left."]];
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
const calorSat=()=>{try{const o=MWS.calor.get("tsat-pdca");return o&&Array.isArray(o.sensors)?o:null;}catch(e){return null;}};
function vData(){
  const cs=calorSat(),n=S.tcs.length+S.eq.length+S.sats.length+S.tubes.length;
  return `<h2>Data</h2><div class="grid2">
  <div class="panel"><h3>Back up and restore</h3><p class="small muted">${plural(S.tcs.length,"thermocouple")} · ${plural(S.sats.length,"SAT")} · ${plural(S.tubes.length,"tube check")} · ${plural(S.eq.length,"test item")} · storage: ${S.dbState==="on"?"shared record store":"this browser"}.</p>
    <div class="row"><button class="pri" data-export>Export JSON</button><button data-csv>Register CSV</button><button data-satcsv>SAT CSV</button><button data-rdcsv>Readings CSV</button></div>
    <div class="row w" style="margin-top:10px"><label class="f"><span>Import a JSON export</span><input type="file" id="impfile" accept=".json,application/json"></label></div>
    ${S.imp?`<div class="banner" style="margin-top:8px">${esc(S.imp.msg)}<div class="row" style="margin-top:6px"><button class="pri" data-imp="merge">Merge (add and update)</button><button class="danger" data-imp="replace">Replace everything</button><button data-imp="cancel">Cancel</button></div></div>`:""}</div>
  ${MWS.calor.panel(["tsat-pdca"])}
  <div class="panel"><h3>From the CALOR SAT register</h3><p class="small muted">${cs?`CALOR (${esc(MWS.calor.where("tsat-pdca"))}) holds ${plural(cs.sensors.length,"thermocouple")} and ${plural((cs.cycles||[]).length,"SAT cycle")}. Importing adds the thermocouples (type K, control), the SATs with their readings and the replacement history, with their test thermocouples and instruments. Calibration certificates and tube data are not in CALOR and must be added.`:"No CALOR SAT register found. Read the CALOR Drive folder or files above, or open this application in the browser where CALOR runs."}</p>
    <button class="w" data-calor ${cs?"":"disabled"}>Import from CALOR</button></div>
  <div class="panel"><h3>Starter set-up</h3><p class="small muted">Six thermocouples per chamber on F-01 … F-04 (TC-01 … TC-06), certificates, test equipment, SATs and tube checks with a few open items, an approved PM schedule; all marked "(example)".</p><button class="w" data-std ${n?"disabled":""}>Load starter set-up</button>${n?`<p class="small muted">Only on an empty module.</p>`:""}</div>
  <div class="panel"><h3>Clear all</h3><p class="small muted">Deletes every record and the settings of this module. Type <b>CLEAR ALL</b> to enable.</p>
    <div class="row w"><input id="clrtxt" placeholder="CLEAR ALL" style="max-width:180px"><button class="danger" data-clear>Clear all</button></div></div></div>`;
}
const VIEWS={dash:vDash,tcs:vTcs,pm:vPm,eq:vEq,sat:vSat,tube:vTube,repl:vRepl,review:vReview,act:vAct,rules:vRules,docs:vDocs,data:vData};
const AFTER={docs:showDoc};

/* 9. modal record sheets */
function mf(path,label,o={}){
  const ed=S.modal.ed,v=getp(ed,path),id="m-"+path.replace(/\./g,"-"),dis=o.dis?"disabled":"";
  let ctl;
  if(o.opts)ctl=`<select id="${id}" data-p="${path}" ${dis}>${o.blank?`<option value="">—</option>`:""}${Object.entries(o.opts).map(([k,t])=>`<option value="${esc(k)}" ${String(v)===k?"selected":""}>${esc(t)}</option>`).join("")}</select>`;
  else if(o.area)ctl=`<textarea id="${id}" data-p="${path}" rows="${o.area}" ${dis}>${esc(v)}</textarea>`;
  else ctl=`<input id="${id}" data-p="${path}" ${o.type?`type="${o.type}"`:""} ${o.num?'inputmode="decimal"':""} value="${esc(v)}" ${o.ph?`placeholder="${esc(o.ph)}"`:""} ${dis}>`;
  return `<label class="f ${o.req?"req":""} ${o.wide?"wide":""}" for="${id}"><span>${esc(label)}</span>${ctl}</label>`;
}
function openModal(m){S.modal=m;$("#modal").hidden=false;redraw();}
function closeModal(){S.modal=null;const el=$("#modal");if(el){el.hidden=true;el.innerHTML="";}document.body.classList.remove("pm");if(S.pending){S.pending=false;render();}}
function redraw(){const el=$("#modal");if(!S.modal||!el)return;const st=el.scrollTop;el.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${(DRAW[S.modal.kind])()}</div>`;el.scrollTop=st;}
const sheet=(title,body,foot)=>`<div class="row between"><h2>${title}</h2><button data-close aria-label="Close">✕</button></div>${body}<div class="sticky-foot"><span class="msg" id="mmsg">${S.modal.msg||""}</span>${foot}</div>`;
const msg=(t,ok)=>{if(!S.modal)return;S.modal.msg=t?`<span style="color:var(--${ok?"ok":"bad"})">${esc(t)}</span>`:"";const el=$("#mmsg");if(el)el.innerHTML=S.modal.msg;};
const opts=a=>Object.fromEntries(a.map(x=>[x,x]));
function tcModal(id){const e=tcById(id);openModal({kind:"tc",ed:e?clone(e):fillTc({furnace:furnaces()[0]||"",tube:{checkDays:String(C().tubeCheckDays),replDays:String(C().tubeReplDays)}}),msg:""});}
/* the replacement links of an element: what it replaced, what replaced it, and every element that has been at this position */
function posLinks(e){
  const rIn=S.repl.find(r=>r.newTc===e.id),rOut=S.repl.find(r=>r.oldTc===e.id),prev=rIn?tcById(rIn.oldTc):S.tcs.find(x=>x.replacedBy===e.id),next=tcById(e.replacedBy)||(rOut?tcById(rOut.newTc):null);
  const H=S.tcs.filter(x=>x.furnace===e.furnace&&x.chamber===e.chamber&&tcNo(x.tag)!=null&&tcNo(x.tag)===tcNo(e.tag)).sort((a,b)=>(a.installed||"")<(b.installed||"")?-1:(a.installed||"")>(b.installed||"")?1:a.status==="inuse"?1:-1);
  const el=x=>x?`<button class="link" data-tc="${esc(x.id)}">${esc(x.serial||x.id)}</button>`:"—",rec=r=>r?` <button class="link" data-replrec="${esc(r.id)}">${esc(r.id)}</button>`:"";
  const lines=[];
  if(prev||rIn)lines.push(`Fitted ${fmtD(rIn?rIn.date:e.installed)}, replacing ${prev?el(prev):esc(rIn.oldSerial||"?")}${rIn?` (${esc(rIn.reason)})`+rec(rIn):""}.`);
  if(e.status==="removed")lines.push(`Removed ${fmtD(e.removed)} · ${esc(e.reason||"no reason recorded")} · replaced by ${next?el(next):rOut?esc(rOut.newSerial):"—"}${rec(rOut)}.`);
  return `${lines.length?`<p class="banner" style="margin-top:10px">${lines.join("<br>")}</p>`:""}
  ${H.length>1?`<fieldset><legend>Elements at ${esc(e.furnace)} ${esc(e.chamber)} ${esc(e.tag)}</legend><div class="tw"><table><thead><tr><th>Element</th><th>Installed</th><th>Removed</th><th>Reason</th><th>Record</th></tr></thead><tbody>${H.map(x=>{const r=S.repl.find(y=>y.oldTc===x.id);
    return `<tr><td>${x.id===e.id?`<b>${esc(x.serial||x.id)}</b> (this one)`:el(x)} ${x.status==="inuse"?pill("ok","In use"):""}</td><td>${fmtD(x.installed)}</td><td>${x.status==="removed"?fmtD(x.removed):"—"}</td><td>${esc(x.reason)}</td><td>${rec(r)}</td></tr>`;}).join("")}</tbody></table></div></fieldset>`:""}`;}
function DRAW_TC(){
  const e=S.modal.ed,known=S.tcs.find(x=>x.id===e.id),[lo,hi]=useRange(e),ci=calIssues(e),rem=e.status==="removed",L=known?satsOf(e.id):[],T=known?tubesOf(e.id):[];
  const body=`<p class="muted">${known?pill(...TSTAT[e.status]):pill("warn","New")} ${e.tag?esc(wallOf(e.tag)):""}${known&&e.status==="inuse"?" "+satPill(e,1)+" "+tubePill(e,1):""}</p>
  <fieldset><legend>Position</legend><div class="fields">${mf("furnace","Furnace",{opts:opts(furnaces()),req:1,dis:rem})}${mf("chamber","Chamber",{opts:opts(CH),dis:rem})}${mf("tag","Tag (TC-01 … TC-06)",{req:1,dis:rem,ph:"TC-01"})}${mf("zone","Zone (blank = from the tag)",{num:1,dis:rem})}
    ${mf("use","Use",{opts:USE,dis:rem})}${mf("useLo","Range of use from °C",{num:1,ph:String(rng(e.chamber==="Tempering"?C().rangeT:C().rangeH)[0]??""),dis:rem})}${mf("useHi","to °C",{num:1,ph:String(rng(e.chamber==="Tempering"?C().rangeT:C().rangeH)[1]??""),dis:rem})}</div></fieldset>
  <fieldset><legend>Sensing element</legend><div class="fields">${mf("type","Type",{opts:opts(TYPES),dis:rem})}${mf("serial","Serial / batch no.",{req:1,dis:rem})}${mf("sheath","Sheath / size",{dis:rem})}${mf("installed","Installed (first use)",{type:"date",req:1,dis:rem})}</div></fieldset>
  <fieldset><legend>Calibration before first use (P3.1)</legend><div class="fields">${mf("cal.cert","Certificate no.",{req:1,dis:rem})}${mf("cal.lab","Laboratory / supplier",{dis:rem})}${mf("cal.date","Calibration date",{type:"date",req:1,dis:rem})}
    ${mf("cal.lo","Calibrated from °C",{num:1,req:1,dis:rem})}${mf("cal.hi","to °C",{num:1,req:1,dis:rem})}${mf("cal.maxErr","Largest error on the certificate ± °C",{num:1,req:1,dis:rem})}</div>
    <p class="small ${ci.length?"":"muted"}" style="margin-top:6px">${ci.length?pill("bad","Issue")+" "+esc(ci.join(" · ")):`Accuracy required: ±${fx(limAt(e.type,false,hi),1)} °C at ${hi??"?"} °C (type ${esc(e.type)}). Range of use ${lo??"?"}–${hi??"?"} °C.`}</p></fieldset>
  <fieldset><legend>Protection tube (PM schedule)</legend><p class="small muted" style="margin:0 0 6px">Element and tube are installed and replaced together: a worn or cracked tube, or the tube life, means replacing the thermocouple (Replace thermocouple…).</p><div class="fields">${mf("tube.mat","Tube material",{req:1,dis:rem,ph:"e.g. Inconel 600, ceramic C799"})}<label class="f"><span>Tube installed (with the element)</span><input value="${esc(fmtD(e.installed))}" disabled></label>${mf("tube.checkDays","Check every (days)",{num:1,req:1,dis:rem})}${mf("tube.replDays","Tube life: replace the thermocouple after (days, 0 = on condition)",{num:1,dis:rem})}</div></fieldset>
  ${mf("notes","Notes",{area:2,wide:1})}
  ${known?posLinks(e):""}
  ${L.length?`<fieldset><legend>SATs</legend><ul class="small">${L.map(r=>`<li><a href="#sat" data-sat="${esc(r.id)}">${esc(r.id)}</a> ${fmtD(r.date)} · ${resPill(r)}</li>`).join("")}</ul></fieldset>`:""}
  ${T.length?`<fieldset><legend>Tube checks</legend><ul class="small">${T.slice(0,10).map(t=>`<li>${fmtD(t.date)} · ${esc((TRES[t.res]||["",t.res])[1])} · ${esc(t.by)}${t.note?" · "+esc(t.note):""}</li>`).join("")}</ul></fieldset>`:""}
  ${e.log.length?`<details style="margin-top:10px"><summary class="small">Log (${e.log.length})</summary><ul class="small">${e.log.slice().reverse().map(l=>`<li>${fmtD(l.d)} · ${esc(l.t)}</li>`).join("")}</ul></details>`:""}`;
  const canDel=known&&!S.sats.some(r=>r.tc===e.id)&&!S.tubes.some(t=>t.tc===e.id);
  const foot=`${!rem?`<button class="pri w" data-save-tc>Save</button>`:`<button class="w" data-save-tc>Save notes</button>`}${known&&e.status==="inuse"?`<button class="w" data-replace>Replace thermocouple…</button>${SATUSE.includes(e.use)?`<button class="w" data-new-sat="${esc(e.id)}">Record a SAT</button>`:""}`:""}
    ${canDel?`<button class="danger w" data-del-tc>Delete</button>`:""}<button data-close>Close</button>`;
  return sheet(`${esc(known?tcName(e):"Register a thermocouple")}`,body,foot);
}
function DRAW_REPL(){const m=S.modal,o=tcById(m.id),F=o?S.sats.filter(r=>r.tc===o.id&&satEval(r).res==="fail").sort((a,b)=>a.date<b.date?1:-1):[],v=k=>esc(m[k]||"");
  const sel=(id,L,cur,blank)=>`<select id="${id}">${blank?`<option value="">— select —</option>`:""}${L.map(x=>`<option ${cur===x?"selected":""}>${esc(x)}</option>`).join("")}</select>`;
  return sheet(`Thermocouple replacement · ${esc(tcName(o))}`,`<p class="muted">Removed element ${esc(o?o.serial:"")} (type ${esc(o?o.type:"")}, installed ${fmtD(o&&o.installed)}). The old element is kept as removed with its reason; the fitted element takes the same position, needs its calibration certificate now and shows "SAT due after replacement" until its SAT.</p>
  <div class="fields"><label class="f req"><span>Replaced on</span><input type="date" id="rp-date" value="${v("date")}"></label><label class="f"><span>Time</span><input type="time" id="rp-time" value="${v("time")}"></label>
  <label class="f req wide"><span>Reason</span>${sel("rp-reason",REASONS,m.reason,1)}</label>
  ${F.length?`<label class="f wide"><span>Found by the failed SAT</span><select id="rp-sat"><option value="">— none —</option>${F.map(r=>`<option value="${esc(r.id)}" ${m.satRef===r.id?"selected":""}>${esc(r.id)} · ${fmtD(r.date)} · ${fx(satEval(r).diff)} °C</option>`).join("")}</select></label>`:""}
  <label class="f req"><span>Fitted element serial / batch no.</span><input id="rp-serial" value="${v("serial")}"></label><label class="f req"><span>Type</span>${sel("rp-type",TYPES,m.type||(o?o.type:"K"))}</label>
  <label class="f req"><span>Certificate no.</span><input id="rp-cert" value="${v("cert")}"></label><label class="f req"><span>Calibration date</span><input type="date" id="rp-cdate" value="${v("cdate")}"></label>
  <label class="f req"><span>Calibrated from °C</span><input id="rp-lo" inputmode="decimal" value="${v("lo")}"></label><label class="f req"><span>to °C</span><input id="rp-hi" inputmode="decimal" value="${v("hi")}"></label><label class="f req"><span>Largest error ± °C</span><input id="rp-err" inputmode="decimal" value="${v("err")}"></label>
  <label class="f req"><span>Controller offset reset for the fitted element</span>${sel("rp-offset",OFFSET,m.offset,1)}</label>
  ${m.reason===R_MOVE?`<label class="f req"><span>TUS after relocation / immersion change</span>${sel("rp-tus",TUSDEC,m.tus,1)}<span class="small muted">moving a control thermocouple can change the uniformity</span></label>`:""}
  <label class="f req"><span>Replaced by</span><input id="rp-by" value="${v("by")}"></label><label class="f wide"><span>Notes</span><input id="rp-notes" value="${v("notes")}"></label>
  <label class="f req"><span>Protection tube fitted with it (material)</span><input id="rp-tmat" value="${v("tmat")}" placeholder="${esc(o?o.tube.mat:"")}"></label>
  <p class="small muted wide" style="margin:0">Element and protection tube are replaced together: the new tube starts its check interval and tube life on this date.</p></div>`,`<button class="pri w" data-save-repl>Record the thermocouple replacement</button><button data-close>Cancel</button>`);}
function DRAW_REPLREC(){const E=S.modal.ed,v=verifySat(E),miss=replMissing(E);
  return sheet(`${esc(E.id)} · ${esc(tcName(tcById(E.newTc)||tcById(E.oldTc)))}`,`<p class="muted">Removed ${tcById(E.oldTc)?`<button class="link" data-tc="${esc(E.oldTc)}">${esc(E.oldSerial||"?")}</button>`:esc(E.oldSerial||"?")} → fitted ${tcById(E.newTc)?`<button class="link" data-tc="${esc(E.newTc)}">${esc(E.newSerial)}</button>`:esc(E.newSerial)+" (not registered)"} · ${fmtD(E.date)}${E.time?" "+esc(E.time):""} · verification SAT: ${v?`<button class="link" data-sat="${esc(v.id)}">${esc(v.id)}</button> `+fmtD(v.date):(tcById(E.newTc)||{}).status==="removed"?"none (removed before its SAT)":"not yet"}</p>
  <div class="fields">${mf("reason","Reason",{opts:opts(REASONS)})}${mf("offset","Controller offset reset",{opts:opts(OFFSET),blank:1,req:1})}${E.reason===R_MOVE?mf("tus","TUS decision",{opts:opts(TUSDEC),blank:1,req:1}):""}
  ${mf("by","Replaced by",{req:1})}${mf("cert","Certificate no. of the fitted element")}${mf("notes","Notes",{area:2,wide:1})}</div>
  ${miss.length?`<p class="banner warn" style="margin-top:8px">Missing: ${esc(miss.join(" · "))}</p>`:""}
  ${E.log.length?`<details style="margin-top:10px"><summary class="small">Log (${E.log.length})</summary><ul class="small">${E.log.slice().reverse().map(l=>`<li>${fmtD(l.d)} · ${esc(l.t)}</li>`).join("")}</ul></details>`:""}`,
  `<button class="pri w" data-save-replrec>Save</button><button data-close>Close</button>`);}
function openRepl(id,reason){const o=tcById(id);if(!o)return;const F=S.sats.filter(r=>r.tc===o.id&&satEval(r).res==="fail"&&!S.repl.some(x=>x.satRef===r.id)).sort((a,b)=>a.date<b.date?1:-1);
  openModal({kind:"repl",id,date:today(),reason:reason||(F.length?R_SAT:tubeState(o).st==="bad"?R_TUBE:lifeOf(o).st==="over"||lifeOf(o).st==="soon"||tubeState(o).st==="replover"?R_LIFE:""),tmat:o.tube.mat,satRef:F.length?F[0].id:"",type:o.type,lo:o.cal.lo,hi:o.cal.hi,msg:""});}
function eqModal(id){const q=eqById(id);openModal({kind:"eq",ed:q?clone(q):fillEq({}),msg:""});}
function DRAW_EQ(){const q=S.modal.ed,known=S.eq.find(x=>x.id===q.id),i=eqIssues(q),used=S.sats.some(r=>r.testTc===q.id||r.instr===q.id);
  const ci=calRecIssues(q);
  return sheet(esc(known?q.ident:"Add test equipment"),`<div class="fields">${mf("kind","Kind",{opts:{testtc:"Test thermocouple",instr:"Test instrument"}})}${mf("ident","Ident (as marked)",{req:1})}${q.kind==="testtc"?mf("type","Type",{opts:opts(TYPES)}):""}
    ${mf("corr","Correction at the test temperature °C (default for SATs)",{num:1})}
    ${q.kind==="testtc"?mf("maxErr","Largest error on the certificate ± °C",{num:1,ph:obsMax(q)?"observed "+fx(Math.abs(obsMax(q).err)):""})+mf("uses0","Uses before this register",{num:1}):""}${mf("notes","Notes",{area:2,wide:1})}
    <label class="chk wide"><input type="checkbox" data-pc="active" ${q.active?"checked":""}> In use</label></div>
    <fieldset><legend>Calibration record</legend><div class="fields">${mf("make","Make")}${mf("model","Model")}${mf("serial","Serial no.")}
      ${mf("lo","Range from °C",{num:1})}${mf("hi","Range to °C",{num:1})}${mf("lc","Least count (e.g. 0.1 °C / 0.001 mV)")}
      ${mf("lab","Calibration laboratory")}${mf("cert","Certificate no.",{req:1})}${mf("calDate","Calibrated on",{type:"date"})}${mf("calDue","Calibration due",{type:"date",req:1})}</div>
      ${obsTable(q)}</fieldset>
    ${ci.length?`<p class="banner" style="margin-top:8px">Calibration record: ${esc(ci.join(" · "))}</p>`:""}
    ${i.length?`<p class="banner warn" style="margin-top:8px">${esc(i.join(" · "))}</p>`:""}`,
    `<button class="pri w" data-save-eq>Save</button>${known?`<button data-eqprint>Print record</button>`:""}${known&&!used?`<button class="danger w" data-del-eq>Delete</button>`:""}<button data-close>Close</button>`);}
/* thermal calibration observations: Sr. No., standard temperature, UUC in mV, UUC in °C, error (calculated), uncertainty ± °C */
function obsTable(q){const O=q.obs,m=obsMax(q);
  return `<div class="row" style="margin:10px 0 6px;gap:8px;align-items:flex-end"><b>Thermal calibration observations</b><span class="small muted">Expanded uncertainty at</span>
    <input id="m-cl" data-p="cl" inputmode="decimal" value="${esc(q.cl)}" style="width:64px" aria-label="Confidence level %"><span class="small muted">% CL, k =</span>
    <input id="m-k" data-p="k" inputmode="decimal" value="${esc(q.k)}" style="width:56px" aria-label="Coverage factor k"></div>
  <div class="tw"><table class="obs"><thead><tr><th class="n">Sr. No.</th><th class="n">Standard temp. °C</th><th class="n">UUC mV</th><th class="n">UUC °C</th><th class="n">Error °C</th><th class="n">Uncertainty ± °C</th><th></th></tr></thead><tbody>
  ${O.map((r,i)=>{const s=num(r.std),u=num(r.uuc),e=s!=null&&u!=null?Math.round((u-s)*100)/100:null,c=(k,l)=>`<td><input id="ob-${i}-${k}" data-ob="${i}.${k}" inputmode="decimal" value="${esc(r[k])}" aria-label="${l} ${i+1}"></td>`;
    return `<tr><td class="n">${i+1}</td>${c("std","Standard temperature")}${c("mv","UUC mV")}${c("uuc","UUC °C")}<td class="n ${m&&e!=null&&e===m.err?"c-warn":""}" data-oerr="${i}">${e!=null?fx(e):""}</td>${c("unc","Uncertainty")}<td><button class="link" data-odel="${i}" aria-label="Remove observation ${i+1}">✕</button></td></tr>`;}).join("")||`<tr><td colspan="7" class="muted small">No observations yet: add one row per calibration point of the certificate.</td></tr>`}
  </tbody></table></div><div class="row" style="margin-top:6px"><button data-oadd>+ Add observation</button>${m?`<span class="small muted">Largest error ${fx(m.err)} °C at ${m.std} °C${q.kind==="testtc"&&num(q.maxErr)==null?" (used as the largest error)":""}.</span>`:""}</div>`;}
function eqPrint(q){const O=obsOf(q),m=obsMax(q);
  return `${pHead("Test equipment calibration record (MWSPL-F-TC-04)")}<h2>${esc(q.id)} · ${esc(q.ident)}</h2>
  <div class="tw"><table><tbody>${[["Kind",q.kind==="testtc"?"Test thermocouple, type "+q.type:"Test instrument"],["Make / model",[q.make,q.model].filter(Boolean).join(" / ")||"—"],["Serial no.",q.serial||"—"],
    ["Range",q.lo!==""||q.hi!==""?`${q.lo} – ${q.hi} °C`:"—"],["Least count",q.lc||"—"],["Calibration laboratory",q.lab||"—"],["Certificate no.",q.cert||"—"],["Calibrated on / due",`${fmtD(q.calDate)} / ${fmtD(q.calDue)}`],
    ["Correction used for SATs",q.corr!==""?q.corr+" °C":"—"],...(q.kind==="testtc"?[["Largest error",num(q.maxErr)!=null?"± "+q.maxErr+" °C":m?"± "+fx(Math.abs(m.err))+" °C (observed)":"—"]]:[])].map(([a,b])=>`<tr><td style="width:200px"><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>
  <h3>Thermal calibration observations</h3><p class="small">Expanded uncertainty at ${esc(q.cl||"__")} % confidence level, k = ${esc(q.k||"__")}.</p>
  <div class="tw"><table class="rdp"><thead><tr><th class="n">Sr. No.</th><th class="n">Standard temperature °C</th><th class="n">UUC mV</th><th class="n">UUC °C</th><th class="n">Error °C</th><th class="n">Uncertainty ± °C</th></tr></thead><tbody>
  ${O.map((r,j)=>`<tr><td class="n">${j+1}</td><td class="n">${esc(r.raw.std)}</td><td class="n">${esc(r.raw.mv)}</td><td class="n">${esc(r.raw.uuc)}</td><td class="n">${r.err!=null?fx(r.err):""}</td><td class="n">${r.raw.unc!==""?"± "+esc(r.raw.unc):""}</td></tr>`).join("")||`<tr><td colspan="6">No observations recorded.</td></tr>`}</tbody></table></div>
  ${calRecIssues(q).length?`<p class="small">Open points: ${esc(calRecIssues(q).join("; "))}</p>`:""}${q.notes?`<p class="small">${esc(q.notes)}</p>`:""}
  <p class="small" style="margin-top:24px">Checked by: ____________________ Date: __________</p>`;}
/* the corrections from the calibration observations, offered in the SAT dialog */
function corrHint(r){const L=satCorrs(r).filter(x=>x.q).map(x=>!x.c?`<li>${esc(x.q.ident)}: no calibration observations, the correction is typed (register default ${esc(x.q.corr||"0")} °C).</li>`
    :`<li>${esc(x.q.ident)}: correction <b>${fx(x.c.c,2)} °C</b> at ${x.c.T} °C (${esc(x.c.how)}) ${x.v!=null&&!x.off?pill("ok","used"):`<button class="link" data-usecorr="${x.k}">Use ${fx(x.c.c,2)} °C</button>`}</li>`);
  return L.length?`<div class="small" style="margin-top:6px"><span class="muted">From the calibration record (correction = − error at the ${readingsOf(r).length?"mean test reading":"set point"}):</span><ul style="margin:4px 0 0 18px">${L.join("")}</ul></div>`:"";}
function satModal(id,tc){const r=S.sats.find(x=>x.id===id);const d=new Date();
  openModal({kind:"sat",ed:padRd(r?clone(r):fillSat({tc:tc||"",date:today(),time:`${pad(d.getHours())}:${pad(d.getMinutes())}`,instrCorr:"",tcCorr:""})),msg:"",paste:""});}
/* the reading table of the SAT dialog: one row per reading, times from the start time */
function rdBlock(r,v){
  if(legacy(r))return `<p class="banner">Recorded before the ${esc(C().satMin)}-minute series: one reading, furnace ${esc(r.fRdg||"—")} °C, test ${esc(r.tRdg||"—")} °C. <button data-rdseries>Enter the ${esc(C().satMin)}-minute series</button></p>`;
  const n=r.rd.length,D=Object.fromEntries(v.list.map(x=>[x.i,x]));
  return `<p class="small muted">${n} readings, one every ${esc(C().satStep)} min from the start time ${esc(r.time||"(enter the time)")}: read the furnace instrument (SCADA) and the test instrument at the same moment. Paste two columns from Excel (furnace, test; a time column is skipped) or type them; Enter moves down.</p>
  <div class="row w" style="margin:6px 0"><textarea id="rd-paste" rows="2" placeholder="Paste furnace and test readings" style="flex:1 1 260px">${esc(S.modal.paste||"")}</textarea><button data-rdpaste>Fill from the pasted lines</button><button data-rdclear>Clear readings</button></div>
  ${scadaBox(r)}
  <div class="tw rdw"><table class="rdt"><thead><tr><th class="n">#</th><th>Time</th><th>Furnace °C</th><th>Test °C</th><th class="n">Difference °C</th></tr></thead><tbody>${r.rd.map((x,i)=>{const d=D[i];
    return `<tr><td class="n">${i+1}</td><td class="mono">${esc(rdTime(r,i))}</td><td><input id="rd-${i}-f" data-rd="${i}.f" inputmode="decimal" value="${esc(x.f)}" aria-label="Furnace reading ${i+1}"></td><td><input id="rd-${i}-t" data-rd="${i}.t" inputmode="decimal" value="${esc(x.t)}" aria-label="Test reading ${i+1}"></td><td class="n ${d&&Math.abs(d.d)>v.tol?"c-bad":""}">${d?fx(d.d):""}</td></tr>`;}).join("")}</tbody></table></div>`;}
/* furnace readings from the SCADA review: the PV of the thermocouple's column in a record loaded this session */
function rdTimesMs(r){const m=/^(\d{2}):(\d{2})/.exec(r.time||"");if(!isDate(r.date)||!m)return null;const d0=Date.UTC(+r.date.slice(0,4),+r.date.slice(5,7)-1,+r.date.slice(8,10));
  return r.rd.map((x,i)=>d0+Math.round((+m[1]*60+ +m[2]+i*(+C().satStep||1))*60000));}
function scadaPull(r){const e=tcById(r.tc),T=rdTimesMs(r);if(!MWS.scada||!MWS.scada.pvAt)return {ok:false,why:"The SCADA review module is not part of this build."};
  if(!e)return {ok:false,why:"Choose the thermocouple tested."};if(!T)return {ok:false,why:"Enter the date and the start time."};if(tcNo(e.tag)==null)return {ok:false,why:"The thermocouple has no number in its tag."};
  return MWS.scada.pvAt(e.furnace,e.chamber,tcNo(e.tag),T);}
function scadaBox(r){const e=tcById(r.tc),res=scadaPull(r),n=res.ok?res.vals.filter(v=>v!=null).length:0;
  return `<div class="banner" style="margin:6px 0"><b>Furnace readings from the SCADA review</b>${e?` · ${esc(e.furnace)} ${esc(e.chamber)} ${esc(e.tag)} → PV-${tcNo(e.tag)??"?"}`:""}<br>
    ${res.ok?`${n} of ${res.vals.length} reading times found in ${esc(res.file)}${res.sample?" (example record)":""}.`:esc(res.why)}
    ${r.src&&r.src.file?`<br><span class="small">Filled from ${esc(r.src.file)} on ${fmtD(r.src.at)} (${r.src.n} readings).</span>`:""}
    <div class="row" style="margin-top:6px"><button class="w" data-rdscada ${res.ok&&n?"":"disabled"}>Fill furnace readings from SCADA</button>
    <label class="btn w" style="cursor:pointer">Load the SCADA export of the test day<input type="file" id="rd-scfile" accept=".xlsx,.csv" hidden></label></div></div>`;}
const padRd=r=>{if(legacy(r))return r;while(r.rd.length<nRd())r.rd.push({f:"",t:""});return r;};
/* lines of furnace / test readings pasted from Excel or a logger: the last two numbers of each line, a time column ignored */
function pasteRd(txt){return String(txt||"").split(/\r?\n/).map(l=>l.split(/[\t;, ]+/).filter(x=>x&&!/:/.test(x)).map(x=>num(x)).filter(x=>x!=null)).filter(a=>a.length>=2).map(a=>({f:String(a[a.length-2]),t:String(a[a.length-1])}));}
function DRAW_SAT(){const r=S.modal.ed,known=S.sats.find(x=>x.id===r.id),v=satEval(r),m=satMissing(r),tt=eqById(r.testTc),e=tcById(r.tc);
  const tcs=Object.fromEntries(S.tcs.filter(x=>(x.status==="inuse"&&SATUSE.includes(x.use))||x.id===r.tc).map(x=>[x.id,tcName(x)+" · "+USE[x.use]]));
  const ins=Object.fromEntries(S.eq.filter(q=>q.kind==="instr"&&(q.active||q.id===r.instr)).map(q=>[q.id,q.ident+" (due "+fmtD(q.calDue)+")"]));
  const tts=Object.fromEntries(S.eq.filter(q=>q.kind==="testtc"&&(q.active||q.id===r.testTc)).map(q=>[q.id,q.ident+" · type "+q.type+" (due "+fmtD(q.calDue)+")"]));
  const prevD=tt&&DEPTHTYPES.includes(tt.type)?S.sats.filter(x=>x.testTc===tt.id&&x.id!==r.id&&(x.date+x.time)<(r.date+r.time)).map(x=>num(x.depth)||0):[];
  const body=`<fieldset><legend>Thermocouple and test</legend><div class="fields">${mf("tc","Thermocouple tested",{opts:tcs,blank:1,req:1})}${mf("date","Date",{type:"date",req:1})}${mf("time","Time",{type:"time",req:1})}${mf("by","Technician",{req:1})}${mf("sp","Set point °C",{num:1,req:1})}</div></fieldset>
  <fieldset><legend>Test equipment</legend><div class="fields">${mf("instr","Test instrument",{opts:ins,blank:1,req:1})}${mf("testTc","Test thermocouple",{opts:tts,blank:1,req:1})}
    ${mf("depth","Insertion depth of the test TC (mm)"+(tt&&DEPTHTYPES.includes(tt.type)?" · required for type "+tt.type:""),{num:1,req:tt&&DEPTHTYPES.includes(tt.type)})}</div>
    ${prevD.length?`<p class="small muted">${esc(tt.ident)} used ${plural(prevD.length+(num(tt.uses0)||0),"time")} before; deepest earlier insertion ${Math.max(...prevD)} mm.</p>`:""}
    <p class="small muted">Do not use the test TC at the same position as the control TC's tip only by memory: insert it next to the tip (within 50 mm, CQI-9 P3.3, confirm against the copy).</p></fieldset>
  <fieldset><legend>Readings over ${esc(C().satMin)} minutes</legend><div class="fields">${mf("instrCorr","Test instrument correction °C",{num:1,req:1,ph:"0"})}${mf("tcCorr","Test TC correction °C",{num:1,req:1,ph:tt&&tt.corr!==""?tt.corr:"0"})}</div>
    ${corrHint(r)}
    ${rdBlock(r,v)}
    <p style="margin-top:8px">${v.diff==null?`<span class="muted">Enter the furnace and test readings for the SAT difference.</span>`:`SAT difference (mean of ${plural(v.n,"reading")}) <b>${fx(v.diff)} °C</b> (tolerance ±${v.tol} °C) ${resPill(r)}${v.n>1?` <span class="small muted">· per reading ${fx(v.dMin)} to ${fx(v.dMax)} °C · furnace range ${fx(v.fRange)} °C</span>`:""}`}</p>
    ${satChart(r,v)}
    ${v.notes.length?`<p class="banner warn">${esc(v.notes.join(" · "))}</p>`:""}
    ${v.invalid.length?`<p class="banner bad">${esc(v.invalid.join(" · "))}</p>`:""}</fieldset>
  ${v.res==="fail"?`<fieldset><legend>Reaction to the failed SAT</legend><div class="fields">${mf("act.kind","Action taken",{opts:opts(ACTIONS),blank:1,req:1})}${mf("act.cause","Cause",{area:2,wide:1,req:1})}${mf("act.action","Corrective action (adjust offset, replace element …)",{area:2,wide:1,req:1})}${mf("act.impact","Product impact (trays since the last passing SAT)",{area:2,wide:1,req:1})}${mf("act.by","Owner",{req:1})}${mf("act.date","Date",{type:"date",req:1})}</div>
    <p class="small">Replacement: ${S.repl.filter(x=>x.satRef===r.id).map(x=>`<button class="link" data-replrec="${esc(x.id)}">${esc(x.id)} · ${fmtD(x.date)} · ${esc(x.oldSerial)} → ${esc(x.newSerial)}</button>`).join(" ")||(r.act.kind===ACTIONS[0]?`<span class="c-bad">not recorded yet: use "Replace element…" on the thermocouple</span>`:`<span class="muted">none</span>`)}</p></fieldset>`:""}
  <fieldset><legend>Approval</legend><div class="fields">${mf("appr.by","Approved by",{req:1})}${mf("appr.date","Approval date",{type:"date",req:1})}${mf("notes","Notes",{area:2,wide:1})}</div></fieldset>
  ${m.length?`<div class="banner" style="margin-top:10px"><b>Record incomplete (P3.3.5):</b> ${esc(m.join(" · "))}</div>`:""}`;
  return sheet(esc(known?r.id+" · "+tcName(e):"Record a SAT"),body,`<button class="pri w" data-save-sat>Save</button>${known?`<button data-satprint>Print record</button><button class="danger w" data-del-sat>Delete</button>`:""}<button data-close>Close</button>`);}
function roundModal(){const U=inUse().map(e=>({e,t:tubeState(e)})).sort((a,b)=>(a.t.due||"0")<(b.t.due||"0")?-1:1);
  openModal({kind:"round",date:today(),by:"",lines:U.map(x=>({tc:x.e.id,res:"",note:"",mat:""})),msg:""});}
function DRAW_ROUND(){const m=S.modal;
  return sheet("Protection tube check round",`<p class="muted">Check each tube due (WI-TC-03). Leave the result empty for tubes not checked. Element and tube are replaced together: a worn or cracked tube stays open until the thermocouple is replaced (Thermocouple replacements, reason "${R_TUBE}").</p>
  <div class="fields"><label class="f req"><span>Date</span><input type="date" id="rd-date" value="${esc(m.date)}"></label><label class="f req"><span>Checked by</span><input id="rd-by" value="${esc(m.by)}"></label></div>
  <div class="row" style="margin:8px 0"><button class="w" data-rdok>Mark every tube due or overdue as OK</button></div>
  <div class="tw"><table><thead><tr><th>Thermocouple</th><th>Tube</th><th>Status</th><th>Result</th><th>Note</th></tr></thead><tbody>${m.lines.map((l,i)=>{const e=tcById(l.tc);return `<tr><td>${esc(tcName(e))}</td><td>${esc(e.tube.mat||"—")}</td><td>${tubePill(e)}</td>
    <td><select data-rl="${i}.res"><option value="">—</option>${Object.entries(TRES).filter(([k])=>k!=="replaced").map(([k,v])=>`<option value="${k}" ${l.res===k?"selected":""}>${v[1]}</option>`).join("")}</select></td>
    <td><input data-rl="${i}.note" value="${esc(l.note)}" placeholder="note"></td></tr>`;}).join("")}</tbody></table></div>`,
  `<button class="pri w" data-save-round>Save checks</button><button data-close>Cancel</button>`);}
function DRAW_PMAPPR(){const m=S.modal;return sheet("Approve the protection tube PM schedule",`<p class="muted">Approving issues rev ${(+S.pm.rev||0)+1} of the schedule: the tube material and intervals of the ${plural(inUse().length,"thermocouple")} in use.</p>
  <div class="fields"><label class="f req"><span>Approved by</span><input id="pa-by" value="${esc(m.by)}"></label><label class="f req"><span>Date</span><input type="date" id="pa-date" value="${esc(m.date)}"></label><label class="f"><span>Document / form reference</span><input id="pa-ref" value="${esc(S.pm.ref||"MWSPL-F-TC-03")}"></label></div>`,
  `<button class="pri w" data-save-pm>Approve</button><button data-close>Cancel</button>`);}
function DRAW_PRINT(){return sheet(esc(S.modal.title),`<div id="jobcard">${S.modal.html()}</div>`,`<button class="pri" data-print>Print</button><button data-close>Close</button>`);}
const pHead=t=>`<p class="small muted">${esc(C().plant)} · ${esc(t)} · printed ${fmtD(today())}</p>`;
function satPrint(r){const e=tcById(r.tc),v=satEval(r),it=eqById(r.instr),tt=eqById(r.testTc);
  return `${pHead("System accuracy test record (MWSPL-F-TC-02, CQI-9 P3.3.5)")}<h2>${esc(r.id)} · ${esc(tcName(e))}</h2>
  <div class="tw"><table><tbody>${[["Thermocouple tested",`${tcName(e)} · ${USE[e?e.use:""]||""} · type ${e?e.type:""} · serial ${e?e.serial:""}`],["Date and time",`${fmtD(r.date)} ${r.time}`],["Set point",`${r.sp} °C`],
    ["Test instrument",it?`${it.ident} · cert ${it.cert} · due ${fmtD(it.calDue)}`:"—"],["Test thermocouple",tt?`${tt.ident} · type ${tt.type} · cert ${tt.cert} · due ${fmtD(tt.calDue)}`:"—"],["Insertion depth",r.depth?r.depth+" mm":"—"],
    ...(legacy(r)?[["Furnace reading",`${r.fRdg} °C`],["Test reading",`${r.tRdg} °C`]]:[["Readings",`${v.n} furnace / test pairs, ${rdTime(r,0)} – ${rdTime(r,Math.max(0,r.rd.length-1))}, every ${C().satStep} min (${C().satMin} min required: ${nRd()} pairs)`],["Mean furnace / test reading",`${fx(v.fMean)} °C / ${fx(v.tMean)} °C · furnace range ${fx(v.fRange)} °C`]]),
    ...(r.src&&r.src.file?[["Furnace readings",`from the SCADA export ${r.src.file} (${r.src.n} readings, filled ${fmtD(r.src.at)})`]]:[]),["Corrections",`instrument ${r.instrCorr||0} °C · test TC ${r.tcCorr||0} °C`+satCorrs(r).filter(x=>x.c).map(x=>` · ${x.l} calibration ${fx(x.c.c,2)} °C at ${x.c.T} °C (${x.c.how})`).join("")],["SAT difference",`${fx(v.diff)} °C${v.n>1?` (mean; per reading ${fx(v.dMin)} to ${fx(v.dMax)} °C)`:""} · tolerance ±${C().satTol} °C`],
    ["Result",v.invalid.length?"INVALID: "+v.invalid.join("; "):v.res==="fail"?"FAIL":"PASS"],["Technician",r.by],["Approved",`${r.appr.by} · ${fmtD(r.appr.date)}`]].map(([a,b])=>`<tr><td style="width:200px"><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>
  ${v.notes.length?`<p class="small">Notes: ${esc(v.notes.join("; "))}</p>`:""}
  ${!legacy(r)&&v.n?`<h3>Readings</h3>${satChart(r,v)}<div class="tw"><table class="rdp"><thead><tr><th class="n">#</th><th>Time</th><th class="n">Furnace °C</th><th class="n">Test °C</th><th class="n">Difference °C</th></tr></thead><tbody>${v.list.map(x=>`<tr><td class="n">${x.i+1}</td><td>${esc(rdTime(r,x.i))}</td><td class="n">${x.f}</td><td class="n">${x.t}</td><td class="n">${fx(x.d)}</td></tr>`).join("")}</tbody></table></div>`:""}
  ${v.res==="fail"?`<h3>Reaction</h3><p>Cause: ${esc(r.act.cause)}<br>Action: ${esc(r.act.action)}<br>Product impact: ${esc(r.act.impact)}<br>Owner: ${esc(r.act.by)} · ${fmtD(r.act.date)}</p>`:""}${r.notes?`<p class="small">${esc(r.notes)}</p>`:""}`;}
function pmPrint(){return `${pHead("Protection tube PM schedule (MWSPL-F-TC-03)")}<p>${isDate(S.pm.apprDate)?`Rev ${S.pm.rev} · approved ${fmtD(S.pm.apprDate)} by ${esc(S.pm.appr)}${S.pm.ref?" · "+esc(S.pm.ref):""}`:"NOT APPROVED"}</p>
  <div class="tw"><table><thead><tr><th>Thermocouple</th><th>Tube</th><th>Installed</th><th>Check every</th><th>Replace after</th><th>Next check</th><th>Replace by</th></tr></thead><tbody>${inUse().map(e=>{const t=tubeState(e);return `<tr><td>${esc(tcName(e))}</td><td>${esc(e.tube.mat)}</td><td>${fmtD(e.installed)}</td><td>${esc(e.tube.checkDays)} d</td><td>${esc(e.tube.replDays||"—")}${e.tube.replDays?" d":""}</td><td>${fmtD(t.due)}</td><td>${fmtD(t.rdue)}</td></tr>`;}).join("")}</tbody></table></div>`;}
function h33Print(){const A=assess33(),sc=SCORE[A.score];return `${pHead("CQI-9 HTSA 3.3 self-assessment")}<p><span class="verdict ${sc[2]}">${sc[1]}</span></p>
  <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${esc(LV[i.lvl][1])}</td></tr>`).join("")}</tbody></table></div>
  <h3 style="margin-top:12px">Thermocouples in use</h3><div class="tw"><table><thead><tr><th>Thermocouple</th><th>Use</th><th>Certificate</th><th>Installed</th><th>Last SAT</th><th>SAT due</th><th>Tube check due</th></tr></thead><tbody>${inUse().map(e=>{const s=satState(e),t=tubeState(e);
    return `<tr><td>${esc(tcName(e))}</td><td>${esc(USE[e.use])}</td><td>${esc(e.cal.cert)}</td><td>${fmtD(e.installed)}</td><td>${s.last?esc(s.last.id)+" "+fmtD(s.last.date)+" "+fx(satEval(s.last).diff)+" °C":"—"}</td><td>${s.due?fmtD(s.due):esc(s.txt)}</td><td>${t.due?fmtD(t.due):esc(t.txt)}</td></tr>`;}).join("")}</tbody></table></div>`;}
const DRAW={replrec:DRAW_REPLREC,tc:DRAW_TC,repl:DRAW_REPL,eq:DRAW_EQ,sat:DRAW_SAT,round:DRAW_ROUND,pmappr:DRAW_PMAPPR,print:DRAW_PRINT};

/* 10. actions */
async function saveTc(){const e=fillTc(S.modal.ed),known=S.tcs.find(x=>x.id===e.id);
  if(!e.furnace||!e.tag.trim()){msg("Enter the furnace and the tag.");return;}
  if(e.status==="inuse"&&S.tcs.some(x=>x.id!==e.id&&x.status==="inuse"&&x.furnace===e.furnace&&x.chamber===e.chamber&&x.tag.trim().toUpperCase()===e.tag.trim().toUpperCase())){msg(`${e.furnace} ${e.chamber} ${e.tag} is already in use: replace that element instead.`);return;}
  if(e.installed&&e.installed>today()){msg("The installation date is in the future.");return;}
  const pmCh=!known||["mat","checkDays","replDays"].some(k=>String(known.tube[k])!==String(e.tube[k]));
  if(!known)e.id=nextCode("TE",S.tcs);
  if(await put("tcs",e,known?"Saved":"Registered")){if(pmCh)await markPm((known?"Tube data of ":"New thermocouple ")+tcName(e));toast(tcName(e)+" saved");closeModal();}}
/* the replacement dialog keeps what was typed when it redraws (reason → TUS question) */
const RPF={date:"rp-date",time:"rp-time",reason:"rp-reason",satRef:"rp-sat",serial:"rp-serial",type:"rp-type",cert:"rp-cert",cdate:"rp-cdate",lo:"rp-lo",hi:"rp-hi",err:"rp-err",offset:"rp-offset",tus:"rp-tus",by:"rp-by",notes:"rp-notes",tmat:"rp-tmat"};
const rpKeep=()=>{const m=S.modal;Object.entries(RPF).forEach(([k,id])=>{const el=$("#"+id);if(el)m[k]=el.value;});};
async function replaceTc(){rpKeep();const m=S.modal,old=clone(tcById(m.id));
  const F=S.sats.filter(r=>r.tc===old.id&&satEval(r).res==="fail");
  const miss=[!isDate(m.date)&&"date",!txt(m.tmat)&&!old.tube.mat&&"protection tube material",!m.reason&&"reason",m.reason===R_SAT&&F.length&&!m.satRef&&"the failed SAT that found it",!txt(m.serial)&&"fitted element serial",!txt(m.cert)&&"certificate",!isDate(m.cdate)&&"calibration date",(num(m.lo)==null||num(m.hi)==null)&&"calibrated range",num(m.err)==null&&"largest error",!m.offset&&"controller offset reset",m.reason===R_MOVE&&!m.tus&&"TUS decision",!txt(m.by)&&"replaced by",m.offset===OFFSET[2]&&!txt(m.notes)&&"why the offset was not reset (notes)"].filter(Boolean);
  if(miss.length){msg("Missing: "+miss.join(", ")+".");return;}
  if(m.date>today()){msg("Not in the future.");return;}if(m.cdate>m.date){msg("The fitted element must be calibrated before it is put into use.");return;}
  const n=fillTc({...clone(old),id:nextCode("TE",S.tcs),serial:txt(m.serial),type:m.type||old.type,installed:m.date,status:"inuse",removed:"",reason:"",replacedBy:"",log:[],
    cal:{cert:txt(m.cert),lab:old.cal.lab,date:m.cdate,lo:m.lo,hi:m.hi,maxErr:m.err},tube:{...old.tube,mat:txt(m.tmat)||old.tube.mat,installed:m.date}});
  old.status="removed";old.removed=m.date;old.reason=m.reason;old.replacedBy=n.id;
  const r=fillRepl({id:nextCode("TR",S.repl),oldTc:old.id,newTc:n.id,date:m.date,time:m.time||"",oldSerial:old.serial,oldInstalled:old.installed,newSerial:n.serial,newType:n.type,cert:n.cal.cert,
    reason:m.reason,offset:m.offset,tus:m.reason===R_MOVE?m.tus:"",satRef:m.satRef||"",by:txt(m.by),notes:[txt(m.notes),"Protection tube replaced with the element"+(txt(m.tmat)?" ("+txt(m.tmat)+")":"")].filter(Boolean).join(" · ")});
  if(await put("tcs",n,`Installed, replacing ${old.serial} (${old.reason}, ${r.id})`)&&await put("tcs",old,`Removed: ${old.reason}; replaced by ${n.serial} (${r.id})`)&&await put("repl",r,"Recorded")){
    if(n.tube.mat!==old.tube.mat)await markPm(`Protection tube of ${tcName(n)} changed to ${n.tube.mat} at its replacement`);toast(`${r.id}: thermocouple replaced (element and tube), a SAT is due before use`);closeModal();}}
async function saveEq(){const q=fillEq(S.modal.ed),known=S.eq.find(x=>x.id===q.id);if(!q.ident.trim()){msg("Enter the ident.");return;}
  q.obs=q.obs.filter(r=>r.std!==""||r.mv!==""||r.uuc!==""||r.unc!=="");if(num(q.lo)!=null&&num(q.hi)!=null&&num(q.lo)>=num(q.hi)){msg("The range: the lower limit must be below the upper.");return;}
  if(S.eq.some(x=>x.id!==q.id&&x.ident.trim().toUpperCase()===q.ident.trim().toUpperCase()&&!isNA(q.ident))){msg("That ident is already registered.");return;}
  if(!known)q.id=nextCode("TT",S.eq);if(await put("eq",q,known?"Saved":"Registered")){toast(q.ident+" saved");closeModal();}}
async function saveSat(){const r=fillSat(S.modal.ed),known=S.sats.find(x=>x.id===r.id);
  if(!r.tc||!isDate(r.date)){msg("Choose the thermocouple and the date.");return;}if(r.date>today()){msg("The test date is in the future.");return;}
  if(r.appr.date&&r.appr.date<r.date){msg("The approval cannot be before the test.");return;}
  if(!legacy(r)){while(r.rd.length&&r.rd[r.rd.length-1].f===""&&r.rd[r.rd.length-1].t===""&&r.rd.length>nRd())r.rd.pop();const v=satEval(r);r.fRdg=v.n?String(v.fMean):"";r.tRdg=v.n?String(v.tMean):"";}
  if(!known)r.id=nextCode("SAT",S.sats);const m=satMissing(r);
  if(await put("sats",r,known?"Saved":"Recorded")){toast(r.id+(m.length?" saved · "+m.length+" item(s) missing":" saved"));closeModal();}}
async function saveRound(){const m=S.modal,dt=$("#rd-date").value,by=$("#rd-by").value.trim();if(!isDate(dt)||!by){msg("Enter the date and who checked.");return;}if(dt>today()){msg("Not in the future.");return;}
  const L=m.lines.filter(l=>l.res);if(!L.length){msg("No result entered.");return;}
  if(L.some(l=>(l.res==="worn"||l.res==="cracked")&&!l.note)){msg("Describe the condition of each worn or cracked tube.");return;}
  const recs=L.map(l=>fillTube({tc:l.tc,date:dt,by,res:l.res,note:l.note,mat:l.res==="replaced"?l.mat:""}));
  let k=Math.max(0,...S.tubes.map(x=>+(String(x.id).match(/(\d+)$/)||[0,0])[1]));recs.forEach(r=>r.id="PT-"+String(++k).padStart(4,"0"));
  await batchPut("tubes",recs);
  const bad=L.filter(l=>l.res==="worn"||l.res==="cracked").length;
  toast(plural(recs.length,"tube check")+" saved"+(bad?` · ${plural(bad,"thermocouple")} to replace (element and tube)`:""));closeModal();}
/* example readings: test reading tR with a slow drift, furnace = test + diff, small noise (deterministic) */
function exRd(tR,diff,seed){let x=seed*9301+49297;const rnd=()=>((x=(x*9301+49297)%233280)/233280-0.5);
  return Array.from({length:nRd()},(_,i)=>{const t=tR+Math.sin((i+seed)/6)*0.6+rnd()*0.4;return {f:String(Math.round((t+diff+rnd()*0.8)*10)/10),t:String(Math.round(t*10)/10)};});}
async function stdOps(){if(!needDb())return;if(S.tcs.length||S.sats.length){toast("Only on an empty module.");return;}
  const d=today(),D=n=>addDays(d,n),ex=" (example)",T=[],SA=[],TB=[];let te=0,sa=0,pt=0;
  const EQ=[fillEq({id:"TT-0001",kind:"instr",ident:"DTI-07 Fluke 714B"+ex,make:"Fluke",model:"714B",serial:"4471023",lo:"0",hi:"1200",lc:"0.1 °C",lab:"NABL lab (example)",cert:"CAL/INS/2291",calDate:D(-120),calDue:D(245),corr:"0.2",cl:"95",k:"2",
      obs:[["0","0.000","-0.1","0.3"],["300","12.209","299.8","0.3"],["600","24.905","599.8","0.4"],["900","37.326","899.8","0.4"],["1100","45.119","1099.7","0.5"]].map(([std,mv,uuc,unc])=>({std,mv,uuc,unc}))}),
    fillEq({id:"TT-0002",kind:"testtc",ident:"TTC-K-101"+ex,type:"K",make:"Tempsens",model:"K-MI 3 mm",serial:"K-101",lo:"400",hi:"1000",lc:"0.001 mV",lab:"NABL lab (example)",cert:"CC/2301",calDate:D(-100),calDue:D(265),corr:"-0.4",maxErr:"0.8",uses0:"0",cl:"95",k:"2",
      obs:[["400","16.420","400.3","0.9"],["600","24.880","600.4","0.9"],["800","33.250","800.4","1.0"],["900","37.290","900.5","1.0"],["1000","41.300","1000.6","1.1"]].map(([std,mv,uuc,unc])=>({std,mv,uuc,unc}))}),
    fillEq({id:"TT-0003",kind:"testtc",ident:"TTC-N-201"+ex,type:"N",cert:"CC/2318",calDate:D(-400),calDue:D(-35),corr:"0.3",maxErr:"0.9",uses0:"4"})];
  const furn=["F-01","F-02","F-03","F-04"];
  furn.forEach((f,fi)=>CH.forEach((ch,ci)=>{for(let k=1;k<=6;k++){const id="TE-"+String(++te).padStart(4,"0"),inst=D(-300+fi*20+k*3),tubeInst=inst;
    const e=fillTc({id,tag:"TC-"+pad(k),furnace:f,chamber:ch,use:"control",type:"K",serial:`K-${f.slice(2)}${ci?"T":"H"}${k}-${2400+te}`,sheath:"6 mm MI, Inconel 600",installed:inst,
      cal:{cert:"CC/"+(2100+te),lab:"Example calibration lab",date:addDays(inst,-10),lo:ch==="Hardening"?"600":"400",hi:ch==="Hardening"?"1000":"950",maxErr:"1.6"},
      tube:{mat:ch==="Hardening"?"Inconel 600":"AISI 310",installed:tubeInst,checkDays:"30",replDays:"365"},notes:"Example",log:[{d,t:"Example"}]});
    if(f==="F-03"&&ch==="Tempering"&&k===2)e.cal.cert="";                          /* a missing certificate */
    T.push(e);
    const sp=ch==="Hardening"?(k<=2?840:870):(k<=2?560:580);
    const last=f==="F-03"&&ch==="Hardening"&&k===4?-100:-20-fi*7-k;               /* F-03 hardening TC-04: SAT overdue */
    [last-270,last-180,last-90,last].forEach((o,j)=>{const fail=f==="F-02"&&ch==="Hardening"&&k===5&&j===3;  /* F-02 hardening TC-05: failed, reaction open */
      const drift=f==="F-03"&&ch==="Tempering"&&k===1?1.7*j:0;                     /* F-03 tempering TC-01: drifting towards the limit (warning on the last SAT) */
      const tR=sp+((k*7+fi*3+j)%5-2)*0.4;
      SA.push(fillSat({id:"SAT-"+String(++sa).padStart(4,"0"),tc:id,date:D(o),time:"10:"+pad(10+k*5),by:"S. Patil"+ex,sp:String(sp),instr:"TT-0001",testTc:"TT-0002",depth:String(150+j*10),
        rd:exRd(tR,(fail?7.2:((k+fi)%3-1)*0.8+drift)-0.2,k*13+fi*7+j),instrCorr:"0.2",tcCorr:"-0.4",
        appr:fail?{by:"",date:""}:{by:"R. Sharma"+ex,date:D(o+1)},act:fail?{cause:"Element drift suspected",action:"",impact:"",by:"",date:""}:{},log:[{d,t:"Example"}]}));});
    const chk=f==="F-04"&&ch==="Hardening"&&k===3?-45:-10-k;                      /* F-04 hardening TC-03: tube check overdue */
    TB.push(fillTube({id:"PT-"+String(++pt).padStart(4,"0"),tc:id,date:D(chk),by:"Maintenance"+ex,res:f==="F-01"&&ch==="Hardening"&&k===6?"worn":"ok",note:f==="F-01"&&ch==="Hardening"&&k===6?"Heavy scaling at the tip":""}));}}));
  /* the depth rule: the last SAT with the reused K test TC is shallower on one record */
  const sh=SA.find(r=>r.tc==="TE-0009"&&r.depth==="180");if(sh)sh.depth="120";
  S.cfg={...S.cfg};await dbSet("config","settings",S.cfg);
  S.pm={rev:1,appr:"R. Sharma"+ex,apprDate:D(-200),ref:"MWSPL-F-TC-03",dirty:false,log:[{d:D(-200),t:"Approved rev 1 (example)"}]};await dbSet("config","pm",S.pm);
  /* two example replacements: F-01 hardening TC-03 at its service life 60 days ago (verified by the later SAT), F-04 tempering TC-06 five days ago (SAT still due) */
  const RP=[];const exRepl=(f,ch,tag,day,reason,extra)=>{const cur=T.find(e=>e.furnace===f&&e.chamber===ch&&e.tag===tag);if(!cur)return;
    const old=fillTc({...clone(cur),id:"TE-"+String(++te).padStart(4,"0"),status:"removed",removed:D(day),reason,replacedBy:cur.id,log:[{d,t:"Example"}]});
    SA.filter(r=>r.tc===cur.id&&r.date<D(day)).forEach(r=>r.tc=old.id);
    cur.serial=cur.serial+"-R";cur.installed=D(day);cur.cal={...cur.cal,cert:cur.cal.cert+"R",date:D(day-12)};T.push(old);
    RP.push(fillRepl({id:"TR-"+String(RP.length+1).padStart(4,"0"),oldTc:old.id,newTc:cur.id,date:D(day),time:"09:30",oldSerial:old.serial,oldInstalled:old.installed,newSerial:cur.serial,newType:cur.type,cert:cur.cal.cert,
      reason,offset:OFFSET[0],by:"Maintenance"+ex,notes:"Example",log:[{d,t:"Example"}],...(extra||{})}));};
  exRepl("F-01","Hardening","TC-03",-60,R_LIFE);exRepl("F-04","Tempering","TC-06",-5,R_DRIFT,{offset:OFFSET[1],notes:"SAT trend −3 °C over three tests (example)"});
  SA.forEach(r=>{const v=satEval(r);r.fRdg=String(v.fMean);r.tRdg=String(v.tMean);});
  await batchPut("eq",EQ);await batchPut("tcs",T);await batchPut("sats",SA);await batchPut("tubes",TB);await batchPut("repl",RP);
  toast("Starter set-up loaded");render();}
async function importCalor(){if(!needDb())return;const o=calorSat();if(!o){toast("No CALOR SAT register found: read the CALOR Drive folder or files first");return;}
  const T=[],SA=[],EQ=[];let te=Math.max(0,...S.tcs.map(x=>+(x.id.match(/(\d+)$/)||[0,0])[1])),sa=Math.max(0,...S.sats.map(x=>+(x.id.match(/(\d+)$/)||[0,0])[1])),tt=Math.max(0,...S.eq.map(x=>+(x.id.match(/(\d+)$/)||[0,0])[1]));
  const map={};const eqId=(ident,kind,extra)=>{if(!ident)return "";const ex=[...S.eq,...EQ].find(q=>q.ident.trim().toUpperCase()===ident.trim().toUpperCase());if(ex)return ex.id;
    const q=fillEq({id:"TT-"+String(++tt).padStart(4,"0"),kind,ident,...extra});EQ.push(q);return q.id;};
  o.sensors.forEach(s=>{const ex=S.tcs.find(x=>x.status==="inuse"&&x.furnace===s.furnace&&x.chamber===s.chamber&&tcNo(x.tag)===tcNo(s.tag));
    if(ex){map[s.id]=ex.id;return;}const id="TE-"+String(++te).padStart(4,"0");map[s.id]=id;
    T.push(fillTc({id,tag:s.tag||"",furnace:s.furnace||"",chamber:s.chamber||"Hardening",use:"control",type:"K",serial:s.serial||"",installed:s.installed||"",
      tube:{checkDays:String(C().tubeCheckDays),replDays:String(C().tubeReplDays)},notes:"Imported from the CALOR SAT register",log:[{d:today(),t:"Imported from CALOR"}]}));});
  (o.cycles||[]).forEach(c=>{const R=Array.isArray(c.do&&c.do.readings)?c.do.readings.filter(r=>num(r.f)!=null&&num(r.t)!=null):[];if(!R.length||!map[c.sensor])return;
    const mean=a=>Math.round(a.reduce((x,y)=>x+y,0)/a.length*10)/10,p=c.plan||{},dd=c.do||{};
    if(S.sats.some(r=>r.notes&&r.notes.includes("CALOR "+c.id)))return;
    SA.push(fillSat({id:"SAT-"+String(++sa).padStart(4,"0"),tc:map[c.sensor],date:dd.date||p.date||"",time:dd.start||"",by:dd.tech||p.by||"",sp:String(p.setpoint??""),
      instr:eqId(p.instr,"instr",{calDue:p.instrCalDue||""}),testTc:eqId(p.testTc,"testtc",{type:"K",cert:p.testTcCert||"",calDue:p.testTcCalDue||"",uses0:String(p.testTcUses||0)}),
      rd:(dd.readings||[]).map(r=>({f:String(r.f??""),t:String(r.t??"")})),fRdg:String(mean(R.map(r=>+r.f))),tRdg:String(mean(R.map(r=>+r.t))),instrCorr:String(dd.instrCorr??""),tcCorr:String(dd.tcCorr??""),
      appr:c.check&&c.check.by?{by:c.check.by,date:c.check.date||""}:{by:"",date:""},notes:`CALOR ${c.id}, ${R.length} readings`,log:[{d:today(),t:"Imported from CALOR "+c.id}]}));});
  /* CALOR's replacement history: per thermocouple position, oldest first, each removed element becomes a removed element record linked to the
     one fitted after it (the last one to the registered element when its serial matches), and the imported SATs go to the element in place on their date */
  const RP=[];let tr=Math.max(0,...S.repl.map(x=>+(x.id.match(/(\d+)$/)||[0,0])[1]));const satMap={};SA.forEach(x=>{const m=String(x.notes).match(/CALOR (\S+),/);if(m)satMap[m[1]]=x.id;});
  const bySensor={};(o.repl||[]).filter(r=>!S.repl.some(x=>String(x.notes).includes("CALOR "+r.id))).forEach(r=>(bySensor[r.sensor]=bySensor[r.sensor]||[]).push(r));
  Object.entries(bySensor).forEach(([sid,L])=>{const tid=map[sid],cur=[...S.tcs,...T].find(x=>x.id===tid);if(!cur)return;
    L.sort((a,b)=>(a.date+(a.time||""))<(b.date+(b.time||""))?-1:1);
    const olds=L.map(r=>{const ex=S.tcs.find(x=>x.status==="removed"&&x.furnace===cur.furnace&&x.chamber===cur.chamber&&tcNo(x.tag)===tcNo(cur.tag)&&txt(x.serial)&&txt(x.serial)===txt(r.oldSerial));if(ex)return ex;
      const e=fillTc({...clone(cur),id:"TE-"+String(++te).padStart(4,"0"),serial:r.oldSerial||"",installed:r.oldInstalled||"",status:"removed",removed:r.date||"",reason:REASONS.includes(r.reason)?r.reason:"Other",replacedBy:"",
        cal:{cert:"",lab:"",date:"",lo:"",hi:"",maxErr:""},notes:"Removed element from the CALOR replacement history",log:[{d:today(),t:"Imported from CALOR "+r.id}]});T.push(e);return e;});
    L.forEach((r,i)=>{const nextTc=i+1<L.length?(txt(olds[i+1].serial)===txt(r.newSerial)?olds[i+1].id:""):(txt(cur.serial)===txt(r.newSerial)?cur.id:"");
      if(nextTc&&!olds[i].replacedBy)olds[i].replacedBy=nextTc;
      RP.push(fillRepl({id:"TR-"+String(++tr).padStart(4,"0"),oldTc:olds[i].id,newTc:nextTc,date:r.date||"",time:r.time||"",oldSerial:r.oldSerial||"",oldInstalled:r.oldInstalled||"",newSerial:r.newSerial||"",
        newType:r.newType||"K",cert:r.cert||"",reason:REASONS.includes(r.reason)?r.reason:"Other",offset:r.offset||"",tus:r.tus||"",satRef:satMap[r.satRef]||"",by:r.by||"",notes:`CALOR ${r.id}${r.notes?": "+r.notes:""}`,log:[{d:today(),t:"Imported from CALOR "+r.id}]}));});
    /* the imported SATs of this position belong to the element in place on the test day */
    SA.filter(x=>x.tc===tid).forEach(x=>{const i=L.findIndex(r=>x.date<r.date);if(i>=0)x.tc=olds[i].id;});});
  await batchPut("eq",EQ);await batchPut("tcs",T);await batchPut("sats",SA);await batchPut("repl",RP);if(T.length)await markPm("Thermocouples imported from CALOR");
  toast(`${plural(T.length,"thermocouple")}, ${plural(SA.length,"SAT")} and ${plural(EQ.length,"test item")} imported from CALOR`);}
function armedDelete(b,fn,lbl){if(b.classList.contains("armed")){fn();return;}b.classList.add("armed");const t=b.textContent;b.textContent=lbl||"Confirm delete";setTimeout(()=>{if(b.isConnected){b.classList.remove("armed");b.textContent=t;}},4000);}
async function download(name,text,type){
  if(S.dl){try{await S.dl.save({filename:name,data:new Blob([text],{type})});return;}catch(e){if(e&&e.code==="declined")return;}}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
const exportJson=()=>download(`mws-tc-${today()}.json`,JSON.stringify({app:"mws-tc-manager",v:1,saved:new Date().toISOString(),tcs:S.tcs,eq:S.eq,sats:S.sats,tubes:S.tubes,repl:S.repl,config:S.cfg,pm:S.pm},null,1),"application/json");
const csvQ=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
const csvOut=(name,H,R)=>download(name,"﻿"+[H,...R].map(r=>r.map(csvQ).join(",")).join("\r\n"),"text/csv");
const csv=()=>csvOut(`mws-tc-register-${today()}.csv`,["Furnace","Chamber","Tag","Zone","Wall","Use","Type","Serial","Status","Installed","Removed","Reason","Certificate","Cal date","Cal range","Max error","Tube","Tube check every","SAT due","Tube check due"],
  S.tcs.map(e=>[e.furnace,e.chamber,e.tag,zoneOf(e),wallOf(e.tag),USE[e.use],e.type,e.serial,TSTAT[e.status][1],e.installed,e.removed,e.reason,e.cal.cert,e.cal.date,`${e.cal.lo}-${e.cal.hi}`,e.cal.maxErr,e.tube.mat,e.tube.checkDays,e.status==="inuse"?satState(e).due||satState(e).txt:"",e.status==="inuse"?tubeState(e).due||tubeState(e).txt:""]));
const calCsv=()=>csvOut(`mws-tc-calibration-${today()}.csv`,["Ident","Kind","Type","Make","Model","Serial","Range from","Range to","Least count","Laboratory","Certificate","Calibrated","Due","CL %","k","Sr. No.","Standard °C","UUC mV","UUC °C","Error °C","Uncertainty ± °C"],
  S.eq.flatMap(q=>{const h=[q.ident,q.kind==="testtc"?"Test TC":"Instrument",q.kind==="testtc"?q.type:"",q.make,q.model,q.serial,q.lo,q.hi,q.lc,q.lab,q.cert,q.calDate,q.calDue,q.cl,q.k],O=obsOf(q);
    return O.length?O.map((r,j)=>[...h,j+1,r.raw.std,r.raw.mv,r.raw.uuc,r.err??"",r.raw.unc]):[[...h,"","","","","",""]];}));
const satCsv=()=>csvOut(`mws-tc-sat-${today()}.csv`,["Record","Thermocouple","Date","Time","Set point","Instrument","Test TC","Depth mm","Readings","Furnace (mean)","Test (mean)","Furnace range","Instr corr","TC corr","Difference (mean)","Min difference","Max difference","Result","Valid","Notes","By","Approved by","Approved"],
  S.sats.map(r=>{const v=satEval(r);return [r.id,tcName(tcById(r.tc)),r.date,r.time,r.sp,(eqById(r.instr)||{}).ident,(eqById(r.testTc)||{}).ident,r.depth,v.n,v.fMean,v.tMean,v.fRange,r.instrCorr,r.tcCorr,v.diff,v.dMin,v.dMax,v.res,v.invalid.length?"no: "+v.invalid.join("; "):"yes",v.notes.join("; "),r.by,r.appr.by,r.appr.date];}));
const rdCsv=()=>csvOut(`mws-tc-sat-readings-${today()}.csv`,["Record","Thermocouple","Date","Reading","Time","Furnace","Test","Instr corr","TC corr","Difference"],
  S.sats.flatMap(r=>{const v=satEval(r);return v.list.map(x=>[r.id,tcName(tcById(r.tc)),r.date,x.i+1,legacy(r)?r.time:rdTime(r,x.i),x.f,x.t,r.instrCorr,r.tcCorr,x.d]);}));
const replCsv=()=>csvOut(`mws-tc-replacements-${today()}.csv`,["Record","Date","Time","Thermocouple","Removed element","Installed","Days in service","Fitted element","Type","Certificate","Reason","Offset reset","TUS decision","Found by SAT","Verification SAT","Verification date","Result","By","Notes"],
  S.repl.map(r=>{const v=verifySat(r),e=tcById(r.newTc)||tcById(r.oldTc);return [r.id,r.date,r.time,tcName(e),r.oldSerial,r.oldInstalled,isDate(r.oldInstalled)?Math.round((new Date(r.date)-new Date(r.oldInstalled))/864e5):"",r.newSerial,r.newType,r.cert,r.reason,r.offset,r.tus,r.satRef,v?v.id:"",v?v.date:"",v?satEval(v).res:"SAT required",r.by,r.notes];}));
function readImport(f){f.text().then(t=>{let o;try{o=JSON.parse(t);}catch(e){toast("Not a JSON file");return;}
  if(!o||o.app!=="mws-tc-manager"||!Array.isArray(o.tcs)){toast("Not an export of this module");return;}
  const ok=a=>(Array.isArray(a)?a:[]).filter(x=>x&&ID_RE.test(String(x.id||"")));
  S.imp={tcs:ok(o.tcs).map(fillTc),eq:ok(o.eq).map(fillEq),sats:ok(o.sats).map(fillSat),tubes:ok(o.tubes).map(fillTube),repl:ok(o.repl||[]).map(fillRepl),config:o.config||null,pm:o.pm||null,
    msg:`${f.name}: ${plural(ok(o.tcs).length,"thermocouple")}, ${plural(ok(o.sats).length,"SAT")}, ${plural(ok(o.tubes).length,"tube check")}, ${plural(ok(o.eq).length,"test item")}.`};render();});}
async function doImport(mode){if(!S.imp||!needDb())return;const I=S.imp;S.imp=null;
  for(const c of ["tcs","eq","sats","tubes","repl"]){if(mode==="replace")for(const x of S[c])if(!I[c].some(y=>y.id===x.id))await dbDel(c,x.id);await batchPut(c,I[c]);}
  if(I.config){const c={...DEF,...I.config};delete c.id;await dbSet("config","settings",c);}if(I.pm){const p={...I.pm};delete p.id;await dbSet("config","pm",p);}
  toast("Imported ("+mode+")");render();}
async function clearAll(){if(($("#clrtxt")||{}).value!=="CLEAR ALL"){toast("Type CLEAR ALL to clear");return;}if(!needDb())return;
  for(const c of ["tcs","eq","sats","tubes","repl"])for(const x of S[c])await dbDel(c,x.id);await dbDel("config","settings");await dbDel("config","pm");toast("All thermocouple data cleared");}

/* 11. wiring */
onDoc("click",e=>{
  const b=e.target.closest("button,tr.click,a[data-docref],a[data-sat],a[data-tc],circle[data-sat]");if(!b)return;const d=b.dataset;
  if(b.closest("#modal")||d.close!==undefined){
    if(d.close!==undefined){closeModal();return;}
    if(d.saveTc!==undefined){saveTc();return;}if(d.saveEq!==undefined){saveEq();return;}
    if(d.usecorr!==undefined&&S.modal.kind==="sat"){const x=satCorrs(S.modal.ed).find(y=>y.k===d.usecorr);if(x&&x.c){S.modal.ed[x.f]=String(x.c.c);redraw();}return;}
    if(d.oadd!==undefined&&S.modal.kind==="eq"){S.modal.ed.obs.push({std:"",mv:"",uuc:"",unc:""});redraw();const n=document.getElementById(`ob-${S.modal.ed.obs.length-1}-std`);if(n)n.focus();return;}
    if(d.odel!==undefined&&S.modal.kind==="eq"){S.modal.ed.obs.splice(+d.odel,1);redraw();return;}
    if(d.eqprint!==undefined){const q=fillEq(S.modal.ed);openModal({kind:"print",title:"Calibration record "+q.ident,html:()=>eqPrint(q)});return;}if(d.saveSat!==undefined){saveSat();return;}
    if(d.saveRepl!==undefined){replaceTc();return;}if(d.saveRound!==undefined){saveRound();return;}
    if(d.replace!==undefined){openRepl(S.modal.ed.id);return;}
    if(d.saveReplrec!==undefined){const E=fillRepl(S.modal.ed);put("repl",E,"Record updated").then(ok=>{if(ok){toast(E.id+" saved");closeModal();}});return;}
    if(d.rdok!==undefined){S.modal.lines.forEach(l=>{const t=tubeState(tcById(l.tc)).st;if(!l.res&&["overdue","soon","none"].includes(t))l.res="ok";});redraw();return;}
    if(d.savePm!==undefined){const by=$("#pa-by").value.trim(),dt=$("#pa-date").value;if(!by||!isDate(dt)){msg("Enter who approves and the date.");return;}if(dt>today()){msg("Not in the future.");return;}
      if(!needDb())return;S.pm={...S.pm,rev:(+S.pm.rev||0)+1,appr:by,apprDate:dt,ref:$("#pa-ref").value.trim(),dirty:false};savePm(`Approved rev ${S.pm.rev} by ${by}`).then(ok=>{if(ok){toast("PM schedule approved");closeModal();render();}});return;}
    if(d.delTc!==undefined){armedDelete(b,async()=>{const id=S.modal.ed.id;await dbDel("tcs",id);toast("Deleted");closeModal();});return;}
    if(d.delEq!==undefined){armedDelete(b,async()=>{await dbDel("eq",S.modal.ed.id);toast("Deleted");closeModal();});return;}
    if(d.delSat!==undefined){armedDelete(b,async()=>{await dbDel("sats",S.modal.ed.id);toast("Deleted");closeModal();});return;}
    if(d.satprint!==undefined){const r=fillSat(S.modal.ed);openModal({kind:"print",title:"SAT record "+r.id,html:()=>satPrint(r)});return;}
    if(d.print!==undefined){document.body.classList.add("pm");window.print();setTimeout(()=>document.body.classList.remove("pm"),500);return;}
    if(d.rdscada!==undefined){const r=S.modal.ed,res=scadaPull(r);if(!res.ok){msg(res.why);return;}
      const go=()=>{let n=0;res.vals.forEach((v,i)=>{if(v!=null){r.rd[i].f=String(v);n++;}});r.src={file:res.file,at:today(),n,sample:res.sample};redraw();
        msg(`${n} furnace readings filled from ${res.file}${n<res.vals.length?` · ${res.vals.length-n} not in the record: type them`:""}.`,1);};
      if(r.rd.some((x,i)=>x.f!==""&&res.vals[i]!=null&&String(res.vals[i])!==x.f))armedDelete(b,go,"Confirm: replace the typed furnace readings");else go();return;}
    if(d.replrec){const x=S.repl.find(y=>y.id===d.replrec);if(x)openModal({kind:"replrec",ed:clone(x),msg:""});return;}
    if(d.tc&&!d.save){e.preventDefault();tcModal(d.tc);return;}
    if(d.rdseries!==undefined){const r=S.modal.ed;r.rd=[];if(num(r.fRdg)!=null||num(r.tRdg)!=null)r.rd.push({f:r.fRdg,t:r.tRdg});r.fRdg="";r.tRdg="";padRd(r);redraw();return;}
    if(d.rdpaste!==undefined){const L=pasteRd(S.modal.paste);if(!L.length){msg("No lines with two numbers found.");return;}const r=S.modal.ed;r.rd=L;padRd(r);S.modal.paste="";redraw();msg(plural(L.length,"reading")+" filled"+(L.length<nRd()?` · ${nRd()-L.length} still missing`:""),1);return;}
    if(d.rdclear!==undefined){armedDelete(b,()=>{S.modal.ed.rd=[];padRd(S.modal.ed);redraw();});return;}
    if(d.sat){e.preventDefault();satModal(d.sat);return;}
    if(d.newSat!==undefined){satModal(null,d.newSat||"");return;}
    return;
  }
  if(d.tc){e.preventDefault();tcModal(d.tc);return;}
  if(d.replfor){if(needDb())openRepl(d.replfor);return;}
  if(d.replrec){const r=S.repl.find(x=>x.id===d.replrec);if(r)openModal({kind:"replrec",ed:clone(r),msg:""});return;}
  if(d.replcsv!==undefined){replCsv();return;}
  if(d.sat){e.preventDefault();satModal(d.sat);return;}
  if(d.eq){eqModal(d.eq);return;}
  if(d.newTc!==undefined){if(needDb())tcModal(null);return;}
  if(d.newEq!==undefined){if(needDb())eqModal(null);return;}
  if(d.newSat!==undefined){if(needDb())satModal(null,d.newSat||"");return;}
  if(d.round!==undefined){if(needDb())roundModal();return;}
  if(d.delTube){armedDelete(b,async()=>{await dbDel("tubes",d.delTube);toast("Deleted");});return;}
  if(d.pmappr!==undefined){if(needDb())openModal({kind:"pmappr",by:"",date:today(),msg:""});return;}
  if(d.pmprint!==undefined){openModal({kind:"print",title:"Protection tube PM schedule",html:pmPrint});return;}
  if(d.h33!==undefined){openModal({kind:"print",title:"HTSA 3.3 evidence",html:h33Print});return;}
  if(d.std!==undefined){stdOps();return;}
  if(d.saveCfg!==undefined){document.querySelectorAll("[data-cfg]").forEach(i=>{const k=i.dataset.cfg,t=(SETF.find(x=>x[0]===k)||[])[2];S.cfg[k]=t==="number"?(num(i.value)??DEF[k]):i.value;});saveCfg();return;}
  if(d.doc){S.docSel=d.doc;render();return;}
  if(d.docref){e.preventDefault();const p=DOCS.find(x=>x[0].endsWith(d.docref.replace(/^(\.\.\/)+/,"").replace(/^\.\//,"")));if(p){S.docSel=p[0];render();}return;}
  if(d.export!==undefined){exportJson();return;}if(d.csv!==undefined){csv();return;}if(d.satcsv!==undefined){satCsv();return;}if(d.calcsv!==undefined){calCsv();return;}if(d.rdcsv!==undefined){rdCsv();return;}
  if(d.imp){if(d.imp==="cancel"){S.imp=null;render();}else doImport(d.imp);return;}
  if(d.calor!==undefined){importCalor();return;}
  if(d.clear!==undefined){armedDelete(b,clearAll);return;}
});
onDoc("input",e=>{const el=e.target;
  if(el.dataset.p&&S.modal&&S.modal.ed&&el.tagName!=="SELECT"){setp(S.modal.ed,el.dataset.p,el.value);
    if(S.modal.kind==="sat"&&/^(fRdg|tRdg|instrCorr|tcCorr|depth|date|time)$/.test(el.dataset.p)){clearTimeout(S._rd);S._rd=setTimeout(()=>{const a=document.activeElement,id=a&&a.id;redraw();const n=id&&document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(n.value.length,n.value.length);}catch(x){}}},500);}
    return;}
  if(el.dataset.rd&&S.modal&&S.modal.kind==="sat"){const [i,k]=el.dataset.rd.split(".");S.modal.ed.rd[+i][k]=el.value;S.modal.msg="";clearTimeout(S._rd);
    S._rd=setTimeout(()=>{const a=document.activeElement,id=a&&a.id;redraw();const n=id&&document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(n.value.length,n.value.length);}catch(x){}}},700);return;}
  if(el.dataset.ob&&S.modal&&S.modal.kind==="eq"){const [i,k]=el.dataset.ob.split(".");S.modal.ed.obs[+i][k]=el.value;const r=S.modal.ed.obs[+i],s=num(r.std),u=num(r.uuc),c=$(`[data-oerr="${i}"]`);
    if(c)c.textContent=s!=null&&u!=null?fx(Math.round((u-s)*100)/100):"";return;}
  if(el.id==="rd-paste"&&S.modal){S.modal.paste=el.value;return;}
  if(el.dataset.rl&&S.modal){const [i,k]=el.dataset.rl.split(".");S.modal.lines[+i][k]=el.value;return;}
  if(S.modal&&/^(rd|pa)-(by|date)$/.test(el.id)){S.modal[el.id.slice(3)]=el.value;return;}
  if(el.dataset.filt==="q"){S.filt.q=el.value;clearTimeout(S._ft);S._ft=setTimeout(()=>{render();const i=$("[data-filt=q]");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},250);}
});
onDoc("change",e=>{const el=e.target;
  if(el.dataset.p&&S.modal&&S.modal.ed&&el.tagName==="SELECT"){setp(S.modal.ed,el.dataset.p,el.value);
    if(S.modal.kind==="sat"&&(el.dataset.p==="testTc"||el.dataset.p==="instr")){const ed=S.modal.ed,f=el.dataset.p==="testTc"?"tcCorr":"instrCorr",q=eqById(el.value),c=corrAt(q,satTemp(ed));
      if(q&&ed[f]===""){if(c)ed[f]=String(c.c);else if(q.corr!=="")ed[f]=q.corr;}}
    if(S.modal.kind==="sat"&&el.dataset.p==="tc"){const t=tcById(el.value),l=t&&satsOf(t.id)[0];if(l&&!S.modal.ed.sp)S.modal.ed.sp=l.sp;}
    redraw();return;}
  if(el.dataset.pc&&S.modal){setp(S.modal.ed,el.dataset.pc,el.checked);return;}
  if(el.dataset.rl&&S.modal){const [i,k]=el.dataset.rl.split(".");S.modal.lines[+i][k]=el.value;if(k==="res")redraw();return;}
  if(el.dataset.filt&&el.dataset.filt!=="q"){S.filt[el.dataset.filt]=el.value;render();return;}
  if(el.id==="impfile"&&el.files[0]){readImport(el.files[0]);el.value="";}
});
onDoc("change",e=>{if(S.modal&&S.modal.kind==="repl"&&e.target.id==="rp-reason"){rpKeep();redraw();}
  if(S.modal&&S.modal.kind==="sat"&&e.target.id==="rd-scfile"&&e.target.files[0]&&MWS.scada&&MWS.scada.load){const f=e.target.files[0];msg("Reading "+f.name+" …",1);
    MWS.scada.load(f).then(x=>{if(!S.modal)return;redraw();msg(x.ok?`${x.file}: ${x.furnace||"?"} ${x.chamber||"?"} loaded.`:"Not read: "+x.why,x.ok);});}});
onDoc("keydown",e=>{if(e.key==="Escape"&&S.modal)closeModal();
  const el=e.target;if(e.key==="Enter"&&el.dataset&&el.dataset.ob){e.preventDefault();const [i,k]=el.dataset.ob.split("."),n=document.getElementById(`ob-${+i+1}-${k}`);if(n){n.focus();n.select();}return;}
  if(e.key==="Enter"&&el.dataset&&el.dataset.rd){e.preventDefault();const [i,k]=el.dataset.rd.split("."),n=document.getElementById(`rd-${+i+1}-${k}`);if(n){n.focus();n.select();}}});
onWin("hashchange",()=>{route();S.pending=false;render();window.scrollTo(0,0);});

/* 12. integration API */
MWS.tc={closeModal,
  /* the thermocouples of a chamber with their SAT, life and tube state (used by the SCADA review) */
  chamber:(f,ch)=>inUse().filter(e=>e.furnace===f&&e.chamber===ch).map(e=>{const s=satState(e),l=lifeOf(e),t=tubeState(e);return {tag:e.tag,no:tcNo(e.tag),use:e.use,sat:s.st,satTxt:s.txt,satDue:s.due||"",life:l.st,lifeDue:l.due||"",tube:t.st,tubeTxt:t.txt};}),
  hasData:()=>S.tcs.length>0,
  stats:()=>{const k=kp();return {db:S.dbState,...k,label:SCORE[k.score][1],cls:SCORE[k.score][0]};},
  summary:()=>{const k=kp();return `${plural(k.inUse,"thermocouple")} in use, ${k.satOk} of ${k.satNeed} with a SAT in date, HTSA 3.3 ${SCORE[k.score][1].toLowerCase()}.`;}};
window.__TCM={S,nRd,readingsOf,rdTime,pasteRd,calIssues,satEval,satMissing,depthIssues,satState,tubeState,lifeOf,assess33,kp,eqIssues};

/* 13. boot */
async function boot(){
  route();render();
  const [dl,user,db]=await Promise.all([useCap("downloads"),useCap("user"),useCap("db")]);
  S.dl=dl;
  if(user){try{const c=await user.can("data.write");S.canWrite=c!==false;}catch(e){}}
  if(db)startStore(sharedDb(db),"on");else startStore(localDb(),"local");
}
boot();
