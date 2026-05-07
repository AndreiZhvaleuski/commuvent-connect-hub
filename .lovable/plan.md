# Plan: Social preview metadata via Supabase Edge Function

## Problem

`useSEO` injects `<meta>` tags client-side. Social crawlers (Slack, WhatsApp, iMessage, Twitter/X, LinkedIn, Facebook) don't run JavaScript, so shared links currently render with no preview. Fix it by serving a tiny HTML page from a Supabase Edge Function with correct meta tags + JSON-LD, and instantly redirecting human visitors to the real app.

## Steps

### 1. Remove the `useSEO` hook

- Delete `src/hooks/use-seo.ts`
- Remove the import and call site from every page that uses it:
  - `src/pages/EventPage.tsx`
  - `src/pages/HostPublic.tsx`
  - `src/pages/EventRsvps.tsx`
  - `src/pages/Tickets.tsx`
  - `src/pages/CheckIn.tsx`
  - `src/pages/Dashboard.tsx`
  - `src/pages/BecomeAHost.tsx`
  - `src/pages/Explore.tsx`
  - `src/pages/HostDashboard.tsx`

### 2. Create edge function `og-preview`

New file: `supabase/functions/og-preview/index.ts`. Public endpoint (no auth needed — must be reachable by anonymous crawlers). Behavior:

- Accepts `?type=event|host&id=<uuid>`
- Loads the record via the service-role client
- Returns a small HTML page containing:
  - `<title>`, `<meta name="description">`
  - Open Graph tags (`og:type`, `og:title`, `og:description`, `og:site_name`, `og:url`, optional `og:image`)
  - Twitter Card tags (`summary_large_image` when an image exists, else `summary`)
  - JSON-LD: `Event` schema for events (with timezone-correct `startDate`/`endDate` derived from `time_zone`, location as `VirtualLocation` or `Place`, organizer pulled from `hosts`), `Organization` schema for hosts
  - `<meta http-equiv="refresh" content="0;url=...">` to bounce human visitors to the real app page
- Past events get a `Past event · ` prefix in the description
- All user-generated values are HTML-escaped with `jsr:@std/html` before interpolation
- Uses `corsHeaders` from `supabase/functions/_shared/auth.ts`

### 3. Add `APP_URL` secret

Add `APP_URL` (e.g. `https://commuvent-connect-hub.lovable.app`) so the function can build absolute redirect/canonical URLs.

### 4. Share button on `EventPage`

- Import `ShareIcon` from `@phosphor-icons/react`
- Add `handleShare` that copies `${VITE_SUPABASE_URL}/functions/v1/og-preview?type=event&id=${event.id}` to the clipboard and shows a toast
- Place an outline `Button` directly below the Report event Dialog block, before `<EventGallery />`

### 5. Share button on `HostPublic`

- Import `ShareIcon` and `toast` from `sonner`
- Add `handleShare` for `?type=host&id=${host.id}`
- Place button in the host header, below the contact email link

## How it works

- Crawler hits the edge function URL → gets HTML with meta tags + JSON-LD → renders the preview card.
- Human clicks the same link → meta refresh redirects to the real SPA route instantly (imperceptible).

## Technical notes

- Description text is unified across `og:description`, `twitter:description`, and JSON-LD so every platform shows the same copy.
- Timezone conversion for JSON-LD `startDate`/`endDate` is done with `Intl` only (no extra deps), preserving the event's local time.
- The function uses the service-role admin client because it must read events/hosts without a user session — only public-safe fields are returned in HTML.
- No DB migrations needed.
- After deploy, share URLs can be validated with the Slack/Facebook/Twitter card debuggers.
