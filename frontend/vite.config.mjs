import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  optimizeDeps: { include: ["react", "react-dom/client", "@heroicons/react/24/outline"] },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: { clientFiles: ["./src/main.jsx"] },
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/static": { target: process.env.VITE_API_PROXY_TARGET || "http://localhost:8000", changeOrigin: true },
    },
  },
  plugins: [react(), tailwindcss()],
});
