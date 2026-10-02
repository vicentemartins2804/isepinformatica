"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { MockupSide } from "@/lib/mockup-view";

type MockupZoomProps = {
  src: string;
  alt: string;
  /** Proporção largura / altura da imagem inteira (frente à esquerda, costas à direita). */
  aspect: number;
  side: MockupSide;
  background?: string;
  onClose: () => void;
};

/** Mockup ampliado por cima da página. Fecha com um clique, com Esc ou no botão ✕. */
export default function MockupZoom({ src, alt, aspect, side, background, onClose }: MockupZoomProps) {
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

  // Na frente ou nas costas mostra-se só metade da imagem: a caixa tem metade da largura.
  const boxAspect = side === "both" ? aspect : aspect / 2;

  // No <body>, fora do formulário: as animações dos elementos de cima (transform) prenderiam
  // o `position: fixed` à caixa do formulário em vez do ecrã.
  return createPortal(
    // Acima do rodapé (z-60), que fica por cima das outras popups.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex cursor-zoom-out items-center justify-center bg-foreground/70 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="relative overflow-hidden rounded-2xl shadow-2xl animate-rise"
        style={{
          aspectRatio: boxAspect,
          width: `min(92vw, calc(88vh * ${boxAspect}))`,
          backgroundColor: background || undefined,
        }}
      >
        <div
          className="absolute inset-y-0"
          style={{ left: side === "back" ? "-100%" : 0, width: side === "both" ? "100%" : "200%" }}
        >
          <Image src={src} alt={alt} fill sizes="184vw" className="object-fill" />
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
