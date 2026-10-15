import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiRequest, setUnauthorizedHandler } from "./api";
import { setToken } from "../auth/tokenStore";

function respond(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}
async function errorOf(p: Promise<unknown>): Promise<ApiClientError> {
  try {
    await p;
  } catch (e) {
    return e as ApiClientError;
  }
  throw new Error("expected rejection");
}
const envelope = (code: string, message: string) => ({ success: false, error: { code, message } });

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
  localStorage.clear();
});

describe("apiRequest", () => {
  it("unwraps the success envelope and sends the bearer token", async () => {
    setToken("tok123");
    const f = vi.fn(async () => new Response(JSON.stringify({ success: true, data: { hi: 1 }, meta: { page: 1, pageSize: 20, total: 5 } }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const r = await apiRequest<{ hi: number }>("/things");
    expect(r.data.hi).toBe(1);
    expect(r.meta?.total).toBe(5);
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toMatchObject({ Authorization: "Bearer tok123" });
  });

  it.each([
    [403, "FORBIDDEN", /permission/i],
    [404, "NOT_FOUND", /couldn't find/i],
    [429, "RATE_LIMITED", /too many requests/i],
    [503, "INTERNAL_ERROR", /temporarily unavailable/i],
  ])("maps %i to a friendly message", async (status, code, pattern) => {
    respond(status, envelope(code, "raw server text"));
    const err = await errorOf(apiRequest("/x"));
    expect(err.status).toBe(status);
    expect(err.userMessage).toMatch(pattern);
    expect(err.userMessage).not.toContain("raw server text");
  });

  it("shows server text for 409/422 (useful to the user) but never for 500", async () => {
    respond(422, envelope("VALIDATION_ERROR", "name: Required"));
    expect((await errorOf(apiRequest("/x"))).userMessage).toBe("name: Required");
    respond(409, envelope("CONFLICT", "Email already exists"));
    expect((await errorOf(apiRequest("/x"))).userMessage).toBe("Email already exists");
    respond(500, envelope("INTERNAL_ERROR", "PrismaClientKnownRequestError: secret internals"));
    const e = await errorOf(apiRequest("/x"));
    expect(e.userMessage).toMatch(/something went wrong/i);
    expect(e.userMessage).not.toMatch(/prisma/i);
  });

  it("401 on an authenticated call fires the session-expired handler", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    respond(401, envelope("UNAUTHORIZED", "Invalid or expired token"));
    const err = await errorOf(apiRequest("/auth/me"));
    expect(handler).toHaveBeenCalledOnce();
    expect(err.userMessage).toMatch(/session has expired/i);
  });

  it("401 on login (auth:false) is a credentials error, not an expired session", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    respond(401, envelope("UNAUTHORIZED", "Invalid email or password"));
    const err = await errorOf(apiRequest("/auth/login", { body: {}, auth: false }));
    expect(handler).not.toHaveBeenCalled();
    expect(err.userMessage).toBe("Invalid email or password");
  });

  it("network failure and timeout become distinct friendly errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const net = await errorOf(apiRequest("/x"));
    expect(net.kind).toBe("network");
    expect(net.userMessage).toMatch(/can't reach the server/i);

    vi.stubGlobal("fetch", vi.fn((_u: string, init: RequestInit) => new Promise((_res, rej) => init.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError"))))));
    const slow = await errorOf(apiRequest("/x", { timeoutMs: 20 }));
    expect(slow.kind).toBe("timeout");
  });

  it("non-envelope 200 responses are rejected as invalid", async () => {
    respond(200, { hello: "world" });
    expect((await errorOf(apiRequest("/x"))).kind).toBe("invalid-response");
  });
});
