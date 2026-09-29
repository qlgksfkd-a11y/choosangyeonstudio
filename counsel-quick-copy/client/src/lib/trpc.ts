import { createTRPCReact } from "@trpc/react-query";
import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

/** 사용자에게 보여줄 오류 문구. 서버가 준 메시지가 있으면 쓰고, 네트워크 문제는 따로 안내한다. */
export function errorMessage(err: unknown, fallback = "문제가 발생했습니다. 잠시 후 다시 시도해 주세요."): string {
  if (err instanceof TRPCClientError) {
    if (!err.data) return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
    const zod = (err.data as { zodError?: { fieldErrors?: Record<string, string[]> } }).zodError;
    const first = zod?.fieldErrors && Object.values(zod.fieldErrors).flat()[0];
    if (first) return first;
    // zod 오류는 JSON 문자열 메시지로 오는 경우가 있어 첫 메시지를 꺼낸다.
    try {
      const parsed = JSON.parse(err.message);
      if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message;
    } catch {
      /* 일반 문자열 메시지 */
    }
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof TRPCClientError && (err.data as { code?: string } | undefined)?.code === "UNAUTHORIZED";
}
