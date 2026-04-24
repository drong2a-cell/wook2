import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Upload, X, Sparkles, ChevronLeft, Grid, Image } from "lucide-react";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Album() {
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [albumTitle, setAlbumTitle] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"albums" | "shared">("albums");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: albums, refetch: refetchAlbums } = trpc.album.getAlbums.useQuery();
  const { data: photos, refetch: refetchPhotos } = trpc.album.getPhotos.useQuery(
    { albumId: selectedAlbumId! },
    { enabled: !!selectedAlbumId }
  );
  const { data: allPhotos } = trpc.album.getAllPhotos.useQuery();
  
  const createAlbum = trpc.album.createAlbum.useMutation({
    onSuccess: () => { refetchAlbums(); setCreateAlbumOpen(false); setAlbumTitle(""); toast.success("앨범이 생성되었습니다!"); },
    onError: (e) => toast.error(e.message),
  });
  const uploadPhoto = trpc.album.uploadPhoto.useMutation({
    onSuccess: (data) => {
      refetchPhotos();
      toast.success(data.aiCaption ? "사진과 AI 캡션이 추가되었습니다! ✨" : "사진이 추가되었습니다!");
    },
    onError: (e) => toast.error("업로드 실패: " + e.message),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !selectedAlbumId) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: 10MB 이하만 업로드 가능합니다.`);
          continue;
        }
        const base64 = await fileToBase64(file);
        await uploadPhoto.mutateAsync({ albumId: selectedAlbumId, base64, mimeType: file.type });
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const selectedAlbum = albums?.find((a) => a.id === selectedAlbumId);

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Tabs */}
      {!selectedAlbumId && (
        <div className="px-6 pt-6 pb-2 flex gap-2 border-b border-border/50">
          <button
            onClick={() => setActiveTab("albums")}
            className={`px-4 py-2 rounded-t-xl font-medium text-sm transition-colors ${
              activeTab === "albums"
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            내 앨범
          </button>
          <button
            onClick={() => setActiveTab("shared")}
            className={`px-4 py-2 rounded-t-xl font-medium text-sm transition-colors ${
              activeTab === "shared"
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            공유 갤러리
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        {selectedAlbumId ? (
          <>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedAlbumId(null)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <ChevronLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold">{selectedAlbum?.title}</h1>
                <p className="text-xs text-muted-foreground">{photos?.length ?? 0}장의 사진</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                size="sm"
                className="rounded-xl gap-1.5"
              >
                {uploading ? (
                  <><Sparkles size={14} className="animate-spin" />AI 분석 중...</>
                ) : (
                  <><Upload size={14} />사진 추가</>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-bold">{activeTab === "albums" ? "추억 앨범" : "공유 갤러리"}</h1>
              <p className="text-xs text-muted-foreground">
                {activeTab === "albums" ? "AI가 감성 캡션을 자동 작성해요 ✨" : "함께 만드는 추억들"}
              </p>
            </div>
            {activeTab === "albums" && (
              <Button onClick={() => setCreateAlbumOpen(true)} size="sm" className="rounded-xl gap-1.5">
                <Plus size={14} />
                앨범 만들기
              </Button>
            )}
          </>
        )}
      </div>

      {/* Album List */}
      {!selectedAlbumId && activeTab === "albums" && (
        <div className="px-6">
          {!albums?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <Image size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">아직 앨범이 없어요</p>
              <p className="text-xs mt-1">첫 번째 앨범을 만들어보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => setSelectedAlbumId(album.id)}
                  className="bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/40 transition-all active:scale-95 text-left"
                >
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {album.coverUrl ? (
                      <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                    ) : (
                      <Grid size={32} className="text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm truncate">{album.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(album.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shared Gallery */}
      {!selectedAlbumId && activeTab === "shared" && (
        <div className="px-4">
          {!allPhotos?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <Image size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">아직 공유 사진이 없어요</p>
              <p className="text-xs mt-1">앨범에 사진을 추가하면 여기 나타나요</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 py-4">
              {allPhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="aspect-square rounded-xl overflow-hidden bg-muted active:scale-95 transition-transform"
                >
                  <img src={photo.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Photo Grid */}
      {selectedAlbumId && (
        <div className="px-4">
          {!photos?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <Upload size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">사진을 추가해보세요</p>
              <p className="text-xs mt-1">AI가 감성 캡션을 자동으로 작성해드려요</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="aspect-square rounded-xl overflow-hidden bg-muted active:scale-95 transition-transform"
                >
                  <img src={photo.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Album Dialog */}
      <Dialog open={createAlbumOpen} onOpenChange={setCreateAlbumOpen}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>새 앨범 만들기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-medium">앨범 이름</Label>
              <Input
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                placeholder="우리의 첫 여행"
                className="mt-1.5 rounded-xl"
              />
            </div>
            <Button
              onClick={() => createAlbum.mutate({ title: albumTitle })}
              disabled={!albumTitle.trim() || createAlbum.isPending}
              className="w-full rounded-xl"
            >
              만들기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto p-0 overflow-hidden">
          {selectedPhoto && (
            <>
              <img src={selectedPhoto.imageUrl} alt="" className="w-full object-cover max-h-80" loading="lazy" />
              <div className="p-4 space-y-2">
                {selectedPhoto.aiCaption && (
                  <div className="flex gap-2 items-start">
                    <Sparkles size={14} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed italic">
                      "{selectedPhoto.aiCaption}"
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedPhoto.createdAt).toLocaleDateString("ko-KR", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
