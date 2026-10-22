# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## PROCESS SPECIFICATIONS

| Doc No. | Rev | Issue date | Process Owner | Prepared | Reviewed | Approved | Copy status |
|---|---|---|---|---|---|---|---|
| MWSPL-QP-SPEC-01 | 00 | — | HT Manager | | | | Uncontrolled until approved |

### 1. Purpose

To establish, approve, make available, change and review a written process specification for every part and process heat treated, so that every tray is processed to defined parameters with operating tolerances (CQI-9 HTSA 1.6).

### 2. Scope

- **Site:** Bhiwadi, heat treatment shop (the only site in scope).
- **Equipment:** continuous gas-fired pusher furnaces F-01 to F-04 (hardening chamber 3 zones / 13 tray positions; controlled cooling chamber; tempering chamber 3 zones / 12 tray positions).
- **Processes:** hardening & tempering (HT: F-01 water quench, F-02 oil quench), isothermal annealing (IA: all furnaces), normalizing (NORM: F-02, F-03, F-04). Full annealing is not yet covered by a specification.
- **Not in scope:** the steel supplier's and the customer's own specifications (they are inputs).

### 3. References

- AIAG CQI-9 4th Edition, HTSA 1.6 and Process Tables A / E (controlled copy).
- IATF 16949:2016 §8.5.1, §8.5.6; customer-specific requirements.
- MWSPL-WI-SPEC-01, -02, -03; MWSPL-F-SPEC-01 to -05.
- WI-HT-01 General operating procedure; Control plans and PFMEAs (CALOR → CP & PFMEA); SOP-QA-12 Rework.

### 4. Terms and definitions

| Term | Meaning |
|---|---|
| Process specification (spec) | The controlled record of how one part is heat treated by one process: part data, approved furnaces, loading, zone set values with tolerances, push time, quench / controlled cooling / transfer, after-exit cooling and the product requirements and testing. Number PS-nnnn, revision 0, 1, 2 … |
| Revision in force | The last approved revision. A new revision in draft does not replace it until approved. |
| Job card | The one-page print of the revision in force for the line (part, set values, push, quench / cooling, requirements). |
| Active process | A part produced on a furnace in the last 90 days (Daily production page). |
| Authorized person | A person allowed to approve specifications: the holder and deputy of the heat treat position (HTSA 1.1) and of the positions marked as authorized on the HT organization page. |
| Operating tolerance | ± value, maximum or range within which a parameter must be held at the line. |

### 5. Responsibility and authority

| Role | Responsibility | Authority |
|---|---|---|
| HT Engineer | Prepares specifications and revisions; gathers customer requirements; validation trial | Prepare, propose changes |
| HT Manager (heat treat person, HTSA 1.1) and deputy | Reviews and approves; decides on changes; owns this procedure | Approve, make obsolete |
| Other authorized positions (marked on the HT organization page) | Approve within their authorization | Approve |
| Quality Manager | Reviews product requirements, sampling and customer notification; control plan / PFMEA alignment | Customer notification |
| Shift supervisor | Uses only the job card of the revision in force; records the implementation | Stop the line if no valid job card |
| Director | Provides the authorization structure (HT organization) | — |

### 6. Procedure

```
        +-------------------------------+
        |  PLAN  6.1                    |
        |  authorization, processes per |
        |  furnace, write the spec      |
        +---------------+---------------+
                        |
                        v
+-------------------+   approve    +-------------------------------+
|  ACT  6.4         |<-------------|  DO  6.2                      |
|  new revision,    |              |  job card at the line,        |
|  change review,   |              |  implementation recorded      |
|  obsolete         |              +---------------+---------------+
+---------+---------+                              |
          ^                                        v
          |                        +-------------------------------+
          +------------------------|  CHECK  6.3                   |
                                   |  periodic review, active parts|
                                   |  vs specs, HTSA 1.6 score     |
                                   +-------------------------------+
```

#### 6.1 PLAN

1. The authorized persons are defined on the HT organization page (F-SPEC-03 is its printout). The heat treat person (HTSA 1.1) must be among them.
2. The processes each furnace runs are kept in the Specifications page settings ("Processes per furnace"). A specification cannot be approved for a furnace that does not run its process.
3. The HT Engineer writes the specification (MWSPL-WI-SPEC-01) with every step and its operating tolerance (F-SPEC-01): loading (pieces per tray, loading pattern), push time ± tolerance, the set value ± tolerance of each zone of both chambers, quench (medium, temperature range, delay maximum, dip time ±, agitation, transfer maximum) or controlled cooling (time ±, method, target ±) or transfer, after-exit cooling, and the product requirements (hardness range and scale, core, microstructure, decarburization limit, grain size, sampling, method).
4. The page calculates the time per zone, the time between the chambers and the time through the line from the line layout (5 / 4 / 4 and 4 / 4 / 4 positions; transfer 18 min measured; controlled cooling cycle for isothermal annealing, which must end before the next push) and gives line-practice advice; any critical advice blocks the approval.

#### 6.2 DO

1. An authorized person approves the specification after the approval gate shows nothing missing (part data, furnaces, all steps with tolerances, hardness scale, decarburization limit, where it is available at the line, prepared / reviewed / approved by, approval date; for a revision also the reason and the change review). Approved = locked.
2. The specification is made available at the line as a work instruction, a job card (printed from the register) or a computer-based recipe (SCADA / PLC), as stated in the specification.
3. The date it was implemented at the line and by whom are recorded ("Record implementation") within 7 days of the approval.
4. Production, hardness testing, load build and control plans use only the revision in force (they read it from the register).

#### 6.3 CHECK

1. **Periodic review:** every specification is reviewed 365 days after the approval of its revision in force (due shown 30 days before) — MWSPL-WI-SPEC-03.
2. **Active processes:** the parts produced on each furnace in the last 90 days must each have a specification in force approved for that furnace; a part without one is a critical finding.
3. **HTSA 1.6 self-assessment:** the panel on the Specifications page scores the system Satisfactory / Not satisfactory / Needs immediate action (no specification in force, or an active part without one); it is reviewed monthly with the KPIs (F-SPEC-05).

#### 6.4 ACT

1. Any change (set value, tolerance, push time, quench / cooling, furnace, loading, requirement) is made only by a new revision (MWSPL-WI-SPEC-02). The revision in force stays in use until the new one is approved.
2. Every revision after rev 0 needs a change review (F-SPEC-02): customer requirements checked, customer notification decision (not required / notified / approved, with the reference), control plan and PFMEA reviewed, validation (trial or first-off result).
3. A specification no longer used is made obsolete with a reason; only never-approved drafts may be deleted.
4. Findings of the review and the self-assessment are acted on by the HT Manager; actions are tracked in the KPI format.

### 7. Records

| Record | Format | Retention | Owner |
|---|---|---|---|
| Process specification with all revisions | F-SPEC-01 (CALOR register; PDF / Excel per specification) | Life of the part + 1 year (to confirm with the record retention rule) | HT Manager |
| Change review | F-SPEC-02 (in the revision) | As the specification | HT Manager |
| Authorization list | F-SPEC-03 (HT organization page) | Current + superseded 3 years | HT Manager |
| Register and periodic review | F-SPEC-04 (register Excel) | 3 years | HT Engineer |
| HTSA 1.6 evidence | PDF from the panel | 3 years | Quality Manager |
| KPIs | F-SPEC-05 | 3 years | HT Manager |

**Application:** CALOR holds the specifications, their revisions (a snapshot of every earlier revision), the approval, change review and implementation data and a dated log of every action in its register (`psr-reg`). The register is kept in the browser and, when linked, as `psr-reg.json` in the Google Drive folder with daily backups. PDF and Excel outputs are made from the page (specification, job card, register, HTSA 1.6 evidence). Paper job cards are uncontrolled copies of the revision in force.

### 8. Revision history

| Rev | Date | Change | Approved |
|---|---|---|---|
| 00 | — | First issue (draft) | |
