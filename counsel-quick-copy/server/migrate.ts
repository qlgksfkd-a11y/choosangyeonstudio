import path from "node:path";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { getDb } from "./db";

export async function runMigrations() {
  await migrate(getDb(), { migrationsFolder: path.resolve(import.meta.dirname, "../drizzle") });
}
