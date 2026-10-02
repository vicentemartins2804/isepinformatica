"use client";

import { useEffect } from "react";
import StatusMessage, { statusButton } from "./status-message";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusMessage code="Erro" title="Algo correu mal">
      <p className="text-sm text-muted">Não foi possível carregar esta página. Tenta outra vez daqui a pouco.</p>
      {error.digest && <p className="font-mono text-xs text-muted">Código: {error.digest}</p>}
      <button type="button" onClick={() => retry()} className={statusButton}>
        Tentar outra vez
      </button>
    </StatusMessage>
  );
}
