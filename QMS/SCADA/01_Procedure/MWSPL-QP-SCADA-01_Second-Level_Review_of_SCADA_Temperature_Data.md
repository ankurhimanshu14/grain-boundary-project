# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## SECOND-LEVEL REVIEW OF SCADA TEMPERATURE DATA

| Doc No. | Rev | Issue date | Process Owner | Prepared | Reviewed | Approved | Copy status |
|---|---|---|---|---|---|---|---|
| MWSPL-QP-SCADA-01 | 00 | — | HT Manager | | | | Uncontrolled until approved |

### 1. Purpose

To review the heat treat monitoring data of every furnace chamber at least every 24 hours, by qualified personnel, on top of the operators' checks, and to detect and react to every out-of-control condition (CQI-9 HTSA 1.9).

### 2. Scope

The SCADA zone temperature logs of the hardening and tempering chambers of F-01 to F-04 (six thermocouples per chamber, TC-01 … TC-06; odd numbers on the right wall, even numbers on the left), with the furnace / operator log and the alarm history of the same period.

### 3. References

- AIAG CQI-9 4th Edition, HTSA 1.9, 1.8, 1.6, 3.3; Process Tables A and E (controlled copy).
- MWSPL-WI-SCADA-01, -02; MWSPL-F-SCADA-01; MWSPL-QP-SPEC-01; MWSPL-QP-TC-01; MWSPL-QP-ORG-01.

### 4. Terms

| Term | Meaning |
|---|---|
| Record | One SCADA export of one chamber (normally one production day). |
| Deviation | Thermocouple reading − the set value in force at that reading. |
| Settling | The time after a set value change until the thermocouple is back within tolerance; not judged. |
| Incident | Readings of a zone outside tolerance; "product affected" when the zone counts for the process (hardening chamber zones 2–3 above 800 °C; every tempering chamber zone). |
| Condition | An out-of-control finding the reviewer must answer. |

### 5. Responsibility

| Role | Responsibility |
|---|---|
| Shift supervisor | Exports the record (WI-SCADA-01); operators' first-level checks during the shift |
| Qualified reviewer (HT Manager, HT Engineer or as listed) | Second-level review within 24 h (WI-SCADA-02); decides the reaction and the product disposition |
| HT Manager | Owns this procedure and the reviewer list; releases held product |
| Quality Manager | Verifies closed reactions; audits HTSA 1.9 |

### 6. Procedure

#### 6.1 Interval

Every chamber in scope is reviewed at intervals not exceeding 24 hours. A chamber that was not running is recorded as "not running" with the reason.

#### 6.2 Review

1. The record is loaded and analysed in the application against the set values (tolerance from the specification in force, else ±10 °C).
2. The reviewer checks the findings, the zone charts, the furnace / operator log and the alarm history of the period.
3. Every condition is answered: a reaction (action, owner, product disposition when product is affected) or the record that already handles it (alarm record, 8D, SAT, maintenance order).
4. The reviewer signs with the time of review.

#### 6.3 Reaction

Product affected: hold the trays of the window until assessed (hardness / metallurgy), then release, re-heat-treat per the rework procedure, scrap or inform the customer. A reaction is closed only with its verification and a final disposition.

### 7. Records

| Record | Kept in | Retention |
|---|---|---|
| Review record (F-SCADA-01) with summary and 10-minute trend | Application → Reviews | 3 years minimum |
| SCADA export files | SCADA archive (server) | 3 years minimum |

### 8. Revision history

| Rev | Date | Change | Approved |
|---|---|---|---|
| 00 | — | First issue | |
