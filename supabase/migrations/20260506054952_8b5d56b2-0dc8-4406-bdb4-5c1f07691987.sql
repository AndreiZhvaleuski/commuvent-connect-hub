-- Visibility cleanup
UPDATE public.events SET visibility = 'unlisted' WHERE visibility = 'private';
ALTER TABLE public.events ALTER COLUMN visibility SET DEFAULT 'public';

-- Capacity defaults and clamping
ALTER TABLE public.events ALTER COLUMN capacity SET DEFAULT 50;
UPDATE public.events SET capacity = 1 WHERE capacity IS NULL OR capacity < 1;
UPDATE public.events SET capacity = 10000 WHERE capacity > 10000;

-- Validation trigger
CREATE OR REPLACE FUNCTION public.events_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.visibility NOT IN ('public','unlisted') THEN
    RAISE EXCEPTION 'visibility must be public or unlisted';
  END IF;
  IF NEW.capacity IS NULL OR NEW.capacity < 1 OR NEW.capacity > 10000 THEN
    RAISE EXCEPTION 'capacity must be between 1 and 10000';
  END IF;
  IF NEW.end_at <= NEW.start_at THEN
    RAISE EXCEPTION 'end time must be after start time';
  END IF;
  IF NEW.end_at < NEW.start_at + interval '30 minutes' THEN
    RAISE EXCEPTION 'event must be at least 30 minutes long';
  END IF;
  IF (NEW.venue_address IS NULL OR length(btrim(NEW.venue_address)) = 0)
     AND (NEW.online_url IS NULL OR length(btrim(NEW.online_url)) = 0) THEN
    RAISE EXCEPTION 'event must have either a venue address or an online link';
  END IF;
  IF NEW.online_url IS NOT NULL AND length(btrim(NEW.online_url)) > 0
     AND NEW.online_url !~* '^https?://' THEN
    RAISE EXCEPTION 'online link must start with http:// or https://';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS events_validate_trg ON public.events;
CREATE TRIGGER events_validate_trg
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.events_validate();

-- Slug unique per host
CREATE UNIQUE INDEX IF NOT EXISTS events_host_slug_uniq
  ON public.events (host_id, slug) WHERE slug IS NOT NULL;