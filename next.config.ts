import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  /* config options here */
};

// BotID (captcha invisível da Vercel): acrescenta os rewrites de que o cliente precisa.
export default withBotId(nextConfig);
