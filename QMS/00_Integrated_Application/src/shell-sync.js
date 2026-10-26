/* ---------- shell: Google Drive folder (the records saved as JSON files) ----------
   Google Drive for Desktop syncs a Drive folder with the PC; this application writes one JSON file per module into it through the
   File System Access API (Chrome / Edge; the folder handle is kept in IndexedDB "mws-drive"). The modules keep working on their
   localStorage key (mws-<module>-local-v1); every change of such a key is marked and written 1.5 s later. A file changed on another
   computer (another stamp) is read on start, every 60 s and when the window gets the focus, and the page reloads with it; when this
   browser had unsaved changes of the same module, its version is kept in conflicts/ and the other one is used (no merge).
   Files: <key>.json = {format "CALOR Quality System data", version, key, module, saved, by, stamp, data}; mws-manifest.json;
   backup/mws-backup-<day>.json once a day (30 kept) and backup/before-link_<time>.json; conflicts/<key>_<time>_<computer>.json. */
(function(){
  const KEYS={"mws-org-local-v1":"HT organization","mws-apqp-local-v1":"Quality planning","mws-spec-local-v1":"Process specifications","mws-valid-local-v1":"Process validation","mws-trend-local-v1":"Trend analysis","mws-scada-local-v1":"SCADA review","mws-quench-local-v1":"Quench media","mws-tc-local-v1":"Thermocouples"};
  const FORMAT="CALOR Quality System data",SK="mws-sync",DB_NAME="mws-drive",MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const pad=n=>String(n).padStart(2,"0"),day=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
  const ftime=()=>{const d=new Date();return `${day()}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;};
  const hm=iso=>{if(!iso)return "";const d=new Date(iso);const t=`${pad(d.getHours())}:${pad(d.getMinutes())}`;return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`===day()?t:`${t} on ${d.getDate()} ${MON[d.getMonth()]}`;};
  const safe=s=>String(s||"PC").replace(/[^A-Za-z0-9_-]+/g,"-").slice(0,40);
  const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  /* raw access that does not mark anything */
  const P=Storage.prototype,rawSet=P.setItem,rawDel=P.removeItem;
  const rget=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
  const rset=(k,v)=>{try{v==null?rawDel.call(localStorage,k):rawSet.call(localStorage,k,v);}catch(e){}};
  let SY={pc:"",base:{},dirty:{},last:"",conflicts:[]};try{SY={...SY,...(JSON.parse(rget(SK)||"null")||{})};}catch(e){}
  if(!SY.pc)SY.pc="PC-"+Math.random().toString(36).slice(2,6).toUpperCase();
  const keep=()=>rset(SK,JSON.stringify(SY));keep();
  let DIR=null,ACC="none",BUSY=false,ERR="",T=0;
  const newStamp=()=>`${new Date().toISOString()}|${SY.pc}|${Math.random().toString(36).slice(2,8)}`;
  /* every change of a module key is marked dirty and written shortly after */
  P.setItem=function(k,v){const o=this===localStorage&&k in KEYS?rget(k):null;rawSet.call(this,k,v);if(this===localStorage&&k in KEYS&&o!==String(v))touch(k);};
  P.removeItem=function(k){const had=this===localStorage&&k in KEYS&&rget(k)!=null;rawDel.call(this,k);if(had)touch(k);};
  function touch(k){SY.dirty[k]=1;keep();show();clearTimeout(T);T=setTimeout(flush,1500);}
  /* IndexedDB: the folder handle */
  const idb=(mode,fn)=>new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore("h");
    r.onerror=()=>rej(r.error);r.onsuccess=()=>{const tx=r.result.transaction("h",mode),st=tx.objectStore("h"),q=fn(st);tx.oncomplete=()=>res(q&&q.result);tx.onerror=()=>rej(tx.error);};});
  const saveH=h=>idb("readwrite",st=>h?st.put(h,"dir"):st.delete("dir")),loadH=()=>idb("readonly",st=>st.get("dir")).catch(()=>null);
  async function perm(h,ask){if(!h)return "none";if(!h.queryPermission)return "granted";const o={mode:"readwrite"};
    let p=await h.queryPermission(o);if(p!=="granted"&&ask)p=await h.requestPermission(o);return p;}
  /* files */
  async function readJSON(dir,name){try{const f=await (await dir.getFileHandle(name)).getFile();return {o:JSON.parse(await f.text()),mod:f.lastModified};}catch(e){return null;}}
  async function writeJSON(dir,name,o){const fh=await dir.getFileHandle(name,{create:true}),w=await fh.createWritable();await w.write(JSON.stringify(o,null,1));await w.close();}
  const env=(k,raw,st)=>{let data=null;try{data=raw==null?null:JSON.parse(raw);}catch(e){data=null;}
    return {format:FORMAT,version:1,key:k,module:KEYS[k],saved:new Date().toISOString(),by:SY.pc,stamp:st,deleted:raw==null,data};};
  const fromEnv=e=>e.deleted||e.data==null?null:JSON.stringify(e.data);
  const hasLocal=()=>Object.keys(KEYS).filter(k=>{const v=rget(k);if(!v)return false;try{const o=JSON.parse(v);return Object.values(o).some(c=>c&&Object.keys(c).length);}catch(e){return false;}});
  async function remoteKeys(){const out={};for(const k of Object.keys(KEYS)){const r=await readJSON(DIR,k+".json");if(r&&r.o&&r.o.format===FORMAT)out[k]=r;}return out;}
  async function backup(name){const data={};Object.keys(KEYS).forEach(k=>{const v=rget(k);if(v!=null)data[k]=v;});
    const bd=await DIR.getDirectoryHandle("backup",{create:true});await writeJSON(bd,name,{app:"CALOR Quality System",saved:new Date().toISOString(),by:SY.pc,data});return bd;}
  async function daily(){try{const name=`mws-backup-${day()}.json`,bd=await DIR.getDirectoryHandle("backup",{create:true});
      try{await bd.getFileHandle(name);return;}catch(e){}await backup(name);
      const L=[];for await(const [n] of bd.entries())if(/^mws-backup-\d{4}-\d{2}-\d{2}\.json$/.test(n))L.push(n);L.sort().reverse().slice(30).forEach(n=>bd.removeEntry(n).catch(()=>{}));}catch(e){}}
  async function manifest(){await writeJSON(DIR,"mws-manifest.json",{format:"CALOR Quality System data folder",version:1,updated:new Date().toISOString(),by:SY.pc,
    note:"One file per module of the CALOR Quality System; the records are in its 'data' field. backup/ = one full backup per day, conflicts/ = changes kept when two computers changed the same module.",modules:KEYS});}
  /* write the dirty keys; a file changed elsewhere since it was last read here is a conflict */
  async function flush(){if(!DIR||ACC!=="granted"||BUSY)return show();BUSY=true;let reload=false;
    try{for(const k of Object.keys(SY.dirty)){const r=await readJSON(DIR,k+".json"),b=SY.base[k];
        if(r&&r.o&&r.o.format===FORMAT&&r.o.stamp&&(!b||r.o.stamp!==b.st)){await conflict(k,r);reload=true;continue;}
        const st=newStamp();await writeJSON(DIR,k+".json",env(k,rget(k),st));SY.base[k]={st};delete SY.dirty[k];}
      SY.last=new Date().toISOString();ERR="";keep();await manifest();await daily();}
    catch(e){ERR=e.message||String(e);}
    BUSY=false;show();if(reload)reloadSoon();}
  async function conflict(k,r){const cd=await DIR.getDirectoryHandle("conflicts",{create:true}),name=`${k}_${ftime()}_${safe(SY.pc)}.json`;
    await writeJSON(cd,name,env(k,rget(k),newStamp()));rset(k,fromEnv(r.o));SY.base[k]={st:r.o.stamp};delete SY.dirty[k];
    SY.conflicts.push({k,file:"conflicts/"+name,at:new Date().toISOString(),by:r.o.by||"another computer"});keep();}
  /* read the files changed on another computer */
  async function pull(){if(!DIR||ACC!=="granted"||BUSY)return false;BUSY=true;let changed=false;
    try{for(const k of Object.keys(KEYS)){const r=await readJSON(DIR,k+".json");if(!r||!r.o||r.o.format!==FORMAT||!r.o.stamp)continue;const b=SY.base[k];if(b&&b.st===r.o.stamp)continue;
        if(SY.dirty[k])await conflict(k,r);else{rset(k,fromEnv(r.o));SY.base[k]={st:r.o.stamp};}changed=true;}
      keep();ERR="";}catch(e){ERR=e.message||String(e);}
    BUSY=false;show();return changed;}
  const busyUI=()=>{const m=document.getElementById("modal");return m&&!m.hidden||document.getElementById("syncDlg").open;};
  function reloadSoon(){if(busyUI()){setTimeout(reloadSoon,3000);return;}MWS.toast("Changes from the Google Drive folder: reloading…");setTimeout(()=>location.reload(),600);}
  async function poll(){if(!DIR)return;ACC=await perm(DIR,false);if(ACC!=="granted")return show();if(await pull())reloadSoon();if(Object.keys(SY.dirty).length)flush();}
  /* link a folder: empty folder ← this browser; folder with data and an empty browser ← the folder; both → the user chooses */
  async function link(){if(!window.showDirectoryPicker){alert("This browser cannot write to a folder. Use Chrome or Edge on the computer where Google Drive for Desktop runs.");return;}
    let h;try{h=await window.showDirectoryPicker({mode:"readwrite",id:"mws-drive"});}catch(e){return;}
    DIR=h;ACC=await perm(h,true);if(ACC!=="granted"){DIR=null;alert("Access to the folder was not allowed.");return;}
    const R=await remoteKeys(),loc=hasLocal();let fromFolder=false;
    if(Object.keys(R).length&&loc.length){
      const use=await choose(`<p><b>Both have records.</b> The folder <b>${esc(h.name)}</b> holds ${Object.keys(R).map(k=>esc(KEYS[k])+" ("+esc(hm(R[k].o.saved))+", "+esc(R[k].o.by||"?")+")").join(", ")}; this browser holds ${loc.map(k=>esc(KEYS[k])).join(", ")}.</p><p>Which should be used? The other side is first saved as a full backup in <code>backup/</code>.</p>`,
        [["folder","Use the folder's records"],["browser","Use this browser's records"],["cancel","Cancel"]]);
      if(use==="cancel"||!use){DIR=null;return;}
      if(use==="folder"){fromFolder=true;await backup(`before-link_${ftime()}_${safe(SY.pc)}.json`);Object.entries(R).forEach(([k,r])=>{rset(k,fromEnv(r.o));SY.base[k]={st:r.o.stamp};});SY.dirty={};}
      else{const bd=await DIR.getDirectoryHandle("backup",{create:true});await writeJSON(bd,`before-link_${ftime()}_folder.json`,{app:"CALOR Quality System",saved:new Date().toISOString(),data:Object.fromEntries(Object.entries(R).map(([k,r])=>[k,fromEnv(r.o)]))});
        SY.base={};Object.entries(R).forEach(([k,r])=>SY.base[k]={st:r.o.stamp});Object.keys(KEYS).forEach(k=>{if(rget(k)!=null)SY.dirty[k]=1;});}}
    else if(Object.keys(R).length){fromFolder=true;Object.entries(R).forEach(([k,r])=>{rset(k,fromEnv(r.o));SY.base[k]={st:r.o.stamp};});SY.dirty={};}
    else{SY.base={};Object.keys(KEYS).forEach(k=>{if(rget(k)!=null)SY.dirty[k]=1;});}
    keep();await saveH(h);await flush();
    if(fromFolder){MWS.toast("Folder linked: loading its records…");setTimeout(()=>location.reload(),700);}
    else{MWS.toast("Folder linked: the records are saved to "+h.name);window.dispatchEvent(new HashChangeEvent("hashchange"));dlg();}}
  async function unlink(){if(!confirm("Stop saving to the Google Drive folder? The records stay in this browser and in the folder."))return;DIR=null;ACC="none";await saveH(null).catch(()=>{});SY.base={};SY.dirty={};keep();show();window.dispatchEvent(new HashChangeEvent("hashchange"));dlg();}
  function choose(html,opts){return new Promise(res=>{const d=document.getElementById("syncDlg");
    d.innerHTML=`<div class="sheet"><h2>Link the Google Drive folder</h2>${html}<div class="row">${opts.map(([k,t],i)=>`<button class="${i?"":"pri"} w" data-ch="${k}">${esc(t)}</button>`).join("")}</div></div>`;
    d.onclick=e=>{const b=e.target.closest("[data-ch]");if(b){d.close();d.onclick=null;res(b.dataset.ch);}};if(!d.open)d.showModal();});}
  /* the header chip and the dialog */
  function status(){const n=Object.keys(SY.dirty).length;
    if(!DIR)return ["","This browser only"];if(ACC!=="granted")return ["warn","Drive: allow access"];if(ERR)return ["bad","Drive: problem"];
    if(SY.conflicts.length)return ["warn","Drive: "+SY.conflicts.length+" conflict"+(SY.conflicts.length>1?"s":"")];
    if(BUSY)return ["","Drive: saving…"];if(n)return ["warn","Drive: "+n+" waiting"];return ["ok","Drive: saved "+hm(SY.last)];}
  function show(){const b=document.getElementById("syncBtn");if(!b)return;const [c,t]=status();b.textContent=t;b.className="sync "+c;
    const d=document.getElementById("syncDlg");if(d&&d.open&&!d.onclick)dlg();}
  function dlg(){const d=document.getElementById("syncDlg"),[c,t]=status();d.onclick=null;
    d.innerHTML=`<div class="sheet"><div class="row between"><h2>Google Drive folder</h2><button data-sy="close" aria-label="Close">✕</button></div>
      <p>${esc(t)}${DIR?` · folder <b>${esc(DIR.name)}</b> · this computer: <b>${esc(SY.pc)}</b>`:""}</p>
      <p class="small muted">The records of every module are saved as JSON files (one per module) into a folder that Google Drive for Desktop syncs, so they are in your Google Drive and on every computer that links the same folder. Use Chrome or Edge. Choose a folder of its own (for example "CALOR Quality System" in My Drive), not CALOR's folder. Changes are saved 1.5 s after you make them; changes from another computer are read every minute and when you come back to the window. Keep the folder available offline in Google Drive for Desktop.</p>
      ${ERR?`<p class="banner bad">${esc(ERR)}</p>`:""}
      ${DIR?`<ul class="small">${Object.keys(KEYS).map(k=>`<li>${esc(KEYS[k])}: ${SY.dirty[k]?"waiting to be saved":SY.base[k]?"saved":rget(k)==null?"no records":"not saved yet"}</li>`).join("")}</ul>`:""}
      ${SY.conflicts.length?`<p><b>Conflicts</b> (both computers changed the same module; the other computer's records are used, this browser's are kept in the folder):</p><ul class="small">${SY.conflicts.slice(-10).reverse().map(x=>`<li>${esc(KEYS[x.k]||x.k)} · ${esc(hm(x.at))} · ${esc(x.file)} (other: ${esc(x.by)})</li>`).join("")}</ul>`:""}
      <div class="row">${!DIR?`<button class="pri w" data-sy="link">Link a Google Drive folder…</button>`:`${ACC!=="granted"?`<button class="pri w" data-sy="allow">Allow access</button>`:`<button class="pri w" data-sy="now">Save and read now</button>`}<button class="w" data-sy="link">Link another folder…</button><button data-sy="unlink">Unlink</button>`}
        <button data-sy="pc">Rename this computer</button>${SY.conflicts.length?`<button data-sy="clr">Clear the conflict list</button>`:""}</div></div>`;
    if(!d.open)d.showModal();}
  document.addEventListener("click",async e=>{
    if(e.target.closest&&e.target.closest("#syncBtn")){dlg();return;}
    const b=e.target.closest&&e.target.closest("[data-sy]");if(!b)return;const a=b.dataset.sy,d=document.getElementById("syncDlg");
    if(a==="close")d.close();
    if(a==="link")link();
    if(a==="unlink")unlink();
    if(a==="allow"){ACC=await perm(DIR,true);show();if(ACC==="granted")await poll();dlg();}
    if(a==="now"){await poll();await flush();dlg();}
    if(a==="pc"){const n=prompt("Name of this computer (shown in the files and conflicts):",SY.pc);if(n&&n.trim()){SY.pc=n.trim().slice(0,40);keep();dlg();}}
    if(a==="clr"){SY.conflicts=[];keep();show();dlg();}});
  window.addEventListener("focus",()=>{poll();});
  setInterval(poll,60000);
  window.addEventListener("beforeunload",e=>{if(DIR&&ACC==="granted"&&Object.keys(SY.dirty).length){flush();e.preventDefault();e.returnValue="";}});
  /* start: the linked folder from IndexedDB; without permission the chip asks for a click */
  (async()=>{try{const h=await loadH();if(h){DIR=h;ACC=await perm(h,false);if(ACC==="granted"){if(await pull())reloadSoon();else if(Object.keys(SY.dirty).length)flush();}}}catch(e){ERR=e.message||String(e);}show();})();
  window.MWS_SYNC={status:()=>({text:status()[1],linked:!!DIR,folder:DIR?DIR.name:"",access:ACC,dirty:Object.keys(SY.dirty),conflicts:SY.conflicts.length}),
    linked:()=>!!DIR&&ACC==="granted",folder:()=>DIR?DIR.name:"",flush,pull,poll,dlg,_sy:()=>SY};
})();
MWS.sync=window.MWS_SYNC;
