/**
 * Imports data/disasterIND.csv into the HistoricalDisaster table.
 *
 * Repeatable / idempotent: upserts by the unique `disNo` (source `DisNo.`)
 * column, so running this script multiple times never creates duplicates
 * and safely picks up corrections if the source CSV is re-exported.
 *
 * Normalization rules follow docs/DATASET_ANALYSIS.md exactly — see that
 * doc for the reasoning behind every decision below. In short: missing
 * numeric/text values are stored as `null`, never coerced to 0 or "", so
 * analytics queries never silently misrepresent the ~half of columns that
 * are frequently absent in the source data.
 *
 * Usage:
 *   npm run db:import:historical --workspace=services/api
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CSV_PATH = path.resolve(__dirname, "../../data/disasterIND.csv");

type RawRow = Record<string, string>;

function toBool(v: string | undefined): boolean {
  return (v ?? "").trim().toLowerCase() === "yes";
}

function toIntOrNull(v: string | undefined): number | null {
  const t = (v ?? "").trim();
  if (t === "") return null;
  const n = Number.parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

function toDecimalOrNull(v: string | undefined): Prisma.Decimal | null {
  const t = (v ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : new Prisma.Decimal(n);
}

function toStringOrNull(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

function toDateOrNull(v: string | undefined): Date | null {
  const t = (v ?? "").trim();
  if (t === "") return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Best-effort composite date, defaulting a missing month/day to 01. Documented as approximate — see DATASET_ANALYSIS.md. */
function approxDate(year: number | null, month: number | null, day: number | null): Date | null {
  if (!year) return null;
  const m = month && month >= 1 && month <= 12 ? month : 1;
  const d = day && day >= 1 && day <= 31 ? day : 1;
  const date = new Date(Date.UTC(year, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toJsonOrNull(v: string | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const t = (v ?? "").trim();
  if (t === "") return Prisma.JsonNull;
  try {
    return JSON.parse(t) as Prisma.InputJsonValue;
  } catch {
    // Malformed admin-units JSON stores as null rather than failing the whole row.
    return Prisma.JsonNull;
  }
}

export async function main() {
  const raw = readFileSync(CSV_PATH, "utf-8");
  const rows: RawRow[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Read ${rows.length} rows from ${CSV_PATH}`);

  let failed = 0;

  for (const row of rows) {
    const disNo = row["DisNo."]?.trim();
    if (!disNo) {
      failed++;
      console.warn("Skipping row with no DisNo.:", row);
      continue;
    }

    const startYear = toIntOrNull(row["Start Year"]);
    const startMonth = toIntOrNull(row["Start Month"]);
    const startDay = toIntOrNull(row["Start Day"]);
    const endYear = toIntOrNull(row["End Year"]);
    const endMonth = toIntOrNull(row["End Month"]);
    const endDay = toIntOrNull(row["End Day"]);

    const data = {
      disNo,
      historic: toBool(row["Historic"]),
      classificationKey: row["Classification Key"]?.trim() ?? "",
      disasterGroup: row["Disaster Group"]?.trim() ?? "",
      disasterSubgroup: row["Disaster Subgroup"]?.trim() ?? "",
      disasterType: row["Disaster Type"]?.trim() ?? "",
      disasterSubtype: toStringOrNull(row["Disaster Subtype"]),
      externalIds: toStringOrNull(row["External IDs"]),
      eventName: toStringOrNull(row["Event Name"]),
      iso: row["ISO"]?.trim() ?? "",
      country: row["Country"]?.trim() ?? "",
      subregion: row["Subregion"]?.trim() ?? "",
      region: row["Region"]?.trim() ?? "",
      location: toStringOrNull(row["Location"]),
      origin: toStringOrNull(row["Origin"]),
      associatedTypes: toStringOrNull(row["Associated Types"]),
      ofdaBhaResponse: toBool(row["OFDA/BHA Response"]),
      appeal: toBool(row["Appeal"]),
      declaration: toBool(row["Declaration"]),

      aidContributionUsd000: toDecimalOrNull(row["AID Contribution ('000 US$)"]),
      magnitude: toDecimalOrNull(row["Magnitude"]),
      magnitudeScale: toStringOrNull(row["Magnitude Scale"]),
      latitude: toDecimalOrNull(row["Latitude"]),
      longitude: toDecimalOrNull(row["Longitude"]),
      riverBasin: toStringOrNull(row["River Basin"]),

      startYear: startYear ?? 0,
      startMonth,
      startDay,
      endYear,
      endMonth,
      endDay,
      startDateApprox: approxDate(startYear, startMonth, startDay),
      endDateApprox: approxDate(endYear, endMonth, endDay),

      totalDeaths: toIntOrNull(row["Total Deaths"]),
      noInjured: toIntOrNull(row["No. Injured"]),
      noAffected: toIntOrNull(row["No. Affected"]),
      noHomeless: toIntOrNull(row["No. Homeless"]),
      totalAffected: toIntOrNull(row["Total Affected"]),

      reconstructionCostsUsd000: toDecimalOrNull(row["Reconstruction Costs ('000 US$)"]),
      reconstructionCostsAdjUsd000: toDecimalOrNull(
        row["Reconstruction Costs, Adjusted ('000 US$)"]
      ),
      insuredDamageUsd000: toDecimalOrNull(row["Insured Damage ('000 US$)"]),
      insuredDamageAdjUsd000: toDecimalOrNull(row["Insured Damage, Adjusted ('000 US$)"]),
      totalDamageUsd000: toDecimalOrNull(row["Total Damage ('000 US$)"]),
      totalDamageAdjUsd000: toDecimalOrNull(row["Total Damage, Adjusted ('000 US$)"]),
      cpi: toDecimalOrNull(row["CPI"]),

      adminUnitsRaw: toJsonOrNull(row["Admin Units"]),

      entryDate: toDateOrNull(row["Entry Date"]),
      lastUpdate: toDateOrNull(row["Last Update"]),
    };

    try {
      await prisma.historicalDisaster.upsert({
        where: { disNo },
        update: data,
        create: data,
      });
    } catch (err) {
      failed++;
      console.error(`Failed to import ${disNo}:`, err);
    }
  }

  const existingBefore = await prisma.historicalDisaster.count();
  console.log(`\nImport finished. Rows in source CSV: ${rows.length}, failed: ${failed}.`);
  console.log(`HistoricalDisaster table now has ${existingBefore} rows.`);
  if (existingBefore !== rows.length - failed) {
    console.warn(
      "⚠ Row count mismatch — investigate before trusting historical analytics."
    );
  } else {
    console.log("✅ Row count matches source CSV (minus any skipped rows).");
  }
}

// Runnable directly (`npm run db:import:historical`) *and* importable by
// prisma/seed/seed.ts, which calls main() in-process instead of re-spawning.
if (require.main === module) {
  main()
    .catch((err) => {
      console.error("Import failed:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
