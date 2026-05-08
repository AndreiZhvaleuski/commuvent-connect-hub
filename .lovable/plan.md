## Refine `/checkin/:eventId`

Single-file change in `src/pages/CheckIn.tsx`. No backend changes.

### 1. Mobile-first layout

- Restructure as a single-column, thumb-friendly view designed for ~375px width and scaling up.
- Sticky header with event title, status badge, and a compact back link.
- Counters (`Going`, `Checked-in`, `Remaining`) become a 3-up grid that stays compact on mobile (smaller pad/typography on `sm`, scaled up on `md+`).
- Code input becomes the visual focus: large (h-16+), monospace, uppercase, full-width, with a primary action button directly below at full width.
- Action buttons stack vertically on mobile, sit inline on `sm:` and up.
- Generous tap targets (min 44px), comfortable vertical spacing, no horizontal scroll.

### 2. "Scan QR" coming-soon button

- Add a secondary button above the manual code form labeled "Scan QR" with a camera/QR icon.
- Permanently `disabled`, with a small "Coming soon" badge or muted helper text under it.
- Visually consistent with the other actions; does not steal focus from the code input.

### 3. Links to public + management pages

- Add a small action row under the title with two links:
  - **View public page** → `/e/:eventId` (opens in new tab).
  - **Manage event** → `/dashboard/:hostId/events/:eventId` — only shown when the current user has `host` role for this host (the existing `access` query already returns `role`); checkers see only the public link.
- Keep the existing "Back to dashboard" link.

### 4. Realtime listening

- The page already subscribes to `check_ins` and `rsvps` postgres changes for the event and refreshes counters. Verify the channel is correctly torn down, ensure `refreshCounters` runs once on mount and on every change, and confirm subscription survives auth/access readiness.
- After a successful manual check-in or undo, optimistically call `refreshCounters()` so the UI updates immediately even if the realtime event is briefly delayed.

### Out of scope

- Actual QR scanner implementation.
- Any RLS / edge-function changes (already locked down to host_members).
- Changes to other pages.

### Files touched

- `src/pages/CheckIn.tsx` (only).
