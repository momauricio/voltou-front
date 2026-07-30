import { LandingCta } from '@/components/landing/landing-cta';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingIcp } from '@/components/landing/landing-icp';
import { LandingMechanism } from '@/components/landing/landing-mechanism';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingProof } from '@/components/landing/landing-proof';

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingMechanism />
        <LandingProof />
        <LandingIcp />
        <LandingCta />
      </main>
      <footer className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Voltou. ·{' '}
        <a href="/entrar" className="hover:text-foreground">
          Entrar
        </a>
      </footer>
    </div>
  );
}
