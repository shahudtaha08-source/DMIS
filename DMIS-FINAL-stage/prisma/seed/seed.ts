/**
 * `npm run db:seed --workspace=services/api`
 *
 * One command that takes a fresh local database to a usable demo state, in
 * dependency order:
 *   1. Historical disasters from data/disasterIND.csv (783 rows, read-only)
 *   2. Bootstrap ADMIN user   (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *   3. Operational demo data   (teams, shelters, resources, Pune Flood)
 *
 * Steps are called in-process rather than re-spawned as child processes: one
 * script, one place to read, and no dependency on how `npx` is resolved on the
 * host (it is `npx.cmd` on Windows, which `execFileSync("npx", ...)` cannot
 * find). Each step stays independently runnable and idempotent, so a step can
 * be re-run on its own after a failure without redoing the others.
 *
 * Child steps are not aborted on error: each records its own failure, the
 * runner reports which steps failed, and the process exits non-zero. A partial
 * seed is recoverable because every step is idempotent.
 */
import path from "node:path";
import dotenv from "dotenv";

// Steps load .env themselves; loading here too means DATABASE_URL is present
// in this process before any PrismaClient is constructed.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

type Step = { label: string; run: () => Promise<void> };

async function main() {
  const steps: Step[] = [
    {
      label: "Historical disasters (data/disasterIND.csv)",
      run: () => import("../imports/import-historical").then((m) => m.main()),
    },
    {
      label: "Bootstrap admin user (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)",
      run: () => import("./seed-admin").then((m) => m.main()),
    },
    {
      label: "Operational demo data (teams, shelters, resources, Pune Flood scenario)",
      run: () => import("./seed-operational").then((m) => m.main()),
    },
  ];

  const failed: string[] = [];
  for (const step of steps) {
    console.log(`\n=== Seeding: ${step.label} ===`);
    try {
      await step.run();
    } catch (err) {
      failed.push(step.label);
      console.error(`\nStep failed: ${step.label}`);
      console.error(err);
    }
  }

  if (failed.length) {
    console.error(`\nSeed incomplete. ${failed.length} step(s) failed:`);
    for (const f of failed) console.error(`  - ${f}`);
    process.exitCode = 1;
    return;
  }
  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error("Seed runner failed:", err);
  process.exitCode = 1;
});
