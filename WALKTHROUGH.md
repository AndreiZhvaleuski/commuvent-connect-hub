

# Reviewer walkthrough

Click-by-click guide covering every graded flow on the live demo:
**https://commuvent-connect-hub.lovable.app**

> If the site doesn't load in your region, try using a VPN — the Lovable
> hosting service may be blocked in some countries.

> Some flows end with a **Recording** section embedding a short iPhone
> screen recording.

> **Demo password (all accounts):** `Password123!`

> **Run flows in order (A → K).** Several flows rely on the pristine
> seed state (especially Flow D's waitlist). If you skip ahead or
> replay a flow, **re-seed first** (instructions below).

---

## Reset the demo before each session

Several flows are **not idempotent** — Flow D in particular consumes the
**AI Hack Night** waitlist baseline (Gina cancels → Kate auto-promotes
from the waitlist). Replay it without resetting and the starting state
will be wrong.

To restore the documented baseline at any time:

1. Go to **Sign in** (top-right of the site).
2. Click the **user-icon** button on the sign-in card to open the
   **Demo accounts** dialog.
3. Scroll to the **Re-seed demo data** section at the bottom.
4. Paste the seed secret into the input `XEDa7^RBCUmdFPfg7)nxeTdz8Ek6d4>K6:u)P.<PtM<:70B#CmWb>4aaR34w9Y[.`.
5. Click **Re-seed demo data**. Wait ~20–30s for the toast confirming
   the rebuild.

The reseed wipes ALL data, auth users, and storage, then rebuilds the
deterministic dataset described above. Safe to run anytime.

---

## Seeded data this walkthrough relies on

| Role     | Email                              | Notes                       |
|----------|------------------------------------|-----------------------------|
| Host     | `host.alice@demo.commuvent.app`    | Owns **Acme Tech Talks**    |
| Host     | `host.bob@demo.commuvent.app`      | Owns Trailblazers Outdoors  |
| Host     | `host.clara@demo.commuvent.app`    | Owns Culinary Collective    |
| Checker  | `checker.dan@demo.commuvent.app`   | Acme — checker only         |
| Checker  | `checker.eve@demo.commuvent.app`   | Trailblazers — checker only |
| Checker  | `checker.finn@demo.commuvent.app`  | Culinary — checker only     |
| Attendee | `att.gina@…` … `att.noah@…`        | 8 demo attendees            |

**Events:** 9 total (3 per host × completed / in-progress / upcoming).
The upcoming **AI Hack Night** (Acme) has **capacity 4** — used for the
waitlist demo. The seed RSVPs all 8 attendees in deterministic order, so
`att.gina/henry/ivy/jack` are **going** and `att.kate/liam/mia/noah` sit
on the **waitlist** (in that order).

**Gallery:** every completed event is pre-loaded with **5 photos from 5
different attendees** — 2 approved, 2 pending, 1 rejected. Each
in-progress event has 1 pending photo.

**Reports:** the Reports tab is pre-populated with **3 open** reports
(2 events + 1 photo) and **2 historical** reports (1 hidden event,
1 dismissed photo).

> If anything looks stale or empty, re-run the `seed_demo` edge function
> (`POST /functions/v1/seed_demo` with header `x-seed-secret: <secret>`).
> It wipes everything and re-seeds in ~30s.

---

## Flow A — Browse as a guest

1. Click the **Commuvent** header/logo (top-left) to open the main page.
2. If a user avatar shows in the top-right, click it → **Sign out**.
3. Click **Explore** in the top nav.
   *Expect:* a grid of upcoming event cards and a Filters card.
4. Toggle **Include past events** ON.
   *Expect:* cards with an **"Ended"** badge appear.
5. In the **Location** row, click the **Offline** chip.
6. Click the **Earliest** sort tab.
7. In the **Search** field, type `LLM`.
   *Expect:* the grid filters live as you type and shows
   **Intro to LLM Agents** (an Ended event).
8. Click the **Intro to LLM Agents** card.
   *Expect:* event page shows an **Ended** banner; **no RSVP button**.
9. Click the browser **Back** button.
10. In the Filters card, click **Clear filters**.
11. In the **Search** field, type `AI Hack`.
12. Click the **AI Hack Night** card.
13. Click **Join waitlist** (the event is fully booked from the seed,
    so guests see Join waitlist instead of RSVP).
    *Expect:* redirect to `/sign-in?redirect=/e/<id>`.
14. On the sign-in card, click the **user-icon** button to open the
    **Demo accounts** panel.
15. Click the **Attendees** tab.
16. Click the row for `att.gina@demo.commuvent.app` to auto-fill, then
    click **Sign in**.
    *Expect:* you bounce back to the **AI Hack Night** event page.
17. *Expect:* the **AI Hack Night** event page shows the **Going**
    pill in the header — `att.gina` is already seeded as going to this
    event, so the page reflects that state instead of showing the
    Join waitlist button.
18. Click **My Tickets** in the top nav.
    *Expect:* a ticket card for **AI Hack Night** with QR code and
    a 6-character ticket code.
19. Click your avatar (top-right) → **Sign out**.

### Recording

https://github.com/user-attachments/assets/7b362903-872e-4f58-bc0f-12a5563b47a9

---

## Flow B — Publish an event (Host)

1. Click the **Commuvent** header/logo (top-left) to open the main page.
2. If a user avatar shows in the top-right, click it → **Sign out**.
3. Click **Sign in** in the top-right.
4. On the sign-in card, click the **user-icon** button to open the
   **Demo accounts** panel.
5. Click the **Hosts** tab.
6. Click the row for `host.alice@demo.commuvent.app` to auto-fill, then
   click **Sign in**.
   *Expect:* you land on `/dashboard/<hostId>` for **Acme Tech Talks**
   with **Upcoming** / **Past** tabs.
7. Click **New event** (top right).
   *Expect:* the editor at `/dashboard/<hostId>/events/new`.
8. In **Title**, type `AI Agents Meetup — March`.  
9. In **Description**, type `An evening of demos and networking for builders working with autonomous agents.`
10. In **Start time**, pick a time roughly **+1 hour from now**.
11. In **End time**, pick a time roughly **+3 hours from now**.
12. In **Time zone**, select `Europe/Berlin`.
13. In **Capacity**, type `10`.
14. Hover the **Paid** option of the Free / Paid toggle.
    *Expect:* Paid is disabled with a **"Coming soon"** tooltip.
15. Click **Upload cover** and pick any image from your device.
    *Expect:* a cover preview renders.
16. Set **Visibility** to **Public**.
17. Set **Status** to **Published**.
18. Click **Save changes**.
    *Expect:* toast `Saved`; you stay on the event manage page.
19. Click the **Commuvent** header/logo, then click **Explore**.
    *Expect:* the new event appears in the grid.
20. Click the browser **Back** button to return to the manage page.
21. Click **Duplicate** in the manage header.
    *Expect:* toast `Duplicated`; you land on the new draft's editor.
22. Click your avatar (top-right) → **Sign out**.

### Recording

https://github.com/user-attachments/assets/4011a622-8878-431f-a2aa-112cfd69f2aa

---

## Flow C — Ticket, calendar & cancel/re-RSVP (Attendee)

We use `att.henry` and **Farm-to-Table Dinner** so this flow stays
self-contained and doesn't touch the AI Hack Night waitlist used in
Flow D.

1. Click the **Commuvent** header/logo (top-left) to open the main page.
2. If a user avatar shows in the top-right, click it → **Sign out**.
3. Click **Sign in** in the top-right.
4. On the sign-in card, click the **user-icon** button to open the
   **Demo accounts** panel.
5. Click the **Attendees** tab.
6. Click the row for `att.henry@demo.commuvent.app` to auto-fill, then
   click **Sign in**.
7. Click **My Tickets** in the top nav.
   *Expect:* a list of seeded tickets, each with a QR code and a
   6-character ticket code.
8. Find the ticket for **Farm-to-Table Dinner** and click
   **Add to calendar**.
9. Click **Download .ics**.
   *Expect:* a `.ics` file downloads with the correct title and times.
10. On the same ticket, click **Cancel RSVP**.
11. In the confirmation dialog, click **Confirm**.
    *Expect:* toast `RSVP cancelled`; the ticket disappears.
12. Click the **Commuvent** header/logo, then click **Explore**.
13. In **Search**, type `Farm-to-Table`.
14. Click the **Farm-to-Table Dinner** card.
15. Click **RSVP**.
16. In the confirmation dialog, click **Confirm**.
    *Expect:* toast `You're going`; the header pill shows **Going**.
17. Click **My Tickets** in the top nav.
    *Expect:* the **Farm-to-Table Dinner** ticket is back with a fresh
    QR code.
18. Click your avatar (top-right) → **Sign out**.

### Recording

https://github.com/user-attachments/assets/543285b0-4ad4-4515-99c4-d1adc87066e4

---

## Flow D — Waitlist + automatic FIFO promotion (two windows)

> **Re-seed first** if you've already played this flow once — it
> consumes the AI Hack Night waitlist baseline and is not idempotent.
> See [Reset the demo before each session](#reset-the-demo-before-each-session).

The seed already over-subscribes **AI Hack Night** (capacity = 4):
`att.gina/henry/ivy/jack` are **going**, `att.kate/liam/mia/noah` sit
on the waitlist. Open a second **private / incognito** window for
Window 2 so the two sessions don't collide.

### Window 1 — Kate

1. Click the **Commuvent** header/logo (top-left) to open the main page.
2. If a user avatar shows in the top-right, click it → **Sign out**.
3. Click **Sign in** in the top-right.
4. On the sign-in card, click the **user-icon** button to open the
   **Demo accounts** panel.
5. Click the **Attendees** tab.
6. Click the row for `att.kate@demo.commuvent.app` to auto-fill, then
   click **Sign in**.
7. Click **My Tickets** in the top nav.
   *Expect:* a waitlist card for **AI Hack Night** showing
   **Waitlist · position 1**. No QR ticket yet.
8. Leave this window open and visible.

### Window 2 — Gina (private / incognito window)

9. Open a private/incognito window and go to
   `https://commuvent-connect-hub.lovable.app`.
10. Click the **Commuvent** header/logo to open the main page.
11. Click **Sign in** in the top-right.
12. On the sign-in card, click the **user-icon** button to open the
    **Demo accounts** panel.
13. Click the **Attendees** tab.
14. Click the row for `att.gina@demo.commuvent.app` to auto-fill, then
    click **Sign in**.
15. Click **My Tickets** in the top nav.
16. On the **AI Hack Night** ticket, click **Cancel RSVP**.
17. In the confirmation dialog, click **Confirm**.
    *Expect:* toast `RSVP cancelled`; the ticket disappears.

### Back to Window 1 — Kate (do **not** reload)

18. *Expect (realtime):* the top nav grows a numeric **`1`** badge next
    to **My Tickets**, and the waitlist card flips into a **Going**
    ticket with a QR code, prefixed by a highlighted callout
    *"You were promoted from the waitlist — your seat is confirmed."*
    plus an **Acknowledge** button. A top-of-page banner also offers
    **Acknowledge all**.
19. Click **Acknowledge** on the ticket (or **Acknowledge all** at the
    top).
    *Expect:* the callout disappears and the nav badge clears to zero.
20. Reload the page.
    *Expect:* the badge stays at zero (acknowledgement persisted).
21. In **both** windows, click the avatar (top-right) → **Sign out**.

---

## Flow E — Run the door (Checker, two windows)

> **Re-seed first** if you've already played Flow D or this flow —
> check-ins and Gina's RSVP state are not idempotent.
> See [Reset the demo before each session](#reset-the-demo-before-each-session).

Open a second **private / incognito** window for Window 2.

### Window 1 — Checker Dan

1. Click the **Commuvent** header/logo (top-left) to open the main page.
2. If a user avatar shows in the top-right, click it → **Sign out**.
3. Click **Sign in** in the top-right.
4. On the sign-in card, click the **user-icon** button to open the
   **Demo accounts** panel.
5. Click the **Checkers** tab.
6. Click the row for `checker.dan@demo.commuvent.app` to auto-fill,
   then click **Sign in**.
   *Expect:* you land on the home page (no auto-redirect for checkers).
7. Click **Dashboard** in the top nav.
   *Expect:* `/dashboard` shows a single Acme host card labelled
   *"Checker · Check-in events"*.
8. Click the **Acme** host card.
   *Expect:* you land on `/dashboard/<hostId>`; each event card exposes
   only a **Check-in** action (no Manage / Edit / RSVPs / New event /
   Moderation).
8. On the **Upcoming** tab, click **Check-in** on the
   **Live: TypeScript Performance** card (in-progress).
   *Expect:* you land on `/checkin/<eventId>` with three live counters
   labelled **Going / Waitlist / Checked-in** (Going includes
   `/ capacity`).
9. Leave this window open.

### Window 2 — Attendee Gina (private / incognito window)

10. Open a private/incognito window and go to
    `https://commuvent-connect-hub.lovable.app`.
11. Click **Sign in** in the top-right.
12. On the sign-in card, click the **user-icon** button to open the
    **Demo accounts** panel.
13. Click the **Attendees** tab.
14. Click the row for `att.gina@demo.commuvent.app` to auto-fill, then
    click **Sign in**.
15. Click **My Tickets** in the top nav.
16. Find the ticket for **Live: TypeScript Performance** and copy its
    6-character code.

### Back to Window 1 — Dan

17. Click the **Enter ticket code** field and paste the code.
18. Click **Check in**.
    *Expect:* success toast; **Checked-in** counter +1.
19. Click **Check in** again with the same code still in the field.
    *Expect:* warning toast (already checked in); counters unchanged.
20. Click **Undo last scan**.
    *Expect:* success toast; **Checked-in** counter −1.
21. Navigate to a completed event to confirm check-in is closed:
    1. Click the **Commuvent** logo (top-left) to go home.
    2. Click **Dashboard** in the top nav.
    3. Click the **Acme** host card.
    4. Switch to the **Past** tab.
    5. Click **Check-in** on the **Intro to LLM Agents** card.
    *Expect:* a destructive **"Check-in is closed"** alert; the
    code input and **Check in** button are disabled.
22. In **both** windows, click the avatar (top-right) → **Sign out**.

---

## Flow F — Export RSVPs CSV (Host)

1. Click the **Commuvent** header/logo (top-left) to open the main page.
2. If a user avatar shows in the top-right, click it → **Sign out**.
3. Click **Sign in** in the top-right.
4. On the sign-in card, click the **user-icon** button to open the
   **Demo accounts** panel.
5. Click the **Hosts** tab.
6. Click the row for `host.alice@demo.commuvent.app` to auto-fill, then
   click **Sign in**.
   *Expect:* you land on `/dashboard/<hostId>`.
7. Click the **Past** tab.
8. Click the row for **Intro to LLM Agents**.
9. Click **RSVPs** in the manage page header.
10. Click **Export CSV**.
    *Expect:* a file downloads, e.g. `rsvps-intro-to-llm-agents.csv`.
11. Open the file in Excel or Google Sheets.
    *Expect:*
    - Encoding is **UTF-8 with BOM** — names like *Müller* render
      correctly without mojibake.
    - Columns are exactly: `name, email, rsvp_status, check_in_time`.
    - `check_in_time` is **ISO-8601** with the event's TZ offset, blank
      for non-checked-in rows.
    - At least ~6 rows, including both `going` and `waitlist`.
12. Click your avatar (top-right) → **Sign out**.

---

## Flow G — Gallery upload + host approval

The gallery + moderation queue is **already populated** by the seed.

### Part 1 — Host approves (`host.alice`)

1. Click the **Commuvent** header/logo (top-left) to open the main page.
2. If a user avatar shows in the top-right, click it → **Sign out**.
3. Click **Sign in** in the top-right.
4. On the sign-in card, click the **user-icon** button to open the
   **Demo accounts** panel.
5. Click the **Hosts** tab.
6. Click the row for `host.alice@demo.commuvent.app` to auto-fill, then
   click **Sign in**.
7. Click **Dashboard** in the top nav (if not already there).
8. Click **Moderation** in the dashboard header.
9. Click the **Gallery queue** tab.
   *Expect:* several pending photos across Acme's events, each
   labelled with the uploader's name.
10. On the **first** pending row, click **Approve**.
    *Expect:* toast confirmation; the row disappears.
11. On the next pending row, click **Reject**.
    *Expect:* toast confirmation; the row disappears.
12. Click the **Commuvent** header/logo to open the main page, then
    click **Explore** → toggle **Include past events** ON → open the
    event you just approved a photo for.
13. Scroll to the **Gallery** section.
    *Expect:* the newly-approved photo renders in the public grid.
14. Click your avatar (top-right) → **Sign out**.

### Part 2 — Attendee uploads (`att.gina`)

15. Click the **Commuvent** header/logo to open the main page.
16. Click **Sign in** in the top-right.
17. On the sign-in card, click the **user-icon** button to open the
    **Demo accounts** panel.
18. Click the **Attendees** tab.
19. Click the row for `att.gina@demo.commuvent.app` to auto-fill, then
    click **Sign in**.
20. Click **Explore** in the top nav.
21. Toggle **Include past events** ON.
22. Click the card titled **Intro to LLM Agents**.
23. Scroll to the **Gallery** section.
24. Click **Upload photo**, pick any image, then submit.
    *Expect:* the photo appears in your "Pending" tray; not yet public.
25. Click your avatar (top-right) → **Sign out**.

---

## Flow H — Feedback (post-event, gated)

1. Click the **Commuvent** header/logo (top-left) to open the main page.
2. If a user avatar shows in the top-right, click it → **Sign out**.
3. Click **Sign in** in the top-right.
4. On the sign-in card, click the **user-icon** button to open the
   **Demo accounts** panel.
5. Click the **Attendees** tab.
6. Click the row for `att.gina@demo.commuvent.app` to auto-fill, then
   click **Sign in**.
7. Click **Explore** in the top nav.
8. Toggle **Include past events** ON.
9. Click a completed event Gina was checked in to (e.g.
   **Intro to LLM Agents**).
10. Scroll to the **Feedback** section.
    *Expect:* a 1–5 star form with an optional comment field.
11. Click the **5th** star.
12. In the comment field, type `Great event!`.
13. Click **Submit**.
    *Expect:* toast `Thanks for your feedback`; the new entry appears
    at the bottom of the list.
14. Click the **Commuvent** header/logo to open the main page.
15. Click **Explore** → in **Search** type `AI Hack Night` → click the
    card.
16. Scroll down looking for a Feedback form.
    *Expect:* **no** feedback form — only an info note that feedback
    opens after the event ends.
17. Click your avatar (top-right) → **Sign out**.

---

## Flow I — Report + moderation hide

The Reports tab is **already populated** by the seed.

### Part 1 — Host hides a report (`host.alice`)

1. Click the **Commuvent** header/logo (top-left) to open the main page.
2. If a user avatar shows in the top-right, click it → **Sign out**.
3. Click **Sign in** in the top-right.
4. On the sign-in card, click the **user-icon** button to open the
   **Demo accounts** panel.
5. Click the **Hosts** tab.
6. Click the row for `host.alice@demo.commuvent.app` to auto-fill, then
   click **Sign in**.
7. Click **Dashboard** in the top nav.
8. Click **Moderation** in the dashboard header.
9. Click the **Reports** tab.
   *Expect:* a list with mixed `open` / `hidden` / `dismissed` rows.
10. On the first **open** event report, click **Hide**.
11. In the confirmation dialog, click **Hide**.
    *Expect:* status flips to `hidden`.
12. Click your avatar (top-right) → **Sign out**.

### Part 2 — Attendee files a fresh report (`att.henry`)

13. Click the **Commuvent** header/logo to open the main page.
14. Click **Sign in** in the top-right.
15. On the sign-in card, click the **user-icon** button to open the
    **Demo accounts** panel.
16. Click the **Attendees** tab.
17. Click the row for `att.henry@demo.commuvent.app` to auto-fill, then
    click **Sign in**.
18. Click **Explore** in the top nav.
19. Click any event card.
20. Scroll to the bottom of the event page.
21. Click **Report event**.
22. Pick reason `Spam`.
23. In the comment field, type `Looks like a spam listing.`.
24. Click **Submit report**.
    *Expect:* toast `Report submitted`.
25. Click your avatar (top-right) → **Sign out**.

---

## Flow J — Invite a member (two windows)

Open a second **private / incognito** window for Window 2.

### Window 1 — Host Alice

1. Click the **Commuvent** header/logo (top-left) to open the main page.
2. If a user avatar shows in the top-right, click it → **Sign out**.
3. Click **Sign in** in the top-right.
4. On the sign-in card, click the **user-icon** button to open the
   **Demo accounts** panel.
5. Click the **Hosts** tab.
6. Click the row for `host.alice@demo.commuvent.app` to auto-fill, then
   click **Sign in**.
7. Click **Dashboard** in the top nav.
8. Click **Members** in the dashboard header.
9. In the **Invite by link** card, find the **Checker** card.
10. Click **Create checker link**.
    *Expect:* toast `Invite link created`; a new row appears.
11. On the new row, click the **eye** icon to reveal the token.
12. Click the **copy** icon to copy the invite URL.

### Window 2 — Attendee Noah (private / incognito window)

13. Open a private/incognito window and go to
    `https://commuvent-connect-hub.lovable.app`.
14. Click **Sign in** in the top-right.
15. On the sign-in card, click the **user-icon** button to open the
    **Demo accounts** panel.
16. Click the **Attendees** tab.
17. Click the row for `att.noah@demo.commuvent.app` to auto-fill, then
    click **Sign in**.
18. Paste the copied invite URL into the address bar and press Enter.
    *Expect:* an invite preview showing the host name, logo and role.
19. Click **Accept**.
    *Expect:* redirect to `/dashboard`; **Acme Tech Talks** now
    appears for Noah with **Checker** scope.
20. In **both** windows, click the avatar (top-right) → **Sign out**.

---

## Flow K — My Events aggregate

1. Click the **Commuvent** header/logo (top-left) to open the main page.
2. If a user avatar shows in the top-right, click it → **Sign out**.
3. Click **Sign in** in the top-right.
4. On the sign-in card, click the **user-icon** button to open the
   **Demo accounts** panel.
5. Click the **Hosts** tab.
6. Click the row for `host.alice@demo.commuvent.app` to auto-fill, then
   click **Sign in**.
7. Click **My Events** in the top nav.
   *Expect:* a list of all events where Alice has a role, with
   filters and per-row quick actions (Manage / Check-in).
8. In the **Search** field, type `Tech`.
9. In **From date**, pick **today**.
10. Click the **Past** time tab.
    *Expect:* the list narrows to past Tech-related events.
11. Click **Clear filters**.
    *Expect:* the full list returns.
12. Click your avatar (top-right) → **Sign out**.
