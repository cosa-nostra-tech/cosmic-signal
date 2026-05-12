"use client";

import { useState, useRef } from "react";

interface ThematicCardProps {
  heading: string;
  description: string;
  imageUrl: string;
  onExpand: () => void;
  isExpanded: boolean;
}

const CARD_IMAGES: Record<string, string> = {
  economic: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  military: "https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=600&q=80",
  resource: "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?w=600&q=80",
  technology: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  tech: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  defense: "https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=600&q=80",
  energy: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80",
  nuclear: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80",
  sovereign: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  sovereignty: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  supply: "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?w=600&q=80",
  ai: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  dollar: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  currency: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  conflict: "https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=600&q=80",
  geopolitical: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80",
  mineral: "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?w=600&q=80",
  mining: "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?w=600&q=80",
  data: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  semiconductor: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  chip: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
};

function getImageForHeading(heading: string, fallbackUrl: string): string {
  const lower = heading.toLowerCase();
  for (const [keyword, url] of Object.entries(CARD_IMAGES)) {
    if (lower.includes(keyword)) return url;
  }
  return fallbackUrl;
}

export function ThematicCard({
  heading,
  description,
  imageUrl,
  onExpand,
  isExpanded,
}: ThematicCardProps) {
  const resolvedImage = getImageForHeading(heading, imageUrl);
  const [imgLoaded, setImgLoaded] = useState(false);

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
        <img
          src={resolvedImage}
          alt={heading}
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            imgLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Dark overlay */}
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
