# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## SCADA MODULE: APPLICATION DESCRIPTION

The module runs in the CALOR Quality System (`QMS/00_Integrated_Application/calor-quality-system.html`, "SCADA review"). Source: `QMS/SCADA/04_Application/mwspl-scada-module.js`, sample record `sample.json` (F-02 tempering chamber, 22-Oct-2026, embedded by the build). The analysis follows the CALOR SCADA review (`SCADA_Review_2.html`); the review record and the HTSA 1.9 rules follow the CALOR Data review page (`Monitoring_Review.html`).

| Item | Value in the code |
|---|---|
| HTSA question | **1.9** (second-level review of the monitoring system by qualified personnel, ≤ 24 h, documented, detection and reaction); feeds 1.8 (History view); uses 1.6 (tolerances from specifications in force) and 3.3 (SAT / element life from the Thermocouples module) |
| Reading | .xlsx read in the browser without libraries (zip + `DecompressionStream`), or .csv; header row with SET-1 / PV-1; date "Oct-22-2026", "22-10-2026", "2026-10-22" or an Excel serial; time as a day fraction or hh:mm:ss; heading "FURNACE-n TEMPRING / HARDENING" → furnace and chamber |
| Analysis `analyze` | valid 500–1000 °C; offline = 0 all record; deviation = PV − the row's set value; tolerance = specification in force matching the zone set value, else ±10; settling after a set value change (back within tolerance 3 readings, at most 120 min) not judged; excursions ≥ 1 reading, joined within 10 min, per zone incidents; product affected: hardening chamber zones 2–3 above 800 °C, every tempering zone; spikes > 15 °C, stuck ≥ 30 min, gaps > 2.5 × step; wall difference left − right |
| Conditions `findings` | incidents, TC below 100 %, offline, out of range, stuck, gaps, late settling, set value without specification, SAT failed / overdue / none, element past life |
| Review record | collection `reviews` (`DR-nnnn`): chamber, data period, file, verdict, per-TC summary, incidents, findings, 10-minute trend, `lines{condition: {how react / ref, ref, action, owner, disp, closed, verify}}`, `at`, `by`, notes; `idle` for "not running"; the file itself is not stored |
| Gate `revMissing` | furnace and chamber, review time after the data and not in the future, qualified reviewer, every condition answered (reaction: action, owner, disposition for product; closing: verification, not "on hold") |
| Interval `cstat` / `gaps19` | due `maxHrs` (24) after the last review per chamber in scope; gaps in `covDays` (30) |
| HTSA 1.9 `assess19` | qualified reviewers, procedure named, intervals, reviews complete, conditions answered, reactions closed; score nia / ns / s |
| Load & analyse (report) | layout of the CALOR SCADA report: verdict, six KPI tiles, furnace layout with TC status, zone cards (left / right wall, Ppk), zone trends on one scale with out-of-tolerance readings marked, response to set value changes, hourly deviation heatmap, spread per TC (p5–p95), excursion log, product affected time windows, findings, data-integrity checks; "Record the review (C)" opens the HTSA 1.9 review |
| Records | `reviews`, `config/settings`; shared store prefix `scada-`, else `localStorage` `mws-scada-local-v1` |
| API | `MWS.scada.stats()`, `summary()`, `closeModal()`; uses `MWS.spec.inForce()`, `MWS.tc.chamber()`, `MWS.org.qualified()` |
| Not here | 8D problem solving and the record-level PDCA of the CALOR SCADA review |
