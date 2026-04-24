import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Heart, Calendar } from "lucide-react";

function getDayCount(date: Date): number {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export default function Home() {
  const { user } = useAuth();
  const { data: pairData } = trpc.pairing.getMyPair.useQuery();
  const { data: ddays, refetch } = trpc.dday.list.useQuery(undefined, { enabled: !!pairData });
  const createDday = trpc.dday.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("디데이가 추가되었습니다!"); } });
  const deleteDday = trpc.dday.delete.useMutation({ onSuccess: () => refetch() });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [isMain, setIsMain] = useState(false);

  const mainDday = ddays?.find((d) => d.isMain);
  const otherDdays = ddays?.filter((d) => !d.isMain) ?? [];

  const handleCreate = () => {
    if (!title || !date) return;
    createDday.mutate({ title, date, isMain });
    setTitle("");
    setDate("");
    setIsMain(false);
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <p className="text-sm text-muted-foreground font-medium">안녕하세요,</p>
        <h1 className="text-2xl font-bold text-foreground mt-0.5">
          {user?.name?.split(" ")[0] ?? "우리"} 님 💕
        </h1>
      </div>

      {/* Main D-Day Card */}
      <div className="px-6 mb-6">
        {mainDday ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-400 to-purple-400 p-6 text-white shadow-lg">
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663593499995/MYgf7aAUaRdMt38uh3hMxS/dday-icon-98qLWRuZxBUunXJGi2YhQ7.webp"
                  alt="디데이"
                  className="w-6 h-6"
                />
                <span className="text-sm font-medium text-white/90">{mainDday.title}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black">D+{getDayCount(new Date(mainDday.date))}</span>
              </div>
              <p className="text-white/70 text-sm mt-2">{formatDate(new Date(mainDday.date))}부터</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setIsMain(true); setOpen(true); }}
            className="w-full rounded-3xl border-2 border-dashed border-primary/30 p-8 text-center hover:border-primary/60 transition-colors group"
          >
            <Heart size={32} className="mx-auto mb-3 text-primary/40 group-hover:text-primary/60 transition-colors" />
            <p className="text-sm font-medium text-muted-foreground">메인 디데이를 설정해보세요</p>
            <p className="text-xs text-muted-foreground/60 mt-1">처음 만난 날, 사귄 날...</p>
          </button>
        )}
      </div>

      {/* Partner Info */}
      {pairData?.partner && (
        <div className="px-6 mb-6">
          <div className="bg-card rounded-2xl p-4 border border-border/50 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl">
              💑
            </div>
            <div>
              <p className="text-xs text-muted-foreground">함께하는 사람</p>
              <p className="font-semibold text-foreground">{pairData.partner.name}</p>
            </div>
            <div className="ml-auto">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Other D-Days */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">기념일 목록</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setIsMain(false); setOpen(true); }}
            className="text-primary hover:text-primary/80 gap-1"
          >
            <Plus size={16} />
            추가
          </Button>
        </div>

        {otherDdays.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground/60">
            <Calendar size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">기념일을 추가해보세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {otherDdays.map((d) => (
              <div key={d.id} className="bg-card rounded-2xl p-4 border border-border/50 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-foreground">{d.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(new Date(d.date))}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-primary font-bold text-sm">D+{getDayCount(new Date(d.date))}</span>
                  <button
                    onClick={() => deleteDday.mutate({ id: d.id })}
                    className="text-muted-foreground/40 hover:text-destructive transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add D-Day Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>디데이 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="title" className="text-sm font-medium">제목</Label>
              <Input
                id="title"
                placeholder="처음 만난 날"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="date" className="text-sm font-medium">날짜</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isMain"
                checked={isMain}
                onChange={(e) => setIsMain(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isMain" className="text-sm cursor-pointer">메인 디데이로 설정</Label>
            </div>
            <Button
              onClick={handleCreate}
              disabled={!title || !date || createDday.isPending}
              className="w-full rounded-xl"
            >
              {createDday.isPending ? "추가 중..." : "추가하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
