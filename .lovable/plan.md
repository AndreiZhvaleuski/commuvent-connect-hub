## Goal
Replace all rich-text/markdown descriptions and bios with plain-text inputs, and remove every related package, sanitiser, and CSS leftover.

## Affected fields
- `events.description` — currently markdown via `MarkdownEditor` / rendered via `MarkdownView`
- `hosts.bio` — currently markdown via `MarkdownEditor` / rendered via `ReactMarkdown`

(DB columns stay as `text`; no migration needed. Existing markdown syntax in stored values will simply render as literal characters going forward.)

## Frontend changes

### Replace editors with plain `<Textarea>`
- `src/pages/EventEditor.tsx` — swap `MarkdownEditor` for `<Textarea rows={8}>` bound to `description`. Keep the existing `MAX_DESC` char counter and Zod validation.
- `src/pages/HostEditor.tsx` — swap `MarkdownEditor` for `<Textarea rows={6}>` bound to `bio`. Keep the 2000-char counter and validation.

### Replace renderers with plain text (preserving line breaks)
- `src/pages/EventPage.tsx` — replace `<MarkdownView>{event.description}</MarkdownView>` with `<p className="whitespace-pre-line text-sm leading-relaxed">{event.description}</p>`.
- `src/pages/HostPublic.tsx` — replace the `ReactMarkdown` block with `<p className="whitespace-pre-line text-sm text-muted-foreground">{host.bio}</p>`. Drop `ReactMarkdown` and `remarkGfm` imports.
- `src/pages/Dashboard.tsx` — delete the `stripMarkdown` helper; render `h.bio` directly (still inside `line-clamp-2`).

### Delete files
- `src/components/markdown-editor.tsx`
- `src/components/markdown-view.tsx`

### Update placeholders/copy
- Event description placeholder → "What is this event about?"
- Host bio placeholder → "What does your community do?"

## Edge function changes
- `supabase/functions/og-preview/index.ts`
  - Remove `import removeMd from "npm:remove-markdown@0.5.5"`.
  - Replace both `removeMd(...)` calls with the raw string (still wrapped in `truncate(...)` and HTML-escaped downstream).

## CSS cleanup (`src/index.css`)
- Remove all `.tiptap-content` rules.
- Remove `.prose` overrides that exist only to support markdown rendering (blockquote / code / pre rules currently shared with `.tiptap-content`). Keep no orphan `.prose` styles since `@tailwindcss/typography` is not installed.

## Package removals (`package.json`)
- `@tiptap/extension-link`
- `@tiptap/extension-placeholder`
- `@tiptap/pm`
- `@tiptap/react`
- `@tiptap/starter-kit`
- `tiptap-markdown`
- `react-markdown`
- `remark-gfm`

(`remove-markdown` is only loaded inside the edge function via `npm:` specifier — no package.json change needed there.)

## Verification
- Grep for `markdown`, `tiptap`, `remark`, `rehype`, `dompurify`, `sanitize`, `MarkdownView`, `MarkdownEditor`, `ReactMarkdown`, `stripMarkdown`, `tiptap-content`, `prose ` after the change to confirm zero residual references.
- Build should pass with no TS/import errors.

## Out of scope
- No data migration — old markdown characters in existing `events.description` / `hosts.bio` will display literally. Acceptable per request.
- No changes to other description-like fields (none exist).
