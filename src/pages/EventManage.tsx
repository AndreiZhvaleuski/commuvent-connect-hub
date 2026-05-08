import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowSquareOutIcon as ExternalLink, ArrowLeftIcon as ArrowLeft, FlagIcon } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
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
  const [openReports, setOpenReports] = useState(0);
  const [busy, setBusy] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(`/sign-in?redirect=${encodeURIComponent(`/dashboard/${hostId}/events/${eventId}`)}`); return; }
    if (!hostId || !eventId) return;
    (async () => {
      setBusy(true);
      const { data: hm } = await supabase.from("host_members").select("role").eq("host_id", hostId).eq("user_id", user.id).maybeSingle();
      if (!hm || hm.role !== "host") { setDenied(true); setBusy(false); return; }
      const [{ data: h }, { data: ev }, { data: stats }, { data: photoIds }] = await Promise.all([
        supabase.from("hosts").select("id,name,logo_url").eq("id", hostId).maybeSingle(),
        supabase.from("events").select("id,title,status,visibility,start_at,end_at,capacity,cover_image_url,time_zone").eq("id", eventId).maybeSingle(),
        supabase.rpc("event_stats", { p_host_id: hostId }),
        supabase.from("gallery_photos").select("id").eq("event_id", eventId),
      ]);
      setHost((h ?? null) as Host | null);
      setEvent((ev ?? null) as ManagedEvent | null);
      setStat(((stats ?? []) as EventStat[]).find((s) => s.event_id === eventId));
      const photoIdList = (photoIds ?? []).map((p: { id: string }) => p.id);
      const [eventReports, photoReports] = await Promise.all([
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open").eq("target_type", "event").eq("target_id", eventId),
        photoIdList.length > 0
          ? supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open").eq("target_type", "photo").in("target_id", photoIdList)
          : Promise.resolve({ count: 0 } as { count: number | null }),
      ]);
      setOpenReports((eventReports.count ?? 0) + (photoReports.count ?? 0));
      setBusy(false);
    })();
  }, [hostId, eventId, user, loading, navigate]);

  if (busy) return <><div className="container mx-auto px-4 py-12"><div className="h-8 w-64 animate-pulse rounded bg-muted" /></div></>;
  if (denied) return <><div className="container mx-auto px-4 py-20 text-center"><p className="text-muted-foreground">You don't have permission to manage this event.</p></div></>;
  if (!event || !host) return <><div className="container mx-auto px-4 py-20 text-center"><p className="text-muted-foreground">Event not found.</p></div></>;

  return (
    <><div className="container mx-auto max-w-4xl px-4 py-12">
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
          <div className="flex items-center gap-3">
            <Button
              render={<Link to={`/dashboard/${host.id}/moderation`} />}
              variant={openReports > 0 ? "default" : "outline"}
              size="sm"
            >
              <FlagIcon className="mr-1 h-4 w-4" />
              Reports
              {openReports > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                  {openReports}
                </span>
              )}
            </Button>
            <Link to={`/e/${event.id}`} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
              View public page <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <EventManagementCard event={event} stat={stat} hostId={host.id} showManage={false} />
      </div>
    </>
  );
}
