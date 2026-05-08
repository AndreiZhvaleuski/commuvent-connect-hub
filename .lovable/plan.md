## Goal

Complete host dashboard + operations: ensure stats accuracy, add email to CSV exports, build the My Events aggregation page with server-side filtering and pagination.

## Current state

- HostDashboard already lists Upcoming/Past with Going/Waitlist/Checked-in via `event_stats` RPC (working, with realtime).
- EventRsvps already exports CSV with name/status/check-in time, but **email is blank** (TODO in code).
- `/my-events` route renders a `Placeholder` — needs implementation.

## Changes

### 1. RSVP CSV export — include email

File: `src/pages/EventRsvps.tsx`

- Select `email` from `profiles` alongside `display_name`; map into `Row.email`.
- CSV format unchanged (BOM + UTF-8 already correct for Excel/Sheets).

### 2. New page: `/my-events` with server-side filtering + pagination

#### DB migration — new RPC `my_events`

Returns paginated events the user has any role on, with stats joined and filters applied server-side.

```sql
create or replace function public.my_events(
  p_host_ids uuid[] default null,    -- null = all hosts user belongs to
  p_from timestamptz default null,
  p_to   timestamptz default null,
  p_search text default null,        -- ilike on title
  p_time_filter text default 'upcoming', -- 'upcoming' | 'past' | 'all'
  p_limit int default 20,
  p_offset int default 0
) returns table (
  event_id uuid, title text, status text, visibility text,
  start_at timestamptz, end_at timestamptz, capacity int,
  cover_image_url text, time_zone text,
  host_id uuid, host_name text, host_logo_url text,
  user_role text,
  going_count bigint, waitlist_count bigint, checked_in_count bigint,
  total_count bigint   -- window count for pagination
) language sql stable security definer set search_path = public as $$
  with my as (
    select hm.host_id, hm.role
    from public.host_members hm
    where hm.user_id = auth.uid()
  ),
  filtered as (
    select e.*, h.name as host_name, h.logo_url as host_logo_url, my.role as user_role
    from public.events e
    join my on my.host_id = e.host_id
    join public.hosts h on h.id = e.host_id
    where (p_host_ids is null or e.host_id = any(p_host_ids))
      and (my.role = 'host' or e.status = 'published')   -- checkers see published only
      and (p_from is null or e.start_at >= p_from)
      and (p_to   is null or e.start_at <  p_to)
      and (p_search is null or e.title ilike '%' || p_search || '%')
      and (
        p_time_filter = 'all'
        or (p_time_filter = 'upcoming' and e.end_at >= now())
        or (p_time_filter = 'past'     and e.end_at <  now())
      )
  ),
  counted as (
    select *, count(*) over () as total_count
    from filtered
    order by start_at desc
    limit p_limit offset p_offset
  )
  select
    c.id, c.title, c.status, c.visibility, c.start_at, c.end_at, c.capacity,
    c.cover_image_url, c.time_zone, c.host_id, c.host_name, c.host_logo_url, c.user_role,
    coalesce(sum(case when r.status='going' and r.cancelled_at is null then 1 else 0 end),0)::bigint,
    coalesce(sum(case when r.status='waitlist' and r.cancelled_at is null then 1 else 0 end),0)::bigint,
    coalesce((select count(*) from public.check_ins ci where ci.event_id=c.id and ci.undone=false),0)::bigint,
    c.total_count
  from counted c
  left join public.rsvps r on r.event_id = c.id
  group by c.id, c.title, c.status, c.visibility, c.start_at, c.end_at, c.capacity,
           c.cover_image_url, c.time_zone, c.host_id, c.host_name, c.host_logo_url, c.user_role, c.total_count
  order by c.start_at desc;
$$;
```

Plus a small helper to list the user's hosts for the filter dropdown — can reuse a direct query on `host_members` + `hosts` (no RPC needed).

#### Frontend

File: `src/pages/MyEvents.tsx` (new), wired in `src/App.tsx` replacing the `Placeholder`.

UI:

- Header "My Events".
- Filter bar (controlled state synced to URL search params for shareability):
  - **Host** multi-select combobox (options = user's hosts).
  - **Date range** with two `DatePicker` inputs (from / to).
  - **Text search** input (debounced ~300ms).
  - **Tabs**: Upcoming / Past / All (default Upcoming).
- Results list using a compact card (new `MyEventRow` component or `compact` variant of `EventManagementCard`):
  - Title (link to `/e/:id`), host avatar+name, `EventDateTime`, status badge.
  - Inline `StatBox` trio (Going / Waitlist / Checked-in).
  - Quick actions: **View** (`/e/:id`), **Check-in** (`/checkin/:id`), and **Manage** (`/dashboard/:hostId/events/:id`) only when `user_role = 'host'`.
- Pagination: Prev/Next buttons + page indicator using `total_count` from RPC; page size 20.
- Loading skeleton + empty state.

Data:

- One `supabase.rpc('my_events', { ... })` call on filter/page change.
- Separate one-time fetch for the host filter list.

Reuse: `AppLayout`, `Card`, `Tabs`, `Input`, `Button`, `Avatar`, `Badge`, `EventDateTime`, `StatBox`, `DatePicker`, `Combobox`.

### 3. Nav

`src/components/top-nav.tsx` already links to `/my-events` — no change.

## Out of scope (already correct)

- HostDashboard stats + realtime.
- CSV encoding (UTF-8 + BOM via `src/lib/csv.ts`).