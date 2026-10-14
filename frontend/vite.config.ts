import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// vite.config.ts runs in Node; declare the one Node global used here.
declare const process: { env: Record<string, string | undefined> };

// In dev, /api is proxied to the FastAPI server (uvicorn on :8000 by default;
// set API_PROXY_TARGET to use another one, e.g. a second backend on :8001).
// On Vercel, vercel.json routes /api to the Python function instead.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000" },
  },
});
