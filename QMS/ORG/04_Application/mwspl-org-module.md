# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## ORG MODULE: APPLICATION DESCRIPTION

The module runs in the CALOR Quality System (`QMS/00_Integrated_Application/calor-quality-system.html`, "HT organization"). Source: `QMS/ORG/04_Application/mwspl-org-module.js`; build `python QMS/00_Integrated_Application/build.py`. The rules are copied from the CALOR page `Organization_Personnel.html` (its HTSA 1.1 part); the documents of this module must match them.

| Item | Value in the code |
|---|---|
| Records | collections `positions` (`POS-nn`), `people` (`P-nnn`), `config/settings` (plant, minYears 5, reviewDays 365), `config/chart` (rev, apprDate, appr, dirty, log); shared record store (prefix `org-`) or this browser (`mws-org-local-v1`) |
| Position | title, department, reports to, holder, deputy, full-time / part-time, on / off site, heat treat position (one only), dedicated, authorized to approve process specifications, job description `jd` with revisions |
| Job description gate `jdMissing` | purpose, responsibilities, education, minimum years, prepared / approved by, reason for a change after rev 0; heat treat position also knowledge and minimum ≥ 5 years |
| Organization chart | from the reporting lines (loops refused); approval with revision; structural change after approval marks it changed; review after 365 days |
| Qualification `qual` | heat treat experience = dated heat treat entries + service here since joining (when ticked), overlaps once; metallurgical education = years of entries marked metallurgical; met when ≥ 5 years or both together ≥ 5 with both > 0 |
| HTSA 1.1 `assess` | heat treat position defined and filled, dedicated, full-time, on site, in the approved chart, approved job description with education / knowledge / minimum years, holder qualified, deputy as a note; score needs immediate action (no position, vacant, holder below the minimum), not satisfactory, satisfactory |
| Link to SPEC | `MWS.org.authorized()` (holder and deputy of the heat treat position and of authorized positions) is the Specifications module's list of approvers |
| Data | export / import JSON, people CSV, import from CALOR (`org-reg`), starter set-up, clear all |
| Not here (CALOR only) | HTSA 1.17 key functions (primary / backup, key function list) |
