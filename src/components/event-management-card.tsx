import { Link } from "react-router-dom";
import { UsersIcon as Users, ClockIcon as Clock, CheckCircleIcon as CheckCircle2 } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventDateTime } from "@/components/event-datetime";

export type ManagedEvent = {
  id: string; title: string; status: string; visibility: string;
  start_at: string; end_at: string; capacity: number; cover_image_url: string | null;
  time_zone?: string | null;
};
export type EventStat = { event_id: string; going_count: number; waitlist_count: number; checked_in_count: number };

export function EventManagementCard({ event, stat, hostId, showManage = true }: { event: ManagedEvent; stat?: EventStat; hostId: string; showManage?: boolean }) {
  const s = stat ?? { event_id: event.id, going_count: 0, waitlist_count: 0, checked_in_count: 0 };
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3 uppercase">
            <Badge variant={event.status === "published" ? "default" : "secondary"} className="uppercase tracking-wide">{event.status}</Badge>
            <Badge variant="outline" className="uppercase tracking-wide">{event.visibility}</Badge>
          </div>
          <CardTitle className="truncate">
            <Link to={`/e/${event.id}`} className="hover:underline">{event.title}</Link>
          </CardTitle>
          <EventDateTime
            startIso={event.start_at}
            endIso={event.end_at}
            timeZone={event.time_zone}
            variant="full"
            className="mt-2"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {showManage && <Button render={<Link to={`/dashboard/${hostId}/events/${event.id}`} />} size="sm">Manage</Button>}
          <Button render={<Link to={`/dashboard/${hostId}/events/${event.id}/edit`} />} size="sm" variant="outline">Edit</Button>
          <Button render={<Link to={`/dashboard/${hostId}/events/${event.id}/rsvps`} />} size="sm" variant="outline">RSVPs</Button>
          <Button render={<Link to={`/checkin/${event.id}`} />} size="sm" variant="outline">Check-in</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatBox label="Going" value={s.going_count} icon={<Users className="h-4 w-4" />} suffix={event.capacity ? `/ ${event.capacity}` : ""} />
          <StatBox label="Waitlist" value={s.waitlist_count} icon={<Clock className="h-4 w-4" />} />
          <StatBox label="Checked-in" value={s.checked_in_count} icon={<CheckCircle2 className="h-4 w-4" />} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, icon, suffix }: { label: string; value: number; icon: React.ReactNode; suffix?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}{suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}</div>
    </div>
  );
}
