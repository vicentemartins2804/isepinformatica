import "server-only";
import { headers } from "next/headers";

/**
 * Endereço público da votação. Na Vercel usa-se o domínio de produção (o que vai para os
 * cartazes), mesmo que o painel esteja aberto num endereço de preview. Fora da Vercel usa-se
 * o endereço do próprio pedido.
 */
export async function getVotingUrl(): Promise<string> {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/`;
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/`;
}
