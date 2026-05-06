# Update Event Editor

## 1. Shared components (extract & reuse)

Create two new shared components used by both `BecomeAHost` (and host edit) and `EventEditor`:

- `src/components/image-upload.tsx` — wraps the avatar/dropzone pattern from `BecomeAHost`. Props: `value` (url), `file`, `onFileChange`, `aspect` ("square" | "video"), `label`, `placeholder`. Renders preview (square Avatar for hosts, 16:9 image for event covers), Upload/Replace/Remove buttons, image-type validation. Allow to limit the files size.
- Reuse the existing `MarkdownEditor` for the event description (same toolbar: B / I / S / lists). Show character counter like host bio.

## 2. EventEditor changes (`src/pages/EventEditor.tsx`)

Form/UI restructure:

1. **Remove the Slug field.** Slug is auto-generated from title via `slugify(title)` on submit. On title change, recompute slug; if a slug collision happens on insert (DB unique constraint), append `-<short-id>` and retry once. The url should not change on title changes use some static slug.
2. **Cover image at top** of the Basics card, using new `ImageUpload` (aspect="video").
3. **Description** uses `MarkdownEditor` (replaces `<Textarea>`), with `0/8000` counter.
4. **When & where** card:
  - Time-zone picker virtualized (see §3).
  - Show a live hint under the picker: "Now in &nbsp;: <formatted date/time>" (updates every 30s via `setInterval`).
  - Replace plain `datetime-local` inputs with a custom Date+Time picker built from `Calendar` (already in `ui/calendar.tsx`) + a time `Input type="time"`. This avoids the browser-native "---" placeholders. Defaults: start = next top-of-hour today, end = start + 1h (when creating new event).
  - **Location**: replace the two free fields with a `RadioGroup` toggle "In person | Online".
    - In person → `venue_address` required, `online_url` cleared.
    - Online → `online_url` required (validated as URL: `https?://...`), `venue_address` cleared.
    - Field label changes from "Online URL" to "Online link".
5. **Settings** card:
  - **Capacity required**, integer 1–10000, default 50. Remove the "0 = unlimited" hint.
  - **Visibility** options reduced to `public` and `unlisted` (drop `private`). Default `public`.
  - Pricing toggle stays (free only, disabled).
6. **Validation messages** rewritten to be human-friendly, e.g. "Title must be at least 2 characters", "End time must be after start time", "Enter a valid https:// link", "Capacity must be between 1 and 10 000". Errors shown under each field plus a single toast on submit failure. The meeting lenght must be at least 30 mins.

## 3. Virtualized time-zone picker

Replace current `Command` list (renders ~400+ items) with a virtualized list using `@tanstack/react-virtual` inside the popover. Plain `<input>` for search filter, then a fixed-height (320px) scroll container with virtualized rows of ~32px. Keyboard arrows + Enter to select. This removes lag on open. Review theiir docs to properluy virtualize this. Still allow searching.

## 4. Database migration

```sql
-- 1) Visibility: drop 'private', enforce public|unlisted
ALTER TABLE public.events
  ALTER COLUMN visibility SET DEFAULT 'public';

UPDATE public.events SET visibility = 'unlisted' WHERE visibility = 'private';

-- 2) Capacity: must be >= 1, <= 10000
ALTER TABLE public.events
  ALTER COLUMN capacity SET DEFAULT 50;

UPDATE public.events SET capacity = 1 WHERE capacity < 1;
UPDATE public.events SET capacity = 10000 WHERE capacity > 10000;

-- 3) Validation trigger (per project rules: use triggers, not CHECK with non-immutable expressions;
--    used here for cross-column rules so behaviour stays consistent if rules evolve)
CREATE OR REPLACE FUNCTION public.events_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.visibility NOT IN ('public','unlisted') THEN
    RAISE EXCEPTION 'visibility must be public or unlisted';
  END IF;
  IF NEW.capacity IS NULL OR NEW.capacity < 1 OR NEW.capacity > 10000 THEN
    RAISE EXCEPTION 'capacity must be between 1 and 10000';
  END IF;
  IF NEW.end_at <= NEW.start_at THEN
    RAISE EXCEPTION 'end_at must be after start_at';
  END IF;
  IF (NEW.venue_address IS NULL OR length(btrim(NEW.venue_address)) = 0)
     AND (NEW.online_url IS NULL OR length(btrim(NEW.online_url)) = 0) THEN
    RAISE EXCEPTION 'event must have either a venue address or an online link';
  END IF;
  IF NEW.online_url IS NOT NULL AND NEW.online_url !~* '^https?://' THEN
    RAISE EXCEPTION 'online link must start with http:// or https://';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS events_validate_trg ON public.events;
CREATE TRIGGER events_validate_trg
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.events_validate();

-- 4) Slug uniqueness per host (so auto-slug retry has something to collide against)
CREATE UNIQUE INDEX IF NOT EXISTS events_host_slug_uniq
  ON public.events (host_id, slug) WHERE slug IS NOT NULL;
```

RLS: existing `events_*` policies remain correct (no policy referenced `visibility = 'private'` directly besides the public select, which still works since unlisted/public are the only remaining options).

## 5. Code cleanup

- Delete unused `Slug` Field & related code in `EventEditor`.
- Replace `Schema` zod definition to reflect new rules:
  - `description` reused as markdown string.
  - `capacity`: `z.coerce.number().int().min(1).max(10000)`.
  - `visibility`: `z.enum(["public","unlisted"])`.
  - `location_mode`: `z.enum(["in_person","online"])` plus refinement requiring matching field.
- Update default form values accordingly.
- Update HostDashboard / EventPage usages: nothing needed (still read venue_address/online_url; visibility filter unchanged).

## 6. Dependencies

Add `@tanstack/react-virtual` (small, already common in the stack family). Make sure to install the latest version,

## Files touched

- New: `src/components/image-upload.tsx`, `src/components/timezone-picker.tsx` (virtualized), migration file.
- Edit: `src/pages/EventEditor.tsx`, `src/pages/BecomeAHost.tsx` (swap to `ImageUpload`).
- No changes needed to RLS policies; trigger added.