import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowSquareOutIcon as ExternalLink, ArrowLeftIcon as ArrowLeft } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EventManagementCard, type ManagedEvent, type EventStat } from "@/components/event-management-card";

type Host = { id: string; name: string; logo_url: string | null };

export default function EventManage() {
  const { hostId, eventId } = useParams<{ hostId: string; eventId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [host, setHost] = useState<Host | null>(null);
  const [event, setEvent] = useState<ManagedEvent | null>(null);
  const [stat, setStat] = useState<EventStat | undefined>(undefined);
  const [busy, setBusy] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(`/sign-in?redirect=${encodeURIComponent(`/dashboard/${hostId}/events/${eventId}`)}`); return; }
    if (!hostId || !eventId) return;
    (async () => {
      setBusy(true);
      const { data: hm } = await supabase.from("host_members").select("role").eq("host_id", hostId).eq("user_id", user.id).maybeSingle();
      if (!hm) { setDenied(true); setBusy(false); return; }
      const [{ data: h }, { data: ev }, { data: stats }] = await Promise.all([
        supabase.from("hosts").select("id,name,logo_url").eq("id", hostId).maybeSingle(),
        supabase.from("events").select("id,title,status,visibility,start_at,end_at,capacity,cover_image_url,time_zone").eq("id", eventId).maybeSingle(),
        supabase.rpc("event_stats", { p_host_id: hostId }),
      ]);
      setHost((h ?? null) as Host | null);
      setEvent((ev ?? null) as ManagedEvent | null);
      setStat(((stats ?? []) as EventStat[]).find((s) => s.event_id === eventId));
      setBusy(false);
    })();
  }, [hostId, eventId, user, loading, navigate]);

  if (busy) return <AppLayout><div className="container mx-auto px-4 py-12"><div className="h-8 w-64 animate-pulse rounded bg-muted" /></div></AppLayout>;
  if (denied) return <AppLayout><div className="container mx-auto px-4 py-20 text-center"><p className="text-muted-foreground">You don't have permission to manage this event.</p></div></AppLayout>;
  if (!event || !host) return <AppLayout><div className="container mx-auto px-4 py-20 text-center"><p className="text-muted-foreground">Event not found.</p></div></AppLayout>;

  return (
    <AppLayout>
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-6">
          <Button render={<Link to={`/dashboard/${host.id}`} />} variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> All events
          </Button>
        </div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link to={`/dashboard/${host.id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <Avatar className="h-14 w-14">
              {host.logo_url && <AvatarImage src={host.logo_url} alt={host.name} />}
              <AvatarFallback>{host.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{host.name}</h1>
              <p className="text-sm text-muted-foreground">Manage event</p>
            </div>
          </Link>
          <Link to={`/e/${event.id}`} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
            View public page <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <EventManagementCard event={event} stat={stat} hostId={host.id} />
      </div>
    </AppLayout>
  );
}
