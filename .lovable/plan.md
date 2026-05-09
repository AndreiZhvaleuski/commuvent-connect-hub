## Goal

Update `WALKTHROUGH.md` Flows G and I (and a small touch-up of Flow J) so they match the actual UI. No code changes.

## Findings

### Flow G — Gallery upload + host approval (currently broken)

The current Flow G has the host approve photos via a non-existent **Moderation → Gallery queue** tab. Reality:

- The host dashboard button is labelled **Reports** (not Moderation) and routes to `/dashboard/<hostId>/moderation`. That page is titled **Reports** and only shows reports — **no Gallery queue, no tabs**.
- Gallery moderation is **per-event**, on `/e/<eventId>/gallery`. Hosts see an extra **Pending review** tab/option with **Approve** / **Reject** buttons on each pending photo.
- On the public `EventPage`, the inline gallery preview only has a **View all** link → it routes to `/e/<eventId>/gallery`. Upload (and approval) happens on that gallery page.

### Flow I — Report + moderation hide

- Same **Reports** label issue (button is "Reports", H1 is "Reports", no tabs).
- Reports page only loads `status = 'open'` reports. After Hide, the row disappears (and the open-count badge decrements). Doc claim of "mixed open/hidden/dismissed rows" and "status flips to hidden" is wrong.
- The Report Event dialog has a **single free-text Reason** textarea (min 5 chars). There is no "Spam" preset and no separate comment field. Doc steps 22–23 are wrong.

### Flow J — Members

- Header button is **Members** (correct).
- Inside `HostMembers`, the "Invite by link" card lists per-role rows (Host / Checker), each with a **Create checker link** / **Create host link** button. Wording "Find the Checker card" should be "Checker row" for accuracy. Eye/copy icons are correct.

### Other flows

Flows A–F, H, K already match the UI after the prior fixes. No further changes.

## Edits to `WALKTHROUGH.md`

### Flow G — full rewrite of Part 1

Replace the moderation-based approval with the per-event gallery flow. Updated outline:

```
### Part 1 — Host approves (`host.alice`)

1–6. Sign in as host.alice (same boilerplate).
7. Click **Dashboard** in the top nav.
   *Expect:* `/dashboard` shows the Acme host card.
8. Click the **Acme** host card.
9. Click an event that has pending photos in the seed (e.g.
   **Intro to LLM Agents** on the **Past** tab) — click the event title
   or **Manage** on the card to open the management page,
   then click **View public page** / open `/e/<eventId>` and from there
   click the gallery's **View all** link, OR navigate directly to
   `/e/<eventId>/gallery`.
10. On the gallery page, click the **Pending review** tab
    (visible only to hosts).
    *Expect:* a list of photos awaiting approval, each with the
    uploader's name.
11. On the first photo, click **Approve**.
    *Expect:* toast `Photo approved`; the photo disappears from the
    Pending review tab.
12. On the next photo, click **Reject**.
    *Expect:* toast `Photo rejected`; the photo disappears.
13. Click the **Published** tab.
    *Expect:* the just-approved photo appears here.
14. Sign out.
```

Drop step 12 ("toggle Include past events…") since we're already on the gallery page; the verification happens via the **Published** tab in step 13.

### Flow G — Part 2 (small fix)

- Step 23 ("Scroll to the **Gallery** section") — keep, but step 24 should read: *"Click **View all** to open the gallery page, then click **Upload photo**, pick any image, and confirm."* Expectation: toast `Photo uploaded — pending host approval`; the filter switches to **My pending**.

### Flow I — Part 1 rewrite

- Step 8: "Click **Reports** in the dashboard header." (was Moderation)
- Step 9: drop the "Click the Reports tab" sub-step. The page is a single list. Expect: heading **Reports** with an `N open` badge; oldest-first list of open reports only.
- Step 10: "On the first **event** report, click **Hide**." (drop "open" — all listed are open by definition.)
- Step 11 expectation: *"the row disappears and the open count decreases. (Hiding an event reverts it to draft; hiding a photo rejects it.)"*

### Flow I — Part 2 rewrite (steps 22–23)

- Step 22: replace "Pick reason `Spam`" with *"In the **Reason** textarea, type `Looks like a spam listing.` (min 5 characters)."*
- Step 23: delete (no separate comment field).
- Renumber 24/25 accordingly.

### Flow J — Part 1 wording

- Step 9: change "find the **Checker** card" to "find the **Checker** row".
- No other changes.

## Out of scope

- No code changes.
- No edits to flows A–F, H, K (already correct).
