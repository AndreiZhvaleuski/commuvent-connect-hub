UPDATE storage.buckets
SET file_size_limit = 3145728,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'event-covers';

CREATE OR REPLACE FUNCTION public.event_covers_enforce_single()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
BEGIN
  IF NEW.bucket_id = 'event-covers' THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'event-covers'
      AND split_part(name, '/', 1) = split_part(NEW.name, '/', 1)
      AND id <> NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS event_covers_single_file ON storage.objects;
CREATE TRIGGER event_covers_single_file
AFTER INSERT ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.event_covers_enforce_single();