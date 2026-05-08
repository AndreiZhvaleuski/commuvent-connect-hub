import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeftIcon as ArrowLeft, DownloadSimpleIcon as Download, InfoIcon } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { buildCsv, downloadBlob, toUtcIso, type RsvpExportRow } from "@/lib/csv";

const CSV_HELP_HIDE_KEY = "commuvent.rsvp-csv-help.hide";

function formatLocal(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return "";
  }
}
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
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
      const { data: hm } = await supabase
        .from("host_members")
        .select("role")
        .eq("host_id", ev.host_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!hm || hm.role !== "host") {
        navigate(`/dashboard/${ev.host_id}`);
        return;
      }
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
          ? supabase.from("profiles").select("id,display_name,email").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from("check_ins")
          .select("rsvp_id,checked_in_at,undone")
          .eq("event_id", eventId)
          .eq("undone", false),
      ]);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const ciMap = new Map((checkIns ?? []).map((c: any) => [c.rsvp_id, c.checked_in_at]));

      const enriched: Row[] = (rs ?? []).map((r) => {
        const p = profileMap.get(r.user_id) as { display_name: string | null; email: string | null } | undefined;
        return {
          id: r.id,
          status: r.status,
          position: r.position,
          created_at: r.created_at,
          user_id: r.user_id,
          display_name: p?.display_name ?? null,
          email: p?.email ?? "",
          check_in_time: ciMap.get(r.id) ?? null,
        };
      });
      enriched.sort((a, b) => {
        if (a.check_in_time && b.check_in_time) return a.check_in_time.localeCompare(b.check_in_time);
        if (a.check_in_time) return -1;
        if (b.check_in_time) return 1;
        return a.created_at.localeCompare(b.created_at);
      });
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
      check_in_time: toUtcIso(r.check_in_time),
    }));
    const blob = buildCsv(data);
    const safeTitle = event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
    downloadBlob(blob, `rsvps-${safeTitle}.csv`);
    toast.success(`Exported ${data.length} RSVPs`);
    if (typeof window !== "undefined" && localStorage.getItem(CSV_HELP_HIDE_KEY) !== "1") {
      setDontShowAgain(false);
      setInfoOpen(true);
    }
  }

  function closeInfo() {
    if (dontShowAgain && typeof window !== "undefined") {
      localStorage.setItem(CSV_HELP_HIDE_KEY, "1");
    }
    setInfoOpen(false);
  }

  const csvNotes = (
    <div className="space-y-3 text-sm text-muted-foreground">
      <p><strong className="text-foreground">Format:</strong> UTF-8, comma-separated, with check-in times in UTC.</p>
      <div>
        <p className="font-medium text-foreground">Google Sheets</p>
        <p>File → Import → Upload, leave the separator as <em>Detect automatically</em>. Names with accents and non-Latin characters render correctly.</p>
      </div>
      <div>
        <p className="font-medium text-foreground">Excel</p>
        <p>In regions where the default list separator is <code>;</code> (most of Europe), double-clicking the file may put everything in column A. Open Excel first, then Data → From Text/CSV and pick comma as the delimiter.</p>
      </div>
    </div>
  );

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <Link to={`/dashboard/${hostId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to dashboard
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold sm:text-3xl">{event?.title ?? "Event"}</h1>
            <p className="text-sm text-muted-foreground">RSVPs · {rows.length} total</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportCsv} disabled={!event || rows.length === 0} className="flex-1 sm:flex-initial">
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Dialog open={infoOpen} onOpenChange={(o) => (o ? setInfoOpen(true) : closeInfo())}>
              <DialogTrigger
                render={
                  <Button variant="outline" size="icon" aria-label="CSV format details">
                    <InfoIcon className="h-4 w-4" />
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Opening the CSV</DialogTitle>
                  <DialogDescription>How to import this file into Google Sheets and Excel.</DialogDescription>
                </DialogHeader>
                {csvNotes}
                <DialogFooter className="sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={dontShowAgain}
                      onCheckedChange={(v) => setDontShowAgain(v === true)}
                    />
                    <span>Don&apos;t show this again</span>
                  </label>
                  <Button onClick={closeInfo}>Got it</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
              <>
                {/* Mobile: stacked cards */}
                <ul className="space-y-3 md:hidden">
                  {rows.map((r) => (
                    <li key={r.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{r.display_name || "—"}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.email || "—"}</p>
                        </div>
                        <Badge variant={r.status === "going" ? "default" : "secondary"} className="shrink-0">
                          {r.status}{r.position ? ` · #${r.position}` : ""}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {r.check_in_time ? `Checked in · ${formatLocal(r.check_in_time)}` : "Not checked in"}
                      </p>
                    </li>
                  ))}
                </ul>
                {/* Desktop/tablet: table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Check-in (your time)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.display_name || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="break-all">{r.email || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === "going" ? "default" : "secondary"}>
                              {r.status}{r.position ? ` · #${r.position}` : ""}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.check_in_time
                              ? formatLocal(r.check_in_time)
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
  );
}
