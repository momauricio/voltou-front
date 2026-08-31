import { redirect } from 'next/navigation';

/** Campanhas saíram do painel do lojista — recuperação fica com a Voltou. */
export default function CampanhasRedirectPage() {
  redirect('/painel');
}
