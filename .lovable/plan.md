## Problem

`og-preview` currently splits behavior by User-Agent:
- Bots → HTML with OG/JSON-LD tags
- Everyone else → `302` redirect to the SPA

OG inspectors like `opengraph.xyz` now send a browser-like UA **and** follow redirects, so they land on the SPA instead of seeing our OG tags. The earlier version (HTML + `<meta http-equiv="refresh">`) had the same problem because they follow refresh too.

## Fix

Drop UA sniffing. Always return the same OG HTML, but redirect real browsers via JavaScript instead of meta-refresh / 302:

- Remove the `isBot` branch and the 302 response
- Remove `<meta http-equiv="refresh" ...>` from the HTML
- Add `<script>window.location.replace("…")</script>` at the end of `<head>`
- Keep `<body>` with a visible "Redirecting to …" link as a no-JS fallback

### Why this works

| Client | Sees |
|---|---|
| Real browser | Runs the script → instant client-side redirect to `/e/:id` or `/h/:id` |
| Crawlers (FB, Twitter, Slack, Google, …) | Don't run JS → parse OG/JSON-LD tags |
| OG inspectors (opengraph.xyz, metatags.io, …) | Don't run JS during scrape → parse OG/JSON-LD tags |
| No-JS browser | Sees the visible fallback link and can click through |

No other files change. The redirect URL, OG tags, and JSON-LD payload stay identical.

## File touched

- `supabase/functions/og-preview/index.ts` — replace the bot-vs-user branch with a single HTML response that uses a JS redirect.