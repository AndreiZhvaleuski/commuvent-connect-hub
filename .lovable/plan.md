## Goal

Refactor `src/pages/HostDashboard.tsx` so the host header doesn't flicker when events refetch, events use a proper paginated `useAsyncResource` with all states covered, and tab/sort/page are reflected in the URL.

## Changes

### 1. Split into two independent resources

Two `useAsyncResource` calls in `HostDashboard`:

- `**headerResource**` — fetches host (`hosts`) + current user's `role` from `host_members`. Deps: `[ready, hostId, user?.id]`. Drives the header (avatar, name, action buttons, "checker" badge). Once loaded, it stays mounted and is unaffected by event filter/sort/page changes.
- `**eventsResource**` — fetches a single page of events plus their stats. Deps: `[ready, hostId, user?.id, role, tab, sortDir, page]`. The list should show loader indicator.

### 2. Server-side filtering, sorting, pagination

In the events fetcher:

- Apply tab filter on the server: `upcoming` → `.gte("end_at", now)`, `past` → `.lt("end_at", now)`.
- Apply sort on the server: `.order("start_at", { ascending: sortDir === "asc" })`.
- Page with `.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)` and `select(..., { count: "exact" })` to get `total`.
- Keep checker restriction (`status = 'published'`).
- Fetch `event_stats` once per page (same RPC) and build the `statsMap` for the returned event ids only.
- Return `{ events, total }`.

`PAGE_SIZE` constant (e.g. 10).

### 3. URL persistence

Reads/writes via `useSearchParams`:

- `tab` — `upcoming` (default, omitted) | `past`
- `sort` — `asc` (default, omitted) | `desc`
- `page` — `1`-based, omitted when 1

Changing any control resets `page` to 1 (except page changes themselves). All updates use `replace: true` to avoid polluting history.

### 4. All states covered for the events section

Inside the events panel (header always renders independently as long as `headerResource` succeeded):

- **Loading (initial)** — skeleton list (a few placeholder cards). Only when `eventsResource.loading && !data`.
- **Refetching** — show a `Spinner` using existing component.
- **Error** — `ErrorState` with `onRetry={refetch}`.
- **Empty** — existing `EmptyState` with tab-appropriate copy.
- **Success** — list of `EventManagementCard` + pagination footer.

Header section gets its own loading skeleton + error state, separate from events.

### 5. Tab counts

`EventListControls` currently shows `(upcoming.length)` / `(past.length)`. With server-side pagination we no longer have both lists in memory. Two options handled in plan:

- Add two small `head: true, count: "exact"` count queries inside `headerResource` (one for upcoming, one for past) so counts load with the header and stay stable across page navigation. This keeps the existing `EventListControls` API intact.

### 6. Pagination UI

A simple footer below the list:

```text
[ Prev ]   Page X of Y   [ Next ]   (N total)
```

Buttons disabled at bounds; hidden entirely when `total <= PAGE_SIZE`. Use existing pagination approach on all other pages.

### 7. Realtime

Keep the existing realtime channel, but only call `eventsResource.refetch()` (stats live there now). Header counts also benefit, so also call `headerResource.refetch()` on `rsvps` / `check_ins` changes (cheap, just two count queries + host row from cache).

## Files touched

- `src/pages/HostDashboard.tsx` — main refactor.
- `src/components/event-list-controls.tsx` — no API change needed; counts still passed in from header resource.
- (new) small inline `Pagination` controls inside `HostDashboard.tsx`, or a tiny `src/components/pagination-controls.tsx` if it stays clean.

## Out of scope

- No DB schema or RPC changes.
- No changes to `EventManagementCard` or other pages.