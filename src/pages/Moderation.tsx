import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon as ArrowLeft, CheckIcon as Check, EyeSlashIcon as EyeOff, XIcon as X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/confirm-dialog";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

const PUBLIC_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/gallery/`;

type Photo = { id: string; storage_path: string; status: string; event_id: string; created_at: string };
type EventLite = { id: string; title: string; start_at: string };
type Report = { id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string };

export default function Moderation() {
  const { hostId } = useParams<{ hostId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [eventsById, setEventsById] = useState<Record<string, EventLite>>({});
  const [busy, setBusy] = useState(true);
  const [rejectFor, setRejectFor] = useState<Photo | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const load = async () => {
    setBusy(true);
    const { data: evs } = await supabase
      .from("events")
      .select("id,title,start_at")
      .eq("host_id", hostId!);
    const events = (evs ?? []) as EventLite[];
    const eventIds = events.map((e) => e.id);
    setEventsById(Object.fromEntries(events.map((e) => [e.id, e])));
    if (eventIds.length === 0) { setPhotos([]); setReports([]); setBusy(false); return; }

    const [{ data: ph }, { data: rep }] = await Promise.all([
      supabase
        .from("gallery_photos")
        .select("id,storage_path,status,event_id,created_at")
        .in("event_id", eventIds)
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("reports")
        .select("id,target_type,target_id,reason,status,created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false }),
    ]);
    setPhotos((ph ?? []) as Photo[]);
    setReports((rep ?? []) as Report[]);
    setBusy(false);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(`/sign-in?redirect=/dashboard/${hostId}/moderation`); return; }
    if (!hostId) return;
    load();
    /* eslint-disable-next-line */
  }, [hostId, user, loading]);

  const setPhotoStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("gallery_photos").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Photo approved" : "Photo rejected");
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const resolveReport = async (r: Report, action: "hide" | "dismiss") => {
    if (action === "hide") {
      if (r.target_type === "photo") {
        const { error } = await supabase.from("gallery_photos").update({ status: "rejected" }).eq("id", r.target_id);
        if (error) { toast.error(error.message); return; }
      } else if (r.target_type === "event") {
        const { error } = await supabase.from("events").update({ status: "draft", visibility: "private" }).eq("id", r.target_id);
        if (error) { toast.error(error.message); return; }
      }
    }
    const { error } = await supabase
      .from("reports")
      .update({ status: action === "hide" ? "actioned" : "dismissed" })
      .eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(action === "hide" ? "Hidden" : "Dismissed");
    setReports((prev) => prev.filter((x) => x.id !== r.id));
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <Link to={`/dashboard/${hostId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold">Moderation</h1>

        <Tabs defaultValue="gallery">
          <TabsList>
            <TabsTrigger value="gallery">
              Gallery queue {photos.length > 0 && <Badge variant="secondary" className="ml-2">{photos.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="reports">
              Reports {reports.length > 0 && <Badge variant="secondary" className="ml-2">{reports.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-4 space-y-8">
            {busy ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : photos.length === 0 ? (
              <p className="text-muted-foreground">Nothing waiting for review.</p>
            ) : (
              Object.entries(
                photos.reduce<Record<string, Photo[]>>((acc, p) => {
                  (acc[p.event_id] ||= []).push(p);
                  return acc;
                }, {})
              ).map(([eventId, group]) => {
                const ev = eventsById[eventId];
                return (
                  <section key={eventId} className="space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold">
                          {ev?.title ?? "Unknown event"}
                        </h2>
                        {ev && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(ev.start_at).toLocaleString()} · {group.length} pending
                          </p>
                        )}
                      </div>
                      {ev && (
                        <Link
                          to={`/e/${ev.id}/gallery`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Open gallery →
                        </Link>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {group.map((p) => (
                        <Card key={p.id} className="overflow-hidden">
                          <img src={PUBLIC_BASE + p.storage_path} alt="Pending submission" className="aspect-square w-full object-cover" />
                          <CardContent className="flex gap-2 p-3">
                            <Button size="sm" className="flex-1" onClick={() => setPhotoStatus(p.id, "approved")}>
                              <Check className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => setRejectFor(p)}>
                              <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="reports" className="mt-4 space-y-3">
            {busy ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : reports.length === 0 ? (
              <p className="text-muted-foreground">No open reports.</p>
            ) : (
              reports.map((r) => (
                <Card key={r.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="capitalize">{r.target_type} report</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm whitespace-pre-line">{r.reason}</p>
                    <p className="text-xs text-muted-foreground font-mono break-all">{r.target_type}:{r.target_id}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={() => resolveReport(r, "hide")}>
                        <EyeOff className="w-4 h-4 mr-1" /> Hide
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resolveReport(r, "dismiss")}>
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

      <ConfirmDialog
        open={!!rejectFor}
        onOpenChange={(o) => !o && setRejectFor(null)}
        title="Reject this photo?"
        description="The uploader will not be notified, and the photo will be hidden from the gallery."
        confirmLabel="Reject"
        destructive
        onConfirm={async () => {
          if (!rejectFor) return;
          await setPhotoStatus(rejectFor.id, "rejected");
          setRejectFor(null);
        }}
      />
    </main>
  );
}
