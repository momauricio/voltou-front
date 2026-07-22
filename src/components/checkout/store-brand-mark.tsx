'use client';

type StoreBrandMarkProps = {
  storeName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  className?: string;
  /** Image height classes; default h-10 */
  imageClassName?: string;
};

/**
 * Brand mark for customer-facing checkout pages.
 * Never falls back to the Voltou product logo — uses store logo or store name.
 */
export function StoreBrandMark({
  storeName,
  logoUrl,
  primaryColor,
  className = 'mb-6',
  imageClassName = 'h-10 max-w-[180px]',
}: StoreBrandMarkProps) {
  const color = primaryColor?.trim() || '#0F766E';

  if (logoUrl?.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl.trim()}
        alt={storeName}
        className={`object-contain ${imageClassName} ${className}`}
      />
    );
  }

  return (
    <p
      className={`text-center text-xl font-semibold tracking-tight ${className}`}
      style={{ color }}
    >
      {storeName}
    </p>
  );
}
