import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo/origin";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // docs/03: /admin/* is noindex and auth-gated.
      //
      // /quote is one visitor's working state. /q/* carries a customer's name
      // and the area they live in on a link built to be forwarded — both pages
      // also send noindex in their own metadata, and this keeps a crawler from
      // fetching them at all.
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/quote", "/q/"] },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
