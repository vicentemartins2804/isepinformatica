"use server";

import { getSql } from "@/lib/db";
import { COLOR_OPTIONS, DESIGN_OPTIONS } from "@/lib/options";

export type VoteState = { status: "idle" | "success" | "error"; message?: string };

export async function submitVote(_prev: VoteState, formData: FormData): Promise<VoteState> {
  const colorId = formData.get("colorId");
  const designId = formData.get("designId");

  const validColor = COLOR_OPTIONS.some((c) => c.id === colorId);
  const validDesign = DESIGN_OPTIONS.some((d) => d.id === designId);
  if (!validColor || !validDesign) {
    return { status: "error", message: "Seleciona uma cor e um design válidos." };
  }

  try {
    const sql = getSql();
    await sql`INSERT INTO votes (color_id, design_id) VALUES (${colorId}, ${designId})`;
  } catch (err) {
    console.error("Erro ao registar voto:", err);
    return { status: "error", message: "Não foi possível registar o voto. Tenta novamente." };
  }

  return { status: "success" };
}
