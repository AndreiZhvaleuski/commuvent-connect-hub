CREATE OR REPLACE FUNCTION public.seed_wipe_all()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Truncate skips per-row triggers so the storage-cleanup trigger does not
  -- fire (storage objects are emptied separately by the edge function).
  TRUNCATE TABLE
    public.check_ins,
    public.feedback,
    public.gallery_photos,
    public.notifications,
    public.reports,
    public.rsvps,
    public.host_invites,
    public.events,
    public.host_members,
    public.hosts,
    public.profiles
  RESTART IDENTITY CASCADE;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_wipe_all() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_wipe_all() TO service_role;