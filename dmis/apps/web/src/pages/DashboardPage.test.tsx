import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import type { DashboardSummaryDTO } from "@dmis/shared";
import { admin, fail, mockFetch, ok, renderApp } from "../test/utils";
import { setToken } from "../auth/tokenStore";

const base: DashboardSummaryDTO = {
  activeIncidents: 0, criticalIncidents: 0, affectedPopulationEstimate: 0, historicalDisasterCount: 783,
  activeTeams: 0, shelterCapacityTotal: 0, shelterOccupancyTotal: 0, sheltersOpen: 0,
  resourcesLowStock: 0, resourcesOutOfStock: 0, resourcesTotal: 0,
  incidentsByStatus: [], historicalByDecade: [], unavailable: [], generatedAt: "2026-01-01T00:00:00.000Z",
};

function setup(summary: Partial<DashboardSummaryDTO>) {
  setToken("t");
  mockFetch({ "GET /auth/me": ok(admin), "GET /dashboard/summary": ok({ ...base, ...summary }) });
  return renderApp("/");
}

describe("DashboardPage", () => {
  it("renders real numbers from the API, not placeholders", async () => {
    setup({ activeIncidents: 4, criticalIncidents: 1, historicalDisasterCount: 783, activeTeams: 6 });
    expect(await screen.findByText("Welcome, Ada Admin")).toBeInTheDocument();
    expect(await screen.findByText("4")).toBeInTheDocument();
    expect(screen.getByText("783")).toBeInTheDocument();
    expect(screen.getByText("1 critical")).toBeInTheDocument();
  });

  it("shows an em dash (not a false 0) for metrics the API reports as unavailable, plus a banner", async () => {
    setup({ resourcesLowStock: null, resourcesOutOfStock: null, resourcesTotal: null, unavailable: ["resources"] });
    await screen.findByText("Welcome, Ada Admin");
    expect(await screen.findByRole("alert")).toHaveTextContent("resources");
    const card = (await screen.findByText("Low / out-of-stock resources")).closest("div")!.parentElement!;
    expect(within(card).getAllByLabelText("unavailable").length).toBeGreaterThan(0);
  });

  it("renders the incident-status and historical-decade charts from real data", async () => {
    setup({
      incidentsByStatus: [{ status: "REPORTED", count: 3 }, { status: "RESOLVED", count: 2 }],
      historicalByDecade: [{ decade: 2010, count: 162 }, { decade: 2020, count: 63 }],
    });
    await screen.findByText("Welcome, Ada Admin");
    expect(await screen.findByText("Current incidents by status")).toBeInTheDocument();
    // Chart tick labels render inside Recharts' own async measurement pass.
    expect(await screen.findByText("Reported")).toBeInTheDocument();
    expect(await screen.findByText("Historical disasters by decade")).toBeInTheDocument();
    expect(await screen.findByText("2020s")).toBeInTheDocument();
  });

  it("empty operational data shows an honest empty message instead of a blank chart", async () => {
    setup({ incidentsByStatus: [] });
    await screen.findByText("Welcome, Ada Admin");
    expect(await screen.findByText("No incidents recorded yet.")).toBeInTheDocument();
  });

  it("a dashboard-summary failure shows a retry, and retry recovers", async () => {
    setToken("t");
    const f = mockFetch({ "GET /auth/me": ok(admin), "GET /dashboard/summary": fail(503, "INTERNAL_ERROR", "boom") });
    renderApp("/");
    expect(await screen.findByText("Dashboard temporarily unavailable")).toBeInTheDocument();
    f.mockClear();
    mockFetch({ "GET /auth/me": ok(admin), "GET /dashboard/summary": ok(base) });
    const { default: userEvent } = await import("@testing-library/user-event");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByText("783")).toBeInTheDocument());
  });
});
