import { getAllVotes } from "@/lib/db";
import { COLOR_OPTIONS, DESIGN_OPTIONS } from "@/lib/options";
import { getSession } from "@/lib/session";

const colorName = new Map(COLOR_OPTIONS.map((c) => [c.id, c.name]));
const designName = new Map(DESIGN_OPTIONS.map((d) => [d.id, d.name]));

// "sv-SE" formata como "2026-10-02 14:03:05", que o Excel reconhece como data.
const lisbonDateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Lisbon",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function csvField(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

/** US08: exporta todos os votos em CSV (separador ";" e BOM, para abrir bem no Excel em PT). */
export async function GET() {
  if (!(await getSession())) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  let votes;
  try {
    votes = await getAllVotes();
  } catch (err) {
    console.error("Erro ao exportar votos:", err);
    return Response.json({ error: "Não foi possível exportar os votos." }, { status: 500 });
  }

  const header = ["id", "data_hora_lisboa", "data_hora_utc", "visitor_id", "cor", "design"];
  const rows = votes.map((v) => [
    v.id,
    lisbonDateTime.format(v.createdAt),
    v.createdAt.toISOString(),
    v.visitorId,
    colorName.get(v.colorId) ?? v.colorId,
    designName.get(v.designId) ?? v.designId,
  ]);
  const csv = "﻿" + [header, ...rows].map((row) => row.map(csvField).join(";")).join("\r\n") + "\r\n";

  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="votos-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
