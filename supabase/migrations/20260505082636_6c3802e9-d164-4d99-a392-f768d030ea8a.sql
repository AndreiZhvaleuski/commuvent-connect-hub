
-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ HOSTS ============
CREATE TABLE public.hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  bio TEXT,
  contact_email TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.host_members (
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('host','checker')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (host_id, user_id)
);
ALTER TABLE public.host_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_host_role(p_host_id UUID, p_role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.host_members
    WHERE host_id = p_host_id
      AND user_id = auth.uid()
      AND (p_role IS NULL OR role = p_role OR role = 'host')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_host_member(p_host_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.host_members
    WHERE host_id = p_host_id AND user_id = auth.uid()
  );
$$;

CREATE POLICY "hosts_select_all" ON public.hosts FOR SELECT USING (true);
CREATE POLICY "hosts_insert_auth" ON public.hosts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "hosts_update_members" ON public.hosts FOR UPDATE USING (public.has_host_role(id, 'host'));
CREATE POLICY "hosts_delete_members" ON public.hosts FOR DELETE USING (public.has_host_role(id, 'host'));

CREATE POLICY "hm_select_members" ON public.host_members FOR SELECT USING (public.is_host_member(host_id));
CREATE POLICY "hm_insert_host" ON public.host_members FOR INSERT WITH CHECK (public.has_host_role(host_id, 'host') OR (auth.uid() = user_id AND NOT EXISTS (SELECT 1 FROM public.host_members WHERE host_id = host_members.host_id)));
CREATE POLICY "hm_update_host" ON public.host_members FOR UPDATE USING (public.has_host_role(host_id, 'host'));
CREATE POLICY "hm_delete_host" ON public.host_members FOR DELETE USING (public.has_host_role(host_id, 'host') OR auth.uid() = user_id);

-- ============ HOST INVITES ============
CREATE TABLE public.host_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('host','checker')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.host_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_select_members" ON public.host_invites FOR SELECT USING (public.is_host_member(host_id));
CREATE POLICY "invites_insert_host" ON public.host_invites FOR INSERT WITH CHECK (public.has_host_role(host_id, 'host'));
CREATE POLICY "invites_delete_host" ON public.host_invites FOR DELETE USING (public.has_host_role(host_id, 'host'));

-- ============ EVENTS ============
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  cover_image_url TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  time_zone TEXT NOT NULL DEFAULT 'UTC',
  venue_address TEXT,
  online_url TEXT,
  capacity INT NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','unlisted')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_events_status_visibility_start ON public.events (status, visibility, start_at);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "events_select_public" ON public.events FOR SELECT USING (
  (status = 'published' AND visibility = 'public')
  OR visibility = 'unlisted'
  OR public.is_host_member(host_id)
);
CREATE POLICY "events_insert_host" ON public.events FOR INSERT WITH CHECK (public.has_host_role(host_id, 'host'));
CREATE POLICY "events_update_host" ON public.events FOR UPDATE USING (public.has_host_role(host_id, 'host'));
CREATE POLICY "events_delete_host" ON public.events FOR DELETE USING (public.has_host_role(host_id, 'host'));

-- ============ RSVPS ============
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going','waitlist','cancelled')),
  position INT,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- Helper for rsvps -> host check
CREATE OR REPLACE FUNCTION public.is_event_host_member(p_event_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.host_members hm ON hm.host_id = e.host_id
    WHERE e.id = p_event_id AND hm.user_id = auth.uid()
  );
$$;

CREATE POLICY "rsvps_select_own_or_host" ON public.rsvps FOR SELECT USING (
  auth.uid() = user_id OR public.is_event_host_member(event_id)
);
-- No insert/update/delete policies => no direct writes (only service role via Edge Function)

-- ============ CHECK-INS ============
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rsvp_id UUID NOT NULL UNIQUE REFERENCES public.rsvps(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  undone BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkins_select_host" ON public.check_ins FOR SELECT USING (public.is_event_host_member(event_id));

-- ============ FEEDBACK ============
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_select_all" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "feedback_insert_after_end" ON public.feedback FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.end_at < now())
);

-- ============ GALLERY ============
CREATE TABLE public.gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.force_pending_gallery()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.status = 'pending'; RETURN NEW; END; $$;
CREATE TRIGGER gallery_force_pending BEFORE INSERT ON public.gallery_photos
FOR EACH ROW EXECUTE FUNCTION public.force_pending_gallery();

CREATE POLICY "gallery_select_approved_or_host" ON public.gallery_photos FOR SELECT USING (
  status = 'approved' OR auth.uid() = user_id OR public.is_event_host_member(event_id)
);
CREATE POLICY "gallery_insert_auth" ON public.gallery_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gallery_update_host" ON public.gallery_photos FOR UPDATE USING (public.is_event_host_member(event_id));

-- ============ REPORTS ============
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('event','photo')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','hidden','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_report_target_host_member(p_target_type TEXT, p_target_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p_target_type = 'event' THEN public.is_event_host_member(p_target_id)
    WHEN p_target_type = 'photo' THEN EXISTS (
      SELECT 1 FROM public.gallery_photos gp
      JOIN public.events e ON e.id = gp.event_id
      JOIN public.host_members hm ON hm.host_id = e.host_id
      WHERE gp.id = p_target_id AND hm.user_id = auth.uid()
    )
    ELSE false END;
$$;

CREATE POLICY "reports_insert_auth" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select_host" ON public.reports FOR SELECT USING (public.is_report_target_host_member(target_type, target_id));
CREATE POLICY "reports_update_host" ON public.reports FOR UPDATE USING (public.is_report_target_host_member(target_type, target_id));

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('host-logos','host-logos', true),
  ('event-covers','event-covers', true),
  ('gallery','gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_public_read_buckets" ON storage.objects FOR SELECT USING (
  bucket_id IN ('host-logos','event-covers','gallery')
);
CREATE POLICY "storage_auth_insert_buckets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id IN ('host-logos','event-covers','gallery')
);
CREATE POLICY "storage_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id IN ('host-logos','event-covers','gallery') AND owner = auth.uid()
);
CREATE POLICY "storage_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id IN ('host-logos','event-covers','gallery') AND owner = auth.uid()
);

-- ============ REALTIME ============
ALTER TABLE public.rsvps REPLICA IDENTITY FULL;
ALTER TABLE public.check_ins REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
