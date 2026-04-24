import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Heart, Home as HomeIcon, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const FURNITURE = [
  { id: "sofa", name: "소파", emoji: "🛋️", price: 100 },
  { id: "bed", name: "침대", emoji: "🛏️", price: 150 },
  { id: "table", name: "테이블", emoji: "🪑", price: 50 },
  { id: "lamp", name: "조명", emoji: "💡", price: 30 },
  { id: "plant", name: "식물", emoji: "🌿", price: 40 },
  { id: "painting", name: "그림", emoji: "🖼️", price: 60 },
];

const PETS = [
  { id: "cat", name: "고양이", emoji: "🐱" },
  { id: "dog", name: "강아지", emoji: "🐶" },
  { id: "rabbit", name: "토끼", emoji: "🐰" },
  { id: "hamster", name: "햄스터", emoji: "🐹" },
];

export default function HomePet() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"housing" | "pet">("housing");
  const [furnitureOpen, setFurnitureOpen] = useState(false);
  const [petOpen, setPetOpen] = useState(false);

  const { data: housing, refetch: refetchHousing } = trpc.housing.getState.useQuery();
  const { data: pet, refetch: refetchPet } = trpc.pet.get.useQuery();
  
  const saveHousing = trpc.housing.saveState.useMutation({
    onSuccess: () => { refetchHousing(); setFurnitureOpen(false); toast.success("가구가 추가되었습니다!"); },
  });
  const updateWallColor = trpc.housing.saveState.useMutation({
    onSuccess: () => { refetchHousing(); toast.success("벽 색상이 변경되었습니다!"); },
  });
  const feedPet = trpc.pet.feed.useMutation({
    onSuccess: () => { refetchPet(); toast.success("먹이를 주었습니다! 🍖"); },
    onError: (e) => toast.error(e.message),
  });
  const playWithPet = trpc.pet.play.useMutation({
    onSuccess: () => { refetchPet(); toast.success("함께 놀았습니다! 🎮"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-12 pb-4">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          우리의 공간 ✨
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 px-6 mb-6">
        <button
          onClick={() => setTab("housing")}
          className={`flex-1 py-3 rounded-xl font-medium transition-all ${
            tab === "housing"
              ? "bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-lg"
              : "bg-card border border-border/50 text-muted-foreground"
          }`}
        >
          <HomeIcon size={16} className="inline mr-2" />
          하우징
        </button>
        <button
          onClick={() => setTab("pet")}
          className={`flex-1 py-3 rounded-xl font-medium transition-all ${
            tab === "pet"
              ? "bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-lg"
              : "bg-card border border-border/50 text-muted-foreground"
          }`}
        >
          <Heart size={16} className="inline mr-2" />
          펫
        </button>
      </div>

      {/* Housing Tab */}
      {tab === "housing" && (
        <div className="px-6 space-y-4">
          {/* Room Preview */}
          <div
            className="rounded-2xl p-8 min-h-64 border-2 border-border/50 relative overflow-hidden"
            style={{
              backgroundColor: housing?.wallColor || "#FFF5F7",
            }}
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 right-4 text-4xl">✨</div>
              <div className="absolute bottom-4 left-4 text-3xl">💕</div>
            </div>
            
            {/* Furniture Grid */}
            <div className="relative grid grid-cols-3 gap-4 h-full">
              {housing?.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-center text-4xl bg-white/50 rounded-lg hover:bg-white/70 transition-colors cursor-pointer"
                >
                  {item.emoji}
                </div>
              ))}
              
              {/* Empty slots */}
              {Array.from({ length: Math.max(0, 6 - (housing?.items?.length || 0)) }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="flex items-center justify-center text-2xl bg-white/30 rounded-lg"
                >
                  ·
                </div>
              ))}
            </div>
          </div>

          {/* Wall Color Picker */}
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <p className="text-sm font-medium mb-3">벽 색상</p>
            <div className="flex gap-2 flex-wrap">
              {["#FFF5F7", "#F3E8FF", "#FCE7F3", "#E0E7FF", "#F0F9FF"].map((color) => (
                  <button
                    key={color}
                    onClick={() => updateWallColor.mutate({ items: housing?.items || [], wallColor: color, floorColor: housing?.floorColor })}
                  className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: housing?.wallColor === color ? "#EC4899" : "#E5E7EB",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Add Furniture Button */}
          <Button
            onClick={() => setFurnitureOpen(true)}
            className="w-full bg-gradient-to-r from-pink-400 to-rose-400 text-white hover:shadow-lg transition-all"
          >
            <Plus size={16} className="mr-2" />
            가구 추가하기
          </Button>

          {/* Furniture Selection Dialog */}
          <Dialog open={furnitureOpen} onOpenChange={setFurnitureOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>가구 선택</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                {FURNITURE.map((furn) => (
                  <button
                    key={furn.id}
                    onClick={() => {
                      const newItems = [...(housing?.items || []), { id: furn.id, type: furn.id, emoji: furn.emoji, label: furn.name, x: 0, y: 0, rotation: 0, scale: 1 }];
                      saveHousing.mutate({ items: newItems, wallColor: housing?.wallColor, floorColor: housing?.floorColor });
                    }}
                    className="p-4 rounded-xl bg-card border border-border/50 hover:border-pink-400 hover:bg-pink-50 transition-all text-center"
                  >
                    <div className="text-3xl mb-2">{furn.emoji}</div>
                    <p className="text-sm font-medium">{furn.name}</p>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Pet Tab */}
      {tab === "pet" && (
        <div className="px-6 space-y-4">
          {pet ? (
            <>
              {/* Pet Display */}
              <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl p-8 text-center">
                <div className="text-7xl mb-4">{PETS.find(p => p.id === pet.type)?.emoji || "🐱"}</div>
                <h2 className="text-2xl font-bold mb-2">{pet.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">레벨 {pet.level}</p>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-white/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">배고픔</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-red-400 h-2 rounded-full transition-all"
                        style={{ width: `${pet.hunger}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">행복도</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{ width: `${pet.happiness}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">행복도</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-green-400 h-2 rounded-full transition-all"
                        style={{ width: `${pet.happiness}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => feedPet.mutate(undefined)}
                    disabled={feedPet.isPending}
                    className="flex-1 bg-orange-400 text-white hover:bg-orange-500"
                  >
                    🍖 먹이주기
                  </Button>
                  <Button
                    onClick={() => playWithPet.mutate(undefined)}
                    disabled={playWithPet.isPending}
                    className="flex-1 bg-blue-400 text-white hover:bg-blue-500"
                  >
                    🎮 놀아주기
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Pet Selection */}
              <p className="text-center text-muted-foreground mb-4">함께할 펫을 선택해주세요!</p>
              <div className="grid grid-cols-2 gap-3">
                {PETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      // Create pet mutation would go here
                    }}
                    className="p-6 rounded-xl bg-card border border-border/50 hover:border-pink-400 hover:bg-pink-50 transition-all text-center"
                  >
                    <div className="text-5xl mb-2">{p.emoji}</div>
                    <p className="font-medium">{p.name}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
