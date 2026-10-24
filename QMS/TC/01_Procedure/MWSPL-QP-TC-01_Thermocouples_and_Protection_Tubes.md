# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## THERMOCOUPLES AND PROTECTION TUBES

| Doc No. | Rev | Issue date | Process Owner | Prepared | Reviewed | Approved | Copy status |
|---|---|---|---|---|---|---|---|
| MWSPL-QP-TC-01 | 00 | — | Maintenance Head | | | | Uncontrolled until approved |

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

#### 6.0 Default thermocouple specification

The HT Manager and the Maintenance Head keep a default specification per chamber (Application → Default TC specifications): type, use, make / supplier, tolerance class, sheath material and diameter, length, insertion depth, hot junction, calibration laboratory and calibrated range, range of use, protection tube material, tube check interval and tube life. Every new thermocouple is ordered and registered to it; a replacement keeps the specification of the thermocouple it replaces. A thermocouple that differs is listed on that page (information for the review, not a CQI-9 finding).

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

### 7. Records

| Record | Kept in | Retention |
|---|---|---|
| Thermocouple register with certificates (F-TC-01) | Application → Thermocouples | Life of the furnace + 1 year |
| SAT records (F-TC-02) | Application → SAT records | 3 years minimum, or as the customer requires |
| PM schedule and tube checks (F-TC-03) | Application → PM schedule, Tube checks | 3 years |
| Test equipment calibration records (F-TC-04) | Application → Test equipment | Life of the equipment + 3 years |
| HTSA 3.3 evidence | Printed from the application, filed with the self-assessment | Until the next assessment |

### 8. Revision history

| Rev | Date | Change | Approved |
|---|---|---|---|
| 00 | — | First issue | |
