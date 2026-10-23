/* ---------- shell: Overview page (after every module) ---------- */
function renderHome(){
  if(MWS.app!=="home")return;
  const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  const sp=MWS.spec?MWS.spec.stats():null;
  const dbs={on:"Shared · live",local:"Local · this browser",error:"Store error"};
  const tc=MWS.tc?MWS.tc.stats():null,og=MWS.org?MWS.org.stats():null,sc=MWS.scada?MWS.scada.stats():null,st=document.getElementById("dbstate"),any=og||sp||tc;if(st)st.textContent=any?(dbs[any.db]||"Connecting…"):"—";
  const tile=(k,v,c,h)=>`<a class="tile" href="${h}"><div class="k">${esc(k)}</div><div class="v ${c||""}">${esc(v)}</div></a>`;
  const specCard=sp?`<section class="panel"><div class="row between"><h2>Process specifications</h2><a class="pill ${sp.cls}" href="#spec/review">HTSA 1.6 · ${esc(sp.label)}</a></div>
    <p class="muted">${esc(MWS.spec.summary())}</p>
    <div class="tiles">${tile("In force",sp.inForce,"","#spec/specs")}${tile("Drafts awaiting approval",sp.drafts,sp.drafts?"warn":"ok","#spec/specs")}${tile("Reviews overdue",sp.over,sp.over?"bad":"ok","#spec/review")}${tile("Reviews due soon",sp.soon,sp.soon?"warn":"ok","#spec/review")}${tile("Implementation late",sp.implLate,sp.implLate?"bad":"ok","#spec/line")}${tile("Active parts without a spec",sp.noSpec??"—",sp.noSpec?"bad":"ok","#spec/review")}</div>
    <p class="row"><a class="btn pri" href="#spec/dash">Open Process specifications</a><a class="btn" href="#spec/specs">Register</a><a class="btn" href="#spec/line">At the line</a></p></section>`:"";
  const orgCard=og?`<section class="panel"><div class="row between"><h2>Heat treat organization</h2><a class="pill ${og.cls}" href="#org/review">HTSA 1.1 · ${esc(og.label)}</a></div>
    <p class="muted">${esc(MWS.org.summary())}</p>
    <div class="tiles">${tile("Heat treat person",og.person||"Vacant",og.person?(og.qualified?"ok":"bad"):"bad","#org/review")}${tile("Heat treat experience",og.person?(Math.round(og.ht*10)/10)+" yr":"—","","#org/people")}${tile("Deputy",og.deputy||"None",og.deputy?"ok":"warn","#org/chart")}${tile("Organization chart",og.chart?"Rev "+og.chart:"Not approved",og.chartOk?"ok":"warn","#org/chart")}${tile("HTSA 1.1 items not met",og.crit,og.crit?"bad":"ok","#org/review")}</div>
    <p class="row"><a class="btn pri" href="#org/dash">Open HT organization</a><a class="btn" href="#org/chart">Organization chart</a><a class="btn" href="#org/people">People</a></p></section>`:"";
  const scCard=sc?`<section class="panel"><div class="row between"><h2>SCADA temperature review</h2><a class="pill ${sc.cls}" href="#scada/htsa">HTSA 1.9 · ${esc(sc.label)}</a></div>
    <p class="muted">${esc(MWS.scada.summary())}</p>
    <div class="tiles">${tile("Chambers reviewed within 24 h",sc.ok+"/"+sc.chambers,sc.ok===sc.chambers?"ok":"bad","#scada/htsa")}${tile("Never reviewed",sc.never,sc.never?"bad":"ok","#scada/dash")}${tile("Overdue",sc.overdue,sc.overdue?"bad":"ok","#scada/dash")}${tile("Reactions open",sc.open,sc.open?"warn":"ok","#scada/act")}${tile("Reviews recorded",sc.reviews,"","#scada/reviews")}</div>
    <p class="row"><a class="btn pri" href="#scada/load">Load a SCADA record</a><a class="btn" href="#scada/reviews">Reviews</a><a class="btn" href="#scada/hist">History</a></p></section>`:"";
  const tcCard=tc?`<section class="panel"><div class="row between"><h2>Thermocouples &amp; protection tubes</h2><a class="pill ${tc.cls}" href="#tc/review">HTSA 3.3 · ${esc(tc.label)}</a></div>
    <p class="muted">${esc(MWS.tc.summary())}</p>
    <div class="tiles">${tile("In use",tc.inUse,"","#tc/tcs")}${tile("SAT overdue / none",tc.satOver,tc.satOver?"bad":"ok","#tc/review")}${tile("SAT failed",tc.satFail,tc.satFail?"bad":"ok","#tc/act")}${tile("SAT due soon",tc.satSoon,tc.satSoon?"warn":"ok","#tc/review")}${tile("Calibration issues",tc.calBad,tc.calBad?"bad":"ok","#tc/tcs")}${tile("Tubes overdue / to replace",tc.tubeBad,tc.tubeBad?"bad":"ok","#tc/tube")}</div>
    <p class="row"><a class="btn pri" href="#tc/dash">Open Thermocouples</a><a class="btn" href="#tc/sat">SAT records</a><a class="btn" href="#tc/tube">Tube checks</a></p></section>`:"";
  document.getElementById("main").innerHTML=`
  <section class="panel"><h2>Heat treat quality system</h2>
    <p class="muted">One application for the CQI-9 heat treat system of the plant. Each module keeps its own records and follows its procedure; the Overview collects their status. This build holds Heat treat organization (HTSA 1.1, MWSPL-QP-ORG-01), Process specifications (HTSA 1.6, MWSPL-QP-SPEC-01), SCADA temperature review (HTSA 1.9, MWSPL-QP-SCADA-01) and Thermocouples &amp; protection tubes (HTSA 3.3, MWSPL-QP-TC-01); the other modules of the CALOR register follow in the same form.</p>
    <div class="grid3">
      <div><b>Furnaces</b><p class="small">F-01 … F-04, continuous gas-fired pushers, identical; hardening chamber 13 trays (5/4/4), controlled cooling chamber, tempering chamber 12 trays (4/4/4).</p></div>
      <div><b>Processes</b><p class="small">F-01 isothermal annealing, hardening &amp; tempering (water quench) · F-02 isothermal annealing, normalizing, hardening &amp; tempering (oil quench) · F-03, F-04 isothermal annealing, normalizing.</p></div>
      <div><b>Line</b><p class="small">Time through the line = 13 × push + 18 min transfer + 12 × push · HK trays max. 200 kg · every lot shot blasted.</p></div>
    </div></section>
  ${orgCard}
  ${specCard}
  ${scCard}
  ${tcCard}
  <section class="panel"><h2>How the modules connect</h2>
    <p class="small muted">Process specifications are the controlled recipes. Production, load build, the SCADA review, hardness testing and the control plan read the revision in force; the HT organization module names who may approve them (holder and deputy of the heat treat position and of positions marked authorized), and the Specifications approval gate uses that list. Until the other modules join this application, the Specifications module reads their CALOR records in this browser (authorized names, parts produced in the last 90 days) when they exist. The Thermocouples module holds the elements behind every SCADA zone reading (TC-01 … TC-06 per chamber, odd = right wall, even = left wall): their calibration, SAT and protection tubes; it can take over the CALOR SAT register of this browser. The SCADA review analyses those readings against the set values, takes its tolerances from the specifications in force and the SAT status from the Thermocouples module, and accepts as reviewers the people the HT organization module shows as qualified (HTSA 1.9).</p></section>`;
}
shellRoute();
