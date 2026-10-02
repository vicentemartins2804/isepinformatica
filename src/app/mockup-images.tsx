import Image from "next/image";
import type { MockupImage } from "@/lib/mockup-view";

/** Espaço entre a frente e as costas, em frações da altura das imagens. */
const GAP = 0.08;

/** Proporção (largura / altura) da fila de imagens, com o espaço entre elas. */
export function rowAspect(images: Pick<MockupImage, "aspect">[]): number {
  return images.reduce((sum, image) => sum + image.aspect, 0) + GAP * Math.max(images.length - 1, 0);
}

type MockupImagesProps = {
  /** Uma imagem (frente ou costas) ou duas lado a lado (ambos). */
  images: (MockupImage & { alt: string })[];
  /** Proporção (largura / altura) da caixa onde as imagens são encaixadas. */
  containerAspect: number;
  /** Atributo `sizes` de cada imagem. */
  sizes: string;
  preload?: boolean;
};

/**
 * Mostra as imagens lado a lado, cada uma recortada à área da sweat (sem a margem do
 * ficheiro), e encaixa a fila na caixa como object-fit: contain. Tudo é posicionado em
 * percentagens calculadas aqui (sem container queries nem aspect-ratio), para ficar igual
 * em todos os browsers, incluindo Safari antigos. Tem de estar dentro de um elemento
 * posicionado com a proporção `containerAspect`.
 */
export default function MockupImages({ images, containerAspect, sizes, preload = false }: MockupImagesProps) {
  const row = rowAspect(images);
  // Fila mais larga do que a caixa: ocupa a largura toda; senão, a altura toda.
  const rowWidth = row > containerAspect ? 100 : (row / containerAspect) * 100;
  const rowHeight = row > containerAspect ? (containerAspect / row) * 100 : 100;

  // Posição horizontal de cada imagem na fila: a soma das larguras e espaços anteriores.
  const lefts = images.map((_, i) =>
    images.slice(0, i).reduce((sum, previous) => sum + previous.aspect + GAP, 0),
  );
  return (
    <div
      className="absolute"
      style={{
        left: `${(100 - rowWidth) / 2}%`,
        top: `${(100 - rowHeight) / 2}%`,
        width: `${rowWidth}%`,
        height: `${rowHeight}%`,
      }}
    >
      {images.map((image, i) => {
        return (
          <div
            key={image.src}
            className="absolute top-0 h-full overflow-hidden"
            style={{ left: `${(lefts[i] / row) * 100}%`, width: `${(image.aspect / row) * 100}%` }}
          >
            <div
              className="absolute"
              style={{
                left: `${(-image.crop.left / image.crop.width) * 100}%`,
                top: `${(-image.crop.top / image.crop.height) * 100}%`,
                width: `${100 / image.crop.width}%`,
                height: `${100 / image.crop.height}%`,
              }}
            >
              <Image src={image.src} alt={image.alt} fill preload={preload} sizes={sizes} className="object-fill" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
