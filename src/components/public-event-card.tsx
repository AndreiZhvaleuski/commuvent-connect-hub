import { Link } from "react-router-dom";
import { MapPinIcon as MapPin } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventDateTime } from "@/components/event-datetime";
import { cn } from "@/lib/utils";

export type PublicEvent = {
  id: string;
  title: string;
  cover_image_url: string | null;
  start_at: string;
  end_at: string;
  time_zone: string | null;
  venue_address: string | null;
  online_url: string | null;
};

type Props = {
  event: PublicEvent;
  /** Show an "Ended" / "Upcoming" status pill (used on Explore when past events are mixed in). */
  showStatusBadge?: boolean;
};

export function PublicEventCard({ event: e, showStatusBadge = false }: Props) {
  const ended = new Date(e.end_at).getTime() < Date.now();
  return (
    <Link to={`/e/${e.id}`} className="block min-w-0">
      <Card className={cn("h-full w-full min-w-0 overflow-hidden transition hover:shadow-md hover:-translate-y-0.5", e.cover_image_url && "pt-0")}>
        {e.cover_image_url && (
          <div className="relative aspect-video overflow-hidden rounded-t-xl bg-muted">
            <img
              src={e.cover_image_url}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl"
            />
            <div className="absolute inset-0 bg-background/20" />
            <img
              src={e.cover_image_url}
              alt={e.title}
              className="relative z-10 mx-auto h-full w-auto max-w-full object-contain"
            />
            {showStatusBadge && (
              <span
                className={cn(
                  "absolute left-2 top-2 z-20 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow",
                  ended ? "bg-red-600" : "bg-emerald-600"
                )}
              >
                {ended ? "Ended" : "Upcoming"}
              </span>
            )}
          </div>
        )}
        <CardHeader className="min-w-0">
          {showStatusBadge && !e.cover_image_url && (
            <Badge
              variant="secondary"
              className={cn("w-fit mb-1 text-white", ended ? "bg-red-600" : "bg-emerald-600")}
            >
              {ended ? "Ended" : "Upcoming"}
            </Badge>
          )}
          <CardTitle className="line-clamp-2 break-words">{e.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground min-w-0">
          <div className="break-words">
            <EventDateTime startIso={e.start_at} endIso={e.end_at} timeZone={e.time_zone} variant="compact" />
          </div>
          {(e.venue_address || e.online_url) && (
            <div className="flex items-start gap-2 min-w-0">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="break-words line-clamp-2 min-w-0">{e.venue_address ?? "Online"}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
