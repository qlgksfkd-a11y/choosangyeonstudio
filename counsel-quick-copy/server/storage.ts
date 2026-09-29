import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";

/**
 * 이미지 저장소. S3_BUCKET 이 설정되면 S3 호환 스토리지를, 아니면 로컬 디렉터리를 사용한다.
 * 이미지 바이트는 절대 DB나 프로젝트 정적 폴더에 두지 않는다.
 */
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function makeFileKey(userId: number, mimeType: string): string {
  return `u${userId}/${randomUUID()}.${EXT[mimeType] ?? "bin"}`;
}

let s3: S3Client | null = null;
function client(): S3Client {
  s3 ??= new S3Client({
    region: env.s3.region,
    endpoint: env.s3.endpoint,
    forcePathStyle: Boolean(env.s3.endpoint),
    credentials: env.s3.accessKeyId
      ? { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey }
      : undefined,
  });
  return s3;
}

function localPath(key: string): string {
  const root = path.resolve(env.uploadDir);
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("잘못된 파일 경로입니다.");
  return full;
}

export async function storagePut(key: string, data: Buffer, mimeType: string): Promise<void> {
  if (env.s3.bucket) {
    await client().send(new PutObjectCommand({ Bucket: env.s3.bucket, Key: key, Body: data, ContentType: mimeType }));
    return;
  }
  const full = localPath(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
}

export async function storageGet(key: string): Promise<Buffer | null> {
  try {
    if (env.s3.bucket) {
      const res = await client().send(new GetObjectCommand({ Bucket: env.s3.bucket, Key: key }));
      return Buffer.from(await res.Body!.transformToByteArray());
    }
    return await fs.readFile(localPath(key));
  } catch {
    return null;
  }
}

export async function storageDelete(key: string): Promise<void> {
  try {
    if (env.s3.bucket) {
      await client().send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: key }));
    } else {
      await fs.rm(localPath(key), { force: true });
    }
  } catch (err) {
    console.error("[storage] 파일 삭제 실패", key, err);
  }
}
