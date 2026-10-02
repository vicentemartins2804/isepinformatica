import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/jwt";

// Verificação otimista: trava cedo quem não tem sessão. As páginas e APIs voltam a
// validar a sessão no servidor (requireSession / getSession).
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/api/admin")) {
    if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    return NextResponse.next();
  }

  // O login fica sempre acessível: um JWT com assinatura válida pode já ter sido invalidado
  // ("terminar sessão em todos"), e só a página, que consulta a base de dados, o sabe.
  if (pathname === "/admincp/login") return NextResponse.next();

  if (!session) {
    const loginUrl = new URL("/admincp/login", request.url);
    loginUrl.searchParams.set("from", pathname + search);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admincp", "/admincp/:path*", "/api/admin/:path*"],
};
