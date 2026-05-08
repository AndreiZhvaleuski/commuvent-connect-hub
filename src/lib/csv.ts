import Papa from "papaparse";
import { formatInTimeZone } from "date-fns-tz";

export type RsvpExportRow = {
  name: string;
  email: string;
  rsvp_status: string;
  check_in_time: string;
};

const HEADERS = ["Name", "Email", "RSVP Status", "Check-in Time (UTC)"] as const;

/** Format an ISO timestamp as UTC, seconds precision: 2026-06-12T17:04:31Z */
export function toUtcIso(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Kept for any UI usage that still wants event-tz formatting. */
export function toIsoInTz(iso: string | null | undefined, tz: string): string {
  if (!iso) return "";
  try {
    return formatInTimeZone(new Date(iso), tz || "UTC", "yyyy-MM-dd'T'HH:mm:ssXXX");
  } catch {
    return "";
  }
}

/** Prevent CSV formula injection in Excel / Sheets / Numbers. */
function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s === "") return "";
  const first = s.charCodeAt(0);
  // = + - @ \t \r
  if (first === 61 || first === 43 || first === 45 || first === 64 || first === 9 || first === 13) {
    return "'" + s;
  }
  return s;
}

export function buildCsv(rows: RsvpExportRow[]): Blob {
  const data = rows.map((r) => [
    sanitizeCell(r.name),
    sanitizeCell(r.email),
    sanitizeCell(r.rsvp_status),
    sanitizeCell(r.check_in_time),
  ]);
  const csv = Papa.unparse(
    { fields: [...HEADERS], data },
    { quotes: true, newline: "\r\n" }
  );
  // UTF-8 BOM ensures Excel + Sheets read non-ASCII correctly.
  return new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const EXAMPLE_RSVP_ROWS: RsvpExportRow[] = [
  { name: "Amélie Dupont", email: "amelie@example.com", rsvp_status: "going", check_in_time: "2026-06-12T17:04:31Z" },
  { name: "佐藤健", email: "ken.sato@example.com", rsvp_status: "going", check_in_time: "2026-06-12T17:07:02Z" },
  { name: "María José Núñez", email: "mj.nunez@example.com", rsvp_status: "going", check_in_time: "" },
  { name: "Øyvind Hansen", email: "oyvind@example.com", rsvp_status: "waitlist", check_in_time: "" },
  { name: "Иван Петров", email: "ivan.petrov@example.com", rsvp_status: "going", check_in_time: "2026-06-12T17:21:45Z" },
  { name: "O'Brien, Sean \"Sea\"", email: "=cmd|'/c calc'!A1", rsvp_status: "going", check_in_time: "2026-06-12T17:30:00Z" },
];
