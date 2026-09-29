import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cookieParser from "cookie-parser";
import express from "express";
import { SESSION_COOKIE } from "@shared/types";
import { readSessionToken } from "./auth";
import { getImageByFileKey } from "./db";
import { env } from "./env";
import { runMigrations } from "./migrate";
import { appRouter } from "./routers";
import { storageGet } from "./storage";
import { createContext } from "./trpc";

export async function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(cookieParser());
  // 이미지는 base64 로 tRPC 를 통해 올리므로 5MB 파일(약 6.7MB)을 넘는 본문을 허용한다.
  app.use("/api/trpc", express.json({ limit: "10mb" }));
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  // 이미지 파일 전달: 소유자만 볼 수 있고, 같은 출처라 복사·다운로드에 CORS 설정이 필요 없다.
  app.get("/files/*fileKey", async (req, res) => {
    const parts = (req.params as unknown as { fileKey: string[] }).fileKey;
    const fileKey = parts.join("/");
    const userId = readSessionToken(req.cookies?.[SESSION_COOKIE]);
    if (!userId) return void res.status(401).end();
    const image = await getImageByFileKey(userId, fileKey);
    const data = image && (await storageGet(fileKey));
    if (!image || !data) return void res.status(404).end();
    res.setHeader("Content-Type", image.mimeType);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(data);
  });

  return app;
}

async function main() {
  await runMigrations();
  const app = await createApp();
  const server = http.createServer(app);

  if (!env.isProduction) {
    const { createServer } = await import("vite");
    const vite = await createServer({ server: { middlewareMode: true, hmr: { server } }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const dist = path.resolve(import.meta.dirname, "public");
    app.use(express.static(dist, { index: false, maxAge: "1h" }));
    app.get("*splat", (_req, res) => {
      const html = path.join(dist, "index.html");
      fs.existsSync(html) ? res.sendFile(html) : res.status(404).end();
    });
  }

  server.listen(env.port, () => console.log(`상담 빠른복사: http://localhost:${env.port}`));
}

if (process.env.VITEST === undefined) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
