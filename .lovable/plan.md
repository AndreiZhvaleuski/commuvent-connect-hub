## Goal
Make the RSVP CSV export robust by relying on a proper CSV library (PapaParse, already a dependency), keep the on-screen table in the viewer's local time zone, and emit check-in times as UTC in the file.

## Library
Continue using **PapaParse** (`papaparse` is already in `package.json` and powers `buildCsv`). It correctly handles:
- field quoting and embedded `"` escaping (`""`)
- commas, newlines, and unicode inside cells
- explicit column ordering and CRLF line endings

No new dependency needed.

## Changes — `src/lib/csv.ts`

1. Replace the hand-rolled `RsvpExportRow` plumbing with PapaParse driven by an explicit `fields` + `data` shape so we control header text and column order.
2. **Friendly headers**: `Name`, `Email`, `RSVP Status`, `Check-in Time (UTC)`.
3. **UTC formatter**: add `toUtcIso(iso)` that returns `YYYY-MM-DDTHH:mm:ssZ` (UTC, seconds precision). Drop the event-TZ formatter from the export path.
4. **Formula-injection guard**: small `sanitizeCell(value)` helper — if a string starts with `=`, `+`, `-`, `@`, `\t`, or `\r`, prefix with `'`. Apply to every cell before unparse.
5. **Excel/Sheets compatibility**: pass `{ quotes: true, newline: "\r\n" }` to `Papa.unparse`; keep the leading UTF-8 BOM (`\uFEFF`) and `text/csv;charset=utf-8` MIME on the Blob.
6. Update `EXAMPLE_RSVP_ROWS` so check-in times are UTC (`...Z`) and add one row exercising edge cases (comma in name, embedded quote, leading `=`, non-ASCII) for the About-page sample download.

## Changes — `src/pages/EventRsvps.tsx`

1. **Export**: build rows via the new helper, mapping each check-in time through `toUtcIso(...)` instead of `toIsoInTz(..., event.time_zone)`.
2. **Table (viewer-friendly)**: render `check_in_time` using the viewer's local time zone (Intl.DateTimeFormat with `dateStyle: "medium", timeStyle: "short"`). Show a small "(your time)" hint in the column header, and add a one-liner under the Export button: "CSV uses UTC timestamps."
3. No data-fetching changes.

## Out of scope
- Separate attendance-only export.
- Surfacing the export from Check-In or Event Manage pages.
- Server-side export.
