/** Que parte do mockup mostrar: a imagem inteira, só a frente (metade esquerda) ou só as costas (metade direita). */
export type MockupSide = "both" | "front" | "back";

/** Posição e tamanho da imagem dentro da caixa quadrada, em percentagem da caixa. */
export type ImageBox = { left: number; top: number; width: number; height: number };

/**
 * Calcula onde pôr a imagem (de proporção `aspect` = largura / altura) numa caixa quadrada
 * para mostrar a parte pedida, centrada e sem deformar. Os mockups têm a frente na metade
 * esquerda e as costas na metade direita.
 */
export function mockupImageBox(aspect: number, side: MockupSide): ImageBox {
  if (side === "both") {
    // Igual a object-fit: contain.
    return aspect >= 1
      ? { left: 0, top: (100 - 100 / aspect) / 2, width: 100, height: 100 / aspect }
      : { left: (100 - 100 * aspect) / 2, top: 0, width: 100 * aspect, height: 100 };
  }

  const halfAspect = aspect / 2;
  if (halfAspect <= 1) {
    // A metade é mais alta do que larga: ocupa a altura toda e centra-se na horizontal.
    const halfWidth = 100 * halfAspect;
    const left = (100 - halfWidth) / 2 - (side === "back" ? halfWidth : 0);
    return { left, top: 0, width: 100 * aspect, height: 100 };
  }
  // A metade é mais larga do que alta: ocupa a largura toda e centra-se na vertical.
  const height = 200 / aspect;
  return { left: side === "back" ? -100 : 0, top: (100 - height) / 2, width: 200, height };
}
