import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon as Calendar, MapPinIcon as MapPin, MagnifyingGlassIcon as Search } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/use-seo";
import { AppLayout } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Ev = {
  id: string; title: string; description: string | null; cover_image_url: string | null;
  start_at: string; end_at: string; venue_address: string | null; online_url: string | null;
};

export default function Explore() {
  useSEO({ title: "Explore events — Commuvent", description: "Discover upcoming community events near you on Commuvent." });
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includePast, setIncludePast] = useState(false);
  const [events, setEvents] = useState<Ev[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setBusy(true);
      let qb = supabase.from("events")
        .select("id,title,description,cover_image_url,start_at,end_at,venue_address,online_url")
        .eq("status", "published").eq("visibility", "public")
        .order("start_at", { ascending: true })
        .limit(60);

      if (!includePast) qb = qb.gte("end_at", new Date().toISOString());
      if (from) qb = qb.gte("start_at", new Date(from).toISOString());
      if (to) {
        const end = new Date(to); end.setHours(23, 59, 59, 999);
        qb = qb.lte("start_at", end.toISOString());
      }
      if (q.trim()) {
        const safe = q.trim().replace(/[%,()]/g, " ");
        qb = qb.or(`title.ilike.%${safe}%,venue_address.ilike.%${safe}%`);
      }
      if (location.trim()) {
        const safe = location.trim().replace(/[%,()]/g, " ");
        qb = qb.ilike("venue_address", `%${safe}%`);
      }

      const { data } = await qb;
      if (!cancelled) { setEvents((data ?? []) as Ev[]); setBusy(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, location, from, to, includePast]);

  const now = useMemo(() => Date.now(), [events]);

  return (
    <AppLayout>
      <section className="border-b">
        <div className="container mx-auto max-w-6xl px-4 py-10">
          <h1 className="text-3xl font-semibold tracking-tight">Explore events</h1>
          <p className="mt-1 text-muted-foreground">Free community events from hosts on Commuvent.</p>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-8">
        <Card className="mb-6">
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="q">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or venue" className="pl-8" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc">Location</Label>
              <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, venue…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex items-end gap-3 lg:col-span-5">
              <div className="flex items-center gap-2">
                <Switch id="past" checked={includePast} onCheckedChange={setIncludePast} />
                <Label htmlFor="past" className="cursor-pointer">Include past events</Label>
              </div>
              {(q || location || from || to || includePast) && (
                <Button variant="ghost" size="sm" onClick={() => { setQ(""); setLocation(""); setFrom(""); setTo(""); setIncludePast(false); }}>
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {busy ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="h-48" /></Card>)}
          </div>
        ) : events.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">No events match your filters.</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => {
              const ended = new Date(e.end_at).getTime() < now;
              return (
                <Link key={e.id} to={`/e/${e.id}`}>
                  <Card className="h-full transition hover:shadow-md hover:-translate-y-0.5">
                    {e.cover_image_url && (
                      <div className="aspect-video bg-muted overflow-hidden rounded-t-xl">
                        <img src={e.cover_image_url} alt={e.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <CardHeader>
                      {ended && <Badge variant="secondary" className="w-fit mb-1">Ended</Badge>}
                      <CardTitle className="line-clamp-2">{e.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{new Date(e.start_at).toLocaleString()}</div>
                      {(e.venue_address || e.online_url) && (
                        <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span className="line-clamp-1">{e.venue_address ?? "Online"}</span></div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
