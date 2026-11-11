import type { ReactNode } from "react";

/** Line icon in a soft sage circle — used for empty states and status panels instead of emoji. */
export default function IconBadge({ children, size = "md", className = "" }: { children: ReactNode; size?: "sm" | "md" | "lg"; className?: string }) {
  const s = size === "lg" ? "h-20 w-20 [&_svg]:h-9 [&_svg]:w-9" : size === "sm" ? "h-11 w-11 [&_svg]:h-5 [&_svg]:w-5" : "h-16 w-16 [&_svg]:h-7 [&_svg]:w-7";
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-sage-soft text-olive ${s} ${className}`}>
      {children}
    </span>
  );
}
