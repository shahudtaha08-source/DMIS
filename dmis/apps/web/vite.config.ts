import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Copies the built index.html to dist/404.html.
 *
 * Static hosts with no server-side rewrite (Render static sites, GitHub Pages)
 * serve 404.html for an unmatched path; without this, refreshing a deep link
 * like /incidents/123 returned a bare "Not Found" page. Serving the SPA shell
 * instead lets React Router resolve the route client-side. This cannot affect
 * the API — that is a separate service on its own origin.
 */
function spa404Fallback() {
  return {
    name: "dmis-spa-404-fallback",
    closeBundle() {
      const dist = resolve(process.cwd(), "dist");
      const index = resolve(dist, "index.html");
      if (existsSync(index)) copyFileSync(index, resolve(dist, "404.html"));
    },
  };
}

export default defineConfig({
  plugins: [react(), spa404Fallback()],
  // One .env at the repo root (only VITE_-prefixed variables are exposed to the browser).
  envDir: "../../",
  server: {
    port: 5173,
    // In dev the browser calls same-origin /api and Vite forwards to the backend, so no CORS setup is needed locally.
    proxy: {
      "/api": { target: process.env.API_PROXY_TARGET ?? "http://localhost:4000", changeOrigin: true },
    },
  },
  build: {
    // Keep the entry chunk small: the heavy libs change far less often than app
    // code, so splitting them improves caching and silences the >500 kB warning.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) return "react-vendor";
          if (/[\\/]node_modules[\\/](recharts|d3-|victory-vendor|d3-)/.test(id)) return "charts";
          if (/[\\/]node_modules[\\/]leaflet[\\/]/.test(id)) return "leaflet";
          if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) return "icons";
          return undefined;
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
