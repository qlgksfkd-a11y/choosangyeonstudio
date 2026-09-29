import fs from "node:fs";
import path from "node:path";
import { TRPCError } from "@trpc/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken } from "./auth";
import { closeDb, getUserByEmail } from "./db";
import { appRouter } from "./routers";
import type { Context } from "./trpc";

const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function fakeRes() {
  return { cookie() {}, clearCookie() {} } as unknown as Context["res"];
}

async function callerFor(email: string) {
  const anon = appRouter.createCaller({ req: {} as Context["req"], res: fakeRes(), user: null });
  const reg = await anon.auth.register({ name: email.split("@")[0], email, password: "password123" });
  const user = (await getUserByEmail(email))!;
  expect(user.id).toBe(reg.id);
  return appRouter.createCaller({ req: {} as Context["req"], res: fakeRes(), user });
}

const anon = () => appRouter.createCaller({ req: {} as Context["req"], res: fakeRes(), user: null });
const rejects = (p: Promise<unknown>, code: TRPCError["code"]) =>
  expect(p).rejects.toMatchObject({ code });

let alice: Awaited<ReturnType<typeof callerFor>>;
let bob: Awaited<ReturnType<typeof callerFor>>;

beforeAll(async () => {
  alice = await callerFor("alice@example.com");
  bob = await callerFor("bob@example.com");
});
afterAll(async () => {
  await closeDb();
  fs.rmSync(path.resolve(process.env.UPLOAD_DIR!), { recursive: true, force: true });
});

describe("인증", () => {
  it("로그인하지 않으면 보호된 API를 쓸 수 없다", async () => {
    await rejects(anon().categories.list(), "UNAUTHORIZED");
    await rejects(anon().snippets.search({ query: "a" }), "UNAUTHORIZED");
  });

  it("잘못된 비밀번호와 중복 가입을 거부한다", async () => {
    await rejects(anon().auth.login({ email: "alice@example.com", password: "wrong-password" }), "UNAUTHORIZED");
    await rejects(anon().auth.register({ name: "x", email: "alice@example.com", password: "password123" }), "CONFLICT");
    expect((await anon().auth.login({ email: "alice@example.com", password: "password123" })).email).toBe("alice@example.com");
  });

  it("세션 토큰은 변조·만료되면 무효다", () => {
    const token = createSessionToken(7);
    expect(readSessionToken(token)).toBe(7);
    expect(readSessionToken(token.replace(/^7/, "8"))).toBeNull();
    expect(readSessionToken(token, Date.now() + 1000 * 60 * 60 * 24 * 365)).toBeNull();
    expect(readSessionToken(undefined)).toBeNull();
  });

  it("가입하면 기본 카테고리가 생긴다", async () => {
    expect((await alice.categories.list()).length).toBeGreaterThanOrEqual(1);
  });
});

describe("카테고리", () => {
  it("생성·수정·삭제와 색상 지정", async () => {
    const c = await alice.categories.create({ name: "환불", color: "#8a3b2f" });
    expect(c.color).toBe("#8a3b2f");
    const u = await alice.categories.update({ id: c.id, name: "환불 안내", color: "#3f6b52" });
    expect(u).toMatchObject({ name: "환불 안내", color: "#3f6b52" });
    await alice.categories.delete({ id: c.id });
    expect((await alice.categories.list()).find((x) => x.id === c.id)).toBeUndefined();
    await rejects(alice.categories.delete({ id: c.id }), "NOT_FOUND");
  });

  it("이름은 필수이고 색상 형식을 검증한다", async () => {
    await expect(alice.categories.create({ name: "  ", color: "#000000" })).rejects.toThrow();
    await expect(alice.categories.create({ name: "a", color: "red" })).rejects.toThrow();
  });

  it("순서 변경이 저장되고 목록에 반영된다", async () => {
    const a = await alice.categories.create({ name: "A", color: "#222222" });
    const b = await alice.categories.create({ name: "B", color: "#222222" });
    const before = (await alice.categories.list()).map((c) => c.id);
    const after = [...before].reverse();
    await alice.categories.reorder({ ids: after });
    expect((await alice.categories.list()).map((c) => c.id)).toEqual(after);
    expect(after).toContain(a.id);
    expect(after).toContain(b.id);
  });

  it("누락되거나 다른 사용자의 ID가 섞인 순서 변경은 거부한다", async () => {
    const mine = (await alice.categories.list()).map((c) => c.id);
    const bobCat = (await bob.categories.list())[0];
    await rejects(alice.categories.reorder({ ids: mine.slice(1) }), "BAD_REQUEST");
    await rejects(alice.categories.reorder({ ids: [...mine.slice(1), bobCat.id] }), "BAD_REQUEST");
    await rejects(alice.categories.reorder({ ids: [mine[0], mine[0], ...mine.slice(2)] }), "BAD_REQUEST");
  });

  it("삭제 시 포함된 문장·이미지도 함께 삭제되고 개수를 미리 알 수 있다", async () => {
    const c = await alice.categories.create({ name: "임시", color: "#222222" });
    await alice.snippets.create({ categoryId: c.id, content: "안녕하세요" });
    await alice.images.create({ categoryId: c.id, filename: "a.png", mimeType: "image/png", dataBase64: PNG_1PX });
    expect(await alice.categories.contentCount({ id: c.id })).toEqual({ snippets: 1, images: 1 });
    await alice.categories.delete({ id: c.id });
    expect(await alice.snippets.listByCategory({ categoryId: c.id })).toEqual([]);
    expect(await alice.images.listByCategory({ categoryId: c.id })).toEqual([]);
  });
});

describe("문장", () => {
  let cat: number;
  beforeAll(async () => {
    cat = (await alice.categories.create({ name: "문장 테스트", color: "#222222" })).id;
  });

  it("제목 없이 저장할 수 있고 제목은 null 이 된다", async () => {
    const s = await alice.snippets.create({ categoryId: cat, content: "본문만 있는 문장" });
    expect(s.title).toBeNull();
    const blank = await alice.snippets.create({ categoryId: cat, title: "   ", content: "공백 제목" });
    expect(blank.title).toBeNull();
    const titled = await alice.snippets.create({ categoryId: cat, title: "인사", content: "제목 있는 문장" });
    expect(titled.title).toBe("인사");
  });

  it("본문은 필수다", async () => {
    await expect(alice.snippets.create({ categoryId: cat, title: "제목만", content: "" })).rejects.toThrow(/본문/);
    await expect(alice.snippets.create({ categoryId: cat, content: "   " })).rejects.toThrow(/본문/);
  });

  it("수정 시 제목을 지우거나 그대로 둘 수 있다", async () => {
    const s = await alice.snippets.create({ categoryId: cat, title: "지울 제목", content: "내용" });
    expect((await alice.snippets.update({ id: s.id, content: "새 내용" })).title).toBe("지울 제목");
    expect((await alice.snippets.update({ id: s.id, title: "" })).title).toBeNull();
  });

  it("핀 고정한 문장은 항상 위에 정렬되고 해제하면 내려간다", async () => {
    const c = (await alice.categories.create({ name: "핀", color: "#222222" })).id;
    const a = await alice.snippets.create({ categoryId: c, content: "a" });
    const b = await alice.snippets.create({ categoryId: c, content: "b" });
    const d = await alice.snippets.create({ categoryId: c, content: "d" });
    expect((await alice.snippets.togglePin({ id: d.id })).isPinned).toBe(true);
    expect((await alice.snippets.listByCategory({ categoryId: c })).map((s) => s.id)).toEqual([d.id, a.id, b.id]);
    expect((await alice.snippets.togglePin({ id: d.id })).isPinned).toBe(false);
    expect((await alice.snippets.listByCategory({ categoryId: c })).map((s) => s.id)).toEqual([a.id, b.id, d.id]);
  });

  it("순서 변경이 저장되어 다시 조회해도 유지된다 (핀 규칙 포함)", async () => {
    const c = (await alice.categories.create({ name: "순서", color: "#222222" })).id;
    const [a, b, d, e] = await Promise.all(
      ["a", "b", "d", "e"].map(async (content, i) => {
        await new Promise((r) => setTimeout(r, i * 5));
        return alice.snippets.create({ categoryId: c, content });
      }),
    );
    await alice.snippets.togglePin({ id: e.id });
    const current = (await alice.snippets.listByCategory({ categoryId: c })).map((s) => s.id);
    expect(current[0]).toBe(e.id);
    const next = [e.id, d.id, b.id, a.id];
    await alice.snippets.reorder({ categoryId: c, ids: next });
    expect((await alice.snippets.listByCategory({ categoryId: c })).map((s) => s.id)).toEqual(next);
    // 핀 고정 문장이 일반 문장 뒤로 가는 순서는 거부한다
    await rejects(alice.snippets.reorder({ categoryId: c, ids: [d.id, e.id, b.id, a.id] }), "BAD_REQUEST");
    // 누락된 ID
    await rejects(alice.snippets.reorder({ categoryId: c, ids: [e.id, d.id] }), "BAD_REQUEST");
    expect((await alice.snippets.listByCategory({ categoryId: c })).map((s) => s.id)).toEqual(next);
  });

  it("제목과 본문에서 검색하고, 검색어의 % 와 _ 는 문자로 취급한다", async () => {
    const c = (await alice.categories.create({ name: "검색", color: "#222222" })).id;
    await alice.snippets.create({ categoryId: c, title: "환불 안내", content: "영업일 3일 내 처리됩니다" });
    await alice.snippets.create({ categoryId: c, content: "할인율 50% 적용" });
    expect((await alice.snippets.search({ query: "환불" })).length).toBe(1);
    expect((await alice.snippets.search({ query: "영업일" })).length).toBe(1);
    expect((await alice.snippets.search({ query: "50%" })).length).toBe(1);
    expect((await alice.snippets.search({ query: "%" })).length).toBe(1);
    expect(await alice.snippets.search({ query: "존재하지않는검색어" })).toEqual([]);
  });
});

describe("이미지", () => {
  let cat: number;
  beforeAll(async () => {
    cat = (await alice.categories.create({ name: "이미지", color: "#222222" })).id;
  });

  it("메타데이터만 DB에 저장하고 바이트는 스토리지에 둔다", async () => {
    const img = await alice.images.create({
      categoryId: cat,
      name: "약도",
      filename: "map.png",
      mimeType: "image/png",
      dataBase64: PNG_1PX,
    });
    expect(img).toMatchObject({ name: "약도", filename: "map.png", mimeType: "image/png" });
    expect(img.url).toBe(`/files/${img.fileKey}`);
    expect(Object.keys(img)).not.toContain("data");
    const stored = fs.readFileSync(path.resolve(process.env.UPLOAD_DIR!, img.fileKey));
    expect(stored.equals(Buffer.from(PNG_1PX, "base64"))).toBe(true);
    expect((await alice.images.listByCategory({ categoryId: cat })).map((i) => i.id)).toContain(img.id);
  });

  it("삭제하면 메타데이터와 파일이 모두 사라진다", async () => {
    const img = await alice.images.create({ categoryId: cat, filename: "x.png", mimeType: "image/png", dataBase64: PNG_1PX });
    const file = path.resolve(process.env.UPLOAD_DIR!, img.fileKey);
    expect(fs.existsSync(file)).toBe(true);
    await alice.images.delete({ id: img.id });
    expect(fs.existsSync(file)).toBe(false);
    await rejects(alice.images.delete({ id: img.id }), "NOT_FOUND");
  });

  it("지원하지 않는 형식과 용량 초과를 거부한다", async () => {
    await expect(
      alice.images.create({ categoryId: cat, filename: "a.svg", mimeType: "image/svg+xml", dataBase64: PNG_1PX }),
    ).rejects.toThrow(/PNG, JPG, WEBP, GIF/);
    const big = Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64");
    await expect(
      alice.images.create({ categoryId: cat, filename: "big.png", mimeType: "image/png", dataBase64: big }),
    ).rejects.toThrow(/5MB/);
  });
});

describe("사용자별 데이터 분리", () => {
  it("다른 사용자의 카테고리·문장·이미지에 접근하거나 수정·삭제할 수 없다", async () => {
    const cat = (await alice.categories.create({ name: "비공개", color: "#222222" })).id;
    const snip = await alice.snippets.create({ categoryId: cat, content: "비밀 문장" });
    const img = await alice.images.create({ categoryId: cat, filename: "p.png", mimeType: "image/png", dataBase64: PNG_1PX });

    expect((await bob.categories.list()).map((c) => c.id)).not.toContain(cat);
    expect(await bob.snippets.listByCategory({ categoryId: cat })).toEqual([]);
    expect(await bob.images.listByCategory({ categoryId: cat })).toEqual([]);
    expect(await bob.snippets.search({ query: "비밀" })).toEqual([]);

    await rejects(bob.categories.update({ id: cat, name: "해킹" }), "NOT_FOUND");
    await rejects(bob.categories.delete({ id: cat }), "NOT_FOUND");
    await rejects(bob.snippets.update({ id: snip.id, content: "해킹" }), "NOT_FOUND");
    await rejects(bob.snippets.togglePin({ id: snip.id }), "NOT_FOUND");
    await rejects(bob.snippets.delete({ id: snip.id }), "NOT_FOUND");
    await rejects(bob.images.delete({ id: img.id }), "NOT_FOUND");
    await rejects(bob.snippets.create({ categoryId: cat, content: "침입" }), "NOT_FOUND");
    await rejects(bob.images.create({ categoryId: cat, filename: "p.png", mimeType: "image/png", dataBase64: PNG_1PX }), "NOT_FOUND");
    await rejects(bob.snippets.reorder({ categoryId: cat, ids: [snip.id] }), "NOT_FOUND");

    // 다른 사용자의 카테고리로 문장을 옮기는 것도 불가
    const bobCat = (await bob.categories.list())[0];
    const bobSnip = await bob.snippets.create({ categoryId: bobCat.id, content: "밥의 문장" });
    await rejects(bob.snippets.update({ id: bobSnip.id, categoryId: cat }), "NOT_FOUND");

    expect((await alice.snippets.listByCategory({ categoryId: cat }))[0].content).toBe("비밀 문장");
  });
});
