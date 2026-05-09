## Goal

Correct Flow E in `WALKTHROUGH.md` so the steps match the real UI. No code changes.

## Issues found

Comparing Flow E (lines 260–314) against `src/pages/Dashboard.tsx`, `src/pages/HostDashboard.tsx`, `src/components/event-management-card.tsx`, and `src/pages/CheckIn.tsx`:

1. **Step 6 expectation** — describes Check-in as if it lives on the host card. The host card on `/dashboard` only opens the host dashboard; **Check-in** is a per-event action on each event card.
2. **Step 7** — "Click Check-in on the Acme card" is wrong. There is no Check-in button on the host card.
3. **Step 8** — counters are listed as "Going / Checked-in / Remaining". The real labels are **Going / Waitlist / Checked-in** (Going shows a `/ capacity` suffix).
4. **Step 17** — field label is **"Enter ticket code"**, not "Ticket code".
5. **Steps 18–19** — submit button label is **"Check in"**, not "Submit".
6. **Step 21** — same host-card mistake, and skips navigation. After signing in for check-in, the checker is on `/checkin/<eventId>`; to reach a different event they must go back to `/dashboard`, open the Acme host, switch to the **Past** tab, then click **Check-in** on the past event.

## Proposed rewrite (Flow E)

Keep the re-seed warning and two-window structure. Apply these edits, preserving every navigation step explicitly:

- **Step 6 expectation**: *"`/dashboard` shows a single Acme host card labelled 'Checker · Check-in events'."*
- **New step 7**: *"Click the Acme host card."* → lands on `/dashboard/<hostId>`. *Expect:* event cards expose only a **Check-in** action (no Manage / Edit / RSVPs / New event / Moderation).
- **Step 8**: *"On the **Upcoming** tab, click **Check-in** on the **Live: TypeScript Performance** card (in-progress)."*
   *Expect:* `/checkin/<eventId>` with three live counters labelled **Going / Waitlist / Checked-in** (Going includes `/ capacity`).
- **Step 17**: *"Click the **Enter ticket code** field and paste the code."*
- **Steps 18–19**: rename button to **Check in** (was "Submit").
- **Step 21** (split into explicit navigation steps):
   1. Click the **Commuvent** logo (top-left) to go home.
   2. Click **Dashboard** in the top nav.
   3. Click the **Acme** host card.
   4. Switch to the **Past** tab.
   5. Click **Check-in** on the **Intro to LLM Agents** card.
   *Expect:* destructive **"Check-in is closed"** alert; the code input and **Check in** button are disabled.

Renumber the rest of the flow to stay sequential.

## Out of scope

- No code changes.
- No edits to other flows.
