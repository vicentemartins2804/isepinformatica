import { getResults } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  if (!(await getSession())) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    return Response.json({ results: await getResults() });
  } catch (err) {
    console.error("Erro ao ler resultados:", err);
    return Response.json({ error: "Não foi possível ler os resultados." }, { status: 500 });
  }
}
