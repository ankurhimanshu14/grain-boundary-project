# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## EXPORT AND LOAD A SCADA RECORD

| Doc No. | Rev | Issue date | Used by | Prepared | Approved |
|---|---|---|---|---|---|
| MWSPL-WI-SCADA-01 | 00 | — | Shift supervisor, reviewer | | |

| Step | Action | Who |
|---|---|---|
| 1 | At 08:00 (start of the production day), open the SCADA report "ALL TEMP" of each chamber for the previous 24 hours. | Shift supervisor |
| 2 | Export it to Excel (Date, Time, SET-1 / PV-1 … SET-6 / PV-6). Keep the heading, e.g. "FURNACE-2 TEMPRING FURNACE ALL TEMP": it tells the application the furnace and chamber. | Shift supervisor |
| 3 | Save it in the SCADA archive as <furnace>_<chamber>_<date>.xlsx. | Shift supervisor |
| 4 | Application → SCADA review → Load & analyse → choose the file. Check the furnace and chamber shown; correct them if the heading was not recognised. | Reviewer |
| 5 | Read the findings and the zone charts; then "Record the second-level review" (WI-SCADA-02). | Reviewer |
