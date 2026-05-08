CREATE OR REPLACE FUNCTION public.report_reporter_emails(p_report_ids uuid[])
RETURNS TABLE(report_id uuid, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, u.email::text
  FROM public.reports r
  JOIN auth.users u ON u.id = r.reporter_id
  WHERE r.id = ANY(p_report_ids)
    AND public.is_report_target_host_member(r.target_type, r.target_id);
$$;