import { useEffect, useState } from 'react';

interface BrandLogoProps {
  name: string;
  logoPath: string | null;
  color: string | null;
  size?: 'sm' | 'md';
}

const BrandLogo = ({ name, logoPath, color, size = 'md' }: BrandLogoProps) => {
  const [failed, setFailed] = useState(false);
  const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-12 h-12';
  const textSize = size === 'sm' ? 'text-sm' : 'text-lg';

  useEffect(() => {
    setFailed(false);
  }, [logoPath]);

  const showInitial = !logoPath || failed;

  if (showInitial) {
    return (
      <div
        className={`${sizeClass} rounded-xl flex items-center justify-center text-white font-bold ${textSize} shrink-0`}
        style={{ backgroundColor: color || '#6B7280' }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  // logo.dev returns opaque square "icon" tiles. Let the tile fill the frame
  // edge-to-edge and clip it with overflow-hidden so its square corners follow
  // the rounded shape instead of poking out. object-contain keeps non-square
  // (custom) logos from being cropped.
  return (
    <div
      className={`${sizeClass} rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10`}
    >
      <img
        src={logoPath}
        alt=""
        className="w-full h-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
};

export default BrandLogo;
