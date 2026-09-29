// 실제 브라우저(Chromium)로 핵심 흐름을 확인하는 스모크 테스트.
// 사용법: 서버를 띄운 뒤  BASE_URL=http://localhost:3100 node scripts/e2e-smoke.mjs
import fs from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR ?? "/tmp/claude-0/shots";
fs.mkdirSync(SHOTS, { recursive: true });
const exe = process.env.CHROMIUM ?? fs.readdirSync("/opt/pw-browsers").filter((d) => d.startsWith("chromium-")).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`)[0];

let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!ok) failures++;
};

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
fs.writeFileSync(`${SHOTS}/tiny.png`, png);

const browser = await chromium.launch({ executablePath: exe });

async function session(viewport, mobile) {
  const ctx = await browser.newContext({
    viewport,
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: 2,
    permissions: ["clipboard-read", "clipboard-write"],
    baseURL: BASE,
    serviceWorkers: "block",
  });
  return { ctx, page: await ctx.newPage() };
}

const email = `e2e${Date.now()}@example.com`;
const { ctx, page } = await session({ width: 390, height: 844 }, true);
page.on("pageerror", (e) => check("페이지 JS 오류 없음", false, e.message));

// 1) 가입 → 기본 카테고리
await page.goto("/");
await page.getByRole("button", { name: "계정이 없으신가요? 회원가입" }).click();
await page.getByLabel("이름").fill("테스터");
await page.getByLabel("이메일").fill(email);
await page.getByLabel("비밀번호").fill("password123");
await page.getByRole("button", { name: "가입하고 시작하기" }).click();
await page.getByText("아직 저장한 문장이 없습니다").waitFor();
check("가입 후 빈 상태 안내 표시", true);
await page.screenshot({ path: `${SHOTS}/1-empty-mobile.png` });

// 2) 문장 추가: 제목 없음 / 있음
async function addSnippet(title, content) {
  await page.getByRole("button", { name: "새 문장 추가" }).click();
  if (title) await page.getByLabel(/제목/).fill(title);
  await page.getByLabel(/본문/).fill(content);
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByText("문장을 저장했습니다.").last().waitFor();
}
await page.getByRole("button", { name: "새 문장 추가" }).click();
await page.getByRole("button", { name: "저장", exact: true }).click();
check("본문 없이 저장하면 오류 표시", await page.getByText("본문을 입력해 주세요.").first().isVisible());
await page.keyboard.press("Escape");
await addSnippet("", "안녕하세요, 상담사 홍길동입니다.\n무엇을 도와드릴까요?");
await addSnippet("환불 안내", "환불은 영업일 기준 3일 이내에 처리됩니다.");
await addSnippet("", "감사합니다. 좋은 하루 보내세요!");
const cards = page.getByTestId("snippet-card");
await page.waitForFunction(() => document.querySelectorAll('[data-testid="snippet-card"]').length === 3);
check("카드 3개 표시", (await cards.count()) === 3);
const first = cards.filter({ hasText: "안녕하세요" });
check("제목 없는 카드에는 제목 영역이 없다", (await first.locator(".display").count()) === 0 && !(await first.innerText()).includes("제목 없음"));
check("제목 있는 카드에는 제목이 있다", (await cards.filter({ hasText: "환불 안내" }).locator(".display").count()) === 1);

// 3) 탭 → 즉시 복사 + 토스트
await first.getByRole("button", { name: /복사/ }).first().click();
await page.getByText("문장이 복사되었습니다.").last().waitFor();
const clip = await page.evaluate(() => navigator.clipboard.readText());
check("탭하면 클립보드에 본문이 복사된다", clip === "안녕하세요, 상담사 홍길동입니다.\n무엇을 도와드릴까요?", JSON.stringify(clip));
await page.screenshot({ path: `${SHOTS}/2-list-mobile.png` });

// 4) 핀 고정 → 맨 위
await cards.filter({ hasText: "감사합니다" }).getByRole("button", { name: /핀 고정/ }).click();
await page.getByText("핀 고정했습니다.").last().waitFor();
await page.waitForFunction(() => document.querySelector('[data-testid="snippet-card"]')?.textContent?.includes("감사합니다"));
check("핀 고정한 문장이 맨 위로 올라간다", (await cards.first().getAttribute("data-pinned")) === "true");

// 5) 순서 변경 모드: 탭해도 복사되지 않음 + 핸들 드래그
await page.evaluate(() => navigator.clipboard.writeText("SENTINEL"));
await page.getByRole("button", { name: "순서 변경", exact: true }).click();
check("순서 변경 모드에서 핸들이 나타난다", (await page.getByRole("button", { name: /순서 이동/ }).count()) === 3);
await cards.filter({ hasText: "환불은" }).getByText("환불은").click({ force: true });
check("순서 변경 모드에서는 카드를 탭해도 복사되지 않는다", (await page.evaluate(() => navigator.clipboard.readText())) === "SENTINEL");

const order = async () => (await cards.allInnerTexts()).map((t) => (t.includes("안녕하세요") ? "A" : t.includes("환불") ? "B" : "C"));
check("초기 순서 C(핀) A B", (await order()).join("") === "CAB", (await order()).join(""));
// 아래 버튼(키보드/보조 수단)로 이동
await cards.filter({ hasText: "안녕하세요" }).getByRole("button", { name: /아래로 이동/ }).click();
await page.waitForFunction(() => document.querySelectorAll('[data-testid="snippet-card"]')[2]?.textContent?.includes("안녕하세요"));
check("아래로 이동 버튼으로 순서가 바뀐다", (await order()).join("") === "CBA", (await order()).join(""));

// 실제 마우스 드래그 (PC 뷰포트에서 검증)
await page.getByRole("button", { name: "순서 변경 완료" }).click();
await page.reload();
await page.getByTestId("snippet-card").first().waitFor();
check("새로고침 후에도 순서가 유지된다", (await order()).join("") === "CBA", (await order()).join(""));

// 6) 이미지 업로드/복사/다운로드
await page.getByRole("tab", { name: "이미지" }).click();
await page.getByText("아직 저장한 이미지가 없습니다").waitFor();
await page.getByRole("button", { name: "이미지 추가" }).first().click();
await page.locator('input[type="file"]').setInputFiles(`${SHOTS}/tiny.png`);
await page.getByLabel(/이름 또는 설명/).fill("테스트 이미지");
await page.getByRole("button", { name: "업로드", exact: true }).click();
await page.getByText("이미지를 올렸습니다.").last().waitFor();
const img = page.getByTestId("image-card").locator("img");
await img.waitFor();
check("이미지 미리보기가 로드된다", await img.evaluate((el) => el.complete && el.naturalWidth > 0));
await page.getByRole("button", { name: "복사", exact: true }).click();
await page.getByText("이미지가 복사되었습니다.").last().waitFor();
const types = await page.evaluate(async () => (await navigator.clipboard.read())[0].types);
check("이미지가 클립보드에 복사된다", types.includes("image/png"), types.join(","));
const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "다운로드" }).click()]);
check("이미지를 다운로드할 수 있다", dl.suggestedFilename() === "tiny.png", dl.suggestedFilename());
// 지원하지 않는 형식
fs.writeFileSync(`${SHOTS}/bad.txt`, "hello");
await page.getByRole("button", { name: "이미지 추가" }).first().click();
await page.locator('input[type="file"]').setInputFiles(`${SHOTS}/bad.txt`).catch(() => {});
await page.screenshot({ path: `${SHOTS}/3-images-mobile.png` });
await page.keyboard.press("Escape");

// 이미지 삭제 (확인 필요)
await page.getByRole("button", { name: /삭제$/ }).first().click();
await page.getByRole("button", { name: "삭제", exact: true }).click();
await page.getByText("이미지를 삭제했습니다.").last().waitFor();
check("이미지 삭제(확인 후)", true);

// 7) 카테고리 추가/편집/순서
await page.getByRole("button", { name: "카테고리 추가" }).click();
await page.getByLabel(/이름/).fill("환불·교환");
await page.getByRole("button", { name: /색상 #8a3b2f/ }).click();
await page.getByRole("button", { name: "저장", exact: true }).click();
await page.getByText("카테고리를 만들었습니다.").last().waitFor();
await page.getByRole("button", { name: "환불·교환 카테고리 편집" }).click();
await page.getByRole("button", { name: /앞으로/ }).click();
await page.waitForTimeout(500);
await page.getByRole("button", { name: "닫기" }).click();
await page.reload();
await page.locator('[aria-roledescription="정렬 가능한 카테고리"]:visible').first().waitFor();
const names = await page.locator('[aria-roledescription="정렬 가능한 카테고리"]:visible').allInnerTexts();
check("카테고리 순서 변경이 새로고침 후에도 유지", names[0]?.includes("환불·교환"), names.join("|"));
await page.screenshot({ path: `${SHOTS}/4-categories-mobile.png` });

// 8) 검색
await page.getByLabel("검색", { exact: true }).fill("환불은");
await page.getByText("“환불은”").first().waitFor();
check("전체 카테고리 검색", (await page.getByTestId("snippet-card").count()) === 1);
await page.getByLabel("검색", { exact: true }).fill("없는말없는말");
await page.getByText("검색 결과가 없습니다").waitFor();
check("검색 결과 없음 상태", true);
await ctx.close();

// 9) PC: 사이드바 + 마우스 드래그 앤 드롭
const pc = await session({ width: 1280, height: 800 }, false);
const p = pc.page;
await p.goto("/");
await p.getByLabel("이메일").fill(email);
await p.getByLabel("비밀번호").fill("password123");
await p.getByRole("button", { name: "로그인", exact: true }).click();
await p.getByRole("button", { name: /^기본|자주 쓰는 문장/ }).first().click();
await p.getByTestId("snippet-card").first().waitFor();
check("PC 사이드바 표시", await p.locator("aside").getByRole("heading", { name: "카테고리" }).isVisible());
await p.getByRole("button", { name: "순서 변경", exact: true }).click();
const pcCards = p.getByTestId("snippet-card");
const pcOrder = async () => (await pcCards.allInnerTexts()).map((t) => (t.includes("안녕하세요") ? "A" : t.includes("환불") ? "B" : "C"));
const before = (await pcOrder()).join("");
const handles = p.getByRole("button", { name: /순서 이동/ });
// C(핀)는 그대로, 일반 그룹의 두 번째(A)를 첫 번째(B) 위치로 드래그
const src = await handles.nth(2).boundingBox();
const dst = await handles.nth(1).boundingBox();
await p.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
await p.mouse.down();
await p.mouse.move(src.x + 5, src.y - 20, { steps: 5 });
await p.mouse.move(dst.x + dst.width / 2, dst.y + 2, { steps: 15 });
await p.mouse.up();
await p.waitForTimeout(800);
const after = (await pcOrder()).join("");
check("PC 마우스 드래그로 순서가 바뀐다", before !== after && after[0] === "C", `${before} → ${after}`);
await p.reload();
await p.getByTestId("snippet-card").first().waitFor();
check("드래그 결과가 새로고침 후에도 유지", (await pcOrder()).join("") === after, (await pcOrder()).join(""));
await p.screenshot({ path: `${SHOTS}/5-desktop.png` });
await pc.ctx.close();

await browser.close();
console.log(failures ? `\n${failures}개 실패` : "\n모두 통과");
process.exit(failures ? 1 : 0);
