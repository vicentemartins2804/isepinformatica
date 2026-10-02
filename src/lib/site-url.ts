import "server-only";
import { headers } from "next/headers";

/**
 * Domínio público do site, sem barra no fim (por exemplo "https://www.isepinformatica.pt"),
 * ou `null` se não estiver definido. Por ordem:
 * 1. `SITE_URL`, definida à mão na Vercel: manda sempre, para o QR code e os links de
 *    partilha usarem o domínio escolhido;
 * 2. `VERCEL_PROJECT_PRODUCTION_URL`, que a Vercel preenche no deploy (escolhe o domínio de
 *    produção mais curto, por isso pode não ser o que queremos).
 */
export function getSiteOrigin(): string | null {
  const explicit = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit.startsWith("http") ? explicit : `https://${explicit}`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return null;
}

/**
 * Endereço público da votação (o que vai para os cartazes), mesmo que o painel esteja aberto
 * num endereço de preview. Sem domínio definido (desenvolvimento), usa o do próprio pedido.
 */
export async function getVotingUrl(): Promise<string> {
  const origin = getSiteOrigin();
  if (origin) return `${origin}/`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/`;
}
