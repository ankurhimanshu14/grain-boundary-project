# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## TC MODULE: THERMOCOUPLES AND PROTECTION TUBES — MASTER LIST

**Basis:** AIAG CQI-9 4th Edition, HTSA question 3.3 ("Are thermocouples and protection tubes checked or replaced per Process Tables?"), Section P3.1 (thermocouples, accuracy tables, P3.1.3.3 reuse of type K / E test thermocouples), Section P3.3 (system accuracy test, P3.3.5 SAT records) and the Process Tables A and E (SAT interval). Section and table numbers and the figures used in the application are to be confirmed against the controlled copy. PDCA: **Do / Check** (the measuring system behind every furnace temperature).

**Application:** CALOR Quality System (`QMS/00_Integrated_Application/calor-quality-system.html`) → Thermocouples. The register of thermocouples, test equipment, SAT records, protection tube checks, the PM schedule and the HTSA 3.3 self-assessment are held there. CALOR's SAT page (`Thermocouple_SAT_PDCA.html`) can be imported into it.

### Documents

| PDCA | Doc. No. | Title | Rev. | Date | File link |
|---|---|---|---|---|---|
| P | MWSPL-QP-TC-01 | Thermocouples and protection tubes | 01 | — | [01_Procedure/MWSPL-QP-TC-01_Thermocouples_and_Protection_Tubes.md](01_Procedure/MWSPL-QP-TC-01_Thermocouples_and_Protection_Tubes.md) |
| P / D | MWSPL-WI-TC-01 | Receive, calibrate and install a thermocouple | 00 | — | [02_Work_Instructions/MWSPL-WI-TC-01_Receive_Calibrate_and_Install_a_Thermocouple.md](02_Work_Instructions/MWSPL-WI-TC-01_Receive_Calibrate_and_Install_a_Thermocouple.md) |
| D / C | MWSPL-WI-TC-02 | System accuracy test (SAT) | 00 | — | [02_Work_Instructions/MWSPL-WI-TC-02_System_Accuracy_Test.md](02_Work_Instructions/MWSPL-WI-TC-02_System_Accuracy_Test.md) |
| D / A | MWSPL-WI-TC-03 | Protection tube check and replacement | 00 | — | [02_Work_Instructions/MWSPL-WI-TC-03_Protection_Tube_Check_and_Replacement.md](02_Work_Instructions/MWSPL-WI-TC-03_Protection_Tube_Check_and_Replacement.md) |
| P | MWSPL-F-TC-01 | Thermocouple register | 00 | — | [03_Formats/MWSPL-F-TC-01_Thermocouple_Register.md](03_Formats/MWSPL-F-TC-01_Thermocouple_Register.md) |
| C | MWSPL-F-TC-02 | SAT record | 00 | — | [03_Formats/MWSPL-F-TC-02_SAT_Record.md](03_Formats/MWSPL-F-TC-02_SAT_Record.md) |
| P / D | MWSPL-F-TC-03 | Protection tube PM schedule and check record | 00 | — | [03_Formats/MWSPL-F-TC-03_Protection_Tube_PM_Schedule_and_Check.md](03_Formats/MWSPL-F-TC-03_Protection_Tube_PM_Schedule_and_Check.md) |
| P | MWSPL-F-TC-04 | Test equipment calibration record | 00 | — | [03_Formats/MWSPL-F-TC-04_Test_Equipment_Calibration_Record.md](03_Formats/MWSPL-F-TC-04_Test_Equipment_Calibration_Record.md) |
| — | — | Module description (application) | — | — | [04_Application/mwspl-tc-module.md](04_Application/mwspl-tc-module.md) |

### Where each requirement is met

| Requirement (HTSA 3.3) | Met by | Evidence in the application |
|---|---|---|
| Thermocouples calibrated before first use, within the range of use, meeting the P3.1 accuracy | QP-TC-01 §6.1; WI-TC-01 §2–§3; F-TC-01 | Calibration fields of each thermocouple; issue shown when the certificate is missing, dated after installation, does not cover the range of use or exceeds the accuracy |
| Control, monitoring and recording thermocouples SAT checked per the Process Table and P3.3 | QP-TC-01 §6.2; WI-TC-02 | SAT state per thermocouple (none / ok / due soon / overdue / failed); due list |
| Insertion depth of reused type K / E test thermocouples documented (P3.1.3.3) | WI-TC-02 §2.4; F-TC-02 | Depth required on the SAT record for a type K / E test TC; a reuse shallower than before is flagged |
| SAT records meet P3.3.5 | WI-TC-02 §3; F-TC-02; F-TC-04 | Record completeness gate, validity (test equipment in calibration), approval |
| Sensing elements replaced at their service life; an element used beyond it handled by a reaction plan (site schedule) | QP-TC-01 §6.4, §6.5 | Due list; "Elements past their service life" (Act): verification SAT, replace-by date, product impact of the window, cause, corrective action |
| Protection tubes checked or replaced to a documented PM schedule | QP-TC-01 §6.3; WI-TC-03; F-TC-03 | Approved PM schedule (rev, date, approver), tube interval per thermocouple, check rounds, worn tubes open until replaced |

### First-cycle implementation checklist

- [ ] Confirm the settings against the controlled CQI-9 copy: SAT interval and tolerance, accuracy tables (field and test thermocouples, base and noble metal), test TC reuse rule, element life.
- [ ] Register every thermocouple of F-01 … F-04 (TC-01 … TC-06 per chamber, odd = right wall, even = left wall) with its certificate (WI-TC-01); import the CALOR SAT register where it exists.
- [ ] Register the test thermocouples and test instruments with their calibration record (make / model, range, least count, certificate observations with error and uncertainty, F-TC-04) and due dates.
- [ ] Enter the protection tube material and intervals; approve the PM schedule (F-TC-03).
- [ ] Bring every SAT and tube check up to date; close the reactions to failed SATs.
- [ ] Check that the HTSA 3.3 panel reads Satisfactory; file the evidence print.
- [ ] Approve QP-TC-01, the three WIs and the formats; train the maintenance technicians and the HT Engineer.
