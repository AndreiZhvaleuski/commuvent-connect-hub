
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invite_preview(p_token text)
RETURNS TABLE(host_id uuid, host_name text, role text, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT i.host_id, h.name, i.role, i.expires_at
  FROM public.host_invites i
  JOIN public.hosts h ON h.id = i.host_id
  WHERE i.token = p_token AND i.expires_at > now()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.accept_host_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_invite public.host_invites;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'must be authenticated';
  END IF;

  SELECT * INTO v_invite FROM public.host_invites
  WHERE token = p_token AND expires_at > now()
  LIMIT 1;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'invite not found or expired';
  END IF;

  INSERT INTO public.host_members (host_id, user_id, role)
  VALUES (v_invite.host_id, v_uid, v_invite.role)
  ON CONFLICT (host_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  DELETE FROM public.host_invites WHERE id = v_invite.id;

  RETURN v_invite.host_id;
END;
$$;
