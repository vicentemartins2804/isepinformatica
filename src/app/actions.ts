"use server";

import { insertVote } from "@/lib/db";
import { DUPLICATE_VOTE_MESSAGE } from "@/lib/messages";
import { COLOR_OPTIONS, DESIGN_OPTIONS } from "@/lib/options";

export type VoteState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** O dispositivo já tinha votado (o cliente marca-o no localStorage). */
  alreadyVoted?: boolean;
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

  try {
    const inserted = await insertVote({
      visitorId,
      colorId: colorId as string,
      designId: designId as string,
    });
    if (!inserted) {
      return { status: "error", message: DUPLICATE_VOTE_MESSAGE, alreadyVoted: true };
    }
  } catch (err) {
    console.error("Erro ao registar voto:", err);
    return { status: "error", message: "Não foi possível registar o voto. Tenta novamente." };
  }

  return { status: "success" };
}
