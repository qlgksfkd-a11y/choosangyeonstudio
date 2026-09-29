import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { categories, images, snippets, users } from "../drizzle/schema";
import { env } from "./env";

function connect() {
  const p = mysql.createPool({ uri: env.databaseUrl, connectionLimit: 10 });
  return { pool: p, db: drizzle(p) };
}
let conn: ReturnType<typeof connect> | null = null;

export function getDb() {
  conn ??= connect();
  return conn.db;
}

export async function closeDb() {
  await conn?.pool.end();
  conn = null;
}

/** 목록의 ID 집합이 기존 ID 집합과 정확히 같은지 (중복·누락·타인 ID 없음) 검사한다. */
export function isSameIdSet(existing: number[], given: number[]): boolean {
  if (existing.length !== given.length) return false;
  const set = new Set(existing);
  if (new Set(given).size !== given.length) return false;
  return given.every((id) => set.has(id));
}

// ── users ────────────────────────────────────────────────
export async function getUserByEmail(email: string) {
  const [row] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  return row ?? null;
}

export async function getUserById(id: number) {
  const [row] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export async function createUser(input: { name: string; email: string; passwordHash: string }) {
  const [res] = await getDb()
    .insert(users)
    .values({ ...input, openId: `local:${input.email}` });
  return (await getUserById(res.insertId))!;
}

// ── categories ───────────────────────────────────────────
export async function listCategories(userId: number) {
  return getDb()
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.sortOrder), asc(categories.id));
}

export async function getCategory(userId: number, id: number) {
  const [row] = await getDb()
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function createCategory(userId: number, input: { name: string; color: string }) {
  const [{ max }] = await getDb()
    .select({ max: sql<number | null>`max(${categories.sortOrder})` })
    .from(categories)
    .where(eq(categories.userId, userId));
  const [res] = await getDb()
    .insert(categories)
    .values({ userId, ...input, sortOrder: (max ?? -1) + 1 });
  return (await getCategory(userId, res.insertId))!;
}

export async function updateCategory(userId: number, id: number, patch: { name?: string; color?: string }) {
  await getDb()
    .update(categories)
    .set(patch)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
  return getCategory(userId, id);
}

export async function countCategoryContent(userId: number, categoryId: number) {
  const db = getDb();
  const [s] = await db
    .select({ n: sql<number>`count(*)` })
    .from(snippets)
    .where(and(eq(snippets.userId, userId), eq(snippets.categoryId, categoryId)));
  const [i] = await db
    .select({ n: sql<number>`count(*)` })
    .from(images)
    .where(and(eq(images.userId, userId), eq(images.categoryId, categoryId)));
  return { snippets: Number(s.n), images: Number(i.n) };
}

/** 카테고리와 그 안의 문장·이미지 메타데이터를 함께 삭제하고, 스토리지에서 지울 fileKey 목록을 반환한다. */
export async function deleteCategory(userId: number, id: number): Promise<string[] | null> {
  return getDb().transaction(async (tx) => {
    const [cat] = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .limit(1);
    if (!cat) return null;
    const imgs = await tx
      .select({ fileKey: images.fileKey })
      .from(images)
      .where(and(eq(images.userId, userId), eq(images.categoryId, id)));
    await tx.delete(snippets).where(and(eq(snippets.userId, userId), eq(snippets.categoryId, id)));
    await tx.delete(images).where(and(eq(images.userId, userId), eq(images.categoryId, id)));
    await tx.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
    return imgs.map((r) => r.fileKey);
  });
}

export async function reorderCategories(userId: number, ids: number[]): Promise<boolean> {
  const existing = (await listCategories(userId)).map((c) => c.id);
  if (!isSameIdSet(existing, ids)) return false;
  await getDb().transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx
        .update(categories)
        .set({ sortOrder: index })
        .where(and(eq(categories.id, id), eq(categories.userId, userId)));
    }
  });
  return true;
}

// ── snippets ─────────────────────────────────────────────
/** 핀 고정 우선, 같은 그룹에서는 sortOrder 순. */
const snippetOrder = [desc(snippets.isPinned), asc(snippets.sortOrder), asc(snippets.id)] as const;

export async function listSnippets(userId: number, categoryId: number) {
  return getDb()
    .select()
    .from(snippets)
    .where(and(eq(snippets.userId, userId), eq(snippets.categoryId, categoryId)))
    .orderBy(...snippetOrder);
}

export async function searchSnippets(userId: number, query: string) {
  const escaped = query.replace(/[\\%_]/g, (c) => `\\${c}`);
  const pattern = `%${escaped}%`;
  return getDb()
    .select()
    .from(snippets)
    .where(and(eq(snippets.userId, userId), or(like(snippets.title, pattern), like(snippets.content, pattern))))
    .orderBy(...snippetOrder)
    .limit(200);
}

export async function getSnippet(userId: number, id: number) {
  const [row] = await getDb()
    .select()
    .from(snippets)
    .where(and(eq(snippets.id, id), eq(snippets.userId, userId)))
    .limit(1);
  return row ?? null;
}

async function nextSnippetOrder(userId: number, categoryId: number) {
  const [{ max }] = await getDb()
    .select({ max: sql<number | null>`max(${snippets.sortOrder})` })
    .from(snippets)
    .where(and(eq(snippets.userId, userId), eq(snippets.categoryId, categoryId)));
  return (max ?? -1) + 1;
}

export async function createSnippet(
  userId: number,
  input: { categoryId: number; title: string | null; content: string },
) {
  const sortOrder = await nextSnippetOrder(userId, input.categoryId);
  const [res] = await getDb()
    .insert(snippets)
    .values({ userId, ...input, sortOrder });
  return (await getSnippet(userId, res.insertId))!;
}

export async function updateSnippet(
  userId: number,
  id: number,
  patch: { title?: string | null; content?: string; categoryId?: number },
) {
  const current = await getSnippet(userId, id);
  if (!current) return null;
  const set: typeof patch & { sortOrder?: number } = { ...patch };
  if (patch.categoryId !== undefined && patch.categoryId !== current.categoryId) {
    set.sortOrder = await nextSnippetOrder(userId, patch.categoryId);
  }
  await getDb()
    .update(snippets)
    .set(set)
    .where(and(eq(snippets.id, id), eq(snippets.userId, userId)));
  return getSnippet(userId, id);
}

export async function deleteSnippet(userId: number, id: number): Promise<boolean> {
  const [res] = await getDb()
    .delete(snippets)
    .where(and(eq(snippets.id, id), eq(snippets.userId, userId)));
  return res.affectedRows > 0;
}

/** 핀 고정/해제. 이동한 그룹의 맨 끝에 놓는다. */
export async function toggleSnippetPin(userId: number, id: number) {
  const current = await getSnippet(userId, id);
  if (!current) return null;
  const sortOrder = await nextSnippetOrder(userId, current.categoryId);
  await getDb()
    .update(snippets)
    .set({ isPinned: !current.isPinned, sortOrder })
    .where(and(eq(snippets.id, id), eq(snippets.userId, userId)));
  return getSnippet(userId, id);
}

/**
 * 카테고리 안의 전체 문장 ID를 표시 순서대로 받아 저장한다.
 * 핀 고정 문장이 일반 문장보다 앞에 있어야 하며(정렬 규칙), 아니면 거부한다.
 */
export async function reorderSnippets(
  userId: number,
  categoryId: number,
  ids: number[],
): Promise<"ok" | "mismatch" | "pin-order"> {
  const existing = await listSnippets(userId, categoryId);
  if (!isSameIdSet(existing.map((s) => s.id), ids)) return "mismatch";
  const pinned = new Set(existing.filter((s) => s.isPinned).map((s) => s.id));
  const firstUnpinned = ids.findIndex((id) => !pinned.has(id));
  if (firstUnpinned !== -1 && ids.slice(firstUnpinned).some((id) => pinned.has(id))) return "pin-order";
  await getDb().transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx
        .update(snippets)
        .set({ sortOrder: index })
        .where(and(eq(snippets.id, id), eq(snippets.userId, userId)));
    }
  });
  return "ok";
}

// ── images ───────────────────────────────────────────────
export async function listImages(userId: number, categoryId: number) {
  return getDb()
    .select()
    .from(images)
    .where(and(eq(images.userId, userId), eq(images.categoryId, categoryId)))
    .orderBy(asc(images.sortOrder), asc(images.id));
}

export async function getImage(userId: number, id: number) {
  const [row] = await getDb()
    .select()
    .from(images)
    .where(and(eq(images.id, id), eq(images.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getImageByFileKey(userId: number, fileKey: string) {
  const [row] = await getDb()
    .select()
    .from(images)
    .where(and(eq(images.fileKey, fileKey), eq(images.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function createImage(
  userId: number,
  input: { categoryId: number; name: string | null; url: string; fileKey: string; filename: string; mimeType: string },
) {
  const [{ max }] = await getDb()
    .select({ max: sql<number | null>`max(${images.sortOrder})` })
    .from(images)
    .where(and(eq(images.userId, userId), eq(images.categoryId, input.categoryId)));
  const [res] = await getDb()
    .insert(images)
    .values({ userId, ...input, sortOrder: (max ?? -1) + 1 });
  return (await getImage(userId, res.insertId))!;
}

export async function deleteImage(userId: number, id: number): Promise<string | null> {
  const img = await getImage(userId, id);
  if (!img) return null;
  await getDb()
    .delete(images)
    .where(and(eq(images.id, id), eq(images.userId, userId)));
  return img.fileKey;
}

export async function deleteImagesByIds(userId: number, ids: number[]) {
  if (!ids.length) return;
  await getDb()
    .delete(images)
    .where(and(eq(images.userId, userId), inArray(images.id, ids)));
}
