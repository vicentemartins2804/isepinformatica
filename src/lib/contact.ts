/** Assuntos do formulário de contacto (os ids são os aceites pela base de dados). */
export const CONTACT_TOPICS = [
  { id: "duvida", label: "Dúvida sobre a votação" },
  { id: "rgpd", label: "Pedido sobre os meus dados (RGPD)" },
  { id: "outro", label: "Outro assunto" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["id"];

/** Limites de tamanho, iguais aos CHECK da tabela `mensagens`. */
export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const MESSAGE_MAX = 2000;

export type ContactMessage = { name: string | null; email: string; topic: ContactTopic; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida os campos do formulário. Devolve a mensagem pronta a gravar, ou o erro a mostrar. */
export function parseContactForm(
  data: Record<string, unknown>,
): { ok: true; value: ContactMessage } | { ok: false; error: string } {
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = text(data.name);
  const email = text(data.email);
  const topic = text(data.topic);
  const message = text(data.message);

  if (name.length > NAME_MAX) return { ok: false, error: `O nome pode ter no máximo ${NAME_MAX} caracteres.` };
  if (!email || email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Indica um email válido, para te podermos responder." };
  }
  if (!CONTACT_TOPICS.some((t) => t.id === topic)) return { ok: false, error: "Escolhe o assunto." };
  if (!message) return { ok: false, error: "Escreve a tua mensagem." };
  if (message.length > MESSAGE_MAX) {
    return { ok: false, error: `A mensagem pode ter no máximo ${MESSAGE_MAX} caracteres.` };
  }

  return { ok: true, value: { name: name || null, email, topic: topic as ContactTopic, message } };
}
