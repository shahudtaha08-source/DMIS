# Dataset Analysis — `disasterIND.csv`

## Summary

- **783 records, 46 columns.**
- 100% India (`Country` = "India", `ISO` = "IND", `Region` = "Asia",
  `Subregion` = "Southern Asia" for every row) — no filtering needed on
  country.
- 100% `Disaster Group` = "Natural" (this is an EM-DAT-style natural
  disaster export; the column is still modeled as a free-text field, not
  a hardcoded enum, so future non-natural data can be imported without a
  schema change).
- Years span **1900–2024**.
- No duplicate `DisNo.` values (783 unique) — used as the natural unique
  key for the import.

## Disaster taxonomy breakdown

**Disaster Subgroup**: Hydrological 383 · Meteorological 278 · Biological
70 · Geophysical 29 · Climatological 23.

**Disaster Type** (top): Flood 325 · Storm 214 · Epidemic 69 · Extreme
temperature 64 · Mass movement (wet) 58 · Earthquake 27 · Drought 16 ·
Wildfire 4 · Glacial lake outburst flood 3 · Mass movement (dry) 2 ·
Infestation 1.

**Disaster Subtype** (top): Riverine flood 144 · Flood (General) 143 ·
Tropical cyclone 120 · Landslide (wet) 49 · Storm (General) 36 · Viral
disease 34 · Flash flood 34 · Heat wave 32 · Cold wave 30 ·
Lightning/Thunderstorms 29 · Ground movement 26 · Bacterial disease 24.

Floods and storms dominate the dataset (69% combined) — the historical
analytics/timeline charts should default to a view that doesn't let these
two types visually drown out the rarer but higher-severity categories
(earthquakes, epidemics).

## Missing-data profile (drives nullability + import handling)

| Column | Non-null | Null % | Decision |
|---|---|---|---|
| Reconstruction Costs (both) | 0 / 783 | 100% | Nullable `Decimal`; effectively always null in current data but kept for schema completeness/future imports |
| Insured Damage (both) | 21 / 783 | 97.3% | Nullable `Decimal` |
| AID Contribution | 27 / 783 | 96.6% | Nullable `Decimal` |
| External IDs | 58 / 783 | 92.6% | Nullable `String` |
| No. Homeless | 82 / 783 | 89.5% | Nullable `Int` |
| River Basin | 84 / 783 | 89.3% | Nullable `String` |
| **Latitude/Longitude** | **93 / 783** | **88.1%** | Nullable `Decimal`; only 93 records (11.9%) are map-plottable — the Historical layer on Live Map and the map view in the Explorer must handle "no coordinates" as an expected, common case, not an error state |
| Event Name | 93 / 783 | 88.1% | Nullable `String` |
| No. Injured | 122 / 783 | 84.4% | Nullable `Int` |
| Associated Types | 136 / 783 | 82.6% | Nullable `String` |
| Total Damage (both) | 196 / 783 | 75.0% | Nullable `Decimal`; only ~25% of records have damage estimates, so Analytics must show damage figures as "N of 783 records report damage data", not imply completeness |
| Magnitude | 217 / 783 | 72.3% | Nullable `Decimal` |
| Origin | 219 / 783 | 72.0% | Nullable `String` |
| Admin Units | 359 / 783 | 54.2% | Nullable `Json` — raw value is a JSON array string, e.g. `[{"adm1_code":1511,"adm1_name":"West Bengal"}, ...]`; parsed and stored as `Json`, not flattened, since cardinality varies per row |
| No. Affected | 380 / 783 | 51.5% | Nullable `Int` |
| Total Affected | 491 / 783 | 62.7% | Nullable `Int` |
| Start Day | 588 / 783 | 24.9% null | Nullable `Int` |
| End Day | 589 / 783 | 24.8% null | Nullable `Int` |
| Magnitude Scale | 695 / 783 | 11.2% null | Nullable `String` — values seen: Km2, Kph, °C, Vaccinated, Moment Magnitude (mixed units by disaster type — displayed alongside `magnitude`, never assumed to be a single unit) |
| **Total Deaths** | **717 / 783** | **8.4% null** | Nullable `Int`; present for most records so this is the primary severity metric for dashboards, but the 8.4% gap still needs an explicit "unknown" state in the UI, not a silent 0 |
| Location | 733 / 783 | 6.4% null | Nullable `String` |
| End Month | 763 / 783 | 2.6% null | Nullable `Int` |
| Start Month | 768 / 783 | 1.9% null | Nullable `Int` |
| CPI | 774 / 783 | 1.1% null | Nullable `Decimal` |
| Everything else (`DisNo.`, `Historic`, `Classification Key`, `Disaster Group/Subgroup/Type/Subtype`, `ISO`, `Country`, `Region`, `Subregion`, `Start Year`, `End Year`, `Appeal`, `Declaration`, `OFDA/BHA Response`, `Entry Date`, `Last Update`) | 783 / 783 | 0% | Required fields |

**Implication for import**: nulls are the norm, not the exception, for over
half the columns. The import script must not coerce missing numerics to 0
(that would silently corrupt severity/damage analytics) — they stay `null`
and every aggregate query explicitly states its sample size.

## Type/normalization decisions for the importer (Chunk 2)

- `Historic`, `Appeal`, `Declaration`, `OFDA/BHA Response`: source values
  are `"Yes"`/`"No"` strings → normalized to `Boolean`.
- `Start Year/Month/Day`, `End Year/Month/Day`: kept as separate nullable
  `Int` columns (not merged into a single `Date`) because day/month are
  frequently missing while year is always present — a synthetic date would
  imply false precision. A derived `startDate`/`endDate` best-effort
  `DateTime` (defaulting missing month/day to `01`) is computed only for
  sorting/timeline convenience, clearly documented as approximate.
- `Entry Date`, `Last Update`: real ISO dates in the source (`YYYY-MM-DD`)
  → parsed straight to `DateTime`.
- Monetary columns (`AID Contribution`, `Reconstruction Costs`,
  `Insured Damage`, `Total Damage`, each "Adjusted" variant): parsed to
  `Decimal`, unit is thousands of US$ as-is (not converted).
- `Admin Units`: parsed as JSON, stored as `Json`; malformed/empty values
  stored as `null` rather than failing the whole row import.
- `Latitude`/`Longitude`: parsed to `Decimal`; used to build the partial
  geo index (only ~12% of rows qualify).
- `Classification Key` (e.g. `nat-cli-dro-dro`, `nat-bio-epi-bac`): stored
  verbatim as a `String`, useful as a compact filter/debug key alongside
  the human-readable Group/Subgroup/Type/Subtype columns.

## Indexing plan (justified by query patterns in `docs/API_DESIGN.md`)

- `disNo` — unique constraint, also the import's idempotency key (re-running
  the seed upserts by `disNo` instead of duplicating rows).
- `disasterType`, `disasterSubgroup` — Explorer filters + Analytics group-by.
- `startYear` — Explorer year filter + timeline charts.
- `(latitude, longitude)` partial index (`WHERE latitude IS NOT NULL`) —
  Live Map / geo endpoint.
- `totalDamageUsd000` — "costliest disasters" analytics view.

## Open questions from Chunk 1 — resolved in Chunk 2

- Denormalized `decade` column: **not added**. `startYear` is indexed and
  cheap to bucket into decades at query time in the Analytics module
  (Chunk 15); adding a redundant stored column wasn't justified by any
  query pattern seen so far.

## Chunk 2 — import verification results

`prisma migrate dev` / `prisma generate` require downloading a small engine
binary from `binaries.prisma.sh`; that host is unreachable from the sandbox
this chunk was built in (blocked by its network egress policy), but is a
normal outbound HTTPS call on a real dev machine, CI runner, or Render — the
commands in the root `README.md` "Running this project" section are the
real, supported path. To still verify the schema and import logic
end-to-end in this environment, `prisma/schema.prisma`'s
`HistoricalDisaster` model was translated by hand into an equivalent raw
`CREATE TABLE` and the exact normalization functions from
`prisma/imports/import-historical.ts` were run against a local PostgreSQL
16 instance via the `pg` driver. Results:

| Check | Result |
|---|---|
| Source rows read | 783 |
| Rows imported | 783 |
| Failed rows | 0 |
| Distinct `disNo` after import | 783 (no duplicates) |
| Re-running the import | still 783 rows (idempotent upsert confirmed) |
| Rows with non-null lat/lon | 93 |
| Rows with non-null `totalDeaths` | 717 |
| Rows with non-null `adminUnitsRaw` | 359 |
| `country <> 'India'` | 0 |
| `startYear` range | 1900–2024 |
| `disasterType` breakdown | Flood 325 · Storm 214 · Epidemic 69 · Extreme temperature 64 · Mass movement (wet) 58 · Earthquake 27 · Drought 16 · Wildfire 4 · Glacial lake outburst flood 3 · Mass movement (dry) 2 · Infestation 1 |

Every number matches the Chunk 1 analysis above exactly, confirming the
import script's normalization logic (boolean coercion, null-preservation,
decimal parsing, JSON parsing of `Admin Units`, approximate date
construction) is correct against the real dataset.
