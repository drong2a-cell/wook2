import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, LogOut, User, Edit2, Check } from "lucide-react";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { user, logout } = useAuth();
  const bgRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name ?? "");

  const { data: profile, refetch } = trpc.profile.getProfile.useQuery();
  const { data: pairData } = trpc.pairing.getMyPair.useQuery();
  const uploadBg = trpc.profile.uploadBg.useMutation({
    onSuccess: () => { refetch(); toast.success("배경화면이 변경되었습니다!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateName = trpc.profile.updateName.useMutation({
    onSuccess: () => { refetch(); setEditingName(false); toast.success("이름이 변경되었습니다!"); },
    onError: (e) => toast.error(e.message),
  });

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("10MB 이하의 이미지만 업로드 가능합니다.");
      return;
    }
    const base64 = await fileToBase64(file);
    uploadBg.mutate({ base64, mimeType: file.type });
    e.target.value = "";
  };

  const bgUrl = profile?.profileBg;

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Profile Header with Background */}
      <div className="relative h-56 overflow-hidden">
        {bgUrl ? (
          <img src={bgUrl} alt="배경" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary/40" />
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Change BG button */}
        <button
          onClick={() => bgRef.current?.click()}
          disabled={uploadBg.isPending}
          className="absolute top-12 right-4 bg-black/30 backdrop-blur-sm text-white rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-black/50 transition-colors"
        >
          <Camera size={12} />
          {uploadBg.isPending ? "업로드 중..." : "배경 변경"}
        </button>
        <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />

        {/* Avatar */}
        <div className="absolute bottom-4 left-6 flex items-end gap-3">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663593499995/MYgf7aAUaRdMt38uh3hMxS/profile-default-icon-4aHNAz9NoSwscmecPbEHhY.webp"
            alt="프로필"
            className="w-16 h-16 rounded-2xl shadow-lg object-cover"
            loading="lazy"
          />
          <div className="pb-1">
            <p className="text-white font-bold text-lg leading-tight">{profile?.name ?? user?.name}</p>
            <p className="text-white/70 text-xs">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pt-6 space-y-4">
        {/* Name Edit */}
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">내 정보</h3>
            {!editingName && (
              <button
                onClick={() => { setNewName(profile?.name ?? user?.name ?? ""); setEditingName(true); }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
          {editingName ? (
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="이름"
                className="rounded-xl flex-1"
                autoFocus
              />
              <Button
                onClick={() => updateName.mutate({ name: newName })}
                disabled={!newName.trim() || updateName.isPending}
                size="sm"
                className="rounded-xl"
              >
                <Check size={14} />
              </Button>
              <Button
                onClick={() => setEditingName(false)}
                variant="ghost"
                size="sm"
                className="rounded-xl"
              >
                취소
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <User size={14} className="text-muted-foreground" />
                <span className="text-sm">{profile?.name ?? user?.name ?? "이름 없음"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Partner Info */}
        {pairData?.partner && (
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <h3 className="text-sm font-semibold mb-3">함께하는 사람</h3>
            <div className="flex items-center gap-3">
                <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663593499995/MYgf7aAUaRdMt38uh3hMxS/heart-icon-improved-3e6hM5AAxW6tJUWvJAXunG.webp"
                alt="하트"
                className="w-10 h-10 rounded-lg object-cover"
                loading="lazy"
              />
              <div>
                <p className="font-medium text-sm">{pairData.partner.name}</p>
                <p className="text-xs text-muted-foreground">{pairData.partner.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Couple Start Date */}
        {pairData?.pair && (
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <h3 className="text-sm font-semibold mb-2">커플 시작일</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(pairData.pair.startDate).toLocaleDateString("ko-KR", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
        )}

        {/* PWA Install hint */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/20 rounded-2xl p-4 border border-primary/20">
          <p className="text-sm font-semibold text-foreground mb-1">📱 앱으로 설치하기</p>
          <p className="text-xs text-muted-foreground">
            브라우저 메뉴에서 "홈 화면에 추가"를 선택하면<br />
            앱처럼 사용할 수 있어요!
          </p>
        </div>

        {/* Logout */}
        <Button
          onClick={logout}
          variant="outline"
          className="w-full rounded-2xl gap-2 text-muted-foreground border-border/50"
        >
          <LogOut size={16} />
          로그아웃
        </Button>
      </div>
    </div>
  );
}
