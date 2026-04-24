import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Image, ArrowLeft, Check, CheckCheck } from "lucide-react";
import { useLocation } from "wouter";

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
  const utils = trpc.useUtils();

  const { data: messages, refetch } = trpc.chat.getMessages.useQuery({ limit: 50 });
  const sendMsg = trpc.chat.send.useMutation({
    onSuccess: () => { refetch(); setContent(""); },
    onError: (e) => toast.error(e.message),
  });
  const uploadImg = trpc.chat.uploadImage.useMutation({
    onError: (e) => toast.error("이미지 업로드 실패: " + e.message),
  });
  const markRead = trpc.chat.markRead.useMutation();

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark read on mount
  useEffect(() => {
    markRead.mutate();
  }, []);

  // Poll for new messages every 3s
  useEffect(() => {
    const interval = setInterval(() => refetch(), 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleSend = () => {
    if (!content.trim()) return;
    sendMsg.mutate({ content: content.trim() });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB 이하의 이미지만 업로드 가능합니다.");
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      const { url, key } = await uploadImg.mutateAsync({ base64, mimeType: file.type });
      await sendMsg.mutateAsync({ imageUrl: url, imageKey: key });
    } catch (e) {
      toast.error("이미지 전송 실패");
    }
    e.target.value = "";
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
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm">💕</div>
          <div>
            <p className="font-semibold text-sm">우리 채팅방</p>
            <p className="text-xs text-muted-foreground">둘만의 공간</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {messages?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <span className="text-4xl block mb-3">💬</span>
            <p className="text-sm">첫 메시지를 보내보세요!</p>
          </div>
        )}
        {messages?.map((msg) => {
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
                        ? "bg-primary text-primary-foreground rounded-br-sm"
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
                      ? <CheckCheck size={12} className="text-primary" />
                      : <Check size={12} className="text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
            disabled={uploadImg.isPending}
            className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Image size={20} />
          </button>
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-2xl border-border/50 bg-muted"
          />
          <Button
            onClick={handleSend}
            disabled={!content.trim() || sendMsg.isPending}
            size="sm"
            className="rounded-xl px-3 h-10"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
