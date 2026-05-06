import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/m-w-04_weather-buster/",
  plugins: [react()],
  build: {
    // Split out the heaviest dependencies so the Home-only first paint can
    // skip parsing them, and so they can be cached across deploys when only
    // app code changes.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/")) return "three";
          if (id.includes("node_modules/three-stdlib/")) return "three";
          if (id.includes("node_modules/@react-three/")) return "r3f";
          if (id.includes("node_modules/react-dom/") || id.includes("node_modules/react/")) return "react";
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
