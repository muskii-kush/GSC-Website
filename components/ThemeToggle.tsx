"use client";
import { useEffect, useState } from "react";

/**
 * Light / dark switch for the team to compare themes. It only appears in a browser
 * that has opened the site once with ?theme=light (or ?theme=dark); visitors never see it.
 * The choice is remembered there. The theme is applied before paint by app/layout.tsx.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [review, setReview] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    setReview(document.documentElement.dataset.themeReview === "1");
  }, []);

  const flip = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("gsc-theme", next); } catch { /* storage blocked */ }
    setTheme(next);
  };

  if (!review) return null;
  return (
    <button type="button" className="theme-toggle" onClick={flip} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
      <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
      {theme === "light" ? "Dark theme" : "Light theme"}
    </button>
  );
}
