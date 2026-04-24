import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Plus, Trash2, RotateCw } from "lucide-react";
import { nanoid } from "nanoid";

type HousingItem = {
  id: string;
  type: string;
  emoji: string;
  label: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
};

const FURNITURE_CATALOG = [
  { type: "sofa", emoji: "🛋️", label: "소파" },
  { type: "bed", emoji: "🛏️", label: "침대" },
  { type: "table", emoji: "🪑", label: "의자" },
  { type: "plant", emoji: "🪴", label: "식물" },
  { type: "tv", emoji: "📺", label: "TV" },
  { type: "lamp", emoji: "🪔", label: "조명" },
  { type: "bookshelf", emoji: "📚", label: "책장" },
  { type: "rug", emoji: "🟫", label: "러그" },
  { type: "cat", emoji: "🐱", label: "고양이" },
  { type: "dog", emoji: "🐶", label: "강아지" },
  { type: "flower", emoji: "🌸", label: "꽃" },
  { type: "coffee", emoji: "☕", label: "커피" },
  { type: "heart", emoji: "💕", label: "하트" },
  { type: "star", emoji: "⭐", label: "별" },
  { type: "moon", emoji: "🌙", label: "달" },
  { type: "rainbow", emoji: "🌈", label: "무지개" },
];

const WALL_COLORS = ["#F5F5F0", "#E8F4F8", "#FFF0F3", "#F0F4E8", "#F4F0FF", "#FFF8E8"];
const FLOOR_COLORS = ["#E8E4DC", "#D4E8F0", "#F0D4DC", "#D4E8D4", "#E0D4F0", "#F0E8D4"];

export default function Housing() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragItem = useRef<{ id: string; startX: number; startY: number; itemX: number; itemY: number } | null>(null);

  const { data: state, refetch } = trpc.housing.getState.useQuery();
  const saveState = trpc.housing.saveState.useMutation({
    onSuccess: () => toast.success("저장되었습니다!"),
    onError: (e) => toast.error(e.message),
  });

  const [items, setItems] = useState<HousingItem[]>([]);
  const [wallColor, setWallColor] = useState("#F5F5F0");
  const [floorColor, setFloorColor] = useState("#E8E4DC");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize from server state using useEffect to avoid render-phase setState
  useEffect(() => {
    if (state && !initialized) {
      setItems((state.items as HousingItem[]) ?? []);
      setWallColor(state.wallColor ?? "#F5F5F0");
      setFloorColor(state.floorColor ?? "#E8E4DC");
      setInitialized(true);
    }
  }, [state, initialized]);

  const addItem = (catalog: typeof FURNITURE_CATALOG[0]) => {
    const newItem: HousingItem = {
      id: nanoid(),
      ...catalog,
      x: 40 + Math.random() * 40,
      y: 30 + Math.random() * 30,
      rotation: 0,
      scale: 1,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
  };

  const rotateItem = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, rotation: (i.rotation + 45) % 360 } : i))
    );
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const item = items.find((i) => i.id === id);
    if (!item || !canvasRef.current) return;
    setSelectedId(id);
    const rect = canvasRef.current.getBoundingClientRect();
    dragItem.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      itemX: item.x,
      itemY: item.y,
    };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragItem.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragItem.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragItem.current.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(90, dragItem.current.itemX + dx));
      const newY = Math.max(0, Math.min(85, dragItem.current.itemY + dy));
      setItems((prev) =>
        prev.map((i) => (i.id === dragItem.current!.id ? { ...i, x: newX, y: newY } : i))
      );
    },
    []
  );

  const handleMouseUp = () => {
    dragItem.current = null;
  };

  const handleSave = () => {
    saveState.mutate({ items, wallColor, floorColor });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="px-6 pt-12 pb-3 bg-card border-b border-border/50 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">우리 집 꾸미기</h1>
          <p className="text-xs text-muted-foreground">아이템을 드래그해서 배치하세요</p>
        </div>
        <Button onClick={handleSave} disabled={saveState.isPending} size="sm" className="rounded-xl gap-1.5">
          <Save size={14} />
          저장
        </Button>
      </div>

      {/* Room Canvas */}
      <div
        ref={canvasRef}
        className="relative mx-4 mt-4 rounded-3xl overflow-hidden cursor-default select-none"
        style={{
          height: "42vh",
          background: `linear-gradient(180deg, ${wallColor} 60%, ${floorColor} 60%)`,
          boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.06)",
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setSelectedId(null)}
      >
        {/* Floor line */}
        <div
          className="absolute left-0 right-0 h-px bg-black/10"
          style={{ top: "60%" }}
        />
        {/* Items */}
        {items.map((item) => (
          <div
            key={item.id}
            className={`absolute cursor-grab active:cursor-grabbing transition-transform ${
              selectedId === item.id ? "ring-2 ring-primary ring-offset-1 rounded-lg" : ""
            }`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: `rotate(${item.rotation}deg) scale(${item.scale})`,
              fontSize: "2rem",
              lineHeight: 1,
              userSelect: "none",
            }}
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, item.id); }}
            onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
          >
            {item.emoji}
          </div>
        ))}

        {/* Selected item controls */}
        {selectedId && (
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); rotateItem(selectedId); }}
              className="w-8 h-8 bg-card/90 rounded-lg flex items-center justify-center shadow-sm hover:bg-card transition-colors"
            >
              <RotateCw size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); removeItem(selectedId); }}
              className="w-8 h-8 bg-destructive/90 rounded-lg flex items-center justify-center shadow-sm hover:bg-destructive transition-colors text-white"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Color Pickers */}
      <div className="px-4 py-3 flex gap-4">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">벽 색상</p>
          <div className="flex gap-1.5">
            {WALL_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setWallColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${wallColor === c ? "border-primary scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">바닥 색상</p>
          <div className="flex gap-1.5">
            {FLOOR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setFloorColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${floorColor === c ? "border-primary scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Furniture Catalog */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <p className="text-xs text-muted-foreground mb-2 font-medium">아이템 추가</p>
        <div className="grid grid-cols-4 gap-2">
          {FURNITURE_CATALOG.map((item) => (
            <button
              key={item.type}
              onClick={() => addItem(item)}
              className="bg-card rounded-2xl p-3 flex flex-col items-center gap-1 border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-95"
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
