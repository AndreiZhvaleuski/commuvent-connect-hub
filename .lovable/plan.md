## Plan: Dedicated event-management page

### Goal
Give event hosts a single landing page per event that mirrors the per-event card from the host dashboard (status badges, title/date, Edit / RSVPs / Check-in actions, Going / Waitlist / Checked-in stats), so they can jump straight from the public event page into managing it without bouncing through the host dashboard.

### Changes

**1. New route + page: `/dashboard/:hostId/events/:eventId`**
- Create `src/pages/EventManage.tsx`.
- On mount: require auth, verify caller is a `host_members` row for `hostId`, fetch the event, fetch live stats (`event_stats` RPC, then pick the row for this event).
- Layout copied from `HostDashboard`:
  - Header: host avatar + name on the left (clicking returns to `/dashboard/:hostId`), "View public page" link to `/e/:eventId` on the right.
  - Below: the same card UI used in `EventList` from `HostDashboard` (status/visibility badges, title, start date, Edit / RSVPs / Check-in buttons, 3-stat grid).
- Add the route to `src/App.tsx`.

**2. Wire the public event page to it**
- In `src/pages/EventPage.tsx` host-tools sidebar: replace the three separate Edit / Manage RSVPs / Check-in buttons with a single "Manage event" button that navigates to `/dashboard/:hostId/events/:eventId`. (Keeps the sidebar tidy and gives one obvious entry point.)

**3. Reuse, don't duplicate**
- Extract the per-event card (badges + title + actions + stats) from `HostDashboard.tsx` into a shared component, e.g. `src/components/event-management-card.tsx`, and use it from both `HostDashboard` and the new `EventManage` page. Keeps the two views visually identical and avoids drift.

### Out of scope
- No DB or RLS changes (existing `host_members`, `events`, and `event_stats` RPC already cover this).
- No edits to the actual edit / RSVPs / check-in pages — this is purely a new hub page plus an entry point from the public event page.
