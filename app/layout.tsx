import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
// IBM Plex is bundled (not fetched from Google Fonts at build time) so builds
// don't fail when fonts.googleapis.com is unreachable.
import "@fontsource/ibm-plex-sans/latin-300.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./globals.css";
import "./theme-light.css";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Grand Startup Challenge — Build what moves India forward",
  description:
    "A four-month startup challenge for early-stage teams building across lending and fintech, mobility and road safety, logistics and supply chain, and sovereign AI.",
};

export const viewport: Viewport = { themeColor: "#0B0826" }; // matches the ink-violet page colour

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        {/* Dark by default. A saved choice from the theme switch (or ?theme=light / ?theme=dark) is applied before first paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var q=new URLSearchParams(location.search).get("theme");if(q==="light"||q==="dark")localStorage.setItem("gsc-theme",q);var t=localStorage.getItem("gsc-theme");if(t==="light")document.documentElement.dataset.theme="light";}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
