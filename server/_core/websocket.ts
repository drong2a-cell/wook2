import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { users, chatMessages } from "../../drizzle/schema";

interface SocketUser {
  userId: number;
  pairId: number;
}

const userSockets = new Map<number, string>(); // userId -> socketId

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[WebSocket] User connected: ${socket.id}`);

    // 사용자 인증 및 등록
    socket.on("auth", async (userId: number, pairId: number) => {
      const socketUser: SocketUser = { userId, pairId };
      socket.data = socketUser;
      userSockets.set(userId, socket.id);
      
      // 페어 룸에 조인
      socket.join(`pair:${pairId}`);
      
      // 상대방에게 온라인 상태 알림
      socket.to(`pair:${pairId}`).emit("user-online", { userId });
      
      console.log(`[WebSocket] User ${userId} authenticated for pair ${pairId}`);
    });

    // 메시지 수신 및 저장
    socket.on("send-message", async (data: { content: string; imageUrl?: string }) => {
      const socketUser = socket.data as SocketUser;
      if (!socketUser) {
        socket.emit("error", "Not authenticated");
        return;
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // DB에 메시지 저장
        const result = await db.insert(chatMessages).values({
          pairId: socketUser.pairId,
          senderId: socketUser.userId,
          content: data.content,
          imageUrl: data.imageUrl,
          createdAt: new Date(),
        });

        // 페어 전체에 메시지 브로드캐스트
        io.to(`pair:${socketUser.pairId}`).emit("message", {
          id: Date.now(),
          senderId: socketUser.userId,
          content: data.content,
          imageUrl: data.imageUrl,
          createdAt: new Date().toISOString(),
          isRead: false,
        });
      } catch (error) {
        console.error("[WebSocket] Failed to save message:", error);
        socket.emit("error", "Failed to send message");
      }
    });

    // 메시지 읽음 처리
    socket.on("mark-as-read", async (data: { messageIds: number[] }) => {
      const socketUser = socket.data as SocketUser;
      if (!socketUser) return;

      try {
        // 상대방에게 읽음 알림
        socket.to(`pair:${socketUser.pairId}`).emit("messages-read", {
          messageIds: data.messageIds,
        });
      } catch (error) {
        console.error("[WebSocket] Failed to mark as read:", error);
      }
    });

    // 타이핑 상태
    socket.on("typing", () => {
      const socketUser = socket.data as SocketUser;
      if (!socketUser) return;
      
      socket.to(`pair:${socketUser.pairId}`).emit("user-typing", {
        userId: socketUser.userId,
      });
    });

    socket.on("stop-typing", () => {
      const socketUser = socket.data as SocketUser;
      if (!socketUser) return;
      
      socket.to(`pair:${socketUser.pairId}`).emit("user-stop-typing", {
        userId: socketUser.userId,
      });
    });

    // 연결 해제
    socket.on("disconnect", () => {
      const socketUser = socket.data as SocketUser;
      if (socketUser) {
        userSockets.delete(socketUser.userId);
        socket.to(`pair:${socketUser.pairId}`).emit("user-offline", {
          userId: socketUser.userId,
        });
        console.log(`[WebSocket] User ${socketUser.userId} disconnected`);
      }
    });
  });

  return io;
}
