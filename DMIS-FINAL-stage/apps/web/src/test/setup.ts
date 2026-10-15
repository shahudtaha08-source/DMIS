import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// recharts' <ResponsiveContainer> measures via ResizeObserver + getBoundingClientRect and
// renders nothing until it sees a non-zero size — neither exists in jsdom, so both are polyfilled.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);
Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
  configurable: true,
  value: () => ({ width: 800, height: 400, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON() {} }),
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
