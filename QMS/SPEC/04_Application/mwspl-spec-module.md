# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## SPEC MODULE: APPLICATION DESCRIPTION

The application of this module is the CALOR page **`Process_Specifications.html`** in the repository root (tab PROCESS → Specifications in `CALOR.html`). It is not copied here: the build (`python suite/build.py`) reads it from the root, and a copy would drift. This file is the specification of the module for the QMS documents: the rules below are taken from the page's code, and the documents of this module must match them.

| Item | Value in the code |
|---|---|
| Storage key | `psr-reg` (data), `psr-view` (filter, local only); Google Drive file `psr-reg.json` when linked |
| Record | Specification `PS-nnnn`, `rev` 0…n, `status` draft / approved / obsolete, `revs[]` (snapshots of earlier revisions), `log[]` |
| Processes | `PROC`: HT hardening & tempering (Table A), IA isothermal annealing (Table E), NORM normalizing (Table E) |
| Processes per furnace | Setting `runs`: F-01: IA, HT · F-02: IA, NORM, HT · F-03: IA, NORM · F-04: IA, NORM; a furnace that does not run the process blocks the approval |
| Line layout | `posH` 5,4,4 · `posT` 4,4,4 · `xfer` 18 min (measured) · `ccXfer` 2 min (IA transfers) |
| Defaults for new specifications | tolerance ±10 °C, push ±0.5 min, quench delay 30 s, dip 8.5 ± 0.5 min, controlled cooling ±1 min, fan ±5 min |
| Forms at the line | `FORMS`: work instruction, job card, computer-based recipe (SCADA / PLC), other |
| Customer notification | `NOTIFY`: not required, notified, approval obtained (e.g. PPAP) |
| Approval gate (`missing`) | part no., name, steel grade, approved furnaces, part weight, every step with its tolerance (`paramMiss`), hardness scale, decarburization limit, form at the line, prepared / reviewed / approved by, approver authorized (`isAuth`), approval date; rev > 0: reason + change review (`chgMissing`); plus no critical advice |
| Authorization (`authList`) | In CALOR: HT organization API `authorized()` (holder and deputy of the HT position and of positions marked `specAuth`); standalone: Settings `auth` |
| Implementation | `implDate`, `implBy` (not before the approval, not in the future); HTSA 1.6 "not met" when missing more than `implDays` (7) days after the approval |
| Periodic review | `reviewDays` 365 after the approval of the revision in force; "due" `reviewSoon` 30 days before |
| Active processes | parts produced on the Daily production page in the last `activeDays` (90) per furnace |
| HTSA 1.6 score | `nia` no specification in force or an active part without one · `ns` any critical item · `s` otherwise |
| Outputs | specification PDF / Excel, job card, register Excel (incl. sheet "HTSA 1.6"), HTSA 1.6 evidence PDF |
| Used by | Hardness (requirements), Daily production (spec of each batch), Load build, CP & PFMEA (control plan rows), Equipment (class required), SCADA review (set values vs spec), Home |

**Not in the CALOR page (handled by the documents):** a "reviewed, no change" entry for the periodic review (F-SPEC-04); a printout of the authorization list (F-SPEC-03); the rule that an active part without a specification runs only on the HT Manager's written instruction (WI-SPEC-03 §2.2).

## Native module in the integrated application (pilot, 22-Oct-2026)

The same module is also built natively in the form of the MWSPL Integrated Application (the IATF 16949 application's UI/UX): **`QMS/00_Integrated_Application/calor-quality-system.html`**, one self-contained file with an Overview and the module "Process specifications". It is the pilot for moving CALOR into that form; until the user decides, the CALOR page above stays the application in use.

| Item | Native module |
|---|---|
| Source | `QMS/SPEC/04_Application/mwspl-spec-module.js` (module), `QMS/00_Integrated_Application/src/` (shell head, CSS, Overview); build `python QMS/00_Integrated_Application/build.py` (never edit the built file) |
| Views (PDCA) | Dashboard · **P** Register, Authorization & settings · **D** At the line (job cards, implementation) · **C** Review & HTSA 1.6, KPIs (financial year) · **A** Revisions · Rules, Documentation (this module's documents, embedded), Data |
| Records | collections `specs` (one document per specification `PS-nnnn`, same fields as `psr-reg`) and `config/settings`; shared record store when published with the `db` capability (collection prefix `spec-`), else this browser only (`localStorage` `mws-spec-local-v1`, banner "Local mode") |
| Rules | the same approval gate, change review, authorization, implementation and HTSA 1.6 rules as the CALOR page (copied from its code) |
| Added | **Record review (no change)** on the Review view: date, reviewer, note; it restarts the periodic review of the revision in force (the gap of WI-SPEC-03 §1.3 / F-SPEC-04 is closed in this module) |
| Job card | the revision in force with a **temperature–time sketch** below the specification (`profileSvg`): set value per zone with its tolerance band over the time in each zone (positions × push), the quench (dip) / controlled cooling / transfer between the chambers, and the cooling after exit; time axis from loading, total = time through the line. Ramps and cooling curves are schematic, not measured |
| Delete | armed button (second click confirms), never a browser dialog; only never-approved drafts |
| Data | export / import JSON (merge or replace), CSV of the register, **Import from CALOR** (reads `psr-reg` in the same browser), starter set-up (three example specifications), clear all (type CLEAR ALL) |
| Links | reads CALOR's `org-reg` (authorized names) and `prod-reg` (active parts) in the same browser when present |
| API | `MWS.spec.stats()`, `summary()`, `inForce()`, `closeModal()` (used by the Overview) |
| Test hook | `window.__SPECM` (`S`, `eff`, `calc`, `missing`, `assess16`, `review`, `kp`) |
