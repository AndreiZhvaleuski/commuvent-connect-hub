type CalEvent = {
  title: string;
  description?: string | null;
  location?: string | null;
  startISO: string;
  endISO: string;
  url?: string | null;
};

const stamp = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function googleCalendarUrl(e: CalEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.startISO)}/${stamp(e.endISO)}`,
    details: [e.description ?? "", e.url ? `\n\n${e.url}` : ""].join(""),
    location: e.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeICS(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildICS(e: CalEvent & { uid: string }): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Commuvent//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(e.startISO)}`,
    `DTEND:${stamp(e.endISO)}`,
    `SUMMARY:${escapeICS(e.title)}`,
    e.description ? `DESCRIPTION:${escapeICS(e.description)}` : "",
    e.location ? `LOCATION:${escapeICS(e.location)}` : "",
    e.url ? `URL:${e.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function downloadICS(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
