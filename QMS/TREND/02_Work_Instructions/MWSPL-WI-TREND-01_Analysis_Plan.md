# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## DETERMINING THE PARAMETERS (ANALYSIS PLAN)

| Doc No. | Rev | Issue date | Process Owner | Prepared | Approved |
|---|---|---|---|---|---|
| MWSPL-WI-TREND-01 | 00 | — | HT Manager | | |

### 1. Choose the parameters

Choose parameters that warn before a defect: characteristics the customer checks, those with a history of complaints, rework or scrap, and the process parameters that drive them. Start with:

| Kind | Parameter | Data from |
|---|---|---|
| Product | Surface hardness per part (mean of each test) | CALOR hardness register |
| Product | Tests not conforming per month (%) | CALOR hardness register |
| Product | Tensile strength (customer data), scrap kg per week | Entered |
| Product | Rework items per week | CALOR daily production |
| Process | Readings in tolerance (%) and mean deviation per thermocouple, per furnace and chamber | SCADA review |
| Process | Wall difference left − right per zone | SCADA review |
| Process | SAT difference per thermocouple position | Thermocouples (SAT records) |
| Process | Quench oil / water temperature and tests | CALOR quench media register |
| Process | Alarms per week | CALOR alarm log |

Every furnace in use has at least one process parameter.

### 2. Enter each parameter

| Step | Action | Who |
|---|---|---|
| 2.1 | Application → Trend analysis → Analysis plan → "Add parameter": name, data from, filter (part, furnace, chamber, thermocouple), unit. | HT Manager |
| 2.2 | Specification limits: empty = from the source (SCADA tolerance, SAT tolerance, hardness requirement); a value here replaces them. | Owner |
| 2.3 | Review interval (days), owner and the reaction rule (what a signal triggers). | Owner |
| 2.4 | For entered data: paste date and value lines (Excel columns work). | Owner |

### 3. Approve the plan

"Approve the plan" records the revision, the approver and the date. Adding, changing or removing a parameter afterwards marks the plan changed: approve it again.
