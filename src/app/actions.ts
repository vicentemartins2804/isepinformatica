"use server";

import { isBotRequest } from "@/lib/bot";
import { insertVote } from "@/lib/db";
import { DUPLICATE_VOTE_MESSAGE, VOTING_CLOSED_MESSAGE } from "@/lib/messages";
import { COLOR_OPTIONS, DESIGN_OPTIONS } from "@/lib/options";

export type VoteState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** O dispositivo já tinha votado (o cliente marca-o no localStorage). */
  alreadyVoted?: boolean;
  /** O prazo da votação já passou (US04). */
  closed?: boolean;
};

const VISITOR_ID_PATTERN = /^[A-Za-z0-9]{8,64}$/;

export async function submitVote(_prev: VoteState, formData: FormData): Promise<VoteState> {
  const colorId = formData.get("colorId");
  const designId = formData.get("designId");
  const visitorId = formData.get("visitorId");

  const validColor = COLOR_OPTIONS.some((c) => c.id === colorId);
  const validDesign = DESIGN_OPTIONS.some((d) => d.id === designId);
  if (!validColor || !validDesign) {
    return { status: "error", message: "Seleciona uma cor e um design válidos." };
  }
  if (typeof visitorId !== "string" || !VISITOR_ID_PATTERN.test(visitorId)) {
    return { status: "error", message: "Não foi possível identificar o dispositivo. Recarrega a página." };
  }
  // Captcha invisível: recusa pedidos automáticos antes de gravar o voto.
  if (await isBotRequest()) {
    return { status: "error", message: "Não foi possível validar o pedido. Recarrega a página e tenta novamente." };
  }

  try {
    // O prazo e a unicidade são garantidos pela base de dados (RLS + UNIQUE).
    const result = await insertVote({
      visitorId,
      colorId: colorId as string,
      designId: designId as string,
    });
    if (result === "closed") {
      return { status: "error", message: VOTING_CLOSED_MESSAGE, closed: true };
    }
    if (result === "duplicate") {
      return { status: "error", message: DUPLICATE_VOTE_MESSAGE, alreadyVoted: true };
    }
  } catch (err) {
    console.error("Erro ao registar voto:", err);
    return { status: "error", message: "Não foi possível registar o voto. Tenta novamente." };
  }

  return { status: "success" };
}
