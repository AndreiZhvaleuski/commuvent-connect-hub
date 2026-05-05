// Common IANA timezones. Falls back to Intl.supportedValuesOf when available.
const FALLBACK = [
  "UTC",
  "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "America/Toronto","America/Mexico_City","America/Sao_Paulo","America/Argentina/Buenos_Aires",
  "Europe/London","Europe/Dublin","Europe/Paris","Europe/Berlin","Europe/Madrid",
  "Europe/Amsterdam","Europe/Stockholm","Europe/Warsaw","Europe/Athens","Europe/Istanbul",
  "Africa/Lagos","Africa/Cairo","Africa/Johannesburg",
  "Asia/Dubai","Asia/Karachi","Asia/Kolkata","Asia/Bangkok","Asia/Singapore",
  "Asia/Hong_Kong","Asia/Shanghai","Asia/Tokyo","Asia/Seoul",
  "Australia/Perth","Australia/Sydney","Pacific/Auckland",
];

export function listTimezones(): string[] {
  // @ts-expect-error not in older TS lib
  const fn = (Intl as any).supportedValuesOf;
  if (typeof fn === "function") {
    try { return fn("timeZone") as string[]; } catch { /* noop */ }
  }
  return FALLBACK;
}

export function browserTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  catch { return "UTC"; }
}
