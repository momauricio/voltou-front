import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
});

/**
 * Dieter lockup for the public header only. Painel keeps BrandLogo.
 * Symbol is inlined from public/simbolo-header.svg (role/aria-label stripped).
 */
export function LandingBrand() {
  return (
    <Link
      href="/"
      aria-label="Voltou, página inicial"
      className={`${inter.className} inline-flex min-w-0 items-center gap-2.5`}
    >
      <svg
        aria-hidden="true"
        viewBox="306 173 465 770"
        className="block h-7 w-[16.91px] shrink-0 md:h-8 md:w-[19.32px]"
      >
        <path
          d="M306 943 V340 C306 230 400 173 538.5 173 C677 173 771 230 771 340 V943 Z"
          fill="#0e9254"
        />
        <path
          d="M306 433 Q445 655 538.5 943 Q632 655 771 433 V644 Q647 790 556 943 H521 Q430 790 306 644 Z"
          fill="#f6fbf6"
        />
      </svg>
      <span className="flex min-w-0 flex-col justify-center">
        <span className="text-[22px] font-semibold leading-none tracking-[-0.01em] text-[#111e15]">
          Voltou
        </span>
        <span className="mt-0.5 hidden text-[12px] font-normal leading-none text-[#111e15] min-[480px]:block">
          Especialista na 2ª venda.
        </span>
      </span>
    </Link>
  );
}
