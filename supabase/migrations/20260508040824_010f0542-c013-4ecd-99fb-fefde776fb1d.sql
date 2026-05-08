-- Tighten gallery moderation: only host role can update (approve/reject)
DROP POLICY IF EXISTS gallery_update_host ON public.gallery_photos;
CREATE POLICY gallery_update_host ON public.gallery_photos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.host_members hm ON hm.host_id = e.host_id
      WHERE e.id = gallery_photos.event_id
        AND hm.user_id = auth.uid()
        AND hm.role = 'host'
    )
  );

-- Tighten reports moderation: only host role can update report status
DROP POLICY IF EXISTS reports_update_host ON public.reports;
CREATE POLICY reports_update_host ON public.reports
  FOR UPDATE USING (
    CASE
      WHEN target_type = 'event' THEN EXISTS (
        SELECT 1 FROM public.events e
        JOIN public.host_members hm ON hm.host_id = e.host_id
        WHERE e.id = reports.target_id
          AND hm.user_id = auth.uid()
          AND hm.role = 'host'
      )
      WHEN target_type = 'photo' THEN EXISTS (
        SELECT 1 FROM public.gallery_photos gp
        JOIN public.events e ON e.id = gp.event_id
        JOIN public.host_members hm ON hm.host_id = e.host_id
        WHERE gp.id = reports.target_id
          AND hm.user_id = auth.uid()
          AND hm.role = 'host'
      )
      ELSE false
    END
  );