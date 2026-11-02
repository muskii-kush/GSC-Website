"use client";
import { useEffect, useState } from "react";

/**
 * Light / dark switch shown to every visitor. The site is dark by default; the choice
 * is remembered in this browser. The theme is applied before paint by app/layout.tsx.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const flip = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("gsc-theme", next); } catch { /* storage blocked */ }
    setTheme(next);
  };

  return (
    <button type="button" className="theme-toggle" onClick={flip} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
      <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
      {theme === "light" ? "Dark theme" : "Light theme"}
    </button>
  );
}
