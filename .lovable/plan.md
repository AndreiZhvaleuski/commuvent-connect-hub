## Goal

Unify how event start/end/timezone/duration are displayed across all event-related surfaces.

## Format spec (from your answers)

- **Date/time style:** browser locale (`Intl.DateTimeFormat` with no explicit locale = user default), `dateStyle: 'medium'`, `timeStyle: 'short'`.
- **Range + duration:** `"<start> – <end> · <duration>"`. When start/end fall on the same day in the chosen TZ, omit the date from the end side: `"Fri, May 15, 7:00 PM – 9:00 PM · 2h"`.
- **Timezones:** always show two lines when event TZ ≠ viewer TZ:
  - Line 1: range in **event TZ** with `(<event tz>)` suffix.
  - Line 2: range in **user TZ** with `(your time · <user tz>)` suffix.
  - When they match, just one line (no parenthetical).
- **Duration:** `Xd Yh Zm` (omit zero parts), e.g. `2h`, `1d 4h`, `45m`.

## Shared module

Create `src/lib/event-time.ts` exporting:

```ts
formatEventRange(startIso, endIso, eventTz): { eventTz: string; userTz: string | null; sameTz: boolean; duration: string }
```

Each `eventTz`/`userTz` is the formatted "range + duration" string described above. Built on `Intl.DateTimeFormat` (timeZone option) — no `date-fns-tz` dependency needed for the strings.

Plus a small React helper `<EventDateTime startIso endIso timeZone variant="full" | "compact" />`:
- `variant="full"`: stacked Calendar + Hourglass icons, two TZ lines + duration line. Used on EventPage and EventManagementCard.
- `variant="compact"`: single line `"<event-tz range> · <duration>"`, with a tooltip showing the user-TZ range + duration when different. Used on Explore, Index, HostPublic, Tickets, dashboard list rows.

## Sites to migrate

| File | Current | New |
|---|---|---|
| `src/pages/EventPage.tsx` | custom `fmt`/`fmtLocal`, no duration, tooltip | `<EventDateTime variant="full">` |
| `src/components/event-management-card.tsx` | own formatRange + duration | `<EventDateTime variant="full">` (drop local helpers) |
| `src/pages/Explore.tsx` | `new Date(start_at).toLocaleString()` | `<EventDateTime variant="compact" timeZone={e.time_zone}>` — also add `time_zone` to the select |
| `src/pages/Index.tsx` | `toLocaleString()` | `<EventDateTime variant="compact">` — add `time_zone` to select |
| `src/pages/HostPublic.tsx` | `toLocaleString()` | `<EventDateTime variant="compact">` — add `time_zone` to select |
| `src/pages/Tickets.tsx` | `toLocaleString()` (line 164) | `<EventDateTime variant="compact">` — already selects `time_zone` |

Selects that need `time_zone` added: Explore, Index, HostPublic.

## Out of scope

- `EventEditor.tsx` (input fields, not display).
- `EventRsvps.tsx` `check_in_time` (per-row check-in timestamp, not event date).
- `Moderation.tsx` report timestamps.
- ICS generation in `Tickets.tsx` (already correct).

## Cleanup

- Remove `formatInTimeZone` calls and the local `formatRange`/`formatDuration` helpers in `EventPage.tsx` and `event-management-card.tsx` (move logic into `event-time.ts`).
- Keep `date-fns-tz` for `EventEditor` validation if still used; otherwise leave as-is (no removal in this pass).