import { useLocation } from "wouter";
import { Home, MapPin, Sofa, Image, Calendar, User, MessageCircle, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/", icon: Home, label: "홈" },
  { path: "/location", icon: MapPin, label: "위치" },
  { path: "/home-pet", icon: Sofa, label: "공간" },
  { path: "/album", icon: Image, label: "앨범" },
  { path: "/anniversary", icon: Calendar, label: "기념일" },
  { path: "/profile", icon: User, label: "프로필" },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      {/* Chat Popup */}
      {chatOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-80 h-96 bg-card rounded-2xl border border-border/50 shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white">
            <h3 className="font-semibold text-sm">💬 우리 채팅방</h3>
            <button
              onClick={() => setChatOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <iframe
            src="/chat"
            className="flex-1 border-none"
          />
        </div>
      )}

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/50"
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
                    ? "text-pink-500"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive ? "bg-pink-100" : ""
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

          {/* Chat Popup Button */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
              chatOpen
                ? "text-pink-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                chatOpen ? "bg-pink-100" : ""
              }`}
            >
              <MessageCircle
                size={chatOpen ? 22 : 20}
                strokeWidth={chatOpen ? 2.5 : 1.8}
              />
            </div>
            <span className={`text-[9px] font-medium ${chatOpen ? "font-semibold" : ""}`}>
              채팅
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
