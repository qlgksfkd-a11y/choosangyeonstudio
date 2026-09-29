import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const pub = path.resolve(import.meta.dirname, "../public");

describe("PWA", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(pub, "manifest.json"), "utf8"));

  it("manifest 에 설치에 필요한 항목이 있다", () => {
    expect(manifest.name).toBe("상담 빠른복사");
    expect(manifest.short_name).toBe("빠른복사");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.theme_color).toMatch(/^#/);
    expect(manifest.background_color).toMatch(/^#/);
  });

  it("아이콘(any + maskable)과 apple-touch-icon 파일이 존재한다", () => {
    const purposes = manifest.icons.map((i: { purpose: string }) => i.purpose);
    expect(purposes).toContain("any");
    expect(purposes).toContain("maskable");
    for (const icon of manifest.icons) expect(fs.existsSync(path.join(pub, icon.src))).toBe(true);
    expect(fs.existsSync(path.join(pub, "icons/apple-touch-icon.png"))).toBe(true);
  });

  it("index.html 이 manifest 와 iOS 메타 태그를 연결한다", () => {
    const html = fs.readFileSync(path.resolve(import.meta.dirname, "../index.html"), "utf8");
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain("apple-mobile-web-app-capable");
  });
});
