## Plan: Use `remove-markdown` in og-preview edge function

Replace the hand-rolled `stripMarkdown` regex helper in `supabase/functions/og-preview/index.ts` with the `remove-markdown` npm package.

### Changes

- Add import: `import removeMd from "npm:remove-markdown@0.5.5";`
- Delete the local `stripMarkdown` function
- At each call site, replace `stripMarkdown(text)` with `removeMd(text)`
- Keep the `truncate` helper as-is (still need it after stripping)

That's it — no other files affected, no client changes, no migrations.
