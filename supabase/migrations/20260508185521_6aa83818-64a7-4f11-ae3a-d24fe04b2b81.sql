DROP POLICY IF EXISTS feedback_insert_after_end ON public.feedback;

CREATE POLICY feedback_insert_attended
ON public.feedback
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = feedback.event_id AND e.end_at < now()
  )
  AND EXISTS (
    SELECT 1
    FROM public.check_ins ci
    JOIN public.rsvps r ON r.id = ci.rsvp_id
    WHERE ci.event_id = feedback.event_id
      AND r.user_id = auth.uid()
      AND ci.undone = false
  )
);