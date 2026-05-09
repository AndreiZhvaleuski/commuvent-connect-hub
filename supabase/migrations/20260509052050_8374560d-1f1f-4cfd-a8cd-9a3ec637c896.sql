-- Cleanup duplicates: keep earliest feedback per (event_id, user_id)
DELETE FROM public.feedback f
USING public.feedback f2
WHERE f.event_id = f2.event_id
  AND f.user_id = f2.user_id
  AND f.created_at > f2.created_at;

-- Truncate overly-long comments to satisfy the new check
UPDATE public.feedback
SET comment = left(comment, 1000)
WHERE comment IS NOT NULL AND char_length(comment) > 1000;

-- Add constraints
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_rating_range CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_event_user_unique UNIQUE (event_id, user_id);

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_comment_length CHECK (comment IS NULL OR char_length(comment) <= 1000);