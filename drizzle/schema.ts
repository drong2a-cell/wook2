import {
  boolean,
  float,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  profileBg: text("profileBg"),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 커플 페어링
export const couplePairs = mysqlTable("couple_pairs", {
  id: int("id").autoincrement().primaryKey(),
  user1Id: int("user1Id").notNull(),
  user2Id: int("user2Id").notNull(),
  startDate: timestamp("startDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CouplePair = typeof couplePairs.$inferSelect;

// 초대 코드
export const inviteCodes = mysqlTable("invite_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  creatorId: int("creatorId").notNull(),
  used: boolean("used").default(false).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InviteCode = typeof inviteCodes.$inferSelect;

// 디데이
export const ddays = mysqlTable("ddays", {
  id: int("id").autoincrement().primaryKey(),
  pairId: int("pairId").notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  date: timestamp("date").notNull(),
  isMain: boolean("isMain").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Dday = typeof ddays.$inferSelect;

// 채팅 메시지
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  pairId: int("pairId").notNull(),
  senderId: int("senderId").notNull(),
  content: text("content"),
  imageUrl: text("imageUrl"),
  imageKey: text("imageKey"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;

// 위치 공유
export const locations = mysqlTable("locations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  pairId: int("pairId").notNull(),
  latitude: float("latitude").notNull(),
  longitude: float("longitude").notNull(),
  address: text("address"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Location = typeof locations.$inferSelect;

// 하우징 상태
export const housingStates = mysqlTable("housing_states", {
  id: int("id").autoincrement().primaryKey(),
  pairId: int("pairId").notNull().unique(),
  items: json("items").notNull().$type<HousingItem[]>(),
  wallColor: varchar("wallColor", { length: 32 }).default("#F5F5F0").notNull(),
  floorColor: varchar("floorColor", { length: 32 }).default("#E8E4DC").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HousingItem = {
  id: string;
  type: string;
  emoji: string;
  label: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
};

export type HousingState = typeof housingStates.$inferSelect;

// 커플 펫
export const couplePets = mysqlTable("couple_pets", {
  id: int("id").autoincrement().primaryKey(),
  pairId: int("pairId").notNull().unique(),
  name: varchar("name", { length: 50 }).notNull().default("우리 아이"),
  type: mysqlEnum("type", ["cat", "dog", "plant", "hamster"]).default("cat").notNull(),
  level: int("level").default(1).notNull(),
  exp: int("exp").default(0).notNull(),
  hunger: int("hunger").default(80).notNull(),
  happiness: int("happiness").default(80).notNull(),
  lastFedAt: timestamp("lastFedAt").defaultNow().notNull(),
  lastPlayedAt: timestamp("lastPlayedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CouplePet = typeof couplePets.$inferSelect;

// 앨범
export const albums = mysqlTable("albums", {
  id: int("id").autoincrement().primaryKey(),
  pairId: int("pairId").notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  coverUrl: text("coverUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Album = typeof albums.$inferSelect;

// 앨범 사진
export const albumPhotos = mysqlTable("album_photos", {
  id: int("id").autoincrement().primaryKey(),
  albumId: int("albumId").notNull(),
  pairId: int("pairId").notNull(),
  uploaderId: int("uploaderId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  imageKey: text("imageKey").notNull(),
  aiCaption: text("aiCaption"),
  takenAt: timestamp("takenAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AlbumPhoto = typeof albumPhotos.$inferSelect;

// 기념일 / 알림
export const anniversaries = mysqlTable("anniversaries", {
  id: int("id").autoincrement().primaryKey(),
  pairId: int("pairId").notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  date: timestamp("date").notNull(),
  repeatYearly: boolean("repeatYearly").default(true).notNull(),
  notified: boolean("notified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Anniversary = typeof anniversaries.$inferSelect;

// 웹 푸시 구독
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
