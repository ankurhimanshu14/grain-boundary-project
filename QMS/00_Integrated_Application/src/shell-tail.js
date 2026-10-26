/* ---------- shell: Overview page (after every module) ---------- */
function renderHome(){
  if(MWS.app!=="home")return;
  const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  const sp=MWS.spec?MWS.spec.stats():null;
  const dbs={on:"Shared · live",local:"Local · this browser",error:"Store error"};
  const tc=MWS.tc?MWS.tc.stats():null,og=MWS.org?MWS.org.stats():null,sc=MWS.scada?MWS.scada.stats():null,aq=MWS.apqp?MWS.apqp.stats():null,tr=MWS.trend?MWS.trend.stats():null,qm=MWS.quench?MWS.quench.stats():null,pv=MWS.valid?MWS.valid.stats():null,st=document.getElementById("dbstate"),any=og||sp||tc;if(st)st.textContent=any?(dbs[any.db]||"Connecting…"):"—";
  const tile=(k,v,c,h)=>`<a class="tile" href="${h}"><div class="k">${esc(k)}</div><div class="v ${c||""}">${esc(v)}</div></a>`;
  const specCard=sp?`<section class="panel"><div class="row between"><h2>Process specifications</h2><a class="pill ${sp.cls}" href="#spec/review">HTSA 1.6 · ${esc(sp.label)}</a></div>
    <p class="muted">${esc(MWS.spec.summary())}</p>
    <div class="tiles">${tile("In force",sp.inForce,"","#spec/specs")}${tile("Drafts awaiting approval",sp.drafts,sp.drafts?"warn":"ok","#spec/specs")}${tile("Reviews overdue",sp.over,sp.over?"bad":"ok","#spec/review")}${tile("Reviews due soon",sp.soon,sp.soon?"warn":"ok","#spec/review")}${tile("Implementation late",sp.implLate,sp.implLate?"bad":"ok","#spec/line")}${tile("Active parts without a spec",sp.noSpec??"—",sp.noSpec?"bad":"ok","#spec/review")}</div>
    <p class="row"><a class="btn pri" href="#spec/dash">Open Process specifications</a><a class="btn" href="#spec/specs">Register</a><a class="btn" href="#spec/line">At the line</a></p></section>`:"";
  const orgCard=og?`<section class="panel"><div class="row between"><h2>Heat treat organization</h2><a class="pill ${og.cls}" href="#org/review">HTSA 1.1 · ${esc(og.label)}</a></div>
    <p class="muted">${esc(MWS.org.summary())}</p>
    <div class="tiles">${tile("Heat treat person",og.person||"Vacant",og.person?(og.qualified?"ok":"bad"):"bad","#org/review")}${tile("Heat treat experience",og.person?(Math.round(og.ht*10)/10)+" yr":"—","","#org/people")}${tile("Deputy",og.deputy||"None",og.deputy?"ok":"warn","#org/chart")}${tile("Organization chart",og.chart?"Rev "+og.chart:"Not approved",og.chartOk?"ok":"warn","#org/chart")}${tile("HTSA 1.1 items not met",og.crit,og.crit?"bad":"ok","#org/review")}</div>
    <p class="row"><a class="btn pri" href="#org/dash">Open HT organization</a><a class="btn" href="#org/chart">Organization chart</a><a class="btn" href="#org/people">People</a></p></section>`:"";
  const aqCard=aq?`<section class="panel"><div class="row between"><h2>Advanced quality planning</h2><a class="pill ${aq.cls}" href="#apqp/review">HTSA 1.2 · ${esc(aq.label)}</a></div>
    <p class="muted">${esc(MWS.apqp.summary())}</p>
    <div class="tiles">${tile("Parts with an approved study",aq.covered+"/"+aq.parts,aq.parts&&aq.covered===aq.parts?"ok":"bad","#apqp/cover")}${tile("Without a study",aq.none,aq.none?"bad":"ok","#apqp/cover")}${tile("Studies in work",aq.drafts,aq.drafts?"warn":"ok","#apqp/studies")}${tile("Not feasible",aq.not,aq.not?"bad":"ok","#apqp/cover")}${tile("Planning open",aq.open,aq.late?"bad":aq.open?"warn":"ok","#apqp/outputs")}${tile("Released",aq.released,"","#apqp/outputs")}</div>
    <p class="row"><a class="btn pri" href="#apqp/dash">Open Quality planning</a><a class="btn" href="#apqp/studies">Feasibility studies</a><a class="btn" href="#apqp/cover">Parts coverage</a></p></section>`:"";
  const pvCard=pv?`<section class="panel"><div class="row between"><h2>Process validation</h2><a class="pill ${pv.cls}" href="#valid/review">HTSA 1.7 · ${esc(pv.label)}</a></div>
    <p class="muted">${esc(MWS.valid.summary())}</p>
    <div class="tiles">${tile("Process lines validated",pv.ok+"/"+pv.lines,pv.lines&&pv.ok===pv.lines?"ok":"bad","#valid/proc")}${tile("Never / not validated",pv.never,pv.never?"bad":"ok","#valid/proc")}${tile("Revalidation due",pv.reval,pv.revalLate?"bad":pv.reval?"warn":"ok","#valid/act")}${tile("Changes to assess",pv.unass,pv.unass?"warn":"ok","#valid/changes")}${tile("Validations in work",pv.drafts,pv.drafts?"warn":"ok","#valid/vals")}${tile("Procedure",pv.procOk?"Approved":"Not approved",pv.procOk?"ok":"bad","#valid/proc")}</div>
    <p class="row"><a class="btn pri" href="#valid/dash">Open Process validation</a><a class="btn" href="#valid/vals">Validations</a><a class="btn" href="#valid/changes">Equipment changes</a></p></section>`:"";
  const trCard=tr?`<section class="panel"><div class="row between"><h2>Trend analysis</h2><a class="pill ${tr.cls}" href="#trend/review">HTSA 1.8 · ${esc(tr.label)}</a></div>
    <p class="muted">${esc(MWS.trend.summary())}</p>
    <div class="tiles">${tile("Parameters analysed",tr.params,tr.params?"":"bad","#trend/plan")}${tile("Signals to review",tr.signals,tr.outSpec?"bad":tr.signals?"warn":"ok","#trend/signals")}${tile("Outside the specification",tr.outSpec,tr.outSpec?"bad":"ok","#trend/signals")}${tile("Chart reviews due",tr.reviewsDue,tr.reviewsDue?"warn":"ok","#trend/signals")}${tile("Actions open",tr.actionsOpen,tr.actionsLate?"bad":tr.actionsOpen?"warn":"ok","#trend/act")}${tile("Analysis plan",tr.planRev!=null?"Rev "+tr.planRev:"Not approved",tr.planOk?"ok":"warn","#trend/plan")}</div>
    <p class="row"><a class="btn pri" href="#trend/dash">Open Trend analysis</a><a class="btn" href="#trend/charts">Charts</a><a class="btn" href="#trend/plan">Analysis plan</a></p></section>`:"";
  const scCard=sc?`<section class="panel"><div class="row between"><h2>SCADA temperature review</h2><a class="pill ${sc.cls}" href="#scada/htsa">HTSA 1.9 · ${esc(sc.label)}</a></div>
    <p class="muted">${esc(MWS.scada.summary())}</p>
    <div class="tiles">${tile("Chambers reviewed within 24 h",sc.ok+"/"+sc.chambers,sc.ok===sc.chambers?"ok":"bad","#scada/htsa")}${tile("Never reviewed",sc.never,sc.never?"bad":"ok","#scada/dash")}${tile("Overdue",sc.overdue,sc.overdue?"bad":"ok","#scada/dash")}${tile("Reactions open",sc.open,sc.open?"warn":"ok","#scada/act")}${tile("Reviews recorded",sc.reviews,"","#scada/reviews")}</div>
    <p class="row"><a class="btn pri" href="#scada/load">Load a SCADA record</a><a class="btn" href="#scada/reviews">Reviews</a><a class="btn" href="#scada/hist">History</a></p></section>`:"";
  const qmCard=qm?`<section class="panel"><div class="row between"><h2>Quench media analysis</h2><a class="pill ${qm.cls}" href="#quench/review">HTSA 3.14 · ${esc(qm.label)}</a></div>
    <p class="muted">${esc(MWS.quench.summary())}</p>
    <div class="tiles">${tile("Tanks in order",qm.ok+"/"+qm.tanks,qm.tanks&&qm.ok===qm.tanks?"ok":"bad","#quench/tanks")}${tile("Tests overdue / never",qm.overdue,qm.overdue?"bad":"ok","#quench/sched")}${tile("Out of limits",qm.out,qm.out?"bad":"ok","#quench/act")}${tile("Results to review",qm.reviews,qm.reviewsLate?"bad":qm.reviews?"warn":"ok","#quench/act")}${tile("Reactions open",qm.open,qm.open?"warn":"ok","#quench/act")}${tile("Test plan",qm.planRev!=null?"Rev "+qm.planRev:"Not approved",qm.planOk?"ok":"warn","#quench/plan")}</div>
    <p class="row"><a class="btn pri" href="#quench/dash">Open Quench media</a><a class="btn" href="#quench/tests">Test records</a><a class="btn" href="#quench/plan">Test plan</a></p></section>`:"";
  const tcCard=tc?`<section class="panel"><div class="row between"><h2>Thermocouples &amp; protection tubes</h2><a class="pill ${tc.cls}" href="#tc/review">HTSA 3.3 · ${esc(tc.label)}</a></div>
    <p class="muted">${esc(MWS.tc.summary())}</p>
    <div class="tiles">${tile("In use",tc.inUse,"","#tc/tcs")}${tile("SAT overdue / none",tc.satOver,tc.satOver?"bad":"ok","#tc/review")}${tile("SAT failed",tc.satFail,tc.satFail?"bad":"ok","#tc/act")}${tile("SAT due soon",tc.satSoon,tc.satSoon?"warn":"ok","#tc/review")}${tile("Calibration issues",tc.calBad,tc.calBad?"bad":"ok","#tc/tcs")}${tile("Tubes overdue / to replace",tc.tubeBad,tc.tubeBad?"bad":"ok","#tc/tube")}</div>
    <p class="row"><a class="btn pri" href="#tc/dash">Open Thermocouples</a><a class="btn" href="#tc/sat">SAT records</a><a class="btn" href="#tc/tube">Tube checks</a></p></section>`:"";
  document.getElementById("main").innerHTML=`
  <section class="panel"><h2>Heat treat quality system</h2>
    <p class="muted">One application for the CQI-9 heat treat system of the plant. Each module keeps its own records and follows its procedure; the Overview collects their status. This build holds Heat treat organization (HTSA 1.1, MWSPL-QP-ORG-01), Advanced quality planning (HTSA 1.2, MWSPL-QP-APQP-01), Process specifications (HTSA 1.6, MWSPL-QP-SPEC-01), Process validation (HTSA 1.7, MWSPL-QP-PV-01), Trend analysis (HTSA 1.8, MWSPL-QP-TREND-01), SCADA temperature review (HTSA 1.9, MWSPL-QP-SCADA-01), Quench media analysis (HTSA 3.14, MWSPL-QP-QM-01) and Thermocouples &amp; protection tubes (HTSA 3.3, MWSPL-QP-TC-01); the other modules of the CALOR register follow in the same form.</p>
    <div class="grid3">
      <div><b>Furnaces</b><p class="small">F-01 … F-04, continuous gas-fired pushers, identical; hardening chamber 13 trays (5/4/4), controlled cooling chamber, tempering chamber 12 trays (4/4/4).</p></div>
      <div><b>Processes</b><p class="small">F-01 isothermal annealing, hardening &amp; tempering (water quench) · F-02 isothermal annealing, normalizing, hardening &amp; tempering (oil quench) · F-03, F-04 isothermal annealing, normalizing.</p></div>
      <div><b>Line</b><p class="small">Time through the line = 13 × push + 18 min transfer + 12 × push · HK trays max. 200 kg · every lot shot blasted.</p></div>
    </div></section>
  ${orgCard}
  ${aqCard}
  ${specCard}
  ${pvCard}
  ${trCard}
  ${scCard}
  ${qmCard}
  ${tcCard}
  ${MWS.calor?MWS.calor.panel(null,"Each module's Data tab imports what it needs from it."):""}
  <section class="panel"><h2>How the modules connect</h2>
    <p class="small muted">Advanced quality planning comes first: every part (or part family) has an internally approved feasibility study before it is run, approved by the people the HT organization module authorizes, and is released once its planning outputs exist, including the process specification in force. Process specifications are the controlled recipes. Production, load build, the SCADA review, hardness testing and the control plan read the revision in force; the HT organization module names who may approve them (holder and deputy of the heat treat position and of positions marked authorized), and the Specifications approval gate uses that list. Until the other modules join this application, the Specifications module reads their CALOR records in this browser (authorized names, parts produced in the last 90 days) when they exist. The Thermocouples module holds the elements behind every SCADA zone reading (TC-01 … TC-06 per chamber, odd = right wall, even = left wall): their calibration, SAT and protection tubes; it can take over the CALOR SAT register of this browser. The SCADA review analyses those readings against the set values, takes its tolerances from the specifications in force and the SAT status from the Thermocouples module, and accepts as reviewers the people the HT organization module shows as qualified (HTSA 1.9).</p></section>`;
}
shellRoute();
