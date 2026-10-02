import Link from "next/link";

export default function SiteFooter() {
  return (
    // Acima do fundo das popups (z-50), para a ligação à privacidade estar sempre acessível.
    <footer className="relative z-[60] border-t border-line/70 bg-background/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-4 text-center text-xs text-muted sm:justify-between sm:px-6 sm:text-left">
        <p>
          <span className="font-semibold text-heading">Engenharia Informática</span> ISEP
        </p>
        <nav className="flex items-center gap-4">
          <Link href="/" className="hover:text-foreground">
            Votação
          </Link>
          <Link href="/privacidade" className="hover:text-foreground">
            Privacidade
          </Link>
          <Link href="/contacto" className="hover:text-foreground">
            Contacto
          </Link>
          <a
            href="https://www.instagram.com/isepinformatica/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram de Engenharia Informática do ISEP"
            title="Instagram"
            className="transition-colors hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
            </svg>
          </a>
        </nav>
      </div>
    </footer>
  );
}
