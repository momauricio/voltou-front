'use client';

import { LandingFeatureRow } from '@/components/landing/landing-feature-row';
import { DashboardMock } from '@/components/landing/mocks/dashboard-mock';

export function LandingDashboard() {
  return (
    <LandingFeatureRow
      id="resultado"
      title="Você vê o dinheiro voltar — não “engajamento”"
      body="Painel em reais: quem pagou, o que levou, quanto voltou."
      visual={<DashboardMock />}
    />
  );
}
