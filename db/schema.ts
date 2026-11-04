import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const drafts = sqliteTable("drafts", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  definition: text("definition").notNull(),
  revision: integer("revision").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const publications = sqliteTable("publications", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  draftId: text("draft_id").notNull(),
  ownerId: text("owner_id").notNull(),
  author: text("author").notNull(),
  definition: text("definition").notNull(),
  image: text("image").notNull(),
  visibility: text("visibility").notNull(),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull(),
});
export const playSessions = sqliteTable("play_sessions", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  roomId: text("room_id").notNull(),
  definition: text("definition").notNull(),
  state: text("state").notNull(),
  revision: integer("revision").notNull().default(0),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
});
export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: text("created_at").notNull(),
});
export const modelRuns = sqliteTable("model_runs", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  model: text("model").notNull(),
  status: text("status").notNull(),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
