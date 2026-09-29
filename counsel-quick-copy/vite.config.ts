import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client/public"),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client/src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // manifest.json은 client/public 에 직접 작성해 둔다.
      manifest: false,
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        // 앱 셸만 캐시한다. 서버 데이터(tRPC)와 이미지 파일은 캐시하지 않는다.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/files\//],
      },
    }),
  ],
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});
