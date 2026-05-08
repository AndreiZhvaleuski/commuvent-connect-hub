# Single-request EventPage load

Yes — the 5 conditional reads on mount (event, host, going count, my RSVP, my check-in, my host role) can collapse into **one** Supabase RPC that returns a single JSON payload. Realtime stays separate (it only refetches the going count) and mutations stay separate.

## New DB function

```sql
create or replace function public.event_page_load(p_event_id uuid)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  with ev as (
    select * from public.events where id = p_event_id
  ),
  h as (
    select id, name, logo_url, bio, contact_email
    from public.hosts where id = (select host_id from ev)
  ),
  my_rsvp as (
    select id, status, position, code, cancelled_at
    from public.rsvps
    where event_id = p_event_id and user_id = auth.uid()
    limit 1
  ),
  my_ci as (
    select 1 as checked_in
    from public.check_ins
    where rsvp_id = (select id from my_rsvp) and undone = false
    limit 1
  ),
  my_role as (
    select role from public.host_members
    where host_id = (select host_id from ev) and user_id = auth.uid()
    limit 1
  )
  select jsonb_build_object(
    'event',        (select to_jsonb(ev)  from ev),
    'host',         (select to_jsonb(h)   from h),
    'going_count',  public.event_going_count(p_event_id),
    'my_rsvp',      (select to_jsonb(my_rsvp) from my_rsvp),
    'checked_in',   exists(select 1 from my_ci),
    'my_host_role', (select role from my_role)
  );
$$;
```

RLS still applies via the underlying tables / `event_going_count`. Anonymous callers just get `my_rsvp = null`, `checked_in = false`, `my_host_role = null`.

## Client changes (`src/pages/EventPage.tsx`)

- Replace the entire mount-time fetch block with one `useAsyncResource` call:
  ```ts
  const { data, loading, error, refetch } = useAsyncResource(
    (signal) => supabase.rpc('event_page_load', { p_event_id: eventId }).abortSignal(signal),
    [eventId]
  );
  ```
- Derive `event`, `host`, `goingCount`, `myRsvp`, `checkedIn`, `isHost` from `data`.
- Keep the realtime channel, but instead of a second RPC, just call `refetch()` (or, to avoid refetching everything, keep the lightweight `event_going_count` RPC for that one update — recommended, since RSVP changes shouldn't reload host/role/etc.).
- Render `Spinner` / `ErrorState` / `EmptyState` (event not found) consistently.
- Mutations (RSVP create/cancel/report) stay as today, wrapped in `useAsyncAction`, calling `refetch()` on success.

## Net effect

- Mount: 5 round-trips → **1**.
- Realtime: unchanged (1 lightweight RPC on RSVP change).
- Mutations: unchanged in count, gain consistent loading/disabled/toast behavior via `useAsyncAction`.

## Out of scope

- No changes to other pages in this step.
- No change to RSVP / report / check-in mutation endpoints.
