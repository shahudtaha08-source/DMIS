import "../../test/setup";
import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../../app";
import { InMemoryUserRepository } from "../../test/inMemoryUserRepository";
import { setUserRepository } from "../auth/userRepository";
import { hashPassword } from "../auth/password";
import { InMemoryDashboardRepository } from "../../test/inMemoryDashboardRepository";
import { setDashboardRepository } from "./repository";

const userRepo = new InMemoryUserRepository();
const dashRepo = new InMemoryDashboardRepository();
let server: Server;
let base: string;
let volunteerToken: string;
let adminToken: string;

async function call(path: string, token?: string) {
  const res = await fetch(base + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: res.status, body: (await res.json()) as any };
}
async function login(email: string) {
  const r = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Passw0rdTest" }),
  });
  return ((await r.json()) as any).data.token as string;
}

before(async () => {
  setUserRepository(userRepo);
  setDashboardRepository(dashRepo);
  const hash = await hashPassword("Passw0rdTest");
  await userRepo.create({ email: "admin@dash.test", name: "Admin", role: "ADMIN", passwordHash: hash });
  await userRepo.create({ email: "vol@dash.test", name: "Vol", role: "VOLUNTEER", passwordHash: hash });
  await new Promise<void>((resolve) => {
    server = createApp().listen(0, "127.0.0.1", () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  adminToken = await login("admin@dash.test");
  volunteerToken = await login("vol@dash.test");
});

after(() => server.close());

beforeEach(() => {
  dashRepo.failing.clear();
  dashRepo.activeIncidents = 0;
  dashRepo.criticalIncidents = 0;
  dashRepo.affectedPopulation = 0;
  dashRepo.historicalCount = 0;
  dashRepo.activeTeamsCount = 0;
  dashRepo.shelters = { capacity: 0, occupancy: 0, sheltersOpen: 0 };
  dashRepo.resources = { lowStock: 0, outOfStock: 0, total: 0 };
  dashRepo.statusBreakdown = [];
  dashRepo.decadeBreakdown = [];
});

test("requires authentication", async () => {
  assert.equal((await call("/api/dashboard/summary")).status, 401);
});

test("every role, including VOLUNTEER, can read the dashboard", async () => {
  assert.equal((await call("/api/dashboard/summary", volunteerToken)).status, 200);
  assert.equal((await call("/api/dashboard/summary", adminToken)).status, 200);
});

test("returns real aggregated numbers, not placeholders", async () => {
  dashRepo.activeIncidents = 4;
  dashRepo.criticalIncidents = 1;
  dashRepo.affectedPopulation = 15234;
  dashRepo.historicalCount = 783;
  dashRepo.activeTeamsCount = 6;
  dashRepo.shelters = { capacity: 900, occupancy: 210, sheltersOpen: 5 };
  dashRepo.resources = { lowStock: 2, outOfStock: 1, total: 30 };
  dashRepo.statusBreakdown = [{ status: "REPORTED", count: 2 }, { status: "VERIFIED", count: 2 }];
  dashRepo.decadeBreakdown = [{ decade: 2020, count: 40 }, { decade: 2010, count: 55 }];

  const r = await call("/api/dashboard/summary", adminToken);
  assert.equal(r.status, 200);
  const d = r.body.data;
  assert.equal(d.activeIncidents, 4);
  assert.equal(d.criticalIncidents, 1);
  assert.equal(d.affectedPopulationEstimate, 15234);
  assert.equal(d.historicalDisasterCount, 783);
  assert.equal(d.activeTeams, 6);
  assert.equal(d.shelterCapacityTotal, 900);
  assert.equal(d.shelterOccupancyTotal, 210);
  assert.equal(d.sheltersOpen, 5);
  assert.equal(d.resourcesLowStock, 2);
  assert.equal(d.resourcesOutOfStock, 1);
  assert.deepEqual(d.incidentsByStatus, [{ status: "REPORTED", count: 2 }, { status: "VERIFIED", count: 2 }]);
  assert.deepEqual(d.historicalByDecade, [{ decade: 2020, count: 40 }, { decade: 2010, count: 55 }]);
  assert.deepEqual(d.unavailable, []);
  assert.ok(new Date(d.generatedAt).getTime() > 0);
});

test("a failing metric degrades to null and is listed, without failing the whole response", async () => {
  dashRepo.activeIncidents = 3;
  dashRepo.failing.add("resources");
  dashRepo.failing.add("historicalByDecade");

  const r = await call("/api/dashboard/summary", adminToken);
  assert.equal(r.status, 200); // still 200 — partial data, not an error response
  const d = r.body.data;
  assert.equal(d.activeIncidents, 3); // unaffected metric still present
  assert.equal(d.resourcesLowStock, null);
  assert.equal(d.resourcesOutOfStock, null);
  assert.deepEqual(d.historicalByDecade, []);
  assert.deepEqual(d.unavailable.sort(), ["historicalByDecade", "resources"]);
});

test("database unavailable: every metric degrades gracefully, still 200 with all-null/empty + unavailable list", async () => {
  dashRepo.failing.add("activeIncidents");
  dashRepo.failing.add("criticalIncidents");
  dashRepo.failing.add("affectedPopulationEstimate");
  dashRepo.failing.add("historicalDisasterCount");
  dashRepo.failing.add("activeTeams");
  dashRepo.failing.add("shelters");
  dashRepo.failing.add("resources");
  dashRepo.failing.add("incidentsByStatus");
  dashRepo.failing.add("historicalByDecade");

  const r = await call("/api/dashboard/summary", adminToken);
  assert.equal(r.status, 200);
  const d = r.body.data;
  for (const k of ["activeIncidents", "criticalIncidents", "affectedPopulationEstimate", "historicalDisasterCount", "activeTeams", "shelterCapacityTotal", "shelterOccupancyTotal", "sheltersOpen", "resourcesLowStock", "resourcesOutOfStock", "resourcesTotal"]) {
    assert.equal(d[k], null, `${k} should be null`);
  }
  assert.deepEqual(d.incidentsByStatus, []);
  assert.deepEqual(d.historicalByDecade, []);
  assert.equal(d.unavailable.length, 9);
});
