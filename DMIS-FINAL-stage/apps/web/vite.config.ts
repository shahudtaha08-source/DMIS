import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // One .env at the repo root (only VITE_-prefixed variables are exposed to the browser).
  envDir: "../../",
  server: {
    port: 5173,
    // In dev the browser calls same-origin /api and Vite forwards to the backend, so no CORS setup is needed locally.
    proxy: {
      "/api": { target: process.env.API_PROXY_TARGET ?? "http://localhost:4000", changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
