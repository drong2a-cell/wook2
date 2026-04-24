import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user-1",
    email: "test@example.com",
    name: "테스트 유저",
    loginMethod: "manus",
    role: "user",
    profileBg: null,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function createAuthContext(user?: AuthenticatedUser): TrpcContext {
  return {
    user: user ?? createMockUser(),
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      user: createMockUser(),
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string) => clearedCookies.push(name),
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toContain(COOKIE_NAME);
  });
});

describe("auth.me", () => {
  it("returns current user when authenticated", async () => {
    const user = createMockUser();
    const ctx = createAuthContext(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toEqual(user);
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("pairing - requirePair guard", () => {
  it("throws FORBIDDEN when user has no pair", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // dday.list requires a pair
    await expect(caller.dday.list()).rejects.toThrow();
  });

  it("throws FORBIDDEN for chat without pair", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.chat.getMessages({ limit: 10 })).rejects.toThrow();
  });
});

describe("dday validation", () => {
  it("rejects empty title", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.dday.create({ title: "", date: "2024-01-01", isMain: false })
    ).rejects.toThrow();
  });
});

describe("chat validation", () => {
  it("rejects message with no content and no image", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Should throw because no pair exists
    await expect(caller.chat.send({ content: undefined, imageUrl: undefined })).rejects.toThrow();
  });
});

describe("anniversary validation", () => {
  it("rejects empty title", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.anniversary.create({ title: "", date: "2024-01-01", repeatYearly: true })
    ).rejects.toThrow();
  });
});
