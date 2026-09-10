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
  staticPageGenerationTimeout: 120,

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
