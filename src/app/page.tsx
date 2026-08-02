import { LandingCta } from '@/components/landing/landing-cta';
import { LandingFaq } from '@/components/landing/landing-faq';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingIcp } from '@/components/landing/landing-icp';
import { LandingMechanism } from '@/components/landing/landing-mechanism';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingPhysicalStore } from '@/components/landing/landing-physical-store';
import { LandingPricing } from '@/components/landing/landing-pricing';
import { LandingProof } from '@/components/landing/landing-proof';
import { LandingTrust } from '@/components/landing/landing-trust';
import { LandingWhatsappMock } from '@/components/landing/landing-whatsapp-mock';

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingPhysicalStore />
        <LandingMechanism />
        <LandingWhatsappMock />
        <LandingTrust />
        <LandingPricing />
        <LandingProof />
        <LandingIcp />
        <LandingFaq />
        <LandingCta />
      </main>
      <footer className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Voltou ·{' '}
        <a href="/entrar" className="hover:text-foreground">
          Entrar
        </a>
      </footer>
    </div>
  );
}
