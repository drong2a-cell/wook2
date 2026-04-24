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
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-8 max-w-sm w-full">
          {/* Decorative circles */}
          <div className="relative h-40 flex items-center justify-center">
            <div className="absolute w-32 h-32 rounded-full bg-secondary/50 -top-2 -left-4" />
            <div className="absolute w-24 h-24 rounded-full bg-accent/40 -bottom-2 -right-4" />
            <span className="relative text-6xl animate-float">💕</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">우리만의 공간</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              두 사람만을 위한<br />특별한 커플 전용 앱
            </p>
          </div>
          <a
            href={getLoginUrl()}
            className="block w-full py-3.5 px-6 bg-primary text-primary-foreground rounded-2xl font-semibold text-center hover:opacity-90 transition-opacity shadow-sm"
          >
            Google로 시작하기
          </a>
          <p className="text-xs text-muted-foreground">
            로그인 후 초대 코드로 커플 연결이 가능합니다
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
