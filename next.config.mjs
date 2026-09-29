// STATIC_EXPORT=true builds a plain static site for GitHub Pages (see
// .github/workflows/pages.yml). That build has no API routes, so registration
// shows an "opening soon" panel. The normal build runs the full app.
const staticExport = process.env.STATIC_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  ...(staticExport ? { output: "export", basePath, trailingSlash: true } : {}),
  experimental: {
    // Keep the database drivers out of the server bundle.
    serverComponentsExternalPackages: ["pg", "@electric-sql/pglite"],
  },
};
export default nextConfig;
