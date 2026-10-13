// ENCOG – printable report content (family, school, clinician) built from one analysis.
import type { CaseForm, CompleteAnalysis, IndexKey, Lang, ReportDoc, ReportKind, ReportSection, Timing, Translate, TranslateList } from '../types';
import { INDEXES, COMPOSITES, classify, formatPercentile } from './wisc';
import { formatDate, parseDate } from './followup';
import { fmtNum } from '../i18n';

export interface ReportContext {
  t: Translate;
  list: TranslateList;
  lang: Lang;
  form: Pick<CaseForm, 'code' | 'assessment' | 'los'>;
  analysis: CompleteAnalysis;
  timing: Timing;
  today?: Date;
}

const indexName = (t: Translate, k: IndexKey): string => t(`index.${k}.name`);

export function buildReport(kind: ReportKind, ctx: ReportContext): ReportDoc {
  const { t, list, lang, form, analysis: a, timing } = ctx;
  const s = a.selection;
  const today = ctx.today ?? new Date();
  const date = formatDate(parseDate(form.assessment), lang);
  const meta = [t('report.generated', { date: formatDate(parseDate(today), lang) })];
  if (form.code) meta.unshift(t('report.childCode', { code: form.code }));
  const sections: ReportSection[] = [];
  const nextLine = timing.nextDue ? t('result.nextDue', { date: formatDate(timing.nextDue, lang) }) : t('result.noRecheck');

  if (kind === 'parent') {
    sections.push({
      heading: t('report.parent.tested'),
      paragraphs: [date ? t('report.parent.testedIntro', { date }) : t('report.parent.testedIntroNoDate')],
      bullets: INDEXES.map((k) => t('report.parent.indexLine', {
        name: indexName(t, k), what: t(`index.${k}.parent`), score: a.index[k], band: t(`band.${a.bands[k]}`).toLowerCase(),
      })),
    });
    const meaning: string[] = [];
    if (s.type === 'NONE') meaning.push(t('report.parent.summaryNone'));
    else if (a.summary.value !== null && a.summary.band) {
      meaning.push(t('report.parent.summaryLine', { type: s.type, value: a.summary.value, band: t(`band.${a.summary.band}`).toLowerCase() }));
    }
    if (a.uneven) meaning.push(t('report.parent.uneven', { max: indexName(t, s.maxKeys[0]).toLowerCase(), min: indexName(t, s.minKeys[0]).toLowerCase() }));
    if (a.summary.value !== null && a.summary.value < 70) meaning.push(t('report.parent.below70'));
    sections.push({ heading: t('report.parent.meaning'), paragraphs: meaning });
    sections.push({
      heading: t('report.parent.help'),
      paragraphs: [t('report.parent.helpGeneral')],
      bullets: a.focus.slice(0, 2).flatMap((k) => list(`recs.${k}`).slice(0, 2)),
    });
    sections.push({ heading: t('report.parent.next'), paragraphs: [nextLine] });
    return { title: t('report.parent.title'), meta, sections, footer: [t('report.parent.footer'), t('disclaimer.short')] };
  }

  if (kind === 'school') {
    const strengths = INDEXES.filter((k) => !a.focus.includes(k) && a.index[k] >= 85).map((k) => indexName(t, k));
    sections.push({ paragraphs: [t('report.school.intro', { code: form.code || '—' })] });
    if (strengths.length) sections.push({ heading: t('report.school.strengths'), bullets: strengths });
    if (a.focus.length) {
      sections.push({ heading: t('report.school.needs'), bullets: a.focus.map((k) => `${indexName(t, k)}: ${t(`index.${k}.parent`)}`) });
      sections.push({ heading: t('report.school.accommodations'), bullets: a.focus.flatMap((k) => list(`recs.${k}`)) });
    } else sections.push({ paragraphs: [t('report.school.none')] });
    return { title: t('report.school.title'), meta, sections, footer: [t('report.school.footer'), t('disclaimer.short')] };
  }

  const compositeRows = COMPOSITES
    .filter((k) => typeof a.scores[k] === 'number' && !a.errors[k])
    .map((k) => {
      const v = a.scores[k] as number;
      const band = classify(v);
      return [`${t(`index.${k}.name`)} (${k})`, String(v), band ? t(`band.${band}`) : '', ''];
    });
  sections.push({
    heading: t('report.clinician.scores'),
    table: {
      head: [t('report.clinician.colIndex'), t('report.clinician.colScore'), t('report.clinician.colBand'), t('report.clinician.colDiff')],
      rows: [
        ...INDEXES.map((k) => [`${indexName(t, k)} (${k})`, String(a.index[k]), t(`band.${a.bands[k]}`), `${a.relative[k] >= 0 ? '+' : ''}${fmtNum(a.relative[k], 1, lang)}`]),
        ...compositeRows,
      ],
    },
  });
  const params = { spread: s.spread, vp: s.vp, wp: s.wp, t: s.threshold };
  const decision = [t(`result.rule.${s.type}`, params), t('report.clinician.discrepancies', params)];
  if (a.summary.value !== null && a.summary.band) {
    decision.push(`${s.type} = ${a.summary.value}, ${t(`band.${a.summary.band}`)}; ${t('report.clinician.percentile', { p: formatPercentile(a.summary.percentile, lang) })}`);
  } else if (a.summary.missing) decision.push(t('result.enterComposite', { type: s.type }));
  decision.push(t('report.clinician.ref'));
  sections.push({ heading: t('report.clinician.decision'), paragraphs: decision });

  const timingLines: string[] = [];
  if (timing.monthsSinceDischarge !== null) timingLines.push(t('result.monthsSince', { m: fmtNum(timing.monthsSinceDischarge, 1, lang) }));
  if (timing.age) timingLines.push(t('result.age', { y: timing.age.years, mo: timing.age.months }));
  for (const w of timing.warnings) {
    timingLines.push(w.code === 'earlyAssessment'
      ? t('result.warnings.earlyAssessment', { m: fmtNum(w.months, 1, lang) })
      : t('result.warnings.ageOutOfRange', { y: w.years, mo: w.months }));
  }
  timingLines.push(timing.recheckReason ? `${nextLine} ${t(`result.nextDueReason.${timing.recheckReason}`)}` : nextLine);
  if (form.los) timingLines.push(t('result.los', { v: t(`form.los${form.los}`) }));
  sections.push({ heading: t('report.clinician.timing'), paragraphs: timingLines });
  if (a.cautions.length) sections.push({ heading: t('report.clinician.cautions'), bullets: a.cautions.map((c) => t(`result.cautions.${c}`)) });
  return { title: t('report.clinician.title'), meta, sections, footer: [t('disclaimer.full')] };
}
