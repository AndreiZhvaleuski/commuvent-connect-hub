## Bug

Gina (and any attendee) can't leave feedback on past events like *Intro to LLM Agents*, even though she was checked in. Photo upload works because it doesn't depend on `check_ins`.

## Root cause

`check_ins` has only one SELECT policy: `checkins_select_host` — `is_event_host_member(event_id)`. Attendees can't see their own check-in row.

Two places break for Gina:

1. `EventFeedback.loadMine()` queries `check_ins` joined with her own RSVP to set `attended`. RLS hides the row → `attended = false` → the form is replaced by *"Only attendees who checked in can leave feedback."*
2. Even if we bypassed (1), the `feedback_insert_attended` policy's `EXISTS (... FROM check_ins ci JOIN rsvps r ...)` runs with the caller's RLS, so the insert would also fail with a row-level-security violation.

Verified in DB: Gina has a valid, non-undone check-in for *Intro to LLM Agents*. The policy is the only blocker.

## Fix

Add a second SELECT policy on `public.check_ins` allowing a user to see check-ins tied to their own RSVPs. Host visibility is preserved by the existing policy (policies OR together).

```sql
CREATE POLICY "checkins_select_own"
  ON public.check_ins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rsvps r
      WHERE r.id = check_ins.rsvp_id
        AND r.user_id = auth.uid()
    )
  );
```

No frontend or seed changes needed. After the migration, Gina's `loadMine` returns her check-in, the form renders, and `feedback_insert_attended` passes.

## Verification

1. Sign in as `att.gina@demo.commuvent.app`, open *Intro to LLM Agents*, confirm the rating + comment form appears.
2. Submit a 5★ review with a comment → success toast, "Your feedback · already submitted" card shows.
3. Re-check host Reports / dashboards still see check-ins (existing host policy unaffected).
