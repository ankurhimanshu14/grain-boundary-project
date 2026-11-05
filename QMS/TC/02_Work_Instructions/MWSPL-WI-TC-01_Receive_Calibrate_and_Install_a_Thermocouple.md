# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## RECEIVE, CALIBRATE AND INSTALL A THERMOCOUPLE

| Doc No. | Rev | Issue date | Used by | Prepared | Approved |
|---|---|---|---|---|---|
| MWSPL-WI-TC-01 | 00 | — | Maintenance technician | | |

### 1. Receiving

| Step | Action | Who |
|---|---|---|
| 1.1 | Check the type, tolerance class, sheath, diameter, length and hot junction against the order and the thermocouple specification it was ordered to (Application → TC specifications). | Store / maintenance |
| 1.2 | Check the calibration certificate: serial or batch no., calibrated range covering the range of use (from its specification in TC specifications, e.g. hardening 700–960 °C, tempering 500–900 °C), largest error within the accuracy shown in the application. | Maintenance technician |
| 1.2a | Record the certificate in the element (Application → Thermocouple register or store → open the element → Calibration): laboratory, certificate no., date, range, largest error, and every calibration point of the certificate as an observation (standard temperature, reading mV / °C, uncertainty) with the confidence level and k; enter "Certificate checked by / on". Print the calibration record (F-TC-05) when a paper copy is needed. | Maintenance technician |
| 1.3 | No certificate, or a certificate that does not meet 1.2: do not issue the element; return it or have it calibrated. | Maintenance Head |
| 1.3a | A delivery of several thermocouples is received as a purchase batch: Application → Thermocouple store → "Receive a batch…": supplier's batch no., supplier, order, specification and construction once for the batch, then one line per thermocouple (serial, and if known its own certificate no., calibration date, range, largest error; serials can be generated from a prefix). Then open each thermocouple and enter the calibration points of its own certificate (step 1.2a). | Store / maintenance technician |
| 1.4 | An element not fitted at once goes into the store: Application → Thermocouple store → "Add to store" (serial, type, specification, certificate, calibration date and range, largest error, store location, date received). A damaged one is recorded with the condition "Quarantine" and the reason. | Store / maintenance technician |

### 2. Registering

| Step | Action | Who |
|---|---|---|
| 2.1 | Application → Thermocouples → open the position (furnace, chamber, TC-01 … TC-06) → "Replace thermocouple…", or Thermocouple replacements → "Record replacement" from the due list (or "Register a thermocouple" for a new position). | Maintenance technician |
| 2.1a | Choose the reason: SAT failure (select the failed SAT that found it), service life reached, drift, physical damage, open circuit / erratic, used beyond its limit or atmosphere, TUS failure, protection tube failure, wrong type / not traceable, relocation or immersion-depth change, other. | Maintenance technician |
| 2.1b | Record whether the controller offset was reset for the new element (a "No" needs the reason in the notes). For a relocation or immersion-depth change record the TUS decision (TUS planned, or assessed as not required with the reason). Enter who replaced it. | Maintenance technician |
| 2.1c | Collect the element from the store against an issue: Application → Thermocouple store → "Issue from store…" (issued by, received by, work order, intended position); stores and the fitter sign the printed issue slip (F-TC-06). An element issued and not fitted is returned with "Return to store…" and the reason. | Store / maintenance technician |
| 2.2 | Take the element from the store ("Take the fitted element from the store": its serial, certificate and calibration come with it), or enter the serial, certificate no., calibration date, calibrated range and largest error. The calibration date must not be after the installation date. | Maintenance technician |
| 2.3 | Element and protection tube are replaced together: enter the material of the tube fitted with the new element (default the scheduled material). | Maintenance technician |

### 3. Installing

| Step | Action | Who |
|---|---|---|
| 3.1 | Isolate per the furnace safety rules; remove the old element together with its protection tube (they are replaced as one assembly). | Maintenance technician |
| 3.2 | Fit the new element in its new protection tube to the marked insertion depth; keep the polarity; tighten the head. | Maintenance technician |
| 3.3 | Check the reading on the SCADA against the other thermocouple of the zone. | Maintenance technician |
| 3.4 | Run the SAT (WI-TC-02) before the zone is used for product. Until then the application shows "SAT due after replacement" and Thermocouple replacements shows "SAT required" on the replacement record (TR-nnnn). | Maintenance technician |
