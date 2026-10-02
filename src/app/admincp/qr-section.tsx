const card = "rounded-2xl border border-line bg-surface/90 p-6 shadow-sm backdrop-blur";
const button =
  "inline-flex h-9 items-center rounded-lg border border-line bg-background px-4 text-sm font-medium outline-none transition-colors hover:border-accent-light focus-visible:ring-2 focus-visible:ring-accent-light";

/** QR code do link da votação, para cartazes. `svg` é gerado no servidor a partir do URL. */
export default function QrSection({ url, svg }: { url: string; svg: string | null }) {
  return (
    <section className={`${card} flex flex-col gap-5 sm:flex-row sm:items-center`}>
      <div className="mx-auto w-40 shrink-0 overflow-hidden rounded-lg border border-line bg-white sm:mx-0">
        {svg ? (
          // SVG gerado pela biblioteca qrcode a partir do nosso próprio URL.
          <div aria-label={`QR code para ${url}`} role="img" className="[&_svg]:block [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <p className="p-4 text-center text-xs text-danger">Não foi possível gerar o QR code.</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-heading">QR code para cartazes</h2>
        <p className="text-sm text-muted">
          Aponta para <span className="break-all font-mono text-xs text-foreground">{url}</span>. Imprime-o nos cartazes
          das salas e do bar para chegar a quem não está nos grupos do curso.
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <a href="/api/admin/qr?format=png" download className={button}>
            Descarregar PNG
          </a>
          <a href="/api/admin/qr?format=svg" download className={button}>
            Descarregar SVG
          </a>
        </div>
      </div>
    </section>
  );
}
