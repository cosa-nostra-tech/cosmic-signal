"use client";

import { useState, useRef } from "react";

interface ThematicCardProps {
  heading: string;
  description: string;
  imageUrl: string;
  onExpand: () => void;
  isExpanded: boolean;
}

// Curated Unsplash photos for thematic domains
const CARD_IMAGES: Record<string, string> = {
  // Economic / trade / finance
  economic: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  trade: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  corridor: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  financial: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80",
  plumbing: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80",
  payment: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80",
  settlement: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80",
  dollar: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  currency: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  bloc: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  regional: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  sovereign: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  sovereignty: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  // Military / defense / conflict
  military: "https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=600&q=80",
  defense: "https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=600&q=80",
  conflict: "https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=600&q=80",
  war: "https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=600&q=80",
  border: "https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=600&q=80",
  security: "https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=600&q=80",
  geopolitical: "https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=600&q=80",
  // Resource / mining / commodities
  resource: "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?w=600&q=80",
  commodity: "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?w=600&q=80",
  mineral: "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?w=600&q=80",
  mining: "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?w=600&q=80",
  supply: "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?w=600&q=80",
  material: "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?w=600&q=80",
  // Energy / nuclear
  energy: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80",
  nuclear: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80",
  power: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80",
  uranium: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80",
  // Technology / data / AI
  technology: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  tech: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  data: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  ai: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  semiconductor: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  chip: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  digital: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  cyber: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  // Infrastructure / logistics
  infrastructure: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&q=80",
  logistics: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&q=80",
  transport: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&q=80",
  shipping: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&q=80",
};

// Fallback images — rotated based on index so cards don't all look the same
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  "https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=600&q=80",
  "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?w=600&q=80",
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80",
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&q=80",
];

function getImageForHeading(heading: string, fallbackIndex: number): string {
  const lower = heading.toLowerCase();
  // Check multi-word substrings first (longer = more specific)
  const sortedKeywords = Object.keys(CARD_IMAGES).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeywords) {
    if (lower.includes(keyword)) return CARD_IMAGES[keyword];
  }
  return FALLBACK_IMAGES[fallbackIndex % FALLBACK_IMAGES.length];
}

export function ThematicCard({
  heading,
  description,
  imageUrl,
  onExpand,
  isExpanded,
  cardIndex = 0,
}: ThematicCardProps & { cardIndex?: number }) {
  const resolvedImage = getImageForHeading(heading, cardIndex);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 ease-out ${
        isExpanded
          ? "fixed inset-0 z-50 rounded-none"
          : "h-[340px] hover:shadow-lg"
      }`}
      onClick={!isExpanded ? onExpand : undefined}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        {!imgError && (
          <img
            src={resolvedImage}
            alt={heading}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        {/* Fallback gradient if image fails */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-neutral-700 via-neutral-800 to-neutral-900 ${
            imgLoaded && !imgError ? "opacity-0" : "opacity-100"
          } transition-opacity duration-500`}
        />
        {/* Dark overlay on top of image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
      </div>

      {/* Content */}
      <div
        className={`relative h-full flex flex-col justify-end p-6 transition-all duration-500 ${
          isExpanded ? "max-w-3xl mx-auto" : ""
        }`}
      >
        <div className="flex-1" />
        <div>
          <h3 className="text-white text-xl font-semibold mb-2 leading-tight">
            {heading}
          </h3>
          <p className="text-white/70 text-sm leading-relaxed mb-4 line-clamp-3">
            {description}
          </p>
        </div>
        <div>
          <span
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
              isExpanded
                ? "bg-white/20 text-white backdrop-blur-sm"
                : "bg-white/10 text-white/80 group-hover:bg-white group-hover:text-neutral-900"
            }`}
          >
            {isExpanded ? "← Back" : "Expand"}
          </span>
        </div>
      </div>
    </div>
  );
}
