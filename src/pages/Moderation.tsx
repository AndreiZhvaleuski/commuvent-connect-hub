import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon as ArrowLeft, EyeSlashIcon as EyeOff } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_id: string | null;
};

type Reporter = { id: string; display_name: string | null; avatar_url: string | null; email: string | null };
type EventInfo = { id: string; title: string; start_at: string; description: string | null };
type PhotoInfo = { id: string; storage_path: string; event_id: string; status: string };

type Data = {
  reports: ReportRow[];
  reporters: Record<string, Reporter>;
  events: Record<string, EventInfo>;
  photos: Record<string, PhotoInfo>;
};

const PUBLIC_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/gallery/`;

export default function Moderation() {
  const { hostId } = useParams<{ hostId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<{ report: ReportRow; action: "hide" | "dismiss" } | null>(null);
  const [resolving, setResolving] = useState(false);

  if (!authLoading && !user) {
    navigate(`/sign-in?redirect=/dashboard/${hostId}/moderation`);
  }

  const ready = !authLoading && !!user && !!hostId;

  const { data, loading, error, refetch } = useAsyncResource<Data>(
    async (signal) => {
      if (!ready) return { reports: [], reporters: {}, events: {}, photos: {} };
      const { data: rep, error: repErr } = await supabase
        .from("reports")
        .select("id,target_type,target_id,reason,status,created_at,reporter_id")
        .eq("status", "open")
        .order("created_at", { ascending: true })
        .abortSignal(signal);
      if (repErr) throw new Error(repErr.message);
      const reports = (rep ?? []) as ReportRow[];

      const reporterIds = Array.from(new Set(reports.map((r) => r.reporter_id).filter(Boolean) as string[]));
      const photoIds = Array.from(
        new Set(reports.filter((r) => r.target_type === "photo").map((r) => r.target_id))
      );
      const reportIds = reports.map((r) => r.id);

      const [profilesRes, emailsRes, photosRes] = await Promise.all([
        reporterIds.length > 0
          ? supabase.from("profiles").select("id,display_name,avatar_url").in("id", reporterIds).abortSignal(signal)
          : Promise.resolve({ data: [] as { id: string; display_name: string | null; avatar_url: string | null }[], error: null }),
        reportIds.length > 0
          ? supabase.rpc("report_reporter_emails", { p_report_ids: reportIds }).abortSignal(signal)
          : Promise.resolve({ data: [] as { report_id: string; email: string }[], error: null }),
        photoIds.length > 0
          ? supabase.from("gallery_photos").select("id,storage_path,event_id,status").in("id", photoIds).abortSignal(signal)
          : Promise.resolve({ data: [] as PhotoInfo[], error: null }),
      ]);
      if (profilesRes.error) throw new Error(profilesRes.error.message);
      if (emailsRes.error) throw new Error(emailsRes.error.message);
      if (photosRes.error) throw new Error(photosRes.error.message);

      const photos: Record<string, PhotoInfo> = {};
      ((photosRes.data ?? []) as PhotoInfo[]).forEach((p) => { photos[p.id] = p; });

      const eventIds = Array.from(new Set([
        ...reports.filter((r) => r.target_type === "event").map((r) => r.target_id),
        ...Object.values(photos).map((p) => p.event_id),
      ]));

      const eventsRes = eventIds.length > 0
        ? await supabase.from("events").select("id,title,start_at,description").in("id", eventIds).abortSignal(signal)
        : { data: [] as EventInfo[], error: null };
      if (eventsRes.error) throw new Error(eventsRes.error.message);

      const emailByReportId = new Map<string, string>();
      ((emailsRes.data ?? []) as { report_id: string; email: string }[]).forEach((e) => {
        emailByReportId.set(e.report_id, e.email);
      });
      const emailByReporter = new Map<string, string>();
      reports.forEach((r) => {
        const em = emailByReportId.get(r.id);
        if (em && r.reporter_id) emailByReporter.set(r.reporter_id, em);
      });

      const reporters: Record<string, Reporter> = {};
      ((profilesRes.data ?? []) as { id: string; display_name: string | null; avatar_url: string | null }[]).forEach((p) => {
        reporters[p.id] = { ...p, email: emailByReporter.get(p.id) ?? null };
      });

      const events: Record<string, EventInfo> = {};
      ((eventsRes.data ?? []) as EventInfo[]).forEach((e) => { events[e.id] = e; });

      return { reports, reporters, events, photos };
    },
    [ready, hostId, user?.id]
  );

  const reports = data?.reports ?? [];
  const reporters = data?.reporters ?? {};
  const events = data?.events ?? {};
  const photos = data?.photos ?? {};

  const confirmResolve = async () => {
    if (!pending) return;
    const { report, action } = pending;
    setResolving(true);
    if (action === "hide") {
      if (report.target_type === "photo") {
        const { error } = await supabase.from("gallery_photos").update({ status: "rejected" }).eq("id", report.target_id);
        if (error) { toast.error(error.message); setResolving(false); return; }
      } else if (report.target_type === "event") {
        const { error } = await supabase.from("events").update({ status: "draft" }).eq("id", report.target_id);
        if (error) { toast.error(error.message); setResolving(false); return; }
      }
    }
    const { error } = await supabase
      .from("reports")
      .update({ status: action === "hide" ? "actioned" : "dismissed" })
      .eq("id", report.id);
    setResolving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(action === "hide" ? "Hidden" : "Dismissed");
    setPending(null);
    refetch();
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
        Reports submitted by attendees, oldest first. Hiding a photo rejects it; hiding an event reverts it to a draft.
      </p>

      {loading && !data ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : error ? (
        <ErrorState title="Couldn't load reports" description={error.message} onRetry={refetch} />
      ) : reports.length === 0 ? (
        <p className="text-muted-foreground">No open reports.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const reporter = r.reporter_id ? reporters[r.reporter_id] : undefined;
            const ev = r.target_type === "event" ? events[r.target_id] : undefined;
            const initials = (reporter?.display_name ?? reporter?.email ?? "?").slice(0, 2).toUpperCase();
            return (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="capitalize">{r.target_type} report</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {reporter?.avatar_url && <AvatarImage src={reporter.avatar_url} alt="" />}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {reporter?.display_name ?? "Unknown user"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {reporter?.email ?? "No email available"}
                      </div>
                    </div>
                  </div>

                  {ev && (
                    <Link
                      to={`/e/${ev.id}`}
                      className="block rounded-md border bg-muted/30 p-3 hover:bg-muted/60 transition-colors"
                    >
                      <div className="text-sm font-medium truncate">{ev.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(ev.start_at).toLocaleString()}
                      </div>
                      {ev.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{ev.description}</p>
                      )}
                    </Link>
                  )}

                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Reason</div>
                    <p className="text-sm whitespace-pre-line">{r.reason}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="destructive" onClick={() => setPending({ report: r, action: "hide" })}>
                      <EyeOff className="w-4 h-4 mr-1" /> Hide
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPending({ report: r, action: "dismiss" })}>
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!pending} onOpenChange={(o) => { if (!o && !resolving) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.action === "hide"
                ? pending?.report.target_type === "photo"
                  ? "Hide this photo?"
                  : "Hide this event?"
                : "Dismiss this report?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.action === "hide"
                ? pending?.report.target_type === "photo"
                  ? "The photo will be rejected and removed from the public gallery. The report will be marked as actioned."
                  : "The event will be reverted to a draft and removed from public listings. The host can republish it later. The report will be marked as actioned."
                : "The report will be dismissed without changes. The reporter can submit a new report after this is resolved."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resolving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={resolving}
              onClick={(e) => { e.preventDefault(); confirmResolve(); }}
            >
              {resolving ? "Working…" : pending?.action === "hide" ? "Hide" : "Dismiss"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
