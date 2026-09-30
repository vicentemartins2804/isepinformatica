import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Background1852 from "./background-1852";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Votação da Sweat",
  description: "Vota na cor e no design da sweat do curso.",
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
      </body>
    </html>
  );
}
