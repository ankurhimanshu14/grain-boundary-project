# MASS WIRE AND STEELS PVT. LTD., BHIWADI

# MWSPL CQI-9 Heat Treat System (CALOR): Master Handover

**Project:** AIAG CQI-9 4th Edition (Special Process: Heat Treat System Assessment) system for the heat treatment shop of Mass Wire and Steels Pvt. Ltd., Bhiwadi: the CALOR application and its controlled documents
**Last updated:** 22-Oct-2026
**Replaces:** none. `MWSPL.md` (plant facts and status) and `CLAUDE.md` (technical description of every CALOR page) stay as the detailed references. This note is the master that points to them.

**How to use this note:** read Sections 2, 3 and 9 before building anything. Check Section 4 before numbering any document. Update Sections 6, 9 and 11 at the end of every session.

## Contents
1. Project context and workspaces
2. Locked business facts and decisions
3. Assumptions still to be confirmed
4. Document types and numbering
5. House style for documents
6. Status: what has been built
7. Process model, KPIs and management review inputs
8. Application (CALOR)
9. Mistakes made and lessons learned
10. Known issues and blockers
11. Open items and next steps
12. Request history

Part 2 (at the end) applies the module document set template to CALOR.

---

## 1. Project context and workspaces

- **Sources supplied:**
  - one real SCADA export, `sample_data/furnace4_2026-09-29.xlsx` (`Date, Time, SET-1/PV-1 … SET-6/PV-6`);
  - the CQI-9 HTSA requirement texts typed by the user (1.1, 1.6, 1.8, 1.9, 1.11, 1.15, 1.17, 2.5);
  - the user's measured line timing (15-Oct, push 9 min);
  - the user's "MWS MSA Manager" look for the application;
  - this template (`QMS_Project_Template.md`, derived from the MWSPL IATF 16949 project).
- **Not supplied (all values depending on them are flagged in Section 3):** the controlled CQI-9 4th Ed. copy; furnace, burner and BMS manufacturers' manuals; customer-specific requirements; the site emergency plan; the IATF QMS procedures (nonconforming output, document control).

| Workspace | What is there | Numbering used |
|---|---|---|
| GitHub `ankurhimanshu14/grain-boundary-project`, branch `claude/epic-faraday-3ddvgo` | All CALOR source pages, `suite/`, `documents/`, `MWSPL.md`, `CLAUDE.md`, this note | CALOR numbering (Section 4) |
| Claude Code cloud sessions | Development and testing (headless Chromium / Playwright) | — |
| Plant PCs (Chrome / Edge) | `CALOR.html` run from disk; data in the browser or a linked Google Drive folder | — |
| MWSPL IATF 16949 project (separate) | The IATF QMS documents | `MWSPL-QM / QP / WI / F` (Section 4 lists the overlaps to resolve) |

- **Working folder:** repository root. Documents: `documents/`. Application sources: the `*.html` page files and `suite/`. The built file is `CALOR.html`.

## 2. Locked business facts and decisions

Everything here was given or confirmed by the user. Use it exactly in every document and in the application.

| Item | Decision |
|---|---|
| Company abbreviation | MWSPL (titles, this note, `MWSPL.md`). The company line in documents and the application is "Mass Wire and Steels Pvt. Ltd. · Bhiwadi". |
| Application name | **CALOR** (formerly "Heat Treat Quality Suite"; internal names `HTQ`, `htq-theme`, `suite/` kept). |
| Standard | AIAG CQI-9 4th Edition (HTSA), within the IATF 16949 QMS. PFMEA to the AIAG & VDA FMEA Handbook 2019 (Action Priority, no RPN). |
| Scope (HT shop) | Heat treatment on 4 continuous gas-fired pusher furnaces F-01 … F-04, direct-fired open chambers (no protective atmosphere). |
| Furnaces | Identical in structure and size. Hardening chamber of 3 zones and 13 tray positions (5 / 4 / 4). One-tray controlled cooling chamber on every furnace (not a line position). Tempering chamber of 3 zones and 12 positions (4 / 4 / 4). |
| Processes per furnace | F-01: isothermal annealing, hardening & tempering (**water** quench). F-02: isothermal annealing, normalizing, hardening & tempering (**oil** quench). F-03 and F-04: isothermal annealing and normalizing (no quench tank). |
| Process flow | Loading → hardening chamber → quench (HT) / controlled cooling (IA) / transfer (NORM) → tempering chamber → unloading → **shot blasting (every lot)** → inspection / release → dispatch. |
| Line timing (measured, push 9 min) | At every push the 13th tray leaves the hardening chamber, a new tray enters, and the 26th tray (counting the cooling chamber) leaves the tempering chamber. Time through the line = 13 × push + transfer (fixed **18 min**) + 12 × push. Isothermal annealing uses its controlled cooling cycle, which must end before the next push. Running the line out after the last product tray takes 25 empty trays. |
| Quench | Delay 30 s; dip 8–9 min (spec default 8.5 ± 0.5). Agitation fitted but **not monitored**. |
| Trays | HK-grade cast steel, maximum load 200 kg. |
| Thermocouples | 6 control TCs per chamber, 2 per zone, type K only, TC-01 … TC-06. **Odd = right wall, even = left wall.** |
| SCADA | One Excel export per furnace chamber and day; the chart heading names the furnace and chamber ("TEMPRING" spelling accepted). Valid range 500–1000 °C; default tolerance ±10 °C; 800 °C exactly is the lower class. |
| Production day | 08:00 to 08:00; a tray counts on the day it **leaves the tempering chamber**. |
| "On hold" (production) | The push cycle was paused (not a quality hold). |
| "N/A" | Means "not available": it counts as an entry but never identifies or matches a record. |
| HTSA 1.1 | Certificates are optional. Experience in this organization counts. |
| SCADA review | Only top-priority issues (P0 product, A vital few) become review actions; problems are solved by 8D inside the PDCA review. Affected product = time windows + tray positions (no push maths there). |
| Data storage | Browser storage per PC, optional Google Drive folder (JSON file per register, Google Drive for Desktop) chosen by the user (option A). |
| Out of scope | `SCADA_Review_2_M1.html` (record store, M1) is not to be edited. It moves to a new project later. The older apps (`furnace_analyzer.html`, Python / Streamlit) get no new features. |
| Document numbers | Provisional CALOR numbers (Section 4); final numbering to be decided with the IATF project. |
| Application status | Not live: the pages carry example data marked "(example)"; real data entry has not started. |
| Financial year | Not given (Section 3). |
| Management review cadence | Not given (Section 3). |

## 3. Assumptions still to be confirmed

Every value below was introduced by the application or the documents, not given by the user. Each is marked "to confirm", "typical" or "example" where it appears.

- **CQI-9 figures:**
  - HTSA 1.1 minimum 5 years;
  - furnace classes 1–6 (±3 … ±28 °C) and instrumentation types A–E with SAT / TUS intervals;
  - SAT tolerance and warning band, test thermocouple limits, 365-day control-TC replacement;
  - TUS default ranges (hardening 700–960 °C, tempering 500–900 °C, ±10 °C, 365 d).

  Confirm all of them against the controlled copy.
- **Site rules (not CQI-9):**
  - soak before the first tray 30 min; first-off test within 8 h;
  - exit tolerance ±5 min;
  - review, grace and look-back periods on every page (e.g. 365-day document review, 90-day availability checks, 30-day retraining, 7-day changeover coverage);
  - quarantine ageing escalation at 7 days;
  - drill frequencies in SOP-HT-11.
- **Quench and alarms:** quench test plan limits (oil 50–80 °C, water ≤ 35 °C, etc.); the alarm response matrix and its response times.
- **Typical content:**
  - the ten default procedures / WIs;
  - the default trap points;
  - rework procedure SOP-QA-12 content;
  - default PFMEA failure chains and S / O / D ratings;
  - start-up / shutdown check items;
  - the 28 predictive maintenance parameters with their normal values and limits (to be replaced by 2–4 weeks of baseline readings);
  - tag colours (yellow / red / green / orange) in SOP-HT-08.
- **Equipment assumptions:**
  - over-temperature protection may not be independent;
  - recording comes from the control TCs;
  - no production load TCs;
  - a standby generator / UPS "if installed";
  - BMS settings, devices and fault codes are blank in WI-HT-12.
- **Provisional KPI targets:** none set yet. The application shows status counts, not targets.
- **Values written into documents that the application does not enforce:**
  - drill frequencies, quarantine ageing and the BMS test plan;
  - the 25 empty trays to run out the line;
  - tag colours;
  - first-off "hold the first batch until OK". CALOR shows the first-off test link on the start-up record but does not block production.
- **Introduced in the SPEC module set (QMS/SPEC):** financial year April–March in F-SPEC-05; KPI targets SPEC-1 … SPEC-7 (0 / S); drafts older than 30 days counted (SPEC-6); specification retention "life of the part + 1 year"; an active part without a specification runs only on the HT Manager's written instruction and gets one within 7 days (WI-SPEC-03 §2).
- **Not given:** financial year, management review cadence, form and record retention periods. The documents say "3 years or as the retention rule says".

## 4. Document types and numbering

CALOR uses its own provisional numbers. The template's tier scheme is shown alongside for the final numbering decision.

| Tier | Template prefix | CALOR prefix in use | Meaning |
|---|---|---|---|
| 1 | `MWSPL-QM-NN` | — (none written) | Quality Manual section |
| 2 | `MWSPL-QP-<TOPIC>-NN` | `SOP-HT-nn`, `SOP-QA-nn` | Documented procedure |
| 3 | `MWSPL-WI-<TOPIC>-NN` | `WI-HT-nn`; emergency instructions `EI-HT-nn` (sections of SOP-HT-11) | Work instruction |
| 4 | `MWSPL-F-<TOPIC>-NN` | `F-HT-02A`, `F-HT-03A`, `F-MT-01`, `F-MT-02` | Format / record |
| — | — | Record IDs inside CALOR (PS-, MT-, QT-, TUS-, OP-, RW-, DR-, TP-, CO-, LB-, LC-, FX-, CP-, PF-, D-, POS-, P- …) | Register entries, not documents |

**Numbers in use** (the Procedures & WIs page's `DEF_DOCS` holds WI-HT-01 … WI-HT-10; the documents in `documents/` follow it):

| No. | Title | In CALOR defaults | Word / Excel file |
|---|---|---|---|
| WI-HT-01 | Operation of the pusher furnace line | yes | `WI-HT-01_General_Operating_Procedure.docx` |
| WI-HT-02 | Furnace start-up | yes | `WI-HT-02_Furnace_Start-up.docx` |
| WI-HT-03 | Furnace shut-down | yes | `WI-HT-03_Furnace_Shut-down.docx` |
| EI-HT-04 … EI-HT-07 | Emergency: power, gas / flame, fire, quench / cooling water | yes (separate drafts) | sections of `SOP-HT-11_Emergency_Response.docx` |
| SOP-HT-08 | Segregation of suspect and nonconforming product | yes | `SOP-HT-08_Product_Segregation.docx` |
| SOP-HT-09 | Product inspection and testing | yes | — (not written) |
| WI-HT-10 | Loading and unloading of trays | yes | — (not written) |
| SOP-HT-11 | Emergency response (EI-HT-04 … EI-HT-12) | no | `SOP-HT-11_Emergency_Response.docx` |
| WI-HT-12 | Burner management system and burner sequence | no | `WI-HT-12_Burner_Management_System.docx` |
| SOP-QA-12 | Rework and reprocessing | yes (Rework page `DEF_PROC`) | — (held in CALOR, PDF from the page) |
| F-HT-02A / F-HT-03A | Start-up / shutdown checksheets | — | `Furnace_Startup_Shutdown_Checksheet.xlsx` |
| F-MT-01 / F-MT-02 | Daily predictive maintenance / monthly trend | — | `Furnace_Predictive_Maintenance_Checksheet.xlsx` |

**Overlaps to resolve at the final numbering decision:**

| Overlap | Detail | Proposal (to confirm) |
|---|---|---|
| SOP-QA-12 vs SOP-HT-12 | Same sequence number in two topics: WI-HT-12 (BMS) and SOP-QA-12 (rework). | Renumber into the IATF scheme (e.g. rework = a QP of the nonconforming-output module). |
| EI-HT-04 … 07 | Exist twice: as separate drafts in CALOR and as sections of SOP-HT-11 (which adds EI-HT-08 … 12). | Make SOP-HT-11 the CALOR default for the emergency topics; drop the separate drafts. |
| SOP vs QP | The CALOR "SOP" prefix is the template's "QP". | Map SOP-HT-nn → MWSPL-QP-HT-nn; WI-HT-nn → MWSPL-WI-HT-nn; F-HT-02A → MWSPL-F-HT-02.1 (supporting WI-HT-02); F-MT-01/02 → MWSPL-F-MT-01/02. |
| IATF project register | The IATF project may already reserve these numbers. | Check its master register before renumbering. |

Rules: if a page's default list (`DEF_DOCS`, `DEF_PROC`) changes numbers, change the Word files and this table at the same time; the application's constants are the specification.

## 5. House style for documents

- **Word documents** (WI-HT-01, -02, -03, SOP-HT-08, -11, WI-HT-12):
  - A4 portrait, Calibri;
  - title block (company · type · title | document | revision | approved);
  - red DRAFT banner until approved;
  - key-value header (covers / applies to / used by / kept at / language);
  - numbered sections, steps table (No. | Step | Key point with ⚠ Safety / ● Critical / ◆ Quality);
  - records, related documents, revisions table, signature boxes, controlled-copy footer.

  Builder scripts (Node `docx`) are in `documents/builders/` (one per document; see its README).
- **Excel formats** (F-HT-02A/03A, F-MT-01/02):
  - Arial; header bar `1F4E5A`; section labels `DCE6E8`; yellow `FFF6C8` fill-in cells, grey `F2F4F4` calculated cells, blue font for example inputs;
  - Instructions sheet, blank form and a filled example sheet;
  - dropdowns and conditional formats; A4 with print areas and print titles;
  - recalculated, zero formula errors.

  These differ from the template's navy `1F4E78` / teal `2E75B6`. Decide whether new formats follow the template.
- **CALOR PDF / Excel outputs:** generated by each page (controlled-document title block, approval block, revision history); the application's look is the MWS MSA Manager style.
- The template's Markdown documents (Part 2, B2–B5) have not been written for CALOR yet. The Word files carry the same sections, except the ASCII PDCA diagram.

## 6. Status: what has been built

| Folder / file | CQI-9 / clause | Contents | Date |
|---|---|---|---|
| SCADA review (`SCADA_Review_2.html`) | Process monitoring, 8D | SCADA temperature analysis, PDCA review, 8D | 30-Sep … 15-Oct-2026 |
| SAT (`Thermocouple_SAT_PDCA.html`) | Pyrometry SAT | SAT PDCA, TC register, replacements, life | 07–10-Oct-2026 |
| CALOR shell (`suite/`) | — | Navigation, Home, Data dialog, theme, bridge, Google Drive sync | 09-Oct … 19-Oct-2026 |
| Daily production (`Production_Report.html`) | Traceability | Tray-first log, timing, batches, holds, parameter changes, last tray out (day and per batch) | 10-Oct … 21-Oct-2026 |
| Quench media, Specifications, Hardness, TUS, Equipment, CP & PFMEA, Alarms | Process tables, pyrometry, PFMEA | One page each | 12–13-Oct-2026 |
| Load build, HT organization, Trap points, Procedures & WIs | 1.1, 1.6, 2.5, 1.15 | One page each | 15-Oct-2026 |
| Trend analysis, Data review, Rework | 1.8, 1.9, 1.11 | One page each, CP / PFMEA rework links | 16–19-Oct-2026 |
| HT organization | 1.17 | Key functions, primary / backup | 19-Oct-2026 |
| `documents/` | 1.15 | WI-HT-01, WI-HT-02, WI-HT-03, SOP-HT-08, SOP-HT-11, WI-HT-12 (Word); F-HT-02A/03A, F-MT-01/02 (Excel) | 16–22-Oct-2026 |
| `MWSPL.md`, `CLAUDE.md`, this note | — | Plant facts, technical description, handover | 19–22-Oct-2026 |
| `documents/builders/` | — | Builder scripts of every Word / Excel document | 22-Oct-2026 |
| `QMS/SPEC/` (pilot module set) | HTSA 1.6, Process Tables A / E | Master list, MWSPL-QP-SPEC-01, WI-SPEC-01 … 03, F-SPEC-01 … 05 (KPI), module description | 22-Oct-2026 |
| `QMS/SCADA/` + SCADA module of the integrated application | HTSA 1.9 (feeds 1.8; uses 1.6, 3.3, 1.1) | Master list, MWSPL-QP-SCADA-01, WI-SCADA-01 / 02, F-SCADA-01, module description; SCADA export analysis, second-level review record, reactions, coverage per chamber | 23-Oct-2026 |
| `QMS/ORG/` + ORG module of the integrated application | HTSA 1.1 | Master list, MWSPL-QP-ORG-01, WI-ORG-01 / 02, F-ORG-01 … 03, module description; positions, job descriptions, organization chart approval, qualification records | 23-Oct-2026 |
| `QMS/TC/` + TC module of the integrated application | HTSA 3.3, P3.1, P3.3 | Master list, MWSPL-QP-TC-01, WI-TC-01 … 03, F-TC-01 … 03, module description; thermocouple register, SAT records, test equipment, tube PM schedule and checks | 22-Oct-2026 |
| `QMS/00_Integrated_Application/` (pilot application) | HTSA 1.6 | `calor-quality-system.html`: Overview + native SPEC module in the IATF integrated-application UI/UX (built by `build.py` from `src/` and `QMS/SPEC/04_Application/mwspl-spec-module.js`) | 22-Oct-2026 |

HTSA questions with a self-assessment in CALOR: **1.1, 1.6, 1.8, 1.9, 1.11, 1.15, 1.17, 2.5** (scores on the HT organization page and the Home tile).

## 7. Process model, KPIs and management review inputs

**Process list** (proposed; owners are the role names used across CALOR):

| ID | Process | Owner | Type | CALOR pages |
|---|---|---|---|---|
| HT-M1 | Heat treat organization, competence, key functions | HT Manager | Management | HT organization |
| HT-M2 | Documented procedures and work instructions | HT Manager | Management | Procedures & WIs |
| HT-M3 | Second-level data review (24 h) | HT Manager | Management | Data review |
| HT-M4 | Trend analysis and reaction | Quality Manager | Management | Trend analysis |
| HT-C1 | Process specification (recipes, job cards) | HT Manager | Core | Specifications |
| HT-C2 | Heat treatment production (loading, pushing, unloading) | Production Manager | Core | Daily production, Load build, Trap points |
| HT-C3 | Process monitoring and response (SCADA, alarms, start-up / shutdown) | HT Manager | Core | SCADA review, Alarms |
| HT-C4 | Quench and controlled cooling | HT Manager | Core | Quench media |
| HT-C5 | Product testing and release | Quality Manager | Core | Hardness |
| HT-C6 | Rework / reprocessing | Quality Manager | Core | Rework |
| HT-S1 | Pyrometry (SAT, TUS, equipment qualification) | Maintenance Head | Support | SAT, TUS, Equipment |
| HT-S2 | Maintenance (predictive, BMS tests) | Maintenance Head | Support | F-MT-01/02, WI-HT-12 |
| HT-S3 | Risk analysis and control planning | Quality Manager | Support | CP & PFMEA |

**KPI definitions:** not yet defined in one document. Proposal: a KPI format (Part 2, B5) built from the status counts each CALOR page already provides through its API (`overview()` / `counts()`):
- SATs in date;
- TUS ranges valid;
- chambers qualified;
- furnaces reviewed within 24 h;
- open reactions and actions past due;
- quench parameters overdue or out of limits;
- nonconforming tests (30 days);
- rework jobs open or blocked;
- production kg per day;
- push-cycle hold minutes;
- the HTSA scores.

Targets are to be set by the user (Section 3).

**Management review inputs:**

| Input | Supplied by (CALOR) |
|---|---|
| HTSA self-assessment status (1.1, 1.6, 1.8, 1.9, 1.11, 1.15, 1.17, 2.5) | HT organization panel / Home tile |
| Process performance and trends, signals and reactions | Trend analysis |
| Furnace monitoring: excursions, product affected, 8D status | SCADA review |
| Alarms, emergencies, start-ups / shutdowns | Alarms |
| Pyrometry status and equipment gaps | SAT, TUS, Equipment |
| Product conformity and rework | Hardness, Rework, Trap points |
| Production output and holds | Daily production |
| Risk: PFMEA AP-High actions, control plan issues | CP & PFMEA |
| Documents and training | Procedures & WIs |
| Maintenance condition trends | F-MT-02 (Excel, outside CALOR) |

## 8. Application (CALOR)

- **Source files:** 17 page files (one per tab; `CLAUDE.md` lists each with its data model, API and test hooks) plus `suite/shell.html` and `suite/calor-theme.css`.
- **Build:** `python suite/build.py` writes `CALOR.html`. Never edit `CALOR.html`; rebuild after every page change.
  - **How pages are wrapped:** each page is embedded as a JSON string with the CALOR theme and a storage hook inserted into its `<head>`. The shell loads the pages as same-origin `srcdoc` frames.
  - **Standalone:** every page also runs on its own (`HTQ` is null there).
- **Bridge:** `HTQ.provide / api / on / emit / go`. Every page offers an API (e.g. `spec.inForce()`, `prod.reports()`, `sat.overview()`) and emits `<page>:changed`.
- **Storage:**
  - one `localStorage` key per register (`org-reg`, `wi-reg`, `mrv-reg`, `prod-reg`, `lbf-reg`, `trp-reg`, `psr-reg`, `sr2-*`, `fop-reg`, `qmt-reg`, `hmt-reg`, `rwk-reg`, `cpf-reg`, `tra-reg`, `tsat-pdca`, `tus-reg`, `eqq-reg`), listed in `KEYS` / `MODS` in the shell;
  - optional Google Drive folder: one JSON file per key, daily backups, conflict copies; view and theme keys stay local;
  - every new key must be added to `KEYS` and `MODS`.
- **Cross-module links (what feeds what):**
  - specifications → hardness requirements, production, control plans, load build, equipment class required;
  - production → SCADA trace, alarms, trap points, load build coverage, rework log, data review, HTSA 1.6 active parts;
  - SAT / TUS → SCADA review, equipment, start-up records, home;
  - organization → spec approval (1.6), qualified reviewers (1.9), rework issuers / releasers (1.11), procedures training;
  - rework → control plan / PFMEA;
  - every page → Home and the HTSA panel.
- **Seed data:** every page has "Load example data". Example data is marked "(example)" and the SCADA example is never saved to history. **Before go-live:** clear the example data (Data → Clear all data) and enter real data (Section 11).
- **Integrated application (pilot):** `QMS/00_Integrated_Application/calor-quality-system.html` rebuilds one module (SPEC) in the form of the MWSPL IATF integrated application: one file, module switcher (Overview | modules), PDCA-grouped views, hash routes `#home` / `#<mod>/<view>`, each module in its own scope with `MWS.<mod>` API, shared record store (`db` capability) or this browser, embedded module documents. Build: `python QMS/00_Integrated_Application/build.py`. Add a module: its JS under `QMS/<MOD>/04_Application/`, an entry in `MODULES` (build.py), `MODS` / `SYS` / `nav.sys` (src/shell-head.html) and a card in the Overview (src/shell-tail.js).
- **Testing:** no automated suite; drive the pages with headless Chromium (Playwright), read `window.__XXX` objects and console errors. The Google Drive sync is tested over `http://localhost` with an OPFS folder.

## 9. Mistakes made and lessons learned

**Content (carried over)**
1. A `QM` document is narrative. Do not write it as a procedure.
2. Check the register's reserved numbers before numbering. Prefer decimal sub-numbering for supporting forms.
3. Check everything against Section 2 before building. Early drafts built on a generic scope had to be rewritten.
4. Do not claim the application does something it does not. Read the module code before describing it.
5. Match deadlines and thresholds across documents. Grep existing procedures for timings before setting new ones.
6. Update this note at the end of every session, or it goes stale.

**Content (this project)**

7. **Plant facts were assumed before they were asked.**
   - The examples ran hardening on F-03 / F-04 and gave every furnace an oil tank. After the user's answers they had to be moved: the production / load / trap / rework example day went to F-02, and the hardness and control plan examples followed it.
   - The tempering chamber was first set up as 5 / 4 / 4.
   - The transfer between the chambers was first taken as 11 pushes (`tPush` = 11) instead of the measured 18 min.

   Ask for the line facts first (MWSPL.md section 1).
8. **Stale text survives a model change.** The Specifications page still said "13 + 11 pushes" after the timing was corrected, and the shutdown checksheet example said "26 empty trays" (correct: 25). After changing a rule, grep for the old number in every page and document.
9. **The user's words have a site meaning:**
   - "on hold" = push cycle paused, not a quality hold;
   - "N/A" = not available, never an identity;
   - the production day = 08:00 to 08:00 by exit time.

   Write these into Section 2 the first time they appear.
10. **Requirements were tightened beyond what the user wanted.** HTSA 1.1 first made certificates mandatory and ignored experience in this organization. Implement the requirement text as given; ask before adding evidence rules.
11. **An interrupted request was taken literally.** "Implement 1.17" was started before the full requirement text arrived, and the first design was dropped. Wait for, or ask for, the requirement text.
12. **Names must match across the application and the documents.** SOP-HT-11 first used alarm codes that the Alarms page does not have (MECH, SCADA instead of PUSH, REC). Copy names from the application's constants.
13. **Builder scripts were kept only in the session scratchpad,** which is lost when the session ends. They were moved to `documents/builders/` on 22-Oct; keep every new builder there.
14. **Module documents must follow the code, not the idea of it.** Writing the SPEC set showed two things the page does not do (a "reviewed, no change" entry, an authorization printout); they are stated in the documents and listed in Section 11 instead of being described as features.

**Technical (this project)**
- **Composite keys break on split.** Batch keys contain "|", so `split("|")` stored the batch weight / note / last-tray-out fields under a wrong key (fixed 21-Oct; users re-enter those fields). Split at the last separator, or use a separator the data cannot contain.
- **Assembling a page from template slices caused off-by-one bugs** (a stray `}`, CSS stuck inside `@media print`). Check the slice boundaries and load the page after assembling.
- **Redrawing a dialog while a test is typing loses the input.** Redraw only on select changes, or after focus leaves (the production page's `BXPEND` pattern).
- **OPFS does not work on `file://`.** Test the Google Drive folder over `http://localhost`.
- **Excel builders (`documents/builders/*.py`):** openpyxl writes no cached values. Run `recalc.py` and check for zero errors; check the calculated results against a separate calculation (done for the trend slopes).
- **`pkill -f` with a pattern can kill the running shell.** Stop servers by PID.

**Method**
- For any CALOR page, read its constants first (`DEF`, `DEF_DOCS`, `DEF_PLAN`, `DEF_ALARMS`, `KEYS`, `MODS`): they are the specification.
- Use a finished document as the template for the next one (WI-HT-01 → the later Word files).
- Generate large tables from data by script (checksheets, register tables).
- After writing, render the document to PDF and look at every page before sending.
- Flag every value you introduced (Section 3).

## 10. Known issues and blockers

1. The Google Drive sync has not been tried on a plant PC with real Google Drive for Desktop and `CALOR.html` opened from disk. Owner: user (try on one PC first).
2. There is no lock for several users. Two PCs changing the same register at once keep the second change in `conflicts/` without merging. Owner: developer, if several users are planned.
3. The standalone page files save in the browser only; they reach Drive the next time CALOR opens in the same browser.
4. The Procedures & WIs page still lists EI-HT-04 … 07 as separate drafts, while SOP-HT-11 contains them. Decide which is the controlled one (Section 4).
5. Browsers that entered data before 20-Oct keep the old defaults: four oil tanks, dip 8 ± 1 min, tray max 150 kg. Correct them in the page settings.
6. HTSA 1.11 shows "Not satisfactory" until the control plans / PFMEAs naming the rework procedure are approved (expected).
7. No automated tests; every change is checked by hand-written Playwright scripts.
8. `SCADA_Review_2_M1.html` is out of scope and waits for its own project.

## 11. Open items and next steps

- [ ] **Confirmations needed from the user** (the questions put on 20-Oct, items 7–19):
  - typical set values and customer temperature tolerance;
  - over-temperature protection and recording independence;
  - SAT / TUS practice and past reports;
  - hardness scales, laboratory and sampling plan;
  - main customers (OEM / Tier 1);
  - designated HT person, key functions and backups;
  - who does the 24 h data review;
  - number of users / PCs and who enters what;
  - date of the next CQI-9 assessment;
  - financial year and management review cadence.
- [ ] **Data needed before go-live:**
  - positions and people;
  - specifications per part;
  - reviewers;
  - procedures and points of use;
  - trap points;
  - the rework procedure and its PPAP approval;
  - tanks and thermocouples;
  - TUS ranges;
  - equipment survey records.

  Clear the example data first.
- [ ] **Confirm against the controlled CQI-9 copy and the manuals:** all values in Section 3.
- [ ] **Documents still to write:**
  - SOP-HT-09 Product inspection and testing;
  - WI-HT-10 Loading and unloading of trays;
  - the KPI format;
  - per-module master lists and procedures in the template format (Part 2): **SPEC done as the pilot (QMS/SPEC)**; the other 12 modules after the user has checked the pilot.
- [ ] **Application changes asked by the SPEC documents:** a "reviewed, no change" action for specifications (WI-SPEC-03 §1.3) — **done in the integrated-application pilot**, not in the CALOR page; optionally a printable authorization list (F-SPEC-03).
- [ ] **Integrated application:** the user checks the SPEC pilot (`QMS/00_Integrated_Application/calor-quality-system.html`); then decide whether the other modules move into it, in which order, and whether CALOR's records move with "Import from CALOR".
- [ ] **HTSA questions not yet in CALOR:**
  - section 1: 1.2–1.5, 1.7, 1.10, 1.12–1.14, 1.16, 1.18–1.20;
  - section 2: every question except 2.5;
  - section 3: pyrometry questionnaire;
  - the Job Audit (section 4).
- [ ] **Clean-up and consolidation:**
  - final numbering (Section 4);
  - make SOP-HT-11 the CALOR default for the emergency topics;
  - approve new revisions of the control plans and PFMEAs.

## 12. Request history

| # | Date | Request | Outcome |
|---|---|---|---|
| 1 | 30-Sep | CQI-9 analysis of SCADA exports with a printable report | SCADA review app; temperature range 500–1000 °C; per-set-value statistics; settling; process rules; affected product as time windows |
| 2 | 03–04-Oct | Furnace start / stop; thermocouple replacement register | Added; before / after analysis |
| 3 | 07–08-Oct | Thermocouple SAT through PDCA | SAT register: 30 readings, F-01 … F-04 chambers, type K, replacement cases, annual life |
| 4 | 09–10-Oct | Combine the apps | Heat Treat Quality Suite, then named **CALOR**; review PDCA, downloads, Home page; wall layout fixed (odd = right) |
| 5 | 10–13-Oct | Production report; quench media; specifications; hardness; TUS; equipment; CP & PFMEA (AIAG & VDA 2019); alarm log; data per tab | One CALOR tab each |
| 6 | 14-Oct | Tray-first production entry, holds, rework, production day 08:00–08:00, N/A rule, controlled cooling cycle | Production page rewritten |
| 7 | 14-Oct | Dropdown menus opening on hover | Done |
| 8 | 14–15-Oct | SCADA Review 2 with PDCA and 8D; collapsible cards; only P0 / A as actions; M1 out of scope | SCADA Review 2 replaced the earlier tab |
| 9 | 15-Oct | Full-width layout | Done |
| 10 | 15-Oct | Load build and fixturing | Page added |
| 11 | 15-Oct | HTSA 1.1, 1.6, 2.5, 1.15 | One page / panel each |
| 12 | 16-Oct | WI-HT-01 general operating procedure (Word) | Draft written |
| 13 | 16-Oct | Line timing measured (13 pushes + 18 min + 12 pushes) | Timing model and texts corrected |
| 14 | 16–19-Oct | HTSA 1.8, 1.9, 1.11 (+ control plan and PFMEA rework links), 1.17 | Pages added |
| 15 | 19-Oct | HTSA 1.1: certificates optional; count current-organization experience | Changed |
| 16 | 19-Oct | MWSPL.md with all information | Written |
| 17 | 19-Oct | Store the data as JSON in a linked Google Drive (plan, format question, then option A) | Plan; JSON chosen over TOML; Drive folder sync built |
| 18 | 20-Oct | Questions about the heat treatment process; answers 1–6 | Processes and quench per furnace, shot blasting, HK trays put into defaults and examples |
| 19 | 21-Oct | Last tray exit time (day, then per batch) | Added; batch-field key bug fixed |
| 20 | 21-Oct | Start-up / shutdown checksheet (Excel) | F-HT-02A / F-HT-03A |
| 21 | 21-Oct | Daily predictive maintenance checksheet | F-MT-01 / F-MT-02 |
| 22 | 22-Oct | Methods of addressing emergencies (power failure) | SOP-HT-11 with EI-HT-04 … 12 |
| 23 | 22-Oct | WI for start-up; WI for shut-down | WI-HT-02, WI-HT-03 (checksheet example corrected to 25 trays) |
| 24 | 22-Oct | WI for product segregation | SOP-HT-08 |
| 25 | 22-Oct | What is the burner management sequence; document it | WI-HT-12 |
| 26 | 22-Oct | Prepare CALOR in the QMS project template | This note |
| 27 | 22-Oct | Create the CALOR application in this template (pilot: one module first) | SPEC module set in `QMS/SPEC/` |
| 28 | 22-Oct | Create one module (SPEC) in the UI/UX of the Integrated Application of IATF 16949 | `QMS/00_Integrated_Application/calor-quality-system.html` |
| 29 | 22-Oct | Temperature–time sketch on the job card | SPEC module job card |
| 30 | 22-Oct | Module for HTSA 3.3 (thermocouples and protection tubes) | TC module in the integrated application; `QMS/TC/` document set |
| 31 | 23-Oct | Module for HTSA 1.1 (heat treat organization) | ORG module in the integrated application; `QMS/ORG/` document set; SPEC approvers from it |
| 32 | 23-Oct | Module for the SCADA review, linked to the right HTSA question (sample export 22-Oct-2026 F-02 tempering) | SCADA module (HTSA 1.9) in the integrated application; `QMS/SCADA/` document set |
| 33 | 23-Oct | SCADA module in the CALOR SCADA review interface, keeping the PDCA structure | Load & analyse rebuilt as the CALOR report (verdict, KPIs, layout, zone cards, trends, set value response, heatmap, spread, excursion log, product windows, integrity) |
| 34 | 23-Oct | SAT data to record 30 minutes of temperature for each SAT | TC module: 30 furnace / test pairs per SAT (1 per min), mean difference, chart, readings printed and in a CSV; WI-TC-02, F-TC-02 updated |
| 35 | 23-Oct | Module for HTSA 1.2 (advanced quality planning) | APQP module in the integrated application: procedure approval, feasibility studies per part / part family, planning outputs and release, parts coverage, HTSA 1.2; `QMS/APQP/` document set |
| 36 | 23-Oct | SAT 30-minute furnace readings pulled from the SCADA review; thermocouple replacement history monitored as in CALOR | TC module: fill from a loaded SCADA export (PV-n at each reading time); replacement register (reasons, offset, TUS decision, linked SAT, verification SAT, due list); WI-TC-01 / -02, F-TC-02 updated |
| 37 | 23-Oct | Link of the removed thermocouple to the fitted one did not work properly | TC module: two-way links in the element and replacement dialogs and the history, position history, "removed before its SAT", CALOR import builds the removed elements and the chain, reason no longer preselected |
| 38 | 23-Oct | Cannot import from the Google Drive folder | CALOR shell: a backup in the folder can be imported when linking, Drive duplicate files "<key> (1).json" are read, unreadable files are retried and named, a fresh browser no longer counts as having data |

---

# PART 2: MODULE DOCUMENT SET (applied to CALOR)

## A. Folder skeleton (proposed)

One module per CALOR tab group. The application file of each module already exists (column "Application"). **SPEC is built as the pilot in `QMS/SPEC/`**; folders 01–03 of the other modules are still to be written. `04_Application` holds a module description (the page's rules), not a copy of the page file, because the build reads the page from the repository root.

```
<MOD>\00_<MOD>_Master_List.md
<MOD>\01_Procedure\MWSPL-QP-<MOD>-01_<Title>.md
<MOD>\02_Work_Instructions\MWSPL-WI-<MOD>-0n_<Title>.md
<MOD>\03_Formats\MWSPL-F-<MOD>-0n_<Title>.md
<MOD>\04_Application\mwspl-<mod>-module.md   (description of the page; the page file stays in the repository root)
```

| MOD | Module | CQI-9 basis | PDCA | Application | Existing documents |
|---|---|---|---|---|---|
| ORG | HT organization and key functions | HTSA 1.1, 1.17 | P | `Organization_Personnel.html` | Job descriptions, key function list (PDF from the page) |
| DOC | Procedures and work instructions | HTSA 1.15 | P | `Work_Instructions.html` | WI-HT-01, -02, -03, SOP-HT-08, SOP-HT-11, WI-HT-12 |
| SPEC | Process specifications | HTSA 1.6, Process Tables A / E | P | `Process_Specifications.html` | Specification, job card (PDF) |
| RISK | Control plan and PFMEA | Section 1 (PFMEA / CP) | P | `Control_Plan_PFMEA.html` | PFMEA, control plan (PDF / Excel) |
| PROD | Production, load build, trap points | HTSA 2.5, load build | D | `Production_Report.html`, `Load_Build_Fixturing.html`, `Trap_Points.html` | Loading standard (PDF) |
| OPS | Start-up, shutdown, alarms, emergencies, BMS | HTSA 1.15 | D | `Furnace_Operations.html` | WI-HT-02, WI-HT-03, SOP-HT-11, WI-HT-12, F-HT-02A / 03A |
| QNCH | Quench media | Process Table A, quench | D | `Quench_Media_Testing.html` | Test plan, test records |
| PYRO | SAT, TUS, equipment qualification | Section 3 pyrometry | D / C | `Thermocouple_SAT_PDCA.html`, `Temperature_Uniformity_Survey.html`, `Equipment_Qualification.html` | SAT / TUS / qualification records |
| MON | SCADA review and second-level data review | HTSA 1.9, process monitoring | C | `SCADA_Review_2.html`, `Monitoring_Review.html` | Review records, 8D (PDF / Excel) |
| TEST | Hardness and metallurgical testing | Product testing | C | `Hardness_Metallurgical_Testing.html` | Test records |
| TREND | Trend analysis | HTSA 1.8 | C | `Trend_Analysis.html` | Analysis plan, chart reviews |
| NCR | Segregation and rework | HTSA 1.11, 2.8 | A | `Rework_Reprocessing.html` | SOP-HT-08, SOP-QA-12 (in CALOR) |
| MNT | Predictive maintenance | Equipment maintenance | A / D | — (Excel) | F-MT-01 / F-MT-02 |

## B. Master list content per module (B1), to fill when each module is built

For each module above, `00_<MOD>_Master_List.md` gets:
1. A basis line: the CQI-9 questions / process tables and the PDCA phase (table above).
2. A document table: PDCA | Doc. No. | Title | Rev. | Date | File link (start from the "Existing documents" column and Section 4).
3. A "Where each requirement is met" table: HTSA question → CALOR page assessment item → document. The page's `assessNN()` items are the rows; `MWSPL.md` section 3 lists them.
4. A first-cycle implementation checklist: real data entered, defaults confirmed (Section 3), procedure approved, people trained (Procedures & WIs), first records made, self-assessment score reviewed.

## C. Checklist per new module

- [ ] Read Section 2 (abbreviation, scope, furnaces, flow, timing, rules)
- [ ] Read the page's constants and its section in `CLAUDE.md`
- [ ] Grep existing documents and pages for timings, thresholds and cross-references (Section 9, lesson 8)
- [ ] Write master list, procedure, work instructions, formats (KPI format last)
- [ ] Check every file link exists
- [ ] List new assumed values in Section 3
- [ ] Rebuild CALOR (`python suite/build.py`) if a page changed
- [ ] Update Sections 3, 6, 9 and 11
