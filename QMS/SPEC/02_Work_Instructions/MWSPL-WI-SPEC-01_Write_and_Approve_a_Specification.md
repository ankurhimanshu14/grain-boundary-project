# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## WRITE AND APPROVE A PROCESS SPECIFICATION

| Doc No. | Rev | Issue date | Parent procedure sections | Prepared | Approved |
|---|---|---|---|---|---|
| MWSPL-WI-SPEC-01 | 00 | — | MWSPL-QP-SPEC-01 §6.1, §6.2 | | |

**Records:** process specification F-SPEC-01 in the CALOR register (PS-nnnn), its log, the job card.

### 1. Before you start

| Step | Activity | Responsibility |
|---|---|---|
| 1.1 | Collect the inputs: customer drawing and specification (hardness, core, microstructure, decarburization, grain size, sampling), steel grade, part weight, the customer-specific requirements. | HT Engineer |
| 1.2 | Check that a specification for this part and process does not already exist: CALOR → PROCESS → Specifications, search the register by part no. (a duplicate part + process is flagged). | HT Engineer |
| 1.3 | Check which furnaces run the process (Settings → Processes per furnace): HT on F-01 (water) / F-02 (oil); IA on all; NORM on F-02, F-03, F-04. | HT Engineer |

### 2. Part data

| Step | Activity | Responsibility |
|---|---|---|
| 2.1 | Click **New specification**. Enter part no., part name, customer, drawing no., steel grade and process (HT / IA / NORM). | HT Engineer |
| 2.2 | Tick the approved furnaces. A furnace marked "(does not run this process)" cannot be approved. | HT Engineer |
| 2.3 | Enter the pieces per tray, the part weight (kg) and the tray / fixture. Check the load per tray against the tray maximum (HK trays 200 kg). | HT Engineer |

### 3. Thermal cycle with operating tolerances

| Step | Activity | Responsibility |
|---|---|---|
| 3.1 | Hardening chamber: set value and ± tolerance of zones 1, 2, 3 (zone 1 preheats; zones 2–3 austenitize above 800 °C for HT / IA; 700–750 °C preheat for NORM). | HT Engineer |
| 3.2 | Tempering chamber: set value and ± tolerance of zones 1, 2, 3 (tempering / isothermal hold; austenitizing for NORM). | HT Engineer |
| 3.3 | Push time (min) and its ± tolerance. Read the calculated time per zone, time between the chambers and time through the line shown by the page. | HT Engineer |
| 3.4 | HT: quench medium (must match the furnace's tank: F-01 water, F-02 oil), quenchant temperature range (both limits), quench delay maximum (default 30 s), dip time and ± tolerance (default 8.5 ± 0.5 min), agitation, transfer maximum. | HT Engineer |
| 3.5 | IA: controlled cooling time ± tolerance, method, target temperature ± tolerance. The page shows whether the cooling cycle (cooling + transfers) fits in the push time; a cycle that does not fit blocks the approval. | HT Engineer |
| 3.6 | NORM: transfer time and fan cooling after exit (required / not, time ± tolerance). | HT Engineer |
| 3.7 | Read the **Steps and parameters** box: every step must show its value with a tolerance, maximum or range. Fill anything listed as missing. | HT Engineer |

### 4. Requirements, review and approval

| Step | Activity | Responsibility |
|---|---|---|
| 4.1 | Product requirements: hardness min / max and scale, core, microstructure, decarburization limit (required), grain size, other, sampling (quantity and frequency, required), test method. | HT Engineer / Quality Manager |
| 4.2 | Enter "prepared by" and "reviewed by"; click **Save draft**. Read the advice (TUS range, quench tank, line practice) and correct where needed. | HT Engineer |
| 4.3 | The approver opens the draft, checks it against the inputs of step 1.1, enters "approved by" (only an authorized person is accepted) and the approval date, and clicks **Approve**. The page lists anything still missing; approval is refused until the list is empty and no critical advice remains. | HT Manager (authorized person) |

### 5. Make it available at the line

| Step | Activity | Responsibility |
|---|---|---|
| 5.1 | "Form at the line": state where it is available (work instruction / job card / SCADA-PLC recipe / other) and its reference. | HT Engineer |
| 5.2 | Print the **Job card** of the revision in force; put it at the control panel of each approved furnace; remove any older card. For a recipe, load the values into SCADA / PLC and check them against the job card. | Shift supervisor |
| 5.3 | Click **Record implementation**: date implemented (not before the approval, not in the future) and by whom. Do this within 7 days of the approval. | Shift supervisor / HT Engineer |

### Revision history

| Rev | Date | Change | Approved |
|---|---|---|---|
| 00 | — | First issue (draft) | |
