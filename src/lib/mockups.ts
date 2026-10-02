import "server-only";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { MockupImage } from "./mockup-view";

const MOCKUPS_DIR = path.join(process.cwd(), "public", "mockups");
const EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

/** Cor do canto da imagem, ou "" se o fundo for transparente (fica o fundo da página). */
async function cornerColor(file: string): Promise<string> {
  const [r, g, b, a] = await sharp(file)
    .ensureAlpha()
    .extract({ left: 2, top: 2, width: 1, height: 1 })
    .raw()
    .toBuffer();
  return a < 255 ? "" : `rgb(${r} ${g} ${b})`;
}

/**
 * Lê uma imagem e mede a área ocupada pela sweat (sem a margem transparente ou da cor do
 * fundo), para todas as imagens aparecerem do mesmo tamanho e alinhadas.
 */
async function loadImage(file: string): Promise<MockupImage> {
  const fullPath = path.join(MOCKUPS_DIR, file);
  const [background, { width = 1, height = 1 }, trimmed] = await Promise.all([
    cornerColor(fullPath).catch(() => ""),
    sharp(fullPath).metadata(),
    sharp(fullPath)
      .trim({ threshold: 10 })
      .toBuffer({ resolveWithObject: true })
      .then(({ info }) => info)
      .catch(() => null),
  ]);
  const crop = trimmed
    ? {
        left: -(trimmed.trimOffsetLeft ?? 0) / width,
        top: -(trimmed.trimOffsetTop ?? 0) / height,
        width: trimmed.width / width,
        height: trimmed.height / height,
      }
    : { left: 0, top: 0, width: 1, height: 1 };
  return {
    src: `/mockups/${file}`,
    background,
    aspect: (crop.width * width) / (crop.height * height),
    crop,
  };
}

// Medir cada imagem demora ~0,1 s: guarda-se o resultado até o ficheiro mudar.
const cache = new Map<string, { mtimeMs: number; image: Promise<MockupImage> }>();

async function cachedImage(file: string): Promise<MockupImage> {
  const { mtimeMs } = await stat(path.join(MOCKUPS_DIR, file));
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === mtimeMs) return hit.image;
  const image = loadImage(file);
  cache.set(file, { mtimeMs, image });
  image.catch(() => cache.delete(file));
  return image;
}

/**
 * Mapeia o nome de cada ficheiro em public/mockups (sem extensão, por exemplo
 * "design-1-verde-frente") para a imagem correspondente.
 */
export async function getMockups(): Promise<Record<string, MockupImage>> {
  let files: string[];
  try {
    files = await readdir(MOCKUPS_DIR);
  } catch {
    return {};
  }

  const entries = await Promise.all(
    files
      .filter((file) => EXTENSIONS.includes(path.extname(file).toLowerCase()))
      .map(async (file) => [path.basename(file, path.extname(file)), await cachedImage(file)] as const),
  );
  return Object.fromEntries(entries);
}
