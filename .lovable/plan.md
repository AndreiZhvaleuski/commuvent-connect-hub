## Goal
Reusable async-list primitives so MyEvents and Explore both get: proper loading state, request cancellation when filters change, distinct empty state, distinct **error state**, and consistent skeletons.

## New reusable pieces

### 1. `src/hooks/use-async-resource.ts`
Generic hook keyed by deps, with cancellation.

```ts
type State<T> = { data: T | null; loading: boolean; error: Error | null };

useAsyncResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  opts?: { debounceMs?: number; keepPreviousData?: boolean }
): State<T> & { refetch: () => void }
```

Behavior:
- On deps change: optional debounce, set `loading=true` (keep previous data if `keepPreviousData`), call fetcher with a fresh `AbortController.signal`.
- On unmount or new run: abort previous controller; ignore stale results.
- Catch `AbortError` silently. Other errors surfaced via `error`.
- `refetch()` re-runs current deps.

### 2. `src/components/empty-state.tsx`
Single shared empty state (used inside a `Card`):

```tsx
<EmptyState
  icon={<CalendarSlashIcon ... />}
  title="No events match your filters"
  description="Try clearing the search or expanding the date range."
  action={<Button onClick={clear}>Clear filters</Button>}
/>
```

### 3. `src/components/error-state.tsx`
Shared error state mirroring EmptyState's API:

```tsx
<ErrorState
  title="Couldn't load events"
  description={error.message}
  onRetry={refetch}
/>
```
- Uses a destructive-toned icon (`WarningCircleIcon`).
- Renders a "Try again" button when `onRetry` is provided.

### 4. `src/components/skeleton-grid.tsx`
Renders N pulsing `Card` placeholders given a className grid layout. Used by both pages.

## Refactor `src/pages/MyEvents.tsx`
- Replace inline `useEffect` + `setBusy` + `setRows` with `useAsyncResource` keyed on the filter values.
- Pass the abort signal to `supabase.rpc(...).abortSignal(signal)` to cancel in-flight requests.
- Render order:
  1. `loading && !data` → `SkeletonGrid`
  2. `error` → `ErrorState` with `onRetry={refetch}`
  3. `data.length === 0` → `EmptyState` (with Reset action when filters active; "You have no events yet" copy when not)
  4. otherwise the list (with a subtle top opacity dim when `loading && data` to indicate refetch)
- Keep previous data while refetching so the list doesn't flash.
- Total/pagination derived from `data` like today.

## Refactor `src/pages/Explore.tsx`
- Same migration with `debounceMs: 250` and `.abortSignal(signal)` on the Supabase query.
- Replace skeletons with `SkeletonGrid`, empty card with `EmptyState`, and add `ErrorState` for fetch failures.
- Two empty copies: "No events match your filters" (clear-filters action) vs "No published events yet" (no action).

## Notes
- `supabase-js` v2 supports `.abortSignal(signal)` on PostgREST builders and `rpc(...)`. We'll use it everywhere.
- AbortError from supabase comes through as a thrown error in `await`; the hook checks `signal.aborted` and `error.name === 'AbortError'` (and `code === '20'`) to suppress.
- No DB or RPC changes.

## Out of scope
- Pagination changes, infinite scroll, global error toasts (in-card error UI is enough).
