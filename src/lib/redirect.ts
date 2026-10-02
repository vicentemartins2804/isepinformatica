/** Página de login do painel. */
export const LOGIN_PATH = "/admincp/login";

/** Destino depois do login: só aceita caminhos dentro do painel, para evitar open redirects. */
export function safeRedirectTarget(from: unknown): string {
  if (typeof from === "string" && /^\/admincp(\/|\?|$)/.test(from) && !from.startsWith(LOGIN_PATH)) {
    return from;
  }
  return "/admincp";
}
