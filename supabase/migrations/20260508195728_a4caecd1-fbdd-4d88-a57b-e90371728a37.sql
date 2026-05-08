CREATE OR REPLACE FUNCTION public.force_pending_gallery()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.host_members hm ON hm.host_id = e.host_id
    WHERE e.id = NEW.event_id
      AND hm.user_id = NEW.user_id
  ) THEN
    NEW.status = 'approved';
  ELSE
    NEW.status = 'pending';
  END IF;
  RETURN NEW;
END;
$function$;