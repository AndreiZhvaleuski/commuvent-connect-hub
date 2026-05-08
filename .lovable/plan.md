## Goal

Wipe all existing data, auth users, and storage objects, then seed a realistic demo dataset across 3 topical hosts with events in every lifecycle state (completed, in-progress, upcoming). Cover images, host logos, and gallery photos use high-quality pictures fetched from the network. Expose demo credentials and a "Re-seed" button on the sign-in page under an info icon.

## Demo users (password `Password123!`)

Hosts (each focused on a different topic):
- `host.alice@demo.commuvent.app` — **Acme Tech Talks** (software/AI meetups)
- `host.bob@demo.commuvent.app` — **Trailblazers Outdoors** (hiking & outdoor adventures)
- `host.clara@demo.commuvent.app` — **Culinary Collective** (food & cooking workshops)

Checkers (`host_members.role = 'checker'`):
- `checker.dan@demo.commuvent.app` — Acme Tech Talks
- `checker.eve@demo.commuvent.app` — Trailblazers Outdoors
- `checker.finn@demo.commuvent.app` — Culinary Collective

Attendees (regular):
- `att.gina@…`, `att.henry@…`, `att.ivy@…`, `att.jack@…`, `att.kate@…`, `att.liam@…`, `att.mia@…`, `att.noah@…` (all `@demo.commuvent.app`)

## Seeded events (9 total: 3 per host × 3 lifecycle states)

For each host:
- **Completed** — `end_at` ~7 days ago. Has full RSVPs, check-ins, feedback, and approved gallery photos.
- **In-progress** — `start_at` ~1h ago, `end_at` ~2h from now. Has RSVPs and a few early check-ins.
- **Upcoming** — `start_at` ~14 days out. Has RSVPs; one upcoming event uses a small capacity to push some attendees to the waitlist.

Mix of `public` / `unlisted` visibility and `venue_address` / `online_url` for variety.

Topical titles, e.g.:
- Acme: "Intro to LLM Agents" (completed), "Live: TypeScript Performance" (in-progress), "AI Hack Night" (upcoming)
- Trailblazers: "Sunrise Ridge Hike" (completed), "Forest Trail Walk — Live" (in-progress), "Autumn Summit Climb" (upcoming)
- Culinary: "Fresh Pasta Workshop" (completed), "Live: Sourdough Basics" (in-progress), "Farm-to-Table Dinner" (upcoming)

## Images

- **Host logos** (`host-logos` bucket) — one per host, themed (circuit/abstract for tech, mountain for outdoors, kitchen for culinary).
- **Event covers** (`event-covers` bucket) — one per event matching its topic.
- **Gallery photos** (`gallery` bucket) — 2–3 per completed event, status `approved`.

Source: high-quality, free-to-use photos from Unsplash via `images.unsplash.com` direct URLs (curated list hardcoded in the seed function — no API key needed). The seed function fetches each image, then uploads to the appropriate bucket via the storage API. Stored public URLs go into `hosts.logo_url`, `events.cover_image_url`, and `gallery_photos.storage_path`.

## Implementation

### 1. New edge function `seed_demo` (`verify_jwt = false`, guarded by `SEED_SECRET`)

On POST with valid `x-seed-secret` header:

1. **Wipe phase** (service role):
   - Empty all three storage buckets: list objects → `storage.from(bucket).remove(paths)`.
   - `delete from check_ins; feedback; gallery_photos; notifications; reports; rsvps; host_invites; events; host_members; hosts; profiles;`
   - `auth.admin.listUsers({ perPage: 1000 })` then `auth.admin.deleteUser(id)` for every user.

2. **Seed phase**:
   - Create each demo user via `auth.admin.createUser` (email_confirm: true, metadata with `display_name`/names). The `handle_new_user` trigger populates `profiles`.
   - Fetch curated Unsplash images and upload them to the right buckets; collect their public URLs.
   - Insert 3 hosts (with `logo_url`, `bio`, `contact_email`).
   - Insert `host_members`: each host user as `host`, each checker as `checker`.
   - Insert 9 events (cover URLs, varied visibility/venue/online, valid `start_at`/`end_at` per lifecycle state, capacities).
   - For each attendee, sign in server-side (`signInWithPassword`) to get a JWT, then call the deployed `rsvp_create` edge function over HTTP for a spread of events. Over-subscribe one upcoming event to exercise waitlist logic.
   - For completed and in-progress events, call `check_in_by_code` over HTTP using the host's JWT against a subset of "going" RSVP codes.
   - Insert 1–2 `feedback` rows per completed event.
   - Insert 2–3 `gallery_photos` per completed event with `status = 'approved'` (the `force_pending_gallery` trigger forces pending on insert, so seed updates them to `approved` immediately after).

3. Return `{ ok: true, summary: { users, hosts, events, rsvps, checkins, photos } }`.

### 2. Add `SEED_SECRET` runtime secret

Random string, used by both the edge function and the frontend re-seed button.

### 3. Sign-in page UI (`src/pages/SignIn.tsx`)

- `Info` icon button in the card header.
- Opens a `Dialog` with:
  - Intro: "Demo accounts (password: `Password123!`)".
  - Three sections (Hosts / Checkers / Attendees) listing emails. Each row has a "Use" button that fills the email + password fields.
  - "Re-seed demo data" button (POSTs to `seed_demo` with `x-seed-secret`). Toast on success/failure; disable button while running.

### 4. Shared list

`src/lib/demoAccounts.ts` — exported arrays of `{ email, label, role }` used by the dialog.

### 5. No schema changes

All tables, RLS policies, and triggers already exist.

## Files touched

- `supabase/functions/seed_demo/index.ts` (new)
- `src/pages/SignIn.tsx` (info dialog + re-seed button)
- `src/lib/demoAccounts.ts` (new)
