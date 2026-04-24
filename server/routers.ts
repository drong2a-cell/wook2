import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";
import * as db from "./db";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requirePair(userId: number) {
  const pair = await db.getCouplePairByUserId(userId);
  if (!pair) throw new TRPCError({ code: "FORBIDDEN", message: "커플 페어링이 필요합니다." });
  return pair;
}

// ─── Routers ─────────────────────────────────────────────────────────────────

const pairingRouter = router({
  getMyPair: protectedProcedure.query(async ({ ctx }) => {
    const pair = await db.getCouplePairByUserId(ctx.user.id);
    if (!pair) return null;
    const partner = await db.getPartner(pair.id, ctx.user.id);
    return { pair, partner };
  }),

  createInviteCode: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if already paired
    const existing = await db.getCouplePairByUserId(ctx.user.id);
    if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "이미 커플로 연결되어 있습니다." });
    const code = nanoid(8).toUpperCase();
    await db.createInviteCode(ctx.user.id, code);
    return { code };
  }),

  acceptInviteCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await db.getInviteCode(input.code);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "유효하지 않은 초대 코드입니다." });
      if (invite.used) throw new TRPCError({ code: "BAD_REQUEST", message: "이미 사용된 초대 코드입니다." });
      if (new Date() > invite.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "만료된 초대 코드입니다." });
      if (invite.creatorId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "본인의 초대 코드는 사용할 수 없습니다." });

      const existingPair = await db.getCouplePairByUserId(ctx.user.id);
      if (existingPair) throw new TRPCError({ code: "BAD_REQUEST", message: "이미 커플로 연결되어 있습니다." });

      await db.useInviteCode(input.code);
      const pair = await db.createCouplePair(invite.creatorId, ctx.user.id);
      return { success: true, pairId: pair?.id };
    }),
});

const ddayRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const pair = await requirePair(ctx.user.id);
    return db.getDdays(pair.id);
  }),

  create: protectedProcedure
    .input(z.object({ title: z.string().min(1), date: z.string(), isMain: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const pair = await requirePair(ctx.user.id);
      await db.upsertDday(pair.id, { title: input.title, date: new Date(input.date), isMain: input.isMain });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const pair = await requirePair(ctx.user.id);
      await db.deleteDday(input.id, pair.id);
      return { success: true };
    }),
});

const chatRouter = router({
  getMessages: protectedProcedure
    .input(z.object({ limit: z.number().default(50), afterId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const pair = await requirePair(ctx.user.id);
      const messages = await db.getChatMessages(pair.id, input.limit, input.afterId);
      return messages.reverse();
    }),

  send: protectedProcedure
    .input(z.object({ content: z.string().optional(), imageUrl: z.string().optional(), imageKey: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const pair = await requirePair(ctx.user.id);
      if (!input.content && !input.imageUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "내용 또는 이미지가 필요합니다." });
      const result = await db.sendChatMessage({ pairId: pair.id, senderId: ctx.user.id, ...input });
      return { success: true, id: result?.id };
    }),

  markRead: protectedProcedure.mutation(async ({ ctx }) => {
    const pair = await requirePair(ctx.user.id);
    await db.markMessagesRead(pair.id, ctx.user.id);
    return { success: true };
  }),

  uploadImage: protectedProcedure
    .input(z.object({ base64: z.string(), mimeType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pair = await requirePair(ctx.user.id);
      const buffer = Buffer.from(input.base64, "base64");
      const key = `chat/${pair.id}/${Date.now()}-${nanoid(6)}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url, key };
    }),
});

const locationRouter = router({
  update: protectedProcedure
    .input(z.object({ latitude: z.number(), longitude: z.number(), address: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const pair = await requirePair(ctx.user.id);
      await db.upsertLocation({ userId: ctx.user.id, pairId: pair.id, ...input });
      return { success: true };
    }),

  getLocations: protectedProcedure.query(async ({ ctx }) => {
    const pair = await requirePair(ctx.user.id);
    const locs = await db.getLocations(pair.id);
    // Attach user info
    const result = await Promise.all(
      locs.map(async (loc) => {
        const user = await db.getUserById(loc.userId);
        return { ...loc, user };
      })
    );
    return result;
  }),
});

const housingRouter = router({
  getState: protectedProcedure.query(async ({ ctx }) => {
    const pair = await requirePair(ctx.user.id);
    const state = await db.getHousingState(pair.id);
    return state ?? { items: [], wallColor: "#F5F5F0", floorColor: "#E8E4DC" };
  }),

  saveState: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            emoji: z.string(),
            label: z.string(),
            x: z.number(),
            y: z.number(),
            rotation: z.number(),
            scale: z.number(),
          })
        ),
        wallColor: z.string().optional(),
        floorColor: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pair = await requirePair(ctx.user.id);
      await db.upsertHousingState(pair.id, input);
      return { success: true };
    }),
});

const petRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const pair = await requirePair(ctx.user.id);
    return db.getOrCreatePet(pair.id);
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), type: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pair = await requirePair(ctx.user.id);
      return db.createPet(pair.id, input.name, input.type);
    }),

  feed: protectedProcedure.mutation(async ({ ctx }) => {
    const pair = await requirePair(ctx.user.id);
    return db.feedPet(pair.id);
  }),

  play: protectedProcedure.mutation(async ({ ctx }) => {
    const pair = await requirePair(ctx.user.id);
    return db.playWithPet(pair.id);
  }),

  updateName: protectedProcedure
    .input(z.object({ name: z.string().min(1), type: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pair = await requirePair(ctx.user.id);
      await db.updatePetName(pair.id, input.name, input.type);
      return { success: true };
    }),
});

const albumRouter = router({
  getAlbums: protectedProcedure.query(async ({ ctx }) => {
    const pair = await requirePair(ctx.user.id);
    return db.getAlbums(pair.id);
  }),

  createAlbum: protectedProcedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const pair = await requirePair(ctx.user.id);
      const result = await db.createAlbum(pair.id, input.title);
      return { success: true, id: result?.id };
    }),

  getPhotos: protectedProcedure
    .input(z.object({ albumId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getAlbumPhotos(input.albumId);
    }),

  getAllPhotos: protectedProcedure.query(async ({ ctx }) => {
    const pair = await requirePair(ctx.user.id);
    return db.getAllPhotos(pair.id);
  }),

  uploadPhoto: protectedProcedure
    .input(z.object({ albumId: z.number(), base64: z.string(), mimeType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pair = await requirePair(ctx.user.id);
      const buffer = Buffer.from(input.base64, "base64");
      const key = `album/${pair.id}/${Date.now()}-${nanoid(6)}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      // Generate AI caption
      let aiCaption: string | undefined;
      try {
        const captionRes = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "당신은 커플 사진을 보고 감성적이고 따뜻한 한국어 캡션을 작성하는 전문가입니다. 짧고 시적인 문장으로 사진의 감성을 표현해주세요. 이모지를 1-2개 포함해도 좋습니다.",
            },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url, detail: "low" } },
                { type: "text", text: "이 사진에 어울리는 감성적인 캡션을 한 문장으로 작성해주세요." },
              ],
            },
          ],
        });
        aiCaption = captionRes.choices?.[0]?.message?.content as string | undefined;
      } catch (e) {
        console.warn("AI caption generation failed:", e);
      }

      const result = await db.addAlbumPhoto({
        albumId: input.albumId,
        pairId: pair.id,
        uploaderId: ctx.user.id,
        imageUrl: url,
        imageKey: key,
        aiCaption,
      });
      return { success: true, id: result?.id, url, aiCaption };
    }),
});

const anniversaryRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const pair = await requirePair(ctx.user.id);
    return db.getAnniversaries(pair.id);
  }),

  create: protectedProcedure
    .input(z.object({ title: z.string().min(1), date: z.string(), repeatYearly: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const pair = await requirePair(ctx.user.id);
      const result = await db.createAnniversary({
        pairId: pair.id,
        title: input.title,
        date: new Date(input.date),
        repeatYearly: input.repeatYearly,
      });
      return { success: true, id: result?.id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const pair = await requirePair(ctx.user.id);
      await db.deleteAnniversary(input.id, pair.id);
      return { success: true };
    }),
});

const profileRouter = router({
  uploadBg: protectedProcedure
    .input(z.object({ base64: z.string(), mimeType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const key = `profile/${ctx.user.id}/bg-${Date.now()}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await db.updateUserProfile(ctx.user.id, { profileBg: url });
      return { url };
    }),

  updateName: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserProfile(ctx.user.id, { name: input.name });
      return { success: true };
    }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserById(ctx.user.id);
  }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  pairing: pairingRouter,
  dday: ddayRouter,
  chat: chatRouter,
  location: locationRouter,
  housing: housingRouter,
  pet: petRouter,
  album: albumRouter,
  anniversary: anniversaryRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
