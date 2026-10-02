import Image from "next/image";
import type { MockupImage } from "@/lib/mockup-view";

type MockupImagesProps = {
  /** Uma imagem (frente ou costas) ou duas lado a lado (ambos). */
  images: (MockupImage & { alt: string })[];
  /** Atributo `sizes` de cada imagem. */
  sizes: string;
  preload?: boolean;
};

/**
 * Mostra as imagens lado a lado, cada uma recortada à área da sweat (sem a margem do
 * ficheiro) e encaixada no seu espaço como object-fit: contain. Assim todas ficam do
 * mesmo tamanho e alinhadas, mesmo que os ficheiros tenham margens diferentes.
 */
export default function MockupImages({ images, sizes, preload = false }: MockupImagesProps) {
  return (
    <div className="flex h-full w-full items-center justify-center gap-[4%]">
      {images.map((image) => (
        // Cada espaço é um container: 100cqw/100cqh são a sua largura e altura.
        <div key={image.src} className="flex h-full min-w-0 flex-1 items-center justify-center [container-type:size]">
          <div
            className="relative overflow-hidden"
            style={{ aspectRatio: image.aspect, width: `min(100cqw, calc(100cqh * ${image.aspect}))` }}
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
        </div>
      ))}
    </div>
  );
}
