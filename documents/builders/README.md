# Document builders

Scripts that generate the Word and Excel documents in `documents/`. Edit the script, run it, then check the result (render to PDF and look at every page; for Excel run a recalculation and check for formula errors).

| Script | Output |
|---|---|
| `WI-HT-01.js` | `WI-HT-01_General_Operating_Procedure.docx` |
| `WI-HT-02.js` | `WI-HT-02_Furnace_Start-up.docx` |
| `WI-HT-03.js` | `WI-HT-03_Furnace_Shut-down.docx` |
| `SOP-HT-08.js` | `SOP-HT-08_Product_Segregation.docx` |
| `SOP-HT-11.js` | `SOP-HT-11_Emergency_Response.docx` |
| `WI-HT-12.js` | `WI-HT-12_Burner_Management_System.docx` |
| `F-HT-02A_03A_checksheets.py` | `Furnace_Startup_Shutdown_Checksheet.xlsx` |
| `F-MT-01_02_predictive_maintenance.py` | `Furnace_Predictive_Maintenance_Checksheet.xlsx` |

- Word: `node <script>.js` (needs the npm package `docx`). Excel: `python <script>.py` (needs `openpyxl`), then recalculate the workbook (e.g. open and save it in Excel, or LibreOffice headless) so the formula results are stored.
- The scripts write to `/home/user/grain-boundary-project/documents/`; change the path at the end of a script when running it elsewhere.
- The later Word scripts were made by copying an earlier one (WI-HT-02 from WI-HT-01, and so on), so their helper functions are the same.
