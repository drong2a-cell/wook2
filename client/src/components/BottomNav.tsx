import { useLocation } from "wouter";
import { Home, MessageCircle, MapPin, Home as HouseIcon, Heart, Image, Calendar, User } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "홈" },
  { path: "/chat", icon: MessageCircle, label: "채팅" },
  { path: "/location", icon: MapPin, label: "위치" },
  { path: "/housing", icon: HouseIcon, label: "하우스" },
  { path: "/pet", icon: Heart, label: "펫" },
  { path: "/album", icon: Image, label: "앨범" },
  { path: "/anniversary", icon: Calendar, label: "기념일" },
  { path: "/profile", icon: User, label: "프로필" },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around px-1 h-16 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? "bg-primary/10" : ""
                }`}
              >
                <Icon
                  size={isActive ? 22 : 20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span className={`text-[9px] font-medium ${isActive ? "font-semibold" : ""}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
