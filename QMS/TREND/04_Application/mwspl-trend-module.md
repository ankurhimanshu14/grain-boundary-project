# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## TREND MODULE: APPLICATION DESCRIPTION

The module runs in the CALOR Quality System (`QMS/00_Integrated_Application/calor-quality-system.html`, "Trend analysis"). Source: `QMS/TREND/04_Application/mwspl-trend-module.js`. The rules are copied from CALOR's `Trend_Analysis.html`.

| Item | Value in the code |
|---|---|
| HTSA question | **1.8** (a system to collect, analyze and react to product or process data over time; ongoing trend or historical analysis; the organization determines the parameters; wording to confirm against the controlled copy); reads 1.9 (SCADA reviews, `MWS.scada.history()`) and 3.3 (SAT records, `MWS.tc.satSeries()`) |
| Parameter `params` (`TP-nnnn`) | name, kind product / process, src (`SRC`: manual, scada, sat, hard, core, decarb, ncr, rework, quench, alarms), part, furnace, chamber, metric (intol, dev:k, sd:k, wall:z), pos (SAT position), tank, param, unit, lsl, usl, freq, owner, react, active, created, data[] ({d, v, note}, manual only), log |
| Sources | SCADA module reviews (not idle), Thermocouples module SAT records (valid SATs per position), CALOR registers via `MWS.calor.get` (`hmt-reg` hardness, `prod-reg` rework, `qmt-reg` quench, `fop-reg` alarms), or pasted data |
| Analysis `anal` | individuals chart over `winDays` (365); mean and control limits from the first `baseN` (20) points, σ = MR̄ ÷ 1.128, needs `minPts` (5); Cpk from the overall SD; signals: outside the specification (crit), beyond the control limits, 8 on one side, 6 rising / falling, 2 of 3 beyond 2σ (warn); open = after the last review; review due = last review (else created) + interval: ok / overdue / late; stale data |
| Review `reviews` (`RV-nnnn`) | param, date, by, findings, dec act / watch / none, reason, action, owner, due, done, verify, snap, log; gate `missRev` |
| Plan `config/plan` | rev, appr, apprDate, dirty, log; a parameter added / changed after the approval marks it changed; review every `planDays` (365) |
| HTSA 1.8 `assess18` | system (plan approved, unchanged, reviewed), parameters determined (product + process; a process parameter per furnace in Settings `furnaces`), data collected, ongoing analysis, reaction; score nia / ns / s |
| Records | `params`, `reviews`, `config/settings`, `config/plan`; shared store prefix `trend-`, else `localStorage` `mws-trend-local-v1` |
| API | `MWS.trend.stats()`, `summary()`, `refresh()`, `closeModal()` |
