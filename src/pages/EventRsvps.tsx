import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSEO } from "@/hooks/use-seo";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildCsv, downloadBlob, toIsoInTz, type RsvpExportRow } from "@/lib/csv";
import { toast } from "sonner";

type Row = {
  id: string;
  status: string;
  position: number | null;
  created_at: string;
  user_id: string;
  display_name: string | null;
  email: string;
  check_in_time: string | null;
};

export default function EventRsvps() {
  const { hostId, eventId } = useParams<{ hostId: string; eventId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<{ id: string; title: string; time_zone: string; host_id: string } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);

  useSEO({ title: event ? `RSVPs · ${event.title} — Commuvent` : "RSVPs — Commuvent", description: "Manage and export RSVPs." });

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(`/sign-in?redirect=/dashboard/${hostId}/events/${eventId}/rsvps`); return; }
    if (!eventId) return;
    (async () => {
      setBusy(true);
      const { data: ev } = await supabase
        .from("events")
        .select("id,title,time_zone,host_id")
        .eq("id", eventId)
        .maybeSingle();
      if (!ev) { setBusy(false); return; }
      setEvent(ev);

      const { data: rs } = await supabase
        .from("rsvps")
        .select("id,status,position,created_at,user_id")
        .eq("event_id", eventId)
        .is("cancelled_at", null)
        .order("created_at", { ascending: true });

      const userIds = (rs ?? []).map((r) => r.user_id);
      const [{ data: profiles }, { data: checkIns }] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id,display_name").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from("check_ins")
          .select("rsvp_id,checked_in_at,undone")
          .eq("event_id", eventId)
          .eq("undone", false),
      ]);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));
      const ciMap = new Map((checkIns ?? []).map((c: any) => [c.rsvp_id, c.checked_in_at]));

      // Email isn't queryable client-side via auth.users; placeholder until we add to profiles.
      const enriched: Row[] = (rs ?? []).map((r) => ({
        id: r.id,
        status: r.status,
        position: r.position,
        created_at: r.created_at,
        user_id: r.user_id,
        display_name: profileMap.get(r.user_id) ?? null,
        email: "",
        check_in_time: ciMap.get(r.id) ?? null,
      }));
      setRows(enriched);
      setBusy(false);
    })();
  }, [eventId, hostId, user, loading, navigate]);

  function exportCsv() {
    if (!event) return;
    const data: RsvpExportRow[] = rows.map((r) => ({
      name: r.display_name || "",
      email: r.email || "",
      rsvp_status: r.status,
      check_in_time: toIsoInTz(r.check_in_time, event.time_zone),
    }));
    const blob = buildCsv(data);
    const safeTitle = event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
    downloadBlob(blob, `rsvps-${safeTitle}.csv`);
    toast.success(`Exported ${data.length} RSVPs`);
  }

  return (
    <AppLayout>
      <main className="container max-w-5xl py-8 space-y-6">
        <Link to={`/dashboard/${hostId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to dashboard
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{event?.title ?? "Event"}</h1>
            <p className="text-muted-foreground">RSVPs · {rows.length} total</p>
          </div>
          <Button onClick={exportCsv} disabled={!event || rows.length === 0}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attendees</CardTitle>
          </CardHeader>
          <CardContent>
            {busy ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground">No RSVPs yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.display_name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "going" ? "default" : "secondary"}>
                          {r.status}{r.position ? ` · #${r.position}` : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.check_in_time
                          ? toIsoInTz(r.check_in_time, event?.time_zone || "UTC")
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
