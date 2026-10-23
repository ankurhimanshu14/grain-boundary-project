/* Module SCADA: SCADA temperature review = the second-level review of the heat treat monitoring system (CQI-9 HTSA 1.9).
   Runs inside the shell: ACTIVE, onDoc, onWin, MWS and `location` come from the wrapper (build.py). The temperature analysis follows the
   CALOR SCADA review (SCADA_Review_2.html): deviation = PV − the row's own SET, settling after a set value change is not judged, valid range
   500–1000 °C, hardening chamber zone 1 = preheating, odd TC = right wall / even = left wall. The review record and the HTSA 1.9 rules follow
   the CALOR Data review page (Monitoring_Review.html). The record itself is not stored (only its summary and a 10-minute trend). */

/* 1. collection prefix (shared store only) */
const NS=c=>S.db&&S.db.local?c:"scada-"+c;

/* 2. constants */
const ID_RE=/^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const LKEY="mws-scada-local-v1";
const CH=["Hardening","Tempering"];
const HI_SET=800,VMIN=500,VMAX=1000,K6=[0,1,2,3,4,5];
const SAMPLE=/*@SAMPLE@*/null;
const DEF={plant:"Mass Wire and Steels Pvt. Ltd. · Bhiwadi",furnaces:"F-01, F-02, F-03, F-04",tol:10,hold:3,settle:120,persist:1,merge:10,spike:15,stuck:30,gap:2.5,
  posH:"5,4,4",posT:"4,4,4",maxHrs:24,soonHrs:4,covDays:30,procRef:"MWSPL-QP-SCADA-01",reviewers:"",scope:""};
const SETF=[["plant","Plant","text"],["furnaces","Furnaces (comma separated)","text"],["tol","Default tolerance ± °C (used when no specification in force matches the set value)","number"],
  ["hold","Settling: judged again after this many readings back within tolerance","number"],["settle","Settling: at most (min) after a set value change","number"],
  ["persist","An excursion lasts at least (readings)","number"],["merge","Excursions closer than (min) are one incident","number"],["spike","A jump larger than (°C) between two readings is a spike","number"],
  ["stuck","The same reading for (min) is a stuck value","number"],["gap","A time step longer than this × the usual step is a data gap","number"],
  ["posH","Tray positions per zone, hardening chamber","text"],["posT","Tray positions per zone, tempering chamber","text"],
  ["maxHrs","Review interval, at most (hours; CQI-9 HTSA 1.9: 24)","number"],["soonHrs","Show a review as due this many hours before","number"],["covDays","Look back for gaps (days)","number"],
  ["procRef","Documented review procedure","text"]];
const DISP={none:"No product affected",released:"Released after assessment",held:"Product on hold",reworked:"Re-heat-treated (rework procedure)",scrapped:"Scrapped",customer:"Customer informed / concession"};
const HOW={react:"Reaction recorded here",ref:"Handled in another record"};
const DOCS=[
  ["SCADA/00_SCADA_Master_List.md","Master list"],
  ["SCADA/01_Procedure/MWSPL-QP-SCADA-01_Second-Level_Review_of_SCADA_Temperature_Data.md","MWSPL-QP-SCADA-01 Second-level review"],
  ["SCADA/02_Work_Instructions/MWSPL-WI-SCADA-01_Export_and_Load_a_SCADA_Record.md","MWSPL-WI-SCADA-01 Export and load"],
  ["SCADA/02_Work_Instructions/MWSPL-WI-SCADA-02_Review_and_React.md","MWSPL-WI-SCADA-02 Review and react"],
  ["SCADA/03_Formats/MWSPL-F-SCADA-01_SCADA_Review_Record.md","MWSPL-F-SCADA-01 Review record"],
  ["SCADA/04_Application/mwspl-scada-module.md","Module description"]];

/* 3. helpers */
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>{if(v===""||v==null)return null;const n=Number(String(v).replace(",","."));return isFinite(n)?n:null;};
const txt=v=>String(v??"").trim();
const clone=o=>JSON.parse(JSON.stringify(o??null));
const pad=n=>String(n).padStart(2,"0");
const fx=(v,d=1)=>v==null||!isFinite(v)?"—":(Math.round(v*10**d)/10**d).toString();
const sgn=v=>v==null?"—":(v>0?"+":"")+fx(v);
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
/* times are UTC-naive clock times in ms (no time zone anywhere) */
const nowMs=()=>{const d=new Date();return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours(),d.getMinutes(),d.getSeconds());};
const toLocal=ms=>{const d=new Date(ms);return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;};
const fromLocal=s=>{const m=String(s||"").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);return m?Date.UTC(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0)):null;};
const fD=ms=>{if(ms==null)return "—";const d=new Date(ms);return `${pad(d.getUTCDate())}-${MON[d.getUTCMonth()]}-${d.getUTCFullYear()}`;};
const fT=ms=>{if(ms==null)return "—";const d=new Date(ms);return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;};
const fDT=ms=>ms==null?"—":`${fD(ms)} ${fT(ms)}`;
const fDur=min=>min==null?"—":min<60?`${Math.round(min)} min`:`${Math.floor(min/60)} h ${pad(Math.round(min%60))}`;
const pill=(c,t)=>`<span class="pill ${c||""}">${esc(t)}</span>`;
const plural=(n,w,p)=>`${n} ${n===1?w:(p||w+"s")}`;
const pos=s=>String(s||"").split(/[\s,;]+/).map(Number).filter(n=>n>0);
const maxNo=L=>Math.max(0,...L.map(x=>+(String(x.id).match(/(\d+)$/)||[0,0])[1]));
const median=a=>{const b=a.filter(x=>x!=null).slice().sort((x,y)=>x-y);return b.length?b[Math.floor(b.length/2)]:null;};
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const sd=a=>{if(a.length<2)return null;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));};
const tcTag=k=>"TC-"+pad(k+1);
const isLeft=k=>k%2===1;              /* index k = TC number − 1: TC-02, TC-04, TC-06 (even numbers) are on the left wall */
const wallOf=k=>isLeft(k)?"left":"right";
const zoneOf=k=>Math.floor(k/2);

/* 4. state */
const S={view:"dash",db:null,dbState:"connecting",canWrite:true,dl:null,reviews:[],cfg:{...DEF},docSel:DOCS[0][0],imp:null,modal:null,pending:false,unsub:[],q:{},
  cur:null,err:"",busy:false,charts:{}};
const C=()=>S.cfg;

/* 5. reading the SCADA export (.xlsx without libraries, or .csv) */
async function unzip(buf){
  const dv=new DataView(buf),u8=new Uint8Array(buf);let e=buf.byteLength-22;
  while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;if(e<0)throw new Error("This is not an .xlsx file.");
  const n=dv.getUint16(e+10,true),files={};let p=dv.getUint32(e+16,true);
  for(let i=0;i<n;i++){const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
    files[new TextDecoder().decode(u8.subarray(p+46,p+46+nl))]={method,csize,off};p+=46+nl+xl+cl;}
  const read=async name=>{const f=files[name];if(!f)return null;const lnl=dv.getUint16(f.off+26,true),lxl=dv.getUint16(f.off+28,true),st=f.off+30+lnl+lxl,data=u8.subarray(st,st+f.csize);
    if(f.method===0)return new TextDecoder().decode(data);
    if(typeof DecompressionStream==="undefined")throw new Error("This browser cannot read .xlsx files; save the export as CSV.");
    const out=await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();return new TextDecoder().decode(out);};
  return {read};}
const colIdx=ref=>{const m=String(ref).match(/^([A-Z]+)/);let n=0;for(const ch of m[1])n=n*26+ch.charCodeAt(0)-64;return n-1;};
async function readXlsx(buf){
  const z=await unzip(buf),P=x=>new DOMParser().parseFromString(x,"application/xml");
  const wb=P(await z.read("xl/workbook.xml")||"<w/>"),rels=P(await z.read("xl/_rels/workbook.xml.rels")||"<r/>"),rm={};
  [...rels.getElementsByTagName("Relationship")].forEach(r=>rm[r.getAttribute("Id")]=r.getAttribute("Target"));
  const ssx=await z.read("xl/sharedStrings.xml"),SS=ssx?[...P(ssx).getElementsByTagName("si")].map(si=>[...si.getElementsByTagName("t")].map(t=>t.textContent).join("")):[];
  const out=[];
  for(const s of wb.getElementsByTagName("sheet")){
    const rid=s.getAttribute("r:id")||[...s.attributes].find(a=>/(^|:)id$/.test(a.name)&&a.name!=="sheetId")?.value;
    const tg=String(rm[rid]||"").replace(/^\/?xl\//,"").replace(/^\//,""),xml=await z.read("xl/"+tg);if(!xml)continue;
    const aoa=[];for(const row of P(xml).getElementsByTagName("row")){const r=+row.getAttribute("r")-1,a=aoa[r]=[];
      for(const c of row.getElementsByTagName("c")){const t=c.getAttribute("t"),v=c.getElementsByTagName("v")[0];let val=v?v.textContent:null;
        if(t==="s")val=SS[+val];else if(t==="inlineStr")val=[...c.getElementsByTagName("t")].map(x=>x.textContent).join("");else if(t==="b")val=val==="1";else if(t==="str"||t==="e"){}else if(val!=null&&val!=="")val=+val;
        a[colIdx(c.getAttribute("r"))]=val;}}
    out.push({name:s.getAttribute("name"),aoa});}
  return out;}
function readCsv(text){const L=text.replace(/\r/g,"").split("\n").filter(l=>l.trim());const sep=[";","\t",","].find(s=>(L[0]||"").includes(s))||",";
  return [{name:"CSV",aoa:L.map(l=>l.split(sep).map(c=>{c=c.trim().replace(/^"|"$/g,"");const n=Number(c);return c!==""&&isFinite(n)?n:c;}))}];}
/* date cells: "Oct-22-2026", "22-10-2026", "22.10.2026", "22/10/2026", "2026-10-22" or an Excel serial; time cells: a day fraction or "hh:mm(:ss)" */
function cellDate(v){
  if(typeof v==="number")return Math.round((Math.floor(v)-25569)*864e5);
  const s=txt(v);let m;
  if((m=s.match(/^([A-Za-z]{3})[a-z]*[-\s/.](\d{1,2})[-\s/.,]+(\d{4})/))){const mo=MON.findIndex(x=>x.toLowerCase()===m[1].toLowerCase());return mo<0?null:Date.UTC(+m[3],mo,+m[2]);}
  if((m=s.match(/^(\d{1,2})[-\s/.]([A-Za-z]{3})[a-z]*[-\s/.](\d{4})/))){const mo=MON.findIndex(x=>x.toLowerCase()===m[2].toLowerCase());return mo<0?null:Date.UTC(+m[3],mo,+m[1]);}
  if((m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))return Date.UTC(+m[1],+m[2]-1,+m[3]);
  if((m=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)))return Date.UTC(+m[3],+m[2]-1,+m[1]);
  return null;}
function cellTime(v){
  if(typeof v==="number")return Math.round((v%1)*86400)*1000;
  const m=txt(v).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);if(!m)return null;let h=+m[1];if(m[4]){if(/pm/i.test(m[4])&&h<12)h+=12;if(/am/i.test(m[4])&&h===12)h=0;}
  return ((h*60+ +m[2])*60+ +(m[3]||0))*1000;}
function parseAOA(aoa,file){
  const isH=(c,re)=>typeof c==="string"&&re.test(c.trim());
  const h=aoa.findIndex(r=>r&&r.some(c=>isH(c,/^SET[\s-]*1$/i))&&r.some(c=>isH(c,/^PV[\s-]*1$/i)));
  if(h<0)throw new Error("No header row with SET-1 / PV-1 was found.");
  const H=aoa[h],col=re=>H.findIndex(c=>isH(c,re));
  const dc=Math.max(0,col(/^date/i)),tc=col(/^time/i),sc=K6.map(k=>col(new RegExp("^SET[\\s-]*"+(k+1)+"$","i"))),pc=K6.map(k=>col(new RegExp("^PV[\\s-]*"+(k+1)+"$","i")));
  let heading="";for(let i=0;i<h;i++)for(const c of aoa[i]||[])if(typeof c==="string"&&/FURNACE/i.test(c)){heading=c.trim();break;}
  const rows=[];let lastDay=null;
  for(let i=h+1;i<aoa.length;i++){const r=aoa[i];if(!r)continue;
    let d=cellDate(r[dc]);const t=tc>=0?cellTime(r[tc]):(typeof r[dc]==="number"?Math.round((r[dc]%1)*86400)*1000:cellTime(r[dc]));
    if(d==null)d=lastDay;if(d==null||t==null)continue;lastDay=d;
    const raw=pc.map(c=>c<0?null:num(r[c])),sp=sc.map(c=>c<0?null:num(r[c]));if(raw.every(v=>v==null)&&sp.every(v=>v==null))continue;
    rows.push({t:d+t,raw,spRaw:sp});}
  if(rows.length<2)throw new Error("Fewer than two readings with a date and time were found.");
  rows.sort((a,b)=>a.t-b.t);
  const fm=heading.match(/FURNACE[\s-]*(\d+)/i),f=fm?"F-"+pad(+fm[1]):"",ch=/TEMP(E)?RING|TEMPER/i.test(heading)?"Tempering":/HARDEN/i.test(heading)?"Hardening":"";
  return {file,heading,furnace:f,chamber:ch,rows};}
async function loadFile(file){
  S.err="";S.busy=true;render();
  try{const buf=await file.arrayBuffer();let books;
    if(/\.csv$/i.test(file.name))books=readCsv(new TextDecoder().decode(buf));else books=await readXlsx(buf);
    let D=null,last=null;for(const b of books){try{D=parseAOA(b.aoa,file.name);break;}catch(e){last=e;}}
    if(!D)throw last||new Error("No SCADA table was found in the file.");
    S.cur=D;runCur();}
  catch(e){S.err=e.message||String(e);S.cur=null;}
  S.busy=false;render();}
function loadSample(){if(!SAMPLE)return;const d0=Date.UTC(+SAMPLE.date.slice(0,4),+SAMPLE.date.slice(5,7)-1,+SAMPLE.date.slice(8,10));
  S.cur={file:SAMPLE.file,heading:SAMPLE.heading,furnace:"F-02",chamber:"Tempering",sample:true,rows:SAMPLE.rows.map(r=>({t:d0+r[0]*1000,spRaw:K6.map(k=>r[1+2*k]),raw:K6.map(k=>r[2+2*k])}))};
  runCur();if(location.hash!=="#load")location.hash="load";else render();}

/* 6. analysis */
const ftypeOf=ch=>ch==="Hardening"?"hardening":ch==="Tempering"?"tempering":"";
const affects=(ft,z,sp)=>ft==="hardening"?sp>HI_SET&&z!==0:true;
const procAt=(ft,sp)=>sp==null?"":ft==="hardening"?(sp>HI_SET?"austenitizing":"preheating"):ft==="tempering"?(sp>HI_SET?"austenitizing (normalizing)":"tempering / isothermal hold"):"";
const traysOf=(ch,z)=>{const P=pos(ch==="Tempering"?C().posT:C().posH);const a=P.slice(0,z).reduce((x,y)=>x+y,1);return [a,a+(P[z]||0)-1];};
/* specifications in force for the furnace and chamber: their set value per zone gives the tolerance; a set value without one is a finding */
function specFor(f,ch,z,sp){
  if(!MWS.spec||!MWS.spec.inForce)return null;
  const k=ch==="Tempering"?"t":"h",kt=ch==="Tempering"?"ttol":"htol";
  for(const s of MWS.spec.inForce()){if(!(s.furnaces||[]).includes(f))continue;const v=num(s[k]&&s[k][z]);if(v!=null&&Math.abs(v-sp)<=0.5)return {id:s.id,rev:s.rev,part:s.part,tol:num(s[kt]&&s[kt][z])??null};}
  return null;}
function analyze(D){
  const o=C(),R=D.rows,N=R.length,ft=ftypeOf(D.chamber),tolDef=+o.tol||10;
  const rows=R.map(r=>({t:r.t,raw:r.raw.slice(),pv:r.raw.map(v=>v!=null&&v>=VMIN&&v<=VMAX?v:null),sp:r.spRaw.map(v=>v!=null&&v>=VMIN&&v<=VMAX?v:null),tr:K6.map(()=>false)}));
  const dts=[];for(let i=1;i<N;i++)dts.push((rows[i].t-rows[i-1].t)/60000);const step=median(dts)||1;
  /* tolerance per TC: the specification in force for the zone's set value, else the default */
  const levels=K6.map(k=>[...new Set(rows.map(r=>r.sp[k]).filter(v=>v!=null))].sort((a,b)=>a-b));
  const specs={},tolAt=(k,sp)=>{const key=zoneOf(k)+"|"+sp;if(!(key in specs))specs[key]=specFor(D.furnace,D.chamber,zoneOf(k),sp);const s=specs[key];return s&&s.tol!=null?s.tol:tolDef;};
  const offline=K6.map(k=>rows.every(r=>r.raw[k]==null||r.raw[k]===0));
  /* settling after a set value change: not judged until back within tolerance for `hold` readings, at most `settle` min */
  const trans=[];
  K6.forEach(k=>{if(offline[k])return;for(let i=1;i<N;i++){const a=rows[i-1].sp[k],b=rows[i].sp[k];if(a==null||b==null||Math.abs(b-a)<=tolAt(k,b))continue;
    let run=0,reached=null,j=i,sup=false;const tol=tolAt(k,b);
    for(;j<N&&rows[j].t-rows[i].t<=o.settle*60000;j++){if(j>i&&rows[j].sp[k]!=null&&rows[j-1].sp[k]!=null&&Math.abs(rows[j].sp[k]-rows[j-1].sp[k])>tol){sup=true;break;}
      const v=rows[j].pv[k];rows[j].tr[k]=true;if(v!=null&&Math.abs(v-rows[j].sp[k])<=tol){run++;if(run>=o.hold){reached=rows[j-o.hold+1].t;for(let q=j-o.hold+1;q<=j;q++)rows[q].tr[k]=false;break;}}else run=0;}
    trans.push({k,at:rows[i].t,from:a,to:b,reached,mins:reached!=null?(reached-rows[i].t)/60000:null,late:reached==null&&!sup&&j<N});}});
  const ev=rows.map(r=>K6.map(k=>r.tr[k]?null:r.pv[k]));
  /* per thermocouple */
  const tcs=K6.map(k=>{const D_=[],ins=[];let n=0,inn=0,spikes=0,outR=0,settled=0,stuck=[];let runV=null,runFrom=null;
    rows.forEach((r,i)=>{const v=ev[i][k],sp=r.sp[k];if(r.tr[k])settled++;
      if(r.raw[k]!=null&&r.raw[k]!==0&&(r.raw[k]<VMIN||r.raw[k]>VMAX))outR++;
      if(i&&r.pv[k]!=null&&rows[i-1].pv[k]!=null&&!r.tr[k]&&Math.abs(r.pv[k]-rows[i-1].pv[k])>o.spike)spikes++;
      if(r.raw[k]!=null&&r.raw[k]!==0){if(r.raw[k]===runV){}else{if(runV!=null&&rows[i-1].t-runFrom>=o.stuck*60000)stuck.push({from:runFrom,to:rows[i-1].t,v:runV});runV=r.raw[k];runFrom=r.t;}}
      if(v==null||sp==null)return;const d=v-sp;n++;D_.push(d);if(Math.abs(d)<=tolAt(k,sp)){inn++;}});
    if(runV!=null&&rows[N-1].t-runFrom>=o.stuck*60000)stuck.push({from:runFrom,to:rows[N-1].t,v:runV});
    const so=D_.slice().sort((a,b)=>a-b),q=p=>so.length?so[Math.min(so.length-1,Math.floor(p*so.length))]:null,m_=mean(D_),s_=sd(D_),tl=tolAt(k,median(rows.map(r=>r.sp[k]))??0);
    return {k,tag:tcTag(k),zone:zoneOf(k),wall:wallOf(k),offline:offline[k],n,inn,pct:n?100*inn/n:null,mean:m_,sd:s_,min:D_.length?Math.min(...D_):null,max:D_.length?Math.max(...D_):null,p5:q(.05),p95:q(.95),
      ppk:m_!=null&&s_?Math.min(tl-m_,m_+tl)/(3*s_):null,spikes,outR,settled,stuck};});
  /* excursions: judged readings outside tolerance, runs closer than `merge` min joined */
  const exc=[];
  K6.forEach(k=>{let cur=null;rows.forEach((r,i)=>{const v=ev[i][k],sp=r.sp[k];if(v==null||sp==null)return;const d=v-sp,out=Math.abs(d)>tolAt(k,sp);
    if(out){if(cur&&r.t-cur.to<=o.merge*60000){cur.to=r.t;cur.n++;if(Math.abs(d)>Math.abs(cur.max)){cur.max=d;cur.ext={v,sp,t:r.t};}if(affects(ft,zoneOf(k),sp))cur.aff=true;cur.sps.add(sp);}
      else{if(cur)exc.push(cur);cur={k,z:zoneOf(k),from:r.t,to:r.t,n:1,max:d,ext:{v,sp,t:r.t},aff:affects(ft,zoneOf(k),sp),sps:new Set([sp])};}}});if(cur)exc.push(cur);});
  const X=exc.filter(e=>e.n>=o.persist).map(e=>({...e,sps:[...e.sps]}));
  /* incidents per zone: the excursions of the zone's two thermocouples joined */
  const inc=[];[0,1,2].forEach(z=>{const L=X.filter(e=>e.z===z).sort((a,b)=>a.from-b.from);let c=null;
    L.forEach(e=>{if(c&&e.from-c.to<=o.merge*60000){c.to=Math.max(c.to,e.to);c.tcs.add(e.k);if(Math.abs(e.max)>Math.abs(c.max)){c.max=e.max;c.ext={...e.ext,k:e.k};}c.aff=c.aff||e.aff;e.sps.forEach(s=>c.sps.add(s));}
      else{if(c)inc.push(c);c={z,from:e.from,to:e.to,tcs:new Set([e.k]),max:e.max,ext:{...e.ext,k:e.k},aff:e.aff,sps:new Set(e.sps)};}});if(c)inc.push(c);});
  /* time out = readings of the incident window in which either wall was outside tolerance */
  const outIn=(z,a,b)=>rows.reduce((s,r,i)=>s+(r.t>=a&&r.t<=b&&[z*2,z*2+1].some(k=>ev[i][k]!=null&&r.sp[k]!=null&&Math.abs(ev[i][k]-r.sp[k])>tolAt(k,r.sp[k]))?1:0),0)*step;
  const incidents=inc.map(c=>{const ks=[...c.tcs],L=ks.filter(isLeft),Rt=ks.filter(k=>!isLeft(k));
    return {z:c.z,from:c.from,to:c.to,min:(c.to-c.from)/60000+step,outMin:outIn(c.z,c.from,c.to),tcs:ks.sort().map(tcTag),walls:L.length&&Rt.length?"Both walls":L.length?"Left wall only":"Right wall only",
      dir:c.max<0?"Low":"High",max:c.max,ext:{v:c.ext.v,sp:c.ext.sp,t:c.ext.t,tag:tcTag(c.ext.k)},aff:c.aff,sps:[...c.sps],proc:[...new Set([...c.sps].map(s=>procAt(ft,s)))].join(" / "),trays:traysOf(D.chamber,c.z)};});
  /* wall difference per zone: left − right */
  const walls=[0,1,2].map(z=>{const L=z*2+1,Rr=z*2,d=[];let mx=null,mt=null;ev.forEach((e,i)=>{if(e[L]!=null&&e[Rr]!=null){const x=e[L]-e[Rr];d.push(x);if(mx==null||Math.abs(x)>Math.abs(mx)){mx=x;mt=rows[i].t;}}});return {z,mean:mean(d),n:d.length,max:mx,maxAt:mt};});
  /* worst deviation, hourly mean deviation per thermocouple, overall share in tolerance */
  let worst=null;rows.forEach((r,i)=>K6.forEach(k=>{const v=ev[i][k],sp=r.sp[k];if(v==null||sp==null)return;const d=v-sp;if(!worst||Math.abs(d)>Math.abs(worst.d))worst={d,k,v,sp,t:r.t};}));
  const h0=Math.floor(rows[0].t/3600000)*3600000,hours=[];for(let h=h0;h<=rows[N-1].t;h+=3600000)hours.push(h);
  const hourly=K6.map(k=>hours.map(h=>{const d=[];rows.forEach((r,i)=>{if(r.t>=h&&r.t<h+3600000&&ev[i][k]!=null&&r.sp[k]!=null)d.push(ev[i][k]-r.sp[k]);});return d.length?mean(d):null;}));
  const nAll=tcs.reduce((s,x)=>s+x.n,0),inAll=tcs.reduce((s,x)=>s+x.inn,0),expected=Math.round((rows[N-1].t-rows[0].t)/60000/step)+1;
  const gaps=[];for(let i=1;i<N;i++){const m=(rows[i].t-rows[i-1].t)/60000;if(m>o.gap*step)gaps.push({from:rows[i-1].t,to:rows[i].t,min:m});}
  /* the 10-minute trend kept with the review */
  const B=new Map();rows.forEach(r=>{const b=Math.floor(r.t/600000)*600000;if(!B.has(b))B.set(b,[]);B.get(b).push(r);});
  const trend=[...B.entries()].map(([b,L])=>[b/60000,...K6.map(k=>{const v=L.map(r=>r.pv[k]).filter(x=>x!=null);return v.length?Math.round(mean(v)*10)/10:null;}),...K6.map(k=>L.at(-1).sp[k]),K6.reduce((m,k)=>m|(L.some(r=>r.tr[k])?1<<k:0),0)]);
  const verdict=incidents.some(i=>i.aff)||offline.some((x,k)=>x)?"rej":X.length||gaps.length||tcs.some(t=>t.outR||t.stuck.length)?"cond":"acc";
  return {ft,from:rows[0].t,to:rows[N-1].t,n:N,step,levels,tolDef,specs:Object.entries(specs).map(([k,v])=>({z:+k.split("|")[0],sp:+k.split("|")[1],spec:v})),rows,ev,trans,tcs,exc:X,incidents,walls,gaps,trend,verdict,worst,hours,hourly,pctAll:nAll?100*inAll/nAll:null,expected,settledAll:tcs.reduce((s,x)=>s+x.settled,0)};}
function runCur(){const D=S.cur;if(!D)return;D.A=analyze(D);D.O=findings(D,D.A);}
/* findings; those with a key are the out-of-control conditions the reviewer must answer (HTSA 1.9 detection and reaction) */
function findings(D,A){
  const O=[],add=(lvl,tag,t,key)=>O.push({lvl,tag,txt:t,key:key||""}),ch=D.chamber;
  if(!D.furnace||!D.chamber)add("warn","Link","The furnace or chamber was not recognised in the heading: choose them above before the review.","");
  /* one condition per zone: its incidents together (the reviewer answers the zone, the incidents are listed) */
  [0,1,2].forEach(z=>{const L=A.incidents.filter(i=>i.z===z);if(!L.length)return;const aff=L.filter(i=>i.aff),tr=L[0].trays,tot=L.reduce((s,i)=>s+i.min,0),mx=L.reduce((m,i)=>Math.abs(i.max)>Math.abs(m)?i.max:m,0);
    const tcs=[...new Set(L.flatMap(i=>i.tcs))].sort(),win=L.slice(0,5).map(i=>`${fT(i.from)}–${fT(i.to)}`).join(", ")+(L.length>5?` and ${L.length-5} more`:"");
    add(aff.length?"crit":"warn","Excursion",`Zone ${z+1} (${tcs.join(", ")}): ${plural(L.length,"incident")} outside tolerance, ${fDur(tot)} in all (${win}); largest deviation ${sgn(mx)} °C. ${aff.length?`Product affected: tray positions ${tr[0]}–${tr[1]} of the ${ch.toLowerCase()} chamber during ${aff.length===L.length?"these windows":plural(aff.length,"of these windows","of these windows")}.`:`No product counted as affected (${A.ft==="hardening"?(z===0?"zone 1 is the preheating zone":"preheating set value"):"rule"}).`}`,`inc:${z}`);});
  A.tcs.forEach(t=>{if(t.offline){add("crit","Thermocouple",`${t.tag} (zone ${t.zone+1}, ${t.wall} wall) read 0 or nothing for the whole record: offline.`,`off:${t.k}`);return;}
    if(t.pct!=null&&t.pct<100&&!A.incidents.some(i=>i.tcs.includes(t.tag)))add("warn","Tolerance",`${t.tag}: ${fx(t.pct)} % of the judged readings within tolerance.`,`tol:${t.k}`);
    if(t.outR)add("warn","Data",`${t.tag}: ${plural(t.outR,"reading")} outside ${VMIN}–${VMAX} °C excluded.`,`range:${t.k}`);
    t.stuck.forEach(s=>add("warn","Data",`${t.tag}: the same reading ${s.v} °C from ${fT(s.from)} to ${fT(s.to)} (stuck value?).`,`stuck:${t.k}:${s.from}`));
    if(t.spikes)add("info","Data",`${t.tag}: ${plural(t.spikes,"jump")} larger than ${C().spike} °C between two readings.`,"");});
  if(A.gaps.length)add("warn","Data",`${plural(A.gaps.length,"gap")} in the data (longest ${fDur(Math.max(...A.gaps.map(g=>g.min)))}): ${A.gaps.slice(0,3).map(g=>fT(g.from)+"–"+fT(g.to)).join(", ")}.`,"gaps");
  A.trans.filter(x=>x.late).forEach(x=>add("warn","Settling",`${tcTag(x.k)}: set value ${x.from} → ${x.to} °C at ${fT(x.at)}; not back within tolerance in ${C().settle} min.`,`settle:${x.k}:${x.at}`));
  A.walls.forEach(w=>{if(w.mean!=null&&Math.abs(w.mean)>A.tolDef/2)add("info","Wall",`Zone ${w.z+1}: left wall reads ${sgn(w.mean)} °C against the right wall on average.`,"");});
  /* specifications in force (Specifications module) */
  if(MWS.spec&&MWS.spec.inForce&&D.furnace&&D.chamber){const no=A.specs.filter(s=>!s.spec);
    if(no.length)add("warn","Specification",`Set values with no ${D.chamber.toLowerCase()}-chamber specification in force for ${D.furnace}: ${[...new Set(no.map(s=>"zone "+(s.z+1)+" "+s.sp+" °C"))].join(", ")}. Default tolerance ±${A.tolDef} °C used.`,"spec");
    const yes=A.specs.filter(s=>s.spec);if(yes.length)add("info","Specification",`Tolerance from the specification in force: ${[...new Set(yes.map(s=>`zone ${s.z+1} ${s.sp} °C → ${s.spec.id} rev ${s.spec.rev} (${s.spec.part}) ±${s.spec.tol??A.tolDef} °C`))].join("; ")}.`,"");}
  /* pyrometry of the chamber on the record day (Thermocouples module) */
  if(MWS.tc&&MWS.tc.chamber&&D.furnace&&D.chamber){const L=MWS.tc.chamber(D.furnace,D.chamber);
    if(!L.length)add("info","Pyrometry",`No thermocouple of ${D.furnace} ${D.chamber.toLowerCase()} chamber is registered in the Thermocouples module.`,"");
    L.forEach(x=>{if(["fail","none","overdue"].includes(x.sat))add(x.sat==="fail"?"crit":"warn","Pyrometry",`${x.tag}: ${x.satTxt} (Thermocouples module).`,`sat:${x.tag}`);
      if(x.life==="over")add("warn","Pyrometry",`${x.tag}: element past its service life.`,`life:${x.tag}`);});}
  if(!O.some(o=>o.lvl==="crit"||o.lvl==="warn"))add("good","Record","Every thermocouple within tolerance, no data problem.","");
  return O;}
const VERD={acc:["ok","In control","acc"],cond:["warn","In control with findings","cond"],rej:["bad","Out of control: product affected","rej"]};

/* 7. the review record (HTSA 1.9) */
const fkeyOf=(f,ch)=>`${f}|${ch}`;
const scope=()=>{const L=String(C().scope||"").split(/[\n,;]+/).map(x=>x.trim()).filter(x=>/^F-\d+\|(Hardening|Tempering)$/.test(x));
  if(L.length)return L;return String(C().furnaces||"").split(/[,;\s]+/).filter(Boolean).flatMap(f=>CH.map(c=>fkeyOf(f,c)));};
/* qualified reviewers: Settings ("Name | qualification evidence") and the qualified people of the HT organization module */
function reviewers(){const L=[];String(C().reviewers||"").split("\n").map(l=>l.trim()).filter(Boolean).forEach(l=>{const [n,q]=l.split("|").map(x=>x.trim());if(n)L.push({name:n,why:q||"",src:"Settings"});});
  if(MWS.org&&MWS.org.qualified)MWS.org.qualified().forEach(p=>{if(!L.some(x=>x.name.toLowerCase()===p.name.toLowerCase()))L.push({name:p.name,why:p.why+(p.position?" · "+p.position:""),src:"HT organization"});});
  return L;}
const isRev=n=>reviewers().some(x=>x.name.toLowerCase()===txt(n).toLowerCase());
function fillRev(o){const d={id:"",fkey:"",furnace:"",chamber:"",file:"",heading:"",sample:false,idle:false,from:null,to:null,n:0,step:null,tolDef:10,verdict:"",tcs:[],incidents:[],findings:[],trend:[],
  at:"",by:"",lines:{},notes:"",log:[]};const x={...d,...(o||{})};if(!x.lines||typeof x.lines!=="object")x.lines={};["tcs","incidents","findings","trend","log"].forEach(k=>{if(!Array.isArray(x[k]))x[k]=[];});return x;}
const conds=r=>r.findings.filter(f=>f.key&&(f.lvl==="crit"||f.lvl==="warn"));
function lineMissing(f,l){const m=[];if(!l||!l.how)return ["answer"];
  if(l.how==="ref"){if(!txt(l.ref))m.push("reference");return m;}
  if(!txt(l.action))m.push("action");if(!txt(l.owner))m.push("owner");if(f.lvl==="crit"&&!l.disp)m.push("product disposition");
  if(l.closed){if(!txt(l.verify))m.push("verification");if(l.disp==="held")m.push("final disposition (product still on hold)");}
  return m;}
function revMissing(r){const m=[];
  if(!r.furnace||!r.chamber)m.push("furnace and chamber");
  const at=fromLocal(r.at);if(at==null)m.push("review time");else{if(at>nowMs()+60000)m.push("review time not in the future");if(r.to!=null&&at<r.to)m.push("review time after the end of the record");}
  if(!txt(r.by))m.push("reviewer");else if(!isRev(r.by))m.push(`${r.by} is not a qualified reviewer`);
  if(r.idle&&!txt(r.notes))m.push("note why the furnace was not running");
  conds(r).forEach(f=>{const x=lineMissing(f,r.lines[f.key]);if(x.length)m.push(`${f.tag} (${f.txt.slice(0,40)}…): ${x.join(", ")}`);});
  return m;}
const openLines=r=>conds(r).filter(f=>{const l=r.lines[f.key];return l&&l.how==="react"&&!l.closed;});
const revStatus=r=>revMissing(r).length?"incomplete":openLines(r).length?"open":"closed";
const RST={incomplete:["warn","Incomplete"],open:["acc","Reactions open"],closed:["ok","Complete"]};
/* interval per furnace and chamber: the next review is due `maxHrs` after the last one */
function cstat(fk){const L=S.reviews.filter(r=>r.fkey===fk&&fromLocal(r.at)!=null).sort((a,b)=>fromLocal(a.at)-fromLocal(b.at));const last=L.at(-1);
  if(!last)return {st:"none",L};const due=fromLocal(last.at)+C().maxHrs*3600000,now=nowMs();
  return {st:due<now?"overdue":due-now<=C().soonHrs*3600000?"soon":"ok",last,due,L};}
function gaps19(fk){const c=cstat(fk),from=nowMs()-C().covDays*864e5,G=[];
  const L=c.L.filter(r=>fromLocal(r.at)>=from);
  for(let i=1;i<L.length;i++){const a=fromLocal(L[i-1].at),b=fromLocal(L[i].at);if(b-a>C().maxHrs*3600000)G.push({kind:"interval",from:a,to:b,h:(b-a)/3600000});
    if(L[i].from!=null&&L[i-1].to!=null&&L[i].from-L[i-1].to>2*3600000)G.push({kind:"data",from:L[i-1].to,to:L[i].from,h:(L[i].from-L[i-1].to)/3600000});}
  return G;}
const SCORE={s:["ok","Satisfactory","acc"],ns:["warn","Not satisfactory","cond"],nia:["bad","Needs immediate action","rej"]};
const LV={ok:["ok","Met"],warn:["warn","Attention"],crit:["bad","Not met"],info:["acc","Note"]};
function assess19(){
  const I=[],add=(lvl,req,ev,act)=>I.push({lvl,req,ev,act}),RV=reviewers(),SC=scope();
  add(RV.length?"ok":"crit","Reviewed by qualified personnel",RV.length?`${plural(RV.length,"qualified reviewer")}: ${RV.map(r=>r.name+(r.why?" ("+r.why+")":"")).join("; ")}.`:"No qualified reviewer named (Settings, or people meeting the HTSA 1.1 minimum in the HT organization module).",RV.length?"":"Name the qualified reviewers with their qualification evidence.");
  const byNot=S.reviews.filter(r=>txt(r.by)&&!isRev(r.by));if(byNot.length)add("crit","Every review signed by a qualified reviewer",`${plural(byNot.length,"review")} by someone not in the list: ${[...new Set(byNot.map(r=>r.by))].join(", ")}.`,"Add the person with the qualification evidence, or have the review repeated.");
  add(txt(C().procRef)?"ok":"crit","Review process documented (also for computerized data)",txt(C().procRef)?`${C().procRef}: SCADA zone temperature logs reviewed in this module (computer data) with the furnace and alarm logs.`:"No review procedure named.",txt(C().procRef)?"":"Name the documented review procedure in Settings.");
  const st=SC.map(fk=>({fk,c:cstat(fk),g:gaps19(fk)})),bad=st.filter(x=>x.c.st==="none"||x.c.st==="overdue"),soon=st.filter(x=>x.c.st==="soon"),gp=st.filter(x=>x.g.length);
  add(bad.length||gp.length?"crit":soon.length?"warn":"ok",`Reviewed at intervals not exceeding ${C().maxHrs} hours`,
    [bad.length?bad.map(x=>`${x.fk.replace("|"," ")}: ${x.c.st==="none"?"never reviewed":"overdue since "+fDT(x.c.due)}`).join("; "):"",gp.length?`gaps in the last ${C().covDays} days: ${gp.map(x=>x.fk.replace("|"," ")+" "+x.g.length).join(", ")}`:"",soon.length?`${plural(soon.length,"chamber")} due within ${C().soonHrs} h`:""].filter(Boolean).join(" · ")||`Every chamber in scope (${SC.length}) reviewed within ${C().maxHrs} h.`,
    bad.length||gp.length?"Review the missing periods; a furnace that was not running is recorded as \"not running\".":"");
  const inc=S.reviews.filter(r=>revStatus(r)==="incomplete");
  add(inc.length?"crit":S.reviews.length?"ok":"crit","Reviews documented and complete",!S.reviews.length?"No review recorded.":inc.length?`${plural(inc.length,"review")} incomplete: ${inc.slice(0,5).map(r=>r.id).join(", ")}.`:`${plural(S.reviews.length,"review")} complete.`,inc.length?"Complete the reviews (reviewer, time, every condition answered).":"");
  const un=S.reviews.flatMap(r=>conds(r).filter(f=>!(r.lines[f.key]&&r.lines[f.key].how)).map(f=>({r,f})));
  add(un.length?"crit":"ok","Out-of-control conditions and alarms detected",un.length?`${plural(un.length,"condition")} not answered (${un.slice(0,3).map(x=>x.r.id+" "+x.f.tag).join(", ")}).`:`${plural(S.reviews.reduce((a,r)=>a+conds(r).length,0),"condition")} found by the analysis, each answered.`,un.length?"Answer each condition: a reaction, or the record that handles it.":"");
  const op=S.reviews.flatMap(r=>openLines(r).map(f=>({r,f,l:r.lines[f.key]}))),held=op.filter(x=>x.l.disp==="held");
  add(held.length?"crit":op.length?"warn":"ok","Documented reaction to out-of-control conditions",held.length?`${plural(held.length,"reaction")} with product on hold.`:op.length?`${plural(op.length,"reaction")} open.`:"Every reaction closed and verified.",op.length?"Close the reactions with verification and a final disposition.":"");
  const crit=I.filter(i=>i.lvl==="crit").length,score=!RV.length||!S.reviews.length?"nia":crit?"ns":"s";
  return {I,score,crit,st};}

/* 8. db plumbing */
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
async function put(o,logText){if(!needDb())return false;if(logText){o.log=o.log||[];o.log.push({d:toLocal(nowMs()),t:logText});}
  try{await dbSet("reviews",o.id,o);return true;}catch(e){toast("Not saved: "+errMsg(e));return false;}}
async function saveCfg(){if(!needDb())return;try{await dbSet("config","settings",S.cfg);toast("Settings saved");if(S.cur)runCur();render();}catch(e){toast("Not saved: "+errMsg(e));}}
function startStore(store,state){
  S.unsub.forEach(u=>{try{u();}catch(e){}});S.db=store;S.dbState=state;
  S.unsub=[store.sub("reviews",L=>{S.reviews=L.map(fillRev).sort((a,b)=>a.id<b.id?-1:1);safeRender();}),
    store.sub("config",L=>{const c=L.find(x=>x.id==="settings");S.cfg={...DEF,...(c||{})};delete S.cfg.id;if(S.cur)runCur();safeRender();})];
  render();
}
function safeRender(){
  const a=document.activeElement;if(S.modal||(a&&$("#main")&&$("#main").contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=true;return;}
  render();
}
onDoc("focusout",()=>setTimeout(()=>{if(S.pending&&!S.modal){const a=document.activeElement;if(!(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))){S.pending=false;render();}}},0));

/* 9. navigation */
const NAV=[["",[["dash","Dashboard"]]],["P",[["settings","Settings & reviewers"]]],["D",[["load","Load & analyse"]]],
  ["C",[["reviews","Reviews"],["htsa","HTSA 1.9"],["hist","History"]]],["A",[["act","Reactions"]]],["",[["rules","Rules"],["docs","Documentation"],["data","Data"]]]];
const navHtml=()=>`<div class="wrap">${NAV.map(([p,it])=>`<div class="grp">${p?`<span class="pd">${p}</span>`:""}${it.map(([k,l])=>`<a href="#${k}" ${S.view===k?'aria-current="page"':""}>${l}</a>`).join("")}</div>`).join("")}</div>`;
function route(){const v=(location.hash||"").slice(1);S.view=VIEWS[v]?v:"dash";}
const banner=()=>S.dbState==="local"?`<div class="banner warn">Local mode: records are kept in this browser only. Back up from the <a href="#data">Data</a> tab.</div>`
  :S.dbState==="connecting"?`<div class="banner">Connecting to the record store…</div>`:S.dbState==="error"?`<div class="banner bad">The record store reported an error; changes may not be saved.</div>`:"";
function render(){
  if(!ACTIVE()){MWS.bg();return;}
  $("#nav").innerHTML=navHtml();
  const ds=$("#dbstate");if(ds)ds.textContent=S.dbState==="on"?"Shared · live":S.dbState==="local"?"Local · this browser":S.dbState==="error"?"Store error":"Connecting…";
  document.body.classList.toggle("ro",!S.canWrite);
  S.charts={};
  $("#main").innerHTML=`<div class="stack">${banner()}${(VIEWS[S.view]||VIEWS.dash)()}</div>`;
}

/* 10. charts: one per zone, both thermocouples (left wall blue, right wall orange), the set value with its tolerance band, settling shaded */
let CID=0;
function zoneChart(z,T,P,SP,ST,tol,incs,h,fix,dots){
  const id="zc"+(++CID),W=fix?1150:720,H=h||220,L=46,Rr=10,Tp=12,B=26,k1=z*2+1,k0=z*2,n=T.length;if(n<2)return "";
  const vals=[...P[k1],...P[k0],...SP[k1].map(v=>v==null?null:v+tol),...SP[k1].map(v=>v==null?null:v-tol)].filter(v=>v!=null);
  if(!vals.length)return `<p class="small muted">Zone ${z+1}: no readings.</p>`;
  let y0=fix?fix[0]:Math.max(VMIN,Math.floor((Math.min(...vals)-5)/10)*10),y1=fix?fix[1]:Math.min(VMAX,Math.ceil((Math.max(...vals)+5)/10)*10);if(y1-y0<20){y1=y0+20;}
  const t0=T[0],t1=T[n-1],xs=t=>L+(t-t0)/(t1-t0)*(W-L-Rr),ys=v=>Tp+(1-(v-y0)/(y1-y0))*(H-Tp-B);
  const g=[],yst=(y1-y0)>120?50:(y1-y0)>60?20:10;
  for(let v=Math.ceil(y0/yst)*yst;v<=y1;v+=yst)g.push(`<line x1="${L}" x2="${W-Rr}" y1="${ys(v)}" y2="${ys(v)}" stroke="var(--line)"/><text x="${L-5}" y="${ys(v)+4}" text-anchor="end" class="ax">${v}</text>`);
  const hr=(t1-t0)>12*3600000?4:(t1-t0)>4*3600000?2:1;for(let t=Math.ceil(t0/(hr*3600000))*hr*3600000;t<=t1;t+=hr*3600000)g.push(`<text x="${xs(t)}" y="${H-8}" text-anchor="middle" class="ax">${fT(t)}</text>`);
  incs.filter(i=>i.z===z).forEach(i=>g.push(`<rect x="${xs(i.from)}" y="${Tp}" width="${Math.max(2,xs(i.to)-xs(i.from))}" height="${H-Tp-B}" fill="${i.aff?"var(--bad-bg)":"var(--warn-bg)"}"/>`));
  let s=null;for(let i=0;i<=n;i++){const on=i<n&&ST[i]&&(ST[i]&((1<<k0)|(1<<k1)));if(on&&s==null)s=i;if(!on&&s!=null){g.push(`<rect x="${xs(T[s])}" y="${Tp}" width="${Math.max(1,xs(T[Math.min(i,n-1)])-xs(T[s]))}" height="${H-Tp-B}" fill="var(--settle)"/>`);s=null;}}
  /* tolerance band around the set value (zone's left TC set value) */
  const band=[],line=[];T.forEach((t,i)=>{const sp=SP[k1][i]??SP[k0][i];if(sp!=null){band.push([xs(t),ys(Math.min(y1,sp+tol)),ys(Math.max(y0,sp-tol))]);line.push(`${xs(t).toFixed(1)},${ys(sp).toFixed(1)}`);}});
  if(band.length)g.push(`<polygon points="${band.map(b=>b[0].toFixed(1)+","+b[1].toFixed(1)).join(" ")} ${band.slice().reverse().map(b=>b[0].toFixed(1)+","+b[2].toFixed(1)).join(" ")}" fill="var(--band)"/><polyline points="${line.join(" ")}" fill="none" stroke="var(--muted)" stroke-dasharray="4 3"/>`);
  const pl=k=>{const seg=[];let cur=[];T.forEach((t,i)=>{const v=P[k][i];if(v==null){if(cur.length)seg.push(cur);cur=[];}else cur.push(`${xs(t).toFixed(1)},${ys(Math.min(y1,Math.max(y0,v))).toFixed(1)}`);});if(cur.length)seg.push(cur);
    return seg.map(c=>`<polyline points="${c.join(" ")}" fill="none" stroke="var(--s${isLeft(k)?1:2})" stroke-width="2" stroke-linejoin="round"/>`).join("");};
  g.push(pl(k0),pl(k1));
  if(dots)[k0,k1].forEach(k=>(dots[k]||[]).forEach(([t,v])=>g.push(`<circle cx="${xs(t).toFixed(1)}" cy="${ys(Math.min(y1,Math.max(y0,v))).toFixed(1)}" r="1.8" fill="var(--bad)"/>`)));
  S.charts[id]={T,P,SP,z,xs,L,W,Rr};
  return `<figure class="zc"><figcaption><b>Zone ${z+1}</b> <span class="lg"><i style="background:var(--s1)"></i>${tcTag(k1)} left wall</span><span class="lg"><i style="background:var(--s2)"></i>${tcTag(k0)} right wall</span><span class="lg"><i class="dash"></i>set value ± tolerance</span>${dots?`<span class="lg"><i class="dot"></i>out of tolerance</span><span class="lg"><i class="sq"></i>settling (not judged)</span>`:""}</figcaption>
    <div class="zcw"><svg viewBox="0 0 ${W} ${H}" data-zc="${id}" role="img" aria-label="Zone ${z+1} temperature, ${tcTag(k1)} and ${tcTag(k0)} against the set value">${g.join("")}<line class="xh" x1="0" x2="0" y1="${Tp}" y2="${H-B}" stroke="var(--ink)" stroke-width="1" visibility="hidden"/></svg><div class="ztip" hidden></div></div></figure>`;}
/* the loaded record: every zone on the same time axis and the same temperature scale, out-of-tolerance readings as red points */
const chartsOfCur=D=>{const A=D.A,T=A.rows.map(r=>r.t),P=K6.map(k=>A.rows.map(r=>r.pv[k])),SP=K6.map(k=>A.rows.map(r=>r.sp[k])),ST=A.rows.map(r=>K6.reduce((m,k)=>m|(r.tr[k]?1<<k:0),0));
  const all=[...P.flat(),...SP.flat().filter(v=>v!=null).flatMap(v=>[v-A.tolDef,v+A.tolDef])].filter(v=>v!=null),fix=[Math.max(VMIN,Math.floor((Math.min(...all)-5)/20)*20),Math.min(VMAX,Math.ceil((Math.max(...all)+5)/20)*20)];
  const dots=K6.map(k=>A.rows.map((r,i)=>[r.t,A.ev[i][k],r.sp[k]]).filter(([t,v,sp])=>v!=null&&sp!=null&&Math.abs(v-sp)>A.tolDef).map(([t,v])=>[t,v]));
  return [0,1,2].map(z=>zoneChart(z,T,P,SP,ST,A.tolDef,[],250,fix,dots)).join("");};
const chartsOfRev=r=>{if(!r.trend.length)return "";const T=r.trend.map(x=>x[0]*60000),P=K6.map(k=>r.trend.map(x=>x[1+k])),SP=K6.map(k=>r.trend.map(x=>x[7+k])),ST=r.trend.map(x=>x[13]);
  return [0,1,2].map(z=>zoneChart(z,T,P,SP,ST,r.tolDef||10,r.incidents,170)).join("");};
onDoc("mousemove",e=>{const svg=e.target.closest&&e.target.closest("svg[data-zc]");if(!svg)return;const c=S.charts[svg.dataset.zc];if(!c)return;
  const box=svg.getBoundingClientRect(),x=(e.clientX-box.left)/box.width*c.W;let best=0,bd=1e9;c.T.forEach((t,i)=>{const d=Math.abs(c.xs(t)-x);if(d<bd){bd=d;best=i;}});
  const xh=svg.querySelector(".xh"),tip=svg.parentNode.querySelector(".ztip"),i=best,k1=c.z*2+1,k0=c.z*2,sp=c.SP[k1][i]??c.SP[k0][i];
  xh.setAttribute("x1",c.xs(c.T[i]));xh.setAttribute("x2",c.xs(c.T[i]));xh.setAttribute("visibility","visible");
  tip.hidden=false;tip.innerHTML=`<b>${fT(c.T[i])}</b> · set ${sp??"—"} °C<br><i style="background:var(--s1)"></i>${tcTag(k1)} ${fx(c.P[k1][i])} °C<br><i style="background:var(--s2)"></i>${tcTag(k0)} ${fx(c.P[k0][i])} °C`;
  const px=c.xs(c.T[i])/c.W*box.width;tip.style.left=Math.min(box.width-150,Math.max(0,px+10))+"px";});
onDoc("mouseout",e=>{const svg=e.target.closest&&e.target.closest("svg[data-zc]");if(!svg||svg.contains(e.relatedTarget))return;const xh=svg.querySelector(".xh"),tip=svg.parentNode.querySelector(".ztip");if(xh)xh.setAttribute("visibility","hidden");if(tip)tip.hidden=true;});

/* 11. views */
const fkName=fk=>fk.replace("|"," · ")+" chamber";
const cPill=c=>c.st==="none"?pill("bad","Never reviewed"):c.st==="overdue"?pill("bad","Overdue since "+fDT(c.due)):c.st==="soon"?pill("warn","Due "+fDT(c.due)):pill("ok","Due "+fDT(c.due));
function vDash(){
  const A=assess19(),sc=SCORE[A.score],st=A.st,ok=st.filter(x=>x.c.st==="ok"||x.c.st==="soon").length,op=S.reviews.reduce((a,r)=>a+openLines(r).length,0),last=S.reviews.slice().sort((a,b)=>(fromLocal(b.at)||0)-(fromLocal(a.at)||0))[0];
  const empty=!S.reviews.length&&!S.cur;
  return `${empty?`<div class="empty"><h2>No SCADA record reviewed yet</h2><p>Load a SCADA temperature export (Excel or CSV: Date, Time, SET-1/PV-1 … SET-6/PV-6) and record the second-level review, or open the sample record (F-02 tempering chamber, 22-Oct-2026).</p><div class="row" style="justify-content:center"><a class="btn pri" href="#load">Load a record</a>${SAMPLE?`<button class="w" data-sample>Open the sample record</button>`:""}</div></div>`:""}
  <div class="tiles">
    <a class="tile ${sc[0]}" href="#htsa"><span class="k">HTSA 1.9</span><span class="v" style="font-size:20px;padding:6px 0">${sc[1]}</span><span class="small muted">${plural(A.crit,"item")} not met</span></a>
    <a class="tile ${ok===st.length?"ok":"bad"}" href="#htsa"><span class="k">Chambers reviewed within ${C().maxHrs} h</span><span class="v">${ok}/${st.length}</span><span class="small muted">${st.filter(x=>x.c.st==="none").length} never · ${st.filter(x=>x.c.st==="overdue").length} overdue</span></a>
    <a class="tile ${op?"warn":"ok"}" href="#act"><span class="k">Reactions open</span><span class="v">${op}</span><span class="small muted">${S.reviews.reduce((a,r)=>a+openLines(r).filter(f=>r.lines[f.key].disp==="held").length,0)} with product on hold</span></a>
    <a class="tile ${last?VERD[last.verdict]?.[0]||"":""}" href="#reviews"><span class="k">Latest review</span><span class="v" style="font-size:20px;padding:6px 0">${last?esc(last.idle?"Not running":VERD[last.verdict]?.[1]||"—"):"—"}</span><span class="small muted">${last?esc(fkName(last.fkey))+" · "+fD(last.from):"none"}</span></a></div>
  <div class="pdca"><div><span class="ph">P</span><br>Qualified reviewers, the review procedure, tolerances and the chambers in scope.</div><div><span class="ph">D</span><br>Export the SCADA log of each chamber; load and analyse it against the set values and specifications.</div><div><span class="ph">C</span><br>Second-level review within ${C().maxHrs} h by a qualified reviewer: every out-of-control condition answered.</div><div><span class="ph">A</span><br>Reactions with product disposition, closed with verification; repeated problems to 8D / CAPA.</div></div>
  <div class="panel"><div class="row between"><h3>Chambers</h3><a class="btn pri" href="#load">Load a record</a></div><div class="tw"><table><thead><tr><th>Furnace</th>${CH.map(c=>`<th>${c} chamber</th>`).join("")}</tr></thead><tbody>
    ${[...new Set(scope().map(fk=>fk.split("|")[0]))].map(f=>`<tr><td><b>${esc(f)}</b></td>${CH.map(ch=>{const fk=fkeyOf(f,ch);if(!scope().includes(fk))return `<td class="muted small">not in scope</td>`;const c=cstat(fk);
      return `<td>${cPill(c)}${c.last?`<br><span class="small muted">last ${esc(c.last.idle?"not running":VERD[c.last.verdict]?.[1]||"")} · ${fDT(fromLocal(c.last.at))} · ${esc(c.last.by)}</span>`:""}<br><button class="w link" data-idle="${esc(fk)}">Record "not running"</button></td>`;}).join("")}</tr>`).join("")}</tbody></table></div></div>
  ${A.I.some(i=>i.lvl==="crit"||i.lvl==="warn")?`<div class="panel"><h3>Needs attention</h3><ul class="issues">${A.I.filter(i=>i.lvl==="crit"||i.lvl==="warn").map(i=>`<li><a href="#htsa">${esc(i.req)}</a>: ${esc(i.ev)} ${pill(i.lvl==="crit"?"bad":"warn",i.lvl==="crit"?"Action":"Attention")}</li>`).join("")}</ul></div>`:""}`;
}
/* the analysis page: the report of CALOR's SCADA review, inside the module's PDCA (D: load and analyse → C: the review record) */
const n0=v=>v==null?"—":Math.round(v).toLocaleString("en-IN");
const sec=(h,p,body,cls)=>`<section class="panel rp ${cls||""}"><div class="sec-head"><h3>${h}</h3>${p?`<p>${p}</p>`:""}</div>${body}</section>`;
const tcLvl=t=>t.offline?"bad":t.pct==null?"":t.pct>=100?"ok":t.pct>=95?"warn":"bad";
const tcWord=t=>t.offline?"offline":t.pct==null?"no data":t.pct>=100?"in control":t.pct>=95?"watch":"out";
const spSeq=A=>{const s=[];A.rows.forEach(r=>{const v=r.sp[0]??r.sp.find(x=>x!=null);if(v!=null&&s.at(-1)!==v)s.push(v);});return s;};
function layoutSvg(D,A){
  const P=pos(D.chamber==="Tempering"?C().posT:C().posH),tot=P.reduce((a,b)=>a+b,0)||12,W=900,L=90,Rr=90,bw=(W-L-Rr)/tot,y0=78,h=90;
  const g=[`<text x="${L-14}" y="${y0+h/2}" text-anchor="end" class="lb">Charge</text><text x="${L-14}" y="${y0+h/2+16}" text-anchor="end" class="ax">→</text><text x="${W-Rr+14}" y="${y0+h/2}" class="lb">Discharge</text><text x="${W-Rr+14}" y="${y0+h/2+16}" class="ax">→</text>`,
    `<rect x="${L}" y="${y0}" width="${W-L-Rr}" height="${h}" rx="6" fill="var(--sunk)" stroke="var(--muted)" stroke-width="1.5"/><text x="${L+8}" y="${y0+13}" class="ax">LEFT WALL</text><text x="${L+8}" y="${y0+h-5}" class="ax">RIGHT WALL</text>`];
  let p=0;P.forEach((n,z)=>{const x0=L+p*bw,x1=x0+n*bw,mid=(x0+x1)/2,[l,r]=[A.tcs[z*2+1],A.tcs[z*2]];
    if(z)g.push(`<line x1="${x0}" x2="${x0}" y1="${y0-6}" y2="${y0+h+6}" stroke="var(--muted)" stroke-dasharray="4 3"/>`);
    for(let i=0;i<n;i++)g.push(`<rect x="${x0+i*bw+4}" y="${y0+20}" width="${bw-8}" height="${h-40}" rx="3" fill="var(--panel)" stroke="var(--line)"/><text x="${x0+i*bw+bw/2}" y="${y0+h/2+4}" text-anchor="middle" class="ax">${p+i+1}</text>`);
    const dot=(t,y)=>`<circle cx="${mid}" cy="${y}" r="7" fill="var(--${tcLvl(t)==="ok"?"ok":tcLvl(t)==="warn"?"warn":"bad"})" stroke="var(--panel)" stroke-width="2"/>`;
    g.push(`<text x="${mid}" y="16" text-anchor="middle" class="lb">Zone ${z+1}</text><text x="${mid}" y="32" text-anchor="middle" class="ax">positions ${p+1}–${p+n}</text>`,
      `<text x="${mid}" y="54" text-anchor="middle" class="vl">${l.tag} avg ${sgn(l.mean)} °C · ${tcWord(l)}</text>`,dot(l,y0),dot(r,y0+h),
      `<text x="${mid}" y="${y0+h+30}" text-anchor="middle" class="vl">${r.tag} avg ${sgn(r.mean)} °C · ${tcWord(r)}</text>`);p+=n;});
  return `<svg viewBox="0 0 ${W} ${y0+h+44}" class="lay" role="img" aria-label="Chamber layout with the thermocouples on each wall and their status">${g.join("")}</svg>`;}
function zoneCard(D,A,z){const l=A.tcs[z*2+1],r=A.tcs[z*2],w=A.walls[z],inc=A.incidents.filter(i=>i.z===z),tr=traysOf(D.chamber,z),lv=[...new Set(A.levels[z*2].concat(A.levels[z*2+1]))].sort((a,b)=>a-b);
  const row=(lab,f,cls)=>`<tr><td>${lab}</td><td class="n ${cls?cls(l):""}">${f(l)}</td><td class="n ${cls?cls(r):""}">${f(r)}</td></tr>`,pc=t=>`c-${tcLvl(t)}`;
  return `<div class="zcard"><div class="row between"><b>Zone ${z+1}</b>${inc.length?pill(inc.some(i=>i.aff)?"bad":"warn",plural(inc.length,"excursion")):pill("ok","No excursion")}</div>
    <p class="small muted">Set values ${spSeq({rows:A.rows.map(x=>({sp:[x.sp[z*2+1]]}))}).join(" → ")} °C · window ±${A.tolDef} °C around each set value<br>Tray positions ${tr[0]}–${tr[1]} (${tr[1]-tr[0]+1} trays)<br>Process: ${esc([...new Set(lv.map(s=>procAt(A.ft,s)))].join(" / "))}</p>
    <table class="zt"><thead><tr><th></th><th class="n"><span class="lg"><i style="background:var(--s1)"></i>${l.tag} left</span></th><th class="n"><span class="lg"><i style="background:var(--s2)"></i>${r.tag} right</span></th></tr></thead><tbody>
    ${row("vs setpoint",t=>sgn(t.mean),t=>Math.abs(t.mean||0)>A.tolDef?"c-bad":"")}${row("Deviation min / max, °C",t=>`${sgn(t.min)} / ${sgn(t.max)}`)}${row("Std dev of deviation, °C",t=>fx(t.sd))}
    ${row("In tolerance",t=>t.offline?"offline":t.pct==null?"—":fx(t.pct)+" %",pc)}${row("Ppk",t=>fx(t.ppk,2),t=>t.ppk==null?"":t.ppk>=1.33?"c-ok":t.ppk>=1?"c-warn":"c-bad")}</tbody></table>
    <p class="small" style="margin-top:6px">Wall difference avg <b class="${Math.abs(w.mean||0)>A.tolDef/2?"c-warn":""}">${sgn(w.mean)} °C</b> <span class="muted">· max ${sgn(w.max)} °C at ${fT(w.maxAt)}</span></p></div>`;}
function heatmap(A){const cell=v=>{if(v==null)return `<td class="hm na"></td>`;const c=Math.max(-15,Math.min(15,v)),p=Math.round(Math.abs(c)/15*85);
    return `<td class="hm ${Math.abs(v)>A.tolDef?"oot":""}" style="background:color-mix(in srgb, var(${c<0?"--s1":"--hot"}) ${p}%, var(--sunk))${p>55?";color:#fff":""}">${v>0?"+":""}${Math.round(v)}</td>`;};
  return `<div class="tw"><table class="hmt"><thead><tr><th></th>${A.hours.map(h=>`<th>${pad(new Date(h).getUTCHours())}</th>`).join("")}</tr></thead><tbody>${K6.map(k=>`<tr><th>${tcTag(k)}</th>${A.hourly[k].map(cell).join("")}</tr>`).join("")}</tbody></table></div>
  <p class="small muted" style="margin-top:6px"><span class="ramp"></span> −15 … +15 °C. Blue runs cold, red runs hot. Outlined cells have a mean beyond ±${A.tolDef} °C.</p>`;}
function spreadSvg(A){const T=A.tcs.filter(t=>!t.offline&&t.n),tol=A.tolDef;if(!T.length)return "";
  let lo=Math.min(-2*tol,...T.map(t=>t.min)),hi=Math.max(2*tol,...T.map(t=>t.max));lo=Math.floor(lo/10)*10;hi=Math.ceil(hi/10)*10;
  const W=760,L=90,Rr=20,rh=38,H=T.length*rh+50,xs=v=>L+(v-lo)/(hi-lo)*(W-L-Rr),g=[];
  g.push(`<rect x="${xs(-tol)}" y="8" width="${xs(tol)-xs(-tol)}" height="${T.length*rh}" fill="var(--ok-bg)"/><line x1="${xs(0)}" x2="${xs(0)}" y1="8" y2="${T.length*rh+8}" stroke="var(--muted)" stroke-dasharray="4 3"/>`);
  const st=(hi-lo)>60?20:10;for(let v=Math.ceil(lo/st)*st;v<=hi;v+=st)g.push(`<line x1="${xs(v)}" x2="${xs(v)}" y1="8" y2="${T.length*rh+8}" stroke="var(--line)"/><text x="${xs(v)}" y="${T.length*rh+26}" text-anchor="middle" class="ax">${v>0?"+":""}${v}</text>`);
  T.forEach((t,i)=>{const y=8+i*rh+rh/2,c=isLeft(t.k)?"var(--s1)":"var(--s2)";
    g.push(`<text x="10" y="${y+4}" class="vl">${t.tag} <tspan class="ax">Z${t.zone+1} ${isLeft(t.k)?"L":"R"}</tspan></text><line x1="${xs(t.min)}" x2="${xs(t.max)}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="2"/>`,
      `<rect x="${xs(t.p5)}" y="${y-6}" width="${Math.max(2,xs(t.p95)-xs(t.p5))}" height="12" rx="3" fill="${c}" opacity=".45"/><circle cx="${xs(t.mean)}" cy="${y}" r="6" fill="var(--panel)" stroke="${c}" stroke-width="3"><title>${t.tag}: mean ${sgn(t.mean)} °C, 5–95 % ${sgn(t.p5)} … ${sgn(t.p95)}, min / max ${sgn(t.min)} / ${sgn(t.max)}</title></circle>`);});
  g.push(`<text x="${(L+W-Rr)/2}" y="${H-4}" text-anchor="middle" class="ax">°C from setpoint</text>`);
  return `<svg viewBox="0 0 ${W} ${H}" class="spr" role="img" aria-label="Spread of each thermocouple's deviation from the set value">${g.join("")}</svg>`;}
function vLoad(){
  const D=S.cur;
  const up=`<label class="btn pri upl">Upload SCADA export…<input type="file" id="scfile" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"></label>`;
  if(!D||!D.A)return `<section class="panel rp"><div class="eyebrow">SCADA review · CQI-9 HTSA 1.9 · pusher furnace</div><h2 class="rt">Load a SCADA temperature record</h2>
    <p class="muted">The SCADA export of one chamber: Excel (.xlsx) or CSV with Date, Time, SET-1 / PV-1 … SET-6 / PV-6 (TC-01 / TC-02 = zone 1 …; odd numbers right wall, even numbers left wall). The heading ("FURNACE-2 TEMPRING …") links it to the furnace and chamber. Everything is calculated in this browser; only the review's summary and a 10-minute trend are saved.</p>
    <div class="row" style="margin-top:10px">${up}${SAMPLE?`<button class="w" data-sample>Open the sample record</button>`:""}</div>${S.busy?`<p class="muted">Reading…</p>`:""}${S.err?`<p class="banner bad">${esc(S.err)}</p>`:""}</section>`;
  const A=D.A,O=D.O,fk=D.furnace&&D.chamber?fkeyOf(D.furnace,D.chamber):"",dup=fk&&S.reviews.find(r=>r.fkey===fk&&r.from===A.from&&r.to===A.to);
  const furnOpts=[...new Set([...String(C().furnaces).split(/[,;\s]+/).filter(Boolean),D.furnace].filter(Boolean))];
  const aff=A.incidents.filter(i=>i.aff),nCond=O.filter(o=>o.key&&(o.lvl==="crit"||o.lvl==="warn")).length,seq=spSeq(A);
  const hero=A.verdict==="rej"?["bad","✕","Out of tolerance: reaction plan required"]:A.verdict==="cond"?["warn","!","In tolerance where it counts, with findings to review"]:["ok","✓","In control: every thermocouple within tolerance"];
  const zt=A.incidents.reduce((s,i)=>s+i.outMin,0),wmax=A.walls.reduce((m,w)=>w.max!=null&&(m==null||Math.abs(w.max)>Math.abs(m.max))?w:m,null),hrs=(A.to-A.from)/3600000;
  return `<section class="rp-head"><div><div class="eyebrow">SCADA review · CQI-9 HTSA 1.9 · ${esc(D.chamber||"")} chamber${D.sample?" · sample record":""}</div><h2 class="rt">${esc(D.heading||D.file)}</h2>
      <p class="small muted">${esc(C().plant)} · Date <b>${fD(A.from)}</b>${fD(A.to)!==fD(A.from)?" – <b>"+fD(A.to)+"</b>":""} · File <b>${esc(D.file)}</b> · 6 thermocouples · 3 zones</p></div>
    <div class="row">${up}${dup?`<button class="pri w" data-rev="${esc(dup.id)}">Open its review ${esc(dup.id)}</button>`:`<button class="pri w" data-startrev ${fk?"":"disabled"}>Record the review (C)</button>`}</div></section>
  ${S.err?`<p class="banner bad">${esc(S.err)}</p>`:""}
  <section class="panel"><div class="fields"><label class="f"><span>Furnace</span><select data-link="furnace"><option value="">—</option>${furnOpts.map(f=>`<option ${D.furnace===f?"selected":""}>${esc(f)}</option>`).join("")}</select></label>
      <label class="f"><span>Chamber</span><select data-link="chamber"><option value="">—</option>${CH.map(c=>`<option ${D.chamber===c?"selected":""}>${c}</option>`).join("")}</select></label>
      <div class="f wide"><span class="small muted">Process rule</span><br><span class="small">${A.ft==="hardening"?`Hardening chamber: above ${HI_SET} °C austenitizing, trays in zones 2–3 count; zone 1 preheats; at ${HI_SET} °C or below no tray counts.`:A.ft==="tempering"?`Tempering chamber: above ${HI_SET} °C austenitizing (normalizing), at ${HI_SET} °C or below tempering / isothermal hold; trays count in every zone.`:"Choose the chamber."} Settings: <a href="#settings">P · Settings</a>.</span></div></div>
    ${fk?"":`<p class="banner warn" style="margin-top:8px">Choose the furnace and chamber before the review.</p>`}</section>
  <section class="hero ${hero[0]}"><span class="hi">${hero[1]}</span><div><h2>${hero[2]}</h2><p>${plural(A.incidents.length,"zone excursion")} beyond ±${A.tolDef} °C were found, ${plural(aff.length,"time window")} with trays affected. ${plural(nCond,"condition")} to answer in the review.<br>Tolerance used: set value ±${A.tolDef} °C per thermocouple${A.specs.some(s=>s.spec)?" (specification in force where it matches)":""} (set values ${seq.join(" → ")} °C).</p></div></section>
  <div class="kpis">
    <div class="kpi"><span class="k">Record period</span><span class="v mono">${fT(A.from)}–${fT(A.to)}</span><span class="s">${fx(hrs)} h · every ${fx(A.step*60,0)} s</span></div>
    <div class="kpi"><span class="k">Readings</span><span class="v mono">${n0(A.n)}</span><span class="s">${fx(Math.min(100,100*A.n/A.expected))} % of expected · ${plural(A.gaps.length,"gap")}</span></div>
    <div class="kpi"><span class="k">Readings in tolerance</span><span class="v mono c-${A.pctAll>=100?"ok":A.pctAll>=95?"warn":"bad"}">${fx(A.pctAll)}<small> %</small></span><span class="s">all ${A.tcs.filter(t=>!t.offline).length} TCs, ±${A.tolDef} °C · settling excluded</span></div>
    <div class="kpi"><span class="k">Zone excursions</span><span class="v mono c-${A.incidents.length?(aff.length?"bad":"warn"):"ok"}">${A.incidents.length}</span><span class="s">${fDur(zt)} of zone-time out of window</span></div>
    <div class="kpi"><span class="k">Worst deviation</span><span class="v mono c-${A.worst&&Math.abs(A.worst.d)>A.tolDef?"bad":"ok"}">${A.worst?sgn(A.worst.d):"—"}<small> °C</small></span><span class="s">${A.worst?`${tcTag(A.worst.k)} · ${A.worst.v} °C at ${fT(A.worst.t)}`:""}</span></div>
    <div class="kpi"><span class="k">Max wall difference</span><span class="v mono c-${wmax&&Math.abs(wmax.max)>A.tolDef?"warn":"ok"}">${wmax?fx(Math.abs(wmax.max)):"—"}<small> °C</small></span><span class="s">${wmax?`Zone ${wmax.z+1} at ${fT(wmax.maxAt)}`:""}</span></div></div>
  <p class="small muted">Settings used: tolerance ±${A.tolDef} °C · tray positions ${esc(D.chamber==="Tempering"?C().posT:C().posH)} · merge dips &lt; ${C().merge} min · settling after a set value change: until back within tolerance for ${C().hold} readings, at most ${C().settle} min (${n0(A.settledAll)} readings not judged) · valid range ${VMIN}–${VMAX} °C.</p>
  ${sec("Furnace layout and thermocouple status","One continuous chamber; zones are control zones. Trays move one position per push from the charge end to the discharge end.",layoutSvg(D,A))}
  ${sec("Zone summary","Left and right wall thermocouples per zone. Ppk uses the overall standard deviation against the set value ± tolerance.",`<div class="zcards">${[0,1,2].map(z=>zoneCard(D,A,z)).join("")}</div>`,"bare")}
  ${sec("Temperature trend by zone","Same time axis and the same temperature scale on every zone, so the charts can be compared directly.",`<div class="zcs">${chartsOfCur(D)}</div>`)}
  ${A.trans.length?sec("Response to set value changes",`A thermocouple is judged again once it is back within tolerance of the new set value for ${C().hold} readings in a row, or after ${C().settle} min at the latest. ${n0(A.settledAll)} readings were left out for this reason.${A.trans.some(x=>x.late)?` <b class="c-bad">${plural(A.trans.filter(x=>x.late).length,"thermocouple")} did not reach the new set value within ${C().settle} min.</b>`:""}`,
    `<div class="tw"><table><thead><tr><th>Thermocouple</th><th>Set value change</th><th>Changed at</th><th>Back in tolerance at</th><th class="n">Time to settle</th><th>Result</th></tr></thead><tbody>${A.trans.map(x=>`<tr><td><b>${tcTag(x.k)}</b> <span class="muted">Zone ${zoneOf(x.k)+1} · ${wallOf(x.k)} wall</span></td><td class="mono">${x.from} → ${x.to} °C ${x.to>x.from?"↑":"↓"}</td><td class="mono">${fT(x.at)}</td><td class="mono">${x.reached?fT(x.reached):"—"}</td><td class="n mono">${x.mins!=null?fDur(x.mins):"—"}</td><td>${x.reached?pill("ok","Reached in "+fDur(x.mins)):x.late?pill("bad","Not reached in "+fDur(C().settle)):pill("","Set value changed again")}</td></tr>`).join("")}</tbody></table></div>`):""}
  ${sec("Hourly deviation from setpoint","Mean of (reading − setpoint) per hour, °C.",heatmap(A))}
  ${sec("Spread of each thermocouple","Deviation from setpoint. Thin line: min to max. Bar: 5th to 95th percentile. Dot: mean. Green: the tolerance window.",spreadSvg(A))}
  ${sec("Excursion log",`One row per zone incident: either wall beyond ±${A.tolDef} °C, with dips less than ${C().merge} min apart merged. Trays inside that zone are affected only while the process rule counts them.`,
    A.incidents.length?`<div class="tw"><table><thead><tr><th>#</th><th>Zone</th><th>Walls out</th><th>Direction</th><th>Process</th><th>Start</th><th>End</th><th class="n">Span</th><th class="n">Time out</th><th>Extreme</th><th>Trays affected</th></tr></thead><tbody>${A.incidents.map((i,n)=>`<tr><td>${n+1}</td><td><b>Zone ${i.z+1}</b></td><td>${i.walls} <span class="muted">${i.tcs.join(", ")}</span></td><td>${i.dir}</td><td>${esc(i.proc)}</td><td class="mono">${fT(i.from)}</td><td class="mono">${fT(i.to)}</td><td class="n mono">${fDur(i.min)}</td><td class="n mono">${fDur(i.outMin)}</td><td class="mono c-bad">${i.ext.v} °C (${sgn(i.max)}) <span class="muted">${i.ext.tag} · set ${i.ext.sp}</span></td><td>${i.aff?`Zone ${i.z+1} <span class="muted">positions ${i.trays[0]}–${i.trays[1]}</span>`:`<span class="muted">not counted</span>`}</td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">No excursion.</p>`)}
  ${sec("Product affected: time windows","Trays in these zone positions during these windows were outside tolerance in a zone that counts for the process. They are the product to assess in the review.",
    aff.length?`<div class="tw"><table><thead><tr><th>Zone</th><th>Tray positions</th><th>From</th><th>To</th><th class="n">Duration</th><th class="n">Extreme</th></tr></thead><tbody>${aff.map(i=>`<tr><td>Zone ${i.z+1}</td><td>${i.trays[0]}–${i.trays[1]} of the ${esc((D.chamber||"").toLowerCase())} chamber</td><td class="mono">${fDT(i.from)}</td><td class="mono">${fDT(i.to)}</td><td class="n mono">${fDur(i.min)}</td><td class="n mono c-bad">${sgn(i.max)} °C</td></tr>`).join("")}</tbody></table></div>`:`<p class="muted">No product affected.</p>`)}
  ${sec("Findings and conditions",`The conditions marked "to answer" go into the review record (C) — each needs a reaction or the record that handles it (HTSA 1.9 detection and reaction).`,
    `<ul class="issues">${O.map(o=>`<li>${pill(o.lvl==="crit"?"bad":o.lvl==="warn"?"warn":o.lvl==="good"?"ok":"acc",o.tag)} ${esc(o.txt)}${o.key&&(o.lvl==="crit"||o.lvl==="warn")?` <span class="small muted">· to answer in the review</span>`:""}</li>`).join("")}</ul>
    <div class="row" style="margin-top:10px">${dup?`<button class="pri w" data-rev="${esc(dup.id)}">Open its review ${esc(dup.id)}</button>`:`<button class="pri w" data-startrev ${fk?"":"disabled"}>Record the second-level review (HTSA 1.9)</button>`}</div>`)}
  ${sec("Data-integrity checks","Counted on the raw readings (pv), not on the judged values.",`<div class="tw"><table><thead><tr><th>Check</th><th>Result</th></tr></thead><tbody>
    <tr><td>Readings vs expected (every ${fx(A.step*60,0)} s)</td><td>${n0(A.n)} of ${n0(A.expected)}</td></tr><tr><td>Gaps longer than ${C().gap} × the step</td><td>${A.gaps.length?A.gaps.map(g=>`${fT(g.from)}–${fT(g.to)} (${fDur(g.min)})`).join(", "):"none"}</td></tr>
    <tr><td>Thermocouples offline (0 all record)</td><td>${A.tcs.filter(t=>t.offline).map(t=>t.tag).join(", ")||"none"}</td></tr><tr><td>Readings outside ${VMIN}–${VMAX} °C (excluded)</td><td>${A.tcs.filter(t=>t.outR).map(t=>t.tag+" "+t.outR).join(", ")||"none"}</td></tr>
    <tr><td>Stuck values (same reading ≥ ${C().stuck} min)</td><td>${A.tcs.flatMap(t=>t.stuck.map(s=>`${t.tag} ${s.v} °C ${fT(s.from)}–${fT(s.to)}`)).join(", ")||"none"}</td></tr><tr><td>Jumps larger than ${C().spike} °C between two readings</td><td>${A.tcs.filter(t=>t.spikes).map(t=>t.tag+" "+t.spikes).join(", ")||"none"}</td></tr></tbody></table></div>`)}`;
}
function vReviews(){
  const L=S.reviews.slice().sort((a,b)=>(fromLocal(b.at)||0)-(fromLocal(a.at)||0));
  return `<div class="row between"><h2>Reviews</h2><a class="btn pri" href="#load">Load a record</a></div>
  ${L.length?`<div class="tw"><table><thead><tr><th>Review</th><th>Chamber</th><th>Data period</th><th>Result</th><th>Reviewed</th><th class="n">Conditions</th><th>Status</th></tr></thead><tbody>${L.map(r=>{const s=revStatus(r);
    return `<tr class="click" data-rev="${esc(r.id)}"><td class="mono">${esc(r.id)}${r.sample?' <span class="small muted">sample</span>':""}</td><td>${esc(fkName(r.fkey))}</td><td>${fDT(r.from)} – ${fDT(r.to)}</td><td>${r.idle?pill("","Not running"):pill(VERD[r.verdict]?.[0]||"",VERD[r.verdict]?.[1]||"—")}</td><td>${fDT(fromLocal(r.at))}<br><span class="small muted">${esc(r.by)}</span></td><td class="n">${conds(r).length}</td><td>${pill(...RST[s])}</td></tr>`;}).join("")}</tbody></table></div>`:`<div class="empty"><p>No review recorded yet.</p></div>`}`;
}
function vHtsa(){
  const A=assess19(),sc=SCORE[A.score];
  return `<div class="panel"><div class="row between"><h3>HTSA 1.9 · Is the heat treat monitoring system reviewed by qualified personnel?</h3><button data-h19>Evidence (print)</button></div>
    <p><span class="verdict ${sc[2]}">${sc[1]}</span> <span class="muted">${plural(A.I.filter(i=>i.lvl==="ok").length,"item")} met · ${plural(A.crit,"item")} not met</span></p>
    <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th><th>Action</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${pill(...LV[i.lvl])}</td><td>${esc(i.act)}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted" style="margin-top:8px">HTSA 1.9 asks for a second-level review, on top of the operators', by qualified personnel of the temperature charts, computer data logs and furnace / operator logs, at intervals not exceeding 24 hours; the review process documented, also for computerized data; out-of-control conditions and alarms detected, with a documented reaction. The review data also feed HTSA 1.8 (data over time, History view).</p></div>
  <div class="panel"><h3>Coverage per chamber (last ${C().covDays} days)</h3><div class="tw"><table><thead><tr><th>Chamber</th><th>Status</th><th>Last review</th><th>Gaps</th></tr></thead><tbody>${A.st.map(x=>`<tr><td>${esc(fkName(x.fk))}</td><td>${cPill(x.c)}</td><td>${x.c.last?fDT(fromLocal(x.c.last.at))+" · "+esc(x.c.last.by):"—"}</td><td class="small">${x.g.length?x.g.map(g=>`${g.kind==="interval"?"no review":"no data"} ${fDT(g.from)} – ${fDT(g.to)} (${fx(g.h,0)} h)`).join("; "):"none"}</td></tr>`).join("")}</tbody></table></div></div>`;
}
function vHist(){
  const by={};S.reviews.filter(r=>!r.idle).forEach(r=>(by[r.fkey]=by[r.fkey]||[]).push(r));
  const keys=Object.keys(by).sort();
  return `<h2>History</h2><p class="muted">Per chamber, the share of judged readings within tolerance per thermocouple and the mean deviation, review by review: the data over time for HTSA 1.8.</p>
  ${keys.length?keys.map(fk=>{const L=by[fk].sort((a,b)=>a.from-b.from);return `<div class="panel"><h3>${esc(fkName(fk))}</h3><div class="tw"><table><thead><tr><th>Data period</th><th>Result</th>${K6.map(k=>`<th class="n">${tcTag(k)}</th>`).join("")}<th class="n">Incidents</th></tr></thead><tbody>
    ${L.map(r=>`<tr class="click" data-rev="${esc(r.id)}"><td>${fD(r.from)} ${fT(r.from)}–${fT(r.to)}</td><td>${pill(VERD[r.verdict]?.[0]||"",VERD[r.verdict]?.[1]||"—")}</td>${K6.map(k=>{const t=r.tcs[k];if(!t)return "<td></td>";return `<td class="n">${t.offline?pill("bad","off"):t.pct==null?"—":pill(t.pct>=100?"ok":t.pct>=95?"warn":"bad",fx(t.pct,0)+"%")}<br><span class="small muted">${sgn(t.mean)}</span></td>`;}).join("")}<td class="n">${r.incidents.length}</td></tr>`).join("")}</tbody></table></div></div>`;}).join(""):`<div class="empty"><p>No review with data yet.</p></div>`}`;
}
function vAct(){
  const L=S.reviews.flatMap(r=>conds(r).map(f=>({r,f,l:r.lines[f.key]||{}}))).filter(x=>!x.l.how||(x.l.how==="react"&&!x.l.closed));
  return `<h2>Reactions</h2><p class="muted">Every out-of-control condition found in a reviewed record that is not answered yet, or whose reaction is not closed.</p>
  ${L.length?`<div class="tw"><table><thead><tr><th>Review</th><th>Chamber</th><th>Condition</th><th>Action</th><th>Owner</th><th>Product</th></tr></thead><tbody>${L.map(x=>`<tr class="click" data-rev="${esc(x.r.id)}"><td class="mono">${esc(x.r.id)}</td><td>${esc(fkName(x.r.fkey))}</td><td>${pill(x.f.lvl==="crit"?"bad":"warn",x.f.tag)} <span class="small">${esc(x.f.txt)}</span></td><td>${x.l.how?esc(x.l.action):pill("bad","Not answered")}</td><td>${esc(x.l.owner||"")}</td><td>${esc(DISP[x.l.disp]||"")}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty"><p>Nothing open.</p></div>`}`;
}
function vSettings(){const c=C(),RV=reviewers();
  return `<div class="grid2"><div class="panel"><h3>Qualified reviewers</h3><p class="small muted">The second-level review is signed only by these people. One per line: "Name | qualification evidence". People meeting the HTSA 1.1 minimum in the HT organization module are added automatically.</p>
    <textarea data-cfg="reviewers" rows="5">${esc(c.reviewers)}</textarea>
    ${RV.length?`<ul class="issues">${RV.map(r=>`<li>${esc(r.name)} <span class="small muted">(${esc(r.src)}${r.why?": "+esc(r.why):""})</span></li>`).join("")}</ul>`:`<p class="banner bad">Nobody yet.</p>`}</div>
  <div class="panel"><h3>Chambers in scope</h3><p class="small muted">One per line as "F-02|Tempering". Empty = every furnace × both chambers.</p><textarea data-cfg="scope" rows="5" placeholder="F-02|Hardening&#10;F-02|Tempering">${esc(c.scope)}</textarea>
    <p class="small muted">Now: ${scope().map(fk=>esc(fk.replace("|"," "))).join(", ")}</p></div></div>
  <div class="panel"><h3>Analysis and interval</h3><div class="fields">${SETF.map(([k,l,t])=>`<label class="f"><span>${esc(l)}</span><input data-cfg="${k}" type="${t}" value="${esc(c[k])}"></label>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="pri w" data-save-cfg>Save settings</button><span class="small muted">Changes are kept only after Save.</span></div></div>`;}
function vRules(){
  const c=C();
  const R=[["Record","SCADA export with Date, Time, SET-1 / PV-1 … SET-6 / PV-6 for one chamber (TC-01 / TC-02 = zone 1 …; odd numbers right wall, even numbers left wall). Readings outside "+VMIN+"–"+VMAX+" °C are excluded and reported; a thermocouple reading 0 all record is offline."],
    ["Deviation","PV − the row's own set value, so set value changes during the day are judged against the new value. Tolerance: the specification in force for the furnace whose zone set value matches (Specifications module), else ±"+c.tol+" °C."],
    ["Settling","After a set value change larger than the tolerance a thermocouple is not judged until it is back within tolerance for "+c.hold+" readings in a row, at most "+c.settle+" min (grey on the charts)."],
    ["Excursion / incident","Judged readings outside tolerance, lasting at least "+c.persist+" reading(s); excursions closer than "+c.merge+" min are joined, and the two thermocouples of a zone form one incident."],
    ["Product affected","Hardening chamber: set value above "+HI_SET+" °C counts zones 2 and 3 (zone 1 preheats); "+HI_SET+" °C or below counts no zone. Tempering chamber: every zone counts. Variation is always reported; only the product count changes."],
    ["Conditions","Incidents, thermocouples below 100 % in tolerance, offline thermocouples, readings out of range, stuck values, data gaps, late settling, set values without a specification in force, SAT failed / overdue / missing and elements past life (Thermocouples module). Each must be answered in the review: a reaction (action, owner; product disposition when product is affected) or the record that handles it."],
    ["Review (HTSA 1.9)","By a qualified reviewer (Settings list or HT organization module), after the end of the data period and not in the future; every chamber in scope reviewed at intervals of at most "+c.maxHrs+" h (a furnace not running is recorded as such). Reaction closed with verification and a final disposition (not \"on hold\")."],
    ["HTSA 1.9 score","Needs immediate action: no qualified reviewer or no review. Not satisfactory: any item not met. Satisfactory: otherwise."]];
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
  return out.join("\n");}
function vDocs(){return `<h2>Documentation</h2><div class="docs"><div class="doclist panel">${DOCS.map(([p,t])=>`<button data-doc="${esc(p)}" aria-current="${S.docSel===p}">${esc(t)}</button>`).join("")}</div><div class="doc" id="docview">${MWS.docs&&MWS.docs[S.docSel]!=null?md(MWS.docs[S.docSel]):`<p class="banner warn">This document is not embedded in this build.</p>`}</div></div>`;}
function vData(){const n=S.reviews.length;
  return `<h2>Data</h2><div class="grid2">
  <div class="panel"><h3>Back up and restore</h3><p class="small muted">${plural(n,"review")} · storage: ${S.dbState==="on"?"shared record store":"this browser"}. The SCADA files are not stored; keep them in the SCADA archive.</p>
    <div class="row"><button class="pri" data-export>Export JSON</button><button data-csv>Reviews CSV</button></div>
    <div class="row w" style="margin-top:10px"><label class="f"><span>Import a JSON export</span><input type="file" id="impfile" accept=".json,application/json"></label></div>
    ${S.imp?`<div class="banner" style="margin-top:8px">${esc(S.imp.msg)}<div class="row" style="margin-top:6px"><button class="pri" data-imp="merge">Merge (add and update)</button><button class="danger" data-imp="replace">Replace everything</button><button data-imp="cancel">Cancel</button></div></div>`:""}</div>
  <div class="panel"><h3>Starter set-up</h3><p class="small muted">Example reviewers (marked "(example)") in Settings, and the sample record (F-02 tempering chamber, 22-Oct-2026) opened for analysis. Nothing else is created.</p><button class="w" data-std>Load starter set-up</button></div>
  <div class="panel"><h3>Clear all</h3><p class="small muted">Deletes every review and the settings of this module. Type <b>CLEAR ALL</b> to enable.</p>
    <div class="row w"><input id="clrtxt" placeholder="CLEAR ALL" style="max-width:180px"><button class="danger" data-clear>Clear all</button></div></div></div>`;}
const VIEWS={dash:vDash,load:vLoad,reviews:vReviews,htsa:vHtsa,hist:vHist,act:vAct,settings:vSettings,rules:vRules,docs:vDocs,data:vData};

/* 12. modal: the review record */
function openModal(m){S.modal=m;$("#modal").hidden=false;redraw();}
function closeModal(){S.modal=null;const el=$("#modal");if(el){el.hidden=true;el.innerHTML="";}document.body.classList.remove("pm");if(S.pending){S.pending=false;render();}}
function redraw(){const el=$("#modal");if(!S.modal||!el)return;const st=el.scrollTop;S.charts={};el.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${(DRAW[S.modal.kind])()}</div>`;el.scrollTop=st;}
const sheet=(title,body,foot)=>`<div class="row between"><h2>${title}</h2><button data-close aria-label="Close">✕</button></div>${body}<div class="sticky-foot"><span class="msg" id="mmsg">${S.modal.msg||""}</span>${foot}</div>`;
const msg=(t,ok)=>{if(!S.modal)return;S.modal.msg=t?`<span style="color:var(--${ok?"ok":"bad"})">${esc(t)}</span>`:"";const el=$("#mmsg");if(el)el.innerHTML=S.modal.msg;};
function newReviewFromCur(){const D=S.cur,A=D.A;
  return fillRev({fkey:fkeyOf(D.furnace,D.chamber),furnace:D.furnace,chamber:D.chamber,file:D.file,heading:D.heading,sample:!!D.sample,from:A.from,to:A.to,n:A.n,step:A.step,tolDef:A.tolDef,verdict:A.verdict,
    tcs:A.tcs.map(t=>({k:t.k,tag:t.tag,zone:t.zone,wall:t.wall,offline:t.offline,n:t.n,pct:t.pct==null?null:Math.round(t.pct*10)/10,mean:t.mean==null?null:Math.round(t.mean*10)/10,sd:t.sd==null?null:Math.round(t.sd*10)/10,min:t.min,max:t.max})),
    incidents:A.incidents.map(i=>({...i,min:Math.round(i.min)})),findings:D.O,trend:A.trend,at:toLocal(Math.max(nowMs(),A.to)),by:""});}
function DRAW_REV(){const r=S.modal.ed,known=S.reviews.find(x=>x.id===r.id),m=revMissing(r),C_=conds(r),RV=reviewers();
  const line=(f)=>{const l=r.lines[f.key]||{},p=`lines.${f.key}`,id=f.key.replace(/[^A-Za-z0-9]/g,"_");
    return `<div class="cond ${f.lvl}"><p>${pill(f.lvl==="crit"?"bad":"warn",f.tag)} ${esc(f.txt)}</p><div class="fields">
      <label class="f req"><span>Answer</span><select data-l="${esc(f.key)}|how" id="l-${id}-how"><option value="">—</option>${Object.entries(HOW).map(([k,t])=>`<option value="${k}" ${l.how===k?"selected":""}>${t}</option>`).join("")}</select></label>
      ${l.how==="ref"?`<label class="f req wide"><span>Record that handles it (alarm record, 8D, SAT, maintenance order …)</span><input data-l="${esc(f.key)}|ref" value="${esc(l.ref)}"></label>`:""}
      ${l.how==="react"?`<label class="f req wide"><span>Action</span><textarea rows="2" data-l="${esc(f.key)}|action">${esc(l.action)}</textarea></label><label class="f req"><span>Owner</span><input data-l="${esc(f.key)}|owner" value="${esc(l.owner)}"></label>
        <label class="f ${f.lvl==="crit"?"req":""}"><span>Product disposition</span><select data-l="${esc(f.key)}|disp"><option value="">—</option>${Object.entries(DISP).map(([k,t])=>`<option value="${k}" ${l.disp===k?"selected":""}>${t}</option>`).join("")}</select></label>
        <label class="f"><span>Closed on</span><input type="date" data-l="${esc(f.key)}|closed" value="${esc(l.closed)}"></label><label class="f wide ${l.closed?"req":""}"><span>Verification (closed reactions)</span><input data-l="${esc(f.key)}|verify" value="${esc(l.verify)}"></label>`:""}
      </div>${l.how&&lineMissing(f,l).length?`<p class="small" style="color:var(--bad)">Missing: ${esc(lineMissing(f,l).join(", "))}</p>`:""}</div>`;};
  const body=`<p class="muted">${known?pill(...RST[revStatus(r)])+" ":""}${r.idle?pill("","Furnace not running"):pill(VERD[r.verdict]?.[0]||"",VERD[r.verdict]?.[1]||"—")} ${esc(fkName(r.fkey))} · data ${fDT(r.from)} – ${fDT(r.to)}${r.file?" · "+esc(r.file):""}${r.sample?" (sample record)":""}</p>
  ${r.idle?"":`<fieldset><legend>Summary of the record</legend><div class="tw"><table><thead><tr><th>TC</th><th>Zone · wall</th><th class="n">In tolerance</th><th class="n">Mean dev.</th><th class="n">Min / max</th></tr></thead><tbody>${r.tcs.map(t=>`<tr><td>${t.tag}</td><td>${t.zone+1} · ${t.wall}</td><td class="n">${t.offline?"offline":t.pct==null?"—":fx(t.pct)+" %"}</td><td class="n">${sgn(t.mean)}</td><td class="n">${sgn(t.min)} / ${sgn(t.max)}</td></tr>`).join("")}</tbody></table></div>
    <div class="zcs" style="margin-top:8px">${chartsOfRev(r)}</div></fieldset>`}
  <fieldset><legend>Out-of-control conditions (${C_.length}) · detection and reaction</legend>${C_.length?C_.map(line).join(""):`<p class="muted">None found by the analysis.</p>`}</fieldset>
  <fieldset><legend>Second-level review (MWSPL-F-SCADA-01)</legend><div class="fields">
    <label class="f req"><span>Reviewed on</span><input type="datetime-local" id="r-at" data-r="at" value="${esc(r.at)}"></label>
    <label class="f req"><span>Reviewer (qualified)</span><input id="r-by" data-r="by" list="rvlist" value="${esc(r.by)}"></label><datalist id="rvlist">${RV.map(x=>`<option value="${esc(x.name)}">`).join("")}</datalist>
    <label class="f wide ${r.idle?"req":""}"><span>${r.idle?"Why the furnace was not running":"Notes (also the furnace / operator log and alarms checked)"}</span><textarea rows="2" id="r-notes" data-r="notes">${esc(r.notes)}</textarea></label></div>
    <p class="small muted">Qualified reviewers: ${RV.length?esc(RV.map(x=>x.name).join(", ")):"none named (Settings)"}.</p></fieldset>
  ${m.length?`<div class="banner" style="margin-top:10px"><b>To complete the review:</b> ${esc(m.join(" · "))}</div>`:""}
  ${r.log.length?`<details style="margin-top:10px"><summary class="small">Log (${r.log.length})</summary><ul class="small">${r.log.slice().reverse().map(l=>`<li>${esc(String(l.d).replace("T"," "))} · ${esc(l.t)}</li>`).join("")}</ul></details>`:""}`;
  return sheet(esc(known?r.id+" · "+fkName(r.fkey):"Second-level review"),body,`<button class="pri w" data-save-rev>Save</button>${known?`<button data-revprint>Print record</button><button class="danger w" data-del-rev>Delete</button>`:""}<button data-close>Close</button>`);}
function DRAW_PRINT(){return sheet(esc(S.modal.title),`<div id="jobcard">${S.modal.html()}</div>`,`<button class="pri" data-print>Print</button><button data-close>Close</button>`);}
const pHead=t=>`<p class="small muted">${esc(C().plant)} · ${esc(t)} · printed ${fDT(nowMs())}</p>`;
function revHtml(r){return `${pHead("SCADA review record (MWSPL-F-SCADA-01, CQI-9 HTSA 1.9)")}<h2>${esc(r.id)} · ${esc(fkName(r.fkey))}</h2>
  <p>Data ${fDT(r.from)} – ${fDT(r.to)}${r.file?" · file "+esc(r.file):""} · result: <b>${r.idle?"furnace not running":esc(VERD[r.verdict]?.[1]||"")}</b> · status: ${esc(RST[revStatus(r)][1])}</p>
  ${r.idle?"":`<div class="tw"><table><thead><tr><th>TC</th><th>Zone · wall</th><th>In tolerance</th><th>Mean dev.</th><th>Min / max</th></tr></thead><tbody>${r.tcs.map(t=>`<tr><td>${t.tag}</td><td>${t.zone+1} · ${t.wall}</td><td>${t.offline?"offline":fx(t.pct)+" %"}</td><td>${sgn(t.mean)}</td><td>${sgn(t.min)} / ${sgn(t.max)}</td></tr>`).join("")}</tbody></table></div><div class="zcs">${chartsOfRev(r)}</div>`}
  <h3>Conditions and reactions</h3>${conds(r).length?`<div class="tw"><table><thead><tr><th>Condition</th><th>Answer</th><th>Product</th><th>Closed / verification</th></tr></thead><tbody>${conds(r).map(f=>{const l=r.lines[f.key]||{};return `<tr><td><b>${esc(f.tag)}</b> ${esc(f.txt)}</td><td>${l.how==="ref"?"See "+esc(l.ref):l.how==="react"?esc(l.action)+" ("+esc(l.owner)+")":"NOT ANSWERED"}</td><td>${esc(DISP[l.disp]||"")}</td><td>${l.closed?esc(l.closed)+" · "+esc(l.verify):""}</td></tr>`;}).join("")}</tbody></table></div>`:"<p>None.</p>"}
  <p>Reviewed ${esc(String(r.at).replace("T"," "))} by <b>${esc(r.by)}</b>${isRev(r.by)?" (qualified reviewer)":" (NOT in the qualified list)"}. ${esc(r.notes)}</p>
  <p class="small">Signature: ____________________</p>`;}
function h19Html(){const A=assess19(),sc=SCORE[A.score];return `${pHead("CQI-9 HTSA 1.9 self-assessment")}<p><span class="verdict ${sc[2]}">${sc[1]}</span></p>
  <div class="tw"><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Result</th></tr></thead><tbody>${A.I.map(i=>`<tr><td><b>${esc(i.req)}</b></td><td>${esc(i.ev)}</td><td>${esc(LV[i.lvl][1])}</td></tr>`).join("")}</tbody></table></div>
  <h3 style="margin-top:12px">Reviews (last ${C().covDays} days)</h3><div class="tw"><table><thead><tr><th>Review</th><th>Chamber</th><th>Data</th><th>Reviewed</th><th>Result</th><th>Status</th></tr></thead><tbody>${S.reviews.filter(r=>fromLocal(r.at)>=nowMs()-C().covDays*864e5).sort((a,b)=>fromLocal(a.at)-fromLocal(b.at)).map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(fkName(r.fkey))}</td><td>${fDT(r.from)} – ${fDT(r.to)}</td><td>${esc(String(r.at).replace("T"," "))} ${esc(r.by)}</td><td>${r.idle?"not running":esc(VERD[r.verdict]?.[1]||"")}</td><td>${esc(RST[revStatus(r)][1])}</td></tr>`).join("")}</tbody></table></div>`;}
const DRAW={rev:DRAW_REV,print:DRAW_PRINT};

/* 13. actions */
async function saveRev(){const r=fillRev(S.modal.ed),known=S.reviews.find(x=>x.id===r.id);
  if(fromLocal(r.at)==null){msg("Enter the review time.");return;}
  if(!known){r.id="DR-"+String(maxNo(S.reviews)+1).padStart(4,"0");}
  const m=revMissing(r);
  if(await put(r,known?"Saved":"Review recorded")){S.modal.ed=clone(r);redraw();msg(m.length?`Saved · ${plural(m.length,"item")} missing`:"Saved · complete",!m.length);toast(r.id+" saved");}}
function idleReview(fk){const [f,ch]=fk.split("|"),c=cstat(fk),now=fromLocal(toLocal(nowMs())),from=c.last&&c.last.to!=null?c.last.to:now-C().maxHrs*3600000;
  openModal({kind:"rev",ed:fillRev({fkey:fk,furnace:f,chamber:ch,idle:true,from,to:now,verdict:"",at:toLocal(now)}),msg:""});}
async function stdOps(){if(!needDb())return;const ex=" (example)";
  if(!txt(S.cfg.reviewers)){S.cfg={...S.cfg,reviewers:`R. Sharma${ex} | B.Tech metallurgy, 15 yr heat treat, CQI-9 trained\nA. Verma${ex} | B.Tech metallurgy, HT Engineer, deputy`};await dbSet("config","settings",S.cfg);}
  loadSample();toast("Starter set-up loaded: example reviewers and the sample record");}
function armedDelete(b,fn){if(b.classList.contains("armed")){fn();return;}b.classList.add("armed");const t=b.textContent;b.textContent="Confirm delete";setTimeout(()=>{if(b.isConnected){b.classList.remove("armed");b.textContent=t;}},4000);}
async function download(name,text,type){
  if(S.dl){try{await S.dl.save({filename:name,data:new Blob([text],{type})});return;}catch(e){if(e&&e.code==="declined")return;}}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
const stamp=()=>toLocal(nowMs()).slice(0,10);
const exportJson=()=>download(`mws-scada-${stamp()}.json`,JSON.stringify({app:"mws-scada-manager",v:1,saved:new Date().toISOString(),reviews:S.reviews,config:S.cfg},null,1),"application/json");
const csvQ=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
const csv=()=>download(`mws-scada-reviews-${stamp()}.csv`,"﻿"+[["Review","Furnace","Chamber","Data from","Data to","Result","Reviewed","Reviewer","Conditions","Open reactions","Status",...K6.map(k=>tcTag(k)+" % in tol")],
  ...S.reviews.map(r=>[r.id,r.furnace,r.chamber,fDT(r.from),fDT(r.to),r.idle?"not running":VERD[r.verdict]?.[1]||"",String(r.at).replace("T"," "),r.by,conds(r).length,openLines(r).length,RST[revStatus(r)][1],...K6.map(k=>r.tcs[k]?(r.tcs[k].offline?"offline":r.tcs[k].pct):"")])].map(x=>x.map(csvQ).join(",")).join("\r\n"),"text/csv");
function readImport(f){f.text().then(t=>{let o;try{o=JSON.parse(t);}catch(e){toast("Not a JSON file");return;}
  if(!o||o.app!=="mws-scada-manager"||!Array.isArray(o.reviews)){toast("Not an export of this module");return;}
  const L=o.reviews.filter(x=>x&&ID_RE.test(String(x.id||""))).map(fillRev);S.imp={reviews:L,config:o.config||null,msg:`${f.name}: ${plural(L.length,"review")}.`};render();});}
async function doImport(mode){if(!S.imp||!needDb())return;const I=S.imp;S.imp=null;
  if(mode==="replace")for(const x of S.reviews)if(!I.reviews.some(y=>y.id===x.id))await dbDel("reviews",x.id);
  for(let i=0;i<I.reviews.length;i+=8)await Promise.all(I.reviews.slice(i,i+8).map(o=>dbSet("reviews",o.id,o)));
  if(I.config){const c={...DEF,...I.config};delete c.id;await dbSet("config","settings",c);}toast("Imported ("+mode+")");render();}
async function clearAll(){if(($("#clrtxt")||{}).value!=="CLEAR ALL"){toast("Type CLEAR ALL to clear");return;}if(!needDb())return;
  for(const x of S.reviews)await dbDel("reviews",x.id);await dbDel("config","settings");toast("All SCADA review data cleared");}

/* 14. wiring */
onDoc("click",e=>{
  const b=e.target.closest("button,tr.click,a[data-docref]");if(!b)return;const d=b.dataset;
  if(b.closest("#modal")||d.close!==undefined){
    if(d.close!==undefined){closeModal();return;}
    if(d.saveRev!==undefined){saveRev();return;}
    if(d.revprint!==undefined){const r=fillRev(S.modal.ed);openModal({kind:"print",title:"SCADA review record "+r.id,html:()=>revHtml(r)});return;}
    if(d.delRev!==undefined){armedDelete(b,async()=>{await dbDel("reviews",S.modal.ed.id);toast("Deleted");closeModal();});return;}
    if(d.print!==undefined){document.body.classList.add("pm");window.print();setTimeout(()=>document.body.classList.remove("pm"),500);return;}
    return;}
  if(d.sample!==undefined){loadSample();return;}
  if(d.startrev!==undefined){if(!needDb()||!S.cur)return;openModal({kind:"rev",ed:newReviewFromCur(),msg:""});return;}
  if(d.rev){const r=S.reviews.find(x=>x.id===d.rev);if(r)openModal({kind:"rev",ed:clone(r),msg:""});return;}
  if(d.idle){if(needDb())idleReview(d.idle);return;}
  if(d.h19!==undefined){openModal({kind:"print",title:"HTSA 1.9 evidence",html:h19Html});return;}
  if(d.std!==undefined){stdOps();return;}
  if(d.saveCfg!==undefined){document.querySelectorAll("[data-cfg]").forEach(i=>{const k=i.dataset.cfg,t=(SETF.find(x=>x[0]===k)||[])[2];S.cfg[k]=t==="number"?(num(i.value)>0?num(i.value):DEF[k]):i.value;});saveCfg();return;}
  if(d.doc){S.docSel=d.doc;render();return;}
  if(d.docref){e.preventDefault();const p=DOCS.find(x=>x[0].endsWith(d.docref.replace(/^(\.\.\/)+/,"").replace(/^\.\//,"")));if(p){S.docSel=p[0];render();}return;}
  if(d.export!==undefined){exportJson();return;}if(d.csv!==undefined){csv();return;}
  if(d.imp){if(d.imp==="cancel"){S.imp=null;render();}else doImport(d.imp);return;}
  if(d.clear!==undefined){armedDelete(b,clearAll);return;}
});
onDoc("input",e=>{const el=e.target;if(!S.modal||!S.modal.ed)return;
  if(el.dataset.r){S.modal.ed[el.dataset.r]=el.value;return;}
  if(el.dataset.l&&el.tagName!=="SELECT"){const i=el.dataset.l.lastIndexOf("|"),k=el.dataset.l.slice(0,i),f=el.dataset.l.slice(i+1);(S.modal.ed.lines[k]=S.modal.ed.lines[k]||{})[f]=el.value;}
});
onDoc("change",e=>{const el=e.target;
  if(S.modal&&S.modal.ed&&el.dataset.l){const i=el.dataset.l.lastIndexOf("|"),k=el.dataset.l.slice(0,i),f=el.dataset.l.slice(i+1);(S.modal.ed.lines[k]=S.modal.ed.lines[k]||{})[f]=el.value;
    if(el.tagName==="SELECT"||f==="closed")redraw();return;}
  if(el.dataset.link&&S.cur){S.cur[el.dataset.link]=el.value;runCur();render();return;}
  if(el.id==="scfile"&&el.files[0]){loadFile(el.files[0]);el.value="";return;}
  if(el.id==="impfile"&&el.files[0]){readImport(el.files[0]);el.value="";}
});
onDoc("keydown",e=>{if(e.key==="Escape"&&S.modal)closeModal();});
onWin("hashchange",()=>{route();S.pending=false;render();window.scrollTo(0,0);});

/* 15. integration API */
MWS.scada={closeModal,
  stats:()=>{const A=assess19(),st=A.st;return {db:S.dbState,score:A.score,label:SCORE[A.score][1],cls:SCORE[A.score][0],crit:A.crit,chambers:st.length,ok:st.filter(x=>x.c.st==="ok"||x.c.st==="soon").length,
    never:st.filter(x=>x.c.st==="none").length,overdue:st.filter(x=>x.c.st==="overdue").length,open:S.reviews.reduce((a,r)=>a+openLines(r).length,0),reviews:S.reviews.length};},
  summary:()=>{const A=assess19(),st=A.st;return `${st.filter(x=>x.c.st==="ok"||x.c.st==="soon").length} of ${st.length} chambers reviewed within ${C().maxHrs} h, ${plural(S.reviews.length,"review")} recorded; HTSA 1.9 ${SCORE[A.score][1].toLowerCase()}.`;}};
window.__SCM={S,analyze,findings,parseAOA,readXlsx,assess19,revMissing,cstat,reviewers,loadSample};

/* 16. boot */
async function boot(){
  route();render();
  const [dl,user,db]=await Promise.all([useCap("downloads"),useCap("user"),useCap("db")]);
  S.dl=dl;
  if(user){try{const c=await user.can("data.write");S.canWrite=c!==false;}catch(e){}}
  if(db)startStore(sharedDb(db),"on");else startStore(localDb(),"local");
}
boot();
