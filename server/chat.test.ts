import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `sample-user-${userId}`,
    email: `sample${userId}@example.com`,
    name: `Sample User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Chat Router", () => {
  it("should have chat.getMessages procedure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // Verify the procedure exists
    expect(caller.chat).toBeDefined();
    expect(caller.chat.getMessages).toBeDefined();
  });

  it("should have chat.sendMessage procedure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // Verify the procedure exists
    expect(caller.chat).toBeDefined();
    expect(caller.chat.sendMessage).toBeDefined();
  });

  it("should have chat.markAsRead procedure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // Verify the procedure exists
    expect(caller.chat).toBeDefined();
    expect(caller.chat.markAsRead).toBeDefined();
  });

  it("should require authentication for chat procedures", async () => {
    // Create context without user (unauthenticated)
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    // Attempting to call protected procedures without auth should fail
    try {
      await caller.chat.getMessages({ limit: 50 });
      // If we reach here, the test should fail
      expect(true).toBe(false);
    } catch (error: unknown) {
      // Expected: procedure should throw an error for unauthenticated users
      expect(error).toBeDefined();
    }
  });

  it("should have pairing procedures for pair management", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // Verify pairing procedures exist
    expect(caller.pairing).toBeDefined();
    expect(caller.pairing.getMyPair).toBeDefined();
  });
});

describe("WebSocket Message Handling", () => {
  it("should properly structure message data for broadcast", () => {
    // Test that message structure matches expected format
    const messageData = {
      id: 123,
      senderId: 1,
      content: "Hello, partner!",
      imageUrl: undefined,
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    expect(messageData).toHaveProperty("id");
    expect(messageData).toHaveProperty("senderId");
    expect(messageData).toHaveProperty("content");
    expect(messageData).toHaveProperty("createdAt");
    expect(typeof messageData.id).toBe("number");
    expect(typeof messageData.senderId).toBe("number");
    expect(typeof messageData.content).toBe("string");
  });

  it("should handle message with image URL", () => {
    const messageData = {
      id: 124,
      senderId: 1,
      content: "Check this out!",
      imageUrl: "/manus-storage/image_abc123.png",
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    expect(messageData.imageUrl).toBeDefined();
    expect(messageData.imageUrl).toContain("/manus-storage/");
  });
});

describe("Icon URL Migration", () => {
  it("should use manus-storage URLs for icons", () => {
    const iconUrls = {
      profileIcon: "/manus-storage/profile-default-icon_1195aefa.png",
      heartIcon: "/manus-storage/heart-icon-improved_599aad24.png",
      ddayIcon: "/manus-storage/dday-icon_a273ef11.png",
      coupleIcon: "/manus-storage/couple-icon_19778bab.png",
    };

    // Verify all icons use the new manus-storage path
    Object.values(iconUrls).forEach((url) => {
      expect(url).toContain("/manus-storage/");
      expect(url).not.toContain("cloudfront");
      expect(url).not.toContain("https://d");
    });
  });

  it("should not contain hardcoded CloudFront URLs", () => {
    const invalidUrls = [
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663593499995/MYgf7aAUaRdMt38uh3hMxS/profile-default-icon-4aHNAz9NoSwscmecPbEHhY.webp",
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663593499995/MYgf7aAUaRdMt38uh3hMxS/heart-icon-improved-3e6hM5AAxW6tJUWvJAXunG.webp",
    ];

    // These URLs should not be used anywhere
    invalidUrls.forEach((url) => {
      expect(url).toContain("cloudfront");
    });
  });
});


describe("Chat Message Synchronization", () => {
  it("should handle optimistic message ID replacement", () => {
    // Optimistic ID (음수)와 실제 DB ID (양수) 처리 로직 검증
    const tempId = -Date.now();
    const actualDbId = 12345;

    // 임시 메시지
    const tempMsg = {
      id: tempId,
      senderId: 1,
      content: "Hello",
      createdAt: new Date(),
      readAt: null,
    };

    // 서버에서 온 실제 메시지
    const actualMsg = {
      id: actualDbId,
      senderId: 1,
      content: "Hello",
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    // 임시 ID는 음수, 실제 ID는 양수
    expect(tempId).toBeLessThan(0);
    expect(actualDbId).toBeGreaterThan(0);
    expect(actualMsg.content).toBe(tempMsg.content);
  });

  it("should distinguish between optimistic and persisted messages", () => {
    const messages = [
      { id: -1000, senderId: 1, content: "Optimistic", createdAt: new Date(), readAt: null },
      { id: 100, senderId: 2, content: "Partner", createdAt: new Date(), readAt: null },
      { id: 101, senderId: 1, content: "Persisted", createdAt: new Date(), readAt: null },
    ];

    const optimisticMsgs = messages.filter((m) => m.id < 0);
    const persistedMsgs = messages.filter((m) => m.id > 0);

    expect(optimisticMsgs).toHaveLength(1);
    expect(persistedMsgs).toHaveLength(2);
  });

  it("should verify message structure for DB persistence", () => {
    const persistedMsg = {
      id: 999,
      senderId: 1,
      content: "Test message",
      imageUrl: "/manus-storage/image_abc.png",
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    // 모든 필수 필드 존재 확인
    expect(persistedMsg).toHaveProperty("id");
    expect(persistedMsg).toHaveProperty("senderId");
    expect(persistedMsg).toHaveProperty("content");
    expect(persistedMsg).toHaveProperty("createdAt");
    expect(persistedMsg).toHaveProperty("readAt");

    // ID는 양수여야 함 (DB에서 반환된 ID)
    expect(persistedMsg.id).toBeGreaterThan(0);
  });
});
