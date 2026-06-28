import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { categoryTone, toneBadgeClass } from '@/lib/tokenMaps';

interface ItemImageProps {
  /** Image URL; when null or when load fails, fallback icon is shown */
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** ClassName for the container (e.g. size and rounded) */
  containerClassName?: string;
  /** Size of the fallback icon in pixels */
  fallbackIconSize?: number;
  /**
   * Item category slug. When the image is missing/failed, the category's icon
   * is rendered as the fallback instead of the generic package icon.
   */
  category?: string | null;
}

/**
 * Displays an item/ingredient image with a fallback icon when the URL is missing
 * or when the image fails to load (broken link, expired, etc.). The fallback
 * icon is the item category's icon when available, otherwise a generic one.
 */
export const ItemImage = ({
  src,
  alt,
  className,
  containerClassName,
  fallbackIconSize = 40,
  category,
}: ItemImageProps) => {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  if (!showImage) {
    const FallbackIcon = getCategoryIcon(category ?? undefined);
    return (
      <div
        className={cn(
          'flex items-center justify-center flex-shrink-0',
          toneBadgeClass(categoryTone(category)),
          containerClassName
        )}
        aria-hidden
      >
        <FallbackIcon
          size={fallbackIconSize}
          strokeWidth={1.5}
        />
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden flex-shrink-0', containerClassName)}>
      <img
        src={src}
        alt={alt}
        className={cn('w-full h-full object-cover', className)}
        onError={() => setFailed(true)}
      />
    </div>
  );
};
