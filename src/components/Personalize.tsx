import { useId, useState } from "react";
import { api, uploadUrl } from "../api/client";
import type { OptionGroup, PersonalizationField, PhotoField, SwatchField, TextField } from "../data/catalog";

// ---------------------------------------------------------------- option tiles

interface OptionPickerProps {
  group: OptionGroup;
  value: string | undefined;
  onChange: (valueId: string) => void;
  /** Value ids that would produce an out-of-stock variant given the other selections. */
  unavailable: Set<string>;
  showError: boolean;
}

export function OptionPicker({ group, value, onChange, unavailable, showError }: OptionPickerProps) {
  const selected = group.values.find((v) => v.id === value);
  const errId = useId();
  return (
    <fieldset aria-describedby={showError && !value ? errId : undefined}>
      <legend className="mb-2 text-sm font-medium">
        {group.label}: <span className="font-semibold">{selected?.label ?? <span className="font-normal text-ink-soft">Choose one</span>}</span>
      </legend>
      <div className={`flex flex-wrap gap-2 rounded-md ${showError && !value ? "ring-2 ring-brand ring-offset-4 ring-offset-white" : ""}`}>
        {group.values.map((v) => {
          const out = unavailable.has(v.id);
          const on = v.id === value;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={on}
              disabled={out}
              onClick={() => onChange(v.id)}
              title={out ? `${v.label} — out of stock` : v.label}
              className={`relative flex min-h-11 items-center gap-2 rounded-md border px-3.5 py-2 text-sm transition ${
                on ? "border-olive bg-olive text-white" : "border-line bg-white hover:border-olive/50"
              } ${out ? "cursor-not-allowed text-ink-soft/60 line-through" : ""}`}
            >
              {v.swatch ? <span className="h-5 w-5 shrink-0 rounded-full border border-black/15" style={{ background: v.swatch }} aria-hidden /> : null}
              {v.label}
            </button>
          );
        })}
      </div>
      {showError && !value ? (
        <p id={errId} className="mt-2 text-sm font-medium text-brand">
          Please make a selection.
        </p>
      ) : null}
    </fieldset>
  );
}

// ---------------------------------------------------------------- personalization fields

interface FieldProps<F> {
  field: F;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
}

function TextInput({ field, value, onChange, error }: FieldProps<TextField>) {
  const inputId = useId();
  const left = field.max - value.length;
  if (field.ui === "letters") {
    return (
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">
          {field.label}
          {field.required ? " *" : ""}
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={value === l}
              onClick={() => onChange(value === l ? "" : l)}
              className={`h-9 w-9 rounded-lg border text-sm font-semibold transition ${value === l ? "border-olive bg-olive text-white" : "border-line bg-white hover:border-olive/50"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {error ? <p className="mt-1.5 text-sm text-brand">{error}</p> : null}
      </fieldset>
    );
  }
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 flex justify-between gap-4 text-sm font-medium">
        <span>
          {field.label}
          {field.required ? " *" : <span className="font-normal text-ink-soft"> (optional)</span>}
        </span>
        <span className={`font-normal ${left <= 3 ? "text-brand" : "text-ink-soft"}`}>{value ? `${left} characters left` : `${field.max} characters max`}</span>
      </label>
      <input
        id={inputId}
        value={value}
        maxLength={field.max}
        autoComplete="off"
        spellCheck={false}
        placeholder={field.placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-err` : undefined}
        onChange={(e) => onChange(field.textCase === "upper" ? e.target.value.toUpperCase() : e.target.value)}
        className={`h-11 w-full rounded-md border px-4 focus:outline-none ${error ? "border-brand" : "border-line focus:border-olive"}`}
      />
      {field.suggestions?.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-ink-soft">Try:</span>
          {field.suggestions.slice(0, 5).map((s) => (
            <button key={s} type="button" onClick={() => onChange(s.slice(0, field.max))} className="rounded-full border border-line bg-cream px-2.5 py-1 hover:border-olive/50">
              {s}
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p id={`${inputId}-err`} className="mt-1.5 text-sm text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SwatchInput({ field, value, onChange, error }: FieldProps<SwatchField>) {
  const selected = field.options.find((o) => o.id === value);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">
        {field.label} * <span className="font-normal text-ink-soft">{selected ? `— ${selected.label}` : ""}</span>
      </legend>
      <div role="radiogroup" className="flex flex-wrap gap-2.5">
        {field.options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.label}
              title={o.label}
              onClick={() => onChange(o.id)}
              className={`grid h-11 w-11 place-items-center rounded-full transition ${on ? "ring-2 ring-olive ring-offset-2" : "ring-1 ring-line hover:ring-olive/50"}`}
            >
              <span className="h-9 w-9 overflow-hidden rounded-full border border-black/10" style={{ background: `linear-gradient(135deg, ${o.colors[0]} 50%, ${o.colors[1]} 50%)` }} />
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-1.5 text-sm text-brand">{error}</p> : null}
    </fieldset>
  );
}

function PhotoInput({ field, value, onChange, error, onPreview }: FieldProps<PhotoField> & { onPreview: (url: string | undefined) => void }) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
        {field.label}
        {field.required ? " *" : ""} <span className="font-normal text-ink-soft">JPG, PNG or WebP, up to 10 MB</span>
      </label>
      <div className="flex items-center gap-3">
        {value ? <img src={uploadUrl(value)} alt="Your uploaded photo" className="h-14 w-14 rounded-lg object-cover ring-1 ring-line" /> : null}
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setUploadError(null);
            if (f.size > 10 * 1024 * 1024) return setUploadError("That photo is larger than 10 MB.");
            const local = URL.createObjectURL(f);
            onPreview(local);
            setBusy(true);
            try {
              const { id } = await api.uploadPhoto(f);
              onChange(id);
            } catch (err) {
              onPreview(undefined);
              onChange("");
              setUploadError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-sage-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-olive hover:file:bg-olive hover:file:text-white"
        />
      </div>
      {busy ? <p className="mt-1.5 text-sm text-ink-soft">Uploading…</p> : null}
      {uploadError || error ? <p className="mt-1.5 text-sm text-brand">{uploadError ?? error}</p> : null}
    </div>
  );
}

export function FieldInput(props: FieldProps<PersonalizationField> & { onPreview: (url: string | undefined) => void }) {
  const { field, onPreview, ...rest } = props;
  if (field.type === "text") return <TextInput field={field} {...rest} />;
  if (field.type === "swatch") return <SwatchInput field={field} {...rest} />;
  return <PhotoInput field={field} onPreview={onPreview} {...rest} />;
}
