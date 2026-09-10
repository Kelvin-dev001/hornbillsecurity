"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Admin navigation.
 *
 * A client component only to mark the current section. docs/05 Sprint 4:
 * "Works on a laptop first; usable on a phone" — so it scrolls sideways on a
 * narrow screen rather than collapsing into a menu the owner has to open every
 * time he wants the next tab.
 */
const SECTIONS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/items", label: "Items" },
  { href: "/admin/prices", label: "Price review" },
  { href: "/admin/posts", label: "Articles" },
  { href: "/admin/projects", label: "Case studies" },
  { href: "/admin/locations", label: "Areas" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/faqs", label: "FAQs" },
  { href: "/admin/solutions", label: "Packages" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/rules", label: "Quantity rules" },
  { href: "/admin/media", label: "Images" },
  { href: "/admin/settings", label: "Business details" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="border-t border-line">
      <ul className="mx-auto flex max-w-(--container-page) gap-1 overflow-x-auto px-4 sm:px-6">
        {SECTIONS.map((section) => {
          const active = section.exact
            ? pathname === section.href
            : pathname.startsWith(section.href);

          return (
            <li key={section.href} className="shrink-0">
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center border-b-2 px-3 text-sm transition-colors",
                  active
                    ? "border-brand-orange font-semibold text-ink"
                    : "border-transparent text-muted-foreground hover:text-ink",
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
