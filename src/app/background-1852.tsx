/** Fundo decorativo: um "1852" gigante, centrado, só com contorno. */
export default function Background1852() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 flex select-none items-center justify-center overflow-hidden"
    >
      <span className="text-[38vw] font-extrabold italic leading-none tracking-tighter text-transparent [-webkit-text-stroke:2px_rgb(94_129_172_/_0.18)]">
        1852
      </span>
    </div>
  );
}
