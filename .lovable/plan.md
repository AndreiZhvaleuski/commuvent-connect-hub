## Goal

Rename the Explore page "Type" filter to "Location" and reduce its options to just **Offline** and **Online** (matching the requirements wording).

## Changes (frontend only — `src/pages/Explore.tsx`)

1. **URL param rename**: `?type=` → `?location=`
   - Read from `searchParams.get("location")`
   - Write via `updateParam("location", ...)`
   - No redirect/back-compat for the old `type` param (MVP, internal usage).

2. **Label**: `<Label>Type</Label>` → `<Label>Location</Label>`

3. **Options**: drop the explicit "Any" chip. Render only two chips:
   - **Offline** (icon: `MapPin`) — value `offline` (renamed from `in_person`)
   - **Online** (icon: `GlobeIcon`) — value `online`

   "Any" remains the implicit default state (no chip selected = no filter). Clicking a selected chip deselects it back to "any". This keeps the filter optional without cluttering the UI with an explicit Any button.

4. **Type rename**: `LocationMode = "any" | "in_person" | "online"` → `"any" | "offline" | "online"`.

5. **Query logic**: update the branch
   - `if (mode === "offline") qb = qb.not("venue_address", "is", null)`
   - `else if (mode === "online") qb = qb.not("online_url", "is", null)`

6. **Clear-all & hasFilter**: keep checking `mode !== "any"` (now covers offline/online).

## Out of scope

- No backend / RLS / schema changes.
- No new city/region dropdown (no city data on events; flagged separately).
- No redirect for old `?type=` URLs.