"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { MockupImage } from "@/lib/mockup-view";
import MockupImages from "./mockup-images";

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

  // As imagens ficam lado a lado, com espaço entre elas e à volta (o padding de 5%).
  const contentAspect = images.reduce((sum, image) => sum + image.aspect, 0) + 0.06 * (images.length - 1);
  const boxAspect = contentAspect * 1.1;

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
        className="overflow-hidden rounded-2xl bg-surface p-[5%] shadow-2xl animate-rise"
        style={{
          aspectRatio: boxAspect,
          width: `min(92vw, calc(88vh * ${boxAspect}))`,
          backgroundColor: background || undefined,
        }}
      >
        <MockupImages images={images} sizes={`${Math.round(92 / images.length)}vw`} />
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
