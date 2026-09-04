import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo/origin";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // docs/03: /admin/* is noindex and auth-gated.
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
