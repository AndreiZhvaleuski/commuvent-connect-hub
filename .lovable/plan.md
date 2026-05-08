## Goal
On every data-fetching page, show the skeleton loader whenever a fetch is in flight (never show stale results), and show a clear error state with a retry action when a fetch fails.

## Changes

### 1. `src/hooks/use-async-resource.ts`
- Keep default `keepPreviousData: false`. On every deps change: clear `data` to `null`, set `loading=true`, clear `error`. This guarantees consumers can render skeleton/error/data in three mutually exclusive branches.

### 2. `src/pages/Explore.tsx`
- Drop `keepPreviousData: true` from the `useAsyncResource` options. Keep `debounceMs: 250`.
- Render order:
  1. `loading` → `SkeletonGrid`
  2. `error` → `ErrorState` with `onRetry={refetch}`
  3. empty → `EmptyState`
  4. otherwise the list (no `opacity-60` dimming since stale data is gone).

### 3. `src/pages/MyEvents.tsx`
- Same change: remove `keepPreviousData`, render `SkeletonGrid` whenever `loading`, then `ErrorState` on `error` with retry, then `EmptyState`, then the list.

### 4. `src/pages/HostDashboard.tsx`
- Replace the manual `useEffect` + `setBusy` flow with `useAsyncResource` so it benefits from the same loading/error/cancel behavior. Fetcher loads host membership, host record, events, and stats together and returns one shape.
- Render branches inside the page shell:
  1. `loading` → `SkeletonGrid` (header + grid placeholders)
  2. `error` → `ErrorState` with `onRetry={refetch}`
  3. data missing host → "Host not found" copy as today
  4. otherwise the dashboard
- Realtime subscription stays; on change it calls `refetch()` instead of a separate `loadStats`.

## Notes
- `ErrorState` and `SkeletonGrid` already exist; no new components needed.
- No DB, RPC, or business-logic changes.

## Out of scope
- Other pages (EventPage, EventManage, EventRsvps, Tickets, HostPublic, Dashboard, Moderation). If you want the same treatment applied everywhere, say so and I'll extend the refactor.
