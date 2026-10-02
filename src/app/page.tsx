import { connection } from "next/server";
import { getVotingStatus, type VotingStatus } from "@/lib/db";
import { getMockups } from "@/lib/mockups";
import VoteForm, { type VotingPhase } from "./vote-form";

const dateFormat = new Intl.DateTimeFormat("pt-PT", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Lisbon",
});

async function loadStatus(): Promise<VotingStatus> {
  try {
    return await getVotingStatus();
  } catch (err) {
    // Se não der para ler o prazo, trata-se como "sem votação aberta".
    console.error("Erro ao ler o prazo da votação:", err);
    return { start: null, deadline: null, open: false, upcoming: false, round: 0 };
  }
}

export default async function Home() {
  // O estado da votação depende da hora do pedido: nada de prerender.
  await connection();
  const [mockups, { start, deadline, open, upcoming, round }] = await Promise.all([getMockups(), loadStatus()]);
  const phase: VotingPhase = !deadline ? "none" : open ? "open" : upcoming ? "upcoming" : "closed";

  return (
    <VoteForm
      mockups={mockups}
      phase={phase}
      round={round}
      start={start?.toISOString() ?? null}
      deadline={deadline?.toISOString() ?? null}
      deadlineLabel={deadline ? dateFormat.format(deadline) : null}
      startLabel={start ? dateFormat.format(start) : null}
    />
  );
}
