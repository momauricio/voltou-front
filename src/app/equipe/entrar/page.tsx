import { BrandLogo } from '@/components/brand-logo';
import { StaffLoginForm } from '@/components/auth/staff-login-form';
import { STAFF_ON_LOJISTA_LOGIN_MESSAGE } from '@/lib/staff-crm';

type PageProps = {
  searchParams?: Promise<{ aviso?: string; next?: string }>;
};

export default async function EquipeEntrarPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const notice =
    params.aviso === 'loja' ? STAFF_ON_LOJISTA_LOGIN_MESSAGE : null;

  return (
    <div className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto mb-8 max-w-md sm:mb-10">
        <BrandLogo />
      </div>
      <div className="mx-auto flex max-w-md justify-center">
        <StaffLoginForm notice={notice} nextPath={params.next} />
      </div>
    </div>
  );
}
