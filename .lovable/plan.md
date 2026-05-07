## Goal

Bring host create / edit / management to parity with the event flow:

1. **Square crop dialog** for host logos, mirroring the event 16:9 cover crop.
2. **Bio editor** uses the same `MarkdownEditor` setup as event description (already does — keep, polish hint copy).
3. **Dedicated host editor page** reusing one form for create + edit, the way `EventEditor` handles `new` + `edit`.
4. **Cross-links** wiring the host into the rest of the UI.

## 1. Square crop support

`ImageUpload` only triggers `CoverCropDialog` when `aspect="video"`. Make it work for `aspect="square"` too, and rename the dialog to be aspect-aware.

- Rename `CoverCropDialog` → `ImageCropDialog`. Accept an `aspect: number` prop and an `output: { width; height; quality? }` prop.
- Cropper inside uses the passed aspect. Title becomes "Crop image".
- `ImageUpload`: trigger crop for both `square` and `video`. Pass aspect (`1` or `16/9`) and output size (`512×512` for square logos, `1600×900` for covers). Show the "Re-crop" button for both.
- Remove the existing `cover-crop-dialog.tsx` filename in favor of `image-crop-dialog.tsx` (one rename + import update).

Result: host logo uploads go through the same crop UX as event covers, constrained to 1:1.

## 2. Host editor page

New route + page, modeled on `EventEditor`'s create/edit dual-mode pattern.

- Route: `/dashboard/:hostId/edit` → `HostEditor` (new page).
- Refactor `BecomeAHost.tsx` → extract the form into `HostEditor` and use the same component for both:
  - `/become-a-host` (create, no `hostId` param) — keeps current behavior, redirects to dashboard on success.
  - `/dashboard/:hostId/edit` (edit) — loads host, prefills, requires `has_host_role(hostId,'host')`, updates row + replaces logo via storage.
- Same field set, same Zod schema, same MarkdownEditor for bio (with character counter), same `ImageUpload` (now square+cropped).
- Header reads "Become a host" vs "Edit host" based on mode. Submit reads "Create host" vs "Save changes".
- On unauthorized access to edit (not a host member), redirect to `/dashboard/:hostId` with a toast.

`BecomeAHost.tsx` becomes a thin wrapper that renders `<HostEditor mode="create" />`, or we delete it and point `/become-a-host` directly at `HostEditor`. Prefer the latter — single source of truth.

## 3. Cross-links

| Where | Link / button | Notes |
|---|---|---|
| `HostDashboard` header | New **Edit host** outline button next to "Members" / "New event" | Goes to `/dashboard/:hostId/edit` |
| `HostDashboard` header | Existing "View public page" link — keep | unchanged |
| `HostPublic` header | When viewer is a host member, show **Manage** outline button (next to Share) → `/dashboard/:host.id` | Detect membership the same way `EventPage` detects `canManage` (query `host_members` for `auth.uid()`) |
| `EventManage` page (header) | Add a small breadcrumb / back link: `← {host.name}` → `/dashboard/:hostId` | Mirrors how event pages already link to the host context |
| `EventPage` aside (already has "Manage event" when host) | Add a secondary link **Host dashboard** → `/dashboard/:host_id` underneath | Quick jump, only when `canManage` |

All links respect existing RLS — buttons only render for verified host members, but routes also self-protect (already do).

## File touches

- `src/components/cover-crop-dialog.tsx` → renamed to `src/components/image-crop-dialog.tsx`, generalized.
- `src/components/image-upload.tsx` — wire crop for square aspect; pass aspect/output to dialog.
- `src/pages/HostEditor.tsx` — **new**, dual-mode (create/edit), based on current `BecomeAHost`.
- `src/pages/BecomeAHost.tsx` — delete; route `/become-a-host` now renders `<HostEditor />`.
- `src/App.tsx` — add `/dashboard/:hostId/edit` route; update `/become-a-host` import.
- `src/pages/HostDashboard.tsx` — add "Edit host" button.
- `src/pages/HostPublic.tsx` — detect membership, conditionally show "Manage" button.
- `src/pages/EventManage.tsx` — add host back-link.
- `src/pages/EventPage.tsx` — add "Host dashboard" link in the manage block.

No DB / RLS changes needed — `hosts` already has `hosts_update_members` and the storage bucket is public.
