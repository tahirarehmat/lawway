"use client";

import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Accent palette for dashboard charts / stat cards (dark-surface friendly). */
export const ACCENTS = {
  gold: { base: "#f5b73c", soft: "rgba(245, 183, 60, 0.28)" },
  emerald: { base: "#34d399", soft: "rgba(52, 211, 153, 0.26)" },
  violet: { base: "#a78bfa", soft: "rgba(167, 139, 250, 0.26)" },
  sky: { base: "#38bdf8", soft: "rgba(56, 189, 248, 0.26)" },
  amber: { base: "#fbbf24", soft: "rgba(251, 191, 36, 0.26)" },
  rose: { base: "#fb7185", soft: "rgba(251, 113, 133, 0.26)" },
} as const;

export type AccentKey = keyof typeof ACCENTS;

type IconType = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export type ChartDatum = {
  label: string;
  value: number;
  color: string;
};

/* ---------------------------------- StatCard --------------------------------- */

type StatCardProps = {
  label: string;
  value: string;
  icon: IconType;
  accent: AccentKey;
  hint?: string;
};

export function StatCard({ label, value, icon: Icon, accent, hint }: StatCardProps) {
  const { base, soft } = ACCENTS[accent];
  return (
    <div
      className="stat-card"
      style={{ "--accent": base, "--accent-soft": soft } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="stat-icon">
          <Icon className="size-7" aria-hidden />
        </span>
        {hint ? (
          <span className="text-[10px] font-medium tracking-wide text-[color:var(--home-text-subtle)]">
            {hint}
          </span>
        ) : null}
      </div>
      <p className="home-stat-value mt-3">{value}</p>
      <p className="mt-1 truncate text-[11px] font-medium tracking-wide text-[color:var(--home-text-muted)] uppercase">
        {label}
      </p>
    </div>
  );
}

/* --------------------------------- DonutChart -------------------------------- */

type DonutChartProps = {
  data: ChartDatum[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
  className?: string;
};

export function DonutChart({
  data,
  size = 168,
  thickness = 20,
  centerValue,
  centerLabel,
  className,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;

  return (
    <div className={cn("flex items-center gap-5", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Distribution chart"
        className="shrink-0"
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(246,239,228,0.08)"
            strokeWidth={thickness}
          />
          {total > 0 &&
            data.map((d, i) => {
              if (d.value <= 0) return null;
              const fraction = d.value / total;
              const dash = fraction * circumference;
              const offset = -accumulated;
              accumulated += dash;
              return (
                <circle
                  key={i}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              );
            })}
        </g>
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--home-text)"
          fontSize="1.6rem"
          fontWeight={700}
        >
          {centerValue ?? total}
        </text>
        {centerLabel ? (
          <text
            x={center}
            y={center + 18}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--home-text-muted)"
            fontSize="0.7rem"
            style={{ letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            {centerLabel}
          </text>
        ) : null}
      </svg>

      <ul className="min-w-0 flex-1 space-y-2.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2.5 text-sm">
            <span className="legend-dot" style={{ "--dot": d.color } as CSSProperties} />
            <span className="min-w-0 flex-1 truncate text-[color:var(--home-text-muted)]">
              {d.label}
            </span>
            <span className="font-semibold text-[color:var(--home-text)]">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------- BarList ---------------------------------- */

type BarListProps = {
  data: ChartDatum[];
  className?: string;
};

export function BarList({ data, className }: BarListProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("space-y-4", className)}>
      {data.map((d) => {
        const pct = Math.max((d.value / max) * 100, d.value > 0 ? 6 : 0);
        return (
          <div key={d.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="truncate text-[color:var(--home-text-muted)]">{d.label}</span>
              <span className="font-semibold text-[color:var(--home-text)]">{d.value}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[rgba(246,239,228,0.08)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${d.color}, ${d.color}cc)`,
                  boxShadow: `0 0 12px -2px ${d.color}`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------- Sparkline --------------------------------- */

type SparklineProps = {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
};

export function Sparkline({
  points,
  color = ACCENTS.gold.base,
  width = 240,
  height = 56,
  className,
}: SparklineProps) {
  const gradientId = useId();
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;
  const pad = 3;

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = pad + (height - pad * 2) * (1 - (p - min) / range);
    return [x, y] as const;
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend chart"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.length > 0 ? (
        <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r={2.8} fill={color} />
      ) : null}
    </svg>
  );
}
