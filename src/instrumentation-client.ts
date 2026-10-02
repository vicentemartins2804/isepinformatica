import { initBotId } from "botid/client/core";

// Captcha invisível (Vercel BotID). As server actions são POSTs ao caminho da própria
// página: "/" para votar e "/admincp/login" para entrar no painel. O servidor confirma
// com checkBotId() (src/lib/bot.ts).
initBotId({
  protect: [
    { path: "/", method: "POST" },
    { path: "/admincp/login", method: "POST" },
  ],
});
