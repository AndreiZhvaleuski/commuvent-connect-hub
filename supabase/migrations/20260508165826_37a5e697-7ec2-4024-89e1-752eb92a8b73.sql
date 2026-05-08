create or replace function public.event_page_load(p_event_id uuid)
returns jsonb
language sql
stable
security definer
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
  my_role as (
    select role from public.host_members
    where host_id = (select host_id from ev) and user_id = auth.uid()
    limit 1
  )
  select jsonb_build_object(
    'event',        (select to_jsonb(ev.*) from ev),
    'host',         (select to_jsonb(h.*) from h),
    'going_count',  public.event_going_count(p_event_id),
    'my_rsvp',      (select to_jsonb(my_rsvp.*) from my_rsvp),
    'checked_in',   exists(
      select 1 from public.check_ins
      where rsvp_id = (select id from my_rsvp) and undone = false
    ),
    'my_host_role', (select role from my_role)
  );
$$;