import { Link } from "react-router-dom";
import { CalendarIcon as Calendar, UsersIcon as Users, ClockIcon as Clock, CheckCircleIcon as CheckCircle2, GlobeIcon as Globe, HourglassIcon as Hourglass } from "@phosphor-icons/react";
import { formatInTimeZone } from "date-fns-tz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { browserTz } from "@/lib/timezones";

export type ManagedEvent = {
  id: string; title: string; status: string; visibility: string;
  start_at: string; end_at: string; capacity: number; cover_image_url: string | null;
  time_zone?: string | null;
};
export type EventStat = { event_id: string; going_count: number; waitlist_count: number; checked_in_count: number };

function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms <= 0) return "";
  const totalMin = Math.round(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins) parts.push(`${mins}m`);
  return parts.join(" ");
}

function formatRange(startIso: string, endIso: string, tz: string): string {
  try {
    const start = formatInTimeZone(new Date(startIso), tz, "EEE, MMM d · h:mm a");
    const sameDay = formatInTimeZone(new Date(startIso), tz, "yyyy-MM-dd") ===
      formatInTimeZone(new Date(endIso), tz, "yyyy-MM-dd");
    const end = sameDay
      ? formatInTimeZone(new Date(endIso), tz, "h:mm a")
      : formatInTimeZone(new Date(endIso), tz, "EEE, MMM d · h:mm a");
    return `${start} – ${end}`;
  } catch {
    return `${new Date(startIso).toLocaleString()} – ${new Date(endIso).toLocaleString()}`;
  }
}

export function EventManagementCard({ event, stat, hostId }: { event: ManagedEvent; stat?: EventStat; hostId: string }) {
  const s = stat ?? { event_id: event.id, going_count: 0, waitlist_count: 0, checked_in_count: 0 };
  const eventTz = event.time_zone || "UTC";
  const userTz = browserTz();
  const sameTz = eventTz === userTz;
  const duration = formatDuration(event.start_at, event.end_at);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3 uppercase">
            <Badge variant={event.status === "published" ? "default" : "secondary"} className="uppercase tracking-wide">{event.status}</Badge>
            <Badge variant="outline" className="uppercase tracking-wide">{event.visibility}</Badge>
          </div>
          <CardTitle className="truncate">{event.title}</CardTitle>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p className="inline-flex items-center gap-1.5">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{formatRange(event.start_at, event.end_at, eventTz)}</span>
              <span className="opacity-70">({eventTz})</span>
            </p>
            {!sameTz && (
              <p className="inline-flex items-center gap-1.5">
                <Globe className="h-3 w-3 shrink-0" />
                <span>{formatRange(event.start_at, event.end_at, userTz)}</span>
                <span className="opacity-70">(your time · {userTz})</span>
              </p>
            )}
            {duration && (
              <p className="inline-flex items-center gap-1.5">
                <Hourglass className="h-3 w-3 shrink-0" />
                <span>Duration: {duration}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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
