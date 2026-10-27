# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## CAL MODULE: APPLICATION DESCRIPTION

The module runs in the CALOR Quality System (`QMS/00_Integrated_Application/calor-quality-system.html`, "Calibration"). Source: `QMS/CAL/04_Application/mwspl-cal-module.js`.

| Item | Value in the code |
|---|---|
| HTSA question | **3.2**: calibrations, verifications and certifications current at the intervals of the Process Tables Sections 1.0 / 2.0; non-contact thermometry calibrated; documented offset procedure (P3.2.3) naming the authority and how the approval is documented; offsets complying with P3.2.3; labels (P3.2.5.1); reports (P3.2.5.2). Wording as given by the user; to confirm against the controlled copy |
| Kinds `KINDS` | controller, recorder / SCADA channels, over-temperature controller, field test instrument, non-contact thermometer, quench temperature indicator, timer, flow / pressure gauge, hardness tester, test block, microscope, other — each with default type, interval, accuracy (± value, ± % of reading) and Process Table section; intervals editable per kind in Settings (`kint`), all to confirm |
| Equipment `equip` (`CE-nnnn`) | tag, name, kind, type cal / verif / cert, furnace, chamber, loop, loc, make, model, serial, lo, hi, unit, accAbs, accPct, interval, ptRef, emis (non-contact), status inuse / spare / out / scrap |
| Record `cals` (`CR-nnnn`) | eq, type, date, due, by, ext (in-house / laboratory), lab, accred, certNo, method, `std{id, cert, due, trace}`, env, `pts[{nom, found, left}]`, adj none / adjusted / offset, offChk (offset confirmed / changed / removed), emis, `lbl{id, date, due, by, lim, chkBy}`, `rev{by, date, remarks}` (acceptance), `act{impact, contain, action, by, date}`, closed |
| Evaluation `evalCal` | error as found / as left vs the limit max(± value, ± % × reading); pass / found out of tolerance (oof) / out of tolerance (fail) / invalid (reference standard out of date, certification without certificate, no points); notes for points not covering the range, no accuracy set |
| State `eqState` | latest valid record: ok / soon / overdue / none / fail / spare / out; due = the record's due (not beyond the interval) |
| Offsets `offsets` (`OF-nnnn`) | eq, date, value, basis (calibration / SAT / TUS / other), ref, why, enteredBy, apprBy, apprDate, where, verBy, verDate, removed, removedWhy; `offIssues`: beyond `offMax` (crit), approval missing or not by an authorized person or after the entry (crit), other fields (warn), calibrated later without re-evaluation (warn) |
| Offset procedure `config/offproc` | no MWSPL-WI-CAL-02, rev, prep, appr, apprDate, change, **auth** (who may approve: "name — position" per line), **how** (how the approval is documented), dirty (changed since approval), log |
| Report gate `repMissing` (P3.2.5.2) / label `lblMissing` (P3.2.5.1) | as in WI-CAL-01 §6–7; acceptance by Settings `approvers` + `MWS.org.authorized()` |
| HTSA 3.2 `assess32` | register with intervals and references, current (also the Thermocouples module's test equipment via `MWS.tc.testEquip()`), non-contact devices, offset procedure approved and reviewed, authority and approval record stated, offsets comply, labels, reports, reaction; score nia without equipment or records |
| Records | `equip`, `cals`, `offsets`, `config/settings`, `config/offproc`; prefix `cal-`, else `localStorage` `mws-cal-local-v1` (also saved to the Google Drive folder) |
| API | `MWS.cal.stats()`, `summary()`, `chamber(f, ch)`, `hasData()`, `refresh()`, `closeModal()` |
| Data | JSON export / import, schedule CSV, import from CALOR (`hmt-reg` hardness testers, `eqq-reg` controller / recorder calibration dates), "Add the equipment of this plant", starter set-up |
