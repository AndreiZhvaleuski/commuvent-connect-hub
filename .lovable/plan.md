## Goal

Restrict gallery uploads to: (a) host members of the event, or (b) attendees who have a non-undone check-in for the event. Anyone else (signed-in but never checked in) should not be able to upload.

## Backend — RLS

Tighten `gallery_insert_auth` on `public.gallery_photos`. Drop the current policy and recreate it with an additional gate:

```sql
DROP POLICY "gallery_insert_auth" ON public.gallery_photos;

CREATE POLICY "gallery_insert_attended_or_host"
  ON public.gallery_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.is_event_host_member(event_id)
      OR EXISTS (
        SELECT 1
        FROM public.check_ins ci
        JOIN public.rsvps r ON r.id = ci.rsvp_id
        WHERE ci.event_id = gallery_photos.event_id
          AND r.user_id = auth.uid()
          AND ci.undone = false
      )
    )
  );
```

The existing `force_pending_gallery` trigger and host approval/select policies are unchanged.

## Frontend — `src/pages/EventGallery.tsx`

Add a second resource alongside `isHost` to detect whether the current user has a non-undone check-in for the event:

```ts
const { data: hasCheckedIn } = useAsyncResource<boolean>(async (signal) => {
  if (!user) return false;
  const { data, error } = await supabase
    .from("check_ins")
    .select("id, rsvps!inner(user_id)")
    .eq("event_id", eventId)
    .eq("undone", false)
    .eq("rsvps.user_id", user.id)
    .limit(1)
    .abortSignal(signal);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}, [user?.id, eventId]);

const canUpload = !!user && (isHost || hasCheckedIn);
```

In the header action area (currently lines 265–277):
- Signed-out → keep **Sign in to upload**.
- Signed in & `canUpload` → keep **Upload photo** button.
- Signed in & not allowed → render a small muted hint instead, e.g. *"Only checked-in attendees can upload"* (no button).

Also update the empty-state copy (line 341) so non-eligible signed-in users see *"Only attendees who checked in can add photos."* instead of the generic prompt.

## Walkthrough impact

The only attendee-upload step is Flow G Part 2, where **Gina uploads to *Intro to LLM Agents***. Gina is checked in for that event in the seed (verified), so the flow still passes unchanged — no walkthrough edits needed.

Other gallery-related steps (Flow G Part 1 host approval, Flow I photo report) are host-only or use already-published photos, so they're unaffected.

## Verification

1. Sign in as `att.gina` → open *Intro to LLM Agents* gallery → Upload photo works (she's checked in).
2. Sign in as `att.henry` (RSVP'd to that event but **not** checked in per seed) → Upload button replaced by hint; attempting via devtools fails with RLS error.
3. Sign in as `host.alice` → Upload still works and lands as `approved`.
