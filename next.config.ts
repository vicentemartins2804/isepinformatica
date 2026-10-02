import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

// Cabeçalhos de segurança em todas as respostas. Sem uma Content-Security-Policy completa
// (o BotID e o Next.js precisam de scripts inline); só o frame-ancestors, contra clickjacking.
const securityHeaders = [
  // Nenhum outro site pode mostrar este dentro de um <iframe>.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  // O browser não tenta adivinhar o tipo dos ficheiros.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Os links para outros sites só levam o domínio, não o caminho.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O site não usa câmara, microfone nem localização.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// BotID (captcha invisível da Vercel): acrescenta os rewrites de que o cliente precisa.
export default withBotId(nextConfig);
