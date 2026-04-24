import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Calendar, Bell, Trash2, Gift } from "lucide-react";

function getDaysUntil(date: Date): number {
  const target = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  // For yearly repeating, find next occurrence
  if (target < today) {
    target.setFullYear(today.getFullYear() + 1);
  }
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export default function Anniversary() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [repeatYearly, setRepeatYearly] = useState(true);

  const { data: anniversaries, refetch } = trpc.anniversary.list.useQuery();
  const create = trpc.anniversary.create.useMutation({
    onSuccess: () => { refetch(); setOpen(false); setTitle(""); setDate(""); toast.success("기념일이 등록되었습니다! 🎉"); },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.anniversary.delete.useMutation({ onSuccess: () => refetch() });

  const upcoming = anniversaries?.filter((a) => getDaysUntil(new Date(a.date)) >= 0)
    .sort((a, b) => getDaysUntil(new Date(a.date)) - getDaysUntil(new Date(b.date)));

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">기념일</h1>
          <p className="text-xs text-muted-foreground">특별한 날을 잊지 마세요 🎁</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="rounded-xl gap-1.5">
          <Plus size={14} />
          추가
        </Button>
      </div>

      {/* Upcoming highlight */}
      {upcoming && upcoming.length > 0 && (
        <div className="px-6 mb-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary to-pink-200 p-5">
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/20" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Gift size={16} className="text-pink-600" />
                <span className="text-xs font-medium text-pink-700">다가오는 기념일</span>
              </div>
              <p className="text-lg font-bold text-foreground">{upcoming[0].title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{formatDate(new Date(upcoming[0].date))}</p>
              <div className="mt-3">
                {getDaysUntil(new Date(upcoming[0].date)) === 0 ? (
                  <span className="text-2xl font-black text-pink-600">오늘! 🎉</span>
                ) : (
                  <span className="text-2xl font-black text-pink-600">
                    D-{getDaysUntil(new Date(upcoming[0].date))}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="px-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">전체 기념일</h2>
        {!anniversaries?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">기념일을 등록해보세요</p>
            <p className="text-xs mt-1">자동으로 알림을 보내드려요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {anniversaries.map((ann) => {
              const daysUntil = getDaysUntil(new Date(ann.date));
              const isToday = daysUntil === 0;
              return (
                <div
                  key={ann.id}
                  className={`bg-card rounded-2xl p-4 border flex items-center justify-between ${
                    isToday ? "border-pink-200 bg-pink-50/50" : "border-border/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isToday ? "bg-pink-100" : "bg-muted"
                    }`}>
                      <Calendar size={18} className={isToday ? "text-pink-500" : "text-muted-foreground"} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{ann.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">{formatDate(new Date(ann.date))}</p>
                        {ann.repeatYearly && (
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                            매년
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isToday ? "text-pink-500" : "text-primary"}`}>
                      {isToday ? "오늘 🎉" : `D-${daysUntil}`}
                    </span>
                    <button
                      onClick={() => remove.mutate({ id: ann.id })}
                      className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>기념일 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-medium">기념일 이름</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="생일, 결혼기념일..."
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">날짜</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="repeatYearly"
                checked={repeatYearly}
                onChange={(e) => setRepeatYearly(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="repeatYearly" className="text-sm cursor-pointer">매년 반복</Label>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-xl p-3">
              <Bell size={14} />
              <span>해당 날짜에 자동으로 알림이 발송됩니다</span>
            </div>
            <Button
              onClick={() => create.mutate({ title, date, repeatYearly })}
              disabled={!title || !date || create.isPending}
              className="w-full rounded-xl"
            >
              등록하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
