
CREATE OR REPLACE FUNCTION public.event_stats(p_host_id uuid)
RETURNS TABLE (
  event_id uuid,
  going_count bigint,
  waitlist_count bigint,
  checked_in_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id AS event_id,
    COALESCE(SUM(CASE WHEN r.status = 'going' AND r.cancelled_at IS NULL THEN 1 ELSE 0 END), 0)::bigint AS going_count,
    COALESCE(SUM(CASE WHEN r.status = 'waitlist' AND r.cancelled_at IS NULL THEN 1 ELSE 0 END), 0)::bigint AS waitlist_count,
    COALESCE((SELECT COUNT(*) FROM public.check_ins ci WHERE ci.event_id = e.id AND ci.undone = false), 0)::bigint AS checked_in_count
  FROM public.events e
  LEFT JOIN public.rsvps r ON r.event_id = e.id
  WHERE e.host_id = p_host_id
    AND public.is_host_member(p_host_id)
  GROUP BY e.id;
$$;
