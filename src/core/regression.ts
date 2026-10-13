// ENCOG – Firth penalized logistic regression (Firth 1993) for small samples.
// Profile penalized-likelihood confidence intervals and penalized likelihood-ratio P values,
// as in the logistf R package. Pure functions, no dependencies.
import { chi2Sf1 } from './stats';

export interface FirthTerm {
  name: string;
  /** Log odds ratio. */
  beta: number;
  or: number;
  lo: number | null;
  hi: number | null;
  p: number | null;
}

export interface FirthFit {
  n: number;
  events: number;
  terms: FirthTerm[];
  converged: boolean;
}

type Matrix = number[][];

/** Solve A x = b for symmetric positive-definite A (Gaussian elimination with partial pivoting). */
function solve(A: Matrix, b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / d;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-12));
}

function invert(A: Matrix): Matrix {
  const n = A.length;
  const cols = Array.from({ length: n }, (_, j) => solve(A, Array.from({ length: n }, (_, i) => (i === j ? 1 : 0))));
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => cols[j][i]));
}

function logDet(A: Matrix): number {
  const n = A.length;
  const M = A.map((r) => [...r]);
  let ld = 0;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c];
    if (!(Math.abs(d) > 0)) return -Infinity;
    ld += Math.log(Math.abs(d));
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / d;
      for (let k = c; k < n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return ld;
}

const sigmoid = (e: number): number => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, e))));

function info(X: Matrix, b: number[]): { p: number[]; w: number[]; I: Matrix } {
  const k = b.length;
  const p = X.map((x) => sigmoid(x.reduce((s, xi, j) => s + xi * b[j], 0)));
  const w = p.map((pi) => pi * (1 - pi));
  const I = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  X.forEach((x, i) => { for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) I[a][c] += w[i] * x[a] * x[c]; });
  return { p, w, I };
}

function penLogLik(X: Matrix, y: number[], b: number[]): number {
  const { p, I } = info(X, b);
  let ll = 0;
  y.forEach((yi, i) => { ll += yi ? Math.log(p[i]) : Math.log(1 - p[i]); });
  return ll + 0.5 * logDet(I);
}

/** Maximise the penalized likelihood over the free coefficients (Newton steps with step halving). */
function maximise(X: Matrix, y: number[], b0: number[], free: boolean[]): { b: number[]; ll: number; converged: boolean } {
  let b = [...b0];
  let cur = penLogLik(X, y, b);
  const idx = free.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
  for (let iter = 0; iter < 200; iter++) {
    const { p, w, I } = info(X, b);
    const Iinv = invert(I);
    const h = X.map((x, i) => {
      let s = 0;
      for (let a = 0; a < x.length; a++) for (let c = 0; c < x.length; c++) s += x[a] * Iinv[a][c] * x[c];
      return s * w[i];
    });
    const U = b.map((_, j) => X.reduce((s, x, i) => s + x[j] * (y[i] - p[i] + h[i] * (0.5 - p[i])), 0));
    const sub = idx.map((r) => idx.map((c) => I[r][c]));
    const stepSub = solve(sub, idx.map((j) => U[j]));
    const step = new Array<number>(b.length).fill(0);
    idx.forEach((j, k) => { step[j] = stepSub[k]; });
    let t = 1;
    let nb = b;
    let next = cur;
    while (t > 1e-6) {
      nb = b.map((v, j) => v + t * step[j]);
      next = penLogLik(X, y, nb);
      if (next >= cur - 1e-12) break;
      t /= 2;
    }
    const moved = Math.max(...step.map((s) => Math.abs(s * t)));
    b = nb;
    const done = Math.abs(next - cur) < 1e-11 && moved < 1e-8;
    cur = next;
    if (done) return { b, ll: cur, converged: true };
  }
  return { b, ll: cur, converged: false };
}

function bisect(f: (v: number) => number, a: number, c: number): number {
  let lo = a; let hi = c; let flo = f(lo);
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if ((fm > 0) === (flo > 0)) { lo = mid; flo = fm; } else hi = mid;
    if (Math.abs(hi - lo) < 1e-7) break;
  }
  return (lo + hi) / 2;
}

/**
 * Fit y ~ x1 + … + xk with Firth's penalty. Rows with any missing value are dropped.
 * Returns null when there are fewer than 2 events or non-events.
 */
export function firthLogistic(y: readonly (number | null)[], xs: readonly (readonly (number | null)[])[], names: readonly string[]): FirthFit | null {
  const rows: number[] = [];
  for (let i = 0; i < y.length; i++) {
    const vals = [y[i], ...xs.map((x) => x[i])];
    if (vals.every((v) => typeof v === 'number' && Number.isFinite(v))) rows.push(i);
  }
  const Y: number[] = rows.map((i) => ((y[i] as number) > 0 ? 1 : 0));
  const events = Y.reduce((a, v) => a + v, 0);
  if (events < 2 || rows.length - events < 2) return null;
  const X: Matrix = rows.map((i) => [1, ...xs.map((x) => x[i] as number)]);
  // every predictor must vary
  for (let j = 1; j < X[0].length; j++) if (new Set(X.map((r) => r[j])).size < 2) return null;
  const k = X[0].length;
  const full = maximise(X, Y, new Array<number>(k).fill(0), new Array<boolean>(k).fill(true));
  const cov = invert(info(X, full.b).I);
  const crit = 3.841458820694124 / 2;
  const terms: FirthTerm[] = names.map((name, t) => {
    const j = t + 1;
    const profile = (v: number): number => {
      const start = [...full.b]; start[j] = v;
      const free = new Array<boolean>(k).fill(true); free[j] = false;
      return maximise(X, Y, start, free).ll;
    };
    const ll0 = profile(0);
    const p = chi2Sf1(Math.max(0, 2 * (full.ll - ll0)));
    const g = (v: number): number => profile(v) - (full.ll - crit);
    const se = Math.sqrt(Math.max(cov[j][j], 1e-12));
    const findEnd = (dir: 1 | -1): number | null => {
      let w = se;
      for (let i = 0; i < 40 && g(full.b[j] + dir * w) > 0; i++) w *= 1.6;
      if (g(full.b[j] + dir * w) > 0) return null;
      return bisect(g, full.b[j], full.b[j] + dir * w);
    };
    const lo = findEnd(-1);
    const hi = findEnd(1);
    return { name, beta: full.b[j], or: Math.exp(full.b[j]), lo: lo === null ? null : Math.exp(lo), hi: hi === null ? null : Math.exp(hi), p };
  });
  return { n: rows.length, events, terms, converged: full.converged };
}
