# MASS WIRE AND STEELS PVT. LTD., BHIWADI

## VALIDATING A PROCESS LINE

| Doc No. | Rev | Issue date | Owner | Approved |
|---|---|---|---|---|
| MWSPL-WI-PV-01 | 00 | — | HT Manager | |

### 1. When

Before a new process line runs production; after a relocation, location change or a major rebuild / modification of equipment the line uses (WI-PV-02); after a validation concluded "not validated" and the cause was corrected.

### 2. Plan (protocol)

1. Open a validation in the application (Process validation → New validation): process line, trigger, the change record for a revalidation.
2. Name the process specification in force for the line (the application offers it) and a representative part: the most demanding part of the line (largest section, tightest hardness range, special characteristics).
3. Write the sampling plan: number of trial lots (at least the minimum in Settings), trays per lot, sample positions (first / last tray of the lot; front / back, top / bottom of the tray; each wall), readings per lot (at least the minimum in Settings), tests (surface and core hardness, microstructure, decarburization).

### 3. Do and check

#### 3.1 A. Robust heat treat equipment (Maintenance Head)

| Item | Evidence |
|---|---|
| TUS of each chamber of the line over its operating range passed | TUS report numbers and dates |
| Over-temperature protection tested | Test record |
| Burners, combustion, furnace atmosphere set up (open direct-fired chambers: scaling / decarburization) | Combustion set-up / analysis |
| Pusher, extractor and the push / transfer timing verified | Timing check (push, 18 min transfer) |
| Quench tank: medium, temperature, agitation, quench delay, dip time (hardening) | Quench check |
| Controlled cooling: air flow and cycle within the push time (isothermal annealing) | Cooling cycle check |
| Fan cooling after exit (normalizing) | Fan check |
| Equipment qualification record updated (class, instrumentation type) | Record revision |

#### 3.2 B. Process control, monitoring and calibration

| Item | Evidence |
|---|---|
| Controllers and recorders / SCADA calibrated | Calibration certificates |
| SAT of the control thermocouples passed | SAT records (Thermocouples module) |
| Alarms and interlocks tested | Alarm test record |
| Parameters set and recorded per the process specification | SCADA record of the trial lots, specification no. and rev |
| Quench medium analysed, within limits (hardening) | Quench media test (HTSA 3.14) |
| Monitoring and data review in place | SCADA review (HTSA 1.9) |

#### 3.3 C. Test equipment calibration (Quality Manager)

| Item | Evidence |
|---|---|
| Hardness testers calibrated and verified on certified blocks on the test days | Calibration certificate, daily verification |
| Laboratory equipment calibrated (microscope, preparation) | Calibration records |
| Test methods and the people testing defined | Methods, qualification |

#### 3.4 D. Strategic product sampling

Run the trial lots to the specification. For each lot enter the date, part, positions sampled, every hardness reading and the microstructure / decarburization result. The application checks every reading against the limits, the minimum lots and readings, and works out the capability (Cpk) of all readings. A Cpk below the target needs a justification in the conclusion or more lots.

### 4. Conclude

- Every applicable item OK with evidence, the sampling complete and passing → "Validated".
- Any Not OK item or failed lot → "Not validated": correct and validate again; the line does not run production.
- The report is approved by an authorized person (HT Manager or a position authorized in the HT organization). Print F-PV-01 and sign.
- Trial lots are released only after the approval.
