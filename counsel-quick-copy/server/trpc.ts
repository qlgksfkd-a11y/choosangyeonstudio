import { initTRPC, TRPCError } from "@trpc/server";
import type { Request, Response } from "express";
import superjson from "superjson";
import { SESSION_COOKIE } from "@shared/types";
import { readSessionToken } from "./auth";
import { getUserById } from "./db";

export async function createContext({ req, res }: { req: Request; res: Response }) {
  const userId = readSessionToken(req.cookies?.[SESSION_COOKIE]);
  const user = userId ? await getUserById(userId) : null;
  return { req, res, user };
}
export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

/** 로그인한 사용자만 접근. ctx.user 가 항상 존재한다. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
