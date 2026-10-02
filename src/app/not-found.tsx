import type { Metadata } from "next";
import Link from "next/link";
import StatusMessage, { statusButton } from "./status-message";

export const metadata: Metadata = {
  title: "Página não encontrada · Votação da Sweat",
};

export default function NotFound() {
  return (
    <StatusMessage code="Erro 404" title="Página não encontrada">
      <p className="text-sm text-muted">O endereço que abriste não existe ou mudou de sítio.</p>
      <Link href="/" className={statusButton}>
        Ir para a votação
      </Link>
    </StatusMessage>
  );
}
