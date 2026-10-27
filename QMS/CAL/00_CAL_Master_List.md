# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## CAL MODULE: CALIBRATION OF PROCESS AND TEST EQUIPMENT — MASTER LIST

**Basis:** AIAG CQI-9 4th Edition, HTSA question 3.2 ("Are process equipment calibrations, verifications, and certifications current?"): calibrations, verifications and certifications of the process equipment performed at the regular intervals of the applicable Process Tables, Sections 1.0 and 2.0; non-contact thermometry devices calibrated per the Process Tables; a documented offset procedure as defined in P3.2.3, which names who has the authority to approve the use of offsets and how the approval is documented; offsets or bias applied for instrumentation calibration adjustment complying with P3.2.3; calibration labels per P3.2.5.1; calibration reports per P3.2.5.2. Section numbers, intervals, accuracies and the offset limit to confirm against the controlled copy. PDCA: **Plan / Do / Check / Act** (pyrometry and measuring equipment).

**Application:** CALOR Quality System (`QMS/00_Integrated_Application/calor-quality-system.html`) → Calibration. The equipment register and schedule, the calibration records with their labels and reports, the offsets, the offset procedure's authority and the HTSA 3.2 self-assessment are held there. The test thermocouples and test instruments stay in the Thermocouples module (HTSA 3.3) and are counted here.

### Documents

| PDCA | Doc. No. | Title | Rev. | Date | File link |
|---|---|---|---|---|---|
| P | MWSPL-QP-CAL-01 | Calibration of process and test equipment | 00 | — | [01_Procedure/MWSPL-QP-CAL-01_Calibration_of_Process_and_Test_Equipment.md](01_Procedure/MWSPL-QP-CAL-01_Calibration_of_Process_and_Test_Equipment.md) |
| D / C | MWSPL-WI-CAL-01 | Calibration, labels and reports | 00 | — | [02_Work_Instructions/MWSPL-WI-CAL-01_Calibration_Labels_and_Reports.md](02_Work_Instructions/MWSPL-WI-CAL-01_Calibration_Labels_and_Reports.md) |
| P / D | MWSPL-WI-CAL-02 | Instrument offsets (the offset procedure, P3.2.3) | 00 | — | [02_Work_Instructions/MWSPL-WI-CAL-02_Instrument_Offsets.md](02_Work_Instructions/MWSPL-WI-CAL-02_Instrument_Offsets.md) |
| P | MWSPL-F-CAL-01 | Equipment register and calibration schedule | 00 | — | [03_Formats/MWSPL-F-CAL-01_Equipment_Register_and_Schedule.md](03_Formats/MWSPL-F-CAL-01_Equipment_Register_and_Schedule.md) |
| D / C | MWSPL-F-CAL-02 | Calibration report | 00 | — | [03_Formats/MWSPL-F-CAL-02_Calibration_Report.md](03_Formats/MWSPL-F-CAL-02_Calibration_Report.md) |
| D | MWSPL-F-CAL-03 | Offset approval record | 00 | — | [03_Formats/MWSPL-F-CAL-03_Offset_Approval_Record.md](03_Formats/MWSPL-F-CAL-03_Offset_Approval_Record.md) |
| D | MWSPL-F-CAL-04 | Calibration label | 00 | — | [03_Formats/MWSPL-F-CAL-04_Calibration_Label.md](03_Formats/MWSPL-F-CAL-04_Calibration_Label.md) |
| — | — | Module description (application) | — | — | [04_Application/mwspl-cal-module.md](04_Application/mwspl-cal-module.md) |

### Where each requirement is met

| Requirement (HTSA 3.2) | Met by | Evidence in the application |
|---|---|---|
| Calibrations, verifications, certifications at the intervals of the Process Tables 1.0 / 2.0 | QP-CAL-01 §6.1–6.3; F-CAL-01 | Register with type, interval (not longer than the frequency per kind) and Process Table reference; due list; overdue / never calibrated flagged |
| Non-contact thermometry calibrated | QP-CAL-01 §6.4; WI-CAL-01 §5 | Infrared / optical pyrometers in the register with their interval; emissivity setting on the report |
| Documented offset procedure (P3.2.3) | WI-CAL-02 | Offset procedure approval and review (Offset procedure view) |
| Authority to approve offsets and how the approval is documented | WI-CAL-02 §4–5 | Named authority and approval record in the application; offset records accept only those names |
| Offsets comply with P3.2.3 | WI-CAL-02 §6; F-CAL-03 | Each offset: basis record, reason, value within the limit, approval before entry, where documented, read-back, re-evaluation at each calibration |
| Calibration labels per P3.2.5.1 | WI-CAL-01 §6; F-CAL-04 | Label elements checked and recorded with each calibration; label print |
| Calibration reports per P3.2.5.2 | WI-CAL-01 §7; F-CAL-02 | Report gate (identification, standard and traceability, as-found / as-left, accuracy, adjustment, signature) and acceptance |

### First-cycle implementation checklist

- [ ] Confirm the frequencies per kind, the accuracies, the offset limit and the label / report elements against the controlled CQI-9 copy (Settings) and approve QP-CAL-01, the WIs and the formats.
- [ ] Register every piece of process and test equipment ("Add the equipment of this plant", then adapt) with the Process Table item (F-CAL-01).
- [ ] Enter the latest calibration of each item with its points as found / as left, label check and report acceptance (F-CAL-02, F-CAL-04).
- [ ] Name the people authorized to approve offsets and how the approval is documented; approve the offset procedure (WI-CAL-02).
- [ ] Record every offset in use on the controllers and SCADA channels (F-CAL-03); remove or approve the ones without approval.
- [ ] Close every out-of-tolerance finding with the product assessment; check that HTSA 3.2 reads Satisfactory; file the evidence.
