import "server-only";
import { checkBotId } from "botid/server";

/**
 * Captcha invisível (Vercel BotID): `true` se o pedido vier de um bot. Os caminhos
 * protegidos estão em src/instrumentation-client.ts. Em desenvolvimento, o BotID deixa
 * passar tudo. Se o serviço falhar, deixa passar (e regista o erro) para não bloquear
 * votos legítimos; a unicidade e o horário continuam garantidos pela base de dados.
 */
export async function isBotRequest(): Promise<boolean> {
  try {
    const verification = await checkBotId();
    return verification.isBot;
  } catch (err) {
    console.error("Erro na verificação BotID:", err);
    return false;
  }
}
