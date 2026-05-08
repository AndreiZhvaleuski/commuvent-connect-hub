import { useEffect, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { buildICS, downloadICS, googleCalendarUrl } from "@/lib/calendar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ErrorState } from "@/components/error-state";
import { Spinner } from "@/components/ui/spinner";

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

const PAGE_SIZE = 5;
type View = "upcoming" | "past";
type SortDir = "asc" | "desc";

export default function Tickets() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<{ upcoming: number; past: number }>({ upcoming: 0, past: 0 });
  const [hasAny, setHasAny] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [hideAll, setHideAll] = useState<boolean>(true);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const [view, setView] = useState<View>("upcoming");
  // Default: upcoming → nearest first (asc); past → most recent first (desc)
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (hideAll) setRevealed({});
  }, [hideAll]);

  // Server-side fetch: filter by view, sort by start_at, paginate.
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(`/sign-in?redirect=${encodeURIComponent("/tickets")}`); return; }

    let cancelled = false;
    const run = async () => {
      setBusy(true);
      setError(null);
      const nowIso = new Date().toISOString();
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const baseSelect = "id,status,position,code,cancelled_at,event_id, events!inner(id,title,start_at,end_at,time_zone,venue_address,online_url,description,cover_image_url), check_ins(id,undone)";

      const pageQuery = supabase
        .from("rsvps")
        .select(baseSelect, { count: "exact" })
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .filter("events.end_at", view === "upcoming" ? "gte" : "lt", nowIso)
        .order("start_at", { foreignTable: "events", ascending: sortDir === "asc" })
        .range(from, to);

      const upcomingCount = supabase
        .from("rsvps")
        .select("id, events!inner(end_at)", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .filter("events.end_at", "gte", nowIso);

      const pastCount = supabase
        .from("rsvps")
        .select("id, events!inner(end_at)", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .filter("events.end_at", "lt", nowIso);

      const [pageRes, upRes, pastRes] = await Promise.all([pageQuery, upcomingCount, pastCount]);
      if (cancelled) return;

      if (pageRes.error) { setError(pageRes.error.message); setBusy(false); return; }
      const up = upRes.count ?? 0;
      const pst = pastRes.count ?? 0;
      setRows(((pageRes.data ?? []) as unknown) as Row[]);
      setTotal(pageRes.count ?? 0);
      setCounts({ upcoming: up, past: pst });
      setHasAny(up + pst > 0);
      setBusy(false);
    };

    run();
    return () => { cancelled = true; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user, loading, view, sortDir, page, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

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
        reload();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new as { type?: string };
        if (n?.type === "waitlist_promoted") {
          toast.success("You're in! A seat just opened.");
        }
        reload();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user?.id]);

  // When switching tabs, set sensible default sort + reset page.
  const changeView = (v: View) => {
    setView(v);
    setSortDir(v === "upcoming" ? "asc" : "desc");
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);


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
      reload();
    } finally {
      setCancelling(false);
      setConfirmCancelEventId(null);
    }
  };

  return (
    <><div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">My Tickets</h1>
            <p className="text-muted-foreground mt-1">Your RSVPs and waitlist positions.</p>
          </div>
          {hasAny && (
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
              <Switch id="hide-sensitive" checked={hideAll} onCheckedChange={setHideAll} />
              <Label htmlFor="hide-sensitive" className="cursor-pointer text-sm inline-flex items-center gap-1.5">
                {hideAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Hide ticket codes
              </Label>
            </div>
          )}
        </div>

        {error ? (
          <ErrorState
            title="Couldn't load tickets"
            description={error}
            onRetry={reload}
          />
        ) : busy && hasAny === null ? (
          <div className="flex justify-center py-16"><Spinner className="size-8 text-muted-foreground" /></div>
        ) : hasAny === false ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Ticket className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No tickets yet</p>
              <p className="text-muted-foreground mt-1">RSVP to an event to see it here.</p>
              <Button render={<Link to="/explore" />} className="mt-6">Explore events</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs value={view} onValueChange={(v) => changeView(v as View)}>
                <TabsList>
                  <TabsTrigger value="upcoming">Upcoming ({counts.upcoming})</TabsTrigger>
                  <TabsTrigger value="past">Past ({counts.past})</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <Label htmlFor="sort-dir" className="text-xs text-muted-foreground">Sort</Label>
                <Select value={sortDir} onValueChange={(v) => { setSortDir(v as SortDir); setPage(1); }}>
                  <SelectTrigger id="sort-dir" className="h-9 w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">{view === "upcoming" ? "Nearest first" : "Oldest first"}</SelectItem>
                    <SelectItem value="desc">{view === "upcoming" ? "Furthest first" : "Newest first"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              {busy ? (
                <SkeletonGrid count={3} className="space-y-4" itemHeightClass="h-48" />
              ) : rows.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  {view === "upcoming" ? "No upcoming tickets." : "No past tickets."}
                </CardContent></Card>
              ) : (
                rows.map((r) => (
                  <TicketCard
                    key={r.id}
                    row={r}
                    qr={qrs[r.id]}
                    onCancel={() => setConfirmCancelEventId(r.event_id)}
                    hidden={hideAll && !revealed[r.id]}
                    onToggleHidden={hideAll ? () => setRevealed((p) => ({ ...p, [r.id]: !p[r.id] })) : undefined}
                    pastView={view === "past"}
                  />
                ))
              )}
            </div>

            {totalPages > 1 && (
              <Pagination className="mt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); if (safePage > 1) setPage(safePage - 1); }}
                      aria-disabled={safePage === 1}
                      className={safePage === 1 ? "pointer-events-none opacity-50" : undefined}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const p = i + 1;
                    return (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === safePage}
                          onClick={(e) => { e.preventDefault(); setPage(p); }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); if (safePage < totalPages) setPage(safePage + 1); }}
                      aria-disabled={safePage === totalPages}
                      className={safePage === totalPages ? "pointer-events-none opacity-50" : undefined}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
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
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Ticket code</p>
                {onToggleHidden && row.status === "going" && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onToggleHidden} aria-label={hidden ? "Show ticket details" : "Hide ticket details"}>
                          {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
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
