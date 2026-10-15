import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Link, Route, Routes } from "react-router-dom";
import { useState } from "react";
import { ModuleBoundary } from "./ModuleBoundary";
import { Badge, Dialog, SeverityBadge, TextField, ToastProvider, useToast } from "./ui";

function Bomb(): never {
  throw new Error("boom");
}

describe("ModuleBoundary (error isolation)", () => {
  it("contains a crashing page, keeps siblings alive, and recovers on navigation", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <nav><Link to="/b">Go B</Link></nav>
        <p>Shell still here</p>
        <Routes>
          <Route path="/a" element={<ModuleBoundary name="Analytics"><Bomb /></ModuleBoundary>} />
          <Route path="/b" element={<ModuleBoundary name="Shelters"><p>Shelters ok</p></ModuleBoundary>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Analytics is temporarily unavailable")).toBeInTheDocument();
    expect(screen.getByText("Shell still here")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Go B" }));
    expect(await screen.findByText("Shelters ok")).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe("design system", () => {
  it("badges carry a text label and an icon, never colour alone", () => {
    const { container } = render(<><Badge tone="critical">Critical</Badge><SeverityBadge severity="HIGH" /></>);
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(container.querySelectorAll("svg[aria-hidden='true']").length).toBe(2);
  });

  it("form fields link label, error and aria-invalid", () => {
    render(<TextField label="Title" error="Required" />);
    const input = screen.getByLabelText("Title");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Required");
  });

  it("toasts appear and can be dismissed", async () => {
    function Demo() {
      const t = useToast();
      return <button onClick={() => t.push({ tone: "success", title: "Saved" })}>go</button>;
    }
    render(<ToastProvider><Demo /></ToastProvider>);
    await userEvent.click(screen.getByText("go"));
    expect(screen.getByText("Saved")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("dialog is modal, closes on Escape, and restores focus", async () => {
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>open</button>
          <Dialog open={open} onClose={() => setOpen(false)} title="Confirm"><p>body</p></Dialog>
        </>
      );
    }
    render(<Demo />);
    const trigger = screen.getByText("open");
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Confirm" })).toHaveAttribute("aria-modal", "true");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
