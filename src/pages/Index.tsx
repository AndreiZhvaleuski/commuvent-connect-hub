import { Link } from "react-router-dom";
import { ArrowRightIcon as ArrowRight, UsersIcon as Users } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { PublicEventCard } from "@/components/public-event-card";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { useAsyncResource } from "@/hooks/use-async-resource";

type Ev = {
  id: string; title: string; description: string | null;
  cover_image_url: string | null; start_at: string; end_at: string; time_zone: string | null;
  venue_address: string | null; online_url: string | null;
};

export default function Index() {
  const { data: events, loading, error, refetch } = useAsyncResource<Ev[]>(
    async (signal) => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,cover_image_url,start_at,end_at,time_zone,venue_address,online_url")
        .eq("status", "published").eq("visibility", "public")
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(3)
        .abortSignal(signal);
      if (error) throw new Error(error.message);
      return (data ?? []) as Ev[];
    },
    []
  );

  const list = events ?? [];

  return (
    <><section className="relative overflow-hidden border-b">
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

        {error ? (
          <ErrorState
            title="Couldn't load events"
            description={error.message}
            onRetry={refetch}
          />
        ) : loading ? (
          <div className="flex justify-center py-16"><Spinner className="size-8 text-muted-foreground" /></div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="No upcoming events yet"
            description="Be the first — host one for your community."
            action={<Button render={<Link to="/become-a-host" />}>Become a host</Button>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => (
              <PublicEventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
