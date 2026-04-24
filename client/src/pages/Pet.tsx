import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Heart, Utensils, Gamepad2, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PET_TYPES = [
  { type: "cat", emoji: "🐱", label: "고양이" },
  { type: "dog", emoji: "🐶", label: "강아지" },
  { type: "plant", emoji: "🌱", label: "식물" },
  { type: "hamster", emoji: "🐹", label: "햄스터" },
];

const PET_STAGES = [
  { minLevel: 1, maxLevel: 3, label: "아기", suffix: "🥚" },
  { minLevel: 4, maxLevel: 7, label: "성장", suffix: "🌱" },
  { minLevel: 8, maxLevel: 12, label: "성인", suffix: "✨" },
  { minLevel: 13, maxLevel: 99, label: "전설", suffix: "👑" },
];

function getStage(level: number) {
  return PET_STAGES.find((s) => level >= s.minLevel && level <= s.maxLevel) ?? PET_STAGES[0];
}

function StatusBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium">{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function Pet() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("cat");
  const [createOpen, setCreateOpen] = useState(false);
  const [petName, setPetName] = useState("");
  const [petTypeCreate, setPetTypeCreate] = useState("cat");

  const { data: pet, refetch } = trpc.pet.get.useQuery();
  const createPet = trpc.pet.updateName.useMutation({
    onSuccess: () => { refetch(); setCreateOpen(false); setPetName(""); setPetTypeCreate("cat"); toast.success("펫이 생성되었어요! 🎉"); },
    onError: (e: any) => toast.error(e.message),
  });
  const feed = trpc.pet.feed.useMutation({ onSuccess: () => { refetch(); toast.success("냠냠! 배가 불러졌어요 🍖"); } });
  const play = trpc.pet.play.useMutation({ onSuccess: () => { refetch(); toast.success("신나게 놀았어요! 🎉"); } });
  const updateName = trpc.pet.updateName.useMutation({
    onSuccess: () => { refetch(); setSettingsOpen(false); toast.success("설정이 저장되었습니다!"); },
  });

  if (!pet) {
    return (
      <div className="min-h-screen pb-20 bg-background flex items-center justify-center">
        <div className="w-full max-w-sm mx-auto px-6 text-center space-y-6">
          <div className="text-6xl">🐾</div>
          <div>
            <h2 className="text-2xl font-bold mb-2">우리 펫을 만들어볼까요?</h2>
            <p className="text-sm text-muted-foreground">함께 키울 소중한 친구를 선택해주세요</p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="w-full rounded-2xl py-6 text-base"
          >
            펫 만들기
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="rounded-3xl max-w-sm mx-auto">
              <DialogHeader>
                <DialogTitle>우리 펫 만들기</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-sm font-medium">펫 이름</Label>
                  <Input
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder="예: 뽀삐, 냥이"
                    className="mt-1.5 rounded-xl"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">펫 종류</Label>
                  <div className="grid grid-cols-4 gap-2 mt-1.5">
                    {PET_TYPES.map((p) => (
                      <button
                        key={p.type}
                        onClick={() => setPetTypeCreate(p.type)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                          petTypeCreate === p.type ? "border-primary bg-primary/5" : "border-border/50"
                        }`}
                      >
                        <span className="text-2xl">{p.emoji}</span>
                        <span className="text-[10px] text-muted-foreground">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() => createPet.mutate({ name: petName, type: petTypeCreate })}
                  disabled={!petName.trim() || createPet.isPending}
                  className="w-full rounded-xl"
                >
                  {createPet.isPending ? "생성 중..." : "펫 만들기"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  const petType = PET_TYPES.find((p) => p.type === pet.type) ?? PET_TYPES[0];
  const stage = getStage(pet.level);
  const expToNext = (pet.level) * 50;
  const expProgress = (pet.exp % 50) / 50 * 100;

  const handleSaveSettings = () => {
    if (!newName.trim()) return;
    updateName.mutate({ name: newName, type: newType });
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">우리 {petType.label}</h1>
          <p className="text-xs text-muted-foreground">{stage.label} 단계 {stage.suffix}</p>
        </div>
        <button
          onClick={() => { setNewName(pet.name); setNewType(pet.type); setSettingsOpen(true); }}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <Settings size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* Pet Display */}
      <div className="mx-6 mb-6">
        <div className="bg-card rounded-3xl p-8 border border-border/50 text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-secondary/30" />
          <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full bg-accent/20" />

          {/* Pet emoji */}
          <div className="relative">
            <div className="text-8xl mb-2 animate-float inline-block">{petType.emoji}</div>
            <p className="font-bold text-lg text-foreground">{pet.name}</p>
            <p className="text-xs text-muted-foreground">Lv.{pet.level}</p>
          </div>

          {/* EXP bar */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>경험치</span>
              <span>{pet.exp % 50} / 50</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700"
                style={{ width: `${expProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="mx-6 mb-6 bg-card rounded-2xl p-4 border border-border/50 space-y-3">
        <h3 className="text-sm font-semibold">상태</h3>
        <StatusBar value={pet.hunger} color="#6B9FE4" label="🍖 배고픔" />
        <StatusBar value={pet.happiness} color="#F4A7B9" label="💕 행복도" />
      </div>

      {/* Actions */}
      <div className="mx-6 grid grid-cols-2 gap-3 mb-6">
        <Button
          onClick={() => feed.mutate()}
          disabled={feed.isPending || pet.hunger >= 100}
          variant="outline"
          className="rounded-2xl py-6 flex-col gap-2 h-auto border-border/50 hover:border-primary/40 hover:bg-primary/5"
        >
          <Utensils size={24} className="text-primary" />
          <span className="text-sm font-medium">밥 주기</span>
          {pet.hunger >= 100 && <span className="text-xs text-muted-foreground">배불러요!</span>}
        </Button>
        <Button
          onClick={() => play.mutate()}
          disabled={play.isPending || pet.happiness >= 100}
          variant="outline"
          className="rounded-2xl py-6 flex-col gap-2 h-auto border-border/50 hover:border-secondary/60 hover:bg-secondary/20"
        >
          <Gamepad2 size={24} className="text-pink-400" />
          <span className="text-sm font-medium">놀아주기</span>
          {pet.happiness >= 100 && <span className="text-xs text-muted-foreground">신나요!</span>}
        </Button>
      </div>

      {/* Info */}
      <div className="mx-6 bg-muted/50 rounded-2xl p-4 text-xs text-muted-foreground space-y-1">
        <p>🍖 밥 주기: 배고픔 +20, 경험치 +5</p>
        <p>🎮 놀아주기: 행복도 +15, 경험치 +3</p>
        <p>⭐ 경험치 50 달성 시 레벨업!</p>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>펫 설정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-medium">펫 이름</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="이름 입력"
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">펫 종류</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {PET_TYPES.map((p) => (
                  <button
                    key={p.type}
                    onClick={() => setNewType(p.type)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                      newType === p.type ? "border-primary bg-primary/5" : "border-border/50"
                    }`}
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <span className="text-[10px] text-muted-foreground">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={!newName.trim() || updateName.isPending}
              className="w-full rounded-xl"
            >
              저장하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
