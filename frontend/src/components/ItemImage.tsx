import { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemImageProps {
  /** Image URL; when null or when load fails, fallback icon is shown */
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** ClassName for the container (e.g. size and rounded) */
  containerClassName?: string;
  /** Size of the fallback icon in pixels */
  fallbackIconSize?: number;
}

/**
 * Displays an item/ingredient image with a fallback icon when the URL is missing
 * or when the image fails to load (broken link, expired, etc.).
 */
export const ItemImage = ({
  src,
  alt,
  className,
  containerClassName,
  fallbackIconSize = 40,
}: ItemImageProps) => {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  if (!showImage) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted flex-shrink-0',
          containerClassName
        )}
        aria-hidden
      >
        <Package
          className="text-muted-foreground"
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
