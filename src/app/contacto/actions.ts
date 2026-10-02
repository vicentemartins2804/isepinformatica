"use server";

import { isBotRequest } from "@/lib/bot";
import { parseContactForm } from "@/lib/contact";
import { insertContactMessage } from "@/lib/db";

export type ContactFields = { name: string; email: string; topic: string; message: string };

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** O que foi escrito, para o formulário não se apagar quando há um erro. */
  fields?: ContactFields;
};

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  const fields = { name: text("name"), email: text("email"), topic: text("topic"), message: text("message") };
  const error = (message: string): ContactState => ({ status: "error", message, fields });

  const parsed = parseContactForm(fields);
  if (!parsed.ok) return error(parsed.error);

  if (await isBotRequest()) {
    return error("Não foi possível validar o pedido. Recarrega a página e tenta novamente.");
  }

  try {
    const result = await insertContactMessage(parsed.value);
    if (result === "rate_limited") {
      return error("Recebemos demasiadas mensagens. Tenta novamente daqui a uma hora.");
    }
  } catch (err) {
    console.error("Erro ao gravar mensagem de contacto:", err);
    return error("Não foi possível enviar a mensagem. Tenta novamente.");
  }

  return { status: "success" };
}
