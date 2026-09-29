export type { User, Category, Snippet, ImageRow } from "../drizzle/schema";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const SESSION_COOKIE = "cqc_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** 카테고리 색상 팔레트 (Editorial Cream 톤). */
export const CATEGORY_COLORS = [
  "#1f2a44", // 네이비
  "#8a3b2f", // 벽돌
  "#3f6b52", // 올리브 그린
  "#a4761a", // 머스터드
  "#5b4a8a", // 자주
  "#2f6f7e", // 청록
  "#7a5c48", // 브라운
  "#222222", // 차콜
] as const;
