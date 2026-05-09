## Goal

Let any reviewer reset the demo to the documented baseline using the existing **Re-seed demo data** button on the Sign-in page, without us changing the UI or weakening the edge-function check. The `SEED_SECRET` value will be published in `WALKTHROUGH.md` for them to paste.

## Steps

1. **Reseed now (one-time).**  
   Trigger `seed_demo` to restore the baseline so the next recording works. Verify with a quick `rsvps` query that **AI Hack Night** shows:
   - Going: Gina, Henry, Ivy, Jack
   - Waitlist: Kate (1), Liam (2), Mia (3), Noah (4)

2. **Document the reset in `WALKTHROUGH.md`.**  
   Add a short section near the top (right after the seeded-data table), titled something like **"Reset the demo before each session"**, that:
   - Tells the reviewer to open Sign-in → the user-icon button → **Demo accounts** dialog → **Re-seed demo data** section.
   - Provides the `SEED_SECRET` value to paste into the input.
   - Notes that Flow D in particular consumes the AI Hack Night waitlist baseline and isn't idempotent, so reseed before re-running it.

3. **Add a per-flow precondition note.**  
   At the top of Flow D (and Flow E if it depends on Gina's seed RSVP), add a one-liner: *"Re-seed before running this flow if you've already played it once."* Cross-link to the reset section.

## Out of scope

- No code changes (UI, edge function, or schema).
- Not changing `rsvp_create`'s UPDATE-on-re-RSVP behavior — separate concern.

## Risk

Anyone with the published `WALKTHROUGH.md` can wipe demo data. That's acceptable for this project (synthetic data, fully rebuildable in ~10s). If you'd rather not publish the secret, share `WALKTHROUGH.md` privately or replace the secret value with a placeholder like `<ask the project owner>`.
