// The Cloudflare release combines this static export with its compiled Pages
// Functions. Next.js development proxies those same API routes to local Wrangler.
const staticExport = process.env.STATIC_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const localApiOrigin = process.env.GSC_LOCAL_API_ORIGIN || "http://127.0.0.1:8788";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  ...(staticExport ? { output: "export", basePath, trailingSlash: true } : {}),
  ...(process.env.NODE_ENV === "development" && !staticExport ? {
    async rewrites() {
      return { beforeFiles: ["/api/apply", "/api/deck/:path*", "/api/admin/:path*", "/api/auth/verify", "/api/auth/logout", "/api/application", "/api/application/:path*"].map((source) => ({ source, destination: `${localApiOrigin}${source}` })) };
    },
  } : {}),
  experimental: {
    // Keep the database drivers out of the server bundle.
    serverComponentsExternalPackages: ["pg", "@electric-sql/pglite"],
  },
};
export default nextConfig;
