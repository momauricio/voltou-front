import Link from 'next/link';

type BrandLogoProps = {
  href?: string;
  className?: string;
};

export function BrandLogo({ href = '/', className = '' }: BrandLogoProps) {
  const content = (
    <span className={`inline-flex max-w-full items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </span>
      <span className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        Voltou<span className="text-primary">.</span>
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}
