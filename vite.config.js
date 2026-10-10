import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { syncDevPlugin } from "./server/vite-sync-plugin.mjs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), syncDevPlugin()],
});
