import { sql } from "drizzle-orm";

/** 테스트 전에 테스트 DB 를 비우고 마이그레이션을 적용한다. */
export default async function setup() {
  // 실수로 운영 DB 를 지우지 않도록 항상 TEST_DATABASE_URL(또는 기본 테스트 DB)만 사용한다.
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "mysql://counsel:counsel@localhost:3306/counsel_test";
  const { closeDb, getDb } = await import("./server/db");
  const { runMigrations } = await import("./server/migrate");
  const db = getDb();
  for (const t of ["snippets", "images", "categories", "users", "__drizzle_migrations"]) {
    await db.execute(sql.raw(`DROP TABLE IF EXISTS \`${t}\``));
  }
  await runMigrations();
  await closeDb();
}
