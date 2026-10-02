"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { MockupImage } from "@/lib/mockup-view";
import MockupImages, { rowAspect } from "./mockup-images";

type MockupZoomProps = {
  /** Uma imagem (frente ou costas) ou duas lado a lado (ambos). */
  images: (MockupImage & { alt: string })[];
  background?: string;
  onClose: () => void;
};

/** Mockup ampliado por cima da página. Fecha com um clique, com Esc ou no botão ✕. */
export default function MockupZoom({ images, background, onClose }: MockupZoomProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Sem scroll da página por trás enquanto a imagem está ampliada.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // A caixa tem a proporção das imagens lado a lado; a margem de 5% em cada eixo mantém-na.
  const boxAspect = rowAspect(images);

  // No <body>, fora do formulário: as animações dos elementos de cima (transform) prenderiam
  // o `position: fixed` à caixa do formulário em vez do ecrã.
  return createPortal(
    // Acima do rodapé (z-60), que fica por cima das outras popups.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={images.map((image) => image.alt).join(" e ")}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex cursor-zoom-out items-center justify-center bg-foreground/70 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="relative overflow-hidden rounded-2xl bg-surface shadow-2xl animate-rise"
        style={{
          // Largura e altura explícitas (sem aspect-ratio), limitadas a 92% da largura e a
          // 80% da altura do ecrã. vh, e não dvh, para funcionar também em browsers antigos;
          // os 80% deixam folga para a barra de endereço do telemóvel.
          width: `min(92vw, ${80 * boxAspect}vh)`,
          height: `min(${92 / boxAspect}vw, 80vh)`,
          backgroundColor: background || undefined,
        }}
      >
        <div className="absolute inset-[5%]">
          <MockupImages images={images} containerAspect={boxAspect} sizes={`${Math.round(92 / images.length)}vw`} />
        </div>
      </div>
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-lg text-foreground shadow outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-accent-light"
      >
        ✕
      </button>
    </div>,
    document.body,
  );
}
