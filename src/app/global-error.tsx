"use client";

import { useEffect } from "react";

// Substitui o layout raiz quando é ele a falhar: não tem os estilos globais, por isso as
// cores da paleta Nord vão aqui em linha.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#eceff4",
          color: "#2e3440",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <title>Erro · Votação da Sweat</title>
        <main>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: "#5e81ac" }}>
            Engenharia Informática · ISEP
          </p>
          <h1 style={{ fontSize: 24, margin: "8px 0" }}>Algo correu mal</h1>
          <p style={{ fontSize: 14, color: "#4c566a" }}>O site não está disponível neste momento. Tenta outra vez daqui a pouco.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 16,
              height: 40,
              padding: "0 20px",
              border: 0,
              borderRadius: 8,
              background: "#5e81ac",
              color: "white",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Tentar outra vez
          </button>
        </main>
      </body>
    </html>
  );
}
