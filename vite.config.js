import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ["**/*.glb"],
  // @excalidraw/excalidraw reads process.env at runtime; Vite must inline it
  define: {
    "process.env.IS_PREACT": JSON.stringify("false"),
  },
  server: {
    port: 5173,
    strictPort: true,
    // one origin: the frontend talks to /api/*, Vite forwards to the AI proxy
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
