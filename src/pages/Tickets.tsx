import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { CalendarIcon as CalIcon, ClockIcon as Clock, DownloadSimpleIcon as Download, EyeIcon as Eye, EyeSlashIcon as EyeOff, ArrowSquareOutIcon as ExternalLink, MapPinIcon as MapPin, MagnifyingGlassPlusIcon as ZoomIn, TicketIcon as Ticket } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventDateTime } from "@/components/event-datetime";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildICS, downloadICS, googleCalendarUrl } from "@/lib/calendar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Row = {
  id: string;
  status: string;
  position: number | null;
  code: string;
  cancelled_at: string | null;
  event_id: string;
  check_ins: { id: string; undone: boolean }[] | null;
  events: {
    id: string; title: string; start_at: string; end_at: string; time_zone: string;
    venue_address: string | null; online_url: string | null; description: string | null;
    cover_image_url: string | null;
  } | null;
};

export default function Tickets() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [hideAll, setHideAll] = useState<boolean>(true);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (hideAll) setRevealed({});
  }, [hideAll]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("rsvps")
      .select("id,status,position,code,cancelled_at,event_id, events(id,title,start_at,end_at,time_zone,venue_address,online_url,description,cover_image_url), check_ins(id,undone)")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    setRows(((data ?? []) as unknown) as Row[]);
    setBusy(false);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(`/sign-in?redirect=${encodeURIComponent("/tickets")}`); return; }
    load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user, loading]);

  // Generate QR codes for going tickets
  useEffect(() => {
    rows.forEach((r) => {
      if (r.status !== "going" || qrs[r.id]) return;
      QRCode.toDataURL(r.code, { width: 256, margin: 1 }).then((url) =>
        setQrs((prev) => ({ ...prev, [r.id]: url }))
      ).catch(() => { /* noop */ });
    });
  }, [rows, qrs]);

  // Realtime: react to RSVP changes (waitlist promotion, position changes) and notifications
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`tickets-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rsvps", filter: `user_id=eq.${user.id}` }, () => {
        load();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new as { type?: string };
        if (n?.type === "waitlist_promoted") {
          toast.success("You're in! A seat just opened.");
        }
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user?.id]);

  const now = useMemo(() => Date.now(), [rows]);
  const upcoming = rows.filter((r) => r.events && new Date(r.events.end_at).getTime() >= now);
  const past = rows.filter((r) => r.events && new Date(r.events.end_at).getTime() < now);

  const [confirmCancelEventId, setConfirmCancelEventId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const doCancel = async () => {
    const eventId = confirmCancelEventId;
    if (!eventId) return;
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("rsvp_cancel", { body: { event_id: eventId } });
      const code = (data?.error as string | undefined) ?? error?.message;
      if (code) {
        const msg =
          code === "event_ended" ? "This event has ended."
          : code === "already_checked_in" ? "You've already checked in — RSVP can't be cancelled."
          : code;
        toast.error(msg);
        return;
      }
      toast.success("RSVP cancelled");
      load();
    } finally {
      setCancelling(false);
      setConfirmCancelEventId(null);
    }
  };

  if (busy) return <><div className="container mx-auto px-4 py-12"><div className="h-8 w-64 animate-pulse rounded bg-muted" /></div></>;

  return (
    <><div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">My Tickets</h1>
            <p className="text-muted-foreground mt-1">Your RSVPs and waitlist positions.</p>
          </div>
          {rows.length > 0 && (
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
              <Switch id="hide-sensitive" checked={hideAll} onCheckedChange={setHideAll} />
              <Label htmlFor="hide-sensitive" className="cursor-pointer text-sm inline-flex items-center gap-1.5">
                {hideAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Hide ticket codes
              </Label>
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Ticket className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No tickets yet</p>
              <p className="text-muted-foreground mt-1">RSVP to an event to see it here.</p>
              <Button render={<Link to="/explore" />} className="mt-6">Explore events</Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="pt-4 space-y-4">
              {upcoming.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No upcoming tickets.</CardContent></Card>}
              {upcoming.map((r) => (
                <TicketCard
                  key={r.id}
                  row={r}
                  qr={qrs[r.id]}
                  onCancel={() => setConfirmCancelEventId(r.event_id)}
                  hidden={hideAll && !revealed[r.id]}
                  onToggleHidden={() => setRevealed((p) => ({ ...p, [r.id]: !p[r.id] }))}
                />
              ))}
            </TabsContent>
            <TabsContent value="past" className="pt-4 space-y-4">
              {past.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No past tickets.</CardContent></Card>}
              {past.map((r) => (
                <TicketCard
                  key={r.id}
                  row={r}
                  qr={qrs[r.id]}
                  onCancel={() => setConfirmCancelEventId(r.event_id)}
                  hidden={hideAll && !revealed[r.id]}
                  onToggleHidden={() => setRevealed((p) => ({ ...p, [r.id]: !p[r.id] }))}
                  pastView
                />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <ConfirmDialog
        open={!!confirmCancelEventId}
        onOpenChange={(o) => !o && setConfirmCancelEventId(null)}
        title="Cancel this RSVP?"
        description="You'll lose your spot. If the event is full, your seat may be given to someone on the waitlist."
        confirmLabel="Cancel RSVP"
        cancelLabel="Keep RSVP"
        destructive
        loading={cancelling}
        onConfirm={doCancel}
      />
    </>
  );
}

function TicketCard({ row, qr, onCancel, pastView, hidden, onToggleHidden }: { row: Row; qr?: string; onCancel: () => void; pastView?: boolean; hidden?: boolean; onToggleHidden?: () => void }) {
  const e = row.events;
  if (!e) return null;
  const checkedIn = (row.check_ins ?? []).some((c) => !c.undone);
  const eventUrl = `${window.location.origin}/e/${e.id}`;
  const calEvent = {
    title: e.title,
    description: e.description ?? "",
    location: e.venue_address ?? e.online_url ?? "",
    startISO: e.start_at,
    endISO: e.end_at,
    url: eventUrl,
  };
  const ics = () => {
    downloadICS(`${e.title.replace(/[^a-z0-9]+/gi, "_") || "event"}.ics`, buildICS({ ...calEvent, uid: `${row.id}@commuvent` }));
  };
  const [zoomed, setZoomed] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {row.status === "going" ? <Badge>Going</Badge> : <Badge variant="secondary">Waitlist · #{row.position ?? "?"}</Badge>}
            {pastView ? (
              checkedIn ? (
                <Badge className="bg-primary/15 text-foreground border-primary/30" variant="outline">✓ Attended</Badge>
              ) : row.status === "going" ? (
                <Badge variant="outline">Did not check in</Badge>
              ) : (
                <Badge variant="outline">Ended</Badge>
              )
            ) : (
              checkedIn && <Badge variant="outline">Checked in</Badge>
            )}
          </div>
          <CardTitle className="truncate">
            <Link to={`/e/${e.id}`} className="hover:underline inline-flex items-center gap-1">
              {e.title} <ExternalLink className="h-3 w-3 opacity-60" />
            </Link>
          </CardTitle>
          <div className="text-xs text-muted-foreground mt-1"><EventDateTime startIso={e.start_at} endIso={e.end_at} timeZone={e.time_zone} variant="compact" /></div>
          {(e.venue_address || e.online_url) && (
            <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.venue_address ?? "Online"}</p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-[160px_1fr] items-center">
          {row.status === "going" ? (
            qr ? (
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => !hidden && setZoomed(true)}
                  aria-label={hidden ? "Hidden QR code" : "Enlarge QR code"}
                  disabled={hidden}
                  className="group relative flex focus:outline-none"
                >
                  <div className="relative h-40 w-40 rounded-md border bg-card p-2 transition group-hover:border-primary group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
                    <img src={qr} alt={`QR code ${row.code}`} className={`h-full w-full transition ${hidden ? "blur-md" : ""}`} />
                    {hidden && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <EyeOff className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </button>
                {!hidden && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <ZoomIn className="h-3 w-3" /> Tap to enlarge
                  </span>
                )}
              </div>
            ) : (
              <div className="h-40 w-40 animate-pulse rounded-md bg-muted" />
            )
          ) : (
            <div className="h-40 w-40 rounded-md border bg-muted/40 flex flex-col items-center justify-center text-center p-3">
              <Clock className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Waitlist position</p>
              <p className="text-3xl font-semibold tabular-nums">#{row.position ?? "?"}</p>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Ticket code</p>
                {onToggleHidden && row.status === "going" && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onToggleHidden} aria-label={hidden ? "Show ticket details" : "Hide ticket details"}>
                          {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      }
                    />
                    <TooltipContent>{hidden ? "Show ticket code & QR" : "Hide ticket code & QR"}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className={`font-mono text-lg tracking-wider transition ${hidden ? "select-none blur-sm" : ""}`}>
                {hidden ? "••••••••" : row.code}
              </p>
            </div>
            {!pastView && (
              <div className="flex flex-wrap gap-2">
                <Button render={<a href={googleCalendarUrl(calEvent)} target="_blank" rel="noreferrer" />} size="sm" variant="outline">
                  <CalIcon className="mr-1 h-4 w-4" />Google Calendar
                </Button>
                <Button size="sm" variant="outline" onClick={ics}><Download className="mr-1 h-4 w-4" />.ics</Button>
                {checkedIn ? (
                  <span className="text-xs text-muted-foreground self-center">Checked in — can't cancel</span>
                ) : (
                  <Button size="sm" variant="ghost" onClick={onCancel}>Cancel RSVP</Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>{e.title}</DialogTitle>
          </DialogHeader>
          {qr && <img src={qr} alt={`QR code ${row.code}`} className="mx-auto h-auto w-full max-w-sm rounded-md border bg-card p-3" />}
          <p className="text-center font-mono text-base tracking-widest">{row.code}</p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
