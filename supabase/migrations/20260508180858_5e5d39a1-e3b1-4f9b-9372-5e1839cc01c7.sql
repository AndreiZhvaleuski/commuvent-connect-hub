-- 1) Drop email from profiles (no longer stored publicly).
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- 2) Stop the new-user trigger from writing email into profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=' || NEW.id::text
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3) Host-only function to fetch RSVP emails for an event from auth.users.
CREATE OR REPLACE FUNCTION public.event_rsvp_emails(p_event_id uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.email::text
  FROM auth.users u
  JOIN public.rsvps r ON r.user_id = u.id
  WHERE r.event_id = p_event_id
    AND public.is_event_host_member(p_event_id);
$$;

REVOKE EXECUTE ON FUNCTION public.event_rsvp_emails(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.event_rsvp_emails(uuid) TO authenticated;
