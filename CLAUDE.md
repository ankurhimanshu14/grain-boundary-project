# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Analysis of SCADA temperature exports (Excel: `Date, Time, SET-1/PV-1 … SET-6/PV-6`) from a 3-zone continuous gas-fired pusher furnace (6 thermocouples, 2 per zone, TC1/TC2 = Zone 1 … odd = left wall, even = right; 13 tray positions split 5/4/4), producing a CQI-9 style review and a printable report. `sample_data/` holds a real export.

## The three generations (only one is current)

- **`Pusher_Furnace_SCADA_Review.html` is the current app and the one the user iterates on.** One self-contained file (HTML + CSS + JS), edited directly: there is no build step and no bundler. It loads `xlsx.full.min.js` 0.18.5 and `Chart.js` 4.4.1 from cdnjs and works offline once those are cached; the page also embeds an example dataset (`SAMPLE`).
- `furnace_analyzer.html` (built from `standalone/src.html` with `python standalone/build.py`) and the Python/Streamlit app (`app.py`, `cqi9/`, `run_report.py`, `tests/`) are older, simpler versions. They do **not** have set-value changes, settling, hardening/tempering rules, furnace start/stop or the replacement register. Don't port new features to them unless asked. `README.md` describes only these older versions.

## Separate tool: `Thermocouple_SAT_PDCA.html`

A stand-alone register that runs thermocouple System Accuracy Tests (CQI-9 SAT) through a Plan → Do → Check → Act cycle. It is deliberately **separate from the SCADA review**: no shared code, no shared `localStorage` keys (it uses `tsat-pdca` for data and `tsat-theme`), no CDN scripts. Same single-file, no-build convention and the same colour tokens.

- Data `DB = {settings, sensors[], cycles[], seq}`; each cycle is one SAT `{id, sensor, stage, parent, plan, do, check, act, log}` with `stage` in `plan|do|check|act|closed`. `parent` links a re-SAT to the failed SAT.
- Do records `S.nRead` (default 30) timed pairs `do.readings = [{f, t}]`, one every `S.step` min from `do.start`, typed or pasted as two columns from Excel, with an optional timer that marks the reading due. Older records with single `do.furnace`/`do.test` are read by `readings(c)` as one pair.
- `calc(c)`: SAT difference = mean over the readings of furnace − (test + test instrument correction + test TC correction); `fail` beyond ±`tol`, `warn` beyond `warnPct` % of `tol`; any individual reading outside ±`tol` turns a pass into `warn`; a furnace range above `S.stab` is flagged. It also returns min/max/SD and the per-reading list for the Check chart. A test is invalid if the test instrument calibration had expired on the test day or the furnace was not stable (Check sends it back to Do).
- `missing(c)` is the stage gate used by `advance(c)`. A failed SAT closes only with root cause, action, product-impact assessment and a closed, passing re-SAT. A warning-band SAT needs a preventive action. Act can set a per-thermocouple interval, which `schedule()` uses for the next due date (last passing SAT + interval).
- Product at risk for a failure is a date window since the last passing SAT (`riskWindow`), in line with the time-window approach of the SCADA app.
- Test with Playwright: click `#b-example`, drive the dialog via `[data-p="stage.field"]` inputs and `[data-act="advance"]`, and read `window.__SAT`.

## Commands

```bash
pip install -r requirements.txt           # older Python version only
pytest                                    # all tests (tests/ cover only cqi9/)
pytest tests/test_analysis.py::test_load  # a single test
streamlit run app.py                      # older Streamlit app
python standalone/build.py                # rebuild furnace_analyzer.html from standalone/src.html
```

There are no tests or linter for the current app. To check it, drive it with headless Chromium (Playwright): open the file via `file://`, route the two cdnjs URLs to local copies when offline, upload an `.xlsx` with `set_input_files('#file', …)`, and read `window.__A` (the analysis result) and console/page errors.

## Architecture of `Pusher_Furnace_SCADA_Review.html`

Sections are marked by `/* ---------- name ---------- */` banners. Flow: `parseAOA` → `analyze(D)` → `observations(D,A)` → `render(D,A,O)` (`run()` chains them and is re-run on every setting change). `analyze` returns `A`, also exposed as `window.__A`.

- **Rows** are `{t, pv, raw, sp, ev, tr, off}`. `t` is a UTC-naive clock time in ms (no time zone anywhere, including the `datetime-local` inputs via `parseLocal`). `pv` has values outside 500–1000 °C replaced by `null`; `raw` keeps the original for the integrity checks; set values outside 500–1000 are also `null`.
- **`ev` is the value that is judged.** It is `pv` except `null` while the furnace is off (optional start/stop inputs `RUN`) or settling after a set-value change or furnace start (per-thermocouple, until back within tolerance for `S.hold` readings, capped at `S.settle` min). All evaluation (tolerance, excursions, statistics, heat map, Pareto, wall difference) must use `ev`; `pv` is for plotting and data-integrity counts.
- **Deviation is always `PV − the row's own SET`** (`r.sp[k]??tc.sp`), never against one fixed setpoint, because the set value changes during a day. Statistics (`statistics`/`statEntry`) are computed separately per set value (`A.stats.groups`), each with its own limits.
- **Process rules** come from the chart heading (`detectFurnace` → `FTYPE`: `hardening` or `tempering`, accepting the misspelling "TEMPRING") and the set value in force (`procAt`, `affects`, `ignoreWhy`; threshold `HI_SET` = 800 °C). Hardening furnace: set > 800 counts every zone except Zone 1 (preheat zone), set ≤ 800 counts no trays; tempering furnace: all zones always count. Variation is always reported; only whether an excursion *affects trays* (`event.aff`) changes, which drives the verdict, the "Product affected: time windows" table (`A.windows`) and the management summary.
- **The push interval was removed on purpose.** Affected product is expressed as time windows plus the zone's tray positions, never as tray counts or charge/discharge times. Don't reintroduce push-time maths.
- **Settings** live in `DEF`/`S` (persisted in `localStorage` key `pfsr-settings`); each key needs an `<input id="key">`. Other `localStorage` keys: `pfsr-repl` (thermocouple replacement register) and `pfsr-hist` (one summary per furnace and day, so replacements made between two exports can be judged by comparing days before and after; example data is never saved).
- **Management summary** (`mgmtSection`) is role-based (Director, Maintenance Head, Production Manager, HT Manager, Quality Manager); the owners in `pareto`/`priorityList` use the same role names.
- **Charts:** zone trend charts are Chart.js (`drawCharts`, with a plugin that shades off/settling periods); everything else is hand-built SVG strings. Chart scales are clamped to 500–1000 °C. Printing goes through `enterPrint`/`exitPrint`, which re-runs `run()` with `PRINTING` set; `.noprint` elements are hidden by the print CSS.

## Domain conventions to keep

- Valid and plotted temperature range is 500–1000 °C; anything outside is excluded and reported, never drawn.
- Default tolerance ±10 °C (CQI-9 furnace-class selector from the older apps was dropped here). An exact 800 °C set value is treated as the lower class (preheating/tempering).
- A thermocouple that reads 0 for the whole file is "offline" and is shown as such, not as zero data.
