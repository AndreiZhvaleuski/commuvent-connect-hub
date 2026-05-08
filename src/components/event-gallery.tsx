import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FlagIcon as Flag,
  ImageSquareIcon as ImagePlus,
  SpinnerIcon as Loader2,
  TrashIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { Label } from "@/components/ui/label";
import { ListPagination } from "@/components/list-pagination";
import { ConfirmDialog } from "@/components/confirm-dialog";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

type Photo = { id: string; storage_path: string; user_id: string; status: string; created_at: string };

const PUBLIC_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/gallery/`;
const PAGE_SIZE = 12;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic";
const MAX_BYTES = 5 * 1024 * 1024;

export function EventGallery({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [deleteFor, setDeleteFor] = useState<Photo | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, loading, refetch } = useAsyncResource<{ photos: Photo[]; total: number }>(
    async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: rows, count } = await supabase
        .from("gallery_photos")
        .select("id,storage_path,user_id,status,created_at", { count: "exact" })
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .range(from, to);
      return { photos: (rows ?? []) as Photo[], total: count ?? 0 };
    },
    [eventId, user?.id, page],
    { keepPreviousData: true }
  );

  const photos = data?.photos ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const lightboxImages = useMemo(
    () => photos.map((p) => ({ src: PUBLIC_BASE + p.storage_path, alt: "Event photo" })),
    [photos]
  );

  const onPick = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > MAX_BYTES) { toast.error("Max 5 MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${eventId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("gallery_photos").insert({
        event_id: eventId, user_id: user.id, storage_path: path,
      });
      if (insErr) {
        // Roll back the storage object since the row was rejected (e.g. pending cap).
        await supabase.storage.from("gallery").remove([path]);
        throw insErr;
      }
      toast.success("Photo uploaded — pending host approval");
      if (page !== 1) setPage(1);
      else refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submitReport = async () => {
    if (!user || !reportFor) return;
    if (reason.trim().length < 5) { toast.error("Please describe the issue"); return; }
    const { error } = await supabase.from("reports").insert({
      target_type: "photo", target_id: reportFor, reason: reason.trim(), reporter_id: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Report submitted");
    setReportFor(null); setReason("");
  };

  const confirmDelete = async () => {
    if (!deleteFor) return;
    const { error } = await supabase.from("gallery_photos").delete().eq("id", deleteFor.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Photo deleted");
    setDeleteFor(null);
    refetch();
  };

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Gallery</CardTitle>
        {user ? (
          <>
            <input ref={fileRef} type="file" accept={ACCEPT} onChange={onFile} className="hidden" />
            <Button size="sm" variant="outline" onClick={onPick} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
              Add photo
            </Button>
          </>
        ) : (
          <Button render={<Link to="/sign-in" />} size="sm" variant="outline">Sign in to upload</Button>
        )}
      </CardHeader>
      <CardContent>
        {user && (
          <p className="mb-3 text-xs text-muted-foreground">
            Up to 5 pending uploads per event · max 5 MB · JPG, PNG, WebP, GIF, HEIC
          </p>
        )}
        {loading && photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : photos.length === 0 ? (
          <EmptyState title="No photos yet" description="Be the first to share!" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((p, i) => {
                const isOwner = user?.id === p.user_id;
                const canDelete = isOwner && p.status === "pending";
                return (
                  <div key={p.id} className="group relative overflow-hidden rounded-lg border bg-muted">
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(i)}
                      className="block w-full"
                      aria-label="Open photo"
                    >
                      <img
                        src={PUBLIC_BASE + p.storage_path}
                        alt="Event photo"
                        loading="lazy"
                        className="aspect-square w-full object-cover transition group-hover:scale-[1.02]"
                      />
                    </button>
                    {p.status !== "approved" && (
                      <div className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                        {p.status}
                      </div>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleteFor(p)}
                        className="absolute right-1 top-1 rounded bg-background/90 p-1 opacity-0 transition group-hover:opacity-100"
                        aria-label="Delete pending photo"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {user && !isOwner && (
                      <button
                        type="button"
                        onClick={() => setReportFor(p.id)}
                        className="absolute right-1 top-1 rounded bg-background/90 p-1 opacity-0 transition group-hover:opacity-100"
                        aria-label="Report photo"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </CardContent>

      <Dialog open={!!reportFor} onOpenChange={(o) => !o && setReportFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this photo</DialogTitle>
            <DialogDescription>The host will review your report.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="photo-reason">Reason</Label>
            <Textarea id="photo-reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportFor(null)}>Cancel</Button>
            <Button onClick={submitReport}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteFor}
        onOpenChange={(o) => !o && setDeleteFor(null)}
        title="Delete this pending upload?"
        description="This frees up one of your 5 pending slots for this event."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />

      <Lightbox
        open={lightboxIndex !== null}
        index={lightboxIndex ?? 0}
        close={() => setLightboxIndex(null)}
        slides={lightboxImages}
        plugins={[Zoom, Counter]}
        on={{ view: ({ index }) => setLightboxIndex(index) }}
        zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
      />
    </Card>
  );
}
