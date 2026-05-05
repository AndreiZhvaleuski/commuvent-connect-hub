-- Force gallery photos to start in pending status (security)
DROP TRIGGER IF EXISTS gallery_force_pending ON public.gallery_photos;
CREATE TRIGGER gallery_force_pending
BEFORE INSERT ON public.gallery_photos
FOR EACH ROW EXECUTE FUNCTION public.force_pending_gallery();