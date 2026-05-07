## Fix

Restore the OG/JSON-LD HTML response, but split scrapers vs. browsers using the **`Accept` request header** instead of User-Agent.

### Why `Accept` (not UA)

Real browsers always send `Accept: text/html,...` on top-level navigation. Scrapers (Facebook, Twitter, Slack, LinkedIn, WhatsApp, Telegram, opengraph.xyz, metatags.io, curl) send `*/*` or omit it. UA sniffing broke because opengraph.xyz now sends a Chrome-like UA — but their fetch still uses `Accept: */*`.

Note: the Supabase edge gateway forces `Content-Type: text/plain` and a sandbox CSP on every response. That's fine for scrapers (they grep the body for `<meta>` tags regardless of content-type) but means we cannot render an HTML preview page in a browser — so browsers must be redirected server-side.

### Behavior

| Client | `Accept` starts with `text/html`? | Response |
|---|---|---|
| Browser navigation | yes | `302` → `/e/:id` or `/h/:id` |
| Scrapers, OG inspectors, curl | no | `200` body with `<meta og:*>`, JSON-LD, and a visible `<a>` fallback link |

### File touched

- `supabase/functions/og-preview/index.ts` — re-add the HTML branch (OG tags + JSON-LD + visible fallback link, no meta-refresh, no script). Branch on `Accept` header: `text/html` → existing 302; otherwise → HTML body.

```text
request → og-preview
            │
   Accept includes "text/html"?
       │             │
      yes            no
       │             │
   302 → /e/:id    200 body with full OG + JSON-LD
                    + visible "Continue to event →" link
```

No other files change. Share-link URLs stay the same.
