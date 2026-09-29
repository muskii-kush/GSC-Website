// Prefix for files in /public. Empty normally; "/GSC-Website" on the GitHub Pages build.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const asset = (path: string) => `${BASE_PATH}${path}`;

// True on the GitHub Pages build, which has no server (no registration backend).
export const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_SITE === "true";
