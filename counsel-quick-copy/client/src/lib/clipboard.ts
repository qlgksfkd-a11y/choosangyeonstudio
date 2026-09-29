export type CopyResult = { ok: true } | { ok: false; reason: "denied" | "unsupported" | "failed" };

/** 본문을 클립보드에 복사한다. HTTPS(또는 localhost)에서는 Clipboard API, 그 외에는 execCommand 로 시도한다. */
export async function copyText(text: string): Promise<CopyResult> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        return legacyCopy(text) ? { ok: true } : { ok: false, reason: "denied" };
      }
      return legacyCopy(text) ? { ok: true } : { ok: false, reason: "failed" };
    }
  }
  return legacyCopy(text) ? { ok: true } : { ok: false, reason: "unsupported" };
}

function legacyCopy(text: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand?.("copy") ?? false;
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function copyErrorMessage(reason: "denied" | "unsupported" | "failed"): string {
  if (reason === "denied") return "복사 권한이 거부되었습니다. 브라우저 설정에서 클립보드 접근을 허용해 주세요.";
  if (reason === "unsupported") return "이 브라우저는 자동 복사를 지원하지 않습니다. HTTPS 주소로 접속했는지 확인해 주세요.";
  return "복사하지 못했습니다. 다시 시도해 주세요.";
}

async function toPngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === "image/png") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("변환 실패"))), "image/png"),
  );
}

export function canCopyImage(): boolean {
  return typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;
}

/** 이미지를 클립보드에 복사한다(대부분의 브라우저가 PNG 만 허용하므로 변환). 지원하지 않으면 unsupported. */
export async function copyImage(url: string): Promise<CopyResult> {
  if (!canCopyImage()) return { ok: false, reason: "unsupported" };
  try {
    // Safari 는 사용자 제스처 안에서 write 를 시작해야 하므로 Blob 을 Promise 로 넘긴다.
    const blob = fetch(url, { credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.blob();
      })
      .then(toPngBlob);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return { ok: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") return { ok: false, reason: "denied" };
    return { ok: false, reason: "failed" };
  }
}

export async function downloadImage(url: string, filename: string): Promise<boolean> {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return false;
    const objectUrl = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return true;
  } catch {
    return false;
  }
}
