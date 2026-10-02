"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isBotRequest } from "@/lib/bot";
import { RESET_CONFIRMATION } from "@/lib/messages";
import { safeRedirectTarget } from "@/lib/redirect";
import {
  anonymizeVotes,
  bumpSessionVersion,
  countRecentFailedLogins,
  deleteContactMessages,
  deleteVotes,
  getAdmin,
  getVotingStatus,
  resetVotes,
  setVotingSchedule,
} from "@/lib/db";
import {
  createSession,
  deleteSession,
  getRequestIp,
  getSession,
  logAuthEvent,
  LOGIN_PATH,
  requireSession,
} from "@/lib/session";

export type FormState = { error?: string; success?: string };

/** Limite de tentativas: 5 logins falhados do mesmo IP bloqueiam-no durante 15 minutos. */
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

// Hash de uma password aleatória: compara-se contra ela quando o username está errado,
// para o tempo de resposta não revelar se o username é válido.
const DUMMY_HASH = "$2b$12$b/dc8NwqQr8/pNuQbF1PiORiPufSeGJhLH8JTmsaPEYLQAkoE52RW";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = formData.get("username");
  const password = formData.get("password");
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return { error: "Preenche o utilizador e a password." };
  }
  if (await isBotRequest()) {
    return { error: "Pedido bloqueado. Recarrega a página e tenta novamente." };
  }

  const ip = await getRequestIp();
  let admin;
  try {
    if (ip && (await countRecentFailedLogins(ip, LOCKOUT_MINUTES)) >= MAX_FAILED_LOGINS) {
      await logAuthEvent("login_bloqueado");
      return { error: `Demasiadas tentativas falhadas. Tenta novamente daqui a ${LOCKOUT_MINUTES} minutos.` };
    }
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

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Define ou remove o horário da votação (US04). As datas/horas são de Lisboa.
 * O início é opcional (sem ele, abre logo); o fim é obrigatório.
 */
export async function setSchedule(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();

  if (formData.get("intent") === "remove") {
    try {
      await setVotingSchedule(null, null);
    } catch (err) {
      console.error("Erro ao remover o horário:", err);
      return { error: "Não foi possível remover o horário. Tenta novamente." };
    }
    revalidatePath("/admincp");
    return { success: "Horário removido: não há votação aberta." };
  }

  const start = formData.get("start");
  const end = formData.get("end");
  if (typeof end !== "string" || !LOCAL_DATETIME.test(end)) {
    return { error: "Indica a data e hora de fecho." };
  }
  const startValue = typeof start === "string" && start !== "" ? start : null;
  if (startValue !== null && !LOCAL_DATETIME.test(startValue)) {
    return { error: "A data e hora de abertura não é válida." };
  }
  // O formato "AAAA-MM-DDTHH:MM" ordena-se bem como texto.
  if (startValue !== null && startValue >= end) {
    return { error: "A abertura tem de ser antes do fecho." };
  }

  try {
    await setVotingSchedule(startValue, end);
  } catch (err) {
    console.error("Erro ao guardar o horário:", err);
    return { error: "Não foi possível guardar o horário. Tenta novamente." };
  }

  revalidatePath("/admincp");
  return { success: "Horário guardado." };
}

/** Anula (apaga) os votos selecionados na tabela do painel. */
export async function deleteSelectedVotes(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();

  const ids = formData.getAll("ids").filter((id): id is string => typeof id === "string" && /^\d+$/.test(id));
  if (ids.length === 0) return { error: "Seleciona pelo menos um voto." };

  let deleted;
  try {
    deleted = await deleteVotes(ids);
  } catch (err) {
    console.error("Erro ao anular votos:", err);
    return { error: "Não foi possível anular os votos. Tenta novamente." };
  }

  await logAuthEvent("votos_anulados", `${deleted} voto(s): #${ids.join(", #")}`);
  revalidatePath("/admincp");
  return { success: `${deleted} voto(s) anulado(s).` };
}

/** Apaga todos os votos e começa uma nova ronda (teste ou segunda volta). */
export async function resetVoting(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();

  if (formData.get("confirmation") !== RESET_CONFIRMATION) {
    return { error: `Escreve ${RESET_CONFIRMATION} para confirmar.` };
  }

  let deleted;
  try {
    deleted = await resetVotes();
  } catch (err) {
    console.error("Erro ao repor a votação:", err);
    return { error: "Não foi possível repor a votação. Tenta novamente." };
  }

  await logAuthEvent("votacao_reposta", `${deleted} voto(s) apagado(s)`);
  revalidatePath("/admincp");
  return { success: `Votação reposta a zeros: ${deleted} voto(s) apagado(s).` };
}

/** RGPD: retira o fingerprint dos votos, depois de a votação terminar. */
export async function anonymizeData(): Promise<FormState> {
  await requireSession();

  try {
    if ((await getVotingStatus()).open) {
      return { error: "Só podes anonimizar depois de a votação fechar." };
    }
    const changed = await anonymizeVotes();
    await logAuthEvent("dados_anonimizados", `${changed} voto(s)`);
    revalidatePath("/admincp");
    return { success: `Dados anonimizados: ${changed} voto(s).` };
  } catch (err) {
    console.error("Erro ao anonimizar os dados:", err);
    return { error: "Não foi possível anonimizar os dados. Tenta novamente." };
  }
}

/** Apaga as mensagens de contacto selecionadas (depois de respondidas). */
export async function deleteSelectedMessages(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();

  const ids = formData.getAll("ids").filter((id): id is string => typeof id === "string" && /^\d+$/.test(id));
  if (ids.length === 0) return { error: "Seleciona pelo menos uma mensagem." };

  let deleted;
  try {
    deleted = await deleteContactMessages(ids);
  } catch (err) {
    console.error("Erro ao apagar mensagens:", err);
    return { error: "Não foi possível apagar as mensagens. Tenta novamente." };
  }

  await logAuthEvent("mensagens_apagadas", `${deleted} mensagem(ns)`);
  revalidatePath("/admincp");
  return { success: `${deleted} mensagem(ns) apagada(s).` };
}
