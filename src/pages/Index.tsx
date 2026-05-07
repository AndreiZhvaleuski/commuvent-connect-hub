import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon as ArrowRight, MapPinIcon as MapPin, UsersIcon as Users } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventDateTime } from "@/components/event-datetime";
type Ev = {
  id: string; title: string; description: string | null;
  cover_image_url: string | null; start_at: string; end_at: string; time_zone: string | null;
  venue_address: string | null; online_url: string | null;
};

export default function Index() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id,title,description,cover_image_url,start_at,end_at,time_zone,venue_address,online_url")
        .eq("status", "published").eq("visibility", "public")
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(12);
      setEvents((data ?? []) as Ev[]);
      setLoading(false);
    })();
  }, []);

  return (
    <AppLayout>
      <section className="relative overflow-hidden border-b">
        <div className="container mx-auto px-4 py-24 sm:py-32 text-center">
          <Badge variant="secondary" className="mb-6">Free for communities, forever</Badge>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
            Where community meets event.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Host, attend, and check-in to events your community actually shows up for. No fees, no fluff.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button render={<Link to="/explore" />} size="lg">
              Explore events <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button render={<Link to="/become-a-host" />} size="lg" variant="outline">
              Become a host
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Upcoming events</h2>
            <p className="text-muted-foreground mt-1">Fresh from the community.</p>
          </div>
          <Button render={<Link to="/explore" />} variant="ghost">See all</Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="h-48" /></Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No upcoming events yet</p>
              <p className="text-muted-foreground mt-1">Be the first — host one for your community.</p>
              <Button render={<Link to="/become-a-host" />} className="mt-6">Become a host</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <Link key={e.id} to={`/e/${e.id}`}>
                <Card className="h-full transition hover:shadow-md hover:-translate-y-0.5">
                  {e.cover_image_url && (
                    <div className="aspect-video bg-muted overflow-hidden rounded-t-xl">
                      <img src={e.cover_image_url} alt={e.title} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{e.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(e.start_at).toLocaleString()}
                    </div>
                    {(e.venue_address || e.online_url) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-1">{e.venue_address ?? "Online"}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
