import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EnvelopeIcon as Mail, ShareIcon, GearIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { PublicEventCard, type PublicEvent } from "@/components/public-event-card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import { EventListControls, type EventView, type EventSortDir } from "@/components/event-list-controls";
import { ListPagination } from "@/components/list-pagination";

type Host = { id: string; name: string; bio: string | null; logo_url: string | null; contact_email: string | null };
type Ev = PublicEvent;

const PAGE_SIZE = 6;

type LoadResult = {
  host: Host | null;
  events: Ev[];
  total: number;
  counts: { upcoming: number; past: number };
  canManage: boolean;
};

export default function HostPublic() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [view, setView] = useState<EventView>("upcoming");
  const [sortDir, setSortDir] = useState<EventSortDir>("asc");
  const [page, setPage] = useState(1);

  const userId = user?.id ?? null;

  const { data, loading: busy, error, refetch } = useAsyncResource<LoadResult>(
    async (signal) => {
      const empty: LoadResult = { host: null, events: [], total: 0, counts: { upcoming: 0, past: 0 }, canManage: false };
      if (!id) return empty;

      const { data: h, error: hErr } = await supabase
        .from("hosts")
        .select("id,name,bio,logo_url,contact_email")
        .eq("id", id)
        .abortSignal(signal)
        .maybeSingle();
      if (hErr) throw new Error(hErr.message);
      if (!h) return empty;

      const nowIso = new Date().toISOString();
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const baseSelect = "id,title,cover_image_url,start_at,end_at,time_zone,venue_address,online_url";
      const baseFilters = (q: ReturnType<typeof supabase.from>) =>
        q.eq("host_id", h.id).eq("status", "published").eq("visibility", "public");

      const pageQuery = baseFilters(
        supabase.from("events").select(baseSelect, { count: "exact" }),
      )
        .filter("end_at", view === "upcoming" ? "gte" : "lt", nowIso)
        .order("start_at", { ascending: sortDir === "asc" })
        .range(from, to)
        .abortSignal(signal);

      const upcomingCount = baseFilters(
        supabase.from("events").select("id", { count: "exact", head: true }),
      ).filter("end_at", "gte", nowIso).abortSignal(signal);

      const pastCount = baseFilters(
        supabase.from("events").select("id", { count: "exact", head: true }),
      ).filter("end_at", "lt", nowIso).abortSignal(signal);

      const memberQuery = userId
        ? supabase
            .from("host_members")
            .select("role")
            .eq("host_id", h.id)
            .eq("user_id", userId)
            .abortSignal(signal)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });

      const [pageRes, upRes, pastRes, memRes] = await Promise.all([
        pageQuery,
        upcomingCount,
        pastCount,
        memberQuery,
      ]);
      if (pageRes.error) throw new Error(pageRes.error.message);
      if (upRes.error) throw new Error(upRes.error.message);
      if (pastRes.error) throw new Error(pastRes.error.message);

      return {
        host: h as Host,
        events: ((pageRes.data ?? []) as unknown) as Ev[],
        total: pageRes.count ?? 0,
        counts: { upcoming: upRes.count ?? 0, past: pastRes.count ?? 0 },
        canManage: (memRes as { data: { role: string } | null }).data?.role === "host",
      };
    },
    [id, userId, view, sortDir, page],
    { keepPreviousData: true },
  );

  const host = data?.host ?? null;
  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const counts = data?.counts ?? { upcoming: 0, past: 0 };
  const canManage = !!data?.canManage;
  const notFound = !busy && !error && data !== null && data.host === null;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const changeView = (v: EventView) => { setView(v); setPage(1); };
  const changeSort = (s: EventSortDir) => { setSortDir(s); setPage(1); };

  if (error) return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <ErrorState description={error.message} onRetry={refetch} />
    </div>
  );
  if (notFound) return <div className="container mx-auto px-4 py-20 text-center"><p className="text-muted-foreground">Host not found.</p></div>;
  if ((busy && !data) || !host) return <div className="container mx-auto flex justify-center px-4 py-20"><Spinner className="size-8 text-muted-foreground" /></div>;

  return (
    <>
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
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  const shareUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-preview?type=host&id=${host.id}`;
                  await navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copied! Share it anywhere to show a preview.");
                }}>
                  <ShareIcon className="mr-1 h-4 w-4" />Share this page
                </Button>
                {canManage && (
                  <Button render={<Link to={`/dashboard/${host.id}`} />} variant="outline" size="sm">
                    <GearIcon className="mr-1 h-4 w-4" />Manage
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 max-w-4xl">
        <EventListControls
          view={view}
          onViewChange={changeView}
          sortDir={sortDir}
          onSortChange={changeSort}
          upcomingCount={counts.upcoming}
          pastCount={counts.past}
        />

        <div className="pt-4">
          {busy ? (
            <div className="flex justify-center py-12"><Spinner className="size-8 text-muted-foreground" /></div>
          ) : events.length === 0 ? (
            <EmptyState title={view === "upcoming" ? "No upcoming events." : "No past events."} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map((e) => (
                <PublicEventCard key={e.id} event={e} showStatusBadge={view === "past"} />
              ))}
            </div>
          )}
        </div>

        <ListPagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
      </section>
    </>
  );
}
