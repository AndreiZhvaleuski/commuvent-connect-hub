import Papa from "papaparse";
import { formatInTimeZone } from "date-fns-tz";

export type RsvpExportRow = {
  name: string;
  email: string;
  rsvp_status: string;
  check_in_time: string;
};

export function toIsoInTz(iso: string | null | undefined, tz: string): string {
  if (!iso) return "";
  try {
    return formatInTimeZone(new Date(iso), tz || "UTC", "yyyy-MM-dd'T'HH:mm:ssXXX");
  } catch {
    return "";
  }
}

export function buildCsv(rows: RsvpExportRow[]): Blob {
  const csv = Papa.unparse(rows, {
    columns: ["name", "email", "rsvp_status", "check_in_time"],
    quotes: true,
  });
  // UTF-8 BOM ensures Excel + Sheets read non-ASCII correctly
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
  { name: "Amélie Dupont", email: "amelie@example.com", rsvp_status: "going", check_in_time: "2026-06-12T19:04:31+02:00" },
  { name: "佐藤健", email: "ken.sato@example.com", rsvp_status: "going", check_in_time: "2026-06-12T19:07:02+02:00" },
  { name: "María José Núñez", email: "mj.nunez@example.com", rsvp_status: "going", check_in_time: "" },
  { name: "Øyvind Hansen", email: "oyvind@example.com", rsvp_status: "waitlist", check_in_time: "" },
  { name: "Иван Петров", email: "ivan.petrov@example.com", rsvp_status: "going", check_in_time: "2026-06-12T19:21:45+02:00" },
];
