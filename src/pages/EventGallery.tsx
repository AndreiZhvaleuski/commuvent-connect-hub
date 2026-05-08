import { useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  FlagIcon as Flag,
  ImageSquareIcon as ImagePlus,
  SpinnerIcon as Loader2,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

import { SkeletonGrid } from "@/components/skeleton-grid";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageSpinner } from "@/components/page-spinner";
import { ErrorState } from "@/components/error-state";

type Photo = { id: string; storage_path: string; user_id: string; status: string; created_at: string };
type EventInfo = {
  id: string; title: string; start_at: string; end_at: string; time_zone: string;
  cover_image_url: string | null; host_id: string;
};

const PUBLIC_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/gallery/`;

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic";
const MAX_BYTES = 5 * 1024 * 1024;

type Filter = "published" | "mine" | "pending" | "review";

export default function EventGalleryPage() {
  const { eventId = "" } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const filter: Filter =
    filterParam === "mine" || filterParam === "pending" || filterParam === "review"
      ? filterParam
      : "published";
  const setFilter = (next: Filter) => {
    const sp = new URLSearchParams(searchParams);
    if (next === "published") sp.delete("filter");
    else sp.set("filter", next);
    sp.delete("page");
    setSearchParams(sp, { replace: true });
  };
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const setPage = (next: number) => {
    const sp = new URLSearchParams(searchParams);
    if (next <= 1) sp.delete("page");
    else sp.set("page", String(next));
    setSearchParams(sp, { replace: true });
  };
  const [uploading, setUploading] = useState(false);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [deleteFor, setDeleteFor] = useState<Photo | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [rejectFor, setRejectFor] = useState<Photo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: event, loading: evLoading, error: evError } = useAsyncResource<EventInfo | null>(
    async (signal) => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from("events")
        .select("id,title,start_at,end_at,time_zone,cover_image_url,host_id")
        .eq("id", eventId)
        .abortSignal(signal)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as EventInfo | null;
    },
    [eventId]
  );

  const { data: isHost } = useAsyncResource<boolean>(
    async (signal) => {
      if (!user || !event?.host_id) return false;
      const { data, error } = await supabase
        .from("host_members")
        .select("role")
        .eq("host_id", event.host_id)
        .eq("user_id", user.id)
        .abortSignal(signal)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return !!data;
    },
    [user?.id, event?.host_id]
  );

  const { data, loading, error, refetch } = useAsyncResource<{ photos: Photo[]; total: number }>(
    async (signal) => {
      let q = supabase
        .from("gallery_photos")
        .select("id,storage_path,user_id,status,created_at", { count: "exact" })
        .eq("event_id", eventId);
      if (filter === "published") q = q.eq("status", "approved");
      if (filter === "mine" && user) q = q.eq("user_id", user.id);
      if (filter === "pending" && user) q = q.eq("user_id", user.id).eq("status", "pending");
      if (filter === "review") q = q.eq("status", "pending");
      const { data: rows, count, error } = await q
        .order("created_at", { ascending: true })
        .abortSignal(signal);
      if (error) throw new Error(error.message);
      return { photos: (rows ?? []) as Photo[], total: count ?? 0 };
    },
    [eventId, user?.id, filter],
    { keepPreviousData: true }
  );

  const photos = data?.photos ?? [];
  const total = data?.total ?? 0;

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
        await supabase.storage.from("gallery").remove([path]);
        throw insErr;
      }
      toast.success("Photo uploaded — pending host approval");
      setFilter("pending");
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

  const setPhotoStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("gallery_photos").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Photo approved" : "Photo rejected");
    refetch();
  };

  const lightboxImages = photos.map((p) => ({ src: PUBLIC_BASE + p.storage_path, alt: "Event photo" }));

  if (evError) return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <ErrorState description={evError.message} />
    </div>
  );
  if (evLoading || !event) return <PageSpinner />;

  const localDate = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(event.start_at));

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Link
        to={`/e/${event.id}`}
        className="group mb-6 block overflow-hidden rounded-xl border bg-card transition hover:border-primary/40 hover:shadow-md"
      >
        <div className="flex flex-col sm:flex-row">
          <div className="relative h-40 w-full shrink-0 overflow-hidden bg-muted sm:h-auto sm:w-56">
            {event.cover_image_url ? (
              <img
                src={event.cover_image_url}
                alt=""
                className="h-full w-full object-cover transition group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <CalendarIcon className="h-10 w-10 opacity-40" />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Event</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight group-hover:text-primary">
              {event.title}
            </h1>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{localDate}</span>
            </p>
          </div>
          <div className="hidden items-center pr-5 text-primary sm:flex">
            <ArrowLeftIcon className="h-5 w-5 rotate-180 transition group-hover:translate-x-1" />
          </div>
        </div>
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Photos{total > 0 ? ` · ${total}` : ""}</h2>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <input ref={fileRef} type="file" accept={ACCEPT} onChange={onFile} className="hidden" />
              <Button size="sm" onClick={onPick} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                Upload photo
              </Button>
            </>
          ) : (
            <Button render={<Link to="/sign-in" />} size="sm" variant="outline">Sign in to upload</Button>
          )}
        </div>
      </div>

      {user && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4">
          <TabsList>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="mine">Uploaded by me</TabsTrigger>
            <TabsTrigger value="pending">My pending</TabsTrigger>
            {isHost && <TabsTrigger value="review">Pending review</TabsTrigger>}
          </TabsList>
        </Tabs>
      )}

      {user && filter === "pending" && (
        <p className="mb-4 text-xs text-muted-foreground">
          Up to 5 pending uploads per event · max 5 MB · JPG, PNG, WebP, GIF, HEIC
        </p>
      )}

      {isHost && filter === "review" && (
        <p className="mb-4 text-xs text-muted-foreground">
          Photos awaiting your approval. Approved photos appear in the Published tab.
        </p>
      )}

      {user && filter === "pending" && (
        <p className="mb-4 text-xs text-muted-foreground">
          Up to 5 pending uploads per event · max 5 MB · JPG, PNG, WebP, GIF, HEIC
        </p>
      )}

      {error ? (
        <ErrorState title="Couldn't load photos" description={error.message} onRetry={refetch} />
      ) : loading && photos.length === 0 ? (
        <SkeletonGrid
          count={8}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
          itemHeightClass="aspect-square h-auto"
        />
      ) : photos.length === 0 ? (
        <EmptyState
          title="No photos yet"
          description={user ? "Be the first to share!" : "Sign in to upload one."}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p, i) => {
              const isOwner = user?.id === p.user_id;
              const canDelete = isOwner && p.status === "pending";
              return (
                <div
                  key={p.id}
                  className="group relative overflow-hidden rounded-lg border bg-muted transition"
                >
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
                    <Badge variant="secondary" className="absolute left-1 top-1 px-1.5 py-0 text-[10px] uppercase">
                      {p.status}
                    </Badge>
                  )}
                  {filter === "published" && isOwner && p.status === "approved" && (
                    <Badge className="absolute left-1 top-1 px-1.5 py-0 text-[10px] uppercase">
                      By you
                    </Badge>
                  )}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => setDeleteFor(p)}
                      className="absolute right-1 top-1 rounded bg-background/90 p-1 opacity-0 transition group-hover:opacity-100"
                      aria-label="Delete pending photo"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  ) : user && !isOwner ? (
                    <button
                      type="button"
                      onClick={() => setReportFor(p.id)}
                      className="absolute right-1 top-1 rounded bg-background/90 p-1 opacity-0 transition group-hover:opacity-100"
                      aria-label="Report photo"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          
        </>
      )}

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
    </div>
  );
}
