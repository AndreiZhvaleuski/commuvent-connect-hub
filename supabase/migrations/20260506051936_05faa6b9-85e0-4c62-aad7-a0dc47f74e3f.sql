DROP POLICY IF EXISTS hm_insert_host ON public.host_members;

CREATE POLICY hm_insert_host
ON public.host_members
FOR INSERT
TO public
WITH CHECK (
  public.has_host_role(host_id, 'host')
  OR (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.host_members hm
      WHERE hm.host_id = host_members.host_id
    )
  )
);