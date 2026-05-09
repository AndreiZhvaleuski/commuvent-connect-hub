## Goal

Fix Flow E's "already checked in" error by switching the attendee from `att.gina` to `att.ivy`. Doc-only change to `WALKTHROUGH.md`.

## Root cause

`supabase/functions/seed_demo/index.ts` (lines 304–319) pre-seeds check-ins for in-progress events at a 35% ratio, taking the first N RSVPs from the attendee list. For **Live: TypeScript Performance** (8 going, ratio 0.35 → 2 check-ins), that pre-checks **Gina** (index 0) and **Henry** (index 1). Flow E then tries to check Gina in again → "already checked in".

`att.ivy` is index 2, RSVP'd as going, and not pre-checked-in by the seed.

## Edits to `WALKTHROUGH.md` (Flow E only)

- Window 2 header: rename to **Attendee Ivy**.
- Step 15: replace `att.gina@demo.commuvent.app` with `att.ivy@demo.commuvent.app`.
- Step 22 ("In both windows… Sign out"): unchanged.
- Re-seed warning at the top of Flow E: keep, since cancelling/check-ins still mutate state.

## Out of scope

- No changes to `seed_demo` or any other code.
- No changes to other flows (Flow D's Gina dependency is unaffected — Flow D uses AI Hack Night, not Live: TypeScript Performance).
