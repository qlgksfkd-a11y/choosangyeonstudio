import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    /** 외부 인증 식별자. 이메일 로그인은 `local:<email>` 형태. */
    openId: varchar("openId", { length: 191 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("users_openId_idx").on(t.openId), uniqueIndex("users_email_idx").on(t.email)],
);

export const categories = mysqlTable(
  "categories",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 60 }).notNull(),
    color: varchar("color", { length: 16 }).notNull().default("#1f2a44"),
    sortOrder: int("sortOrder").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("categories_user_idx").on(t.userId, t.sortOrder)],
);

export const snippets = mysqlTable(
  "snippets",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    categoryId: int("categoryId").notNull(),
    title: varchar("title", { length: 120 }),
    content: text("content").notNull(),
    isPinned: boolean("isPinned").notNull().default(false),
    sortOrder: int("sortOrder").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("snippets_category_idx").on(t.userId, t.categoryId, t.isPinned, t.sortOrder)],
);

export const images = mysqlTable(
  "images",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    categoryId: int("categoryId").notNull(),
    name: varchar("name", { length: 120 }),
    /** 이미지 바이트는 저장소(S3)에 두고 DB에는 URL과 메타데이터만 기록한다. */
    url: varchar("url", { length: 512 }).notNull(),
    fileKey: varchar("fileKey", { length: 255 }).notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    sortOrder: int("sortOrder").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("images_category_idx").on(t.userId, t.categoryId, t.sortOrder), uniqueIndex("images_fileKey_idx").on(t.fileKey)],
);

export const usersRelations = relations(users, ({ many }) => ({ categories: many(categories) }));
export const categoriesRelations = relations(categories, ({ many }) => ({
  snippets: many(snippets),
  images: many(images),
}));

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Snippet = typeof snippets.$inferSelect;
export type ImageRow = typeof images.$inferSelect;
