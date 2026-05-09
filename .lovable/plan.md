## Goal

Make waitlist promotions explicit and acknowledgement-based. The user gets a clear, persistent in-app signal until they confirm they've seen it.

Backend already inserts a `notifications` row with `type = 'waitlist_promoted'` whenever a cancel or capacity-increase promotes someone (`rsvp_cancel`, `event_set_capacity`). Today nothing visualises this beyond a transient toast on the Tickets page. We'll wire a count badge in the nav and per-ticket acknowledge UI on the Tickets page, both backed by `notifications.read_at`.

## 1. Top nav — unread badge on "My Tickets"

`src/components/top-nav.tsx`:

- When signed in, query `notifications` for the current user filtered to `type = 'waitlist_promoted'` and `read_at is null`. Keep a count in component state.
- Subscribe to realtime `postgres_changes` on `notifications` (INSERT and UPDATE) filtered by `user_id` so the badge updates live when a promotion arrives or is acknowledged elsewhere.
- Render a small numeric badge (semantic `bg-primary text-primary-foreground`, rounded pill) next to the **My Tickets** label in both the desktop nav and the mobile sheet. Hide when count is `0`.

## 2. Tickets page — promotion banner per affected ticket

`src/pages/Tickets.tsx`:

- Extend the data fetch to also pull the user's unread `waitlist_promoted` notifications and key them by `payload.event_id` (and/or `payload.rsvp_id`).
- For every `going` ticket whose event_id has an unacknowledged promotion, prepend a highlighted callout inside the ticket card:
  > "You were promoted from the waitlist — your seat is confirmed."
  with a primary **Acknowledge** button.
- Clicking **Acknowledge** updates the matching notification(s) `read_at = now()` (UPDATE allowed by existing `notifications_update_own` RLS), removes the banner, and triggers the badge count to drop via the realtime subscription.
- Also add a top-of-page summary banner when `unreadCount > 0`: "N new promotion(s) — scroll down to confirm." with an **Acknowledge all** action that bulk-updates `read_at`.
- Drop the existing transient toast on `waitlist_promoted` (or downgrade it to a small info toast that says "New promotion — see your tickets") to avoid double-signalling.

## 3. Wire-up details

- No schema changes — `notifications.read_at` already exists and the RLS policies cover both read and update for the owning user.
- Reuse the existing `useAsyncResource`/`refetch` pattern already used in Tickets for the notifications list.
- Acknowledgement uses a single `supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', uid).eq('type','waitlist_promoted').is('read_at', null).in('id', [...])` (or per-id when only one row).

## 4. Walkthrough update

Update **Flow D — Waitlist** in `WALKTHROUGH.md` (last two steps) to match the new behaviour:

- After Gina cancels, expect Kate's **My Tickets** nav link to grow a numeric **1** badge (no need to be on the Tickets page).
- Open `/tickets` → expect the "You were promoted from the waitlist" callout on the AI Hack Night ticket → click **Acknowledge** → callout disappears, nav badge clears.

## 5. Out of scope

- No bell icon / global notifications drawer (we already have a clear, ticket-scoped surface).
- No email notifications (already documented as out of scope in `report.md`).
- No backend changes (`rsvp_cancel` and `event_set_capacity` already insert the right rows).

## Files touched

- `src/components/top-nav.tsx` — fetch unread count + realtime + badge.
- `src/pages/Tickets.tsx` — fetch promotions, render banner + acknowledge buttons, drop/soften toast.
- `WALKTHROUGH.md` — refresh Flow D expectations.
