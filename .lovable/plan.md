## Goal

Rewrite `WALKTHROUGH.md` so every flow A–K is a strict, click-by-click scenario for a single named user, starting from the main page (reached by clicking the **Commuvent** header/logo), and reserve a video slot at the bottom of each flow for an iPhone screen recording.

## Recurring "Reset & sign-in" pattern (defined once at the top)

Every flow begins by referencing this block, so reviewers always start from a known state:

```text
1. Click the Commuvent header/logo (top-left) to open the main page.
2. If a user avatar shows in the top-right, click it → Sign out.
3. Click Sign in (top-right).
4. On the sign-in card, click the user-icon button to open the Demo accounts panel.
5. Click the Hosts / Checkers / Attendees tab as appropriate.
6. Click <email> to auto-fill, then click Sign in.
```

Anywhere a step would say "go to /" or "open /" or "navigate to home", it instead reads "Click the Commuvent header/logo to open the main page." No exceptions.

## Flow rewrite (A–K)

Each flow becomes a strict numbered script:

- One step per atomic action (one click, one type, one toggle).
- Exact values in backticks (e.g. type `AI Hack Night`, set Capacity `10`, Time zone `Europe/Berlin`, reason `Spam`).
- A short italic `*Expect:*` line after meaningful steps stating the observable outcome (toast text, badge number, redirect URL).
- Each flow ends with: `Click your avatar (top-right) → Sign out.`

Two-window flows (D — Waitlist, E — Check-in, J — Invite) explicitly label **Window 1 / Window 2** and run the Reset & sign-in block per window.

Flow-specific concrete inputs include:
- **A:** Search `AI`, Location `Offline`, Include past events ON, sort `Earliest`, open `Intro to LLM Agents`, then open `AI Hack Night` and click RSVP to verify the redirect.
- **B:** Title `Reviewer Test Event`, Capacity `10`, Time zone `Europe/Berlin`, Visibility `Public`, Status `Published`, hover Paid for the tooltip, Save, then Duplicate.
- **C:** RSVP to `AI Hack Night` as `att.gina`, open My Tickets, Add to calendar → Download .ics, Cancel RSVP.
- **D:** `att.kate` (window 1) and `att.gina` (window 2); Gina cancels, Kate sees badge `1`, callout, Acknowledge.
- **E:** `checker.dan` checks in `att.gina` for `Live: TypeScript Performance`, double-submits to see warning, undoes, opens a completed event to see the closed alert.
- **F:** `host.alice` → Dashboard → Past tab → `Intro to LLM Agents` → RSVPs → Export CSV with exact column expectations.
- **G:** Host approves/rejects from Gallery queue; attendee uploads a photo to a completed event.
- **H:** `att.gina` submits a 5-star feedback with comment `Great event!` on a completed event; verifies form is hidden on an upcoming event.
- **I:** `host.alice` hides an open event report; `att.henry` files a fresh report with reason `Spam`.
- **J:** `host.alice` creates a checker invite link; `att.noah` accepts it in window 2.
- **K:** `host.alice` opens My Events, types `Tech` in search, sets From = today, switches to Past tab.

## Video slot at the bottom of each flow

Right before the `---` separator that closes each flow, insert:

```markdown
### Recording

<video src="./videos/flow-a.mp4" controls playsinline muted width="640">
  Your browser doesn't support inline video.
  <a href="./videos/flow-a.mp4">Download the recording</a>.
</video>
```

A note under the live-demo line at the top of the doc explains the convention once:

> Each flow ends with a **Recording** section embedding a short iPhone screen
> recording (`videos/flow-<letter>.mp4`). Convert iPhone `.mov` to `.mp4`
> (H.264 + AAC) so GitHub plays them inline.

Filenames map 1:1: `videos/flow-a.mp4` … `videos/flow-k.mp4`.

## Files touched

- `WALKTHROUGH.md` — full body rewrite as scenarios + a `### Recording` block at the bottom of each flow + the convention note at the top. Sections "Sign-in shortcut", "Seeded data" and "Done" are kept.
- `videos/.gitkeep` (new, empty) — reserves the folder so the linked paths resolve before the user uploads recordings.

No code, no other files.
