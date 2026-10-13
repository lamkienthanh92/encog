// ENCOG – small statistics helpers for the cohort view. Pure functions.
import type { BoxStats, Describe, Proportion } from '../types';

type Num = number | null | undefined;
const finite = (xs: readonly Num[]): number[] => xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));

export function mean(xs: readonly Num[]): number | null {
  const v = finite(xs);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function sd(xs: readonly Num[]): number | null {
  const v = finite(xs);
  if (v.length < 2) return null;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1));
}

/** Quantile type 7 (R default; Stata centile with interpolation). */
export function quantile(xs: readonly Num[], p: number): number | null {
  const v = finite(xs).sort((a, b) => a - b);
  if (!v.length) return null;
  const h = (v.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return v[lo] + (h - lo) * (v[hi] - v[lo]);
}

export function describe(xs: readonly Num[]): Describe {
  const v = finite(xs);
  return {
    n: v.length,
    mean: mean(v),
    sd: sd(v),
    median: quantile(v, 0.5),
    q1: quantile(v, 0.25),
    q3: quantile(v, 0.75),
    min: v.length ? Math.min(...v) : null,
    max: v.length ? Math.max(...v) : null,
  };
}

/** Wilson score interval for k/n. */
export function wilson(k: number, n: number, z = 1.959964): Proportion {
  if (!n) return { p: null, lo: null, hi: null };
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { p, lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}

function logFactorial(n: number): number {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
}

/** Two-sided Fisher exact test for [[a, b], [c, d]]. */
export function fisherExact(a: number, b: number, c: number, d: number): number | null {
  const r1 = a + b;
  const r2 = c + d;
  const c1 = a + c;
  const n = r1 + r2;
  if (n === 0) return null;
  const base = logFactorial(r1) + logFactorial(r2) + logFactorial(c1) + logFactorial(n - c1) - logFactorial(n);
  const prob = (x: number): number => Math.exp(base - logFactorial(x) - logFactorial(r1 - x) - logFactorial(c1 - x) - logFactorial(r2 - c1 + x));
  const pObs = prob(a);
  let p = 0;
  for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x++) {
    const px = prob(x);
    if (px <= pObs * (1 + 1e-7)) p += px;
  }
  return Math.min(1, p);
}

export interface Bin {
  from: number;
  to: number;
  count: number;
}

export function histogram(xs: readonly Num[], from = 40, to = 160, width = 10): Bin[] {
  const bins: Bin[] = [];
  for (let x = from; x < to; x += width) bins.push({ from: x, to: x + width, count: 0 });
  for (const v of finite(xs)) {
    const i = Math.min(bins.length - 1, Math.max(0, Math.floor((v - from) / width)));
    bins[i].count += 1;
  }
  return bins;
}

/** Tukey box-plot statistics; null when there are no finite values. */
export function boxStats(xs: readonly Num[]): BoxStats | null {
  const v = finite(xs).sort((a, b) => a - b);
  if (!v.length) return null;
  const q1 = quantile(v, 0.25) as number;
  const median = quantile(v, 0.5) as number;
  const q3 = quantile(v, 0.75) as number;
  const iqr = q3 - q1;
  const loFence = q1 - 1.5 * iqr;
  const hiFence = q3 + 1.5 * iqr;
  const inside = v.filter((x) => x >= loFence && x <= hiFence);
  return {
    n: v.length,
    q1,
    median,
    q3,
    mean: v.reduce((a, b) => a + b, 0) / v.length,
    lowerWhisker: inside.length ? inside[0] : q1,
    upperWhisker: inside.length ? inside[inside.length - 1] : q3,
    outliers: v.filter((x) => x < loFence || x > hiFence),
  };
}

/* ---------- distributions ---------- */

/** Complementary error function (Numerical Recipes erfc, |error| < 1.2e-7). */
export function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806
    + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

/** Standard normal upper tail P(Z > z). */
export const normalSf = (z: number): number => 0.5 * erfc(z / Math.SQRT2);

/** Chi-square (1 df) upper tail. */
export const chi2Sf1 = (x: number): number => (x <= 0 ? 1 : erfc(Math.sqrt(x / 2)));

function logGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const ci of c) ser += ci / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  const EPS = 3e-14;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < 1e-300) d = 1e-300;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). */
export function incBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Two-sided P value for Student t with df degrees of freedom. */
export const tTwoSided = (t: number, df: number): number => incBeta(df / (df + t * t), df / 2, 0.5);

/* ---------- rank tests ---------- */

/** Mid-ranks (ties share the average rank), 1-based. */
export function ranks(xs: readonly number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}

export interface MannWhitney {
  u: number;
  p: number | null;
}

/**
 * Two-sided Mann–Whitney U test, normal approximation with tie and continuity correction
 * (matches scipy.stats.mannwhitneyu(method='asymptotic')).
 */
export function mannWhitney(a: readonly Num[], b: readonly Num[]): MannWhitney {
  const x = finite(a);
  const y = finite(b);
  const n1 = x.length;
  const n2 = y.length;
  if (!n1 || !n2) return { u: NaN, p: null };
  const all = [...x, ...y];
  const r = ranks(all);
  const r1 = r.slice(0, n1).reduce((s, v) => s + v, 0);
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const n = n1 + n2;
  const counts = new Map<number, number>();
  all.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  let tie = 0;
  counts.forEach((c) => { tie += c ** 3 - c; });
  const sigma = Math.sqrt(((n1 * n2) / 12) * (n + 1 - tie / (n * (n - 1))));
  if (!(sigma > 0)) return { u: u1, p: 1 };
  const mu = (n1 * n2) / 2;
  const u = Math.max(u1, n1 * n2 - u1);
  const z = (u - mu - 0.5) / sigma;
  return { u: u1, p: Math.min(1, 2 * normalSf(z)) };
}

export interface Correlation {
  rho: number | null;
  p: number | null;
  n: number;
}

/** Spearman rank correlation on complete pairs; P from the t approximation (as scipy.stats.spearmanr). */
export function spearman(xs: readonly Num[], ys: readonly Num[]): Correlation {
  const pairs: [number, number][] = [];
  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    const x = xs[i];
    const y = ys[i];
    if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y)) pairs.push([x, y]);
  }
  const n = pairs.length;
  if (n < 3) return { rho: null, p: null, n };
  const rx = ranks(pairs.map((p) => p[0]));
  const ry = ranks(pairs.map((p) => p[1]));
  const mx = mean(rx) as number;
  const my = mean(ry) as number;
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < n; i++) { sxy += (rx[i] - mx) * (ry[i] - my); sxx += (rx[i] - mx) ** 2; syy += (ry[i] - my) ** 2; }
  if (sxx === 0 || syy === 0) return { rho: null, p: null, n };
  const rho = sxy / Math.sqrt(sxx * syy);
  if (Math.abs(rho) >= 1) return { rho, p: 0, n };
  const t = rho * Math.sqrt((n - 2) / (1 - rho * rho));
  return { rho, p: tTwoSided(t, n - 2), n };
}
