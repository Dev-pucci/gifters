import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// /api is served by the Node store server (server/index.mjs) on port 8787.
const api = { "/api": { target: "http://localhost:8787", changeOrigin: false } };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: api },
  preview: { proxy: api },
});
