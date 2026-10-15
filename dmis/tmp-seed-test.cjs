var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_node_path = __toESM(require("node:path"));
var import_dotenv = __toESM(require("dotenv"));
import_dotenv.default.config({ path: import_node_path.default.resolve(__dirname, "../../.env") });
async function main() {
  const steps = [
    {
      label: "Historical disasters (data/disasterIND.csv)",
      run: () => import("../imports/import-historical").then((m) => m.main())
    },
    {
      label: "Bootstrap admin user (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)",
      run: () => import("./seed-admin").then((m) => m.main())
    },
    {
      label: "Operational demo data (teams, shelters, resources, Pune Flood scenario)",
      run: () => import("./seed-operational").then((m) => m.main())
    }
  ];
  const failed = [];
  for (const step of steps) {
    console.log(`
=== Seeding: ${step.label} ===`);
    try {
      await step.run();
    } catch (err) {
      failed.push(step.label);
      console.error(`
Step failed: ${step.label}`);
      console.error(err);
    }
  }
  if (failed.length) {
    console.error(`
Seed incomplete. ${failed.length} step(s) failed:`);
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
