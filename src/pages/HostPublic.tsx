import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EnvelopeIcon as Mail, MapPinIcon as MapPin, ShareIcon } from "@phosphor-icons/react";
import { EventDateTime } from "@/components/event-datetime";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Host = { id: string; name: string; bio: string | null; logo_url: string | null; contact_email: string | null };
type Ev = { id: string; title: string; cover_image_url: string | null; start_at: string; end_at: string; time_zone: string | null; venue_address: string | null; online_url: string | null };

export default function HostPublic() {
  const { id } = useParams<{ id: string }>();
  const [host, setHost] = useState<Host | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [busy, setBusy] = useState(true);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    if (!id) return;
    (async () => {
      setBusy(true);
      const { data: h } = await supabase.from("hosts").select("id,name,bio,logo_url,contact_email").eq("id", id).maybeSingle();
      if (!h) { setNotFound(true); setBusy(false); return; }
      setHost(h as Host);
      const { data: ev } = await supabase
        .from("events")
        .select("id,title,cover_image_url,start_at,end_at,venue_address,online_url")
        .eq("host_id", h.id).eq("status", "published").eq("visibility", "public")
        .order("start_at", { ascending: true });
      setEvents((ev ?? []) as Ev[]);
      setBusy(false);
    })();
  }, [id]);

  const now = new Date().toISOString();
  const upcoming = useMemo(() => events.filter((e) => e.end_at >= now), [events, now]);
  const past = useMemo(() => events.filter((e) => e.end_at < now).reverse(), [events, now]);

  if (notFound) return <AppLayout><div className="container mx-auto px-4 py-20 text-center"><p className="text-muted-foreground">Host not found.</p></div></AppLayout>;
  if (busy || !host) return <AppLayout><div className="container mx-auto px-4 py-12"><div className="h-24 animate-pulse rounded bg-muted" /></div></AppLayout>;

  return (
    <AppLayout>
      <section className="border-b">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="flex flex-wrap items-start gap-6">
            <Avatar className="h-20 w-20">
              {host.logo_url && <AvatarImage src={host.logo_url} alt={host.name} />}
              <AvatarFallback className="text-xl">{host.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-semibold tracking-tight">{host.name}</h1>
              {host.bio && (
                <div className="mt-2 prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{host.bio}</ReactMarkdown>
                </div>
              )}
              {host.contact_email && (
                <a href={`mailto:${host.contact_email}`} className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <Mail className="h-4 w-4" /> {host.contact_email}
                </a>
              )}
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={async () => {
                  const shareUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-preview?type=host&id=${host.id}`;
                  await navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copied! Share it anywhere to show a preview.");
                }}>
                  <ShareIcon className="mr-1 h-4 w-4" />Share this page
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 max-w-4xl">
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="pt-4"><EventGrid events={upcoming} empty="No upcoming events." /></TabsContent>
          <TabsContent value="past" className="pt-4"><EventGrid events={past} empty="No past events." pastBadge /></TabsContent>
        </Tabs>
      </section>
    </AppLayout>
  );
}

function EventGrid({ events, empty, pastBadge }: { events: Ev[]; empty: string; pastBadge?: boolean }) {
  if (events.length === 0) return <Card><CardContent className="py-12 text-center text-muted-foreground">{empty}</CardContent></Card>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {events.map((e) => (
        <Link key={e.id} to={`/e/${e.id}`}>
          <Card className="h-full transition hover:shadow-md hover:-translate-y-0.5">
            {e.cover_image_url && (
              <div className="aspect-video bg-muted overflow-hidden rounded-t-xl">
                <img src={e.cover_image_url} alt={e.title} className="h-full w-full object-cover" />
              </div>
            )}
            <CardHeader>
              {pastBadge && <Badge variant="secondary" className="w-fit mb-1">Ended</Badge>}
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
      ))}
    </div>
  );
}
