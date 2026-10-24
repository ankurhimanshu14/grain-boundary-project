# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## DATA ANALYSIS OVER TIME (TREND ANALYSIS)

| Doc No. | Rev | Issue date | Process Owner | Prepared | Reviewed | Approved | Copy status |
|---|---|---|---|---|---|---|---|
| MWSPL-QP-TREND-01 | 00 | — | HT Manager | | | | Uncontrolled until approved |

### 1. Purpose

To collect product and process data over time, analyze it for trends, shifts and capability, and react before a defect occurs (CQI-9 HTSA 1.8).

### 2. Scope

All heat treat processes on furnaces F-01 to F-04: product characteristics (surface and core hardness, decarburization, tensile strength from customer data, scrap, rework, nonconforming tests) and process parameters (zone temperatures from the SCADA review, SAT differences of the thermocouples, quench media, alarms, push-cycle stops).

### 3. References

- AIAG CQI-9 4th Edition, HTSA 1.8 (controlled copy); HTSA 1.9 (second-level review of the monitoring system), 3.3 (thermocouples, SAT).
- IATF 16949:2016 §9.1.3, §10.3.
- MWSPL-WI-TREND-01, -02; MWSPL-F-TREND-01, -02; MWSPL-QP-SCADA-01; MWSPL-QP-TC-01.

### 4. Terms and definitions

| Term | Meaning |
|---|---|
| Parameter | A product characteristic or process parameter the organization has decided to analyze over time (one line of the analysis plan). |
| Analysis plan | The list of the parameters, with where the data comes from, the specification limits, the review interval, the owner and the reaction rule (F-TREND-01). |
| Individuals chart | The values in time order with their mean and control limits (mean ± 3σ, σ = average moving range ÷ 1.128) from the first points (baseline). |
| Signal | A point outside the specification (act), beyond the control limits, 8 points on one side of the mean (shift), 6 points rising or falling (trend), or 2 of 3 points beyond 2σ. |
| Chart review | The owner's documented look at a chart: what the data shows and the decision (F-TREND-02). |

### 5. Responsibility and authority

| Role | Responsibility |
|---|---|
| HT Manager | Owns this procedure; approves the analysis plan; reviews the process parameters |
| Quality Manager | Product characteristics (hardness, tensile, scrap, nonconforming tests); customer data |
| Maintenance Head | Temperature, SAT and quench parameters |
| Production Manager | Rework, scrap, alarms, push-cycle stops |
| Director | Reviews the trend summary in the management review |

### 6. Procedure

#### 6.1 Determine the parameters (WI-TREND-01)

The HT Manager, with the owners, determines which parameters are analyzed, at least one product characteristic and one process parameter, and a process parameter for each furnace in use. The analysis plan is approved; a change after the approval needs a new approval. The plan is reviewed every 365 days.

#### 6.2 Collect

The data is collected where it arises and read by the application: SCADA review records (HTSA 1.9), SAT records (HTSA 3.3), CALOR's hardness, production, quench and alarm registers, or entered (e.g. tensile strength from the customer, scrap from the weighbridge).

#### 6.3 Analyze

Every parameter is charted over the last 365 days (setting) with its mean, control limits, specification limits and Cpk. The signals of §4 are marked.

#### 6.4 Review and react (WI-TREND-02)

The owner reviews each chart at its interval and whenever a signal appears. A point outside the specification is acted on at once (hold, containment per the nonconforming product procedure). The decision is recorded: action (what, owner, due date), watch, or no action with the reason. A completed action is verified in later data.

### 7. Records

| Record | Kept as | Retention |
|---|---|---|
| Analysis plan and its approval | F-TREND-01 (application) | Current + superseded revisions |
| Chart review record | F-TREND-02 (application) | 3 years |
| HTSA 1.8 evidence | Application print | Until the next assessment |

### 8. Review

This procedure is reviewed every 365 days, at the management review, and after a customer complaint not foreseen by the data.
