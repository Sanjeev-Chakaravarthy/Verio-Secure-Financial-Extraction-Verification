"use client";

interface BrandProps {
  theme?: "light" | "dark";
  className?: string;
}

export default function Brand({ theme = "dark", className = "" }: BrandProps) {
  const isDark = theme === "dark";
  return (
    <span
      className={`font-serif tracking-tighter text-[48px] leading-[1.1] select-none ${
        isDark ? "text-white" : "text-primary"
      } ${className}`}
    >
      Verio
    </span>
  );
}
