## MVP requirements vs. implementation — audit

All functional MVP requirements are implemented (verified previously). No source-code changes needed. This plan covers submission deliverables only.

---

## Files to create / edit (build phase)

- ✏️ `README.md` — concise project intro + pointers (full rewrite, much shorter than today).
- ➕ `WALKTHROUGH.md` — the detailed, click-by-click reviewer guide. The "graded" doc.
- ➕ `report.md` — build journal: tools, decisions, what worked / didn't.

`sample-exports/rsvps.csv` is no longer advertised — reviewer generates a real CSV themselves as part of the walkthrough.

---

## 1. README.md (short)

Sections, in order:

1. **What is Commuvent** — 1 paragraph.
2. **Live demo URL** + GitHub link.
3. **For reviewers** — single sentence + link: *"Follow [WALKTHROUGH.md](./WALKTHROUGH.md) for a click-by-click guided review covering Publish → RSVP → Ticket → Check-in → Export → Waitlist → Moderation."*
4. **Tech stack** — bullets (React + Vite + TS + Tailwind + shadcn; Supabase Postgres + RLS + Auth + Storage + Edge Functions + Realtime).
5. **Local dev** — `npm i`, `npm run dev`, required env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
6. **Project layout** — top-level dirs in 4–6 lines.
7. **Pointer** to `report.md`.

That's it. No flow descriptions in the README itself.

---

## 2. WALKTHROUGH.md (detailed reviewer guide) — the main deliverable

Format for **every step** (consistent throughout):

> **Step N — short title**
> **As:** *<demo email>* (password `Password123!`)
> **Do:** explicit click sequence with route names
> **Expect:** observable outcome (URL, badge, toast, counter value, file contents)

Top of file:

- **Demo password (all accounts):** `Password123!`
- **Sign-in shortcut:** open `/sign-in` → "Demo accounts" panel → click any email to auto-fill, then **Sign in**.
- **Seed snapshot the walkthrough relies on:**
  - Hosts: `host.alice@…` (Acme Tech Talks), `host.bob@…` (Trailblazers), `host.clara@…` (Culinary Collective).
  - Checkers: `checker.dan@…` (Acme), `checker.eve@…` (Trailblazers), `checker.finn@…` (Culinary).
  - Attendees: `att.gina@…` … `att.noah@…` (8 total).
  - 9 events (3 per host × completed / in-progress / upcoming). "AI Hack Night" (Acme, upcoming) has **capacity 4** — chosen for waitlist demo.

### Flow A — Browse as a guest (no sign-in)
1. Open `/explore` → expect grid of upcoming events, filters card visible (Search, Location: Any/Offline/Online, From/To, Include past, sort).
2. Toggle **Include past events** → expect events with "Ended" badge to appear.
3. Open a past event page → expect "Ended" banner and **no RSVP button**.
4. Click **RSVP** on an upcoming event → expect redirect to `/sign-in?redirect=…`.

### Flow B — Publish an event (Host)
- **As:** `host.alice@demo.commuvent.app`
1. After sign-in expect redirect to dashboard listing Acme Tech Talks events with Upcoming/Past tabs and Going/Waitlist/Checked-in counts.
2. Click **New event** → expect `/dashboard/:hostId/events/new` editor.
3. Fill: title `Reviewer Test Event`, description, set start/end (≥30 min apart), pick a TZ, set capacity `10`, toggle **Free/Paid** → expect Paid disabled with "Coming soon" tooltip on hover.
4. Upload a cover image → expect preview.
5. Set Visibility = **Public**, Status = **Published** → click **Save**.
6. Expect redirect to event manage page; the event now appears in `/explore`.
7. Back on dashboard, open the row's **⋯ → Duplicate** → expect a draft copy listed.

### Flow C — RSVP, Ticket, Calendar (Attendee)
- **As:** `att.gina@demo.commuvent.app`
1. `/explore` → open **AI Hack Night**.
2. Click **RSVP** → expect dialog → confirm → status becomes "Going" with a green badge.
3. Open `/tickets` → expect ticket card with QR, ticket code (6-char), Add to Calendar (Google + .ics).
4. Click **Add to Calendar → Download .ics** → expect a `.ics` file download with the correct title and times.
5. Click **Cancel RSVP** on the ticket → confirm → expect ticket removed and event status badge cleared.

### Flow D — Waitlist + FIFO promotion
- Sign in sequentially as **att.gina, att.henry, att.ivy, att.jack** (4 attendees) — RSVP each to **AI Hack Night** → all "Going" (capacity = 4).
- Sign in as **att.kate** → RSVP → expect status **Waitlist · position 1**.
- Sign in as **att.gina** → `/tickets` → **Cancel RSVP**.
- Sign in as **att.kate** → `/tickets` → expect status flipped to **Going** automatically (realtime promotion). Bell icon in header should show 1 unread notification.

### Flow E — Run the door (Checker)
- **As:** `checker.dan@demo.commuvent.app` (Acme checker)
1. Open `/dashboard` → expect single Acme entry restricted to **Check-in** action (no New event / RSVPs / Moderation).
2. Open the in-progress event "Live: TypeScript Performance" → land on `/checkin/:eventId`.
3. Expect three live counters (Going / Checked-in / Remaining).
4. To get a valid code: in another browser/incognito, sign in as `att.gina@…`, open `/tickets`, copy the 6-char code for that event.
5. Paste the code → **Submit** → expect success toast and Checked-in counter +1.
6. Submit the same code again → expect "already checked in" warning, no counter change.
7. Click **Undo last scan** → expect counter −1 and success toast.
8. Try a check-in on a **completed** event → expect destructive "Check-in is closed" alert; submit blocked.

### Flow F — Export RSVPs CSV (Host self-serve)
- **As:** `host.alice@demo.commuvent.app`
1. Dashboard → open **Past** tab → click "Intro to LLM Agents" (most data).
2. Click **RSVPs** in the event header.
3. Click **Export CSV** → expect a file `rsvps-<event-slug>.csv` to download.
4. Open in Excel or Google Sheets → expect:
   - UTF-8 with BOM (no mojibake on names like "Müller").
   - Columns exactly: `name,email,rsvp_status,check_in_time`.
   - `check_in_time` in ISO-8601 with the event's TZ offset; blank for non-checked-in rows.
   - At least ~6 rows of data.

### Flow G — Gallery upload + host approval
- **As:** `att.gina@demo.commuvent.app`
1. Open a completed event page → scroll to **Gallery** → click **Upload** → pick an image → submit → expect "Pending approval" notice; image not visible to others.
- **As:** `host.alice@demo.commuvent.app`
2. Open `/dashboard/:hostId/moderation` → **Gallery queue** tab → expect the new photo.
3. Click **Approve** → expect it to disappear from queue.
4. Reload the public event page → expect the photo now visible in the gallery grid.

### Flow H — Feedback (post-event, gated)
- **As:** `att.gina@demo.commuvent.app`
1. Open a completed event you were checked in to → scroll to **Feedback** → expect form (1–5 stars + comment).
2. Submit a 5-star feedback → expect success toast and the new entry at the bottom of the feedback list.
3. Try opening an upcoming event → expect **no** feedback form (only seeded comments visible if any).

### Flow I — Report + Moderation hide
- **As:** `att.henry@demo.commuvent.app`
1. Open any event → click **Report** → choose a reason → submit → expect toast.
- **As:** `host.alice@demo.commuvent.app`
2. `/dashboard/:hostId/moderation` → **Reports queue** → expect the new report.
3. Click **Hide** → expect the report status to change and the reported item to no longer appear in public listings.

### Flow J — Invite a member
- **As:** `host.alice@demo.commuvent.app`
1. `/dashboard/:hostId/members` → **Invite** → choose role **Checker** → **Generate link** → copy.
2. Open the link in incognito while signed in as `att.noah@…` → expect invite preview (host name + role).
3. Click **Accept** → expect redirect to `/dashboard` showing Acme with Checker access.

### Flow K — My Events aggregate
- **As:** `host.alice@demo.commuvent.app` (also a member of Acme)
1. Open `/my-events` → expect events from Acme with role-filtered actions and filters by host / date / search.

---

## 3. report.md

Same outline as before:

- Overview & time-box.
- Tools & techniques (Lovable + stack + key libs).
- Architecture decisions (RLS-first with SECURITY DEFINER helpers; privileged writes via Edge Functions; no client write policies on `check_ins`/`rsvps`; realtime on key tables; CSV BOM + injection guard; validation triggers vs CHECK; markdown removed late).
- What worked (Lovable iteration speed, shadcn, Edge Functions, single `seed_demo` for one-shot reset).
- What didn't / trade-offs (markdown editor removed, paid stubbed, location filter is mode-only, no QR camera, no email notifications, shared demo password printed in-UI).

---

## Out of scope

- No source-code changes.
- No new sample fixtures (CSV is generated by the reviewer in Flow F).
- GitHub repo organisation / `task-2/` placement (user handles manually).