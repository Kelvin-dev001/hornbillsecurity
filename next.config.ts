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
};

export default nextConfig;
