"use client";

import { useEffect, useRef, useState } from "react";

interface CinematicBackgroundProps {
  opacity?: number;
}

export function CinematicBackground({ opacity = 0.3 }: CinematicBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener("canplaythrough", () => {
      setLoaded(true);
      video.play().catch(() => {
        // Autoplay blocked, that's fine
      });
    });

    video.addEventListener("error", () => {
      // Video failed to load, CSS fallback will show
      setLoaded(false);
    });
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* CSS animated gradient fallback (always visible, video overlays on top) */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 animate-gradient" />

      {/* Video layer */}
      <video
        ref={videoRef}
        src="/videos/background.mp4"
        loop
        muted
        playsInline
        preload="auto"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${loaded ? "opacity-100" : "opacity-0"}`}
      />

      {/* Black overlay at configured opacity */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity }}
      />
    </div>
  );
}
