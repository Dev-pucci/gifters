import { useRef, type ReactNode } from "react";
import { ChevronIcon } from "./Icons";

interface Props {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
}

/** Horizontal scroll-snap row with arrow controls on wider screens. */
export default function Carousel({ title, eyebrow, action, children }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <section className="container-page py-8 sm:py-10" aria-label={title}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow ? <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-olive">{eyebrow}</p> : null}
          <h2 className="section-title">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <div className="hidden gap-2 sm:flex">
            <button type="button" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white hover:border-olive/50 hover:text-olive">
              <ChevronIcon dir="left" width={18} height={18} />
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white hover:border-olive/50 hover:text-olive">
              <ChevronIcon width={18} height={18} />
            </button>
          </div>
        </div>
      </div>
      <div ref={track} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:-mx-8 lg:scroll-px-8 lg:px-8">
        {children}
      </div>
    </section>
  );
}

export function CarouselItem({ children }: { children: ReactNode }) {
  return <div className="w-[70%] shrink-0 snap-start sm:w-[42%] md:w-[30%] lg:w-[23%]">{children}</div>;
}
