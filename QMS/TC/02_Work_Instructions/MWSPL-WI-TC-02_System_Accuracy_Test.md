# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## SYSTEM ACCURACY TEST (SAT)

| Doc No. | Rev | Issue date | Used by | Prepared | Approved |
|---|---|---|---|---|---|
| MWSPL-WI-TC-02 | 00 | — | Maintenance technician, HT Engineer | | |

### 1. When

- After every installation of an element, before product.
- At the Process Table interval (application setting, default 90 days): see Application → Due list.
- After a repair of the measuring loop (wiring, compensating cable, instrument).

### 2. Preparation

| Step | Action | Who |
|---|---|---|
| 2.1 | Take a test instrument and a test thermocouple whose calibration is in date (Application → Test equipment). Note their corrections at the test temperature. | Technician |
| 2.2 | The furnace runs at a normal set point and is stable (no set value change in the last 30 minutes). | Technician |
| 2.3 | Insert the test thermocouple next to the tip of the thermocouple under test (CQI-9 P3.3; distance to confirm against the copy). | Technician |
| 2.4 | **Type K or E test thermocouple:** measure and record the insertion depth in mm. When the test thermocouple was used before, insert it at least as deep as its deepest earlier use (P3.1.3.3, site rule); the application shows the earlier depth. | Technician |

### 3. Test and record (F-TC-02, P3.3.5)

| Step | Action | Who |
|---|---|---|
| 3.1 | Note the start time. For **30 minutes**, read the furnace instrument (SCADA) and the test instrument at the same moment **every minute** (30 pairs; minutes and interval are settings of the application). Do not change the set value during the test. | Technician |
| 3.2 | Application → SAT records → "Record a SAT": thermocouple, date, time, technician, set point, instrument, test TC, depth, the 30 furnace / test reading pairs, both corrections (0 if none). A record with fewer pairs is incomplete. | Technician |
| 3.2a | **Furnace readings from the SCADA:** export the SCADA log of the test day and load it (SCADA review → Load & analyse, or "Load the SCADA export of the test day" in the SAT dialog), then press "Fill furnace readings from SCADA": the application takes the PV of the thermocouple's column (TC-3 → PV-3) of that furnace and chamber at each reading time. Readings not in the log stay empty and are typed. The test readings are typed or pasted from the test instrument. | Technician |
| 3.3 | The application calculates the SAT difference = mean over the readings of furnace − (test + instrument correction + test TC correction) and the result; a single reading outside the tolerance makes a pass a warning, and a furnace range above the stability limit (5 °C) is flagged. A record with test equipment out of calibration is invalid: repeat the test. | Application |
| 3.4 | The HT Engineer reviews and approves the record (name and date). | HT Engineer |

### 4. Failed SAT (beyond the tolerance)

| Step | Action | Who |
|---|---|---|
| 4.1 | Inform the HT Engineer at once; hold the product of the zone back to the last passing SAT until assessed. | Technician |
| 4.2 | Find the cause (element drift, wiring, instrument); correct (adjust offset, replace element per WI-TC-01). | Technician / Maintenance Head |
| 4.3 | Record cause, action, product impact, owner and date on the SAT record. | HT Engineer |
| 4.4 | Run a re-SAT; the failure stays open until a passing SAT (or the replacement's SAT) is recorded. | Technician |
