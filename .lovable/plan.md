## Goal
Tighten gallery uploads, paginate the gallery using the existing data hook, add a zoom viewer, and let users delete their own pending uploads to free up their 5-slot quota.

## What's already in place
- Dedicated `gallery` storage bucket (public).
- `gallery_photos` table with `force_pending_gallery` trigger (`status='pending'` on insert).
- Upload UI in `src/components/event-gallery.tsx` (8 MB cap, no cropping).
- `useAsyncResource` hook and `ListPagination` component.
- Host moderation queue in `src/pages/Moderation.tsx`.

## Changes

### 1. Bucket hardening (migration)
Update the existing `gallery` bucket so limits are enforced server-side:
- `file_size_limit = 5 * 1024 * 1024` (5 MB)
- `allowed_mime_types = ['image/jpeg','image/png','image/webp','image/gif','image/heic']`

### 2. Per-user pending cap of 5 (migration)
`BEFORE INSERT` trigger on `public.gallery_photos`: if the user already has ≥ 5 rows for the same `event_id` with `status='pending'`, raise an exception ("You already have 5 photos awaiting approval for this event"). Approved/rejected don't count.

### 3. Allow users to delete their own pending uploads (migration + UI)
**DB:**
- Add RLS policy `gallery_delete_own_pending` on `public.gallery_photos`: `DELETE` allowed when `auth.uid() = user_id AND status = 'pending'`. (Hosts can already moderate via `gallery_update_host`; explicit delete by owner is intentionally limited to pending so approved photos require host action.)
- Add a storage trigger or follow-up cleanup: when a row is deleted from `gallery_photos`, also delete the corresponding object from the `gallery` bucket. Implemented as an `AFTER DELETE` trigger that calls `storage.delete_object('gallery', OLD.storage_path)` (wrapped via a `SECURITY DEFINER` function in the `public` schema, since we don't modify the `storage` schema).

**UI (`event-gallery.tsx`):**
- On each thumbnail owned by the current user **and** still pending, show a small Trash button (top-right, mirroring the Flag button).
- Click → confirm dialog ("Delete this pending upload?") → delete the row; toast on success and `refetch()`.

### 4. Gallery list: paginate via `useAsyncResource` + `ListPagination`
Refactor `src/components/event-gallery.tsx`:
- Replace ad-hoc state with `useAsyncResource` keyed on `[eventId, user?.id, page]`, `keepPreviousData: true`.
- Fetcher: Supabase `.range(from, to)` + `{ count: 'exact' }` to get rows + total.
- Render `ListPagination` below the grid (12 per page).
- Reset to page 1 after upload; `refetch()` after upload, delete, or report.

### 5. Upload constraints in the UI
- Lower client-side size guard 8 MB → 5 MB; update toast wording.
- Restrict `<input accept>` to the bucket mime types.
- Helper line: "Up to 5 pending uploads per event · max 5 MB · JPG/PNG/WebP/GIF/HEIC."
- Surface trigger error verbatim when the cap is hit.

### 6. Photo viewer with zoom (new component)
- New `src/components/photo-lightbox.tsx`: shadcn `Dialog` with full-size image, wheel/pinch/button zoom (1×–4×), drag-to-pan, Zoom In / Out / Reset / Close, Esc / +/- / arrows. Prev/Next navigates the current page.
- Clicking a thumbnail opens it. Flag and Trash buttons stay on the thumbnail.

## Files touched
- New migration (bucket limits + pending-cap trigger + owner delete policy + storage cleanup trigger).
- `src/components/event-gallery.tsx` — pagination via `useAsyncResource`, new limits, delete-own-pending button + confirm, click-to-open lightbox.
- `src/components/photo-lightbox.tsx` — new viewer.

## Out of scope
- Image compression / EXIF stripping on upload.
- Paginating the host moderation queue.
