# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## VALID MODULE: APPLICATION DESCRIPTION

The module runs in the CALOR Quality System (`QMS/00_Integrated_Application/calor-quality-system.html`, "Process validation"). Source: `QMS/VALID/04_Application/mwspl-valid-module.js`. CALOR has no page for HTSA 1.7; the rules are new and follow MWSPL-QP-PV-01.

| Item | Value in the code |
|---|---|
| HTSA question | **1.7** (process validated initially, after relocation of equipment or a change of location, and after a major rebuild or modification; validation = robust equipment, process control and monitoring with calibrations, test equipment calibration, strategic product sampling; wording to confirm against the controlled copy) |
| Process lines `lineList` | Settings `runs` (processes per furnace) → one line per furnace × process, with the equipment `LINE_EQ` (HT: hardening chamber, quench tank, tempering chamber; IA: hardening chamber, controlled cooling chamber, tempering chamber; NORM: hardening chamber, tempering chamber, fan cooling; all: pusher / extractor, combustion, controls) |
| Equipment changes `changes` (`EC-nnnn`) | date, furnace ("" = site for a location change), equip[], kind (`KIND`: relocation, location, rebuild = always major; modification, repair = assessed), what, by, major, why, aBy, aDate; `affects` / `linesOf`, `isMajor`, `assessed`, `chgMissing` |
| Validations `vals` (`PV-nnnn`) | line, trigger (`TRIG`), change, spec, part, plan, start, items (`ELEM` A–C: result ok / nok / na, ref, date, note), trials (lot, date, part, positions, readings, micro, decarb), scale, lsl, usl, conc valid / not, summary, justify, prep, appr, apprDate, status draft / approved (locked) |
| Sampling `smpCalc` | per lot: n, min, max, mean, pass; all readings: mean, σ, Cpk; complete when ≥ `minLots` lots, ≥ `minPcs` readings each, all passing, Cpk ≥ `cpkMin` or justified |
| Approval gate `valMissing` | protocol, every item that applies answered with evidence, sampling, conclusion consistent with the items and lots, approver allowed (Settings + `MWS.org.authorized()`), trial lots after the change |
| Line status `lineState` | validated / revalidation due (overdue after `graceDays` or with production on the furnace since the change, CALOR `prod-reg`) / never validated / not validated; changes to assess |
| Hints `hints` | SAT of the furnace's thermocouples (`MWS.tc.chamber`), quench tank state (`MWS.quench.tanks`, new), specifications in force (`MWS.spec.inForce`) |
| HTSA 1.7 `assess17` | procedure approved / reviewed, lines defined, initial validation of each line, relocation, major rebuild / modification, changes assessed, validation content, product sampling; score nia / ns / s |
| Records | `vals`, `changes`, `config/settings`, `config/proc`; prefix `valid-`, else `localStorage` `mws-valid-local-v1` (synced to the Google Drive folder) |
| Prints | F-PV-01 validation report, F-PV-02 change assessment, F-PV-03 validation matrix, HTSA 1.7 evidence |
| API | `MWS.valid.stats()`, `summary()`, `lines()`, `refresh()`, `hasData()`, `closeModal()`; test hook `window.__VALM` |
