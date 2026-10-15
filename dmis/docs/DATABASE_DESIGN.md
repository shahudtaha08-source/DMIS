# Database Design

PostgreSQL, accessed exclusively through Prisma. Schema is implemented in
Chunk 2 (`prisma/schema.prisma`); this document defines the architecture
now so Chunk 2 is a direct translation, not a design exercise.

## Design principles

1. **Historical vs. operational separation.** `HistoricalDisaster` is an
   import target for `disasterIND.csv` and is never written to by normal
   application CRUD flows — only by the seed/import script. Every other
   model is a live operational table.
2. **Every operational record is attributable.** `Incident`, `Alert`,
   `Shelter`, `Resource`, `Victim`, etc. carry a `createdById` (and often
   `updatedById`) pointing at `User`, and changes to sensitive models are
   mirrored into `AuditLog`.
3. **Enums live in one place.** Every status/severity/role enum is defined
   once in Prisma and mirrored in `packages/shared` — never redefined
   per-module.
4. **Nothing is hard-deleted** for operational safety-critical models
   (Incident, Alert, Victim); a `deletedAt`/status field is used instead
   where relevant. Reference/lookup-style writes (e.g. a single stale
   `ResourceTransaction`) may be hard-deleted.

## Models

### User
Authentication + RBAC.
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| email | String | unique |
| passwordHash | String | bcrypt/argon2, never selected by default |
| name | String | |
| role | UserRole | `ADMIN` \| `OFFICER` \| `VOLUNTEER` |
| phone | String? | |
| isActive | Boolean | default true |
| createdAt / updatedAt | DateTime | |

Relations: creates Incidents/Alerts/etc.; may be linked to one `Volunteer`
or `RescueTeam` membership record.

### HistoricalDisaster
One row per imported `disasterIND.csv` record. Maps closely to the source
columns — see `docs/DATASET_ANALYSIS.md` for the full field mapping and
type decisions.
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| disNo | String | unique — source `DisNo.` |
| historic | Boolean | |
| classificationKey | String | |
| disasterGroup | String | always "Natural" in current data, kept as String for future non-natural rows |
| disasterSubgroup | String | indexed |
| disasterType | String | indexed |
| disasterSubtype | String? | |
| externalIds | String? | |
| eventName | String? | |
| iso | String | |
| country | String | |
| subregion | String | |
| region | String | |
| location | String? | free text |
| origin | String? | |
| associatedTypes | String? | |
| ofdaBhaResponse | Boolean | |
| appeal | Boolean | |
| declaration | Boolean | |
| aidContributionUsd000 | Decimal? | |
| magnitude | Decimal? | |
| magnitudeScale | String? | |
| latitude | Decimal? | indexed (partial, where not null) |
| longitude | Decimal? | indexed (partial, where not null) |
| riverBasin | String? | |
| startYear | Int | indexed |
| startMonth | Int? | |
| startDay | Int? | |
| endYear | Int? | |
| endMonth | Int? | |
| endDay | Int? | |
| totalDeaths | Int? | |
| noInjured | Int? | |
| noAffected | Int? | |
| noHomeless | Int? | |
| totalAffected | Int? | |
| reconstructionCostsUsd000 | Decimal? | |
| reconstructionCostsAdjUsd000 | Decimal? | |
| insuredDamageUsd000 | Decimal? | |
| insuredDamageAdjUsd000 | Decimal? | |
| totalDamageUsd000 | Decimal? | indexed |
| totalDamageAdjUsd000 | Decimal? | |
| cpi | Decimal? | |
| adminUnitsRaw | Json? | source is a JSON-array string — stored as `Json` |
| entryDate | DateTime? | |
| lastUpdate | DateTime? | |
| createdAt | DateTime | import timestamp |

Indexes: `disNo` (unique), `disasterType`, `disasterSubgroup`, `startYear`,
`(latitude, longitude)` partial index for map queries, `totalDamageUsd000`.

### Incident
Live operational events (distinct from historical records).
| Field | Type |
|---|---|
| id | String (cuid) PK |
| title | String |
| description | String |
| disasterType | String (reuses shared enum-like list, not FK to Historical) |
| severity | Severity |
| status | IncidentStatus — `REPORTED → VERIFIED → RESPONSE_ACTIVE → STABILIZED → RESOLVED` |
| latitude / longitude | Decimal? |
| location | String |
| affectedPopulationEstimate | Int? |
| reportedById | String → User |
| assignedTeamId | String? → RescueTeam |
| createdAt / updatedAt | DateTime |
| resolvedAt | DateTime? |

Indexes: `status`, `severity`, `(latitude, longitude)`, `createdAt`.

### Alert
| Field | Type |
|---|---|
| id | String PK |
| title / message | String |
| severity | AlertSeverity — `CRITICAL \| WARNING \| ADVISORY \| INFO` |
| status | AlertStatus — `DRAFT \| PUBLISHED \| DEACTIVATED` |
| affectedArea | String |
| validFrom / validUntil | DateTime |
| relatedIncidentId | String? → Incident |
| createdById | String → User |
| createdAt / updatedAt | DateTime |

Indexes: `status`, `severity`, `validUntil`.

### Shelter
| Field | Type |
|---|---|
| id | String PK |
| name | String |
| latitude / longitude | Decimal |
| address | String |
| capacity | Int |
| currentOccupancy | Int (default 0, `currentOccupancy <= capacity` enforced in service layer) |
| facilities | String[] |
| status | ShelterStatus — `OPEN \| FULL \| CLOSED` |
| managerContact | String? |
| createdAt / updatedAt | DateTime |

Availability (`capacity - currentOccupancy`) is computed, not stored.

### Resource
| Field | Type |
|---|---|
| id | String PK |
| name | String |
| category | String (e.g. "Medical", "Food", "Water", "Shelter Kits") |
| unit | String |
| quantityAvailable | Int (never negative — DB check + service validation) |
| lowStockThreshold | Int |
| status | ResourceStatus — `AVAILABLE \| LOW_STOCK \| OUT_OF_STOCK` (derived, cached) |
| locationId | String? → Shelter (optional, resources can be depot-level) |
| updatedAt | DateTime |

### ResourceTransaction
Append-only ledger — every allocation/restock is a row, `Resource.quantityAvailable`
is derived/maintained from this ledger.
| Field | Type |
|---|---|
| id | String PK |
| resourceId | String → Resource |
| type | `RESTOCK \| ALLOCATION \| RETURN` |
| quantity | Int |
| relatedIncidentId | String? → Incident |
| performedById | String → User |
| createdAt | DateTime |

### RescueTeam
| Field | Type |
|---|---|
| id | String PK |
| name | String |
| specialization | String (e.g. "Flood Rescue", "Medical", "Search & Rescue") |
| status | TeamStatus — `AVAILABLE \| DEPLOYED \| OFF_DUTY` |
| currentIncidentId | String? → Incident |
| baseLocation | String? |
| createdAt / updatedAt | DateTime |

### Volunteer
| Field | Type |
|---|---|
| id | String PK |
| userId | String? → User (a volunteer may or may not have a login) |
| name | String |
| phone | String |
| skills | String[] |
| status | VolunteerStatus — `AVAILABLE \| ASSIGNED \| UNAVAILABLE` |
| teamId | String? → RescueTeam |
| createdAt / updatedAt | DateTime |

### Victim
Victim/report records tied to an incident.
| Field | Type |
|---|---|
| id | String PK |
| incidentId | String? → Incident |
| name | String? (may be anonymous/unidentified) |
| age | Int? |
| gender | String? |
| status | VictimStatus — `MISSING \| INJURED \| RESCUED \| DECEASED \| SAFE` |
| location | String? |
| contactInfo | String? |
| reportedById | String → User |
| notes | String? |
| createdAt / updatedAt | DateTime |

### EmergencyContact
| Field | Type |
|---|---|
| id | String PK |
| name | String |
| role | String (e.g. "District Collector", "Fire Dept", "Ambulance") |
| phone | String |
| region | String |
| category | String |
| createdAt / updatedAt | DateTime |

### Notification
| Field | Type |
|---|---|
| id | String PK |
| userId | String → User (recipient) |
| title / body | String |
| relatedAlertId / relatedIncidentId | String? |
| isRead | Boolean default false |
| createdAt | DateTime |

### AuditLog
| Field | Type |
|---|---|
| id | String PK |
| userId | String? → User |
| action | String (e.g. "INCIDENT_STATUS_CHANGED") |
| entityType | String |
| entityId | String |
| metadata | Json? |
| createdAt | DateTime |

Indexes: `entityType, entityId`, `createdAt`.

## Relations summary

`User` 1—* `Incident` (reportedBy), `Alert` (createdBy), `Victim`
(reportedBy), `AuditLog`, `Notification`; `User` 0..1—1 `Volunteer`.
`RescueTeam` 1—* `Incident` (assigned), 1—* `Volunteer` (members).
`Incident` 1—* `Alert` (related), 1—* `Victim`, 1—* `ResourceTransaction`
(allocations). `Shelter` 1—* `Resource` (optional). `Resource` 1—*
`ResourceTransaction`.

`HistoricalDisaster` has **no** foreign keys into the operational tables —
it is read-only reference data, joined only implicitly (e.g. by
type/location) for analytics, never by relation.
