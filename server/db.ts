import { and, desc, eq, gt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  albumPhotos,
  albums,
  anniversaries,
  chatMessages,
  couplePairs,
  couplePets,
  ddays,
  housingStates,
  inviteCodes,
  locations,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserProfile(userId: number, data: { profileBg?: string; avatarUrl?: string; name?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

// ─── Couple Pairing ──────────────────────────────────────────────────────────

export async function createInviteCode(creatorId: number, code: string) {
  const db = await getDb();
  if (!db) return;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await db.insert(inviteCodes).values({ code, creatorId, expiresAt });
}

export async function getInviteCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
  return result[0];
}

export async function useInviteCode(code: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(inviteCodes).set({ used: true }).where(eq(inviteCodes.code, code));
}

export async function createCouplePair(user1Id: number, user2Id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [result] = await db.insert(couplePairs).values({ user1Id, user2Id }).$returningId();
  return result;
}

export async function getCouplePairByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(couplePairs)
    .where(or(eq(couplePairs.user1Id, userId), eq(couplePairs.user2Id, userId)))
    .limit(1);
  return result[0];
}

export async function getPartner(pairId: number, myUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const pair = await db.select().from(couplePairs).where(eq(couplePairs.id, pairId)).limit(1);
  if (!pair[0]) return undefined;
  const partnerId = pair[0].user1Id === myUserId ? pair[0].user2Id : pair[0].user1Id;
  return getUserById(partnerId);
}

// ─── D-Day ───────────────────────────────────────────────────────────────────

export async function getDdays(pairId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ddays).where(eq(ddays.pairId, pairId));
}

export async function upsertDday(pairId: number, data: { title: string; date: Date; isMain: boolean }) {
  const db = await getDb();
  if (!db) return;
  if (data.isMain) {
    await db.update(ddays).set({ isMain: false }).where(eq(ddays.pairId, pairId));
  }
  await db.insert(ddays).values({ pairId, ...data });
}

export async function deleteDday(id: number, pairId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(ddays).where(and(eq(ddays.id, id), eq(ddays.pairId, pairId)));
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export async function getChatMessages(pairId: number, limit = 50, beforeId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(chatMessages.pairId, pairId)];
  if (beforeId) conditions.push(gt(chatMessages.id, beforeId));
  return db
    .select()
    .from(chatMessages)
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

export async function sendChatMessage(data: {
  pairId: number;
  senderId: number;
  content?: string;
  imageUrl?: string;
  imageKey?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const [result] = await db.insert(chatMessages).values(data).$returningId();
  return result;
}

export async function markMessagesRead(pairId: number, readerId: number) {
  const db = await getDb();
  if (!db) return;
  // Mark only messages sent by partner (not by the reader themselves) as read
  await db.execute(
    `UPDATE chat_messages SET isRead = true WHERE pairId = ${pairId} AND isRead = false AND senderId != ${readerId}`
  );
}

// ─── Location ────────────────────────────────────────────────────────────────

export async function upsertLocation(data: {
  userId: number;
  pairId: number;
  latitude: number;
  longitude: number;
  address?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(locations)
    .values(data)
    .onDuplicateKeyUpdate({ set: { latitude: data.latitude, longitude: data.longitude, address: data.address } });
}

export async function getLocations(pairId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(locations).where(eq(locations.pairId, pairId));
}

// ─── Housing ─────────────────────────────────────────────────────────────────

export async function getHousingState(pairId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(housingStates).where(eq(housingStates.pairId, pairId)).limit(1);
  return result[0];
}

export async function upsertHousingState(pairId: number, data: { items: unknown; wallColor?: string; floorColor?: string }) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(housingStates)
    .values({ pairId, items: data.items as any, wallColor: data.wallColor, floorColor: data.floorColor })
    .onDuplicateKeyUpdate({ set: { items: data.items as any, wallColor: data.wallColor, floorColor: data.floorColor } });
}

// ─── Pet ─────────────────────────────────────────────────────────────────────

export async function getOrCreatePet(pairId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(couplePets).where(eq(couplePets.pairId, pairId)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(couplePets).values({ pairId });
  const created = await db.select().from(couplePets).where(eq(couplePets.pairId, pairId)).limit(1);
  return created[0];
}

export async function feedPet(pairId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const pet = await getOrCreatePet(pairId);
  if (!pet) return undefined;
  const newHunger = Math.min(100, pet.hunger + 20);
  const newExp = pet.exp + 5;
  const newLevel = Math.floor(newExp / 50) + 1;
  await db
    .update(couplePets)
    .set({ hunger: newHunger, exp: newExp, level: newLevel, lastFedAt: new Date() })
    .where(eq(couplePets.pairId, pairId));
  return getOrCreatePet(pairId);
}

export async function playWithPet(pairId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const pet = await getOrCreatePet(pairId);
  if (!pet) return undefined;
  const newHappiness = Math.min(100, pet.happiness + 15);
  const newExp = pet.exp + 3;
  const newLevel = Math.floor(newExp / 50) + 1;
  await db
    .update(couplePets)
    .set({ happiness: newHappiness, exp: newExp, level: newLevel, lastPlayedAt: new Date() })
    .where(eq(couplePets.pairId, pairId));
  return getOrCreatePet(pairId);
}

export async function updatePetName(pairId: number, name: string, type: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(couplePets).set({ name, type: type as any }).where(eq(couplePets.pairId, pairId));
}

// ─── Album ───────────────────────────────────────────────────────────────────

export async function getAlbums(pairId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(albums).where(eq(albums.pairId, pairId)).orderBy(desc(albums.createdAt));
}

export async function createAlbum(pairId: number, title: string, coverUrl?: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [result] = await db.insert(albums).values({ pairId, title, coverUrl }).$returningId();
  return result;
}

export async function getAlbumPhotos(albumId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(albumPhotos).where(eq(albumPhotos.albumId, albumId)).orderBy(desc(albumPhotos.createdAt));
}

export async function getAllPhotos(pairId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(albumPhotos).where(eq(albumPhotos.pairId, pairId)).orderBy(desc(albumPhotos.createdAt));
}

export async function addAlbumPhoto(data: {
  albumId: number;
  pairId: number;
  uploaderId: number;
  imageUrl: string;
  imageKey: string;
  aiCaption?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const [result] = await db.insert(albumPhotos).values(data).$returningId();
  return result;
}

export async function updatePhotoCaption(photoId: number, aiCaption: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(albumPhotos).set({ aiCaption }).where(eq(albumPhotos.id, photoId));
}

// ─── Anniversary ─────────────────────────────────────────────────────────────

export async function getAnniversaries(pairId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(anniversaries).where(eq(anniversaries.pairId, pairId)).orderBy(anniversaries.date);
}

export async function createAnniversary(data: {
  pairId: number;
  title: string;
  date: Date;
  repeatYearly: boolean;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const [result] = await db.insert(anniversaries).values(data).$returningId();
  return result;
}

export async function deleteAnniversary(id: number, pairId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(anniversaries).where(and(eq(anniversaries.id, id), eq(anniversaries.pairId, pairId)));
}

export async function getPendingAnniversaryNotifications() {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  return db
    .select()
    .from(anniversaries)
    .where(and(eq(anniversaries.notified, false), gt(anniversaries.date, todayStart)));
}

export async function markAnniversaryNotified(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(anniversaries).set({ notified: true }).where(eq(anniversaries.id, id));
}
