# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## SCADA MODULE: SCADA TEMPERATURE REVIEW — MASTER LIST

**Basis:** AIAG CQI-9 4th Edition, HTSA question **1.9** ("Is the heat treat monitoring system reviewed by Qualified Personnel?"): a second-level review, on top of the operators' review, by qualified personnel of the temperature charts, computer data logs and furnace / operator logs; at intervals not exceeding 24 hours; the review process documented, including for computerized data; out-of-control conditions and alarms detected, with a documented reaction. The review data also feed HTSA 1.8 (collect and analyse data over time). The tolerance comes from the process specifications (HTSA 1.6) and the pyrometry status from the thermocouples (HTSA 3.3). PDCA: **Check**.

**Why 1.9:** the SCADA log of the zone thermocouples is the computer data log of the heat treat monitoring system. Reviewing it once a day per chamber, by a qualified person, with every out-of-control condition answered, is exactly what 1.9 asks. Temperature control within the specification itself is a process-table requirement (Process Tables A and E); the review is the evidence that it was checked.

**Application:** CALOR Quality System (`QMS/00_Integrated_Application/calor-quality-system.html`) → SCADA review.

### Documents

| PDCA | Doc. No. | Title | Rev. | Date | File link |
|---|---|---|---|---|---|
| C | MWSPL-QP-SCADA-01 | Second-level review of SCADA temperature data | 00 | — | [01_Procedure/MWSPL-QP-SCADA-01_Second-Level_Review_of_SCADA_Temperature_Data.md](01_Procedure/MWSPL-QP-SCADA-01_Second-Level_Review_of_SCADA_Temperature_Data.md) |
| D | MWSPL-WI-SCADA-01 | Export and load a SCADA record | 00 | — | [02_Work_Instructions/MWSPL-WI-SCADA-01_Export_and_Load_a_SCADA_Record.md](02_Work_Instructions/MWSPL-WI-SCADA-01_Export_and_Load_a_SCADA_Record.md) |
| C / A | MWSPL-WI-SCADA-02 | Review and react | 00 | — | [02_Work_Instructions/MWSPL-WI-SCADA-02_Review_and_React.md](02_Work_Instructions/MWSPL-WI-SCADA-02_Review_and_React.md) |
| C | MWSPL-F-SCADA-01 | SCADA review record | 00 | — | [03_Formats/MWSPL-F-SCADA-01_SCADA_Review_Record.md](03_Formats/MWSPL-F-SCADA-01_SCADA_Review_Record.md) |
| — | — | Module description (application) | — | — | [04_Application/mwspl-scada-module.md](04_Application/mwspl-scada-module.md) |

### Where each requirement is met

| Requirement (HTSA 1.9) | Met by | Evidence in the application |
|---|---|---|
| Reviewed by qualified personnel | QP-SCADA-01 §5; Settings | List of qualified reviewers (Settings, and people meeting the HTSA 1.1 minimum in the HT organization module); a review by anyone else is not complete |
| Second-level review of computer data logs, charts, furnace and operator logs | QP-SCADA-01 §6.2; WI-SCADA-02 | Analysis of every zone thermocouple against its set value; notes field for the furnace / operator log and alarms checked |
| At intervals not exceeding 24 hours | QP-SCADA-01 §6.1 | Due 24 h after the last review per chamber; gaps over 30 days; "not running" records |
| Review process documented, also for computerized data | QP-SCADA-01; WI-SCADA-01 / 02 | Procedure named in Settings; rules of the analysis in the module |
| Detection of out-of-control conditions and alarms | WI-SCADA-02 §2 | Conditions found by the analysis (excursions, tolerance, offline / stuck thermocouples, gaps, settling, specification, SAT) |
| Documented reaction | WI-SCADA-02 §3; F-SCADA-01 | Each condition answered (reaction with owner and product disposition, or the record that handles it); closed with verification |

### First-cycle implementation checklist

- [ ] Name the qualified reviewers (Settings) or record their qualification in the HT organization module.
- [ ] Set the chambers in scope; confirm the tolerance, settling and interval settings.
- [ ] Approve the process specifications so the set values have their tolerances.
- [ ] From the next day on, export and review every chamber once a day (WI-SCADA-01 / 02); record "not running" for stopped furnaces.
- [ ] Check that the HTSA 1.9 panel reads Satisfactory after 30 days; file the evidence print.
