import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ALLOWED_IMAGE_TYPES, CATEGORY_COLORS, MAX_IMAGE_BYTES, SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@shared/types";
import { createSessionToken, hashPassword, verifyPassword } from "./auth";
import * as db from "./db";
import { env } from "./env";
import { makeFileKey, storageDelete, storagePut } from "./storage";
import { protectedProcedure, publicProcedure, router } from "./trpc";

/** DB 오류는 내부 내용을 노출하지 않고 사용자 친화적인 메시지로 바꾼다. */
async function guard<T>(action: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    console.error(`[db] ${action} 실패`, err);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${action}에 실패했습니다. 잠시 후 다시 시도해 주세요.` });
  }
}

const notFound = (what: string) => new TRPCError({ code: "NOT_FOUND", message: `${what}을(를) 찾을 수 없습니다.` });
const id = z.number().int().positive();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "색상 형식이 올바르지 않습니다.");
const name = z.string().trim().min(1, "이름을 입력해 주세요.").max(60, "이름은 60자 이하로 입력해 주세요.");
const optionalTitle = z
  .string()
  .trim()
  .max(120, "제목은 120자 이하로 입력해 주세요.")
  .nullish()
  .transform((v) => (v ? v : null));
const content = z.string().trim().min(1, "본문을 입력해 주세요.").max(10000, "본문은 10,000자 이하로 입력해 주세요.");

async function requireCategory(userId: number, categoryId: number) {
  const cat = await db.getCategory(userId, categoryId);
  if (!cat) throw notFound("카테고리");
  return cat;
}

const authRouter = router({
  me: publicProcedure.query(({ ctx }) =>
    ctx.user ? { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email, role: ctx.user.role } : null,
  ),
  register: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, "이름을 입력해 주세요.").max(100),
        email: z.string().trim().toLowerCase().email("이메일 형식이 올바르지 않습니다."),
        password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(200),
      }),
    )
    .mutation(({ ctx, input }) =>
      guard("회원가입", async () => {
        if (await db.getUserByEmail(input.email)) {
          throw new TRPCError({ code: "CONFLICT", message: "이미 가입된 이메일입니다." });
        }
        const user = await db.createUser({ name: input.name, email: input.email, passwordHash: hashPassword(input.password) });
        // 첫 사용을 돕기 위해 기본 카테고리를 하나 만들어 준다.
        await db.createCategory(user.id, { name: "자주 쓰는 문장", color: CATEGORY_COLORS[0] });
        setSessionCookie(ctx.res, user.id);
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      }),
    ),
  login: publicProcedure
    .input(z.object({ email: z.string().trim().toLowerCase().email("이메일 형식이 올바르지 않습니다."), password: z.string().min(1, "비밀번호를 입력해 주세요.") }))
    .mutation(({ ctx, input }) =>
      guard("로그인", async () => {
        const user = await db.getUserByEmail(input.email);
        if (!user || !verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "이메일 또는 비밀번호가 올바르지 않습니다." });
        }
        setSessionCookie(ctx.res, user.id);
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      }),
    ),
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  }),
});

function setSessionCookie(res: import("express").Response, userId: number) {
  res.cookie(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: SESSION_MAX_AGE_SEC * 1000,
    path: "/",
  });
}

const categoriesRouter = router({
  list: protectedProcedure.query(({ ctx }) => guard("카테고리 불러오기", () => db.listCategories(ctx.user.id))),
  create: protectedProcedure
    .input(z.object({ name, color: color.default(CATEGORY_COLORS[0]) }))
    .mutation(({ ctx, input }) => guard("카테고리 저장", () => db.createCategory(ctx.user.id, input))),
  update: protectedProcedure
    .input(z.object({ id, name: name.optional(), color: color.optional() }))
    .mutation(({ ctx, input }) =>
      guard("카테고리 저장", async () => {
        const { id: categoryId, ...patch } = input;
        const updated = await db.updateCategory(ctx.user.id, categoryId, patch);
        if (!updated) throw notFound("카테고리");
        return updated;
      }),
    ),
  /** 삭제 전 확인창에 보여줄 포함 콘텐츠 개수. */
  contentCount: protectedProcedure
    .input(z.object({ id }))
    .query(({ ctx, input }) =>
      guard("카테고리 조회", async () => {
        await requireCategory(ctx.user.id, input.id);
        return db.countCategoryContent(ctx.user.id, input.id);
      }),
    ),
  /** 카테고리와 포함된 문장·이미지를 모두 삭제한다. */
  delete: protectedProcedure
    .input(z.object({ id }))
    .mutation(({ ctx, input }) =>
      guard("카테고리 삭제", async () => {
        const keys = await db.deleteCategory(ctx.user.id, input.id);
        if (!keys) throw notFound("카테고리");
        await Promise.all(keys.map(storageDelete));
        return { ok: true };
      }),
    ),
  reorder: protectedProcedure
    .input(z.object({ ids: z.array(id) }))
    .mutation(({ ctx, input }) =>
      guard("카테고리 순서 저장", async () => {
        if (!(await db.reorderCategories(ctx.user.id, input.ids))) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "카테고리 목록이 최신 상태가 아닙니다. 새로고침 후 다시 시도해 주세요." });
        }
        return { ok: true };
      }),
    ),
});

const snippetsRouter = router({
  listByCategory: protectedProcedure
    .input(z.object({ categoryId: id }))
    .query(({ ctx, input }) => guard("문장 불러오기", () => db.listSnippets(ctx.user.id, input.categoryId))),
  search: protectedProcedure
    .input(z.object({ query: z.string().trim().min(1).max(100) }))
    .query(({ ctx, input }) => guard("문장 검색", () => db.searchSnippets(ctx.user.id, input.query))),
  create: protectedProcedure
    .input(z.object({ categoryId: id, title: optionalTitle, content }))
    .mutation(({ ctx, input }) =>
      guard("문장 저장", async () => {
        await requireCategory(ctx.user.id, input.categoryId);
        return db.createSnippet(ctx.user.id, input);
      }),
    ),
  update: protectedProcedure
    .input(z.object({ id, title: optionalTitle.optional(), content: content.optional(), categoryId: id.optional() }))
    .mutation(({ ctx, input }) =>
      guard("문장 저장", async () => {
        const { id: snippetId, ...patch } = input;
        if (patch.categoryId) await requireCategory(ctx.user.id, patch.categoryId);
        // title 은 undefined(변경 없음)와 null(제목 삭제)을 구분해야 한다.
        const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
        const updated = await db.updateSnippet(ctx.user.id, snippetId, clean);
        if (!updated) throw notFound("문장");
        return updated;
      }),
    ),
  delete: protectedProcedure
    .input(z.object({ id }))
    .mutation(({ ctx, input }) =>
      guard("문장 삭제", async () => {
        if (!(await db.deleteSnippet(ctx.user.id, input.id))) throw notFound("문장");
        return { ok: true };
      }),
    ),
  togglePin: protectedProcedure
    .input(z.object({ id }))
    .mutation(({ ctx, input }) =>
      guard("핀 고정 변경", async () => {
        const updated = await db.toggleSnippetPin(ctx.user.id, input.id);
        if (!updated) throw notFound("문장");
        return updated;
      }),
    ),
  reorder: protectedProcedure
    .input(z.object({ categoryId: id, ids: z.array(id) }))
    .mutation(({ ctx, input }) =>
      guard("문장 순서 저장", async () => {
        await requireCategory(ctx.user.id, input.categoryId);
        const result = await db.reorderSnippets(ctx.user.id, input.categoryId, input.ids);
        if (result === "mismatch") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "문장 목록이 최신 상태가 아닙니다. 새로고침 후 다시 시도해 주세요." });
        }
        if (result === "pin-order") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "핀 고정된 문장은 항상 위쪽에 있어야 합니다." });
        }
        return { ok: true };
      }),
    ),
});

const imagesRouter = router({
  listByCategory: protectedProcedure
    .input(z.object({ categoryId: id }))
    .query(({ ctx, input }) => guard("이미지 불러오기", () => db.listImages(ctx.user.id, input.categoryId))),
  /** 이미지 바이트는 스토리지에 저장하고, DB에는 URL·파일 키 등 메타데이터만 기록한다. */
  create: protectedProcedure
    .input(
      z.object({
        categoryId: id,
        name: z.string().trim().max(120).nullish().transform((v) => (v ? v : null)),
        filename: z.string().trim().min(1).max(255),
        mimeType: z.string(),
        dataBase64: z.string().min(1),
      }),
    )
    .mutation(({ ctx, input }) =>
      guard("이미지 업로드", async () => {
        if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(input.mimeType)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "PNG, JPG, WEBP, GIF 이미지만 올릴 수 있습니다." });
        }
        const data = Buffer.from(input.dataBase64, "base64");
        if (data.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "빈 파일은 올릴 수 없습니다." });
        if (data.length > MAX_IMAGE_BYTES) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `이미지 용량은 ${MAX_IMAGE_BYTES / 1024 / 1024}MB 이하여야 합니다.` });
        }
        await requireCategory(ctx.user.id, input.categoryId);
        const fileKey = makeFileKey(ctx.user.id, input.mimeType);
        await storagePut(fileKey, data, input.mimeType);
        try {
          return await db.createImage(ctx.user.id, {
            categoryId: input.categoryId,
            name: input.name,
            url: `/files/${fileKey}`,
            fileKey,
            filename: input.filename,
            mimeType: input.mimeType,
          });
        } catch (err) {
          await storageDelete(fileKey);
          throw err;
        }
      }),
    ),
  delete: protectedProcedure
    .input(z.object({ id }))
    .mutation(({ ctx, input }) =>
      guard("이미지 삭제", async () => {
        const key = await db.deleteImage(ctx.user.id, input.id);
        if (!key) throw notFound("이미지");
        await storageDelete(key);
        return { ok: true };
      }),
    ),
});

export const appRouter = router({
  auth: authRouter,
  categories: categoriesRouter,
  snippets: snippetsRouter,
  images: imagesRouter,
});
export type AppRouter = typeof appRouter;
