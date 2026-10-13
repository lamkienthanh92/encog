import type { Lang, Params, Translate, TranslateList } from '../types';
import vi, { type Dict } from './vi';
import en from './en';

export const DICTS: Record<Lang, Dict> = { vi, en };
export const LANGS: readonly Lang[] = ['vi', 'en'];

function lookup(dict: Dict, key: string): unknown {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return node;
}

/** t(key, params): dotted-key lookup with {placeholder} substitution. Returns the key when missing. */
export function makeT(lang: Lang): Translate {
  const dict = DICTS[lang];
  return (key: string, params: Params = {}): string => {
    const val = lookup(dict, key);
    if (typeof val !== 'string') return key;
    return val.replace(/\{(\w+)\}/g, (m: string, p: string) => (p in params ? String(params[p]) : m));
  };
}

/** list(key): string arrays such as recommendations. */
export function makeList(lang: Lang): TranslateList {
  const dict = DICTS[lang];
  return (key: string): string[] => {
    const val = lookup(dict, key);
    return Array.isArray(val) ? val.map(String) : [];
  };
}

/** Number with the locale decimal mark: 12,5 (vi) or 12.5 (en). */
export function fmtNum(n: number | null | undefined, digits = 0, lang: Lang = 'vi'): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  const s = n.toFixed(digits);
  return lang === 'vi' ? s.replace('.', ',') : s;
}

/** Proportion (0–1) as a percentage string without the % sign. */
export function fmtPct(p: number | null | undefined, lang: Lang = 'vi', digits = 0): string {
  if (p === null || p === undefined) return '–';
  return fmtNum(p * 100, digits, lang);
}

/** Translated label for a variable (canonical English key); unknown columns keep their own name. */
export function varLabel(t: Translate, key: string): string {
  const field = `fields.${key}`;
  const fromFields = t(field);
  if (fromFields !== field) return fromFields;
  const v = `vars.${key}.label`;
  const fromVars = t(v);
  return fromVars !== v ? fromVars : key;
}

/** Translated label for a coded value; values of unknown columns are shown as written. */
export function levelLabel(t: Translate, key: string, code: string): string {
  const k = `vars.${key}.levels.${code}`;
  const s = t(k);
  return s !== k ? s : code;
}

/** P value with its relation sign: "= 0.018" or "< 0.001" (for templates written as "p {p}"). */
export function fmtPEq(p: number | null | undefined, lang: Lang = 'vi'): string {
  const s = fmtP(p, lang);
  return s.startsWith('<') ? `< ${s.slice(1)}` : s === '–' ? s : `= ${s}`;
}

/** P-value text: "<0.001" / "0.018" (en) or "<0,001" / "0,018" (vi). */
export function fmtP(p: number | null | undefined, lang: Lang = 'vi'): string {
  if (p === null || p === undefined || Number.isNaN(p)) return '–';
  return p < 0.001 ? (lang === 'vi' ? '<0,001' : '<0.001') : fmtNum(p, 3, lang);
}
