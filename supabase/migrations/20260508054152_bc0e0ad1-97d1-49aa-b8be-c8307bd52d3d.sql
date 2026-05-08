create or replace function public.my_events(
  p_host_ids uuid[] default null,
  p_from timestamptz default null,
  p_to   timestamptz default null,
  p_search text default null,
  p_time_filter text default 'upcoming',
  p_limit int default 20,
  p_offset int default 0
) returns table (
  event_id uuid, title text, status text, visibility text,
  start_at timestamptz, end_at timestamptz, capacity int,
  cover_image_url text, time_zone text,
  host_id uuid, host_name text, host_logo_url text,
  user_role text,
  going_count bigint, waitlist_count bigint, checked_in_count bigint,
  total_count bigint
) language sql stable security definer set search_path = public as $$
  with my as (
    select hm.host_id, hm.role
    from public.host_members hm
    where hm.user_id = auth.uid()
  ),
  filtered as (
    select e.id, e.title, e.status, e.visibility, e.start_at, e.end_at, e.capacity,
           e.cover_image_url, e.time_zone, e.host_id,
           h.name as host_name, h.logo_url as host_logo_url, my.role as user_role
    from public.events e
    join my on my.host_id = e.host_id
    join public.hosts h on h.id = e.host_id
    where (p_host_ids is null or e.host_id = any(p_host_ids))
      and (my.role = 'host' or e.status = 'published')
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
    select f.*, count(*) over () as total_count
    from filtered f
    order by f.start_at desc
    limit p_limit offset p_offset
  )
  select
    c.id, c.title, c.status, c.visibility, c.start_at, c.end_at, c.capacity,
    c.cover_image_url, c.time_zone, c.host_id, c.host_name, c.host_logo_url, c.user_role,
    coalesce(sum(case when r.status='going' and r.cancelled_at is null then 1 else 0 end),0)::bigint as going_count,
    coalesce(sum(case when r.status='waitlist' and r.cancelled_at is null then 1 else 0 end),0)::bigint as waitlist_count,
    coalesce((select count(*) from public.check_ins ci where ci.event_id=c.id and ci.undone=false),0)::bigint as checked_in_count,
    c.total_count
  from counted c
  left join public.rsvps r on r.event_id = c.id
  group by c.id, c.title, c.status, c.visibility, c.start_at, c.end_at, c.capacity,
           c.cover_image_url, c.time_zone, c.host_id, c.host_name, c.host_logo_url, c.user_role, c.total_count
  order by c.start_at desc;
$$;