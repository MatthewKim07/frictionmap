import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Expose NEXT_PUBLIC_* alongside VITE_* so Supabase env matches common naming.
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // Avoid clashing with another dev app / service worker that may have claimed 5173.
  server: {
    port: 5174,
    strictPort: false,
  },
});
