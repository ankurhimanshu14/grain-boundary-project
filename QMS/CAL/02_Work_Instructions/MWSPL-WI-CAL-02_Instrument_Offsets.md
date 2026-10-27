# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## INSTRUMENT OFFSETS — THE OFFSET PROCEDURE (P3.2.3)

| Doc No. | Rev | Owner | Approved |
|---|---|---|---|
| MWSPL-WI-CAL-02 | 00 | HT Manager | |

### 1. Purpose
To control every offset or bias entered into a temperature controller, recorder, SCADA channel or other instrument to adjust its calibration, as required by CQI-9 P3.2.3 (HTSA 3.2).

### 2. When an offset may be used
Only to correct a measured, documented error of the measurement chain: a calibration (as found), a system accuracy test or a temperature uniformity survey. An offset never replaces the correction of a defect (damaged thermocouple, wiring, cold junction). An offset larger than the limit in the application (Settings, ± 3 °C 〈site limit, to confirm against P3.2.3〉) is not allowed: the cause is corrected.

### 3. Who may enter it
The Maintenance Head or a person the Maintenance Head instructs, only after the approval in §4.

### 4. Authority to approve
The people named in the application (Calibration → Offset procedure → "Authorized to approve offsets"): the HT Manager and the Quality Manager 〈names〉. Nobody else may approve an offset; the application accepts only these names.

### 5. How the approval is documented
On the offset approval record MWSPL-F-CAL-03 in the application, signed by the authorized person **before** the offset is entered; the offset is written in the controller parameter log book and the SCADA offset register with the F-CAL-03 number.

### 6. Steps

| Step | Action | Who |
|---|---|---|
| 1 | Record the basis: record no. of the calibration, SAT or TUS and the error found. | Maintenance Head |
| 2 | Request the approval: equipment, value, reason. | Maintenance Head |
| 3 | Approve on F-CAL-03 (name, date). | Authorized person |
| 4 | Enter the offset; write it in the log book / SCADA register. | Maintenance Head |
| 5 | Read the parameter back on the instrument and record the verification. | Second person |
| 6 | At every later calibration of the instrument: state whether the offset is confirmed, changed (new F-CAL-03) or removed. | Calibrator |
| 7 | Removal: record the date and the reason. | Maintenance Head |

### 7. Review
This procedure is reviewed every year (Settings) and after any change to the authority or the approval record.
