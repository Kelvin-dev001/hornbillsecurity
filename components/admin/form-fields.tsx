import { cn } from "@/lib/utils";

/**
 * The admin form vocabulary.
 *
 * Plain server components over native inputs. The admin is forms and tables and
 * almost nothing else, and every one of these submits inside a <form action={…}>
 * server action — so the portal works with JavaScript off, which on a Kenyan
 * mobile connection is a real state and not a hypothetical one.
 */

export const inputClass =
  "h-11 w-full rounded-control border border-line bg-paper px-3 text-base text-ink " +
  "placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 " +
  "focus-visible:ring-ring/50 focus-visible:outline-none disabled:bg-paper-warm " +
  "disabled:text-muted-foreground";

export function Field({
  label,
  name,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  name: string;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TextInput({
  name,
  defaultValue,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  return (
    <input id={name} name={name} defaultValue={defaultValue} className={inputClass} {...rest} />
  );
}

export function NumberInput({
  name,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  return (
    <input
      id={name}
      name={name}
      type="number"
      inputMode="numeric"
      className={cn(inputClass, "tabular-nums")}
      {...rest}
    />
  );
}

export function TextArea({
  name,
  rows = 4,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { name: string }) {
  return (
    <textarea
      id={name}
      name={name}
      rows={rows}
      className={cn(inputClass, "h-auto py-2 leading-relaxed")}
      {...rest}
    />
  );
}

export function Select({
  name,
  options,
  defaultValue,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  name: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select id={name} name={name} defaultValue={defaultValue} className={inputClass} {...rest}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({
  name,
  label,
  defaultChecked,
  hint,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex gap-3">
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 size-4 shrink-0 accent-[var(--brand-orange)]"
      />
      <div>
        <label htmlFor={name} className="text-sm font-medium text-ink">
          {label}
        </label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

/** A short list of text values edited as one line each, joined on save. */
export function LinesInput({
  name,
  values,
  rows = 4,
  placeholder,
}: {
  name: string;
  values: string[];
  rows?: number;
  placeholder?: string;
}) {
  return <TextArea name={name} rows={rows} defaultValue={values.join("\n")} placeholder={placeholder} />;
}

export function FormMessage({ status }: { status?: string }) {
  if (!status) return null;

  const saved = status === "saved";
  return (
    <p
      role="status"
      className={cn(
        "rounded-control border px-3 py-2 text-sm",
        saved
          ? "border-success/30 bg-success/5 text-success"
          : "border-danger/30 bg-danger/5 text-danger",
      )}
    >
      {saved ? "Saved. The public site is updating now." : status}
    </p>
  );
}

export function AdminHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border border-line bg-paper p-5", className)}>
      {title ? (
        <div className="mb-4">
          <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
