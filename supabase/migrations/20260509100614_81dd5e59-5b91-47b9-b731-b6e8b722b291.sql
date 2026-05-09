DROP POLICY IF EXISTS "gallery_insert_auth" ON public.gallery_photos;

CREATE POLICY "gallery_insert_attended_or_host"
  ON public.gallery_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.is_event_host_member(event_id)
      OR EXISTS (
        SELECT 1
        FROM public.check_ins ci
        JOIN public.rsvps r ON r.id = ci.rsvp_id
        WHERE ci.event_id = gallery_photos.event_id
          AND r.user_id = auth.uid()
          AND ci.undone = false
      )
    )
  );