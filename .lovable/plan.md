## Goal
Remove the URL slug from hosts, switch host pages to use the host `id`, render bios as Markdown with a live preview, and improve the logo upload UX (preview + nicer file input, placed first).

## Database
- Migration: drop `slug` column from `public.hosts` (drops the unique constraint with it).

## Routing
- `src/App.tsx`: change `/h/:slug` → `/h/:id`.
- `src/pages/HostPublic.tsx`: read `id` from params, query `hosts` by `id`, remove `slug` from type/select.
- `src/pages/HostDashboard.tsx`: remove `slug` from type/select; link to `/h/${host.id}` and display `/h/{host.id}` (truncated).

## Become a Host page (`src/pages/BecomeAHost.tsx`)
Reorder fields and rework the form:
1. **Logo** (first) — custom dropzone-style control:
   - Hidden native `<input type="file">`, triggered by a styled button.
   - Shows a circular avatar preview (using a local `URL.createObjectURL`) once a file is picked, with a "Replace" / "Remove" button.
   - Falls back to a placeholder avatar with upload icon when empty.
2. **Host name**
3. **Bio (Markdown)** — `Tabs` with "Write" and "Preview":
   - Write: existing `Textarea`.
   - Preview: rendered via `react-markdown` + `remark-gfm` inside a styled prose container. Add a small "Markdown supported" hint.
4. **Contact email**

Remove all slug logic: schema field, input, helper text, slugify import, and the 23505 duplicate-slug error branch (keep generic error handling). Insert into `hosts` without `slug`. Navigate to `/dashboard/${host.id}` as today.

## Dependencies
- Add `react-markdown` and `remark-gfm`.

## Technical notes
- Revoke object URLs on unmount/replace to avoid leaks.
- Keep `slugify` util untouched (used elsewhere or harmless).
- Markdown preview styling uses Tailwind `prose prose-sm dark:prose-invert max-w-none`.

## Files touched
- `supabase/migrations/<new>.sql` (drop column)
- `src/App.tsx`
- `src/pages/HostPublic.tsx`
- `src/pages/HostDashboard.tsx`
- `src/pages/BecomeAHost.tsx`
- `package.json` (deps)