-- 1. Bucket limits (5 MB, image-only)
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic']
WHERE id = 'gallery';

-- 2. Per-user pending cap (5 per event)
CREATE OR REPLACE FUNCTION public.gallery_enforce_pending_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.gallery_photos
  WHERE user_id = NEW.user_id
    AND event_id = NEW.event_id
    AND status = 'pending';
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'You already have 5 photos awaiting approval for this event. Wait for the host to review them or delete one first.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gallery_pending_cap ON public.gallery_photos;
CREATE TRIGGER gallery_pending_cap
BEFORE INSERT ON public.gallery_photos
FOR EACH ROW EXECUTE FUNCTION public.gallery_enforce_pending_cap();

-- 3. Owners can delete their own pending photos
DROP POLICY IF EXISTS gallery_delete_own_pending ON public.gallery_photos;
CREATE POLICY gallery_delete_own_pending
ON public.gallery_photos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

-- 4. When a gallery_photos row is deleted, remove the underlying storage object
CREATE OR REPLACE FUNCTION public.gallery_cleanup_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'gallery' AND name = OLD.storage_path;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS gallery_cleanup_storage ON public.gallery_photos;
CREATE TRIGGER gallery_cleanup_storage
AFTER DELETE ON public.gallery_photos
FOR EACH ROW EXECUTE FUNCTION public.gallery_cleanup_storage();