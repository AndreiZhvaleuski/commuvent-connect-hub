CREATE OR REPLACE FUNCTION public.event_going_count(p_event_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::bigint
  FROM public.rsvps r
  JOIN public.events e ON e.id = r.event_id
  WHERE r.event_id = p_event_id
    AND r.status = 'going'
    AND r.cancelled_at IS NULL
    AND (
      (e.status = 'published' AND e.visibility = 'public')
      OR e.visibility = 'unlisted'
      OR public.is_host_member(e.host_id)
    );
$$;