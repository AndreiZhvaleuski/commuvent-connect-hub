import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PlusIcon as Plus, CalendarIcon as Calendar, UsersIcon as Users, ClockIcon as Clock, CheckCircleIcon as CheckCircle2, ArrowSquareOutIcon as ExternalLink } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSEO } from "@/hooks/use-seo";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Host = { id: string; name: string; logo_url: string | null; bio: string | null };
type Ev = {
  id: string; title: string; status: string; visibility: string;
  start_at: string; end_at: string; capacity: number; cover_image_url: string | null;
};
type Stat = { event_id: string; going_count: number; waitlist_count: number; checked_in_count: number };

export default function HostDashboard() {
  const { hostId } = useParams<{ hostId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [host, setHost] = useState<Host | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [busy, setBusy] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "past" ? "past" : "upcoming";

  useSEO({ title: host ? `${host.name} — Commuvent` : "Host dashboard — Commuvent", description: "Manage your community's events." });

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(`/sign-in?redirect=${encodeURIComponent(`/dashboard/${hostId}`)}`); return; }
    if (!hostId) return;
    (async () => {
      setBusy(true);
      const [{ data: h }, { data: ev }, { data: st }] = await Promise.all([
        supabase.from("hosts").select("id,name,logo_url,bio").eq("id", hostId).maybeSingle(),
        supabase.from("events")
          .select("id,title,status,visibility,start_at,end_at,capacity,cover_image_url")
          .eq("host_id", hostId).order("start_at", { ascending: false }),
        supabase.rpc("event_stats", { p_host_id: hostId }),
      ]);
      setHost((h ?? null) as Host | null);
      setEvents((ev ?? []) as Ev[]);
      const map: Record<string, Stat> = {};
      ((st ?? []) as Stat[]).forEach((s) => { map[s.event_id] = s; });
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
          <div className="flex gap-2">
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
      {events.map((e) => {
        const s = stats[e.id] ?? { going_count: 0, waitlist_count: 0, checked_in_count: 0 } as Stat;
        return (
          <Card key={e.id}>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-3 uppercase">
                  <Badge variant={e.status === "published" ? "default" : "secondary"} className="uppercase tracking-wide">{e.status}</Badge>
                  <Badge variant="outline" className="uppercase tracking-wide">{e.visibility}</Badge>
                </div>
                <CardTitle className="truncate">{e.title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {new Date(e.start_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button render={<Link to={`/dashboard/${hostId}/events/${e.id}/edit`} />} size="sm" variant="outline">Edit</Button>
                <Button render={<Link to={`/dashboard/${hostId}/events/${e.id}/rsvps`} />} size="sm" variant="outline">RSVPs</Button>
                <Button render={<Link to={`/checkin/${e.id}`} />} size="sm" variant="outline">Check-in</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Going" value={s.going_count} icon={<Users className="h-4 w-4" />} suffix={e.capacity ? `/ ${e.capacity}` : ""} />
                <Stat label="Waitlist" value={s.waitlist_count} icon={<Clock className="h-4 w-4" />} />
                <Stat label="Checked-in" value={s.checked_in_count} icon={<CheckCircle2 className="h-4 w-4" />} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Stat({ label, value, icon, suffix }: { label: string; value: number; icon: React.ReactNode; suffix?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}{suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}</div>
    </div>
  );
}
