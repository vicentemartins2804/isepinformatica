import { ImageResponse } from "next/og";

// Imagem de pré-visualização ao partilhar o link (WhatsApp, Discord, etc.).
export const alt = "Engenharia Informática · ISEP: votação da sweat de curso";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Paleta Nord, a mesma do site (src/app/globals.css).
const NORD = {
  background: "#eceff4",
  heading: "#2e3440",
  muted: "#4c566a",
  accent: "#5e81ac",
  accentLight: "#81a1c1",
  numberFill: "#e1e7f0", // nord9 muito esbatido sobre o fundo
  outline: "#c2cfe0",
};

const OUTLINE = [
  [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5], [1, 1], [-1, 1], [1, -1], [-1, -1],
]
  .map(([x, y]) => `${x}px ${y}px 0 ${NORD.outline}`)
  .join(", ");

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" };

/**
 * Geist (a fonte do site) em TTF, vinda do Google Fonts. A imagem é gerada no build; se o
 * download falhar, usa-se a fonte por omissão do ImageResponse.
 */
async function loadGeist(): Promise<OgFont[]> {
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Geist:wght@400;700;800")).text();
    const faces = [...css.matchAll(/font-weight: (\d+);[^}]*?url\((https:[^)]+\.ttf)\)/g)];
    return await Promise.all(
      faces.map(async ([, weight, url]) => ({
        name: "Geist",
        data: await (await fetch(url)).arrayBuffer(),
        weight: Number(weight) as OgFont["weight"],
        style: "normal" as const,
      })),
    );
  } catch (err) {
    console.error("Não foi possível carregar a fonte Geist para a imagem de partilha:", err);
    return [];
  }
}

export default async function OpengraphImage() {
  const fonts = await loadGeist();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: NORD.background,
          fontFamily: fonts.length ? "Geist" : "sans-serif",
        }}
      >
        {/* 1852 gigante só com contorno, como no fundo do site */}
        <div
          style={{
            position: "absolute",
            display: "flex",
            fontSize: 460,
            fontWeight: 800,
            letterSpacing: -20,
            // O ImageResponse não suporta text-stroke: o 1852 fica preenchido num tom muito claro,
            // com um contorno fino feito de sombras em 8 direções.
            color: NORD.numberFill,
            textShadow: OUTLINE,
          }}
        >
          1852
        </div>

        <div style={{ display: "flex", fontSize: 88, fontWeight: 800, letterSpacing: -2, color: NORD.heading }}>
          Engenharia{" "}
          <span style={{ color: NORD.accent, marginLeft: 22 }}>Informática</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 18,
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: 16,
            color: NORD.heading,
          }}
        >
          <div style={{ width: 90, height: 2, background: NORD.accentLight, marginRight: 28 }} />
          ISEP
          <div style={{ width: 90, height: 2, background: NORD.accentLight, marginLeft: 12 }} />
        </div>
        <div style={{ display: "flex", marginTop: 48, fontSize: 32, color: NORD.muted }}>
          Vota na cor e no design da sweat do curso
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
