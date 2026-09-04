/**
 * Primary navigation — the IA from docs/03 §2.
 *
 * `sprint` records when each destination is actually built. Sprint 0 ships the
 * header against the real IA, so the shape of the site is visible from the
 * start; anything not yet built lands on app/not-found.tsx, which says which
 * sprint it arrives in rather than showing a bare 404.
 */
export type NavItem = {
  href: string;
  label: string;
  /** The sprint that builds this route — docs/05. */
  sprint: number;
};

export const primaryNav: NavItem[] = [
  { href: "/solutions", label: "Solutions", sprint: 2 },
  { href: "/build", label: "Build a system", sprint: 2 },
  { href: "/catalog", label: "Catalogue", sprint: 1 },
  { href: "/price-list", label: "Price list", sprint: 4 },
  { href: "/locations", label: "Coverage", sprint: 4 },
  { href: "/contact", label: "Contact", sprint: 4 },
];

export const footerNav: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Buy",
    items: [
      { href: "/solutions", label: "Packaged solutions", sprint: 2 },
      { href: "/build", label: "Build your own system", sprint: 2 },
      { href: "/catalog", label: "Equipment catalogue", sprint: 1 },
      { href: "/price-list", label: "Full price list", sprint: 4 },
    ],
  },
  {
    heading: "Services",
    items: [
      { href: "/services", label: "All services", sprint: 4 },
      { href: "/services/cctv-installation", label: "CCTV installation", sprint: 4 },
      { href: "/locations", label: "Areas we cover", sprint: 4 },
      { href: "/projects", label: "Completed projects", sprint: 5 },
    ],
  },
  {
    heading: "Company",
    items: [
      { href: "/about", label: "About", sprint: 4 },
      { href: "/contact", label: "Contact", sprint: 4 },
      { href: "/blog", label: "Guides and costs", sprint: 4 },
      { href: "/faq", label: "FAQ", sprint: 4 },
    ],
  },
];
