import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-neutral-50 border border-neutral-200 rounded-2xl p-6 ${className}`}
    >
      {children}
    </div>
  );
}