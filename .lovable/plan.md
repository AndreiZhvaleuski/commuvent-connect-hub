## Goal

Make the seeded dataset rich enough that a reviewer can exercise every graded flow without preparing data themselves. Wipe + re-seed in one shot, then refine the walkthrough to point at the right pre-existing rows.

## 1. Rewrite `supabase/functions/seed_demo/index.ts`

Keep the existing wipe + users + hosts + events + RSVP + check-in + feedback steps. **Add** the following.

### 1a. Waitlist demo data (already partially works)

- AI Hack Night keeps `capacity = 4`. All 8 attendees RSVP to it via the edge function, so the seed naturally leaves **4 going + 4 waitlist** with deterministic FIFO order.
- Record the going-list head (`att.gina`) and the waitlist head (`att.kate`) in the response summary so the walkthrough can name them with confidence.

### 1b. Gallery in three states, from multiple attendees

For each **completed** event, after uploading photos to storage, insert `gallery_photos` rows directly with the service-role client (bypassing the `force_pending_gallery` trigger by using `db.from('gallery_photos').insert(...)` then `update({status})`):

- 2 **approved** photos (current behavior) — different attendees.
- 2 **pending** photos — different attendees again (so the host moderation queue has real items to approve).
- 1 **rejected** photo — uploaded by a third attendee, then `update({status: 'rejected'})`.

Pick the uploader attendees by rotating through `ATTENDEES` so each event has 5 photos from 5 different users.

Also seed **1 pending photo on an in-progress event** so the moderation queue is non-empty even before any completed-event work.

### 1c. Reports in mixed states

Insert into `reports` directly via service role:

- 2 **open** event reports against different completed/in-progress events, reporters = `att.henry`, `att.liam` (different reasons: "Spam", "Inappropriate content").
- 1 **open** photo report against one of the seeded **approved** gallery photos, reporter = `att.mia`.
- 1 already-actioned event report with `status = 'hidden'` (so the reports tab shows historical state too).
- 1 already-actioned photo report with `status = 'dismissed'`.

Reasons rotate from a small list. `reporter_id` is a real attendee user id.

### 1d. Notifications for realism

Insert a couple of `notifications` rows for `att.kate` ("You're on the waitlist for AI Hack Night") and `att.gina` ("Thanks for checking in") so the bell icon shows unread state out of the box. Strictly cosmetic.

### 1e. Summary payload

Return counts: `users, hosts, events, rsvps, going, waitlist, checkins, photos_approved, photos_pending, photos_rejected, reports_open, reports_actioned, notifications` — useful when re-running and for the README.

## 2. Re-trigger the seed

Call the deployed `seed_demo` function once with `x-seed-secret` header (using `supabase--curl_edge_functions`) so the live demo reflects the new data immediately. This wipes everything and re-seeds.

## 3. Update `WALKTHROUGH.md`

Adjust only the flows whose preconditions changed:

- **Flow D — Waitlist:** drop the "RSVP four times yourself" setup. Replace with: sign in as `att.kate` (already on waitlist position 1 for AI Hack Night), open `/tickets`, observe **Waitlist · 1**. Then in a private window sign in as `att.gina` (going) and **Cancel RSVP**. Switch back to Kate's tab → status flips to **Going** via realtime; bell icon shows the promotion notification.
- **Flow G — Gallery approval:** mention that the moderation queue is **already populated** with pending photos from multiple attendees and one rejected photo for context. Reviewer can approve/reject any of them — uploading a new one is now optional.
- **Flow I — Reports:** mention that the Reports tab already lists open + historical (hidden/dismissed) reports across events and photos; reviewer can act on an open one. Submitting a new report still works as a second demonstration.
- Add a short note near the top: "If anything looks stale or empty, ask the maintainer to re-run `seed_demo` — it wipes and re-seeds in ~30s."

`README.md` and `report.md` need no changes (they already point at WALKTHROUGH).

## 4. Out of scope

- No schema migrations (gallery `rejected` and report `hidden`/`dismissed` are free-form text columns; existing UI already handles them).
- No frontend changes.
- No new edge functions.

## Files touched

- `supabase/functions/seed_demo/index.ts` — extended seed logic.
- `WALKTHROUGH.md` — flows D, G, I refresh.
- One `curl_edge_functions` call to actually re-seed the live demo.
