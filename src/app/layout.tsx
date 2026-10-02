import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteOrigin } from "@/lib/site-url";
import Background1852 from "./background-1852";
import SiteFooter from "./site-footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "ISEP Informática";
const DESCRIPTION = "Escolhe a cor e o design da sweat de curso de Engenharia Informática do ISEP.";

// Os links de pré-visualização (WhatsApp, Discord) precisam de URLs absolutos: o domínio
// público (SITE_URL ou o da Vercel); localmente, o servidor de desenvolvimento.
const siteUrl = getSiteOrigin() ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Engenharia Informática ISEP",
    locale: "pt_PT",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative isolate min-h-full flex flex-col">
        <Background1852 />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
