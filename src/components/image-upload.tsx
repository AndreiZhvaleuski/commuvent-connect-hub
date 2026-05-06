import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UploadSimpleIcon as Upload, TrashIcon as Trash2, ImageIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  value: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  aspect?: "square" | "video";
  fallbackText?: string;
  helpText?: string;
  maxSizeMB?: number;
  className?: string;
};

export function ImageUpload({
  value,
  file,
  onFileChange,
  aspect = "square",
  fallbackText = "?",
  helpText = "PNG, JPG or WebP.",
  maxSizeMB = 5,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(value);
  }, [file, value]);

  const pick = (f: File | null) => {
    if (f) {
      if (!f.type.startsWith("image/")) {
        toast.error("Please choose an image file");
        return;
      }
      if (f.size > maxSizeMB * 1024 * 1024) {
        toast.error(`Image must be smaller than ${maxSizeMB} MB`);
        return;
      }
    }
    onFileChange(f);
  };

  const initials = (fallbackText || "?").slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-4 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center",
        className
      )}
    >
      {aspect === "square" ? (
        <Avatar className="h-20 w-20 shrink-0 self-start">
          {preview && <AvatarImage src={preview} alt="Preview" />}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="aspect-video w-full shrink-0 overflow-hidden rounded-md bg-muted sm:w-48">
          {preview ? (
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
        </div>
      )}
      <div className="flex-1 space-y-1 min-w-0">
        <p className="truncate text-sm font-medium">{file ? file.name : preview ? "Current image" : "No image selected"}</p>
        <p className="text-xs text-muted-foreground">{helpText} Max {maxSizeMB} MB.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />
            {file || preview ? "Replace" : "Choose file"}
          </Button>
          {(file || preview) && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { pick(null); setPreview(null); }}>
              <Trash2 className="mr-1 h-4 w-4" /> Remove
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}
