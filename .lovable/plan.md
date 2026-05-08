## Fix: hiding a reported event

### Problem
The Hide action on event reports tries to set `visibility = 'private'`, but the `events_validate` trigger only allows `public` or `unlisted`, so the update is rejected.

### Approach
Drop the `visibility` change entirely. Setting `status = 'draft'` is enough — the `events_select_public` RLS policy requires `status = 'published'` for the public/unlisted view paths, so a draft event becomes invisible to non-host members. No migration needed.

### Changes (single file: `src/pages/Moderation.tsx`)

1. In `confirmResolve`, when `report.target_type === 'event'` and the action is `hide`:
   - Update the event with `{ status: 'draft' }` only (remove `visibility: 'private'`).
2. Update the confirmation dialog description for hiding an event to reflect the new behavior:
   - From: "reverted to a private draft and removed from public listings"
   - To: "reverted to a draft and removed from public listings. The host can republish it later."

### Out of scope
- No DB migration.
- Photo hide flow is unchanged (still sets `gallery_photos.status = 'rejected'`).
- No RLS changes — existing policies already hide drafts from the public.
