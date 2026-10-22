# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## SPEC MODULE: PROCESS SPECIFICATIONS — MASTER LIST

**Basis:** AIAG CQI-9 4th Edition, HTSA question 1.6 ("a documented system to create process specifications for all active processes") and the Process Tables (Table A hardening & tempering, Table E annealing / normalizing; table letters to be confirmed against the controlled copy). IATF 16949 §8.5.1 (control plan, work instructions at the line) and §8.5.6 (control of changes) as context. PDCA: **Plan** (the specification is the plan for every heat treatment).

**Application:** CALOR → PROCESS → Specifications (`Process_Specifications.html`). The register, approvals, revisions, job cards and the HTSA 1.6 self-assessment are held there.

### Documents

| PDCA | Doc. No. | Title | Rev. | Date | File link |
|---|---|---|---|---|---|
| P | MWSPL-QP-SPEC-01 | Process specifications | 00 | — | [01_Procedure/MWSPL-QP-SPEC-01_Process_Specifications.md](01_Procedure/MWSPL-QP-SPEC-01_Process_Specifications.md) |
| P / D | MWSPL-WI-SPEC-01 | Write and approve a process specification | 00 | — | [02_Work_Instructions/MWSPL-WI-SPEC-01_Write_and_Approve_a_Specification.md](02_Work_Instructions/MWSPL-WI-SPEC-01_Write_and_Approve_a_Specification.md) |
| A | MWSPL-WI-SPEC-02 | Change a specification: new revision, implementation, obsolete | 00 | — | [02_Work_Instructions/MWSPL-WI-SPEC-02_Change_a_Specification.md](02_Work_Instructions/MWSPL-WI-SPEC-02_Change_a_Specification.md) |
| C | MWSPL-WI-SPEC-03 | Periodic review and HTSA 1.6 self-assessment | 00 | — | [02_Work_Instructions/MWSPL-WI-SPEC-03_Periodic_Review_and_Self-Assessment.md](02_Work_Instructions/MWSPL-WI-SPEC-03_Periodic_Review_and_Self-Assessment.md) |
| P | MWSPL-F-SPEC-01 | Process specification (content and layout) | 00 | — | [03_Formats/MWSPL-F-SPEC-01_Process_Specification.md](03_Formats/MWSPL-F-SPEC-01_Process_Specification.md) |
| A | MWSPL-F-SPEC-02 | Specification change review | 00 | — | [03_Formats/MWSPL-F-SPEC-02_Change_Review.md](03_Formats/MWSPL-F-SPEC-02_Change_Review.md) |
| P | MWSPL-F-SPEC-03 | Authorization to approve process specifications | 00 | — | [03_Formats/MWSPL-F-SPEC-03_Authorization_List.md](03_Formats/MWSPL-F-SPEC-03_Authorization_List.md) |
| C | MWSPL-F-SPEC-04 | Specification register and periodic review record | 00 | — | [03_Formats/MWSPL-F-SPEC-04_Register_and_Review.md](03_Formats/MWSPL-F-SPEC-04_Register_and_Review.md) |
| C / A | MWSPL-F-SPEC-05 | SPEC KPIs | 00 | — | [03_Formats/MWSPL-F-SPEC-05_KPI.md](03_Formats/MWSPL-F-SPEC-05_KPI.md) |
| — | — | Module description (application) | — | — | [04_Application/mwspl-spec-module.md](04_Application/mwspl-spec-module.md) |

### Where each requirement is met

| Requirement (HTSA 1.6, as checked by CALOR `assess16`) | Met by | Evidence in CALOR |
|---|---|---|
| Authorization to establish process specifications is defined | QP-SPEC-01 §5, §6.1; F-SPEC-03 | HT organization page: HT position and positions marked "authorized to approve process specifications" |
| The responsible heat treat person (HTSA 1.1) is authorized | QP-SPEC-01 §5 | HTSA 1.6 panel item (warning if not) |
| Specifications approved by an authorized person | WI-SPEC-01 step 4.3; F-SPEC-01 §9 | Approval gate refuses a non-authorized approver |
| Written process specifications for all active processes | QP-SPEC-01 §6.1, §6.3; WI-SPEC-03 §2 | Parts produced on the Daily production page in the last 90 days checked per furnace |
| All steps with their parameters and operating tolerances | F-SPEC-01 §4–§7; WI-SPEC-01 §3 | Steps table of each specification; approval gate |
| Available as work instruction, job card or recipe | QP-SPEC-01 §6.2; WI-SPEC-01 §5 | "Form at the line" field; job card printed from the register |
| Changes reviewed for continued conformity with customer requirements | WI-SPEC-02 §2; F-SPEC-02 | Change review fields, required for every revision after rev 0 |
| Changes documented with the date implemented and the approver | WI-SPEC-02 §3 | "Record implementation"; not recorded within 7 days of approval = not met |
| Periodic review | WI-SPEC-03 §1; F-SPEC-04 | Review due 365 days after the approval of the revision in force |

### First-cycle implementation checklist

- [ ] Mark the authorized positions on the HT organization page (holder and deputy of the HT position count automatically); print F-SPEC-03.
- [ ] Confirm Settings → Processes per furnace (F-01: IA, HT · F-02: IA, NORM, HT · F-03 / F-04: IA, NORM) and the defaults (tolerances, quench delay 30 s, dip 8.5 ± 0.5 min, transfer 18 min).
- [ ] Clear the example data; write a specification for every part produced in the last 90 days, per furnace (WI-SPEC-01).
- [ ] Approve them; record the implementation date within 7 days; print the job cards for the control panels.
- [ ] Check the HTSA 1.6 panel reads Satisfactory; file the HTSA 1.6 evidence PDF.
- [ ] Approve QP-SPEC-01, the three WIs and the formats; train the HT Engineer, HT Manager and shift supervisors (Procedures & WIs page).
- [ ] Start the KPI format F-SPEC-05 for the financial year.
