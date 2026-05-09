## Goal
Harden the `feedback` table with DB-level constraints and surface clear, friendly errors in the UI when a constraint is violated.

## Database migration
Add to `public.feedback`:
1. `CHECK (rating BETWEEN 1 AND 5)` — constraint `feedback_rating_range`
2. `UNIQUE (event_id, user_id)` — constraint `feedback_event_user_unique` (also de-dupes any existing duplicates first, keeping the earliest row)
3. `CHECK (comment IS NULL OR char_length(comment) <= 1000)` — constraint `feedback_comment_length`

Pre-migration cleanup:
- Delete duplicate feedback rows keeping the oldest per `(event_id, user_id)`.
- Truncate any existing comments longer than 1000 chars (or fail loudly — will choose truncate to avoid migration failure).

## Frontend changes (`src/components/event-feedback.tsx`)
1. **Comment length cap (1000 chars):**
   - Add `maxLength={1000}` to the `<Textarea>`.
   - Show a live counter `{comment.length}/1000` under the textarea, muted, turning destructive when at limit.

2. **Friendly error mapping on submit:**
   - Inspect Supabase error `code` / `message`:
     - `23505` (unique_violation) → toast: "You've already submitted feedback for this event." then reload to show their existing entry.
     - `23514` (check_violation) on rating → toast: "Rating must be between 1 and 5 stars."
     - `23514` on comment → toast: "Comment must be 1000 characters or less."
     - Fallback → existing generic message.

3. **Client-side guard for rating** already exists (1–5 buttons + `rating < 1` disabled); no change needed beyond the new server-side error mapping.

## Out of scope
- No changes to RLS policies, the moderation page, or other components.
- No schema changes beyond the three constraints.
