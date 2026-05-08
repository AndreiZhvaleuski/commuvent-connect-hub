import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowCounterClockwiseIcon as Undo2,
  QrCodeIcon as QrCode,
  ArrowSquareOutIcon as ExternalLink,
  GearIcon as Settings,
} from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CheckIn() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, loading } = useAuth();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [counters, setCounters] = useState({ going: 0, checkedIn: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: event, isLoading: evLoading } = useQuery({
    queryKey: ["checkin-event", eventId],
    enabled: !!eventId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, host_id, capacity, start_at, end_at")
        .eq("id", eventId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: access } = useQuery({
    queryKey: ["checkin-access", event?.host_id, user?.id],
    enabled: !!event?.host_id && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("host_members")
        .select("role")
        .eq("host_id", event!.host_id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const isHost = access?.role === "host";

  const refreshCounters = useMemo(
    () => async () => {
      if (!eventId) return;
      const [{ count: going }, { count: checkedIn }] = await Promise.all([
        supabase
          .from("rsvps")
          .select("id", { count: "exact", head: true })
          .eq("event_id", eventId)
          .eq("status", "going")
          .is("cancelled_at", null),
        supabase
          .from("check_ins")
          .select("id", { count: "exact", head: true })
          .eq("event_id", eventId)
          .eq("undone", false),
      ]);
      setCounters({ going: going ?? 0, checkedIn: checkedIn ?? 0 });
    },
    [eventId]
  );

  useEffect(() => {
    if (!eventId || !access) return;
    refreshCounters();
    const ch = supabase
      .channel(`checkin-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "check_ins", filter: `event_id=eq.${eventId}` }, refreshCounters)
      .on("postgres_changes", { event: "*", schema: "public", table: "rsvps", filter: `event_id=eq.${eventId}` }, refreshCounters)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventId, access, refreshCounters]);

  if (loading || evLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }

  if (!user) return <Navigate to={`/sign-in?redirect=/checkin/${eventId}`} replace />;
  if (!event) return <Navigate to="/dashboard" replace />;
  if (!access) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold mb-2">Not authorized</h1>
          <p className="text-muted-foreground">You must be a host or checker for this event.</p>
        </div>
      </AppLayout>
    );
  }

  const remaining = Math.max(0, (event.capacity || 0) - counters.checkedIn);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("check_in_by_code", {
        body: { event_id: eventId, code: trimmed },
      });
      if (error) throw error;
      const status = (data as any)?.status;
      if (status === "ok") toast.success(`Checked in · ${trimmed}`);
      else if (status === "duplicate") toast.warning("Already checked in");
      else if (status === "wrong_event") toast.error("Code is for a different event");
      else if (status === "not_found") toast.error("Code not found");
      else toast.error("Check-in failed");
      setCode("");
      inputRef.current?.focus();
      refreshCounters();
    } catch (err: any) {
      toast.error(err.message ?? "Check-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function undo() {
    try {
      const { data, error } = await supabase.functions.invoke("check_in_undo", { body: { event_id: eventId } });
      if (error) throw error;
      if ((data as any)?.ok) toast.success("Last check-in undone");
      else toast.message("Nothing to undo");
      refreshCounters();
    } catch (err: any) {
      toast.error(err.message ?? "Undo failed");
    }
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl px-4 py-6 sm:py-12 space-y-5">
        <Link
          to={`/dashboard/${event.host_id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground min-h-11"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to dashboard
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{event.title}</h1>
          <p className="text-sm text-muted-foreground">Check-in</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="min-h-11"
            render={<a href={`/e/${event.id}`} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLink className="w-4 h-4 mr-2" /> Public page
          </Button>
          {isHost && (
            <Button
              size="sm"
              variant="outline"
              className="min-h-11"
              render={<Link to={`/dashboard/${event.host_id}/events/${event.id}`} />}
            >
              <Settings className="w-4 h-4 mr-2" /> Manage event
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-live="polite">
          <Counter label="Going" value={counters.going} />
          <Counter label="Checked-in" value={counters.checkedIn} highlight />
          <Counter label="Remaining" value={remaining} />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Scan QR</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled
              className="w-full h-14 text-base"
            >
              <QrCode className="w-5 h-5 mr-2" /> Scan QR code
              <Badge variant="secondary" className="ml-2">Coming soon</Badge>
            </Button>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              QR scanning will be available soon. Enter the code manually below.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Enter ticket code</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <Input
                ref={inputRef}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD"
                className="h-16 text-2xl tracking-widest text-center font-mono uppercase"
                aria-label="Ticket code"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={!code.trim() || submitting}>
                {submitting ? "Checking in…" : "Check in"}
              </Button>
            </form>
            <Button variant="outline" className="w-full mt-3 h-12" onClick={undo}>
              <Undo2 className="w-4 h-4 mr-2" /> Undo last scan
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Counter({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary" : undefined}>
      <CardContent className="p-3 sm:p-4 text-center">
        <div className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`text-2xl sm:text-3xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
