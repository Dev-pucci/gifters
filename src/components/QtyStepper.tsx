import { MinusIcon, PlusIcon } from "./Icons";

export default function QtyStepper({ qty, onChange, label }: { qty: number; onChange: (q: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded-[4px] border border-line bg-white">
      <button type="button" aria-label={qty === 1 ? `Remove ${label}` : `Decrease quantity of ${label}`} onClick={() => onChange(qty - 1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-cream">
        <MinusIcon width={14} height={14} />
      </button>
      <span className="w-7 text-center text-sm font-semibold" aria-live="polite">
        {qty}
      </span>
      <button type="button" aria-label={`Increase quantity of ${label}`} onClick={() => onChange(qty + 1)} disabled={qty >= 99} className="grid h-9 w-9 place-items-center rounded-full hover:bg-cream disabled:opacity-40">
        <PlusIcon width={14} height={14} />
      </button>
    </div>
  );
}
