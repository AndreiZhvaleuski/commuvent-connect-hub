# Commuvent — build report

Commuvent is a community event platform: hosts publish events, attendees
RSVP and get a QR ticket, checkers verify codes at the door, hosts export
attendance and review feedback. Built end-to-end on Lovable during a short
MVP time-box. The reviewer-facing click-through lives in
[WALKTHROUGH.md](./WALKTHROUGH.md).

## Tools and techniques

- **Lovable** as the AI build environment. GitHub and Supabase connected
  early, so all source, edge functions, migrations and config are
  versioned in this repo from the first commit.
- **Frontend:** React 18 + Vite 5 + TypeScript 5 + Tailwind 3 +
  shadcn/ui. `framer-motion` for one hero animation,
  `@phosphor-icons/react` for icons.
- **Backend:** Supabase — Postgres with RLS, Auth (email/password +
  magic link), Storage (`event-covers`, `host-logos`, `gallery`), Edge
  Functions for privileged writes, Realtime for live RSVP / check-in /
  notifications.
- **Notable libs:** `qrcode.react` for tickets, `ics` for calendar
  export, a small CSV builder with UTF-8 BOM and formula-injection guard.
- **Workflow:** prompt one feature at a time, review the diff, iterate.

## What worked

**Going feature by feature.** I started by asking Claude Sonnet 4.6 to
draft one big Lovable prompt covering the whole MVP. The result compiled
but had missing logic, wrong logic and visible UI issues. Switching to
small sequential prompts — one screen, one rule, one migration at a
time — produced something I could actually read and trust.

**Versioning everything early.** Connecting GitHub and Supabase in the
first session meant migrations and edge functions landed as files I
could diff. When an RLS policy or a seed broke, I could see exactly
what had changed.

**shadcn/ui** kept ~20 pages visually consistent without me touching
component internals.

**Edge functions as the only write path** for sensitive tables
(`rsvps`, `check_ins`, capacity changes). Those tables have no
client-facing INSERT/UPDATE/DELETE policies at all — the rules
(capacity, FIFO waitlist promotion, no-check-in-after-end) live in one
place per operation instead of being spread across multiple RLS
policies.

## What didn't work / trade-offs

**The mega-prompt approach.** Useful as a skeleton, useless as a
deliverable. Lovable wants conversation, not a spec dump.

**SEO / social previews — the hardest part of the build.** The brief
requires Open Graph metadata on event and host pages. Lovable's first
instinct was a Next.js / SSG approach, which doesn't apply here — the
app is a client-rendered Vite SPA on Lovable hosting, so meta tags
injected at runtime are invisible to social scrapers. The workaround:
an `og-preview` Supabase edge function that branches on the request's
`Accept` header. Real browsers get a 302 to the SPA route; scrapers
(Facebook, Twitter, Slack, LinkedIn, WhatsApp, opengraph.xyz, curl)
get a small HTML document with OG tags and JSON-LD. Not elegant, but
it ships the requirement without leaving Lovable hosting.

**Markdown editor removed late.** Tiptap + `react-markdown` were in for
a while. After looking at the XSS surface against MVP scope I ripped
them out in favour of a plain textarea + `whitespace-pre-line`.

**Stubbed:** paid events (toggle disabled with a "coming soon" note);
QR camera scanning (manual code entry only — the spec allows it);
email notifications (in-app + realtime only); the shared demo password
printed on `/sign-in` (fine for a review-only deploy, would go before
any real launch).

## Notable decisions

- **RLS with `SECURITY DEFINER` helpers** (`is_host_member`,
  `has_host_role`, `is_event_host_member`, …) to avoid recursive-policy
  loops where a policy on table A queries table B which queries table A.
- **Roles live in `host_members`, not on the user.** The same person
  can be a host of one org and a checker of another.
- **Visibility is separate from status.** `visibility`
  (`public` / `unlisted`) is independent from `status`
  (`draft` / `published`). Unlisted-published events render publicly
  only via direct link.
- **Time zones are first-class.** Every timestamp is `timestamptz`,
  every event carries an IANA `time_zone`, the UI shows event TZ with
  a tooltip for the viewer's local equivalent, CSV export uses the
  event's TZ offset.
- **Storage policies mirror RLS.** Public-read buckets, auth-required
  inserts, gallery rows forced to `pending` by a trigger regardless of
  what the client sends.
- **Idempotent `seed_demo` edge function** guarded by `SEED_SECRET`.
  One source of truth for both the deployed demo and local resets.

## Reflection

I didn't write a line of code for this app and it works. That said, I
think the result would be tighter with more direct control over the
output — something closer to Claude Code, where I edit alongside the
model instead of describing every change in chat. Lovable's strength is
speed from zero to a working, deployed app; its weakness, for me, is
the gap between "it generated something" and "I understand and trust
every line." For an MVP under time pressure, the trade was worth it.
