# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## THERMOCOUPLES AND PROTECTION TUBES

| Doc No. | Rev | Issue date | Process Owner | Prepared | Reviewed | Approved | Copy status |
|---|---|---|---|---|---|---|---|
| MWSPL-QP-TC-01 | 01 | — | Maintenance Head | | | | Uncontrolled until approved |

### 1. Purpose

To make sure every furnace temperature is measured by a thermocouple that was calibrated before use, is checked by a system accuracy test (SAT) at the interval of the Process Table, and sits in a protection tube that is checked or replaced to a documented preventive maintenance schedule (CQI-9 HTSA 3.3).

### 2. Scope

- **Equipment:** furnaces F-01 to F-04, hardening and tempering chambers, three zones each; two thermocouples per zone (TC-01 / TC-02 = zone 1 …; odd numbers on the right wall, even on the left), type K, used for control and recording through the SCADA.
- **Also covered:** test thermocouples and test instruments used for SATs; protection tubes of every thermocouple in use.
- **Not covered:** TUS (temperature uniformity survey) and instrument calibration of controllers and recorders (CALOR TUS and Equipment pages).

### 3. References

- AIAG CQI-9 4th Edition: HTSA 3.3; Section P3.1 (thermocouples and their accuracy tables, P3.1.3.3 reuse of type K / E thermocouples); Section P3.3 (SAT, P3.3.5 records); Process Tables A and E (controlled copy).
- MWSPL-WI-TC-01, -02, -03; MWSPL-F-TC-01, -02, -03, -04.
- CALOR → PYROMETRY → SAT, TUS, Equipment.

### 4. Terms and definitions

| Term | Meaning |
|---|---|
| Sensing element | The thermocouple wire in the furnace, identified by serial / batch no. and calibration certificate. A replacement is a new element in the same position. |
| Range of use | The temperatures the element works at: hardening chamber 700–960 °C, tempering chamber 500–900 °C unless set otherwise. |
| SAT | Comparison of the furnace reading (thermocouple + instrument) with a calibrated test thermocouple and test instrument placed next to its tip. SAT difference = furnace − (test + instrument correction + test TC correction). |
| Test thermocouple | A calibrated thermocouple used only for SATs, with its own certificate, correction and number of uses. |
| Protection tube | The sheath (metal or ceramic) around the element in the furnace. |
| PM schedule | Tube material, check interval and replacement interval of every thermocouple in use, approved and reviewed. |

### 5. Responsibility and authority

| Role | Responsibility | Authority |
|---|---|---|
| Maintenance Head | Owns this procedure, the register and the PM schedule; approves the PM schedule | Remove a thermocouple from use |
| Maintenance technician | Installs elements (WI-TC-01), runs SATs (WI-TC-02), checks tubes (WI-TC-03) | Stop a SAT when the furnace is not stable |
| HT Engineer | Reviews and approves SAT records; decides product impact of a failed SAT | Hold product |
| HT Manager | Approves the reaction to a failed SAT; reviews the HTSA 3.3 status monthly | Release held product |
| Quality Manager | Verifies the test equipment calibration system; audits HTSA 3.3 | — |

### 6. Procedure

```
   PLAN  register every element with its certificate, PM intervals, test equipment
     |
     v
   DO    install (calibrated before use) --> SAT every Process Table interval --> tube checks
     |
     v
   CHECK due list, SAT record completeness, insertion depth, HTSA 3.3 score
     |
     v
   ACT   failed SAT: cause, action, product impact, re-SAT; replace worn tubes and old elements
```

#### 6.0 Thermocouple specifications

The HT Manager and the Maintenance Head keep the list of thermocouple specifications used in the plant (Application → TC specifications, TS-nn). A specification states: type, use, make / supplier, tolerance class, sheath material and diameter, length, insertion depth, hot junction, calibration laboratory and calibrated range, range of use, protection tube material, tube check interval and tube life. Every thermocouple is set to the specification it is ordered to; a replacement keeps the specification of the thermocouple it replaces. A thermocouple that differs from its specification is listed on that page (information for the review, not a CQI-9 finding). When a specification is changed or a different one is fitted, the register is brought into line with "Update the register to a specification…" (choose the specification from the list and the thermocouples) (a preview of every change; calibration data stays as on each certificate unless chosen; each change is logged on the thermocouple). Only change the register where the thermocouple fitted really matches the default.

#### 6.1 Calibration before first use (P3.1)

1. Every element is bought with a calibration certificate covering at least its range of use, giving the largest error. The error must be within the accuracy of the P3.1 table for its type and use (application setting, confirm against the copy).
2. The element is registered before it is installed (WI-TC-01); the certificate date must be on or before the installation date.
3. An element without a valid certificate is not installed.

#### 6.2 System accuracy test (P3.3, Process Tables)

1. Control, monitoring and recording thermocouples get a SAT after installation and then at the Process Table interval (setting, default 90 days).
2. The test thermocouple and the test instrument must be in calibration on the test day; a reused type K / E test thermocouple has its insertion depth recorded and is not used shallower than before (P3.1.3.3, site rule).
3. Fail beyond the SAT tolerance (setting, default ±5.5 °C): the reaction plan of WI-TC-02 §4 applies.
4. Every SAT record holds the P3.3.5 content and is approved (F-TC-02).

#### 6.3 Protection tubes (PM schedule)

1. Each thermocouple in use has a tube material, a check interval and, where set, a replacement interval (F-TC-03). The Maintenance Head approves the schedule and reviews it yearly; a change after approval needs re-approval.
2. Tubes are checked on the interval (WI-TC-03). The element and its protection tube are one assembly: they are installed and replaced together, so the tube's installation date is the element's. A worn or cracked tube, or a tube past its replacement interval, is dealt with by replacing the thermocouple (element and tube, §6.4) before the next check.

#### 6.4 Replacement of elements

Elements are replaced at the end of their service life (setting, default 365 days), after a failed SAT when adjustment is not enough, on damage or protection tube failure (the tube is always replaced with the element). The old element is kept in the register as removed with its reason; the new one needs its certificate and a SAT before use.

**Pending replacements.** The application keeps one list of every element in use that has to be replaced (Thermocouples → Replacements, "Pending replacements"), with the reason:

| Reason | Listed while | Leaves the list when |
|---|---|---|
| SAT failed | The latest valid SAT failed and the reaction is not decided, or "Replace the thermocouple" was decided | The replacement is recorded, or a later valid SAT passes. If the reaction chooses another action (offset, recalibration, wiring repair, re-positioning), the element is not listed; the re-SAT confirms that action |
| Service life | From the reminder period before the life date | The replacement is recorded |
| Protection tube | The last check found the tube worn or cracked, or the tube life is passed | The replacement is recorded (element and tube together) |

The Maintenance Head reviews the list at least weekly and plans each replacement at the next opportunity; an element listed after a failed SAT is replaced before the furnace runs product on that thermocouple again, unless the reaction record justifies another action.

#### 6.5 Reaction plan: an element used beyond its service life

An element still in use after its service life (§6.4) is a nonconformity of this procedure. The application lists it as "Past its service life" (Thermocouples → Act) and keeps the reaction record on the element.

| Step | Action | Who | When |
|---|---|---|---|
| 1. Contain | Inform the HT Engineer. Run a **verification SAT** on the element (WI-TC-02) for a control, monitoring or recording thermocouple. | Technician / HT Engineer | The same shift it is found |
| 2. Decide on product | **SAT passes:** the measuring chain was still accurate and product is not affected; replace the element within the grace period (setting, default 7 days after the verification SAT). **SAT fails:** apply WI-TC-02 §4: hold the zone's product back to the last passing SAT and assess it; replace the element. | HT Engineer | After the SAT |
| 3. Replace | Fit a new certified element with its protection tube (WI-TC-01, §6.4). Record the replacement with reason "Service life reached", the controller offset decision, and a SAT of the fitted element before use. | Maintenance Head | Within the grace period |
| 4. Assess the window | Assess the product made from the life date to the replacement: the verification SAT, the SCADA reviews of the zone (do the two wall thermocouples still agree?), the hardness results of the lots in the window. Where possible read the old and the new element at the same temperature before the old one is removed: the difference is the drift. | HT Engineer / Quality Manager | Before the record is closed |
| 5. Correct the system | Find why the replacement was missed (due list not reviewed, no spare in stock, furnace not stopped) and correct it, e.g. a weekly review of the due list, a minimum stock of spare elements. | Maintenance Head | Owner and date on the record |
| 6. Record | On the element: found date, verification SAT, product impact assessment, cause, corrective action, owner, date. | HT Engineer | — |

HTSA 3.3 counts it as not met while there is no verification SAT, the verification SAT failed, the replacement is past the grace period, or a late-replaced element (last 365 days) has an incomplete record. The life and the grace period are site rules; confirm the type K usage and replacement limits against the controlled CQI-9 copy (P3.1, Process Table) and the customer requirements.

### 7. Records

| Record | Kept in | Retention |
|---|---|---|
| Thermocouple register with certificates (F-TC-01) | Application → Thermocouples | Life of the furnace + 1 year |
| SAT records (F-TC-02) | Application → SAT records | 3 years minimum, or as the customer requires |
| PM schedule and tube checks (F-TC-03) | Application → PM schedule, Tube checks | 3 years |
| Reaction records for elements used beyond their life (§6.5) | Application → Thermocouples (element record), Act | 3 years |
| Test equipment calibration records (F-TC-04) | Application → Test equipment | Life of the equipment + 3 years |
| HTSA 3.3 evidence | Printed from the application, filed with the self-assessment | Until the next assessment |

### 8. Revision history

| Rev | Date | Change | Approved |
|---|---|---|---|
| 00 | — | First issue | |
| 01 | — | §6.4 pending replacements (incl. a failed SAT without a replacement); §6.5 reaction plan for an element used beyond its service life | |
