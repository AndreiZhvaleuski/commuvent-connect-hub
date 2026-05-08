import { useEffect, useMemo } from "react";
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
import { useAsyncResource } from "@/hooks/use-async-resource";

type Host = { id: string; name: string; logo_url: string | null; bio: string | null };
type DashboardData = {
  host: Host | null;
  events: Ev[];
  stats: Record<string, Stat>;
  role: "host" | "checker" | null;
};

export default function HostDashboard() {
  const { hostId } = useParams<{ hostId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: EventView = searchParams.get("tab") === "past" ? "past" : "upcoming";
  const sortDir: EventSortDir = searchParams.get("sort") === "desc" ? "desc" : "asc";
  const setTab = (v: EventView) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v === "upcoming") next.delete("tab"); else next.set("tab", v);
      return next;
    }, { replace: true });
  };
  const setSortDir = (v: EventSortDir) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v === "asc") next.delete("sort"); else next.set("sort", v);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (loading) return;
    if (!user) navigate(`/sign-in?redirect=${encodeURIComponent(`/dashboard/${hostId}`)}`);
  }, [user, loading, navigate, hostId]);

  const ready = !loading && !!user && !!hostId;
  const { data, loading: busy, error, refetch } = useAsyncResource<DashboardData>(
    async (signal) => {
      if (!ready) {
        return { host: null, events: [], stats: {}, role: null };
      }
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

      let eventsQuery = supabase.from("events")
        .select("id,title,status,visibility,start_at,end_at,capacity,cover_image_url,time_zone")
        .eq("host_id", hostId!).order("start_at", { ascending: true });
      if (isChecker) eventsQuery = eventsQuery.eq("status", "published");

      const [hostRes, evRes, statsRes] = await Promise.all([
        supabase.from("hosts").select("id,name,logo_url,bio").eq("id", hostId!).abortSignal(signal).maybeSingle(),
        eventsQuery.abortSignal(signal),
        supabase.rpc("event_stats", { p_host_id: hostId! }).abortSignal(signal),
      ]);
      if (hostRes.error) throw new Error(hostRes.error.message);
      if (evRes.error) throw new Error(evRes.error.message);
      if (statsRes.error) throw new Error(statsRes.error.message);

      const statsMap: Record<string, Stat> = {};
      ((statsRes.data ?? []) as Stat[]).forEach((s) => { statsMap[s.event_id] = s; });

      return {
        host: (hostRes.data ?? null) as Host | null,
        events: (evRes.data ?? []) as Ev[],
        stats: statsMap,
        role,
      };
    },
    [ready, hostId, user?.id]
  );

  const role = data?.role ?? null;
  const host = data?.host ?? null;
  const events = data?.events ?? [];
  const stats = data?.stats ?? {};

  // Realtime: refresh when check-ins or RSVPs change for any event in this host
  useEffect(() => {
    if (!hostId || !role) return;
    const ch = supabase
      .channel(`host-stats-${hostId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "check_ins" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "rsvps" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hostId, role, refetch]);

  const now = new Date().toISOString();
  const upcoming = useMemo(() => events.filter((e) => e.end_at >= now), [events, now]);
  const past = useMemo(() => events.filter((e) => e.end_at < now), [events, now]);

  if (busy) {
    return (
      <><div className="container mx-auto max-w-6xl px-4 py-12">
          <div className="mb-8 h-14 w-64 animate-pulse rounded bg-muted" />
          <div className="flex justify-center py-12"><Spinner className="size-8 text-muted-foreground" /></div>
        </div>
      </>
    );
  }
  if (error) {
    return (
      <><div className="container mx-auto max-w-6xl px-4 py-12">
          <ErrorState
            title="Couldn't load dashboard"
            description={error.message}
            onRetry={refetch}
          />
        </div>
      </>
    );
  }
  if (!host) {
    return <><div className="container mx-auto px-4 py-12"><p>Host not found.</p></div></>;
  }

  return (
    <><div className="container mx-auto max-w-6xl px-4 py-12">
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
              <Button render={<Link to={`/dashboard/${host.id}/events/new`} />}><Plus className="mr-1 h-4 w-4" />New event</Button>
            </div>
          )}
          {role === "checker" && (
            <span className="rounded-full border px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">Checker access</span>
          )}
        </div>

        <EventListControls
          view={tab}
          onViewChange={setTab}
          sortDir={sortDir}
          onSortChange={setSortDir}
          upcomingCount={upcoming.length}
          pastCount={past.length}
        />
        <div className="pt-4">
          <EventList
            events={tab === "upcoming" ? upcoming : past}
            stats={stats}
            hostId={host.id}
            role={role ?? "checker"}
            emptyText={tab === "upcoming" ? "No upcoming events." : "No past events yet."}
          />
        </div>
      </div>
    </>
  );
}

function EventList({ events, stats, hostId, role, emptyText }: { events: Ev[]; stats: Record<string, Stat>; hostId: string; role: "host" | "checker"; emptyText: string }) {
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
