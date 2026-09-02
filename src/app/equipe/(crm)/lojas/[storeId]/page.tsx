'use client';

import { useParams } from 'next/navigation';
import { StaffCustomersPanel } from '@/components/equipe/staff-customers-panel';

export default function EquipeStoreCustomersPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;

  if (!storeId) {
    return <p className="text-sm text-muted-foreground">Loja não encontrada.</p>;
  }

  return <StaffCustomersPanel storeId={storeId} />;
}
