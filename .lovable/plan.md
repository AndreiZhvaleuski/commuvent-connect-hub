## Goal

When a host uploads an event cover image:
1. Client-side: **interactive 16:9 crop** with zoom/drag, then downscale crop to 1600×900 JPEG (~85% quality).
2. Storage bucket: enforce server-side file-size limit and image MIME types on `event-covers`.
3. Each event has at most **one** cover image file in the bucket — replacing it deletes the previous file.

## Implementation

### 1. Interactive crop UI

Add `react-easy-crop` (small, well-maintained, no canvas wrapper needed). It provides a draggable image with a fixed aspect-ratio crop window and zoom slider.

New component `src/components/cover-crop-dialog.tsx`:
- Props: `file: File`, `open`, `onOpenChange`, `onConfirm(croppedFile: File)`.
- Renders a shadcn `Dialog` containing `<Cropper image={url} aspect={16/9} crop zoom onCropComplete={...}>` plus a zoom `Slider` and Cancel/Save buttons.
- On Save: uses returned `croppedAreaPixels` to draw onto a 1600×900 `<canvas>`, exports via `canvas.toBlob('image/jpeg', 0.85)`, wraps as `File('cover.jpg')`, calls `onConfirm`.

Helper `src/lib/image.ts` exports `cropToFile(imageUrl, croppedAreaPixels, { width: 1600, height: 900, quality: 0.85 }): Promise<File>`.

### 2. Wire into ImageUpload

In `src/components/image-upload.tsx`, when `aspect === "video"` and the user picks a file, instead of calling `onFileChange(f)` directly:
- Open `CoverCropDialog` with the picked file.
- On confirm → `onFileChange(croppedFile)`; on cancel → no change.
- Add a "Re-crop" button next to "Replace" when a `file` is already chosen, which reopens the dialog with that file.

`aspect === "square"` keeps current behavior (no crop dialog).

### 3. Storage upload (`src/pages/EventEditor.tsx`)

In `uploadCoverIfAny`:
- Force `path = '${id}/cover.jpg'`, `contentType = 'image/jpeg'`, `upsert: true`.
- Before upload, list `${id}/` and delete any other files (cleans up legacy `.png`/`.webp`).

### 4. Bucket constraints (DB migration)

```sql
UPDATE storage.buckets
SET file_size_limit = 3145728,  -- 3 MB
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'event-covers';
```

### 5. One-cover-per-event safety net (DB trigger)

Function in `public` schema (per project rules), trigger on `storage.objects`:

```sql
CREATE OR REPLACE FUNCTION public.event_covers_enforce_single()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
BEGIN
  IF NEW.bucket_id = 'event-covers' THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'event-covers'
      AND split_part(name, '/', 1) = split_part(NEW.name, '/', 1)
      AND id <> NEW.id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER event_covers_single_file
AFTER INSERT ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.event_covers_enforce_single();
```

## Out of scope

- No changes to `host-logos` (square avatar) or `gallery` buckets.
- No edge function — cropping/resizing happens in the browser.
- No rotation UI (zoom + drag only).