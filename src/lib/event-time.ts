import { browserTz } from "@/lib/timezones";

const dateOnlyOpts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "2-digit", weekday: "short" };
const dateTimeOpts: Intl.DateTimeFormatOptions = { ...dateOnlyOpts, hour: "numeric", minute: "2-digit" };
const timeOnlyOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

function fmt(date: Date, tz: string, opts: Intl.DateTimeFormatOptions): string {
  try { return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: tz }).format(date); }
  catch { return date.toLocaleString(); }
}

function sameDayInTz(a: Date, b: Date, tz: string): boolean {
  try {
    const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    return f.format(a) === f.format(b);
  } catch { return a.toDateString() === b.toDateString(); }
}

export function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms <= 0) return "";
  const totalMin = Math.round(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(" ") || "0m";
}

export function formatRangeInTz(startIso: string, endIso: string, tz: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const start = fmt(s, tz, dateTimeOpts);
  const end = sameDayInTz(s, e, tz) ? fmt(e, tz, timeOnlyOpts) : fmt(e, tz, dateTimeOpts);
  return `${start} – ${end}`;
}

export type EventTimeInfo = {
  eventTz: string;
  userTz: string;
  sameTz: boolean;
  duration: string;
  rangeEvent: string;
  rangeUser: string;
};

export function getEventTimeInfo(startIso: string, endIso: string, timeZone: string | null | undefined): EventTimeInfo {
  const eventTz = timeZone || "UTC";
  const userTz = browserTz();
  const sameTz = eventTz === userTz;
  return {
    eventTz,
    userTz,
    sameTz,
    duration: formatDuration(startIso, endIso),
    rangeEvent: formatRangeInTz(startIso, endIso, eventTz),
    rangeUser: formatRangeInTz(startIso, endIso, userTz),
  };
}
