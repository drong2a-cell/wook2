import { useState, useRef, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Image as ImageIcon, ArrowLeft, Check, CheckCheck } from "lucide-react";
import { useLocation } from "wouter";

interface Message {
  id: number;
  senderId: number;
  content: string | null;
  imageUrl?: string | null;
  createdAt: string;
  isRead: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Chat() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const { data: pairData } = trpc.pairing.getMyPair.useQuery();
  const { data: initialMessages } = trpc.chat.getMessages.useQuery({ limit: 50 });
  const uploadImg = trpc.chat.uploadImage.useMutation();
  const markRead = trpc.chat.markRead.useMutation();

  // 초기 메시지 로드
  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages.map(msg => ({
        ...msg,
        createdAt: typeof msg.createdAt === 'string' ? msg.createdAt : new Date(msg.createdAt).toISOString(),
      })));
    }
  }, [initialMessages]);

  // WebSocket 연결
  useEffect(() => {
    if (!user || !pairData?.pair?.id) return;

    const newSocket = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("[Chat] WebSocket connected");
      setIsConnected(true);
      newSocket.emit("auth", user.id, pairData.pair.id);
    });

    newSocket.on("message", (msg: any) => {
      setMessages(prev => [...prev, { ...msg, createdAt: typeof msg.createdAt === 'string' ? msg.createdAt : new Date(msg.createdAt).toISOString() }]);
    });

    newSocket.on("user-typing", () => {
      setIsTyping(true);
    });

    newSocket.on("user-stop-typing", () => {
      setIsTyping(false);
    });

    newSocket.on("disconnect", () => {
      console.log("[Chat] WebSocket disconnected");
      setIsConnected(false);
    });

    newSocket.on("error", (error) => {
      console.error("[Chat] WebSocket error:", error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, pairData?.pair?.id]);

  // 메시지 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 읽음 표시
  useEffect(() => {
    markRead.mutate();
  }, [markRead]);

  // 메시지 전송
  const handleSend = useCallback(() => {
    if (!content || !content.trim() || !socket || !isConnected) return;
    
    setIsSending(true);
    try {
      socket.emit("send-message", { content: content?.trim() || "" });
      setContent("");
      socket.emit("stop-typing");
    } catch (error) {
      toast.error("메시지 전송 실패");
    } finally {
      setIsSending(false);
    }
  }, [content, socket, isConnected]);

  // 이미지 업로드
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket || !isConnected) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB 이하의 이미지만 업로드 가능합니다.");
      return;
    }
    
    setIsSending(true);
    try {
      const base64 = await fileToBase64(file);
      const { url } = await uploadImg.mutateAsync({ base64, mimeType: file.type });
      socket.emit("send-message", { content: "[이미지]", imageUrl: url });
      toast.success("이미지가 전송되었습니다");
    } catch (error) {
      toast.error("이미지 전송 실패");
    } finally {
      setIsSending(false);
      e.target.value = "";
    }
  };

  // 타이핑 상태
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    
    if (socket && isConnected) {
      socket.emit("typing");
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing");
      }, 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 bg-card border-b border-border/50">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center text-sm">💕</div>
          <div>
            <p className="font-semibold text-sm">우리 채팅방</p>
            <p className="text-xs text-muted-foreground">{isConnected ? "🟢 연결됨" : "🔴 연결 중..."}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {messages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <span className="text-4xl block mb-3">💬</span>
            <p className="text-sm">첫 메시지를 보내보세요!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                {msg.imageUrl ? (
                  <img
                    src={msg.imageUrl}
                    alt="사진"
                    className={`rounded-2xl max-w-full object-cover ${isMine ? "rounded-br-sm" : "rounded-bl-sm"}`}
                    style={{ maxHeight: 240 }}
                  />
                ) : (
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? "bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-br-sm"
                        : "bg-card text-foreground border border-border/50 rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
                <div className={`flex items-center gap-1 ${isMine ? "flex-row-reverse" : ""}`}>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isMine && (
                    msg.isRead
                      ? <CheckCheck size={12} className="text-pink-400" />
                      : <Check size={12} className="text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-1 px-4 py-2.5 rounded-2xl rounded-bl-sm bg-card border border-border/50">
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.1s" }} />
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.2s" }} />
            </div>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 px-4 py-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadImg.isPending || !isConnected}
            className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <ImageIcon size={20} />
          </button>
          <Input
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            disabled={!isConnected}
            className="flex-1 rounded-2xl border-border/50 bg-muted"
          />
          <Button
            onClick={handleSend}
            disabled={!content?.trim() || isSending || !isConnected}
            size="sm"
            className="rounded-xl px-3 h-10 bg-gradient-to-r from-pink-400 to-rose-400 text-white hover:shadow-lg transition-all"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
