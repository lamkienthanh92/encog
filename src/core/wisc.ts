// ENCOG – interpretation of WISC-IV index scores. Pure functions, no dependencies.
// The tool never computes composites from subtests (that needs the publisher's
// norm tables); it only works with scores already obtained by a trained examiner.
import type {
  Analysis, BandKey, Caution, CompositeKey, IndexKey, Lang, RawValue, ScoreError, ScoreErrors, Scores, Selection, Tone,
} from '../types';

export const INDEXES: readonly IndexKey[] = ['VCI', 'PRI', 'WMI', 'PSI'];
export const COMPOSITES: readonly CompositeKey[] = ['FSIQ', 'GAI', 'CPI'];
export const SCORE_MIN = 40;
export const SCORE_MAX = 160;
export const DEFAULT_THRESHOLD = 23; // 1.5 SD on the standard-score metric
export const RELATIVE_WEAKNESS = 15; // points below the child's own index mean

/** Parse a user-entered score: number, null (empty) or NaN (not a number). */
export function toScore(raw: RawValue): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
  const s = raw.trim();
  if (s === '' || s === '-') return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/** Validate one standard score; returns null when valid. */
export function scoreError(value: number | null, required = true): ScoreError | null {
  if (value === null) return required ? 'missing' : null;
  if (Number.isNaN(value)) return 'notNumber';
  if (value < SCORE_MIN || value > SCORE_MAX) return 'outOfRange';
  if (!Number.isInteger(value)) return 'notInteger';
  return null;
}

/**
 * Which summary index is interpretable (Flanagan & Kaufman 2009; Weiss et al. 2006):
 * spread < T → FSIQ; else |VCI−PRI| < T → GAI; else |WMI−PSI| < T → CPI; else NONE.
 */
export function selectSummaryIndex(index: Record<IndexKey, number>, threshold: number = DEFAULT_THRESHOLD): Selection {
  const vals = INDEXES.map((k) => index[k]);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const spread = max - min;
  const vp = Math.abs(index.VCI - index.PRI);
  const wp = Math.abs(index.WMI - index.PSI);
  const base = {
    spread, vp, wp, max, min, threshold,
    maxKeys: INDEXES.filter((k) => index[k] === max),
    minKeys: INDEXES.filter((k) => index[k] === min),
  };
  if (spread < threshold) return { ...base, type: 'FSIQ', reason: 'unitary' };
  if (vp < threshold) return { ...base, type: 'GAI', reason: 'fsiqNotUnitary' };
  if (wp < threshold) return { ...base, type: 'CPI', reason: 'gaiNotUnitary' };
  return { ...base, type: 'NONE', reason: 'noUnitary' };
}

export interface Band {
  key: BandKey;
  min: number;
  max: number;
  tone: Tone;
}

export const BANDS: readonly Band[] = [
  { key: 'extremelyLow', min: -Infinity, max: 69, tone: 'low' },
  { key: 'borderline', min: 70, max: 79, tone: 'border' },
  { key: 'lowAverage', min: 80, max: 89, tone: 'lowavg' },
  { key: 'average', min: 90, max: 109, tone: 'avg' },
  { key: 'highAverage', min: 110, max: 119, tone: 'high' },
  { key: 'high', min: 120, max: 129, tone: 'high' },
  { key: 'veryHigh', min: 130, max: Infinity, tone: 'high' },
];

export function classify(score: number | null): BandKey | null {
  if (score === null || !Number.isFinite(score)) return null;
  const s = Math.round(score);
  const band = BANDS.find((b) => s >= b.min && s <= b.max);
  return band ? band.key : null;
}

export function toneOf(score: number | null): Tone | null {
  const key = classify(score);
  const band = BANDS.find((b) => b.key === key);
  return band ? band.tone : null;
}

export const toneOfBand = (key: BandKey): Tone => (BANDS.find((b) => b.key === key) as Band).tone;

/** Normal CDF via Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7). */
export function normalCdf(z: number): number {
  const x = z / Math.SQRT2;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

/** Approximate percentile rank of a standard score (mean 100, SD 15). */
export function approxPercentile(score: number | null): number | null {
  if (score === null || !Number.isFinite(score)) return null;
  return normalCdf((score - 100) / 15) * 100;
}

/** Percentile text with the decimal mark of the UI language (0,5 in Vietnamese, 0.5 in English). */
export function formatPercentile(p: number | null, lang: Lang = 'en'): string {
  if (p === null) return '–';
  const dec = (s: string): string => (lang === 'vi' ? s.replace('.', ',') : s);
  if (p < 0.1) return dec('<0.1');
  if (p > 99.9) return dec('>99.9');
  if (p < 1) return dec(p.toFixed(1));
  return String(Math.round(p));
}

export type ScoreInput = Partial<Record<IndexKey | CompositeKey, RawValue>>;

/** Full analysis of one assessment. */
export function analyzeScores(input: ScoreInput, threshold: number = DEFAULT_THRESHOLD): Analysis {
  const scores = {} as Scores;
  const errors: ScoreErrors = {};
  for (const k of INDEXES) {
    scores[k] = toScore(input[k]);
    const e = scoreError(scores[k], true);
    if (e) errors[k] = e;
  }
  for (const k of COMPOSITES) {
    scores[k] = toScore(input[k]);
    const e = scoreError(scores[k], false);
    if (e) errors[k] = e;
  }
  const blocking = INDEXES.some((k) => errors[k] !== undefined && errors[k] !== 'notInteger');
  if (blocking) return { complete: false, scores, errors };

  const index = { VCI: scores.VCI as number, PRI: scores.PRI as number, WMI: scores.WMI as number, PSI: scores.PSI as number };
  const selection = selectSummaryIndex(index, threshold);
  const type = selection.type;
  const summaryValue = type !== 'NONE' && !errors[type] ? scores[type] : null;
  const missing = type !== 'NONE' && errors[type] === undefined && scores[type] === null;

  const indexMean = INDEXES.reduce((a, k) => a + index[k], 0) / INDEXES.length;
  const relative = { VCI: 0, PRI: 0, WMI: 0, PSI: 0 };
  for (const k of INDEXES) relative[k] = index[k] - indexMean;
  const belowSeventy = INDEXES.filter((k) => index[k] < 70);
  const focus = INDEXES.filter((k) => index[k] < 80 || relative[k] <= -RELATIVE_WEAKNESS).sort((a, b) => index[a] - index[b]);
  const bands = {} as Record<IndexKey, BandKey>;
  for (const k of INDEXES) bands[k] = classify(index[k]) as BandKey;

  const cautions: Caution[] = [];
  if (type === 'CPI') cautions.push('cpiCaution');
  if (type === 'NONE') cautions.push('noSummary');
  if (summaryValue !== null && summaryValue < 70) cautions.push('adaptiveBehaviour');

  return {
    complete: true,
    scores,
    errors,
    index,
    selection,
    summary: { type, value: summaryValue, missing, band: classify(summaryValue), percentile: approxPercentile(summaryValue) },
    uneven: selection.spread >= threshold,
    indexMean,
    relative,
    belowSeventy,
    focus,
    bands,
    cautions,
  };
}
