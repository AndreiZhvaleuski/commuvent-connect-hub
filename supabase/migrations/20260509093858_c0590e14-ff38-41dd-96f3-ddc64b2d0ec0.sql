CREATE POLICY "checkins_select_own"
  ON public.check_ins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rsvps r
      WHERE r.id = check_ins.rsvp_id
        AND r.user_id = auth.uid()
    )
  );