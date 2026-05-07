
DROP FUNCTION IF EXISTS public.get_invite_preview(text);

CREATE OR REPLACE FUNCTION public.get_invite_preview(p_token text)
RETURNS TABLE(host_id uuid, host_name text, host_logo_url text, host_bio text, role text, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT i.host_id, h.name, h.logo_url, h.bio, i.role, i.expires_at
  FROM public.host_invites i
  JOIN public.hosts h ON h.id = i.host_id
  WHERE i.token = p_token AND i.expires_at > now()
  LIMIT 1;
$$;
