## Members page for a Host

Replace the placeholder at `/dashboard/:hostId/members` with a real management page, plus an invite-acceptance route at `/invite/:token`.

### Page: `/dashboard/:hostId/members` (new `src/pages/HostMembers.tsx`)

Access: only existing host members of this host can open it (redirect to dashboard otherwise). Only users with `role = 'host'` can invite or remove members.

Layout (consistent with HostDashboard):

- Header with host avatar + name and a "Back to dashboard" link.
- **Members section**
  - List of current members: avatar, display name, email (when available from `profiles`), role badge (Host / Checker), joined date.
  - Each row has a role dropdown (Host can promote a Checker to Host or demote a Host to Checker — disabled when it would remove the last Host) and a "Remove" button.
  - A user can always remove themselves (leave the host); the last remaining Host cannot leave or be demoted.
- **Invite links section** (visible to Hosts only)
  - Two cards: "Invite a Host" and "Invite a Checker", each with a short description of what the role can do.
  - "Generate link" button creates a row in `host_invites` with role + a random token + 7-day expiry, then shows the URL `https://<app>/invite/<token>` with a Copy button and the expiry date.
  - List of currently active invites for this host below, each with role, expiry, copy button, and revoke (delete) button.
  - Expired or used invites are filtered out of the list.

### Page: `/invite/:token` (new `src/pages/InviteAccept.tsx`, replaces the placeholder)

- Looks up the invite by token (RLS allows the host members to read; we need an edge function to look up by token for non-members — see Technical).
- If user is not signed in → redirect to `/sign-in?redirect=/invite/<token>`.
- Shows host name, the role being granted, and an "Accept invitation" button.
- On accept: calls an edge function that validates token + expiry and inserts `host_members` row, then redirects to `/dashboard/<hostId>` (or `/checkin` listing for Checkers — for now just dashboard).
- Handles error states: invalid, expired, already a member.

### Role behavior wiring

- Role values stored in `host_members.role`: `'host'` and `'checker'`.
- The existing `has_host_role(host_id, 'host')` already gates host-only management actions, so Checkers automatically lose access to event creation, gallery moderation, dashboards, etc.
- `CheckIn.tsx` already checks `host_members.role`; update it to allow either `'host'` or `'checker'`.

### Routing changes (`src/App.tsx`)

- `/dashboard/:hostId/members` → `<HostMembers />`
- `/invite/:token` → `<InviteAccept />`

### Technical details

- New edge function `accept-host-invite` (service-role): takes `{ token }`, validates JWT of caller, looks up invite, checks `expires_at > now()`, inserts `host_members(host_id, user_id, role)` (ON CONFLICT do nothing), deletes the invite row, returns `{ host_id }`. Needed because non-members can't read `host_invites` under current RLS.
- Optional second edge function `lookup-host-invite` for the accept page to display host name + role before accepting (returns `{ host_id, host_name, role, expires_at }`). Alternatively expose a SECURITY DEFINER SQL function `public.get_invite_preview(token text)`; prefer the SQL function for simplicity.
- Member email: read from `profiles.display_name`; email isn't in `profiles` today, so display name + avatar only (no schema change). Note this in UI copy.
  - Add e-mail to profiles as well.
- Token generation: `crypto.randomUUID()` client-side is fine since the row is inserted by an authenticated Host (RLS enforces `has_host_role`).
  - Account for possible creation of the same token - retry in this case.
- Use existing `Card`, `Button`, `Avatar`, `Badge`, `Select`, `AlertDialog`, `useToast` components — no new shadcn additions.

### Out of scope

- Email-sending invites (link sharing only, per requirements).
  - Emails are not configured so far.
- Per-event Checker scoping (Checker is host-wide).