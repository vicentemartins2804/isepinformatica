export type ColorOption = {
  id: string;
  name: string;
  hex: string;
};

export type DesignOption = {
  id: string;
  name: string;
};

export const COLOR_OPTIONS: ColorOption[] = [
  { id: "bordo", name: "Bordô", hex: "#7a1c24" },
  { id: "verde", name: "Verde", hex: "#1f4d3a" },
  { id: "branco", name: "Branco", hex: "#f7f6f2" },
];

export const DESIGN_OPTIONS: DesignOption[] = [
  { id: "design-1", name: "Design 1" },
  { id: "design-2", name: "Design 2" },
  { id: "design-3", name: "Design 3" },
];

/** Parte da sweat em cada ficheiro de mockup. */
export type MockupPart = "frente" | "costas";

/**
 * Nome base do ficheiro do mockup em public/mockups (sem extensão), por exemplo
 * "design-1-verde-frente" ou, na versão finalista, "design-1-verde-finalista-costas".
 * A versão finalista só muda a imagem, não o voto.
 */
export function mockupKey(designId: string, colorId: string, part: MockupPart, finalist = false) {
  return `${designId}-${colorId}${finalist ? "-finalista" : ""}-${part}`;
}
