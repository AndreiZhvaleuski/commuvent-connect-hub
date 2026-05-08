import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  UsersIcon as Users,
  ClockIcon as Clock,
  CheckCircleIcon as CheckCircle2,
  MagnifyingGlassIcon as Search,
  XIcon as X,
  CalendarBlankIcon,
} from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DatePicker } from "@/components/date-picker";
import { EventDateTime } from "@/components/event-datetime";
import { StatBox } from "@/components/stat-box";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageSpinner } from "@/components/page-spinner";
import { useAsyncResource } from "@/hooks/use-async-resource";


type HostOpt = { id: string; name: string; logo_url: string | null };
type Row = {
  event_id: string;
  title: string;
  status: string;
  visibility: string;
  start_at: string;
  end_at: string;
  capacity: number;
  cover_image_url: string | null;
  time_zone: string | null;
  host_id: string;
  host_name: string;
  host_logo_url: string | null;
  user_role: "host" | "checker";
  going_count: number;
  waitlist_count: number;
  checked_in_count: number;
  total_count: number;
};

const PAGE_SIZE = 20;
type TimeFilter = "upcoming" | "past" | "all";

export default function MyEvents() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const hostId = params.get("host") || "";
  const search = params.get("q") || "";
  const fromStr = params.get("from") || "";
  const toStr = params.get("to") || "";
  const time = ((params.get("time") as TimeFilter) || "upcoming") as TimeFilter;
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));

  const [hosts, setHosts] = useState<HostOpt[]>([]);
  const [searchInput, setSearchInput] = useState(search);

  // Debounce search input -> URL
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput === search) return;
      const next = new URLSearchParams(params);
      if (searchInput) next.set("q", searchInput);
      else next.delete("q");
      next.delete("page");
      setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Load hosts the user belongs to
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/sign-in?redirect=${encodeURIComponent("/my-events")}`);
      return;
    }
    (async () => {
      const { data: members } = await supabase
        .from("host_members")
        .select("host_id")
        .eq("user_id", user.id);
      const ids = (members ?? []).map((m) => m.host_id);
      if (ids.length === 0) {
        setHosts([]);
        return;
      }
      const { data } = await supabase
        .from("hosts")
        .select("id,name,logo_url")
        .in("id", ids)
        .order("name");
      setHosts((data ?? []) as HostOpt[]);
    })();
  }, [user, loading, navigate]);

  // Load events whenever filters change (with cancellation)
  const ready = !loading && !!user;
  const { data: rows, loading: rowsLoading, error, refetch } = useAsyncResource<Row[]>(
    async (signal) => {
      if (!ready) return [];
      const { data, error } = await supabase
        .rpc("my_events", {
          p_host_ids: hostId ? [hostId] : undefined,
          p_from: fromStr ? new Date(fromStr).toISOString() : undefined,
          p_to: toStr ? new Date(toStr).toISOString() : undefined,
          p_search: search || undefined,
          p_time_filter: time,
          p_limit: PAGE_SIZE,
          p_offset: (page - 1) * PAGE_SIZE,
        })
        .abortSignal(signal);
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
    [ready, hostId, fromStr, toStr, search, time, page]
  );

  const list = rows ?? [];
  const total = list[0]?.total_count ? Number(list[0].total_count) : 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  }

  function resetFilters() {
    setSearchInput("");
    setParams(new URLSearchParams(), { replace: true });
  }

  const fromDate = useMemo(() => (fromStr ? new Date(fromStr) : null), [fromStr]);
  const toDate = useMemo(() => (toStr ? new Date(toStr) : null), [toStr]);
  const hasFilter = !!(hostId || search || fromStr || toStr) || time !== "upcoming";

  return (
    <><div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">My Events</h1>
            <p className="text-muted-foreground mt-1">
              Events across all hosts where you have a role.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title…"
                className="pl-8"
              />
            </div>
            <NativeSelect
              value={hostId}
              onChange={(e) => update({ host: e.target.value || null })}
            >
              <NativeSelectOption value="">All hosts</NativeSelectOption>
              {hosts.map((h) => (
                <NativeSelectOption key={h.id} value={h.id}>
                  {h.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <div className="w-[180px]">
              <DatePicker
                value={fromDate}
                onChange={(d) => update({ from: d ? d.toISOString() : null })}
                placeholder="From date"
              />
            </div>
            <div className="w-[180px]">
              <DatePicker
                value={toDate}
                onChange={(d) => update({ to: d ? d.toISOString() : null })}
                placeholder="To date"
              />
            </div>
            {hasFilter && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="mr-1 h-3 w-3" />
                Reset
              </Button>
            )}
          </CardContent>
        </Card>

        <Tabs value={time} onValueChange={(v) => update({ time: v })} className="mb-4">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {rowsLoading ? (
          <PageSpinner />
        ) : error ? (
          <ErrorState
            title="Couldn't load your events"
            description={error.message}
            onRetry={refetch}
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<CalendarBlankIcon className="h-8 w-8" />}
            title={hasFilter ? "No events match your filters" : "You don't have any events yet"}
            description={
              hasFilter
                ? "Try clearing the search or expanding the date range."
                : "Events from hosts where you're a host or checker will show up here."
            }
            action={hasFilter ? <Button variant="outline" size="sm" onClick={resetFilters}>Clear filters</Button> : undefined}
          />
        ) : (
          <div className="grid gap-3">
            {list.map((r) => (
              <MyEventRow key={r.event_id} row={r} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => update({ page: String(page - 1) })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => update({ page: String(page + 1) })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MyEventRow({ row }: { row: Row }) {
  const isHost = row.user_role === "host";
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Avatar className="h-10 w-10">
            {row.host_logo_url && <AvatarImage src={row.host_logo_url} alt={row.host_name} />}
            <AvatarFallback>{row.host_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge
                variant={row.status === "published" ? "default" : "secondary"}
                className="uppercase tracking-wide"
              >
                {row.status}
              </Badge>
              <Badge variant="outline" className="uppercase tracking-wide">
                {row.user_role}
              </Badge>
            </div>
            <h3 className="truncate text-base font-semibold">
              <Link to={`/e/${row.event_id}`} className="hover:underline">
                {row.title}
              </Link>
            </h3>
            <p className="text-xs text-muted-foreground">{row.host_name}</p>
            <EventDateTime
              startIso={row.start_at}
              endIso={row.end_at}
              timeZone={row.time_zone}
              variant="compact"
              className="mt-1 text-xs"
            />
          </div>
        </div>

        <div className="grid w-full grid-cols-3 gap-2 md:w-[320px]">
          <StatBox
            label="Going"
            value={Number(row.going_count)}
            icon={<Users className="h-3 w-3" />}
            suffix={row.capacity ? `/ ${row.capacity}` : ""}
          />
          <StatBox label="Waitlist" value={Number(row.waitlist_count)} icon={<Clock className="h-3 w-3" />} />
          <StatBox
            label="Checked"
            value={Number(row.checked_in_count)}
            icon={<CheckCircle2 className="h-3 w-3" />}
          />
        </div>

        <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
          <Button render={<Link to={`/e/${row.event_id}`} />} size="sm" variant="outline">
            View
          </Button>
          <Button render={<Link to={`/checkin/${row.event_id}`} />} size="sm" variant="outline">
            Check-in
          </Button>
          {isHost && (
            <Button render={<Link to={`/dashboard/${row.host_id}/events/${row.event_id}`} />} size="sm">
              Manage
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
