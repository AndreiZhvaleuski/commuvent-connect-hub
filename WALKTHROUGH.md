# Reviewer walkthrough

Click-by-click guide covering every graded flow on the live demo:
**https://commuvent-connect-hub.lovable.app**

The deployed app is pre-seeded — no setup required.

---

## Sign-in shortcut

- **Demo password (all accounts):** `Password123!`
- Open **`/sign-in`** → expand the **Demo accounts** panel → tabs for
  Hosts / Checkers / Attendees → click any email to auto-fill, then
  **Sign in**.

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
in-progress event has 1 pending photo. The moderation queue is
non-empty out of the box.

**Reports:** the Reports tab is pre-populated with **3 open** reports
(2 events + 1 photo, from different attendees) and **2 historical**
reports (1 hidden event, 1 dismissed photo).

> If anything looks stale or empty, re-run the `seed_demo` edge function
> (`POST /functions/v1/seed_demo` with header `x-seed-secret: <secret>`).
> It wipes everything and re-seeds in ~30s.

> Each step lists **As** (which user to sign in as), **Do** (what to
> click), and **Expect** (the observable outcome). Sign out between
> flows when the user changes (header avatar → **Sign out**).

---

## Flow A — Browse as a guest

Sign out first if needed (or use a private window).

1. **Do:** Open `/explore`.
   **Expect:** A grid of upcoming events. Filters card with **Search**,
   **Location** (Any / Offline / Online chips), **From / To** date
   pickers, **Include past events** switch, and **Earliest / Latest**
   sort tabs.
2. **Do:** Toggle **Include past events** on.
   **Expect:** Cards with an **"Ended"** badge appear.
3. **Do:** Open any past event (e.g. *Intro to LLM Agents*).
   **Expect:** Page shows an **Ended** banner. **No RSVP button**.
4. **Do:** Open an upcoming event (e.g. *AI Hack Night*) and click
   **RSVP**.
   **Expect:** Redirect to `/sign-in?redirect=/e/<id>`. After sign-in
   you'll bounce back to the event page.

---

## Flow B — Publish an event (Host)

- **As:** `host.alice@demo.commuvent.app`

1. **Do:** Sign in.
   **Expect:** Redirect to `/dashboard/<hostId>` (Acme Tech Talks).
   Upcoming/Past tabs visible. Each row shows **Going / Waitlist /
   Checked-in** counts.
2. **Do:** Click **New event** (top right).
   **Expect:** Editor at `/dashboard/<hostId>/events/new`.
3. **Do:** Fill the form — Title `Reviewer Test Event`, a description,
   start time +1h from now, end time +3h from now, pick any time zone,
   capacity `10`. Hover the **Paid** option of the Free/Paid toggle.
   **Expect:** Paid is disabled with a **"Coming soon"** tooltip.
4. **Do:** Click **Upload cover** and pick any image.
   **Expect:** Cover preview renders.
5. **Do:** Set Visibility = **Public**, Status = **Published**, click
   **Save**.
   **Expect:** Redirect to the event manage page; toast `Saved`.
   Open `/explore` in another tab → the new event appears in the grid.
6. **Do:** Back on the manage page header, click **Duplicate**.
   **Expect:** Toast `Duplicated`, you land on the new draft's editor.

---

## Flow C — RSVP, ticket & calendar (Attendee)

- **As:** `att.gina@demo.commuvent.app`

1. **Do:** Sign in → `/explore` → open **AI Hack Night**.
2. **Do:** Click **RSVP** → confirm in the dialog.
   **Expect:** Toast `You're going`. Status pill on the event header
   becomes **Going**.
3. **Do:** Open `/tickets`.
   **Expect:** Ticket card with QR code, 6-character ticket code,
   **Add to calendar** menu (Google + .ics).
4. **Do:** **Add to calendar → Download .ics**.
   **Expect:** A `.ics` file downloads; opening it shows the correct
   title, start/end times.
5. **Do:** Click **Cancel RSVP** on the ticket → confirm.
   **Expect:** Toast `RSVP cancelled`. Ticket disappears from
   `/tickets`. The event header pill clears.

---

## Flow D — Waitlist + automatic FIFO promotion

The seed already over-subscribes **AI Hack Night** (capacity = 4):
`att.gina/henry/ivy/jack` are **going**, `att.kate/liam/mia/noah` sit
on the waitlist. Use two browsers (or one normal + one private window)
so two users stay signed in side-by-side.

1. **As:** `att.kate@demo.commuvent.app` (private window) → sign in →
   `/tickets`.
   **Expect:** A waitlist card for **AI Hack Night** showing
   **Waitlist · position 1**. No QR ticket yet. The bell icon in the
   header already shows an unread notification *"You're on the waitlist
   for AI Hack Night"*.
2. **As:** `att.gina@demo.commuvent.app` (other window) → sign in →
   `/tickets` → on the **AI Hack Night** ticket click **Cancel RSVP**
   → confirm.
   **Expect:** Toast `RSVP cancelled`; ticket disappears.
3. Switch back to **Kate's** window — do **not** reload.
   **Expect:** The waitlist card flips to a real **Going** ticket with
   a QR code, automatically (pushed via Realtime). A new unread
   notification appears in the bell icon.


---

## Flow E — Run the door (Checker)

- **As:** `checker.dan@demo.commuvent.app` (Acme checker)

1. **Do:** Sign in → `/dashboard`.
   **Expect:** A single Acme card with only a **Check-in** action
   (no New event / RSVPs / Moderation buttons — checker scope).
2. **Do:** Open **Live: TypeScript Performance** (in-progress event)
   → land on `/checkin/<eventId>`.
   **Expect:** Three counters live-updating: **Going / Checked-in /
   Remaining**.
3. **Do (in a private window):** Sign in as `att.gina@…`, open
   `/tickets`, copy the 6-character code for *Live: TypeScript
   Performance*.
4. **Do:** Back as `checker.dan`, paste the code → **Submit**.
   **Expect:** Success toast; **Checked-in** counter +1.
5. **Do:** Submit the same code again.
   **Expect:** Warning toast (already checked in); counters do not
   change.
6. **Do:** Click **Undo last scan**.
   **Expect:** Success toast; **Checked-in** counter −1.
7. **Do:** Navigate to a **completed** event's check-in page (e.g.
   `/checkin/<id>` for *Intro to LLM Agents*).
   **Expect:** A destructive **"Check-in is closed"** alert; the
   submit button is blocked.

---

## Flow F — Export RSVPs CSV (self-serve)

- **As:** `host.alice@demo.commuvent.app`

1. **Do:** `/dashboard/<hostId>` → switch to the **Past** tab → click
   *Intro to LLM Agents* (most data).
2. **Do:** In the event manage page, click **RSVPs** in the header.
3. **Do:** Click **Export CSV**.
   **Expect:** A file downloads, e.g. `rsvps-intro-to-llm-agents.csv`.
4. **Do:** Open it in Excel or Google Sheets.
   **Expect:**
   - Encoding: **UTF-8 with BOM** — names like *Müller* render
     correctly without mojibake.
   - Columns exactly: `name, email, rsvp_status, check_in_time`.
   - `check_in_time` is **ISO-8601** with the event's TZ offset, blank
     for non-checked-in rows.
   - At least ~6 rows of data, including both `going` and `waitlist`
     statuses.

---

## Flow G — Gallery upload + host approval

The gallery + moderation queue is **already populated** by the seed:
each completed event has 2 approved + 2 pending + 1 rejected photo,
each from a different attendee.

- **As:** `host.alice@demo.commuvent.app`

1. **Do:** Sign in → `/dashboard/<hostId>/moderation` → **Gallery queue**
   tab.
   **Expect:** Several pending photos listed (across Acme's events),
   each labelled with the uploader's name.
2. **Do:** Click **Approve** on one and **Reject** on another.
   **Expect:** Both rows disappear from the queue. Toast confirmations.
3. **Do:** Open the public page of the event whose photo you approved.
   **Expect:** The newly-approved photo now renders in the public
   Gallery grid alongside the seed's approved photos.

Optional second pass — upload as an attendee:

- **As:** `att.gina@demo.commuvent.app`

4. **Do:** Open a completed event (e.g. *Intro to LLM Agents*) → scroll
   to **Gallery** → **Upload photo** → pick any image → submit.
   **Expect:** Photo appears in your "Pending" tray; not yet public.
   Sign back in as Alice to approve it from the Gallery queue.


---

## Flow H — Feedback (post-event, gated)

- **As:** `att.gina@demo.commuvent.app`

1. **Do:** Open a **completed** event you were checked in to (the seed
   checks Gina in to most completed events). Scroll to **Feedback**.
   **Expect:** A 1–5 star form with an optional comment.
2. **Do:** Submit a 5-star feedback with a comment.
   **Expect:** Toast `Thanks for your feedback`; the new entry appears
   at the bottom of the list (sortable oldest→newest).
3. **Do:** Open an **upcoming** event you've RSVPd to.
   **Expect:** **No** feedback form — only an info note that feedback
   opens after the event ends.

---

## Flow I — Report + moderation hide

- **As:** `att.henry@demo.commuvent.app`

1. **Do:** Open any event → scroll to the bottom → **Report event** →
   pick a reason → submit.
   **Expect:** Toast `Report submitted`.

- **As:** `host.alice@demo.commuvent.app`

2. **Do:** `/dashboard/<hostId>/moderation` → **Reports** tab.
   **Expect:** The new report is listed with reason and reporter.
3. **Do:** Click **Hide**.
   **Expect:** Confirmation dialog → confirm → row updates to
   `hidden`. The reported item is removed from public listings.

---

## Flow J — Invite a member

- **As:** `host.alice@demo.commuvent.app`

1. **Do:** `/dashboard/<hostId>/members` → in the **Invite by link**
   card pick role **Checker** → **Generate**.
   **Expect:** Toast `Invite link created`; a row appears with a
   copyable token (eye icon to reveal).
2. **Do:** Copy the link, then in a private window sign in as
   `att.noah@…` and open the invite URL.
   **Expect:** Invite preview showing host name, logo and role.
3. **Do:** Click **Accept**.
   **Expect:** Redirect to `/dashboard`; Acme Tech Talks now appears
   for Noah with **Checker** scope.

---

## Flow K — My Events aggregate

- **As:** `host.alice@demo.commuvent.app`

1. **Do:** Open `/my-events`.
   **Expect:** All events where Alice has a role, with filters by host
   / date range / search, and role-appropriate quick actions
   (Manage / Check-in) per row.

---

## Done

If every flow above produced the expected outcome, the MVP requirements
(publishing, discovery, RSVP, tickets, waitlist + FIFO, roles, host
dashboard with stats + CSV, check-in with undo, gallery moderation,
post-event feedback, reports, invites, My Events) are all covered.
