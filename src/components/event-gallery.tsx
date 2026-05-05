import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FlagIcon as Flag, ImageSquareIcon as ImagePlus, SpinnerIcon as Loader2 } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Photo = { id: string; storage_path: string; user_id: string; status: string; created_at: string };

const PUBLIC_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/gallery/`;

export function EventGallery({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    // Public viewers only get approved rows from RLS; uploaders also see their own pending
    const { data } = await supabase
      .from("gallery_photos")
      .select("id,storage_path,user_id,status,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    setPhotos((data ?? []) as Photo[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [eventId, user?.id]);

  const onPick = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Max 8 MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${eventId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("gallery_photos").insert({
        event_id: eventId, user_id: user.id, storage_path: path,
      });
      if (insErr) throw insErr;
      toast.success("Photo uploaded — pending host approval");
      await load();
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

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Gallery</CardTitle>
        {user ? (
          <>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
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
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No photos yet. Be the first to share!</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-lg border bg-muted">
                <img
                  src={PUBLIC_BASE + p.storage_path}
                  alt="Event photo"
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                {p.status !== "approved" && (
                  <div className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    {p.status}
                  </div>
                )}
                {user && user.id !== p.user_id && (
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
            ))}
          </div>
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
    </Card>
  );
}
