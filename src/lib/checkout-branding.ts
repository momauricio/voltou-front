export type CheckoutFontId =
  | 'geist'
  | 'dm-sans'
  | 'space-grotesk'
  | 'nunito'
  | 'playfair'
  | 'source-serif';

export type CheckoutBranding = {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: CheckoutFontId | string | null;
  message: string | null;
};

export const CHECKOUT_FONT_OPTIONS: {
  id: CheckoutFontId;
  label: string;
  cssFamily: string;
  googleQuery: string | null;
}[] = [
  {
    id: 'geist',
    label: 'Geist (padrão)',
    cssFamily: 'var(--font-geist-sans), system-ui, sans-serif',
    googleQuery: null,
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    cssFamily: '"DM Sans", system-ui, sans-serif',
    googleQuery: 'DM+Sans:wght@400;500;600;700',
  },
  {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    cssFamily: '"Space Grotesk", system-ui, sans-serif',
    googleQuery: 'Space+Grotesk:wght@400;500;600;700',
  },
  {
    id: 'nunito',
    label: 'Nunito',
    cssFamily: '"Nunito", system-ui, sans-serif',
    googleQuery: 'Nunito:wght@400;600;700',
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    cssFamily: '"Playfair Display", Georgia, serif',
    googleQuery: 'Playfair+Display:wght@400;600;700',
  },
  {
    id: 'source-serif',
    label: 'Source Serif',
    cssFamily: '"Source Serif 4", Georgia, serif',
    googleQuery: 'Source+Serif+4:opsz,wght@8..60,400;600;700',
  },
];

export function resolveCheckoutFont(fontId: string | null | undefined) {
  return (
    CHECKOUT_FONT_OPTIONS.find((f) => f.id === fontId) ??
    CHECKOUT_FONT_OPTIONS[0]
  );
}

export function checkoutFontLinkHref(fontId: string | null | undefined) {
  const font = resolveCheckoutFont(fontId);
  if (!font.googleQuery) return null;
  return `https://fonts.googleapis.com/css2?family=${font.googleQuery}&display=swap`;
}
