import { useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PlusIcon as Plus, ArrowSquareOutIcon as ExternalLink } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { EventListControls, type EventView, type EventSortDir } from "@/components/event-list-controls";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EventManagementCard, type ManagedEvent as Ev, type EventStat as Stat } from "@/components/event-management-card";
import { ErrorState } from "@/components/error-state";
import { Spinner } from "@/components/ui/spinner";
import { PageSpinner } from "@/components/page-spinner";
import { ListPagination } from "@/components/list-pagination";
import { useAsyncResource } from "@/hooks/use-async-resource";

const PAGE_SIZE = 10;

type Host = { id: string; name: string; logo_url: string | null; bio: string | null };
type HeaderData = {
  host: Host | null;
  role: "host" | "checker" | null;
  upcomingCount: number;
  pastCount: number;
};
type EventsData = { events: Ev[]; stats: Record<string, Stat>; total: number };

export default function HostDashboard() {
  const { hostId } = useParams<{ hostId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: EventView = searchParams.get("tab") === "past" ? "past" : "upcoming";
  const sortDir: EventSortDir = searchParams.get("sort") === "desc" ? "desc" : "asc";
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const updateParams = (mutate: (next: URLSearchParams) => void) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      mutate(next);
      return next;
    }, { replace: true });
  };
  const setTab = (v: EventView) => updateParams((next) => {
    if (v === "upcoming") next.delete("tab"); else next.set("tab", v);
    next.delete("page");
  });
  const setSortDir = (v: EventSortDir) => updateParams((next) => {
    if (v === "asc") next.delete("sort"); else next.set("sort", v);
    next.delete("page");
  });
  const setPage = (p: number) => updateParams((next) => {
    if (p <= 1) next.delete("page"); else next.set("page", String(p));
  });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate(`/sign-in?redirect=${encodeURIComponent(`/dashboard/${hostId}`)}`);
  }, [user, loading, navigate, hostId]);

  const ready = !loading && !!user && !!hostId;

  // ---- Header resource: host info, role, tab counts (independent of paging/sort) ----
  const {
    data: header,
    loading: headerLoading,
    error: headerError,
    refetch: refetchHeader,
  } = useAsyncResource<HeaderData>(
    async (signal) => {
      if (!ready) return { host: null, role: null, upcomingCount: 0, pastCount: 0 };
      const { data: member, error: memberErr } = await supabase
        .from("host_members")
        .select("role")
        .eq("host_id", hostId!)
        .eq("user_id", user!.id)
        .abortSignal(signal)
        .maybeSingle();
      if (memberErr) throw new Error(memberErr.message);
      const role = (member?.role as "host" | "checker" | undefined) ?? null;
      const isChecker = role === "checker";
      const nowIso = new Date().toISOString();

      const baseCount = () => {
        let q = supabase.from("events").select("id", { count: "exact", head: true }).eq("host_id", hostId!);
        if (isChecker) q = q.eq("status", "published");
        return q;
      };

      const [hostRes, upRes, pastRes] = await Promise.all([
        supabase.from("hosts").select("id,name,logo_url,bio").eq("id", hostId!).abortSignal(signal).maybeSingle(),
        baseCount().gte("end_at", nowIso).abortSignal(signal),
        baseCount().lt("end_at", nowIso).abortSignal(signal),
      ]);
      if (hostRes.error) throw new Error(hostRes.error.message);
      if (upRes.error) throw new Error(upRes.error.message);
      if (pastRes.error) throw new Error(pastRes.error.message);

      return {
        host: (hostRes.data ?? null) as Host | null,
        role,
        upcomingCount: upRes.count ?? 0,
        pastCount: pastRes.count ?? 0,
      };
    },
    [ready, hostId, user?.id]
  );

  const role = header?.role ?? null;
  const host = header?.host ?? null;

  // ---- Events resource: paginated/sorted/filtered ----
  const {
    data: eventsData,
    loading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useAsyncResource<EventsData>(
    async (signal) => {
      if (!ready || !role) return { events: [], stats: {}, total: 0 };
      const isChecker = role === "checker";
      const nowIso = new Date().toISOString();
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from("events")
        .select("id,title,status,visibility,start_at,end_at,capacity,cover_image_url,time_zone", { count: "exact" })
        .eq("host_id", hostId!);
      if (isChecker) q = q.eq("status", "published");
      if (tab === "upcoming") q = q.gte("end_at", nowIso); else q = q.lt("end_at", nowIso);
      q = q.order("start_at", { ascending: sortDir === "asc" }).range(from, to);

      const evRes = await q.abortSignal(signal);
      if (evRes.error) throw new Error(evRes.error.message);
      const events = (evRes.data ?? []) as Ev[];
      const total = evRes.count ?? 0;

      const statsMap: Record<string, Stat> = {};
      if (events.length > 0) {
        const statsRes = await supabase.rpc("event_stats", { p_host_id: hostId! }).abortSignal(signal);
        if (statsRes.error) throw new Error(statsRes.error.message);
        const ids = new Set(events.map((e) => e.id));
        ((statsRes.data ?? []) as Stat[]).forEach((s) => {
          if (ids.has(s.event_id)) statsMap[s.event_id] = s;
        });
      }

      return { events, stats: statsMap, total };
    },
    [ready, hostId, user?.id, role, tab, sortDir, page],
    { keepPreviousData: true }
  );

  // Realtime: refresh stats and counts when check-ins or RSVPs change
  useEffect(() => {
    if (!hostId || !role) return;
    const ch = supabase
      .channel(`host-stats-${hostId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "check_ins" }, () => {
        refetchEvents();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rsvps" }, () => {
        refetchEvents();
        refetchHeader();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hostId, role, refetchEvents, refetchHeader]);

  // ---- Header rendering states ----
  if (headerLoading && !header) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 h-14 w-64 animate-pulse rounded bg-muted" />
        <PageSpinner />
      </div>
    );
  }
  if (headerError) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <ErrorState title="Couldn't load dashboard" description={headerError.message} onRetry={refetchHeader} />
      </div>
    );
  }
  if (!host) {
    return <div className="container mx-auto px-4 py-12"><p>Host not found.</p></div>;
  }

  const events = eventsData?.events ?? [];
  const stats = eventsData?.stats ?? {};
  const total = eventsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const refetching = eventsLoading && !!eventsData;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            {host.logo_url && <AvatarImage src={host.logo_url} alt={host.name} />}
            <AvatarFallback>{host.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{host.name}</h1>
            <Link to={`/h/${host.id}`} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
              View public page <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
        {role === "host" && (
          <div className="flex flex-wrap gap-2">
            <Button render={<Link to={`/dashboard/${host.id}/edit`} />} variant="outline">Edit host</Button>
            <Button render={<Link to={`/dashboard/${host.id}/members`} />} variant="outline">Members</Button>
            <Button render={<Link to={`/dashboard/${host.id}/moderation`} />} variant="outline">Reports</Button>
            <Button render={<Link to={`/dashboard/${host.id}/events/new`} />}><Plus className="mr-1 h-4 w-4" />New event</Button>
          </div>
        )}
        {role === "checker" && (
          <span className="rounded-full border px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">Checker access</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <EventListControls
            view={tab}
            onViewChange={setTab}
            sortDir={sortDir}
            onSortChange={setSortDir}
            upcomingCount={header?.upcomingCount ?? 0}
            pastCount={header?.pastCount ?? 0}
          />
        </div>
        {refetching && <Spinner className="size-4 text-muted-foreground" />}
      </div>

      <div className="pt-4">
        <EventsSection
          loading={eventsLoading && !eventsData}
          error={eventsError}
          onRetry={refetchEvents}
          events={events}
          stats={stats}
          hostId={host.id}
          role={role ?? "checker"}
          emptyText={tab === "upcoming" ? "No upcoming events." : "No past events yet."}
        />
        <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}

function EventsSection({
  loading, error, onRetry, events, stats, hostId, role, emptyText,
}: {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  events: Ev[];
  stats: Record<string, Stat>;
  hostId: string;
  role: "host" | "checker";
  emptyText: string;
}) {
  if (loading) {
    return <PageSpinner />;
  }
  if (error) {
    return <ErrorState title="Couldn't load events" description={error.message} onRetry={onRetry} />;
  }
  if (events.length === 0) {
    return <EmptyState title={emptyText} />;
  }
  return (
    <div className="grid gap-3">
      {events.map((e) => (
        <EventManagementCard key={e.id} event={e} stat={stats[e.id]} hostId={hostId} role={role} />
      ))}
    </div>
  );
}
