"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { bumpSessionVersion, getAdmin, updateAdminPassword } from "@/lib/db";
import { createSession, deleteSession, getSession, logAuthEvent, LOGIN_PATH, requireSession } from "@/lib/session";

export type FormState = { error?: string; success?: string };

const MIN_PASSWORD_LENGTH = 12;

// Hash de uma password aleatória: compara-se contra ela quando o username está errado,
// para o tempo de resposta não revelar se o username é válido.
const DUMMY_HASH = "$2b$12$b/dc8NwqQr8/pNuQbF1PiORiPufSeGJhLH8JTmsaPEYLQAkoE52RW";

/** Só aceita destinos dentro do painel, para evitar open redirects. */
function safeRedirectTarget(from: FormDataEntryValue | null): string {
  if (typeof from === "string" && /^\/admincp(\/|\?|$)/.test(from) && !from.startsWith(LOGIN_PATH)) {
    return from;
  }
  return "/admincp";
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = formData.get("username");
  const password = formData.get("password");
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return { error: "Preenche o utilizador e a password." };
  }

  let admin;
  try {
    admin = await getAdmin();
  } catch (err) {
    console.error("Erro ao autenticar:", err);
    return { error: "Não foi possível iniciar sessão. Tenta novamente." };
  }

  const usernameOk = admin?.username === username.trim();
  const passwordOk = await bcrypt.compare(password, usernameOk ? admin!.passwordHash : DUMMY_HASH);
  if (!admin || !usernameOk || !passwordOk) {
    await logAuthEvent("login_falhado");
    return { error: "Credenciais inválidas." };
  }

  await createSession({ username: admin.username, version: admin.sessionVersion });
  await logAuthEvent("login_sucesso");
  redirect(safeRedirectTarget(formData.get("from")));
}

export async function logout() {
  if (await getSession()) await logAuthEvent("logout");
  await deleteSession();
  redirect(LOGIN_PATH);
}

/** Termina todas as sessões abertas, incluindo a deste dispositivo. */
export async function logoutEverywhere() {
  await requireSession();
  await bumpSessionVersion();
  await logAuthEvent("logout_global");
  await deleteSession();
  redirect(LOGIN_PATH);
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();

  const current = formData.get("current");
  const next = formData.get("next");
  const confirm = formData.get("confirm");
  if (typeof current !== "string" || typeof next !== "string" || typeof confirm !== "string") {
    return { error: "Preenche todos os campos." };
  }
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { error: `A nova password tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (next !== confirm) {
    return { error: "A confirmação não coincide com a nova password." };
  }

  const admin = await getAdmin();
  if (!admin || !(await bcrypt.compare(current, admin.passwordHash))) {
    return { error: "A password atual está errada." };
  }
  if (await bcrypt.compare(next, admin.passwordHash)) {
    return { error: "A nova password tem de ser diferente da atual." };
  }

  // Invalida as sessões nos outros dispositivos e renova a deste.
  const version = await updateAdminPassword(await bcrypt.hash(next, 12));
  await createSession({ username: admin.username, version });
  await logAuthEvent("password_alterada");
  return { success: "Password alterada. As sessões noutros dispositivos foram terminadas." };
}
