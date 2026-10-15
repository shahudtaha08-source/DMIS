import "../../test/setup";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { createApp } from "../../app";
import { InMemoryUserRepository } from "../../test/inMemoryUserRepository";
import { setUserRepository, type UserRecord } from "./userRepository";
import { hashPassword, verifyPassword } from "./password";

const PASSWORD = "Passw0rdTest";
const repo = new InMemoryUserRepository();
let server: Server;
let base: string;
let limitedServer: Server;
let limitedBase: string;
const users: Record<string, UserRecord> = {};

function listen(app: ReturnType<typeof createApp>): Promise<[Server, string]> {
  return new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve([s, `http://127.0.0.1:${(s.address() as AddressInfo).port}`]));
  });
}

async function call(path: string, opts: { method?: string; body?: unknown; token?: string; base?: string } = {}) {
  const res = await fetch((opts.base ?? base) + path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, body: (await res.json()) as any };
}

async function loginToken(email: string) {
  const r = await call("/api/auth/login", { body: { email, password: PASSWORD } });
  assert.equal(r.status, 200);
  return r.body.data.token as string;
}

before(async () => {
  setUserRepository(repo);
  for (const [key, role] of [["admin", "ADMIN"], ["officer", "OFFICER"], ["volunteer", "VOLUNTEER"]] as const) {
    users[key] = await repo.create({ email: `${key}@dmis.test`, name: key, role, passwordHash: await hashPassword(PASSWORD) });
  }
  users.inactive = await repo.create({ email: "inactive@dmis.test", name: "inactive", role: "OFFICER", passwordHash: await hashPassword(PASSWORD) });
  users.inactive.isActive = false;
  [server, base] = await listen(createApp({ auth: { loginRateLimitMax: 1000 } }));
  [limitedServer, limitedBase] = await listen(createApp({ auth: { loginRateLimitMax: 3 } }));
});

after(() => {
  server.close();
  limitedServer.close();
});

test("password hashing: hash differs from plaintext, verifies correctly", async () => {
  const h = await hashPassword(PASSWORD);
  assert.notEqual(h, PASSWORD);
  assert.equal(await verifyPassword(PASSWORD, h), true);
  assert.equal(await verifyPassword("wrong", h), false);
});

test("login succeeds, returns token + user without passwordHash", async () => {
  const r = await call("/api/auth/login", { body: { email: "ADMIN@dmis.test", password: PASSWORD } }); // case-insensitive email
  assert.equal(r.status, 200);
  assert.equal(r.body.success, true);
  assert.ok(r.body.data.token);
  assert.equal(r.body.data.user.role, "ADMIN");
  assert.equal("passwordHash" in r.body.data.user, false);
  assert.equal(JSON.stringify(r.body).includes("$2"), false, "no bcrypt hash anywhere in response");
});

test("login failures are generic: wrong password, unknown email, inactive account", async () => {
  const cases = [
    { email: "admin@dmis.test", password: "WrongPass1" },
    { email: "nobody@dmis.test", password: PASSWORD },
    { email: "inactive@dmis.test", password: PASSWORD },
  ];
  const messages = new Set<string>();
  for (const body of cases) {
    const r = await call("/api/auth/login", { body });
    assert.equal(r.status, 401);
    assert.equal(r.body.error.code, "UNAUTHORIZED");
    messages.add(r.body.error.message);
  }
  assert.equal(messages.size, 1, "all failures return the identical message");
});

test("login validation: bad body returns 422", async () => {
  assert.equal((await call("/api/auth/login", { body: { email: "not-an-email", password: "x" } })).status, 422);
  assert.equal((await call("/api/auth/login", { body: {} })).status, 422);
});

test("login rate limiting returns 429 after the limit", async () => {
  const statuses: number[] = [];
  for (let i = 0; i < 5; i++) {
    statuses.push((await call("/api/auth/login", { base: limitedBase, body: { email: "admin@dmis.test", password: "WrongPass1" } })).status);
  }
  assert.deepEqual(statuses, [401, 401, 401, 429, 429]);
});

test("/me: no token, garbage token, wrong-secret token, alg=none, expired token are all 401", async () => {
  assert.equal((await call("/api/auth/me")).status, 401);
  assert.equal((await call("/api/auth/me", { token: "garbage" })).status, 401);

  const id = users.admin.id;
  const wrongSecret = jwt.sign({ role: "ADMIN" }, "some-other-secret-some-other-secret-1", { subject: id, issuer: "dmis-api" });
  assert.equal((await call("/api/auth/me", { token: wrongSecret })).status, 401);

  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const none = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: id, role: "ADMIN", iss: "dmis-api" })}.`;
  assert.equal((await call("/api/auth/me", { token: none })).status, 401);

  const expired = jwt.sign({ role: "ADMIN" }, process.env.JWT_SECRET!, { subject: id, issuer: "dmis-api", expiresIn: -10 });
  assert.equal((await call("/api/auth/me", { token: expired })).status, 401);
});

test("/me with a valid token returns the user", async () => {
  const r = await call("/api/auth/me", { token: await loginToken("officer@dmis.test") });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.email, "officer@dmis.test");
  assert.equal("passwordHash" in r.body.data, false);
});

test("register is admin-only: 401 anonymous, 403 officer/volunteer, 201 admin", async () => {
  const body = { email: "new1@dmis.test", name: "New One", password: "Newpass123", role: "VOLUNTEER" };
  assert.equal((await call("/api/auth/register", { body })).status, 401);
  assert.equal((await call("/api/auth/register", { body, token: await loginToken("officer@dmis.test") })).status, 403);
  assert.equal((await call("/api/auth/register", { body, token: await loginToken("volunteer@dmis.test") })).status, 403);
  const ok = await call("/api/auth/register", { body, token: await loginToken("admin@dmis.test") });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.data.role, "VOLUNTEER");
  assert.equal("passwordHash" in ok.body.data, false);
  // and the new user can actually log in
  assert.equal((await call("/api/auth/login", { body: { email: "new1@dmis.test", password: "Newpass123" } })).status, 200);
});

test("register validation and conflicts", async () => {
  const admin = await loginToken("admin@dmis.test");
  const good = { email: "new2@dmis.test", name: "Two", password: "Newpass123", role: "OFFICER" };
  assert.equal((await call("/api/auth/register", { token: admin, body: { ...good, password: "short1" } })).status, 422);
  assert.equal((await call("/api/auth/register", { token: admin, body: { ...good, password: "allletters" } })).status, 422);
  assert.equal((await call("/api/auth/register", { token: admin, body: { ...good, role: "SUPERUSER" } })).status, 422);
  assert.equal((await call("/api/auth/register", { token: admin, body: { ...good, email: "bad" } })).status, 422);
  assert.equal((await call("/api/auth/register", { token: admin, body: good })).status, 201);
  const dup = await call("/api/auth/register", { token: admin, body: { ...good, email: "NEW2@dmis.test" } });
  assert.equal(dup.status, 409);
});

test("token stops working when the account is deactivated or its role changes", async () => {
  const token = await loginToken("officer@dmis.test");
  assert.equal((await call("/api/auth/me", { token })).status, 200);

  // role change takes effect immediately (role is read from DB, not the token)
  users.officer.role = "VOLUNTEER";
  const body = { email: "new3@dmis.test", name: "Three", password: "Newpass123", role: "OFFICER" };
  assert.equal((await call("/api/auth/register", { body, token })).status, 403);
  users.officer.role = "OFFICER";

  users.officer.isActive = false;
  assert.equal((await call("/api/auth/me", { token })).status, 401);
  users.officer.isActive = true;
});

test("refresh issues a new working token; requires auth", async () => {
  assert.equal((await call("/api/auth/refresh", { method: "POST" })).status, 401);
  const r = await call("/api/auth/refresh", { method: "POST", token: await loginToken("volunteer@dmis.test") });
  assert.equal(r.status, 200);
  assert.equal((await call("/api/auth/me", { token: r.body.data.token })).status, 200);
});

test("regression (Chunks 3): health is public and degrades gracefully; unknown routes 404 in the shared envelope", async () => {
  const h = await call("/api/health");
  assert.ok([200, 503].includes(h.status));
  assert.ok(["ok", "degraded"].includes(h.body.data.status));
  if (h.status === 200) {
    assert.equal(h.body.data.database, "connected");
  } else {
    assert.equal(h.body.data.status, "degraded");
  }
  const nf = await call("/api/does-not-exist");
  assert.equal(nf.status, 404);
  assert.equal(nf.body.error.code, "NOT_FOUND");
});
