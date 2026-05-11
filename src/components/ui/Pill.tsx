interface PillProps {
  children: React.ReactNode;
  variant?: "solid" | "dashed";
  className?: string;
}

export function Pill({ children, variant = "solid", className = "" }: PillProps) {
  const base = "inline-flex items-center px-3 py-1 text-xs font-medium rounded-full transition-colors duration-200";
  const styles =
    variant === "solid"
      ? "bg-neutral-900 text-white"
      : "border border-dashed border-neutral-400 text-neutral-500";

  return (
    <span className={`${base} ${styles} ${className}`}>
      {children}
    </span>
  );
}