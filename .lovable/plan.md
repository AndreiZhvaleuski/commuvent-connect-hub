## Goal

Fix three doc-only inconsistencies in `WALKTHROUGH.md` left over from the pre-reseed model and the original AI Hack Night choice in Flow A.

## Findings

### 1. Flow A step 13 — wrong button label

`AI Hack Night` (capacity 4) is fully booked by the seed
(Gina/Henry/Ivy/Jack going). The EventPage shows **"Join waitlist"**
for a logged-out guest, not **"RSVP"**. After sign-in, Gina is
already going, so the button is replaced by the "You're going"
panel — which step 17 already describes correctly.

### 2. Flow A lines 112–113 — stale cross-reference

> *"Do not click Cancel RSVP here — Gina's RSVP is reused by Flows D and E."*

- Flow E doesn't reuse the AI Hack Night RSVP at all (it uses
  Gina's seeded RSVP for **Live: TypeScript Performance**).
- Re-seeding is now required before Flow D, so any leftover state
  from Flow A is wiped automatically.

### 3. Flow C lines 164–165 — stale cross-reference

> *"We use `att.henry` and Farm-to-Table Dinner here so we don't
> disturb Gina's RSVP (needed by Flows D and E) or the AI Hack
> Night waitlist."*

Same problem as #2 — the dependency is moot after re-seeding.
Henry/Farm-to-Table is still a fine choice (keeps Flow C
self-contained), the *reason* just needs rewording.

## Steps

1. **Flow A step 13:** change *"Click RSVP"* to *"Click Join waitlist"*
   (event is full from the seed). Keep the rest of step 13 unchanged.

2. **Flow A lines 112–113:** drop the warning. Flow D's re-seed
   callout is the canonical guard now.

3. **Flow C lines 164–165:** reword to:
   *"We use `att.henry` and Farm-to-Table Dinner so this flow stays
   self-contained and doesn't touch the AI Hack Night waitlist used
   in Flow D."*

4. **Sweep once more** for any other "Flow X needs / reuses..."
   cross-refs and fix in the same pass.

## Out of scope

- No code changes.
- No flow restructuring beyond the wording fixes above.
- Recordings stay as-is (the "Join waitlist" wording fix matches
  what the existing recording actually shows).
