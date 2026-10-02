import Link from "next/link";

export default function SiteFooter() {
  return (
    // Acima do fundo das popups (z-50), para a ligação à privacidade estar sempre acessível.
    <footer className="relative z-[60] border-t border-line/70 bg-background/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 text-xs text-muted">
        <p>
          <span className="font-semibold text-heading">Engenharia Informática</span> · ISEP · Votação da sweat do curso
        </p>
        <nav className="flex gap-4">
          <Link href="/" className="hover:text-foreground">
            Votação
          </Link>
          <Link href="/privacidade" className="hover:text-foreground">
            Privacidade
          </Link>
        </nav>
      </div>
    </footer>
  );
}
