import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAdmin, insertAuthLog, type AuthEvent } from "./db";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySessionToken, type SessionPayload } from "./jwt";

import { LOGIN_PATH } from "./redirect";

export { LOGIN_PATH };

export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Sessão atual, ou `null` se não houver sessão válida. Além do JWT, confirma na base de
 * dados que a versão da sessão ainda é a atual (não houve "terminar sessão em todos").
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!token) return null;
  try {
    const admin = await getAdmin();
    if (!admin || admin.sessionVersion !== token.version) return null;
    return { username: admin.username, version: admin.sessionVersion };
  } catch (err) {
    console.error("Erro ao validar sessão:", err);
    return null;
  }
});

/** Para páginas e actions do painel: redireciona para o login se não houver sessão. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  return session;
}

/** IP de quem fez o pedido (na Vercel, o primeiro valor de x-forwarded-for). */
export async function getRequestIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

/** Guarda um evento no registo do painel, com o IP e o browser do pedido. */
export async function logAuthEvent(event: AuthEvent, detail: string | null = null) {
  const h = await headers();
  try {
    await insertAuthLog(event, await getRequestIp(), h.get("user-agent"), detail);
  } catch (err) {
    // O registo não deve impedir o login ou o logout.
    console.error("Erro ao registar evento de autenticação:", err);
  }
}
