/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  experimental: {
    // Keep the database drivers out of the server bundle.
    serverComponentsExternalPackages: ["pg", "@electric-sql/pglite"],
  },
};
export default nextConfig;
