import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowSquareOutIcon as ExternalLink, FlagIcon as Flag, GlobeIcon as Globe, MapPinIcon as MapPin, ShareIcon, UsersIcon as Users } from "@phosphor-icons/react";
import { EventDateTime } from "@/components/event-datetime";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { EventGallery } from "@/components/event-gallery";
import { MarkdownView } from "@/components/markdown-view";
import { EventFeedback } from "@/components/event-feedback";

type Ev = {
  id: string; title: string; description: string | null; cover_image_url: string | null;
  start_at: string; end_at: string; time_zone: string; venue_address: string | null; online_url: string | null;
  capacity: number; visibility: string; status: string; host_id: string;
};
type Host = { id: string; name: string; logo_url: string | null; bio: string | null; contact_email: string | null };
type Rsvp = { id: string; status: string; position: number | null; code: string; cancelled_at: string | null };

export default function EventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [event, setEvent] = useState<Ev | null>(null);
  const [host, setHost] = useState<Host | null>(null);
  const [going, setGoing] = useState(0);
  const [rsvp, setRsvp] = useState<Rsvp | null>(null);
  const [busy, setBusy] = useState(true);
  const [acting, setActing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const load = async () => {
    if (!eventId) return;
    setBusy(true);
    const { data: ev } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
    if (!ev) { setNotFound(true); setBusy(false); return; }
    setEvent(ev as Ev);
    const [{ data: h }, { data: goingCount }] = await Promise.all([
      supabase.from("hosts").select("id,name,logo_url,bio,contact_email").eq("id", ev.host_id).maybeSingle(),
      supabase.rpc("event_going_count", { p_event_id: eventId }),
    ]);
    setHost((h ?? null) as Host | null);
    setGoing(Number(goingCount ?? 0));
    if (user) {
      const { data: r } = await supabase.from("rsvps").select("id,status,position,code,cancelled_at")
        .eq("event_id", eventId).eq("user_id", user.id).maybeSingle();
      setRsvp((r ?? null) as Rsvp | null);
      const { data: hm } = await supabase.from("host_members").select("role").eq("host_id", ev.host_id).eq("user_id", user.id).maybeSingle();
      setCanManage(hm?.role === "host");
      setCanCheckIn(!!hm);
    } else {
      setRsvp(null);
      setCanManage(false);
      setCanCheckIn(false);
    }
    setBusy(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [eventId, user?.id]);

  // Realtime: refresh going count when RSVPs change for this event
  useEffect(() => {
    if (!eventId) return;
    const ch = supabase.channel(`ev-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rsvps", filter: `event_id=eq.${eventId}` }, () => {
        supabase.rpc("event_going_count", { p_event_id: eventId })
          .then(({ data }) => setGoing(Number(data ?? 0)));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId]);

  // Auto-open RSVP confirm after sign-in redirect with intent=rsvp
  useEffect(() => {
    if (!event || !user) return;
    if (params.get("intent") !== "rsvp") return;
    if (rsvp && rsvp.status !== "cancelled") {
      const next = new URLSearchParams(params); next.delete("intent"); setParams(next, { replace: true });
      return;
    }
    if (new Date(event.end_at).getTime() < Date.now()) {
      const next = new URLSearchParams(params); next.delete("intent"); setParams(next, { replace: true });
      return;
    }
    setConfirmOpen(true);
    const next = new URLSearchParams(params); next.delete("intent"); setParams(next, { replace: true });
  }, [event, user, rsvp, params, setParams]);

  if (notFound) return <><div className="container mx-auto px-4 py-20 text-center"><p className="text-muted-foreground">Event not found.</p></div></>;
  if (busy || !event) return <><div className="container mx-auto px-4 py-12"><div className="h-8 w-64 animate-pulse rounded bg-muted" /></div></>;

  const ended = new Date(event.end_at).getTime() < Date.now();

  const capacityPct = event.capacity > 0 ? Math.min(100, Math.round((going / event.capacity) * 100)) : 0;
  const isFull = event.capacity > 0 && going >= event.capacity;
  const activeRsvp = rsvp && rsvp.status !== "cancelled" ? rsvp : null;

  const requireAuth = (intent?: string) => {
    if (!user) {
      const q = new URLSearchParams({ redirect: `/e/${event.id}` });
      if (intent) q.set("intent", intent);
      navigate(`/sign-in?${q.toString()}`); return false;
    }
    return true;
  };

  const onRsvp = async () => {
    if (!requireAuth("rsvp")) return;
    setActing(true);
    try {
      const { data, error } = await supabase.functions.invoke("rsvp_create", { body: { event_id: event.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.rsvp?.status === "waitlist" ? "Added to waitlist" : "You're going!");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "RSVP failed");
    } finally { setActing(false); }
  };

  const onCancel = async () => {
    if (!requireAuth()) return;
    setActing(true);
    try {
      const { data, error } = await supabase.functions.invoke("rsvp_cancel", { body: { event_id: event.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("RSVP cancelled");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    } finally { setActing(false); }
  };

  const submitReport = async () => {
    if (!requireAuth()) return;
    if (reportReason.trim().length < 5) { toast.error("Please describe the issue"); return; }
    const { error } = await supabase.from("reports").insert({
      target_type: "event", target_id: event.id, reason: reportReason.trim(), reporter_id: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Report submitted. Thank you.");
    setReportOpen(false); setReportReason("");
  };

  return (
    <>{event.cover_image_url && (
        <div className="relative w-full overflow-hidden">
          <img
            src={event.cover_image_url}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-125 object-cover blur-3xl"
          />
          <div className="absolute inset-0 bg-background/30" />
          <div className="container relative z-10 mx-auto max-w-5xl px-4">
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="mx-auto my-6 aspect-video w-auto max-w-full object-contain"
            />
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {ended && <Badge variant="secondary">Ended</Badge>}
              {event.visibility !== "public" && <Badge variant="outline" className="capitalize">{event.visibility}</Badge>}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>

            {host && (
              <Link to={`/h/${host.id}`} className="mt-4 flex w-full min-w-0 items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors">
                <Avatar className="h-10 w-10 shrink-0">
                  {host.logo_url && <AvatarImage src={host.logo_url} alt={host.name} />}
                  <AvatarFallback>{host.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Hosted by</p>
                  <p className="truncate text-sm font-medium">{host.name}</p>
                  {host.contact_email && (
                    <p className="truncate text-xs text-muted-foreground">{host.contact_email}</p>
                  )}
                </div>
                <ExternalLink className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            )}

            <div className="mt-6 space-y-3 text-sm">
              <EventDateTime
                startIso={event.start_at}
                endIso={event.end_at}
                timeZone={event.time_zone}
                variant="full"
                className="text-sm"
              />
              {(event.venue_address || event.online_url) && (
                <div className="flex items-start gap-3">
                  {event.online_url ? <Globe className="mt-0.5 h-4 w-4 text-muted-foreground" /> : <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                  <div>
                    {event.venue_address && <p>{event.venue_address}</p>}
                    {event.online_url && (
                      <a href={event.online_url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                        {event.online_url}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {event.description && (
              <Card className="mt-8">
                <CardHeader><CardTitle>About</CardTitle></CardHeader>
                <CardContent><MarkdownView className="text-sm leading-relaxed">{event.description}</MarkdownView></CardContent>
              </Card>
            )}

            <div className="mt-8 flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={async () => {
                const shareUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-preview?type=event&id=${event.id}`;
                await navigator.clipboard.writeText(shareUrl);
                toast.success("Link copied! Share it anywhere to show a preview.");
              }}>
                <ShareIcon className="mr-1 h-4 w-4" />Share this event
              </Button>
              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                  <Flag className="mr-1 h-4 w-4" />Report event
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Report this event</DialogTitle>
                    <DialogDescription>Tell us what's wrong. The host will review your report.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Textarea id="reason" rows={4} value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
                    <Button onClick={submitReport}>Submit</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <EventGallery eventId={event.id} />
            {ended && <EventFeedback eventId={event.id} />}
          </div>

          <aside>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />Going</span>
                  <span className="tabular-nums">{going}{event.capacity ? ` / ${event.capacity}` : ""}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.capacity > 0 && <Progress value={capacityPct} aria-label="Capacity used" />}

                {ended ? (
                  <Button disabled className="w-full" variant="secondary">Event ended</Button>
                ) : canCheckIn ? (
                  <div className="rounded-md border bg-muted/50 p-3 text-sm text-center text-muted-foreground">
                    You're {canManage ? "hosting" : "checking in for"} this event
                  </div>
                ) : activeRsvp ? (
                  <div className="space-y-2">
                    <div className="rounded-md border bg-muted/50 p-3 text-sm">
                      <p className="font-medium">
                        {activeRsvp.status === "going" ? "You're going" : `On waitlist (#${activeRsvp.position ?? "?"})`}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground mt-1">Code: {activeRsvp.code}</p>
                    </div>
                    <Button render={<Link to="/tickets" />} variant="outline" className="w-full">View ticket</Button>
                    <Button onClick={onCancel} disabled={acting} variant="ghost" className="w-full">Cancel RSVP</Button>
                  </div>
                ) : isFull ? (
                  <Button onClick={() => (user ? setConfirmOpen(true) : requireAuth("rsvp"))} disabled={acting} className="w-full" variant="secondary">Join waitlist</Button>
                ) : (
                  <Button onClick={() => (user ? setConfirmOpen(true) : requireAuth("rsvp"))} disabled={acting} className="w-full">RSVP</Button>
                )}

                {!canCheckIn && <p className="text-xs text-muted-foreground text-center">Free event · No fees</p>}

                {canCheckIn && (
                  <div className="border-t pt-3 space-y-2">
                    <Button render={<Link to={`/checkin/${event.id}`} />} size="sm" className="w-full">Open check-in</Button>
                    {canManage && (
                      <>
                        <Button render={<Link to={`/dashboard/${event.host_id}/events/${event.id}`} />} variant="outline" size="sm" className="w-full">Manage event</Button>
                        <Button render={<Link to={`/dashboard/${event.host_id}`} />} variant="ghost" size="sm" className="w-full">Host dashboard</Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isFull ? "Join the waitlist?" : "Confirm your RSVP"}</DialogTitle>
            <DialogDescription>
              {isFull
                ? "This event is full. We'll automatically promote you and email a notification when a seat opens."
                : `You'll be marked as going to "${event.title}". You can cancel anytime.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Not now</Button>
            <Button
              disabled={acting}
              onClick={async () => { setConfirmOpen(false); await onRsvp(); }}
            >
              {isFull ? "Join waitlist" : "Confirm RSVP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
