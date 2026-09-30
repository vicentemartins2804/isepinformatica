import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const MOCKUPS_DIR = path.join(process.cwd(), "public", "mockups");
const EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export type Mockup = {
  src: string;
  /** Cor do fundo da foto, para o painel se fundir com a imagem. */
  background: string;
};

async function cornerColor(file: string): Promise<string> {
  const [r, g, b] = await sharp(file)
    .extract({ left: 2, top: 2, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();
  return `rgb(${r} ${g} ${b})`;
}

/** Mapeia "<design>-<cor>" para o mockup correspondente em public/mockups. */
export async function getMockups(): Promise<Record<string, Mockup>> {
  let files: string[];
  try {
    files = await readdir(MOCKUPS_DIR);
  } catch {
    return {};
  }

  const entries = await Promise.all(
    files
      .filter((file) => EXTENSIONS.includes(path.extname(file).toLowerCase()))
      .map(async (file) => {
        const key = path.basename(file, path.extname(file));
        const background = await cornerColor(path.join(MOCKUPS_DIR, file)).catch(() => "");
        return [key, { src: `/mockups/${file}`, background }] as const;
      }),
  );
  return Object.fromEntries(entries);
}
