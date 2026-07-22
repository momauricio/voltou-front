import { BrandLogo } from '@/components/brand-logo';
import { AuthForm } from '@/components/auth/auth-form';

type PageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function EntrarPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const initialTab = params.tab === 'criar' ? 'criar' : 'entrar';

  return (
    <div className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto mb-8 max-w-md sm:mb-10">
        <BrandLogo />
      </div>
      <div className="mx-auto flex max-w-md justify-center">
        <AuthForm initialTab={initialTab} />
      </div>
    </div>
  );
}
