# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## QUENCH MODULE: APPLICATION DESCRIPTION

The module runs in the CALOR Quality System (`QMS/00_Integrated_Application/calor-quality-system.html`, "Quench media"). Source: `QMS/QUENCH/04_Application/mwspl-quench-module.js`. The rules are copied from CALOR's `Quench_Media_Testing.html`.

| Item | Value in the code |
|---|---|
| HTSA question | **3.14** (quench medium analyzed periodically for the characteristics of Process Table Section 5.0; tolerances specified by the supplier or the heat treater; results reviewed and documented; wording to confirm against the controlled copy) |
| Tanks `tanks` (`Q-nn`) | furnace, name, media oil / polymer / water, product, supplier, capacity, charged, active; defaults Q-01 F-01 water, Q-02 F-02 oil |
| Test plan `config/plan` | `items[{m, k, n, u, method, f (days), lo, hi, d, kind "ok", on, lab, src supplier / ht, ref}]` (defaults `DEF_PLAN`, typical values to confirm), rev, appr, apprDate, dirty, log; a change after approval marks it changed |
| Characteristics required `REQ` | oil: cooling curve, water content; polymer: concentration, cooling curve; water: temperature, contamination (salt concentration for brine); to confirm against Process Table Section 5.0 |
| Test `tests` (`QT-nnnn`) | tank, date, time, by, lab, report, vals, notes, `check{by, date, remarks}`, `act{contain, cause, action, detail, impact, by, date}`, closed, log |
| Judgement `judge` | out of limits / close to a limit (`warnPct` 10 %) / within limits / recorded; `retestOf`, `riskTxt` (window from the last passing result) |
| Schedule `schedule` | per tank and parameter: last result + frequency → ok / soon / overdue / never |
| Review | a test is reviewed when `check.by` and `check.date` are set; due within `reviewDays` (2) |
| Reaction gate `missingAct` | containment, cause, action, product impact, owner, date, a passing re-test of each failed parameter |
| HTSA 3.14 `assess314` | test plan approved, characteristics of Section 5.0 in the plan, tolerances with a source, periodic analysis per tank, results reviewed and documented, reaction; score nia / ns / s |
| Records | `tanks`, `tests`, `config/settings`, `config/plan`; prefix `quench-`, else `localStorage` `mws-quench-local-v1` |
| API | `MWS.quench.stats()`, `summary()`, `refresh()`, `closeModal()` |
