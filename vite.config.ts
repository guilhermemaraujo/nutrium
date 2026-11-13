import { fileURLToPath } from "node:url";
import ruby from "vite-plugin-ruby";
import { defineConfig } from "vitest/config";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [ruby(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./app/frontend/src", import.meta.url)),
    },
  },
  server: {
    allowedHosts: ["vite"],
    watch: { usePolling: true, interval: 250 },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
