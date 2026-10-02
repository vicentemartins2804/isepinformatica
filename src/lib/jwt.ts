import { jwtVerify, SignJWT } from "jose";

/** Nome do cookie que guarda o JWT da sessão de administração. */
export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 horas

export type SessionPayload = {
  username: string;
  /** Tem de coincidir com `admin.sessao_versao`; se não, a sessão foi terminada. */
  version: number;
};

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET não está definida (mínimo 32 caracteres).");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ username: payload.username, ver: payload.version })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getKey());
}

/**
 * Valida a assinatura e a expiração do JWT. Não consulta a base de dados, por isso não
 * sabe se a sessão foi terminada; isso é verificado em `getSession`.
 */
export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"], subject: "admin" });
    if (typeof payload.username !== "string" || typeof payload.ver !== "number") return null;
    return { username: payload.username, version: payload.ver };
  } catch {
    return null;
  }
}
