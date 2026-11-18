import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiTarget = `http://127.0.0.1:${process.env.TRIALMATCH_E2E_API_PORT ?? "3000"}`;

export default defineConfig({
  plugins: [react({})],
  root: "apps/web",
  server: {
    host: "127.0.0.1",
    port: Number(process.env.WEB_PORT ?? 5173),
    proxy: {
      "/api": apiTarget,
    },
  },
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    proxy: {
      "/api": apiTarget,
    },
  },
});
