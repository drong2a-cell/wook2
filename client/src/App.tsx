import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { getLoginUrl } from "./const";
import Home from "./pages/Home";
import Pairing from "./pages/Pairing";
import Chat from "./pages/Chat";
import LocationShare from "./pages/LocationShare";
import Housing from "./pages/Housing";
import Pet from "./pages/Pet";
import Album from "./pages/Album";
import Anniversary from "./pages/Anniversary";
import Profile from "./pages/Profile";
import BottomNav from "./components/BottomNav";
import { trpc } from "./lib/trpc";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const { data: pairData, isLoading: pairLoading } = trpc.pairing.getMyPair.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading || (isAuthenticated && pairLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 animate-pulse mx-auto" />
          <p className="text-muted-foreground text-sm">잠시만 기다려 주세요...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-background to-purple-50 px-6">
        <div className="text-center space-y-8 max-w-sm w-full">
          <div className="relative h-48 flex items-center justify-center">
            <div className="absolute w-40 h-40 rounded-full bg-pink-200/40 blur-3xl -top-4 -left-8 animate-pulse" />
            <div className="absolute w-32 h-32 rounded-full bg-purple-200/30 blur-3xl -bottom-4 -right-8 animate-pulse" />
            <div className="relative space-y-3">
              <span className="text-7xl block animate-bounce">💕</span>
              <span className="text-5xl block">✨</span>
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">우리만의 공간</h1>
            <p className="text-muted-foreground text-sm leading-relaxed font-medium">
              두 사람만을 위한<br />특별한 커플 전용 앱 💑
            </p>
          </div>
          <a
            href={getLoginUrl()}
            className="block w-full py-4 px-6 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-2xl font-bold text-center hover:shadow-lg hover:scale-105 transition-all shadow-md"
          >
            ✨ Google로 시작하기
          </a>
          <p className="text-xs text-muted-foreground">
            로그인 후 초대 코드로 커플 연결이 가능합니다 💌
          </p>
        </div>
      </div>
    );
  }

  if (!pairData) {
    return <Pairing />;
  }

  return <>{children}</>;
}

function AppLayout() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/chat" component={Chat} />
          <Route path="/location" component={LocationShare} />
          <Route path="/housing" component={Housing} />
          <Route path="/pet" component={Pet} />
          <Route path="/album" component={Album} />
          <Route path="/anniversary" component={Anniversary} />
          <Route path="/profile" component={Profile} />
          <Route component={NotFound} />
        </Switch>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppLayout />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
