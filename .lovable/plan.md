## Problem

On the event edit page (`src/pages/EventEditor.tsx`), the action bar only offers status-changing buttons:
- When draft: "Save draft" + "Publish"
- When published: "Save draft" (which unpublishes) + "Unpublish"

There is no way to save edits while preserving the current status. A host editing a published event is forced to either unpublish it or leave it untouched.

## Plan

Rework the action-bar buttons in `EventEditor.tsx` so saving and status changes are independent.

**New button set (edit mode):**
1. **Save changes** — primary button. Saves all field edits; keeps `status` unchanged (no `nextStatus` passed to `save()`).
2. **Publish** (shown only when `status !== "published"`) — secondary. Saves and sets status to `published`.
3. **Unpublish** (shown only when `status === "published"`) — secondary. Saves and sets status to `draft`.
4. **Duplicate** — unchanged.
5. **Back to dashboard** — unchanged.

**New event mode (no `eventId` yet):** keep current behavior — "Save draft" and "Publish" (since there is no existing status to preserve).

**Implementation details:**
- Add an `onSave` handler that calls `save(v)` with no `nextStatus` argument (the existing `save()` already handles this — it omits `status` from the update payload when `nextStatus` is undefined).
- Rename existing `onSaveDraft` usage in edit mode to `onSave`; keep `onSaveDraft` only for the new-event flow.
- Update the JSX in the action bar around lines 480–491 to render the conditional set above.

No DB or schema changes. No changes outside `src/pages/EventEditor.tsx`.