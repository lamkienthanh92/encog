// Small chart helpers: linear scales, nice ticks, deterministic jitter.

export type Scale = (v: number) => number;

export function linear(d0: number, d1: number, r0: number, r1: number): Scale {
  const k = (r1 - r0) / (d1 - d0 || 1);
  return (v: number) => r0 + (v - d0) * k;
}

/** Tick values 0..niceMax for counts, with at most ~5 intervals. */
export function countTicks(max: number): number[] {
  const m = Math.max(1, max);
  const raw = m / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((s) => s * pow).find((s) => s >= raw) ?? pow * 10;
  const stepInt = Math.max(1, Math.round(step));
  const top = Math.ceil(m / stepInt) * stepInt;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += stepInt) ticks.push(v);
  return ticks;
}

export const SCORE_TICKS: readonly number[] = [40, 55, 70, 85, 100, 115, 130, 145, 160];
export const SCORE_TICKS_SHORT: readonly number[] = [40, 70, 100, 130, 160];

/** Deterministic horizontal offset in [-width/2, width/2] for dot plots. */
export function jitter(i: number, width: number): number {
  const golden = 0.6180339887;
  return (((i * golden) % 1) - 0.5) * width;
}

/** Rough text width for layout decisions (Be Vietnam Pro ≈ 0.56 em per character). */
export const textWidth = (s: string, size = 12): number => s.length * size * 0.56;

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * Upper end of the standard-score axis: the next 15-point tick above the data
 * (with 4 points of headroom), never below 100 and never above 160.
 * Keeps the 40 floor so the < 70 zone is always comparable between charts.
 */
export function scoreDomainMax(values: readonly number[]): number {
  if (!values.length) return 160;
  const max = Math.max(...values);
  const top = 40 + 15 * Math.ceil((max + 4 - 40) / 15);
  return Math.min(160, Math.max(100, top));
}

/** Ticks every 15 points (1 SD) from 40 up to the domain maximum. */
export function scoreTicks(hi: number): number[] {
  const ticks: number[] = [];
  for (let v = 40; v <= hi; v += 15) ticks.push(v);
  return ticks;
}
