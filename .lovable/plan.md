# Plan: rewrite `report.md`

Replace the current AI-sounding `report.md` with a shorter, first-person, neutral-technical journal that matches the assignment brief: tools & techniques, what worked, what didn't, notable decisions.

## Structure (target ~250–350 lines, but tight)

1. **Overview** (3–4 lines)
   What Commuvent is, in one paragraph. Pointer to `WALKTHROUGH.md` for the click-through.

2. **Tools & techniques** (bullet list, no fluff)
   - Lovable as the build environment; GitHub + Supabase connected so all code, edge functions and migrations live in the repo.
   - Stack: React 18 + Vite + TS + Tailwind + shadcn/ui; Supabase Postgres/Auth/Storage/Edge Functions/Realtime.
   - Notable libs: `qrcode.react`, `ics`, `framer-motion`, `@phosphor-icons/react`.
   - Workflow: prompt one feature at a time, review the diff, iterate.

3. **Process — what worked**
   - **Feature-by-feature beat the mega-prompt.** I first asked Claude Sonnet 4.6 to draft one big Lovable prompt covering the whole MVP. The result compiled but had missing logic, wrong logic and UI issues. Switching to small, sequential prompts (one screen / one rule at a time) produced something I could actually review and trust.
   - Connecting GitHub + Supabase early meant migrations and edge functions were versioned from day one, which made debugging bad RLS or a broken seed reproducible.
   - shadcn/ui kept ~20 pages visually consistent without me touching design tokens much.
   - Pushing all sensitive writes (RSVP, check-in, capacity) through edge functions instead of RLS-only — one place per rule, easier to reason about.

4. **What didn't work / trade-offs**
   - **The one-shot Claude prompt.** Useful as a skeleton, useless as a deliverable. Lesson: Lovable wants conversation, not a spec dump.
   - **SEO / social previews — the hardest part.** The brief asks for OG metadata on event and host pages. Lovable assumed a Next.js-style SSG approach, which doesn't exist here — the app is a client-rendered Vite SPA hosted on Lovable, so meta tags injected at runtime are invisible to scrapers. Workaround: an `og-preview` Supabase edge function that detects scraper vs browser via `Accept` header, returns rendered HTML with OG tags + JSON-LD to bots, and 302-redirects real users to the SPA route. Not pretty, but it keeps deployment on Lovable hosting and ships the requirement.
   - Markdown editor (Tiptap + react-markdown) was added then removed — XSS surface wasn't worth it for an MVP. Plain textarea + `whitespace-pre-line` instead.
   - Paid events stubbed (UI toggle disabled, "coming soon").
   - No QR camera scanning — manual code entry only. Spec allows it.
   - No email notifications — in-app + realtime only.
   - Shared demo password printed on `/sign-in`. Fine for review, not for production.

5. **Notable decisions**
   - **RLS with `SECURITY DEFINER` helpers** (`is_host_member`, `has_host_role`, …) to avoid recursive-policy traps.
   - **Edge functions are the only write path** for `rsvps` and `check_ins` — no client INSERT/UPDATE/DELETE policies on those tables at all.
   - **Roles in `host_members`**, not on the user — same person can be a host of one org and a checker of another.
   - **Visibility separated from status** (`public/unlisted` vs `draft/published`).
   - **Time zones first-class** — every event has an IANA TZ, UI shows event TZ with a viewer-local tooltip, CSV export uses event TZ offset.
   - **Idempotent `seed_demo` edge function** (guarded by `SEED_SECRET`) so the deployed demo and local resets share one source of truth.

6. **Reflection** (short, honest closer)
   I didn't write a line of code for this app and it works, but the result would probably be tighter with more direct control over the output — something like Claude Code where I edit alongside the model. Lovable's strength is speed from zero to working app; its weakness, for me, is the gap between "it generated something" and "I understand and trust every line." For this MVP the trade was worth it.

## Constraints

- First-person, neutral-technical tone. No "we", no marketing words ("snappy", "trivial", "delight", "first-class" — the current report is full of them).
- No emojis.
- Cut the existing report roughly in half. Drop the hype bullets ("Lovable iteration speed", "useAsyncResource hook") that sound like sales copy.
- Keep concrete facts (function names, table names, the `og-preview` mechanism) — those are the substance.
- Keep the link to `WALKTHROUGH.md` at the top.

## Files touched

- `report.md` — rewrite in place.

No code, schema or behavior changes.
