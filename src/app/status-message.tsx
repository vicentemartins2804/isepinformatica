/** Mensagem centrada no estilo do site, usada nas páginas de erro e de página não encontrada. */
export default function StatusMessage({
  code,
  title,
  children,
}: {
  code: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="flex max-w-sm animate-rise flex-col items-center gap-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">{code}</p>
        <h1 className="text-2xl font-bold tracking-tight text-heading">{title}</h1>
        {children}
      </section>
    </main>
  );
}

export const statusButton =
  "mt-4 inline-flex h-10 items-center rounded-lg bg-accent px-5 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent-light focus-visible:ring-offset-2 focus-visible:ring-offset-background";
