import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
} as const;

type LogoProps = {
  className?: string;
  imgClassName?: string;
  size?: keyof typeof SIZES;
  showWordmark?: boolean;
  wordmark?: ReactNode;
  wordmarkClassName?: string;
};

export function Logo({
  className,
  imgClassName,
  size = "sm",
  showWordmark = true,
  wordmark,
  wordmarkClassName,
}: LogoProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <img
        src="/logo.png"
        alt="The Elitus Medics 25"
        width={64}
        height={64}
        className={cn(SIZES[size], "shrink-0 object-contain", imgClassName)}
      />
      {showWordmark && (
        <span className={cn("font-display truncate text-sm tracking-tight", wordmarkClassName)}>
          {wordmark ?? (
            <>
              ELITUS <span className="text-gold">MEDICS</span> U25
            </>
          )}
        </span>
      )}
    </div>
  );
}
