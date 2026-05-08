CREATE OR REPLACE FUNCTION public.can_view_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = p_user_id
    OR EXISTS (
      SELECT 1
      FROM public.host_members me
      JOIN public.host_members other ON other.host_id = me.host_id
      WHERE me.user_id = auth.uid()
        AND me.role = 'host'
        AND other.user_id = p_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.rsvps r
      JOIN public.events e ON e.id = r.event_id
      JOIN public.host_members hm ON hm.host_id = e.host_id
      WHERE r.user_id = p_user_id
        AND hm.user_id = auth.uid()
        AND hm.role = 'host'
    );
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;

DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_select_visible ON public.profiles;

CREATE POLICY profiles_select_visible
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_profile(id));
