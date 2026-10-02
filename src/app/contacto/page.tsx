import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "./contact-form";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Envia uma mensagem à organização da votação da sweat de curso de Engenharia Informática.",
};

export default function ContactPage() {
  return (
    <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
      <article className="flex w-full max-w-2xl animate-rise flex-col gap-6 rounded-2xl border border-line bg-surface/90 p-6 text-sm leading-relaxed sm:p-8 text-muted shadow-sm backdrop-blur">
        <header>
          <Link href="/" className="text-xs font-medium text-accent hover:underline">
            ← Voltar à votação
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-heading">Contacta-nos</h1>
          <p className="mt-1">
            Dúvidas sobre a votação ou pedidos sobre os teus dados: escreve-nos e respondemos para o teu email.
          </p>
        </header>

        <ContactForm />

        <p className="text-xs">
          Guardamos o teu nome, email e mensagem só para te responder, e apagamo-los quando o assunto fica resolvido. Mais detalhes na{" "}
          <Link href="/privacidade" className="underline underline-offset-2 hover:text-foreground">
            página de privacidade
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
