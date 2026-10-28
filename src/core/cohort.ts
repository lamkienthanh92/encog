// ENCOG – cohort mode: map CSV columns, validate rows, analyse and summarise.
import type {
  AssociationResult, AssociationRow, BandKey, BuildResult, ChildPoint, CohortField, CohortRecord, CohortSummary, CompleteAnalysis, Describe,
  GroupColumn, GroupStat, IndexKey, Issue, LosPoint, NumericColumn, OddsEstimate, ParsedCsv, ProfileRow, SummaryType, TimingSummary, Trajectory,
} from '../types';
import { BANDS, COMPOSITES, DEFAULT_THRESHOLD, INDEXES, analyzeScores, toScore } from './wisc';
import { isValidDate, parseDate, timingChecks, toISO } from './followup';
import { describe, fisherExact, mannWhitney, quantile, spearman, wilson } from './stats';
import { firthLogistic, type FirthTerm } from './regression';
import { CATEGORICAL_VARIABLES, NUMERIC_VARIABLES, matchCategorical, matchNumeric, normalizeKey, toLevelCode } from './variables';

export { normalizeKey };

export const FIELD_ALIASES: Record<CohortField, readonly string[]> = {
  id: ['id', 'child_id', 'ma', 'ma_tre', 'ma_so', 'code'],
  birth_date: ['birth_date', 'dob', 'ngay_sinh'],
  discharge_date: ['discharge_date', 'ngay_xuat_vien', 'xuat_vien'],
  assessment_date: ['assessment_date', 'ngay_danh_gia', 'ngay_danh_gia_wisc', 'test_date'],
  VCI: ['vci'], PRI: ['pri'], WMI: ['wmi'], PSI: ['psi'],
  FSIQ: ['fsiq'], GAI: ['gai'], CPI: ['cpi'],
  reported_type: ['reported_type', 'loai_chi_so', 'index_type'],
  los: ['los', 'liverpool', 'liverpool_outcome_score'],
  mrs: ['mrs', 'rankin', 'modified_rankin'],
};

export const TEMPLATE_HEADERS: readonly string[] = [
  'id', 'birth_date', 'discharge_date', 'assessment_date', 'VCI', 'PRI', 'WMI', 'PSI',
  'FSIQ', 'GAI', 'CPI', 'reported_type', 'los', 'mrs', 'etiology_group', 'discharge_status', 'sex',
  'residence', 'n_seizures', 'fever_days', 'gcs_admission', 'ventilation_days', 'icu_days', 'hospital_days',
];

export function mapHeaders(headers: readonly string[]): Omit<BuildResult, 'records'> {
  const mapping: Partial<Record<CohortField, string>> = {};
  const used = new Set<string>();
  for (const field of Object.keys(FIELD_ALIASES) as CohortField[]) {
    const h = headers.find((x) => !used.has(x) && FIELD_ALIASES[field].includes(normalizeKey(x)));
    if (h) { mapping[field] = h; used.add(h); }
  }
  const knownKeys = new Set<string>();
  const numericColumns: NumericColumn[] = [];
  for (const header of headers) {
    if (used.has(header) || header === '') continue;
    const nv = matchNumeric(header);
    if (nv && !knownKeys.has(nv.key)) { knownKeys.add(nv.key); used.add(header); numericColumns.push({ key: nv.key, header, known: true }); }
  }
  const groupColumns: GroupColumn[] = headers.filter((h) => !used.has(h) && h !== '').map((header) => {
    const variable = matchCategorical(header);
    if (variable && !knownKeys.has(variable.key)) {
      knownKeys.add(variable.key);
      return { key: variable.key, header, known: true };
    }
    return { key: header, header, known: false };
  });
  return { mapping, groupColumns, numericColumns, missingRequired: INDEXES.filter((k) => !mapping[k]) };
}

const intInRange = (v: number | null, lo: number, hi: number): v is number => v !== null && Number.isInteger(v) && v >= lo && v <= hi;
const SUMMARY_TYPES: readonly SummaryType[] = ['FSIQ', 'GAI', 'CPI', 'NONE'];

/** Parse a clinical number ("12", "12,5"); null when empty, NaN when not a number. */
function toNumber(raw: string): number | null {
  const v = raw.trim().replace(',', '.');
  if (v === '' || v === '-') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** Unknown columns whose filled values are (almost) all numbers with at least 3 distinct values. */
function numericLikeColumns(parsed: ParsedCsv, groupColumns: readonly GroupColumn[]): NumericColumn[] {
  return groupColumns.filter((c) => !c.known).filter((c) => {
    const vals = parsed.rows.map((r) => (r.values[c.header] ?? '').trim()).filter((v) => v !== '' && v !== '-');
    if (vals.length < 5) return false;
    const nums = vals.map(toNumber).filter((n): n is number => n !== null && !Number.isNaN(n));
    return nums.length >= 0.9 * vals.length && new Set(nums).size >= 3;
  }).map((c) => ({ key: c.key, header: c.header, known: false }));
}

export function buildRecords(parsed: ParsedCsv, threshold: number = DEFAULT_THRESHOLD, allowCpiSummary = false): BuildResult {
  const mapped = mapHeaders(parsed.headers);
  const { mapping, missingRequired } = mapped;
  const numericColumns = [...mapped.numericColumns, ...numericLikeColumns(parsed, mapped.groupColumns)];
  const numericKeys = new Set(numericColumns.filter((c) => !c.known).map((c) => c.key));
  const groupColumns = mapped.groupColumns.filter((c) => !numericKeys.has(c.key));
  const records: CohortRecord[] = parsed.rows.map((row) => {
    const get = (f: CohortField): string => { const h = mapping[f]; return h ? row.values[h] ?? '' : ''; };
    const issues: Issue[] = [];
    const rawId = get('id').trim();
    if (!rawId) issues.push({ level: 'warning', code: 'missingId' });
    const id = rawId || `#${row.line}`;

    const input: Partial<Record<IndexKey | 'FSIQ' | 'GAI' | 'CPI', string>> = {};
    for (const k of [...INDEXES, ...COMPOSITES]) input[k] = get(k);
    const analysis = analyzeScores(input, threshold, { allowCpiSummary });
    for (const [k, code] of Object.entries(analysis.errors)) {
      const required = (INDEXES as readonly string[]).includes(k);
      if (!code || (code === 'missing' && !required)) continue;
      issues.push({ level: code === 'notInteger' && !required ? 'warning' : 'error', code, field: k, params: { value: input[k as IndexKey] ?? '' } });
    }
    const dates = { birth: get('birth_date'), discharge: get('discharge_date'), assessment: get('assessment_date') };
    const timing = timingChecks(dates, analysis);
    timing.errors.forEach((e) => issues.push({ level: 'error', code: e.code, field: e.field }));
    timing.warnings.forEach((w) => issues.push({
      level: 'warning', code: w.code, params: w.code === 'earlyAssessment' ? { months: w.months } : { years: w.years, months: w.months },
    }));

    const rt = get('reported_type').trim().toUpperCase();
    let reportedType: SummaryType | null = null;
    if (rt) {
      if ((SUMMARY_TYPES as readonly string[]).includes(rt)) reportedType = rt as SummaryType;
      else issues.push({ level: 'warning', code: 'unknownType', params: { value: rt } });
    }
    if (analysis.complete && reportedType && reportedType !== analysis.selection.type) {
      issues.push({ level: 'warning', code: 'typeMismatch', params: { reported: reportedType, rule: analysis.selection.type } });
    }
    if (analysis.complete && analysis.summary.missing) {
      issues.push({ level: 'warning', code: 'summaryMissing', params: { type: analysis.selection.type } });
    }
    const los = toScore(get('los'));
    if (los !== null && !intInRange(los, 1, 5)) issues.push({ level: 'error', code: 'losRange', field: 'los', params: { value: get('los') } });
    const mrs = toScore(get('mrs'));
    if (mrs !== null && !intInRange(mrs, 0, 6)) issues.push({ level: 'error', code: 'mrsRange', field: 'mrs', params: { value: get('mrs') } });

    const groups: Record<string, string> = {};
    for (const col of groupColumns) {
      const raw = (row.values[col.header] ?? '').trim();
      const variable = col.known ? CATEGORICAL_VARIABLES.find((v) => v.key === col.key) : undefined;
      if (!variable || raw === '') { groups[col.key] = raw; continue; }
      const code = toLevelCode(variable, raw);
      if (code) groups[col.key] = code;
      else {
        groups[col.key] = raw;
        issues.push({ level: 'warning', code: 'unknownLevel', field: col.key, params: { value: raw } });
      }
    }
    const numeric: Record<string, number | null> = {};
    for (const col of numericColumns) {
      const raw = (row.values[col.header] ?? '').trim();
      const v = toNumber(raw);
      if (v === null) { numeric[col.key] = null; continue; }
      if (Number.isNaN(v)) {
        numeric[col.key] = null;
        issues.push({ level: 'warning', code: 'numericNotNumber', field: col.key, params: { value: raw } });
        continue;
      }
      const nv = col.known ? NUMERIC_VARIABLES.find((x) => x.key === col.key) : undefined;
      if (nv && (v < nv.min || v > nv.max)) {
        numeric[col.key] = null;
        issues.push({ level: 'warning', code: 'numericRange', field: col.key, params: { value: raw, min: nv.min, max: nv.max } });
        continue;
      }
      numeric[col.key] = v;
    }
    return {
      line: row.line,
      id,
      dates: { birth: parseDate(dates.birth), discharge: parseDate(dates.discharge), assessment: parseDate(dates.assessment) },
      analysis,
      timing,
      reportedType,
      los: intInRange(los, 1, 5) ? los : null,
      mrs: intInRange(mrs, 0, 6) ? mrs : null,
      groups,
      numeric,
      issues,
    };
  });
  const seen = new Map<string, number>();
  for (const r of records) {
    const key = `${r.id}|${toISO(r.dates.assessment)}`;
    const first = seen.get(key);
    if (first !== undefined) r.issues.push({ level: 'error', code: 'duplicate', params: { line: first } });
    else seen.set(key, r.line);
  }
  return { records, mapping, groupColumns, numericColumns, missingRequired };
}

export type UsableRecord = CohortRecord & { analysis: CompleteAnalysis };

/** Rows that can enter the analysis: complete scores and not a duplicate. */
export function usable(records: readonly CohortRecord[]): UsableRecord[] {
  return records.filter((r): r is UsableRecord => r.analysis.complete && !r.issues.some((i) => i.code === 'duplicate'));
}

const time = (d: Date | null): number => (isValidDate(d) ? d.getTime() : Infinity);

/** Earliest usable assessment per child. */
export function firstAssessments(records: readonly CohortRecord[]): UsableRecord[] {
  const byId = new Map<string, UsableRecord>();
  for (const r of usable(records)) {
    const cur = byId.get(r.id);
    if (!cur || time(r.dates.assessment) < time(cur.dates.assessment)) byId.set(r.id, r);
  }
  return [...byId.values()];
}

/** Keys of grouping columns with 2–8 distinct values among the children analysed. */
export function groupCandidates(records: readonly CohortRecord[], groupColumns: readonly GroupColumn[]): string[] {
  const firsts = firstAssessments(records);
  return groupColumns.map((c) => c.key).filter((key) => {
    const vals = new Set(firsts.map((r) => r.groups[key]).filter((v) => v !== undefined && v !== ''));
    return vals.size >= 2 && vals.size <= 8;
  });
}

export function summarize(records: readonly CohortRecord[], groupBy: string | null = null): CohortSummary {
  const firsts = firstAssessments(records);
  const withSummary = firsts.filter((r) => r.analysis.summary.value !== null);
  const sv = (r: UsableRecord): number => r.analysis.summary.value as number;
  const below = withSummary.filter((r) => sv(r) < 70).length;

  const typeCounts: Record<SummaryType, number> = { FSIQ: 0, GAI: 0, CPI: 0, NONE: 0 };
  firsts.forEach((r) => { typeCounts[r.analysis.selection.type] += 1; });
  const bandCounts = Object.fromEntries(BANDS.map((b) => [b.key, 0])) as Record<BandKey, number>;
  withSummary.forEach((r) => { const b = r.analysis.summary.band; if (b) bandCounts[b] += 1; });

  const indexStats = {} as Record<IndexKey, Describe & { below70: number }>;
  const indexPoints = {} as Record<IndexKey, ChildPoint[]>;
  const lowest = { VCI: 0, PRI: 0, WMI: 0, PSI: 0 };
  for (const k of INDEXES) {
    const vals = firsts.map((r) => r.analysis.index[k]);
    indexStats[k] = { ...describe(vals), below70: vals.filter((v) => v < 70).length };
    indexPoints[k] = firsts.map((r) => ({ id: r.id, value: r.analysis.index[k] }));
  }
  firsts.forEach((r) => r.analysis.selection.minKeys.forEach((k) => { lowest[k] += 1 / r.analysis.selection.minKeys.length; }));

  const withReported = firsts.filter((r) => r.reportedType);
  const agree = withReported.filter((r) => r.reportedType === r.analysis.selection.type).length;
  const withFsiq = firsts.filter((r) => typeof r.analysis.scores.FSIQ === 'number' && !r.analysis.errors.FSIQ);
  const fsiqBelow = withFsiq.filter((r) => (r.analysis.scores.FSIQ as number) < 70).length;

  const losCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  firsts.forEach((r) => { if (r.los) losCounts[r.los] += 1; });
  const losPoints: LosPoint[] = withSummary.filter((r) => r.los).map((r) => ({ id: r.id, los: r.los as number, value: sv(r) }));

  const series = new Map<string, Trajectory['points']>();
  for (const r of usable(records)) {
    if (r.analysis.summary.value === null || r.timing.monthsSinceDischarge === null) continue;
    const pts = series.get(r.id) ?? [];
    pts.push({ x: r.timing.monthsSinceDischarge, value: r.analysis.summary.value, type: r.analysis.selection.type });
    series.set(r.id, pts);
  }
  const trajectories: Trajectory[] = [...series.entries()]
    .filter(([, pts]) => pts.length >= 2)
    .map(([id, pts]) => ({ id, points: [...pts].sort((a, b) => a.x - b.x) }));

  let groups: CohortSummary['groups'] = null;
  if (groupBy) {
    const levels = [...new Set(firsts.map((r) => r.groups[groupBy]).filter((v) => v !== ''))].sort();
    const items: GroupStat[] = levels.map((level) => {
      const rs = withSummary.filter((r) => r.groups[groupBy] === level);
      const k = rs.filter((r) => sv(r) < 70).length;
      return { level, n: rs.length, k, ci: wilson(k, rs.length), stats: describe(rs.map(sv)) };
    });
    const fisherP = items.length === 2 ? fisherExact(items[0].k, items[0].n - items[0].k, items[1].k, items[1].n - items[1].k) : null;
    groups = { by: groupBy, items, fisherP };
  }

  const unevenK = firsts.filter((r) => r.analysis.uneven).length;

  const noCpi = withSummary.filter((r) => r.analysis.selection.type !== 'CPI');
  const noCpiBelow = noCpi.filter((r) => sv(r) < 70).length;
  const excludingCpi = typeCounts.CPI > 0 && noCpi.length ? { k: noCpiBelow, n: noCpi.length, ...wilson(noCpiBelow, noCpi.length) } : null;

  let timing: TimingSummary | null = null;
  const timed = withSummary.filter((r) => r.timing.monthsSinceDischarge !== null && r.timing.monthsSinceDischarge >= 0);
  if (timed.length >= 3) {
    const months = (r: UsableRecord): number => r.timing.monthsSinceDischarge as number;
    const lo = timed.filter((r) => sv(r) < 70).map(months);
    const hi = timed.filter((r) => sv(r) >= 70).map(months);
    const cor = spearman(timed.map(months), timed.map(sv));
    timing = {
      below: describe(lo), above: describe(hi), p: lo.length && hi.length ? mannWhitney(lo, hi).p : null,
      rho: cor.rho, rhoP: cor.p, points: timed.map((r) => ({ id: r.id, months: months(r), value: sv(r) })),
    };
  }

  let profiles: ProfileRow[] = [];
  if (groupBy) {
    const levels = [...new Set(firsts.map((r) => r.groups[groupBy]).filter((v) => v !== undefined && v !== ''))].sort();
    profiles = levels.map((level) => {
      const rs = firsts.filter((r) => r.groups[groupBy] === level);
      const med = (vals: number[]): number | null => quantile(vals, 0.5);
      return {
        level, n: rs.length,
        medians: {
          VCI: med(rs.map((r) => r.analysis.index.VCI)), PRI: med(rs.map((r) => r.analysis.index.PRI)),
          WMI: med(rs.map((r) => r.analysis.index.WMI)), PSI: med(rs.map((r) => r.analysis.index.PSI)),
          summary: med(rs.filter((r) => r.analysis.summary.value !== null).map(sv)),
        },
      };
    });
  }
  return {
    rows: records.length,
    children: firsts.length,
    withSummary: withSummary.length,
    below70: { k: below, n: withSummary.length, ...wilson(below, withSummary.length) },
    typeCounts,
    bandCounts,
    indexStats,
    indexPoints,
    uneven: { k: unevenK, n: firsts.length, ...wilson(unevenK, firsts.length) },
    lowest,
    agreement: withReported.length ? { k: agree, n: withReported.length } : null,
    fsiq: withFsiq.length ? { k: fsiqBelow, n: withFsiq.length, complete: withFsiq.length === firsts.length, ...wilson(fsiqBelow, withFsiq.length) } : null,
    los: losPoints.length ? { counts: losCounts, points: losPoints } : null,
    followUp: describe(firsts.map((r) => r.timing.monthsSinceDischarge)),
    summaryPoints: withSummary.map((r) => ({ id: r.id, value: sv(r) })),
    trajectories,
    groups,
    issueCounts: {
      errors: records.reduce((a, r) => a + r.issues.filter((i) => i.level === 'error').length, 0),
      warnings: records.reduce((a, r) => a + r.issues.filter((i) => i.level === 'warning').length, 0),
      rowsWithIssues: records.filter((r) => r.issues.length > 0).length,
    },
    excludingCpi,
    timing,
    profiles,
  };
}

const toOdds = (t: FirthTerm | undefined): OddsEstimate | null => (t ? { or: t.or, lo: t.lo, hi: t.hi, p: t.p } : null);

/**
 * Exploratory associations with a summary index < 70 (first assessment per child):
 * Firth logistic regression for each binary grouping column (2 levels) and each numeric column,
 * crude and adjusted for months from discharge to assessment.
 */
export function associations(records: readonly CohortRecord[], groupColumns: readonly GroupColumn[], numericColumns: readonly NumericColumn[]): AssociationResult {
  const firsts = firstAssessments(records).filter((r) => r.analysis.summary.value !== null);
  const y = firsts.map((r) => ((r.analysis.summary.value as number) < 70 ? 1 : 0));
  const months = firsts.map((r) => (r.timing.monthsSinceDischarge !== null && r.timing.monthsSinceDischarge >= 0 ? r.timing.monthsSinceDischarge : null));
  const hasInterval = months.filter((m) => m !== null).length >= 5;
  const rows: AssociationRow[] = [];
  const fit = (x: (number | null)[], key: string, kind: AssociationRow['kind'], extra: Partial<AssociationRow> = {}): void => {
    const crude = firthLogistic(y, [x], [key]);
    if (!crude) return;
    const adj = kind !== 'interval' && hasInterval ? firthLogistic(y, [x, months], [key, 'months']) : null;
    rows.push({ key, kind, n: crude.n, events: crude.events, crude: toOdds(crude.terms[0]), adjusted: toOdds(adj?.terms[0]), ...extra });
  };
  for (const col of groupColumns) {
    const levels = [...new Set(firsts.map((r) => r.groups[col.key]).filter((v) => v !== undefined && v !== ''))];
    if (levels.length !== 2) continue;
    // reference = the level listed first in the coded variable, otherwise the more frequent level
    const variable = CATEGORICAL_VARIABLES.find((v) => v.key === col.key);
    const order = variable ? variable.levels.map((l) => l.code) : [];
    levels.sort((a, b) => {
      const ia = order.indexOf(a); const ib = order.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      return firsts.filter((r) => r.groups[col.key] === b).length - firsts.filter((r) => r.groups[col.key] === a).length;
    });
    const [ref, lvl] = levels;
    const x = firsts.map((r) => (r.groups[col.key] === lvl ? 1 : r.groups[col.key] === ref ? 0 : null));
    fit(x, col.key, 'binary', { level: lvl, reference: ref });
  }
  for (const col of numericColumns) fit(firsts.map((r) => r.numeric[col.key] ?? null), col.key, 'numeric');
  if (hasInterval) fit(months, 'months_since_discharge', 'interval');
  const withMonths = firsts.filter((_, i) => months[i] !== null);
  return { rows, events: withMonths.filter((r) => (r.analysis.summary.value as number) < 70).length, n: withMonths.length };
}

export const DERIVED_HEADERS: readonly string[] = [
  'id', 'assessment_date', 'months_since_discharge', 'age_years', 'VCI', 'PRI', 'WMI', 'PSI',
  'spread', 'vci_pri_diff', 'wmi_psi_diff', 'rule_index', 'reported_type', 'rule_matches_reported',
  'summary_value', 'summary_band', 'summary_below_70', 'uneven_profile', 'lowest_index',
  'n_indexes_below_70', 'next_due', 'los', 'mrs', 'n_errors', 'n_warnings',
];

/** Export headers: derived variables followed by the grouping columns (English keys). */
export function derivedHeaders(groupColumns: readonly GroupColumn[], numericColumns: readonly NumericColumn[] = []): string[] {
  return [...DERIVED_HEADERS, ...[...groupColumns, ...numericColumns].map((c) => c.key).filter((k) => !DERIVED_HEADERS.includes(k))];
}

/** One row per assessment with derived variables and grouping codes, for Stata/R/SPSS. */
export function derivedTable(records: readonly CohortRecord[]): Record<string, string | number>[] {
  return records.map((r) => {
    const a = r.analysis;
    const base: Record<string, string | number> = {
      id: r.id,
      assessment_date: toISO(r.dates.assessment),
      months_since_discharge: r.timing.monthsSinceDischarge !== null ? r.timing.monthsSinceDischarge.toFixed(2) : '',
      age_years: r.timing.age ? (r.timing.age.totalMonths / 12).toFixed(2) : '',
      VCI: a.scores.VCI ?? '', PRI: a.scores.PRI ?? '', WMI: a.scores.WMI ?? '', PSI: a.scores.PSI ?? '',
      reported_type: r.reportedType ?? '',
      next_due: toISO(r.timing.nextDue),
      los: r.los ?? '',
      mrs: r.mrs ?? '',
      n_errors: r.issues.filter((i) => i.level === 'error').length,
      n_warnings: r.issues.filter((i) => i.level === 'warning').length,
      ...r.groups,
      ...Object.fromEntries(Object.entries(r.numeric).map(([k, v]) => [k, v ?? ''])),
    };
    if (!a.complete) return base;
    const s = a.selection;
    return {
      ...base,
      spread: s.spread, vci_pri_diff: s.vp, wmi_psi_diff: s.wp,
      rule_index: s.type,
      rule_matches_reported: r.reportedType ? (r.reportedType === s.type ? 1 : 0) : '',
      summary_value: a.summary.value ?? '',
      summary_band: a.summary.band ?? '',
      summary_below_70: a.summary.value !== null ? (a.summary.value < 70 ? 1 : 0) : '',
      uneven_profile: a.uneven ? 1 : 0,
      lowest_index: s.minKeys.join('/'),
      n_indexes_below_70: a.belowSeventy.length,
    };
  });
}
