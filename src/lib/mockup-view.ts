import { mockupKey } from "./options";

/** Que parte da sweat mostrar: a frente e as costas lado a lado, só a frente ou só as costas. */
export type MockupSide = "both" | "front" | "back";

export type MockupImage = {
  src: string;
  /** Proporção largura / altura da área recortada (só a sweat). */
  aspect: number;
  /** Cor do fundo da foto, para o painel se fundir com a imagem; vazio se for transparente. */
  background: string;
  /** Área ocupada pela sweat, em frações da imagem inteira (sem a margem à volta). */
  crop: { left: number; top: number; width: number; height: number };
};

export type MockupView = {
  front?: MockupImage;
  back?: MockupImage;
  /** A imagem das costas mostrada é a da versão finalista. */
  finalistShown: boolean;
  /** Ficheiros esperados em public/mockups que não existem (sem extensão). */
  missing: string[];
};

/**
 * Escolhe as imagens de uma combinação. A versão finalista só muda as costas (a frente é
 * igual); se faltar a imagem finalista, mostram-se as costas normais.
 */
export function resolveMockupView(
  mockups: Record<string, MockupImage>,
  designId: string,
  colorId: string,
  finalist: boolean,
): MockupView {
  const frontKey = mockupKey(designId, colorId, "frente");
  const backKey = mockupKey(designId, colorId, "costas");
  const finalistKey = mockupKey(designId, colorId, "costas", true);

  const missing = [frontKey, backKey, ...(finalist ? [finalistKey] : [])].filter((key) => !mockups[key]);
  const finalistShown = finalist && !!mockups[finalistKey];
  return {
    front: mockups[frontKey],
    back: finalistShown ? mockups[finalistKey] : mockups[backKey],
    finalistShown,
    missing,
  };
}

/** As imagens a mostrar para a parte escolhida, pela ordem em que aparecem. */
export function imagesForSide(view: MockupView, side: MockupSide): MockupImage[] {
  const images = side === "front" ? [view.front] : side === "back" ? [view.back] : [view.front, view.back];
  return images.filter((image): image is MockupImage => !!image);
}
