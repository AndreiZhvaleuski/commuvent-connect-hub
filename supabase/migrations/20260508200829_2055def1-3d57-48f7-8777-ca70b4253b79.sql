UPDATE public.reports r
SET status = 'dismissed'
WHERE status = 'open'
  AND id NOT IN (
    SELECT DISTINCT ON (reporter_id, target_type, target_id) id
    FROM public.reports
    WHERE status = 'open'
    ORDER BY reporter_id, target_type, target_id, created_at DESC
  );

CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_open_per_reporter
ON public.reports (reporter_id, target_type, target_id)
WHERE status = 'open';