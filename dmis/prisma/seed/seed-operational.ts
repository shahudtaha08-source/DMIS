/**
 * `npm run db:seed --workspace=services/api` -> "Operational demo data"
 *
 * Seeds a small, *labelled* demo dataset so the operational modules are not
 * empty on a fresh install: three rescue teams, four shelters, six resource
 * items, and the required Pune Flood scenario (critical, 4,800 affected,
 * assigned to Flood Rescue Team Alpha, with a published critical alert).
 *
 * Two rules, deliberately:
 *  1. Demo rows are real rows in the real tables - the app never special-cases
 *     "demo" data, so what you see is exactly what production code would show.
 *  2. Every step is idempotent and keyed on a stable natural key, so re-running
 *     the seed never duplicates rows or resets a status an operator has moved
 *     on from. Set SEED_OPERATIONAL=0 to skip this file entirely.
 */
import path from "node:path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "@prisma/client";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const prisma = new PrismaClient();

/** Pune coordinates, used by the demo incident and shelters. */
const PUNE = { latitude: 18.5204, longitude: 73.8567 };

const TEAMS = [
  {
    name: "Flood Rescue Team Alpha",
    specialization: "Water rescue",
    status: "AVAILABLE" as const,
    baseLocation: "Pune, Maharashtra",
  },
  {
    name: "Earthquake Response Unit 3",
    specialization: "Urban search and rescue",
    status: "OFF_DUTY" as const,
    baseLocation: "Mumbai, Maharashtra",
  },
  {
    name: "Medical Response Team Bravo",
    specialization: "Emergency medical",
    status: "AVAILABLE" as const,
    baseLocation: "Nashik, Maharashtra",
  },
];

const SHELTERS = [
  {
    name: "Shivaji Stadium Relief Camp",
    address: "Shivaji Nagar, Pune, Maharashtra",
    capacity: 500,
    currentOccupancy: 320,
    facilities: ["Drinking water", "Medical aid", "Charging points", "Wheelchair access"],
    managerContact: "+91 20 2555 0100",
    status: "OPEN" as const,
    offset: { latitude: 0.012, longitude: 0.014 },
  },
  {
    name: "Kothrud Community Hall Shelter",
    address: "Kothrud, Pune, Maharashtra",
    capacity: 300,
    currentOccupancy: 300,
    facilities: ["Drinking water", "Food distribution"],
    managerContact: "+91 20 2450 1122",
    status: "FULL" as const,
    offset: { latitude: -0.02, longitude: -0.008 },
  },
  {
    name: "Balewadi Sports Complex Shelter",
    address: "Balewadi, Pune, Maharashtra",
    capacity: 800,
    currentOccupancy: 410,
    facilities: ["Drinking water", "Medical aid", "Child play area", "Wheelchair access"],
    managerContact: "+91 20 6620 4455",
    status: "OPEN" as const,
    offset: { latitude: 0.045, longitude: 0.03 },
  },
  {
    name: "Hadapsar Industrial Hall Shelter",
    address: "Hadapsar, Pune, Maharashtra",
    capacity: 250,
    currentOccupancy: 0,
    facilities: ["Drinking water"],
    managerContact: null,
    status: "CLOSED" as const,
    offset: { latitude: -0.035, longitude: 0.042 },
  },
];

/** `shelterName` is where the stock is held - Resource.locationId points at a
 *  Shelter in the schema, so a resource is always at a named site. */
const RESOURCES = [
  { name: "Bottled Water (1L)", category: "Water", unit: "bottles", quantityAvailable: 8400, lowStockThreshold: 2000, shelterName: "Shivaji Stadium Relief Camp" },
  { name: "Water purification tablets", category: "Water", unit: "tablets", quantityAvailable: 900, lowStockThreshold: 1000, shelterName: "Shivaji Stadium Relief Camp" },
  { name: "Ready-to-eat meals", category: "Food", unit: "packs", quantityAvailable: 5200, lowStockThreshold: 1500, shelterName: "Balewadi Sports Complex Shelter" },
  { name: "First aid kits", category: "Medical", unit: "kits", quantityAvailable: 320, lowStockThreshold: 100, shelterName: "Balewadi Sports Complex Shelter" },
  { name: "Life jackets (adult)", category: "Rescue Equipment", unit: "units", quantityAvailable: 45, lowStockThreshold: 60, shelterName: "Shivaji Stadium Relief Camp" },
  { name: "Portable water purifier", category: "Water", unit: "units", quantityAvailable: 12, lowStockThreshold: 8, shelterName: "Kothrud Community Hall Shelter" },
];

/** Non-production accounts so every role can be demonstrated. Passwords are
 *  environment-driven; nothing here is a real person or a real secret. */
const DEMO_USERS = [
  {
    email: (process.env.SEED_OFFICER_EMAIL ?? "officer@dmis.gov.in").toLowerCase(),
    name: "Priya Sharma",
    role: "OFFICER" as const,
    password: process.env.SEED_OFFICER_PASSWORD ?? "Admin@12345",
  },
  {
    email: (process.env.SEED_VOLUNTEER_EMAIL ?? "volunteer@dmis.gov.in").toLowerCase(),
    name: "Arjun Verma",
    role: "VOLUNTEER" as const,
    password: process.env.SEED_VOLUNTEER_PASSWORD ?? "Admin@12345",
  },
];

function statusFor(available: number, threshold: number) {
  if (available === 0) return "OUT_OF_STOCK" as const;
  if (available <= threshold) return "LOW_STOCK" as const;
  return "AVAILABLE" as const;
}

async function seedUsers(): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      ids[u.role] = existing.id;
      continue;
    }
    const created = await prisma.user.create({
      data: { email: u.email, name: u.name, role: u.role, passwordHash: await bcrypt.hash(u.password, 12) },
    });
    ids[u.role] = created.id;
    console.log(`Created ${u.role} user ${u.email}`);
  }
  return ids;
}

export async function main() {
  if (process.env.SEED_OPERATIONAL === "0") {
    console.log("SEED_OPERATIONAL=0 - skipping operational demo data.");
    return;
  }

  const users = await seedUsers();
  const officerId = users.OFFICER ?? users.ADMIN;
  if (!officerId) {
    console.warn("No OFFICER or ADMIN account available - skipping operational data.");
    return;
  }

  // --- Teams ---------------------------------------------------------------
  const teamIds: Record<string, string> = {};
  for (const t of TEAMS) {
    const existing = await prisma.rescueTeam.findFirst({ where: { name: t.name } });
    teamIds[t.name] = existing ? existing.id : (await prisma.rescueTeam.create({ data: t })).id;
  }

  // --- Shelters ------------------------------------------------------------
  const shelterIds: Record<string, string> = {};
  for (const s of SHELTERS) {
    const existing = await prisma.shelter.findFirst({ where: { name: s.name } });
    if (existing) {
      shelterIds[s.name] = existing.id;
      continue;
    }
    const { offset, ...rest } = s;
    const created = await prisma.shelter.create({
      data: {
        ...rest,
        latitude: PUNE.latitude + offset.latitude,
        longitude: PUNE.longitude + offset.longitude,
      },
    });
    shelterIds[s.name] = created.id;
  }

  // --- Resources -----------------------------------------------------------
  for (const r of RESOURCES) {
    const existing = await prisma.resource.findFirst({ where: { name: r.name } });
    if (existing) continue;
    const created = await prisma.resource.create({
      data: {
        name: r.name,
        category: r.category,
        unit: r.unit,
        quantityAvailable: r.quantityAvailable,
        lowStockThreshold: r.lowStockThreshold,
        status: statusFor(r.quantityAvailable, r.lowStockThreshold),
        locationId: shelterIds[r.shelterName] ?? null,
      },
    });
    // Opening balance recorded in the ledger, so stock history is complete
    // from the first row rather than starting with an unexplained quantity.
    await prisma.resourceTransaction.create({
      data: {
        resourceId: created.id,
        type: "RESTOCK",
        quantity: r.quantityAvailable,
        performedById: officerId,
      },
    });
  }

  // --- The required demonstration scenario ---------------------------------
  // Pune Flood, CRITICAL, 4,800 affected, assigned to Flood Rescue Team Alpha,
  // with a published CRITICAL alert. Keyed on the title so re-seeding is a no-op.
  const incidentTitle = "Pune Flood 2026";
  const existingIncident = await prisma.incident.findFirst({ where: { title: incidentTitle } });
  const incident =
    existingIncident ??
    (await prisma.incident.create({
      data: {
        title: incidentTitle,
        disasterType: "Flood",
        location: "Pune, Maharashtra",
        description:
          "Continuous heavy rainfall over the last 48 hours has caused the Mula-Mutha river to overflow. " +
          "Low-lying wards in Shivaji Nagar, Kothrud and Hadapsar are partially submerged. " +
          "Multiple residential colonies require evacuation and three relief camps are operating.",
        severity: "CRITICAL",
        status: "RESPONSE_ACTIVE",
        latitude: PUNE.latitude,
        longitude: PUNE.longitude,
        affectedPopulationEstimate: 4800,
        reportedBy: { connect: { id: officerId } },
        assignedTeam: teamIds["Flood Rescue Team Alpha"] ? { connect: { id: teamIds["Flood Rescue Team Alpha"] } } : undefined,
      } satisfies Prisma.IncidentCreateInput,
    }));
  if (!existingIncident) {
    // The incident timeline is read from the audit log (see incidents
    // repository `timeline()`), so seed the history there - otherwise the
    // demo incident would open with an empty timeline, which reads as a bug.
    const timeline: { action: string; label: string; detail: string | null }[] = [
      { action: "created", label: "Incident reported", detail: "Reported by district officer" },
      { action: "status", label: "Status: VERIFIED", detail: "Flood extent confirmed by field team" },
      { action: "assigned", label: "Team assigned", detail: "Flood Rescue Team Alpha" },
      { action: "status", label: "Status: RESPONSE_ACTIVE", detail: "Two relief camps operational" },
    ];
    for (const entry of timeline) {
      await prisma.auditLog.create({
        data: {
          userId: officerId,
          action: entry.action,
          entityType: "Incident",
          entityId: incident.id,
          metadata: { label: entry.label, detail: entry.detail },
        },
      });
    }
    console.log(`Created demo incident "${incidentTitle}" (CRITICAL, 4,800 affected).`);
  }

  const existingAlert = await prisma.alert.findFirst({ where: { relatedIncidentId: incident.id } });
  if (!existingAlert) {
    const alert = await prisma.alert.create({
      data: {
        title: "Critical Flood Warning - Pune",
        message:
          "Flood water is rising in the Mula-Mutha river basin. Residents of low-lying areas in Shivaji Nagar, " +
          "Kothrud and Hadapsar should move to the designated relief camps immediately. Avoid all travel through waterlogged roads.",
        severity: "CRITICAL",
        status: "PUBLISHED",
        affectedArea: "Pune, Maharashtra",
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 72 * 60 * 60 * 1000),
        relatedIncident: { connect: { id: incident.id } },
        createdBy: { connect: { id: officerId } },
      } satisfies Prisma.AlertCreateInput,
    });
    await prisma.auditLog.create({
      data: {
        userId: officerId,
        action: "created",
        entityType: "Alert",
        entityId: alert.id,
        metadata: { label: "Alert published", detail: "Critical Flood Warning - Pune" },
      },
    });
    console.log('Published demo CRITICAL alert "Critical Flood Warning - Pune".');
  }

  console.log("Operational demo data ready:", {
    teams: await prisma.rescueTeam.count(),
    shelters: await prisma.shelter.count(),
    resources: await prisma.resource.count(),
    incidents: await prisma.incident.count(),
    alerts: await prisma.alert.count(),
  });
  console.log("Demo sign-ins: officer@dmis.gov.in (can edit) · volunteer@dmis.gov.in (read-only)");
}

// Runnable directly and importable by seed.ts (which calls main() in-process).
if (require.main === module) {
  main()
    .catch((err) => {
      console.error("Operational seed failed:", err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
