import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import type { UserDTO } from "@dmis/shared";
import { AppProviders, AppRoutes } from "../App";

export const admin: UserDTO = { id: "u1", email: "admin@dmis.test", name: "Ada Admin", role: "ADMIN", phone: null, isActive: true, createdAt: "2026-01-01T00:00:00.000Z" };
export const volunteer: UserDTO = { ...admin, id: "u3", email: "vol@dmis.test", name: "Vic Volunteer", role: "VOLUNTEER" };

type Reply = { status: number; body: unknown };
/** Route table keyed "METHOD /path" (path relative to /api). Unknown routes 404 in the shared envelope. */
export function mockFetch(routes: Record<string, Reply | (() => Reply)>) {
  const all: Record<string, Reply | (() => Reply)> = {
    "GET /health": { status: 200, body: { success: true, data: { status: "ok", database: "connected" } } },
    ...routes,
  };
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^.*\/api/, "");
    const key = `${(init?.method ?? "GET").toUpperCase()} ${path}`;
    const hit = all[key];
    const reply = typeof hit === "function" ? hit() : hit ?? { status: 404, body: { success: false, error: { code: "NOT_FOUND", message: "nope" } } };
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

export const ok = (data: unknown): Reply => ({ status: 200, body: { success: true, data } });
export const fail = (status: number, code: string, message: string): Reply => ({ status, body: { success: false, error: { code, message } } });

export function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>
  );
}
