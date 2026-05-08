import { useCallback, useEffect, useRef, useState } from "react";
import {
  CaretLeftIcon,
  CaretRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XIcon,
  ArrowsClockwiseIcon,
} from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

type Props = {
  images: { src: string; alt?: string }[];
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
};

const MIN = 1;
const MAX = 4;
const STEP = 0.5;

export function PhotoLightbox({ images, index, open, onOpenChange, onIndexChange }: Props) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragging = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => { setScale(1); setTx(0); setTy(0); }, []);
  useEffect(() => { reset(); }, [index, open, reset]);

  const current = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const prev = useCallback(() => { if (hasPrev) onIndexChange(index - 1); }, [hasPrev, index, onIndexChange]);
  const next = useCallback(() => { if (hasNext) onIndexChange(index + 1); }, [hasNext, index, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "+" || e.key === "=") setScale((s) => Math.min(MAX, s + STEP));
      else if (e.key === "-" || e.key === "_") setScale((s) => Math.max(MIN, s - STEP));
      else if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, prev, next, reset]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(MIN, Math.min(MAX, s + (e.deltaY < 0 ? STEP : -STEP))));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { x: e.clientX - tx, y: e.clientY - ty };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setTx(e.clientX - dragging.current.x);
    setTy(e.clientY - dragging.current.y);
  };
  const onPointerUp = () => { dragging.current = null; };

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[100vw] sm:max-w-[95vw] h-[100dvh] sm:h-[90vh] p-0 bg-background/95 border-0 sm:rounded-lg overflow-hidden"
      >
        <VisuallyHidden><DialogTitle>Photo viewer</DialogTitle></VisuallyHidden>

        <div
          className="relative h-full w-full overflow-hidden touch-none select-none"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ cursor: scale > 1 ? (dragging.current ? "grabbing" : "grab") : "default" }}
        >
          <img
            src={current.src}
            alt={current.alt ?? "Photo"}
            draggable={false}
            className="absolute left-1/2 top-1/2 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 object-contain transition-transform duration-100"
            style={{ transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})` }}
          />

          {hasPrev && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full shadow"
              onClick={prev}
              aria-label="Previous"
            >
              <CaretLeftIcon className="h-5 w-5" />
            </Button>
          )}
          {hasNext && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full shadow"
              onClick={next}
              aria-label="Next"
            >
              <CaretRightIcon className="h-5 w-5" />
            </Button>
          )}

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-background/90 px-1.5 py-1 shadow">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setScale((s) => Math.max(MIN, s - STEP))} aria-label="Zoom out">
              <MagnifyingGlassMinusIcon className="h-4 w-4" />
            </Button>
            <span className="min-w-12 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setScale((s) => Math.min(MAX, s + STEP))} aria-label="Zoom in">
              <MagnifyingGlassPlusIcon className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={reset} aria-label="Reset">
              <ArrowsClockwiseIcon className="h-4 w-4" />
            </Button>
          </div>

          <Button
            size="icon"
            variant="secondary"
            className="absolute right-2 top-2 rounded-full shadow"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </Button>

          {images.length > 1 && (
            <div className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs shadow">
              {index + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
