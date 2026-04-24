import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

interface Message {
  id: number; // 양수: 실제 DB ID, 음수: 임시 optimistic ID
  senderId: number;
  content: string;
  imageUrl?: string;
  createdAt: Date;
  readAt?: Date | null;
}

export default function ChatPopup() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: pairData } = trpc.pairing.getMyPair.useQuery();
  const { data: chatMessages, refetch: refetchMessages, isLoading: isLoadingMessages } = trpc.chat.getMessages.useQuery(
    { limit: 50 },
    { enabled: isOpen && !!pairData }
  );

  // Initialize WebSocket and refetch messages on open
  useEffect(() => {
    if (!isOpen || !user || !pairData) return;
    
    // 채팅 창 열 때 최신 메시지 조회
    refetchMessages();

    socketRef.current = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on("connect", () => {
      socketRef.current?.emit("auth", user.id, pairData.pair.id);
      // 연결 후 최신 메시지 다시 조회
      refetchMessages();
    });

    socketRef.current.on("message", (msg: Message) => {
      setMessages((prev) => {
        // 서버에서 온 메시지: 임시 ID 메시지를 실제 ID로 교체하거나 새 메시지 추가
        if (msg.senderId === user.id && msg.id > 0) {
          // 내가 보낸 메시지이고 실제 DB ID인 경우, 임시 메시지 찾아서 교체
          const tempMsgIndex = prev.findIndex(
            (m) => m.id < 0 && m.senderId === user.id && m.content === msg.content
          );
          if (tempMsgIndex >= 0) {
            const updated = [...prev];
            updated[tempMsgIndex] = msg;
            return updated;
          }
        }
        // 새 메시지 추가 (상대방 메시지 또는 이미 있는 메시지)
        return [...prev, msg];
      });
      scrollToBottom();
    });

    socketRef.current.on("disconnect", () => {
      console.log("[Chat] Disconnected from WebSocket");
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [isOpen, user, pairData, refetchMessages]);

  // Load initial messages when chat opens or messages refresh
  useEffect(() => {
    if (isOpen && chatMessages && !isLoadingMessages) {
      // DB에서 로드한 메시지는 모두 실제 ID를 가짐
      setMessages(chatMessages as Message[]);
      scrollToBottom();
    }
  }, [chatMessages, isOpen, isLoadingMessages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  };

  const handleSendMessage = () => {
    if (!input.trim() || !socketRef.current || !user || !pairData) return;

    // 임시 ID로 optimistic 업데이트 (나중에 서버 ID로 교체)
    const tempId = -Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      senderId: user.id,
      content: input,
      createdAt: new Date(),
    };

    socketRef.current.emit("send-message", {
      pairId: pairData.pair.id,
      content: input,
      tempId, // 서버가 이 임시 ID를 받아서 실제 DB ID와 매핑
    });

    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");
    scrollToBottom();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="fixed bottom-20 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center hover:scale-110"
        title="채팅"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div
      className="fixed z-50 w-80 h-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      {/* Header - Draggable */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-pink-400 to-rose-400 text-white cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={18} />
          <h3 className="font-semibold text-sm">💬 {pairData?.partner?.name}</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          data-no-drag
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <div className="text-3xl mb-2">💬</div>
              <p className="text-sm text-gray-500">첫 메시지를 보내보세요!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  msg.senderId === user?.id
                    ? "bg-pink-400 text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                }`}
              >
                {msg.imageUrl ? (
                  <img
                    src={msg.imageUrl}
                    alt="메시지"
                    className="max-w-xs rounded mb-1"
                  />
                ) : null}
                <p className="break-words">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.senderId === user?.id ? "text-white/70" : "text-gray-400"
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-gray-200 bg-white flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="메시지 입력..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
        />
        <button
          onClick={handleSendMessage}
          disabled={!input.trim()}
          className="p-2 rounded-lg bg-pink-400 text-white hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
