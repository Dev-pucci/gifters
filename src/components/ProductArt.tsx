import type { Product } from "../data/catalog";

interface Props {
  art: Product["art"];
  /** Generated photo for this slot; when missing, the gradient illustration is shown instead. */
  image?: string;
  label?: string;
  /** Personalization preview drawn over the picture. */
  overlay?: string;
  /** Text color for the overlay (e.g. the chosen thread color). */
  overlayColor?: string;
  /** The shopper's own uploaded photo (photo-personalized products). */
  photoUrl?: string;
  size?: "sm" | "md" | "lg";
  /** Load immediately (above-the-fold images). */
  eager?: boolean;
  className?: string;
}

/** Product / category picture: a generated photo when available, else a gradient illustration. */
export default function ProductArt({ art, image, label, overlay, overlayColor, photoUrl, size = "md", eager, className = "" }: Props) {
  const emoji = size === "lg" ? "text-8xl sm:text-9xl" : size === "sm" ? "text-3xl" : "text-6xl";
  const sizes = size === "sm" ? "120px" : size === "lg" ? "(min-width: 1024px) 600px, 100vw" : "(min-width: 1024px) 300px, 50vw";
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative flex aspect-square w-full items-center justify-center overflow-hidden ${className}`}
      style={{ background: `radial-gradient(circle at 30% 25%, ${art.from}, ${art.to})` }}
    >
      {image ? (
        <img src={image} alt="" sizes={sizes} loading={eager ? "eager" : "lazy"} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      {photoUrl ? (
        <img src={photoUrl} alt="" className="absolute inset-[14%] h-[72%] w-[72%] rounded-xl object-cover shadow-lg ring-4 ring-white" />
      ) : !image ? (
        <span className={`${emoji} drop-shadow-sm select-none`} aria-hidden>
          {art.emoji}
        </span>
      ) : null}
      {overlay ? (
        <span
          className="absolute bottom-[10%] left-1/2 max-w-[86%] -translate-x-1/2 truncate rounded-full bg-white/90 px-4 py-1.5 font-display text-lg font-semibold text-ink shadow-sm sm:text-xl"
          style={overlayColor && overlayColor.toLowerCase() !== "#ffffff" ? { color: overlayColor } : undefined}
        >
          {overlay}
        </span>
      ) : null}
    </div>
  );
}
