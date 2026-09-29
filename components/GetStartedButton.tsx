"use client";
/**
 * GetStartedButton from ThreeUI (source revision SHA-256 b1dcac0a1e4c), adapted for GSC:
 * - loads the authored scene from /threeui/get-started-button.html (Next has no ?raw import)
 * - transparent background so it sits on the hero gradient
 * - the scene posts "gsc:register" on click; the host carries [data-register], so a click on
 *   the host opens the registration panel through lib/registration.js
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { asset } from "@/lib/asset";

export type GetStartedButtonProps = {
  className?: string;
  style?: CSSProperties;
};

export function GetStartedButton({ className = "", style }: GetStartedButtonProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  // Start visible on both server and client so hydration matches; the effect below corrects it.
  const [documentVisible, setDocumentVisible] = useState(true);
  const [hostVisible, setHostVisible] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setHostVisible(entry?.isIntersecting ?? true);
    }, { rootMargin: "80px" });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const update = () => setDocumentVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  // Only accept the message from our own frame, then hand off to the registration flow.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      if (e.data?.type === "gsc:register") hostRef.current?.click();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const mounted = hostVisible && documentVisible;

  useEffect(() => {
    setReady(false);
  }, [mounted]);

  return (
    <div
      ref={hostRef}
      className={`threeui-background get-started-button${className ? ` ${className}` : ""}`}
      role="group"
      aria-label="Register for the Grand Startup Challenge"
      data-register
      data-state={!mounted ? "paused" : ready ? "ready" : "loading"}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "transparent",
        pointerEvents: "auto",
        ...style,
      }}
    >
      {mounted ? (
        <iframe
          ref={frameRef}
          title="Register"
          // ?v bumps the cache when the scene changes; asset() adds the GitHub Pages base path.
          src={asset("/threeui/get-started-button.html?v=2")}
          sandbox="allow-scripts"
          loading="eager"
          onLoad={() => setReady(true)}
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            width: "100%",
            height: "100%",
            border: 0,
            background: "transparent",
            opacity: ready ? 1 : 0,
            pointerEvents: ready ? "auto" : "none",
            transition: "opacity 240ms ease-out",
          }}
        />
      ) : null}
    </div>
  );
}
