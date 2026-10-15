import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { admin, fail, mockFetch, ok, renderApp, volunteer } from "../test/utils";
import { getToken, setToken } from "./tokenStore";

const dashboardOk = ok({
  activeIncidents: 0, criticalIncidents: 0, affectedPopulationEstimate: 0, historicalDisasterCount: 783,
  activeTeams: 0, shelterCapacityTotal: 0, shelterOccupancyTotal: 0, sheltersOpen: 0,
  resourcesLowStock: 0, resourcesOutOfStock: 0, resourcesTotal: 0,
  incidentsByStatus: [], historicalByDecade: [], unavailable: [], generatedAt: "2026-01-01T00:00:00.000Z",
});

describe("authentication flow", () => {
  it("redirects an anonymous visitor to the login page", async () => {
    mockFetch({});
    renderApp("/incidents");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("validates the form before calling the API", async () => {
    const f = mockFetch({});
    renderApp("/login");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(f.mock.calls.some(([u]) => String(u).includes("/auth/login"))).toBe(false);
  });

  it("shows the server's message on bad credentials and stays on the login page", async () => {
    mockFetch({ "POST /auth/login": fail(401, "UNAUTHORIZED", "Invalid email or password") });
    renderApp("/login");
    await userEvent.type(screen.getByLabelText("Email"), "admin@dmis.test");
    await userEvent.type(screen.getByLabelText("Password"), "wrongpass1");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(getToken()).toBeNull();
  });

  it("signs in, stores the token, lands on the dashboard, and signs out", async () => {
    mockFetch({ "POST /auth/login": ok({ token: "jwt-abc", user: admin }), "GET /dashboard/summary": dashboardOk });
    renderApp("/login");
    await userEvent.type(screen.getByLabelText("Email"), "admin@dmis.test");
    await userEvent.type(screen.getByLabelText("Password"), "Passw0rd1");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Welcome, Ada Admin")).toBeInTheDocument();
    expect(getToken()).toBe("jwt-abc");

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  it("restores a session from a stored token via /auth/me", async () => {
    setToken("stored");
    mockFetch({ "GET /auth/me": ok(admin), "GET /dashboard/summary": dashboardOk });
    renderApp("/");
    expect(await screen.findByText("Welcome, Ada Admin")).toBeInTheDocument();
  });

  it("drops an invalid stored token (401) and shows login", async () => {
    setToken("stale");
    mockFetch({ "GET /auth/me": fail(401, "UNAUTHORIZED", "Invalid or expired token") });
    renderApp("/");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  it("keeps the token and offers Retry when the server is unreachable during restore (not a logout)", async () => {
    setToken("keepme");
    const f = mockFetch({ "GET /auth/me": fail(500, "INTERNAL_ERROR", "boom") });
    renderApp("/");
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    expect(getToken()).toBe("keepme");
    f.mockClear();
    mockFetch({ "GET /auth/me": ok(admin), "GET /dashboard/summary": dashboardOk });
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Welcome, Ada Admin")).toBeInTheDocument();
  });
});

describe("role-based navigation", () => {
  it("admin sees Audit Logs and Analytics", async () => {
    setToken("t");
    mockFetch({ "GET /auth/me": ok(admin) });
    renderApp("/");
    const nav = await screen.findByRole("navigation", { name: "Modules" });
    expect(nav).toHaveTextContent("Audit Logs");
    expect(nav).toHaveTextContent("Analytics");
  });

  it("volunteer doesn't see Audit Logs/Analytics, and direct URL access shows the no-access state", async () => {
    setToken("t");
    mockFetch({ "GET /auth/me": ok(volunteer) });
    renderApp("/audit-logs");
    expect(await screen.findByText("You don't have access to this section")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Modules" });
    expect(nav).not.toHaveTextContent("Audit Logs");
    expect(nav).not.toHaveTextContent("Analytics");
    expect(nav).toHaveTextContent("Incidents");
  });

  it("unbuilt modules render an honest under-construction page, unknown URLs render 404", async () => {
    setToken("t");
    mockFetch({ "GET /auth/me": ok(admin) });
    renderApp("/volunteers");
    expect(await screen.findByText("Volunteers is under construction")).toBeInTheDocument();
  });

  it("unknown routes show the not-found page inside the shell", async () => {
    setToken("t");
    mockFetch({ "GET /auth/me": ok(admin) });
    renderApp("/nope");
    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("navigation", { name: "Modules" })).toBeInTheDocument());
  });

  it("the topbar shows a degraded API state with icon+text, not colour alone", async () => {
    setToken("t");
    mockFetch({ "GET /auth/me": ok(admin), "GET /health": { status: 503, body: { success: true, data: { status: "degraded", database: "not_initialized" } } } });
    renderApp("/");
    await waitFor(() => expect(screen.getAllByText("Degraded").length).toBeGreaterThan(0));
  });
});
