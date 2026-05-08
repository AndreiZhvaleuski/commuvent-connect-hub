import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon as ArrowLeft, EyeSlashIcon as EyeOff } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Report = { id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string };

export default function Moderation() {
  const { hostId } = useParams<{ hostId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    const { data: rep } = await supabase
      .from("reports")
      .select("id,target_type,target_id,reason,status,created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false });
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
    <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link to={`/dashboard/${hostId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to dashboard
      </Link>
      <div className="flex items-baseline gap-3">
        <h1 className="text-3xl font-bold">Reports</h1>
        {reports.length > 0 && <Badge variant="secondary">{reports.length} open</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        Reports submitted by attendees about events or photos. Hiding a photo rejects it; hiding an event reverts it to a private draft.
      </p>

      <div className="space-y-3">
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
                  {r.target_type === "event" && (
                    <Button size="sm" variant="outline" render={<Link to={`/e/${r.target_id}`} />}>
                      View event
                    </Button>
                  )}
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
      </div>
    </main>
  );
}
