/** Edge-safe JWT payload read for routing. Signature is not verified. */
export function readJwtRole(token: string): string | undefined {
  try {
    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) return undefined;
    const json = decodeBase64Url(parts[1]);
    const payload = JSON.parse(json) as { role?: unknown };
    return typeof payload.role === 'string' ? payload.role : undefined;
  } catch {
    return undefined;
  }
}

function decodeBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad =
    padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}
