import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | undefined;

export function getSql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não está definida.");
    client = neon(url);
  }
  return client;
}

type Vote = { visitorId: string; colorId: string; designId: string };

/** Regista o voto. Devolve `false` se este `visitorId` já tinha votado. */
export async function insertVote(vote: Vote): Promise<boolean> {
  const sql = getSql();
  const inserted = await sql`
    INSERT INTO votes (visitor_id, color_id, design_id)
    VALUES (${vote.visitorId}, ${vote.colorId}, ${vote.designId})
    ON CONFLICT (visitor_id) DO NOTHING
    RETURNING id
  `;
  return inserted.length > 0;
}
