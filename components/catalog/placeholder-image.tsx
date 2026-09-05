import { cn } from "@/lib/utils";
import { categoryIcon } from "@/lib/category-icons";

/**
 * What fills an image slot before the owner has uploaded a photo.
 *
 * docs/04 §Placeholder image strategy: "brand gradient at low opacity, category
 * icon, model number in mono, correct aspect ratio. Never a broken image, never
 * a stock photo of somebody else's install, never a supplier's watermarked
 * packshot." Most items have no photo at launch, so this is what the catalogue
 * mostly looks like — it has to look deliberate rather than missing.
 *
 * The aspect ratio is fixed, so when a real photo arrives it swaps in with no
 * layout shift.
 */
export function PlaceholderImage({
  sku,
  categoryIcon: iconName,
  className,
  ratio = "4/3",
}: {
  sku: string;
  categoryIcon: string | null;
  className?: string;
  ratio?: "4/3" | "16/9" | "1/1";
}) {
  const Icon = categoryIcon(iconName);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-card border border-line bg-paper-warm",
        className,
      )}
      style={{ aspectRatio: ratio }}
    >
      <div className="brand-gradient absolute inset-0 opacity-[0.07]" aria-hidden="true" />
      <Icon className="relative size-8 text-muted-foreground/70" aria-hidden="true" strokeWidth={1.5} />
      <span className="relative px-3 text-center font-mono text-[0.7rem] leading-tight tracking-tight text-muted-foreground">
        {sku}
      </span>
    </div>
  );
}
