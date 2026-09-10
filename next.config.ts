import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The default is 60 seconds per prerendered page.
   *
   * Every page here reads from Supabase, and opening the first connection from
   * a cold build worker takes a second or two — occasionally longer. The renders
   * themselves take milliseconds once the data is cached, so this is headroom
   * for a slow connection rather than for slow work.
   */
  // Raised from 120. The site is now 198 routes and every one of them reads from
  // a single Supabase instance on a cold build (scripts/clear-read-cache.mjs
  // clears the read cache deliberately, so that is by design). A page that is
  // simply waiting behind other pages' queries is not a page that is broken, and
  // 120 seconds was killing /projects — a page whose own queries are trivial —
  // purely because it was unlucky in the queue.
  staticPageGenerationTimeout: 240,

  /**
   * How many worker processes prerender at once.
   *
   * Pinned rather than left to the core count, because the connection budget has
   * to be arithmetic somebody can check: the Supabase **session** pooler — which
   * db/index.ts uses for builds, see the comment there for why — is capped at
   * `pool_size: 15` for the whole project, and every worker holds its own pool.
   *
   * 2 workers × `max: 3` = 6 connections, comfortably inside the cap with room
   * for the seed or a psql session running alongside. Left to the machine, a
   * 12-core box spawns enough workers to blow through 15 and the losers fail
   * with `(EMAXCONNSESSION) max clients reached in session mode`, which is how
   * three builds in a row died here.
   *
   * It makes the build slower. A slow build that is correct beats a fast one
   * that intermittently prerenders a page with another query's data in it.
   */
  experimental: {
    cpus: 2,
  },

  /**
   * The CCTV service line's page is hand-written at /services/cctv-installation
   * because it carries the packages and the builder, while every other line
   * renders from /services/[slug] keyed on the category slug — which for CCTV is
   * `cctv`. So /services/cctv is a plausible URL with nothing behind it, and a
   * permanent redirect is better than a 404 on a guessable path.
   */
  async redirects() {
    return [
      { source: "/services/cctv", destination: "/services/cctv-installation", permanent: true },
      // docs/03 §2 lists /tools/cctv-cost-calculator, and §4 notes that "cctv
      // installation cost calculator" is a verified Kenyan query with no Kenyan
      // answer. The calculator itself is /build/cctv, so the URL exists and
      // points at it — a second page saying the same thing would put two of our
      // own pages in front of one query and split the ranking signal.
      { source: "/tools/cctv-cost-calculator", destination: "/build/cctv", permanent: true },
    ];
  },

  images: {
    /**
     * Photographs uploaded through the admin live in Supabase Storage, so
     * next/image has to be told that host is allowed to serve them. Narrowed to
     * the media bucket's path rather than the whole project.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/media/**",
      },
    ],
  },
};

export default nextConfig;
