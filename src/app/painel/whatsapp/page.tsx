import { redirect } from 'next/navigation';

/** WhatsApp da loja mora em Perfil — não é aba do menu. */
export default function WhatsappRedirectPage() {
  redirect('/painel/perfil#whatsapp');
}
