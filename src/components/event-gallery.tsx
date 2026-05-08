import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

type Photo = { id: string; storage_path: string };

const PUBLIC_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/gallery/`;
const PREVIEW_COUNT = 6;

export function EventGallery({ eventId }: { eventId: string }) {
  const { data, loading } = useAsyncResource<{ photos: Photo[]; total: number }>(
    async (signal) => {
      const { data: rows, count } = await supabase
        .from("gallery_photos")
        .select("id,storage_path", { count: "exact" })
        .eq("event_id", eventId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .abortSignal(signal)
        .limit(PREVIEW_COUNT);
      return { photos: (rows ?? []) as Photo[], total: count ?? 0 };
    },
    [eventId],
    { keepPreviousData: true }
  );

  const photos = data?.photos ?? [];
  const total = data?.total ?? 0;

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Gallery{total > 0 ? ` · ${total}` : ""}</CardTitle>
        <Button render={<Link to={`/e/${eventId}/gallery`} />} size="sm" variant="outline">
          View all<ArrowRightIcon className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading && photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : photos.length === 0 ? (
          <EmptyState title="No photos yet" description="Open the gallery page to share the first one." />
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {photos.map((p) => (
              <Link
                key={p.id}
                to={`/e/${eventId}/gallery`}
                className="group relative block overflow-hidden rounded-md border bg-muted"
              >
                <img
                  src={PUBLIC_BASE + p.storage_path}
                  alt="Event photo"
                  loading="lazy"
                  className="aspect-square w-full object-cover transition group-hover:scale-[1.03]"
                />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
