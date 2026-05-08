import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PlusIcon as Plus, ArrowSquareOutIcon as ExternalLink } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EventManagementCard, type ManagedEvent as Ev, type EventStat as Stat } from "@/components/event-management-card";

type Host = { id: string; name: string; logo_url: string | null; bio: string | null };

export default function HostDashboard() {
  const { hostId } = useParams<{ hostId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [host, setHost] = useState<Host | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [role, setRole] = useState<"host" | "checker" | null>(null);
  const [busy, setBusy] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "past" ? "past" : "upcoming";
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(`/sign-in?redirect=${encodeURIComponent(`/dashboard/${hostId}`)}`); return; }
    if (!hostId) return;
    (async () => {
      setBusy(true);
      const { data: member } = await supabase
        .from("host_members")
        .select("role")
        .eq("host_id", hostId)
        .eq("user_id", user.id)
        .maybeSingle();
      const r = (member?.role as "host" | "checker" | undefined) ?? null;
      setRole(r);
      const isChecker = r === "checker";
      const eventsQuery = supabase.from("events")
        .select("id,title,status,visibility,start_at,end_at,capacity,cover_image_url,time_zone")
        .eq("host_id", hostId).order("start_at", { ascending: false });
      if (isChecker) eventsQuery.eq("status", "published");
      const [{ data: h }, { data: ev }, statsRes] = await Promise.all([
        supabase.from("hosts").select("id,name,logo_url,bio").eq("id", hostId).maybeSingle(),
        eventsQuery,
        isChecker ? Promise.resolve({ data: [] as Stat[] }) : supabase.rpc("event_stats", { p_host_id: hostId }),
      ]);
      setHost((h ?? null) as Host | null);
      setEvents((ev ?? []) as Ev[]);
      const map: Record<string, Stat> = {};
      ((statsRes.data ?? []) as Stat[]).forEach((s) => { map[s.event_id] = s; });
      setStats(map);
      setBusy(false);
    })();
  }, [hostId, user, loading, navigate]);

  const now = new Date().toISOString();
  const upcoming = useMemo(() => events.filter((e) => e.end_at >= now), [events, now]);
  const past = useMemo(() => events.filter((e) => e.end_at < now), [events, now]);

  if (busy) {
    return <AppLayout><div className="container mx-auto px-4 py-12"><div className="h-8 w-64 animate-pulse rounded bg-muted" /></div></AppLayout>;
  }
  if (!host) {
    return <AppLayout><div className="container mx-auto px-4 py-12"><p>Host not found.</p></div></AppLayout>;
  }

  return (
    <AppLayout>
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
          <div className="flex flex-wrap gap-2">
            <Button render={<Link to={`/dashboard/${host.id}/edit`} />} variant="outline">Edit host</Button>
            <Button render={<Link to={`/dashboard/${host.id}/members`} />} variant="outline">Members</Button>
            <Button render={<Link to={`/dashboard/${host.id}/events/new`} />}><Plus className="mr-1 h-4 w-4" />New event</Button>
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setSearchParams(v === "upcoming" ? {} : { tab: v }, { replace: true })}
        >
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="pt-4">
            <EventList events={upcoming} stats={stats} hostId={host.id} emptyText="No upcoming events." />
          </TabsContent>
          <TabsContent value="past" className="pt-4">
            <EventList events={past} stats={stats} hostId={host.id} emptyText="No past events yet." />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function EventList({ events, stats, hostId, emptyText }: { events: Ev[]; stats: Record<string, Stat>; hostId: string; emptyText: string }) {
  if (events.length === 0) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">{emptyText}</CardContent></Card>;
  }
  return (
    <div className="grid gap-3">
      {events.map((e) => (
        <EventManagementCard key={e.id} event={e} stat={stats[e.id]} hostId={hostId} />
      ))}
    </div>
  );
}
