import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * The visible trail. The matching BreadcrumbList JSON-LD is emitted separately
 * by the page, from the same array — docs/03 §3 asks for breadcrumbs everywhere,
 * and building both from one source keeps what a reader sees and what a crawler
 * reads identical.
 */
export function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {trail.map((step, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={step.path} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
              ) : null}
              {isLast ? (
                <span aria-current="page" className="text-ink">
                  {step.name}
                </span>
              ) : (
                <Link href={step.path} className="hover:text-ink hover:underline">
                  {step.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
