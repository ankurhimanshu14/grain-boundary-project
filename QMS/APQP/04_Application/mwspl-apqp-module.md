# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## APQP MODULE: APPLICATION DESCRIPTION

The module runs in the CALOR Quality System (`QMS/00_Integrated_Application/calor-quality-system.html`, "Quality planning"). Source: `QMS/APQP/04_Application/mwspl-apqp-module.js`. CALOR itself has no page for HTSA 1.2; this module is new.

| Item | Value in the code |
|---|---|
| HTSA question | **1.2** (documented advanced quality planning procedure; feasibility study performed and internally approved for each part; part families as defined by the heat treater; wording to confirm against the controlled copy); uses 1.1 (who may approve, `MWS.org.authorized()`) and 1.6 (specifications in force, `MWS.spec.inForce()`) |
| Procedure | `config/proc` {no, rev, prep, appr, apprDate, change, log}; review every `reviewDays` (365) |
| Study `studies` (`AQ-nnnn`) | scope part / family (`famName`, `famDef`, `parts`), part, name, drawing, drawRev, customer, grade, proc HT / IA / NORM, furnaces, source, started, target, vol, pcs, wt, push, `csr{ref, by, date, notes}`, `ans{key: {a yes/no/na, note}}` (12 questions `FEAS`, quench only HT, controlled cooling only IA), conc feasible / changes / not, changes, risks, team, prep, appr, apprDate, rev, status draft / approved, revs, change, `del{flow, pfmea, cp, spec, lb, trial, ppap: {st open/done/na, ref, date, note}}`, chgDone, `rel{by, date, ref}`, `cancel{date, why}`, log |
| Hints `autoHints` | furnaces that do not run the process (Settings `runs`), quench tank per furnace (F-01 water, F-02 oil), net load per tray vs `trayKg` (200), furnace hours a month vs `hrsMonth` (600) and `capPct` (85 %) |
| Gate `feasMissing` | identification, customer requirements, every question answered (note on No / N.A.), conclusion with changes / reason, "feasible as specified" not with a No, team ≥ 2, prepared, approved by an approver (`approvers()` = Settings + HT organization), reason for a revision |
| Release `relMissing` | approved feasible study, changes confirmed, every output done (reference) or N.A. (note), a specification in force for each part (when the Specifications module has data), released by and date |
| Coverage `coverage` | parts with a specification in force + parts in studies (a family covers its parts; cancelled-only parts without a specification drop out; N/A never a part) |
| HTSA 1.2 `assess12` | procedure, a study for each part, internally approved, approver allowed, part families, feasible before production, customer requirements, planning completed; score nia / ns / s |
| Records | `studies`, `config/settings`, `config/proc`; shared store prefix `apqp-`, else `localStorage` `mws-apqp-local-v1` |
| API | `MWS.apqp.stats()`, `summary()`, `feasible()`, `refresh()`, `closeModal()` |
