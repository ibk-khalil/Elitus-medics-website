interface ECGLineProps {
  className?: string;
  height?: number;
  animated?: boolean;
}

/**
 * ELITUS signature ECG heartbeat line.
 * Used as section dividers, loaders, and progress bars.
 */
export function ECGLine({ className = "", height = 32, animated = true }: ECGLineProps) {
  return (
    <svg
      viewBox="0 0 600 32"
      preserveAspectRatio="none"
      className={`w-full ${animated ? "ecg-animate" : ""} ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ecgGrad" x1="0%" x2="100%">
          <stop offset="0%" stopColor="rgba(201,168,76,0)" />
          <stop offset="20%" stopColor="rgba(201,168,76,0.6)" />
          <stop offset="50%" stopColor="rgba(201,168,76,1)" />
          <stop offset="80%" stopColor="rgba(201,168,76,0.6)" />
          <stop offset="100%" stopColor="rgba(201,168,76,0)" />
        </linearGradient>
      </defs>
      <path
        d="M0 16 L120 16 L140 16 L155 8 L170 24 L185 4 L200 28 L215 16 L320 16 L335 8 L350 24 L365 4 L380 28 L395 16 L600 16"
        fill="none"
        stroke="url(#ecgGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ECGProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-soft)] transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
