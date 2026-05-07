import { useEffect, useState, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cropToFile } from "@/lib/image";

type Props = {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (cropped: File) => void;
};

export function CoverCropDialog({ file, open, onOpenChange, onConfirm }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const handleSave = async () => {
    if (!url || !area) return;
    setBusy(true);
    try {
      const f = await cropToFile(url, area, { width: 1600, height: 900, quality: 0.85 });
      onConfirm(f);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Crop cover image</DialogTitle></DialogHeader>
        <div className="relative h-80 w-full overflow-hidden rounded-md bg-muted">
          {url && (
            <Cropper
              image={url}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Zoom</label>
          <Slider min={1} max={4} step={0.01} value={[zoom]} onValueChange={(v) => setZoom(Array.isArray(v) ? v[0] : v)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy || !area}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
