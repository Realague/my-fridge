import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/utils/imageCompression';
import { uploadImageWithSignature } from '@/services/imageUploadService';
import { cn } from '@/lib/utils';

interface RecipePhotoTileProps {
  imageUrl: string | null;
  /** When true, the compressed file is handed to the parent instead of being uploaded right away. */
  deferUpload?: boolean;
  onImageSelected?: (file: File, previewUrl: string) => void;
  onImageUploaded?: (url: string) => void;
  onImageRemove: () => void;
  className?: string;
}

/**
 * Hero photo tile of the recipe editor: dashed drop zone when empty,
 * cover image with floating "change" / "remove" pills once filled.
 * Supports click + drag & drop, compresses before upload (Cloudinary).
 */
export const RecipePhotoTile = ({
  imageUrl,
  deferUpload = false,
  onImageSelected,
  onImageUploaded,
  onImageRemove,
  className,
}: RecipePhotoTileProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(imageUrl);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setPreview(imageUrl);
  }, [imageUrl]);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t('messages.error.invalidFileType'),
        description: t('messages.error.pleaseSelectAnImage'),
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('messages.error.fileTooLarge'),
        description: t('messages.error.maxFileSize10MB'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(compressedFile);
      setPreview(previewUrl);

      if (deferUpload) {
        onImageSelected?.(compressedFile, previewUrl);
        return;
      }

      const uploadedUrl = await uploadImageWithSignature('recipes', compressedFile);
      onImageUploaded?.(uploadedUrl);
      toast({
        title: t('messages.success.imageUploaded'),
        description: t('messages.success.imageUploadedSuccessfully'),
      });
    } catch (error) {
      console.error('Image upload error:', error);
      toast({ title: t('messages.error.uploadFailed'), variant: 'destructive' });
      setPreview(imageUrl);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openPicker = () => fileInputRef.current?.click();

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onImageRemove();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasImage = Boolean(preview);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('pages.recipes.editor.addPhoto')}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        'relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[20px] border-[1.5px] border-dashed border-mf-night-line bg-mf-night-elevated/50 p-5 text-center text-mf-text-mute transition-colors',
        !hasImage && 'hover:border-mf-green hover:bg-mf-green-soft hover:text-mf-green-deep',
        dragging && 'border-mf-green bg-mf-green-soft text-mf-green-deep',
        hasImage && 'border-solid border-transparent'
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {hasImage ? (
        <>
          <img src={preview!} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
          <div className="absolute bottom-3 right-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={openPicker}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 font-display text-xs font-bold text-mf-night shadow-sm hover:bg-white"
            >
              <Camera className="h-3.5 w-3.5" />
              {t('pages.recipes.editor.changePhoto')}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              aria-label={t('pages.recipes.editor.removePhoto')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-mf-danger shadow-sm hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </>
      ) : uploading ? (
        <Loader2 className="h-10 w-10 animate-spin" aria-hidden="true" />
      ) : (
        <>
          <ImagePlus className="h-11 w-11" strokeWidth={1.4} aria-hidden="true" />
          <div className="font-display text-sm font-bold">{t('pages.recipes.editor.addPhoto')}</div>
          <div className="text-xs">{t('pages.recipes.editor.addPhotoHint')}</div>
        </>
      )}
    </div>
  );
};
