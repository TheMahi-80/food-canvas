"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { ImagePlus, Trash2, Undo2, UtensilsCrossed, X } from "lucide-react";
import { shrinkImage } from "@/components/admin/shrink-image";
import { Button } from "@/components/ui/button";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_ORIGINAL_BYTES } from "@/lib/admin/image";
import { messages, toBanglaDigits } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const c = messages.admin.common;
const k = messages.admin.products;

export interface ImagePicker {
  /** Photo chosen in this session (already shrunk), not uploaded yet. */
  image: { file: File; url: string } | null;
  error: string | null;
  preparing: boolean;
  choose: (file: File | undefined) => Promise<boolean>;
  clear: () => void;
  setError: (message: string | null) => void;
}

/** Checks type and size, shrinks large photos in the browser, and keeps a preview URL. */
export function useImagePicker(): ImagePicker {
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.url);
  }, [image]);

  async function choose(file: File | undefined): Promise<boolean> {
    setError(null);
    if (!file) return false;
    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError(k.imageBadType);
      return false;
    }
    if (file.size > MAX_ORIGINAL_BYTES) {
      setError(k.imageTooLarge(toBanglaDigits(MAX_ORIGINAL_BYTES / 1024 / 1024)));
      return false;
    }
    setPreparing(true);
    try {
      const shrunk = await shrinkImage(file);
      if (shrunk.size > MAX_IMAGE_BYTES) {
        setError(k.imageTooLarge(toBanglaDigits(MAX_IMAGE_BYTES / 1024 / 1024)));
        return false;
      }
      setImage({ file: shrunk, url: URL.createObjectURL(shrunk) });
      return true;
    } catch {
      setError(k.imageUnreadable);
      return false;
    } finally {
      setPreparing(false);
    }
  }

  return { image, error, preparing, choose, clear: () => setImage(null), setError };
}

/** Preview + choose / replace / cancel / remove (undoable until saved). */
export function ImageField({
  label,
  hint,
  picker,
  savedUrl,
  remove,
  onRemoveChange,
  previewClassName,
}: {
  label: string;
  hint: string;
  picker: ImagePicker;
  savedUrl: string | null;
  remove: boolean;
  onRemoveChange: (remove: boolean) => void;
  previewClassName?: string;
}) {
  const id = useId();
  const { image } = picker;
  const shown = image?.url ?? (remove ? null : savedUrl);

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className={cn("relative size-32 shrink-0 overflow-hidden rounded-xl bg-muted", previewClassName)}>
        {shown ? (
          <Image src={shown} alt={label} fill sizes="192px" className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground" aria-hidden>
            <UtensilsCrossed className="size-8" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
        <input
          id={id}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="peer sr-only"
          aria-describedby={`${id}-hint`}
          onChange={(event) => {
            void picker.choose(event.target.files?.[0]).then((ok) => ok && onRemoveChange(false));
            event.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2 rounded-lg peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
          <Button asChild variant="outline" size="sm" disabled={picker.preparing}>
            <label htmlFor={id} className="cursor-pointer">
              <ImagePlus aria-hidden />
              {picker.preparing ? k.imagePreparing : shown ? k.replaceImage : k.chooseImage}
            </label>
          </Button>
          {image && (
            <Button type="button" variant="ghost" size="sm" onClick={picker.clear}>
              <X aria-hidden />
              {c.cancel}
            </Button>
          )}
          {!image && savedUrl && !remove && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveChange(true)}>
              <Trash2 aria-hidden />
              {k.removeImage}
            </Button>
          )}
          {!image && remove && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveChange(false)}>
              <Undo2 aria-hidden />
              {k.undoRemoveImage}
            </Button>
          )}
        </div>
        {!image && remove && <p className="text-sm text-muted-foreground">{k.imageWillRemove}</p>}
        {picker.error && (
          <p role="alert" className="text-sm text-destructive">
            {picker.error}
          </p>
        )}
      </div>
    </div>
  );
}
