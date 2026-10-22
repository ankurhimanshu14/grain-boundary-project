# MWSPL — Mass Wire and Steels Pvt. Ltd., Bhiwadi

Everything known about the plant's heat treatment line, the decisions taken, and the CALOR application built for it: the CQI-9 (AIAG Special Process: Heat Treat System Assessment, 4th Edition) work done so far, how the application is organised, what is still open.

Status as of 19-Oct-2026. Repository `ankurhimanshu14/grain-boundary-project`, branch `claude/epic-faraday-3ddvgo`.

> Values marked *(to confirm)* are typical or default values used in the application, not quoted from the controlled CQI-9 copy or a customer-specific requirement. Check them against the controlled copy before they go into a released document.

---

## 1. The company and the line

| Item | Detail |
|---|---|
| Company | Mass Wire and Steels Pvt. Ltd. (MWSPL), Bhiwadi |
| Heat treatment equipment | 4 continuous gas-fired **pusher furnaces**, F-01 … F-04, all **identical in structure and size** (confirmed). They differ only in the quench tank and in the process parameters set (temperatures, push time, durations). |
| Heating | **Direct-fired**, open chambers: products of combustion contact the parts, no protective atmosphere. Scaling and surface decarburization are expected, so decarburization is a checked characteristic. |
| Chambers per furnace | **Hardening chamber** (3 zones, **13 tray positions**, split 5 / 4 / 4) and **tempering chamber** (3 zones, **12 tray positions**, split 4 / 4 / 4) |
| Controlled cooling chamber | One-tray chamber between the two chambers, on **every furnace** (confirmed), used for isothermal annealing. It is not a line position: 13 + 1 + 12 = 26 trays right after a push. |
| Quench | **F-01: water quench tank; F-02: oil quench tank** (separate tanks). F-03 and F-04 have no quench tank. **Quench delay 30 s, dip time 8–9 min** (specification default 8.5 ± 0.5 min). Agitation is fitted but **not monitored** (no flow / agitation alarm). |
| After heat treatment | **Shot blasting after every process** (a trap point for mixed parts at every lot changeover). |
| Trays | **HK-grade** heat-resistant cast steel, **maximum load 200 kg** per tray. |
| Thermocouples | 6 control thermocouples per chamber, 2 per zone, **type K**, named **TC-01 … TC-06**. TC-01 / TC-02 = zone 1, TC-03 / TC-04 = zone 2, TC-05 / TC-06 = zone 3. **Odd-numbered = right wall, even-numbered = left wall.** |
| Control and recording | PID control per zone; temperatures recorded by **SCADA**. The SCADA export is an Excel file: `Date, Time, SET-1 / PV-1 … SET-6 / PV-6`, one file per furnace chamber and day (real example in `sample_data/furnace4_2026-09-29.xlsx`). The chart heading names the furnace and chamber (e.g. "FURNACE-4 HARDENING"; "TEMPRING" misspelling accepted). |
| Valid temperature range | 500–1000 °C (values outside are excluded and reported, never drawn). Default tolerance ±10 °C. A set value of exactly 800 °C is treated as the lower class (preheating / tempering). |

### 1.1 How a tray moves (confirmed by the user)

At every push:

1. The extractor takes the 13th tray out of the hardening chamber.
2. A new tray is pushed in.
3. At the same time the 26th tray leaves the tempering chamber.

**Measured and confirmed** with a push time of 9 min:

| Event | Time |
|---|---|
| Tray into the hardening chamber | 15-Oct 04:06 |
| Out of the hardening chamber (13 pushes) | 06:03 |
| Transfer hardening → tempering | **18 min** |
| Into the tempering chamber | 06:21 |
| Out of the tempering chamber (12 pushes) | 08:09 |

**Time through the line = 13 × push + transfer (18 min) + 12 × push.**

- The 18 min transfer is a fixed setting (`xfer`) on the Daily production and Specifications pages. It replaced an earlier wrong value of 11.
- **Isothermal annealing** uses its controlled cooling cycle instead of the transfer. The extracted tray goes on a rail into the cooling chamber and air is blown for the cooling time. It is then pushed into the tempering chamber, all within the same push cycle, so the cooling cycle (transfers + cooling) must end before the next push.

### 1.2 Processes run

Processes per furnace (confirmed; Specifications → Settings → "Processes per furnace", a specification cannot be approved for a furnace that does not run its process):

| Furnace | Processes | Quench |
|---|---|---|
| F-01 | Isothermal annealing; hardening & tempering | Water |
| F-02 | Isothermal annealing; normalizing; hardening & tempering | Oil |
| F-03 | Isothermal annealing; normalizing | — |
| F-04 | Isothermal annealing; normalizing | — |

| Code | Process | CQI-9 Process Table |
|---|---|---|
| HT | Hardening and tempering (oil quench) | Table A (quench is covered inside Table A) |
| IA | Isothermal annealing (controlled cooling, isothermal hold in the tempering chamber) | Table E |
| NORM | Normalizing (preheat 700–750 °C in the hardening chamber, austenitizing in the tempering chamber, optional fan cooling) | Table E |

Chamber roles change with the process (multi-role chambers). Each chamber's qualified temperature range is the span of every role it plays. Default TUS ranges are hardening 700–960 °C and tempering 500–900 °C, ±10 °C, 365 days *(to confirm)*.

### 1.3 Rules the user set

- **Production day:** 08:00 to 08:00. A tray counts in the production report of the day it **leaves the tempering chamber** (out at 08:10 → that day's report; out at 07:58 → the day before). The tray log stays with the day it was loaded.
- **"On hold" on the production report means the push cycle was paused**, not a quality hold of trays. The push timer stops during a hold.
- **"N/A" means "Not available".** It counts as an entry but is never an identity: no matching, duplicate check or grouping on it (batch, heat, part).
- **HTSA 1.1 certificates are not mandatory.** Education and experience count as entered; a certificate / letter reference is optional.
- **Experience in this organization counts:** service since the joining date is heat treat experience unless the person's work here isn't heat treat work.
- **SCADA review:** only the top-priority issues (P0 product and A, the vital few) become review actions. Lower priorities are listed but not taken for action. Problems are solved with 8D inside the PDCA review.
- **The push interval is not used in the SCADA review** to count affected trays. Affected product is expressed as time windows plus the zone's tray positions, and the production page's recorded batch times are used for the trace.
- **M1 (record store, `SCADA_Review_2_M1.html`)** is out of scope here. It will be migrated to a new project later; don't touch it.

### 1.4 Equipment gaps recorded honestly

These are typical of this kind of line. The Equipment page asks for each one per chamber.

- Over-temperature protection may ride on the control loop, not an independent sensor and controller.
- Recording comes from the control thermocouples (SCADA), not an independent sensor. This limits the instrumentation type, and a SAT checks control and recording together.
- No production load thermocouples, so TUS plus hardness / metallurgy carry the assurance.
- Open direct-fired chambers: decarburization must be a checked characteristic. Atmosphere items are N/A.
- Unmonitored timed steps (quench delay, controlled cooling, fan cooling) are controlled by time / parameters, validation and routine hardness checks.
- **Quench agitation is not monitored** (F-01, F-02): there is no flow or agitation alarm, so the daily visual check ("agitation / circulation working" in the quench test plan) is the only control. Consider a flow switch or a motor-running signal into SCADA.

---

## 2. CALOR — the application

**CALOR** is the plant's heat treatment quality application ("Heat treatment monitoring and pyrometry"). It is a single HTML file, `CALOR.html`, that runs in a browser from the disk with no server. It was formerly called the "Heat Treat Quality Suite".

- **Look:** the MWS MSA Manager style. The company line sits over the CALOR heading, with a document-control strip (standard, scope, records, date). The navigation bar has dropdown menus that open on hover, a Dashboard (Home), and Data and Theme buttons.
- **Data:** everything is saved in the browser's local storage on that computer (per browser). In Chrome / Edge, all `file://` pages share one storage, so CALOR and the separate page files see the same data. Use **Data → Download backup** to move or keep data, and **Restore from backup** elsewhere. The Data dialog also resets settings or deletes data per tab, and can clear everything.
- **Google Drive folder (optional):** Data → Google Drive folder → *Link a Google Drive folder…* makes CALOR keep its data as JSON files (one per register, e.g. `prod-reg.json`) in a Drive folder synced to the PC by **Google Drive for Desktop** (Chrome / Edge). Changes are written about 1.5 s later; other PCs linked to the same folder pick them up within a minute. The browser copy stays as the working copy, so CALOR works when the folder cannot be reached and catches up later. The folder also gets `calor-manifest.json`, `backup/` (one full backup per day, 30 kept) and `conflicts/` (a PC's own changes when two PCs changed the same register at once: the other PC's version wins, nothing is merged). The header chip shows the state (saved / saving / waiting / conflict). View and theme choices stay per PC.
- **Examples:** every page has "Load example data" under Settings. Example data is marked "(example)".
- **Generated file:** `CALOR.html` is built. Never edit it; edit the page files or `suite/shell.html`, then run `python suite/build.py`. Every page also works on its own as a standalone file.

### 2.1 Menus and pages

| Group | Tab | File | What it does | HTSA |
|---|---|---|---|---|
| — | Dashboard | `suite/shell.html` | Furnace cards (SAT, TUS, equipment, quench, production, data review, lot changeovers, trays / fixtures), KPIs, HTSA self-assessment tile, "Needs attention" list | — |
| MANAGEMENT | HT organization | `Organization_Personnel.html` | Heat treat person, organization chart, job descriptions, people's qualification, specification authorization, **key functions with primary / backup**, HTSA self-assessment panel | 1.1, 1.17 (1.6 link) |
| MANAGEMENT | Procedures & WIs | `Work_Instructions.html` | Controlled procedures / WIs per topic and furnace, points of use, availability checks, employees and training | 1.15 |
| MANAGEMENT | Data review | `Monitoring_Review.html` | Second-level review of the furnace data every 24 h by qualified reviewers, detection and reaction | 1.9 |
| PRODUCTION | Daily production | `Production_Report.html` | Tray-first production entry, timing, batches, holds, parameter changes, rework trays | — |
| PRODUCTION | Load build | `Load_Build_Fixturing.html` | Loading standards, load checks, trays / fixtures register, inspections, life | — |
| PRODUCTION | Trap points | `Trap_Points.html` | Trap point register (procedure), lot changeover checks | 2.5 |
| PROCESS | Specifications | `Process_Specifications.html` | Process specifications (recipes) per part, document control, steps with tolerances, job card | 1.6 |
| PROCESS | SCADA review | `SCADA_Review_2.html` | SCADA temperature analysis, PDCA review, 8D | — |
| PROCESS | Alarms | `Furnace_Operations.html` | Start-up / shutdown / alarm log and response, checklists, alarm matrix | — |
| PROCESS | Quench media | `Quench_Media_Testing.html` | Quench tanks, test plan, results, reaction plans | — |
| QUALITY | Hardness | `Hardness_Metallurgical_Testing.html` | Hardness / metallurgical tests per batch, tester calibration and verification | — |
| QUALITY | Rework | `Rework_Reprocessing.html` | Rework procedure (PPAP), rework log, process control sheet, sampling, release | 1.11 |
| QUALITY | CP & PFMEA | `Control_Plan_PFMEA.html` | PFMEA (AIAG & VDA 2019, Action Priority) and control plans | — |
| QUALITY | Trend analysis | `Trend_Analysis.html` | Analysis plan, individuals charts, signals, reviews | 1.8 |
| PYROMETRY | SAT | `Thermocouple_SAT_PDCA.html` | System accuracy tests through PDCA, thermocouple register, replacements, annual life | — |
| PYROMETRY | TUS | `Temperature_Uniformity_Survey.html` | Qualified ranges, surveys, reaction plans | — |
| PYROMETRY | Equipment | `Equipment_Qualification.html` | Furnace survey and qualification per chamber, class, instrumentation type, gaps, changes | — |

The pages talk to each other in CALOR. A few examples:
- SCADA records link to the SAT register, TUS, production batches and alarms.
- The specifications feed hardness requirements, production and control plans.
- Production rework trays are checked against the rework log.

### 2.2 Older files (not current)

- `Pusher_Furnace_SCADA_Review.html` is the earlier SCADA review, kept standalone and replaced in CALOR by `SCADA_Review_2.html`.
- `furnace_analyzer.html` (built from `standalone/`) and the Python / Streamlit app (`app.py`, `cqi9/`, `run_report.py`, `tests/`) are older, simpler versions. `README.md` describes only these.

---

## 3. CQI-9 HTSA — what is implemented

The HT organization page's "HTSA self-assessment" panel and the Home tile show the score of each implemented question: Satisfactory / Not satisfactory / Needs immediate action. Each page has its own requirement text, assessment table, evidence PDF and Excel export.

| Question | Requirement (short) | Where | How CALOR shows the evidence |
|---|---|---|---|
| **1.1** | Dedicated and qualified heat treat person on site | HT organization | HT position (dedicated, full-time, on site), organization chart approved, job description with education / knowledge / minimum years, holder qualified (≥ 5 years HT experience, or education + experience *(to confirm)*), deputy. Experience in this organization counts; certificates optional. |
| **1.6** | Documented system to create process specifications for all active processes | Specifications | Authorized approvers (HT person, deputy, positions marked), every active part / furnace with a spec in force, steps with operating tolerances, form at the line (job card), change review, implementation date, periodic review. |
| **1.8** | Collect, analyse and react to data over time | Trend analysis | Approved analysis plan (product and process parameters); data from hardness, SCADA day summaries, quench, SAT, alarms, rework or entered; individuals charts with control and specification limits and run rules; dated reviews with action / watch / no action. |
| **1.9** | Monitoring system reviewed by qualified personnel at least every 24 h | Data review | Qualified reviewers; documented review per furnace of every monitoring system (SCADA data, alarms, combustion, quench, push cycle, operator log); conditions found in CALOR (alarms, SCADA days out of tolerance, quench results, push-cycle holds) acknowledged; documented reactions with product disposition; gaps over 24 h flagged. |
| **1.11** | Documented procedure for rework / reprocessing | Rework (+ CP & PFMEA) | Procedure under document control with PPAP approval: characteristics allowed / not permissible, approved methods with parameter change and a limit per lot, process control sheet, log, sampling plan, release by the QM or a designee, OEM / customer notification. Rework log gated by the procedure. Production rework trays checked against the log. Control plan rows and PFMEA failure chains name the procedure in force. |
| **1.15** | Procedures / work instructions available to heat treat personnel | Procedures & WIs | Required topics per furnace (operation, start-up, shut-down, power failure) and site (segregation, inspection); approved and reviewed; copies at the points of use checked; every employee trained on the revision in force, in a language they read. |
| **1.17** | Key management and supervisory functions performed by qualified personnel | HT organization | Key functions marked on positions, primary (holder) and backup (deputy) named, each qualified (job-description minimum years or a recorded confirmation), key function list issued with where it is available. Qualified key-function people count as qualified data reviewers (1.9). |
| **2.5** | Trap points identified and monitored at every lot changeover | Trap points | Approved trap point register per area / process / furnace; changeovers found from the production trays; a check per changeover with parts found / piece count reconciled; reactions. |

**Pyrometry and process control** have no single HTSA number here, but their evidence is on these pages:
- **SAT:** PDCA, failed SAT reaction plans, thermocouple replacements, annual element life.
- **TUS:** both ends of each qualified range.
- **Equipment qualification:** class achieved vs. required, instrumentation type supported by the hardware, gaps.
- **Quench media tests, hardness / metallurgical tests, the alarm response log, load build and fixtures, and control plans / PFMEA.**

### 3.1 Not yet implemented in CALOR

Of section 1 (1.1–1.20), the questions not yet built include 1.2–1.5, 1.7, 1.10, 1.12–1.14, 1.16 and 1.18–1.20. Section 2 has everything except 2.5, section 3 (equipment, pyrometry 3.1–3.6) has no HTSA questionnaire yet (only the pages above), and there is no Job Audit section (4.1–4.17). Several are already partly evidenced by existing pages (e.g. control plans / PFMEA, internal assessments, calibration). Each new question gets a row in the HT organization HTSA panel and the Home tile.

---

## 4. Default content flagged to confirm

The application fills in typical content for this line. It is marked "example" or "to adapt", and the defaults include:

- **HTSA 1.1:** minimum years 5.
- **SAT / TUS / instrumentation:** furnace classes 1–6 (±3 … ±28 °C) and instrumentation types A–E, each with SAT / TUS intervals; SAT tolerance and warning band; test thermocouple limits; annual (365 days) control-TC replacement.
- **Quench and alarms:** the quench test plan limits (oil temperature 50–80 °C etc.), the alarm matrix and its response times.
- **Typical documents and registers:**
  - the ten typical procedures / WIs (WI-HT-01 … WI-HT-10);
  - the trap points of the line;
  - the rework procedure SOP-QA-12 (allowed: re-temper, re-harden and temper, re-normalize / re-anneal; not permissible: cracks, decarburization beyond the limit, overheating / grain growth, distortion);
  - the default PFMEA failure chains and their S / O / D ratings.
- **Site rules (day intervals):** review periods, grace periods, look-back windows.

---

## 5. Documents produced

| Document | File | Status |
|---|---|---|
| WI-HT-01 General operating procedure for all pusher furnaces (title block, purpose, scope, safety, 45 steps in phases A–I with key points, revisions, signatures; same structure as the Procedures & WIs page) | `documents/WI-HT-01_General_Operating_Procedure.docx` | Draft, to adapt and approve |
| F-HT-02A furnace start-up checksheet and F-HT-03A shutdown checksheet (Excel: check items per furnace with critical items, soak and first-off timing, zone readings vs tolerance, product left inside, calculated result, sign-off; filled examples for F-02) | `documents/Furnace_Startup_Shutdown_Checksheet.xlsx` | Draft, to confirm against the furnace manual |
| F-MT-01 daily predictive maintenance checksheet and F-MT-02 monthly trend (Excel: 28 condition parameters with normal value and watch / act limits on one Parameters sheet, daily status OK / WATCH / ACT, monthly trend with slope and estimated days to the action limit; examples for F-02) | `documents/Furnace_Predictive_Maintenance_Checksheet.xlsx` | Draft: limits are typical, set them from 2–4 weeks of baseline readings and the equipment manuals |
| SOP-HT-11 Emergency response for the heat treat line (HTSA 1.15 emergencies: general rules, quick reference card, contacts, EI-HT-04 power failure, -05 gas / flame failure / leak, -06 fire, -07 quench failure, -08 air blower / exhaust fan, -09 controlled cooling, -10 pusher / transfer jam, -11 control / SCADA / thermocouple, -12 over-temperature trip; product disposition per tray position, restart conditions, drills, records) | `documents/SOP-HT-11_Emergency_Response.docx` | Draft, to confirm against the manuals, gas safety rules and site emergency plan |
| WI-HT-02 Furnace start-up (types of start-up, 37 steps in phases A–H: preparation, checks before ignition, purge and ignition, heat-up, quench / controlled cooling per furnace, set values and soak, first trays and first-off test, records; matches checksheet F-HT-02A) | `documents/WI-HT-02_Furnace_Start-up.docx` | Draft, to confirm against the furnace / burner manuals |
| WI-HT-03 Furnace shut-down (types of shut-down, 30 steps in phases A–G: plan, run the line out with 25 empty trays, quench / controlled cooling, burners off or hot standby, make safe / lock-out, hearth check for fallen parts when cool, records; matches checksheet F-HT-03A) | `documents/WI-HT-03_Furnace_Shut-down.docx` | Draft, to confirm against the furnace / burner manuals |
| SOP-HT-08 Segregation of suspect and nonconforming product (HTSA 1.15 / 2.8: tag colours and areas, when product is suspect (per event on this line), 23 steps: recognise, identify, segregate incl. shot blasting, contain, evaluate, disposition by HT / Quality Manager, release from quarantine; HOLD tag layout and quarantine register) | `documents/SOP-HT-08_Product_Segregation.docx` | Draft, to confirm against the QMS nonconforming output procedure |
| Process specification, job card, controlled procedure, rework process control sheet, key function list, HTSA evidence packs, control plan / PFMEA, SAT / TUS / quench / hardness records | Generated from CALOR (PDF / Excel buttons on each page) | As recorded |

---

## 6. Open points and next steps

1. **Data entry** of real data: positions and people, key functions with backups, specifications per part, reviewers, procedures, trap points, the rework procedure and its PPAP approval, tanks, thermocouples.
2. **Approve new revisions** of the existing control plans (regenerate rows) and PFMEAs ("Add the rework failure chains"), so they name the rework procedure in force (needed for 1.11).
3. **Confirm the flagged values** (section 4) against the controlled CQI-9 4th Edition copy and the customer-specific requirements.
4. **Equipment gaps** (section 1.4): decide the actions (independent over-temperature protection, independent recording, load thermocouples) on the Equipment page.
5. **Remaining HTSA questions** (section 3.1), the Job Audit, and a master document register with an HTSA / Process-Table coverage matrix.
6. **M1 record store:** migrate to a new project later (out of scope here).
7. **Back up** the data: link a Google Drive folder (daily backups are then written to `backup/` in it), or download a backup regularly (Data → Download backup). Without a linked folder, records exist only in the browser where they were entered.

---

## 7. For maintainers

- **Build CALOR:** `python suite/build.py`, after any change to a page file or `suite/shell.html`. The build inserts `suite/calor-theme.css` into each page.
- **Bridge between pages:** `HTQ.provide / api / on / emit / go`; each page works standalone when `HTQ` is null.
- **Storage keys** per page (e.g. `org-reg`, `wi-reg`, `mrv-reg`, `prod-reg`, `lbf-reg`, `trp-reg`, `psr-reg`, `sr2-*`, `fop-reg`, `qmt-reg`, `hmt-reg`, `rwk-reg`, `cpf-reg`, `tra-reg`, `tsat-pdca`, `tus-reg`, `eqq-reg`) are listed in `KEYS` / `MODS` in `suite/shell.html`. A new key must be added there.
- **Testing:** headless Chromium with Playwright. Open the file via `file://`, click `#b-example`, drive the dialogs and read the page's `window.__XXX` object. There is no automated test suite for the HTML apps.
- **Full technical description** of every page, its data model and test hooks: `CLAUDE.md`.
