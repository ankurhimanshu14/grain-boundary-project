# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## TUS MODULE: APPLICATION DESCRIPTION

The module runs in the CALOR Quality System (`QMS/00_Integrated_Application/calor-quality-system.html`, "Uniformity (TUS)"). Source: `QMS/TUS/04_Application/mwspl-tus-module.js`. Range state, the re-survey link and product at risk are copied from CALOR's `Temperature_Uniformity_Survey.html`.

| Item | Value in the code |
|---|---|
| HTSA question | **3.4**: surveys per the Process Tables, Section 2.0; actions that alter uniformity documented (P3.4.1.2); alternate methods meet P3.4.8; upper tolerance never exceeded, exceptions for multi-temperature cycles (P3.4.5.1); soak time defined by the internal process specification (P3.4.5.1); reports meet P3.4.7. Wording as given by the user; to confirm against the controlled copy |
| Qualified ranges `ranges` (`R-nn`) | furnace, chamber, lo, hi, tol, interval, ref (Process Table item), cls (furnace class), note, active; defaults per chamber: hardening 700–960 °C, tempering 500–900 °C, ± 10 °C, 365 days (to confirm) |
| Survey `surveys` (`TUS-nnnn`) | furnace, chamber, sp, kind (`KINDS` periodic / initial / after a change / re-survey), method (`METHODS` standard / travelling logger / alternate), `alt{ref, why, appr, date}`, date, start, step, test instrument (id, serial, calibration due), survey TC certificate and calibration due, by, stab, `tcs[{tag, loc, corr}]`, rd (readings × TCs), notes, `exc{on, why}`, chg (the change record), `check{by, date, remarks}` (approval), act, closed |
| Evaluation `calc` | corrected readings; stabilisation entered or the first reading with every TC within ± tol; **upper tolerance checked on every reading, also before stabilisation** (fail unless the multi-temperature exception is ticked with its reason); soak cover after stabilisation vs Settings `soakMin` (short = invalid, "incomplete"); after stabilisation every reading within ± tol; invalid when the instrument or the survey TCs are out of calibration; notes for fewer TCs than `minTc`, a set value not at a range end |
| Report gate `repMissing` (P3.4.7) | furnace, chamber, date, start, set value in a range, method (alternate: reference, justification, approval), instrument and TC identification and calibration, TC locations, readings, result, surveyed by; the approval sets `check` |
| Range state `rangeState` | a survey counts for an end within ± `endTol` (15 °C); fail / none / partial / overdue / soon / ok; due = older passing end + interval |
| Changes `changes` (`UC-nnnn`, P3.4.1.2) | date, furnace, chamber ("" = both), kind (`CKINDS`), what, by, need yes / no, why, decided by / date, vref (Process validation change); `chgState` undecided / not required / open / done (a passing survey of each chamber after the date); `validPending()` = Process validation changes to the combustion, controls or a chamber not yet documented here |
| Reaction `missingAct` | root cause, action, product impact, owner, date, passing re-survey at the set value; `riskTxt` = last passing survey → re-survey |
| HTSA 3.4 `assess34` | ranges per Section 2.0, surveys of both ends in date, changes documented and re-surveyed, alternate methods, upper tolerance, soak time with its specification, reports, reaction; score nia without ranges or surveys, ns with a crit item, else s |
| Settings `config/settings` | plant, furnaces, tol, warnPct 80, interval 365, soon 30, endTol 15, minTc 9, step 2 min, soakMin 30, soakRef (process specification), approvers |
| Records | `ranges`, `surveys`, `changes`, `config/settings`; prefix `tus-`, else `localStorage` `mws-tus-local-v1` (also saved to the Google Drive folder) |
| API | `MWS.tus.stats()`, `summary()`, `statusAt(f, ch, day)`, `hasData()`, `refresh()`, `closeModal()` |
| Data | JSON export / import, surveys CSV, import from CALOR (`tus-reg`), starter set-up |
