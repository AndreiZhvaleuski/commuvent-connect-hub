import { useSearchParams } from "react-router-dom";
import { MapPinIcon as MapPin } from "@phosphor-icons/react";
import { MagnifyingGlassIcon as Search, GlobeIcon, SparkleIcon, CalendarBlankIcon } from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/date-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { PublicEventCard } from "@/components/public-event-card";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Spinner } from "@/components/ui/spinner";
import { useAsyncResource } from "@/hooks/use-async-resource";

type LocationMode = "any" | "in_person" | "online";

type Ev = {
  id: string; title: string; description: string | null; cover_image_url: string | null;
  start_at: string; end_at: string; time_zone: string | null; venue_address: string | null; online_url: string | null;
};

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const includePast = searchParams.get("past") === "1";
  const mode = (searchParams.get("type") as LocationMode) || "any";

  const updateParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value) next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  };
  const setQ = (v: string) => updateParam("q", v);
  const setFrom = (v: string) => updateParam("from", v);
  const setTo = (v: string) => updateParam("to", v);
  const setIncludePast = (v: boolean) => updateParam("past", v ? "1" : null);
  const setMode = (v: LocationMode) => updateParam("type", v === "any" ? null : v);
  const clearAll = () => setSearchParams({}, { replace: true });

  const { data: events, loading: busy, error, refetch } = useAsyncResource<Ev[]>(
    async (signal) => {
      let qb = supabase.from("events")
        .select("id,title,description,cover_image_url,start_at,end_at,time_zone,venue_address,online_url")
        .eq("status", "published").eq("visibility", "public")
        .order("start_at", { ascending: true })
        .limit(60);

      if (!includePast) qb = qb.gte("end_at", new Date().toISOString());
      const parseLocal = (s: string, endOfDay = false) => {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, (m ?? 1) - 1, d ?? 1, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
      };
      if (from) qb = qb.gte("start_at", parseLocal(from).toISOString());
      if (to) qb = qb.lte("start_at", parseLocal(to, true).toISOString());
      if (q.trim()) {
        const safe = q.trim().replace(/[%,()]/g, " ");
        qb = qb.or(`title.ilike.%${safe}%,venue_address.ilike.%${safe}%`);
      }
      if (mode === "online") qb = qb.not("online_url", "is", null);
      else if (mode === "in_person") qb = qb.not("venue_address", "is", null);

      const { data, error } = await qb.abortSignal(signal);
      if (error) throw new Error(error.message);
      return (data ?? []) as Ev[];
    },
    [q, from, to, includePast, mode],
    { debounceMs: 250 }
  );

  const list = events ?? [];
  const hasFilter = !!(q || from || to || includePast || mode !== "any");

  return (
    <><section className="border-b">
        <div className="container mx-auto max-w-6xl px-4 py-10">
          <h1 className="text-3xl font-semibold tracking-tight">Explore events</h1>
          <p className="mt-1 text-muted-foreground">Free community events from hosts on Commuvent.</p>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-8">
        <Card className="mb-6">
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="q">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, venue or city" className="pl-8" />
              </div>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>Type</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as LocationMode)}
                className="flex flex-wrap gap-2"
              >
                {([
                  { v: "any", label: "Any", icon: <SparkleIcon className="h-4 w-4 shrink-0" /> },
                  { v: "in_person", label: "In person", icon: <MapPin className="h-4 w-4 shrink-0" /> },
                  { v: "online", label: "Online", icon: <GlobeIcon className="h-4 w-4 shrink-0" /> },
                ] as const).map((opt) => {
                  const selected = mode === opt.v;
                  const content = (
                    <label
                      htmlFor={`mode-${opt.v}`}
                      className={cn(
                        "flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors whitespace-nowrap",
                        selected ? "border-primary bg-primary/5 flex-1" : "hover:bg-accent"
                      )}
                    >
                      <RadioGroupItem value={opt.v} id={`mode-${opt.v}`} className="shrink-0" />
                      {opt.icon}
                      {selected && <span className="truncate">{opt.label}</span>}
                    </label>
                  );
                  return selected ? (
                    <div key={opt.v} className="flex-1">{content}</div>
                  ) : (
                    <Tooltip key={opt.v}>
                      <TooltipTrigger render={content} />
                      <TooltipContent>{opt.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <DatePicker
                value={from ? new Date(from) : null}
                onChange={(d) => setFrom(d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "")}
                placeholder="Pick a date"
                className="h-8 min-h-8 py-1"
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <DatePicker
                value={to ? new Date(to) : null}
                onChange={(d) => setTo(d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "")}
                placeholder="Pick a date"
                className="h-8 min-h-8 py-1"
              />
            </div>
            <div className="flex h-8 items-center gap-3 sm:col-span-2 lg:col-span-4">
              <div className="flex items-center gap-2">
                <Switch id="past" checked={includePast} onCheckedChange={setIncludePast} />
                <Label htmlFor="past" className="cursor-pointer">Include past events</Label>
              </div>
              <Button
                variant="ghost"
                size="default"
                className={cn("ml-auto", !(q || from || to || includePast || mode !== "any") && "invisible")}
                onClick={clearAll}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {busy ? (
          <div className="flex justify-center py-16"><Spinner className="size-8 text-muted-foreground" /></div>
        ) : error ? (
          <ErrorState
            title="Couldn't load events"
            description={error.message}
            onRetry={refetch}
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<CalendarBlankIcon className="h-8 w-8" />}
            title={hasFilter ? "No events match your filters" : "No published events yet"}
            description={hasFilter ? "Try clearing the search or expanding the date range." : "Check back soon for new events."}
            action={hasFilter ? <Button variant="outline" size="sm" onClick={clearAll}>Clear filters</Button> : undefined}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => (
              <PublicEventCard key={e.id} event={e} showStatusBadge={includePast} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
