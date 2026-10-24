# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## RECEIVE, CALIBRATE AND INSTALL A THERMOCOUPLE

| Doc No. | Rev | Issue date | Used by | Prepared | Approved |
|---|---|---|---|---|---|
| MWSPL-WI-TC-01 | 00 | — | Maintenance technician | | |

### 1. Receiving

| Step | Action | Who |
|---|---|---|
| 1.1 | Check the type (K), size and length against the order and the furnace position. | Store / maintenance |
| 1.2 | Check the calibration certificate: serial or batch no., calibrated range covering the range of use (hardening 700–960 °C, tempering 500–900 °C), largest error within the accuracy shown in the application. | Maintenance technician |
| 1.3 | No certificate, or a certificate that does not meet 1.2: do not issue the element; return it or have it calibrated. | Maintenance Head |

### 2. Registering

| Step | Action | Who |
|---|---|---|
| 2.1 | Application → Thermocouples → open the position (furnace, chamber, TC-01 … TC-06) → "Replace thermocouple…", or Thermocouple replacements → "Record replacement" from the due list (or "Register a thermocouple" for a new position). | Maintenance technician |
| 2.1a | Choose the reason: SAT failure (select the failed SAT that found it), service life reached, drift, physical damage, open circuit / erratic, used beyond its limit or atmosphere, TUS failure, protection tube failure, wrong type / not traceable, relocation or immersion-depth change, other. | Maintenance technician |
| 2.1b | Record whether the controller offset was reset for the new element (a "No" needs the reason in the notes). For a relocation or immersion-depth change record the TUS decision (TUS planned, or assessed as not required with the reason). Enter who replaced it. | Maintenance technician |
| 2.2 | Enter the serial, certificate no., calibration date, calibrated range and largest error. The calibration date must not be after the installation date. | Maintenance technician |
| 2.3 | Element and protection tube are replaced together: enter the material of the tube fitted with the new element (default the scheduled material). | Maintenance technician |

### 3. Installing

| Step | Action | Who |
|---|---|---|
| 3.1 | Isolate per the furnace safety rules; remove the old element together with its protection tube (they are replaced as one assembly). | Maintenance technician |
| 3.2 | Fit the new element in its new protection tube to the marked insertion depth; keep the polarity; tighten the head. | Maintenance technician |
| 3.3 | Check the reading on the SCADA against the other thermocouple of the zone. | Maintenance technician |
| 3.4 | Run the SAT (WI-TC-02) before the zone is used for product. Until then the application shows "SAT due after replacement" and Thermocouple replacements shows "SAT required" on the replacement record (TR-nnnn). | Maintenance technician |
