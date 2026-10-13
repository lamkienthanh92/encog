/** Shared type declarations for ENCOG. */

export type IndexKey = 'VCI' | 'PRI' | 'WMI' | 'PSI';
export type CompositeKey = 'FSIQ' | 'GAI' | 'CPI';
export type ScoreKey = IndexKey | CompositeKey;
export type SummaryType = CompositeKey | 'NONE';
export type BandKey = 'extremelyLow' | 'borderline' | 'lowAverage' | 'average' | 'highAverage' | 'high' | 'veryHigh';
export type Tone = 'low' | 'border' | 'lowavg' | 'avg' | 'high';
export type ScoreError = 'missing' | 'notNumber' | 'outOfRange' | 'notInteger';
export type RawValue = string | number | null | undefined;
export type Lang = 'vi' | 'en';

/** Parsed score: number, null (empty) or NaN (not a number). */
export type Scores = Record<ScoreKey, number | null>;
export type ScoreErrors = Partial<Record<ScoreKey, ScoreError>>;

export type SelectionReason = 'unitary' | 'fsiqNotUnitary' | 'gaiNotUnitary' | 'noUnitary';

export interface Selection {
  type: SummaryType;
  reason: SelectionReason;
  spread: number;
  vp: number;
  wp: number;
  max: number;
  min: number;
  maxKeys: IndexKey[];
  minKeys: IndexKey[];
  threshold: number;
}

export type Caution = 'cpiCaution' | 'noSummary' | 'adaptiveBehaviour';

export interface SummaryResult {
  type: SummaryType;
  value: number | null;
  missing: boolean;
  band: BandKey | null;
  percentile: number | null;
}

export interface IncompleteAnalysis {
  complete: false;
  scores: Scores;
  errors: ScoreErrors;
}

export interface CompleteAnalysis {
  complete: true;
  scores: Scores;
  errors: ScoreErrors;
  /** Validated index scores (always numbers when complete). */
  index: Record<IndexKey, number>;
  selection: Selection;
  summary: SummaryResult;
  uneven: boolean;
  indexMean: number;
  relative: Record<IndexKey, number>;
  belowSeventy: IndexKey[];
  focus: IndexKey[];
  bands: Record<IndexKey, BandKey>;
  cautions: Caution[];
}

export type Analysis = IncompleteAnalysis | CompleteAnalysis;

export interface AgeYM {
  years: number;
  months: number;
  totalMonths: number;
}

export type DateField = 'birth' | 'discharge' | 'assessment';
export type TimingErrorCode = 'badDate' | 'dischargeBeforeBirth' | 'assessmentBeforeDischarge';

export interface TimingError {
  code: TimingErrorCode;
  field: DateField;
}

export type TimingWarning =
  | { code: 'earlyAssessment'; months: number }
  | { code: 'ageOutOfRange'; years: number; months: number };

export type RecheckReason = 'lowSummary' | 'uneven' | 'lowIndex';

export interface Timing {
  monthsSinceDischarge: number | null;
  age: AgeYM | null;
  warnings: TimingWarning[];
  errors: TimingError[];
  nextDue: Date | null;
  recheckReason: RecheckReason | null;
}

export interface DateInputs {
  birth?: string | Date | null;
  discharge?: string | Date | null;
  assessment?: string | Date | null;
}

/** Everything typed into the single-child form (kept as strings). */
export interface CaseForm {
  code: string;
  birth: string;
  discharge: string;
  assessment: string;
  VCI: string;
  PRI: string;
  WMI: string;
  PSI: string;
  FSIQ: string;
  GAI: string;
  CPI: string;
  los: string;
  threshold: string;
}

/* ---------- CSV / cohort ---------- */

export interface CsvRow {
  line: number;
  values: Record<string, string>;
}

export interface ParsedCsv {
  headers: string[];
  rows: CsvRow[];
  delimiter: string;
}

export type CohortField =
  | 'id' | 'birth_date' | 'discharge_date' | 'assessment_date'
  | IndexKey | CompositeKey | 'reported_type' | 'los' | 'mrs';

export type IssueLevel = 'error' | 'warning';
export type IssueCode =
  | ScoreError | TimingErrorCode | 'earlyAssessment' | 'ageOutOfRange'
  | 'unknownType' | 'typeMismatch' | 'summaryMissing' | 'losRange' | 'mrsRange' | 'missingId' | 'duplicate'
  | 'unknownLevel' | 'numericNotNumber' | 'numericRange';

export interface Issue {
  level: IssueLevel;
  code: IssueCode;
  field?: string;
  params?: Record<string, string | number>;
}

export interface CohortRecord {
  line: number;
  id: string;
  dates: { birth: Date | null; discharge: Date | null; assessment: Date | null };
  analysis: Analysis;
  timing: Timing;
  reportedType: SummaryType | null;
  los: number | null;
  mrs: number | null;
  /** Grouping values keyed by GroupColumn.key; known variables hold canonical English codes. */
  groups: Record<string, string>;
  /** Numeric clinical variables keyed by NumericColumn.key (null when empty or invalid). */
  numeric: Record<string, number | null>;
  issues: Issue[];
}

/** A grouping column: known variables use their canonical English key and coded values. */
export interface GroupColumn {
  /** Canonical English key (e.g. discharge_status) or, for unknown columns, the original header. */
  key: string;
  /** Header as written in the uploaded file. */
  header: string;
  /** True when the column is a known categorical variable with coded levels. */
  known: boolean;
}

/** A numeric exposure column (known clinical variable, or an unknown column holding numbers). */
export interface NumericColumn {
  key: string;
  header: string;
  known: boolean;
}

export interface BuildResult {
  records: CohortRecord[];
  mapping: Partial<Record<CohortField, string>>;
  groupColumns: GroupColumn[];
  numericColumns: NumericColumn[];
  missingRequired: IndexKey[];
}

export interface Proportion {
  p: number | null;
  lo: number | null;
  hi: number | null;
}

export interface Count extends Proportion {
  k: number;
  n: number;
}

export interface Describe {
  n: number;
  mean: number | null;
  sd: number | null;
  median: number | null;
  q1: number | null;
  q3: number | null;
  min: number | null;
  max: number | null;
}

/** Tukey box-plot statistics (whiskers reach the most extreme value within 1.5 × IQR). */
export interface BoxStats {
  n: number;
  q1: number;
  median: number;
  q3: number;
  mean: number;
  lowerWhisker: number;
  upperWhisker: number;
  outliers: number[];
}

export interface GroupStat {
  level: string;
  n: number;
  k: number;
  ci: Proportion;
  stats: Describe;
}

export interface TrajectoryPoint {
  x: number;
  value: number;
  type: SummaryType;
}

export interface Trajectory {
  id: string;
  points: TrajectoryPoint[];
}

export interface ChildPoint {
  id: string;
  value: number;
}

export interface LosPoint extends ChildPoint {
  los: number;
}

export interface CohortSummary {
  rows: number;
  children: number;
  withSummary: number;
  below70: Count;
  typeCounts: Record<SummaryType, number>;
  bandCounts: Record<BandKey, number>;
  indexStats: Record<IndexKey, Describe & { below70: number }>;
  indexPoints: Record<IndexKey, ChildPoint[]>;
  uneven: Count;
  lowest: Record<IndexKey, number>;
  agreement: { k: number; n: number } | null;
  fsiq: (Count & { complete: boolean }) | null;
  los: { counts: Record<number, number>; points: LosPoint[] } | null;
  followUp: Describe;
  summaryPoints: ChildPoint[];
  trajectories: Trajectory[];
  groups: { by: string; items: GroupStat[]; fisherP: number | null } | null;
  issueCounts: { errors: number; warnings: number; rowsWithIssues: number };
  /** Proportion below 70 after excluding children whose summary index is the CPI. */
  excludingCpi: Count | null;
  /** Discharge-to-assessment interval by outcome, and its correlation with the summary index. */
  timing: TimingSummary | null;
  /** Median index scores per level of the grouping column. */
  profiles: ProfileRow[];
}

export interface TimingPoint {
  id: string;
  months: number;
  value: number;
}

export interface TimingSummary {
  below: Describe;
  above: Describe;
  p: number | null;
  rho: number | null;
  rhoP: number | null;
  points: TimingPoint[];
}

export interface ProfileRow {
  level: string;
  n: number;
  medians: Record<IndexKey | 'summary', number | null>;
}

export interface OddsEstimate {
  or: number;
  lo: number | null;
  hi: number | null;
  p: number | null;
}

export interface AssociationRow {
  /** Variable key (canonical English key or original header). */
  key: string;
  kind: 'binary' | 'numeric' | 'interval';
  /** For binary variables: level compared against the reference level. */
  level?: string;
  reference?: string;
  n: number;
  events: number;
  crude: OddsEstimate | null;
  adjusted: OddsEstimate | null;
}

export interface AssociationResult {
  rows: AssociationRow[];
  /** Number of children with the outcome and an assessment interval (adjusted models). */
  events: number;
  n: number;
}

/* ---------- reports ---------- */

export type ReportKind = 'parent' | 'school' | 'clinician';

export interface ReportSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
}

export interface ReportDoc {
  title: string;
  meta: string[];
  sections: ReportSection[];
  footer: string[];
}

export type Params = Record<string, string | number>;
export type Translate = (key: string, params?: Params) => string;
export type TranslateList = (key: string) => string[];
