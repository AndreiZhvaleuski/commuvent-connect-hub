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

const PUBLIC_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/gallery/`;

type Photo = { id: string; storage_path: string; status: string; event_id: string; created_at: string };
type Report = { id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string };

export default function Moderation() {
  const { hostId } = useParams<{ hostId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState(true);
  const load = async () => {
    setBusy(true);
    // Events for this host, then pending photos and open reports limited to those events
    const { data: evs } = await supabase.from("events").select("id").eq("host_id", hostId!);
    const eventIds = (evs ?? []).map((e: any) => e.id);
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

          <TabsContent value="gallery" className="mt-4">
            {busy ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : photos.length === 0 ? (
              <p className="text-muted-foreground">Nothing waiting for review.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {photos.map((p) => (
                  <Card key={p.id} className="overflow-hidden">
                    <img src={PUBLIC_BASE + p.storage_path} alt="Pending submission" className="aspect-square w-full object-cover" />
                    <CardContent className="flex gap-2 p-3">
                      <Button size="sm" className="flex-1" onClick={() => setPhotoStatus(p.id, "approved")}>
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setPhotoStatus(p.id, "rejected")}>
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
      </main>
    </>
  );
}
