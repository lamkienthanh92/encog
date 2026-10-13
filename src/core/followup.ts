// ENCOG – dates, follow-up timing and eligibility checks. Pure functions.
import type { AgeYM, Analysis, DateField, DateInputs, Lang, RecheckReason, Timing, TimingError, TimingWarning } from '../types';

export const DAYS_PER_MONTH = 30.4375;
export const MIN_FOLLOWUP_MONTHS = 6;
export const WISC_MIN_AGE_MONTHS = 72; // 6:0
export const WISC_MAX_AGE_MONTHS = 203; // 16:11
export const RECHECK_AFTER_MONTHS = 12;
/** Fixed follow-up anchor: re-assessment about 18 months after discharge (schedule of 6 and 18 months). */
export const RECHECK_AT_MONTHS_AFTER_DISCHARGE = 18;
/** Minimum gap between two WISC-IV administrations (practice effects). */
export const MIN_RETEST_GAP_MONTHS = 6;

export const isValidDate = (d: unknown): d is Date => d instanceof Date && !Number.isNaN(d.getTime());

/** Parse YYYY-MM-DD, DD/MM/YYYY (also . or -) or a Date. Returns a UTC date, null (empty) or an Invalid Date. */
export function parseDate(raw: string | Date | null | undefined): Date | null {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) {
    return isValidDate(raw) ? new Date(Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate())) : raw;
  }
  const s = raw.trim();
  if (s === '' || s === '-') return null;
  let y: number;
  let m: number;
  let d: number;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; }
  else if (dmy) { d = +dmy[1]; m = +dmy[2]; y = +dmy[3]; }
  else return new Date(NaN);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return new Date(NaN);
  return dt;
}

export const toISO = (d: Date | null): string => (isValidDate(d) ? d.toISOString().slice(0, 10) : '');

export function formatDate(d: Date | null, lang: Lang = 'vi'): string {
  if (!isValidDate(d)) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return lang === 'vi' ? `${dd}/${mm}/${d.getUTCFullYear()}` : `${d.getUTCFullYear()}-${mm}-${dd}`;
}

export function monthsBetween(a: Date | null, b: Date | null): number | null {
  if (!isValidDate(a) || !isValidDate(b)) return null;
  return (b.getTime() - a.getTime()) / 86400000 / DAYS_PER_MONTH;
}

export function addMonths(d: Date | null, months: number): Date | null {
  if (!isValidDate(d)) return null;
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return target;
}

export function ageYM(birth: Date | null, at: Date | null): AgeYM | null {
  if (!isValidDate(birth) || !isValidDate(at)) return null;
  let months = (at.getUTCFullYear() - birth.getUTCFullYear()) * 12 + (at.getUTCMonth() - birth.getUTCMonth());
  if (at.getUTCDate() < birth.getUTCDate()) months -= 1;
  return { years: Math.floor(months / 12), months: months % 12, totalMonths: months };
}

/** Timing checks for one assessment, plus the suggested re-assessment date. */
export function timingChecks(dates: DateInputs, analysis: Analysis | null = null): Timing {
  const errors: TimingError[] = [];
  const warnings: TimingWarning[] = [];
  const b = parseDate(dates.birth);
  const d = parseDate(dates.discharge);
  const a = parseDate(dates.assessment);
  const fields: [DateField, Date | null][] = [['birth', b], ['discharge', d], ['assessment', a]];
  for (const [field, v] of fields) if (v !== null && !isValidDate(v)) errors.push({ code: 'badDate', field });
  if (isValidDate(b) && isValidDate(d) && d < b) errors.push({ code: 'dischargeBeforeBirth', field: 'discharge' });
  if (isValidDate(d) && isValidDate(a) && a < d) errors.push({ code: 'assessmentBeforeDischarge', field: 'assessment' });

  const fu = monthsBetween(d, a);
  const sixMonths = addMonths(d, MIN_FOLLOWUP_MONTHS);
  if (fu !== null && fu >= 0 && isValidDate(a) && sixMonths && a < sixMonths) warnings.push({ code: 'earlyAssessment', months: fu });
  const age = ageYM(b, a);
  if (age && (age.totalMonths < WISC_MIN_AGE_MONTHS || age.totalMonths > WISC_MAX_AGE_MONTHS)) {
    warnings.push({ code: 'ageOutOfRange', years: age.years, months: age.months });
  }

  let nextDue: Date | null = null;
  let recheckReason: RecheckReason | null = null;
  if (analysis && analysis.complete && isValidDate(a)) {
    const sv = analysis.summary.value;
    if (sv !== null && sv < 80) recheckReason = 'lowSummary';
    else if (analysis.uneven) recheckReason = 'uneven';
    else if (analysis.belowSeventy.length > 0) recheckReason = 'lowIndex';
    if (recheckReason) {
      // Prefer the fixed 18-month visit after discharge, so that children are compared at the same
      // interval; fall back to 12 months after this assessment when that visit is too close or past.
      const anchored = isValidDate(d) ? addMonths(d, RECHECK_AT_MONTHS_AFTER_DISCHARGE) : null;
      const earliest = addMonths(a, MIN_RETEST_GAP_MONTHS);
      nextDue = anchored && earliest && anchored >= earliest ? anchored : addMonths(a, RECHECK_AFTER_MONTHS);
    }
  }
  return { monthsSinceDischarge: fu, age, warnings, errors, nextDue, recheckReason };
}
