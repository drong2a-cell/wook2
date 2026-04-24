import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin, Navigation, RefreshCw } from "lucide-react";
import { MapView } from "@/components/Map";

export default function LocationShare() {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  const { data: locations, refetch } = trpc.location.getLocations.useQuery(undefined, {
    refetchInterval: sharing ? 5000 : false,
  });
  const updateLocation = trpc.location.update.useMutation({
    onError: (e) => toast.error("위치 업데이트 실패: " + e.message),
  });

  const shareMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("이 브라우저는 위치 공유를 지원하지 않습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await updateLocation.mutateAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        refetch();
        toast.success("위치가 공유되었습니다!");
      },
      () => toast.error("위치 정보를 가져올 수 없습니다.")
    );
  }, [updateLocation, refetch]);

  // Auto-share when enabled
  useEffect(() => {
    if (!sharing) return;
    shareMyLocation();
    const interval = setInterval(shareMyLocation, 30000);
    return () => clearInterval(interval);
  }, [sharing, shareMyLocation]);

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
              <circle cx="20" cy="20" r="18" fill="${isMe ? "#6B9FE4" : "#F4A7B9"}" stroke="white" stroke-width="3"/>
              <text x="20" y="26" text-anchor="middle" font-size="16">${isMe ? "👤" : "💕"}</text>
              <path d="M20 38 L14 28 L26 28 Z" fill="${isMe ? "#6B9FE4" : "#F4A7B9"}"/>
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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 bg-card border-b border-border/50">
        <h1 className="text-xl font-bold">위치 공유</h1>
        <p className="text-xs text-muted-foreground mt-0.5">실시간으로 서로의 위치를 확인하세요</p>
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
                <div key={loc.userId} className="bg-card/95 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isMe ? "bg-primary/20" : "bg-secondary"}`}>
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
          <Button
            onClick={() => setSharing(!sharing)}
            variant={sharing ? "default" : "outline"}
            className="flex-1 rounded-xl gap-2"
          >
            <Navigation size={16} className={sharing ? "animate-pulse" : ""} />
            {sharing ? "공유 중..." : "내 위치 공유"}
          </Button>
          <Button
            onClick={() => { shareMyLocation(); refetch(); }}
            variant="outline"
            size="icon"
            className="rounded-xl"
            disabled={updateLocation.isPending}
          >
            <RefreshCw size={16} className={updateLocation.isPending ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>
    </div>
  );
}
