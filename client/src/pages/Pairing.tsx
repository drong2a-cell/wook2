import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Heart, Link } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Pairing() {
  const { user, logout } = useAuth();
  const [code, setCode] = useState("");
  const [tab, setTab] = useState<"create" | "join">("create");

  const createCode = trpc.pairing.createInviteCode.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const acceptCode = trpc.pairing.acceptInviteCode.useMutation({
    onSuccess: () => {
      toast.success("커플 연결 완료! 🎉");
      window.location.reload();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCopy = () => {
    if (createCode.data?.code) {
      navigator.clipboard.writeText(createCode.data.code);
      toast.success("초대 코드가 복사되었습니다!");
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center px-6 overflow-y-auto">
      {/* Decorative */}
      <div className="relative mb-8 h-32 w-full flex items-center justify-center">
        <div className="absolute w-40 h-40 rounded-full bg-pink-200/40 blur-3xl -top-4 -left-8 animate-pulse" />
        <div className="absolute w-32 h-32 rounded-full bg-purple-200/30 blur-3xl -bottom-4 -right-8 animate-pulse" />
        <img
          src="/manus-storage/couple-icon_19778bab.png"
          alt="커플 연결"
          className="relative w-40 h-40 object-contain drop-shadow-lg"
        />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">커플 연결하기</h1>
          <p className="text-sm text-muted-foreground">
            초대 코드로 상대방과 연결하세요
          </p>
        </div>

        {/* Tab */}
        <div className="flex bg-muted rounded-2xl p-1">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === "create" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            초대 코드 만들기
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === "join" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            코드 입력하기
          </button>
        </div>

        {tab === "create" ? (
          <div className="space-y-4">
            {createCode.data?.code ? (
              <div className="space-y-4">
                <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
                  <p className="text-xs text-muted-foreground mb-2">초대 코드</p>
                  <p className="text-3xl font-black tracking-widest text-primary">
                    {createCode.data.code}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">24시간 유효</p>
                </div>
                <Button onClick={handleCopy} variant="outline" className="w-full rounded-xl gap-2">
                  <Copy size={16} />
                  코드 복사하기
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  상대방에게 이 코드를 전달하세요
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
                  <Link size={32} className="mx-auto mb-3 text-primary/40" />
                  <p className="text-sm text-muted-foreground">
                    초대 코드를 생성하면<br />상대방이 입력해서 연결할 수 있어요
                  </p>
                </div>
                <Button
                  onClick={() => createCode.mutate()}
                  disabled={createCode.isPending}
                  className="w-full rounded-xl"
                >
                  {createCode.isPending ? "생성 중..." : "초대 코드 생성하기"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-4 border border-border/50">
              <Input
                placeholder="초대 코드 8자리 입력"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="text-center text-xl font-bold tracking-widest border-0 bg-transparent focus-visible:ring-0 h-12"
              />
            </div>
            <Button
              onClick={() => acceptCode.mutate({ code })}
              disabled={code.length < 6 || acceptCode.isPending}
              className="w-full rounded-xl"
            >
              {acceptCode.isPending ? "연결 중..." : "연결하기 💕"}
            </Button>
          </div>
        )}

        <div className="pt-4 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            {user?.name}님으로 로그인됨 ·{" "}
            <button onClick={logout} className="text-primary hover:underline">
              로그아웃
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
