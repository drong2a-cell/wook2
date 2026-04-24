import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Navigation, RefreshCw, Send } from "lucide-react";
import { MapView } from "@/components/Map";

export default function LocationShare() {
  const { user } = useAuth();
  const [mapReady, setMapReady] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const { data: locations, refetch } = trpc.location.getLocations.useQuery();
  const updateLocation = trpc.location.update.useMutation({
    onError: (e) => toast.error("위치 업데이트 실패: " + e.message),
  });

  // 위치 공유 요청 및 실시간 감시
  const requestAndWatchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("이 브라우저는 위치 공유를 지원하지 않습니다.");
      return;
    }

    // 초기 위치 공유
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await updateLocation.mutateAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          await refetch();
          toast.success("위치가 공유되었습니다! 💕");
          setRequestDialogOpen(false);
        } catch (e) {
          toast.error("위치 공유 실패");
        }
      },
      () => toast.error("위치 정보를 가져올 수 없습니다.")
    );

    // 실시간 위치 감시 시작
    if (!isWatching) {
      const id = navigator.geolocation.watchPosition(
        async (pos) => {
          try {
            await updateLocation.mutateAsync({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
            await refetch();
          } catch (e) {
            // 조용히 실패 처리
          }
        },
        () => {
          // 에러 무시
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
      setWatchId(id);
      setIsWatching(true);
      toast.success("실시간 위치 공유가 시작되었습니다 📍");
    }
  }, [isWatching, updateLocation, refetch]);

  // 위치 감시 중지
  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsWatching(false);
      toast.success("위치 공유가 중지되었습니다");
    }
  }, [watchId]);

  // Update map markers
  useEffect(() => {
    if (!mapInstance || !locations) return;
    markers.forEach((m) => m.setMap(null));
    const newMarkers: google.maps.Marker[] = [];
    const bounds = new google.maps.LatLngBounds();

    locations.forEach((loc) => {
      const isMe = loc.userId === user?.id;
      const marker = new google.maps.Marker({
        position: { lat: loc.latitude, lng: loc.longitude },
        map: mapInstance,
        title: isMe ? "나" : loc.user?.name ?? "상대방",
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="${isMe ? "#E879A8" : "#F4A7B9"}" stroke="white" stroke-width="3"/>
              <text x="20" y="26" text-anchor="middle" font-size="16">${isMe ? "👤" : "💕"}</text>
              <path d="M20 38 L14 28 L26 28 Z" fill="${isMe ? "#E879A8" : "#F4A7B9"}"/>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(40, 48),
          anchor: new google.maps.Point(20, 48),
        },
      });
      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:4px 8px;font-size:13px;font-weight:600">${isMe ? "나" : loc.user?.name ?? "상대방"}</div>`,
      });
      marker.addListener("click", () => infoWindow.open(mapInstance, marker));
      newMarkers.push(marker);
      bounds.extend({ lat: loc.latitude, lng: loc.longitude });
    });

    setMarkers(newMarkers);
    if (newMarkers.length > 0) {
      mapInstance.fitBounds(bounds);
      if (newMarkers.length === 1) mapInstance.setZoom(15);
    }
  }, [mapInstance, locations, user?.id]);

  const handleMapReady = (map: google.maps.Map) => {
    setMapInstance(map);
    setMapReady(true);
  };

  // 컴포넌트 언마운트 시 감시 중지
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 bg-card border-b border-border/50">
        <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">위치 공유</h1>
        <p className="text-xs text-muted-foreground mt-0.5">서로의 위치를 실시간으로 확인하세요 📍</p>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          onMapReady={handleMapReady}
          className="w-full h-full"
          initialCenter={{ lat: 37.5665, lng: 126.978 }}
          initialZoom={13}
        />

        {/* Location info overlay */}
        {locations && locations.length > 0 && (
          <div className="absolute bottom-24 left-4 right-4 space-y-2">
            {locations.map((loc) => {
              const isMe = loc.userId === user?.id;
              return (
                <div key={loc.userId} className="bg-card/95 backdrop-blur-sm rounded-2xl px-4 py-3 border border-pink-200/50 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isMe ? "bg-pink-100" : "bg-purple-100"}`}>
                    {isMe ? "👤" : "💕"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{isMe ? "나" : loc.user?.name ?? "상대방"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {loc.address ?? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(loc.updatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-4 bg-card border-t border-border/50 pb-20">
        <div className="flex gap-3 max-w-lg mx-auto">
          {!isWatching ? (
            <>
              <Button
                onClick={() => setRequestDialogOpen(true)}
                className="flex-1 rounded-xl gap-2 bg-gradient-to-r from-pink-400 to-rose-400 text-white hover:shadow-lg transition-all"
              >
                <Send size={16} />
                위치 공유하기
              </Button>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="rounded-xl gap-2"
              >
                <RefreshCw size={16} />
              </Button>
            </>
          ) : (
            <Button
              onClick={stopWatching}
              className="flex-1 rounded-xl gap-2 bg-gradient-to-r from-purple-400 to-pink-400 text-white hover:shadow-lg transition-all"
            >
              <Navigation size={16} className="animate-pulse" />
              공유 중... (중지)
            </Button>
          )}
        </div>
      </div>

      {/* Location Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              위치 공유
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center space-y-3">
              <MapPin size={48} className="mx-auto text-pink-400" />
              <p className="text-foreground font-medium">
                현재 위치를 상대방과 공유하시겠어요?
              </p>
              <p className="text-sm text-muted-foreground">
                위치는 실시간으로 업데이트되며, 언제든 중지할 수 있습니다.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setRequestDialogOpen(false)}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                취소
              </Button>
              <Button
                onClick={requestAndWatchLocation}
                className="flex-1 rounded-xl bg-gradient-to-r from-pink-400 to-rose-400 text-white hover:shadow-lg transition-all"
              >
                공유하기 ✨
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
