## Goal
Generate a deterministic Dicebear "notionists-neutral" avatar URL for every user based on their user ID, store it in the database, and use it everywhere a user avatar is displayed.

URL format: `https://api.dicebear.com/9.x/notionists-neutral/svg?seed={user_id}`

## Database changes (migration)

1. **Backfill** `profiles.avatar_url` for all existing rows where it is NULL or empty:
   ```sql
   UPDATE public.profiles
   SET avatar_url = 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=' || id::text
   WHERE avatar_url IS NULL OR avatar_url = '';
   ```

2. **Update `handle_new_user()` trigger** so newly created users automatically get the Dicebear URL when they don't supply one via `raw_user_meta_data.avatar_url`:
   ```sql
   COALESCE(
     NEW.raw_user_meta_data->>'avatar_url',
     'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=' || NEW.id::text
   )
   ```

## Frontend changes

The codebase distinguishes **host logos** (`host.logo_url`) from **user avatars** (`profile.avatar_url`). Hosts are organizations with their own uploaded logo — those are out of scope.

Places that show user avatars today:
- `src/pages/HostMembers.tsx` — already reads `profile.avatar_url`. No change needed once the DB is backfilled; the dicebear URL will be used automatically.

Optional small enhancement (so we never depend on the column being populated): add a tiny helper `src/lib/avatar.ts` exporting `userAvatarUrl(profile)` that returns `profile.avatar_url ?? dicebearUrl(profile.id)`, and use it in `HostMembers.tsx`. This keeps things robust if a profile row ever lacks the URL.

## Out of scope
- Host logos (`hosts.logo_url`) — these are uploaded brand assets, not user avatars.
- No changes to `image-upload.tsx` or any avatar UI component.

## Files touched
- New migration (backfill + updated `handle_new_user` function)
- `src/lib/avatar.ts` (new helper)
- `src/pages/HostMembers.tsx` (use helper)
