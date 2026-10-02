import type { NextRequest } from "next/server";
import { qrPng, qrSvg } from "@/lib/qr";
import { getSession } from "@/lib/session";
import { getVotingUrl } from "@/lib/site-url";

/** Descarrega o QR code do link da votação: ?format=png (por omissão) ou ?format=svg. */
export async function GET(request: NextRequest) {
  if (!(await getSession())) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const url = await getVotingUrl();
  const svg = request.nextUrl.searchParams.get("format") === "svg";
  const body = svg ? await qrSvg(url) : new Uint8Array(await qrPng(url));

  return new Response(body, {
    headers: {
      "Content-Type": svg ? "image/svg+xml" : "image/png",
      "Content-Disposition": `attachment; filename="qr-votacao-sweat.${svg ? "svg" : "png"}"`,
      "Cache-Control": "no-store",
    },
  });
}
