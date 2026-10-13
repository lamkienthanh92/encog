import type { CaseForm, CompleteAnalysis, ReportKind, Timing } from '../../types';
import { formatPercentile, toneOf, toneOfBand } from '../../core/wisc';
import { formatDate } from '../../core/followup';
import { useLanguage } from '../../context/LanguageContext';
import { fmtNum } from '../../i18n';
import { Badge, Button, Callout, Card, Stat } from '../common/ui';
import { IconAlert, IconFile, IconInfo, IconPrint } from '../common/icons';
import { ScoreRuler } from '../charts/ScoreRuler';
import { Legend } from '../charts/ChartFrame';

export interface ResultPanelProps {
  form: CaseForm;
  analysis: CompleteAnalysis;
  timing: Timing;
  onPrint: (kind: ReportKind) => void;
}

/** Interpretation of one complete assessment. */
export function ResultPanel({ form, analysis, timing, onPrint }: ResultPanelProps) {
  const { t, list, lang } = useLanguage();
  const { selection: s, summary, index } = analysis;
  const params = { spread: s.spread, vp: s.vp, wp: s.wp, t: s.threshold };
  const summaryTone = toneOf(summary.value) ?? 'neutral';

  return (
    <div className="results">
      <div className="kpis">
        <Stat
          label={`${t('kpi.summary')}${s.type !== 'NONE' ? ` (${s.type})` : ''}`}
          value={summary.value ?? (s.type === 'NONE' ? t('kpi.none') : '–')}
          sub={summary.missing ? t('kpi.notEntered', { type: s.type }) : s.type !== 'NONE' ? t(`index.${s.type}.name`) : t('index.NONE.name')}
          tone={summary.value !== null ? summaryTone : 'neutral'}
        />
        <Stat
          label={t('kpi.band')}
          value={summary.band ? <Badge tone={toneOfBand(summary.band)}>{t(`band.${summary.band}`)}</Badge> : '–'}
        />
        <Stat label={t('kpi.percentile')} value={summary.percentile !== null ? `≈ ${formatPercentile(summary.percentile, lang)}` : '–'} sub={t('result.percentileNote')} />
        <Stat
          label={t('kpi.spread')}
          value={<>{s.spread} <small>{t('kpi.points')}</small></>}
          sub={t('kpi.spreadSub', { t: s.threshold })}
          tone={analysis.uneven ? 'border' : 'neutral'}
        />
      </div>

      <Callout tone="info" icon={<IconInfo />}>
        <p>{t(`result.rule.${s.type}`, params)}</p>
        {summary.missing && <p className="strong">{t('result.enterComposite', { type: s.type })}</p>}
      </Callout>
      {analysis.cautions.length > 0 && (
        <Callout tone="warning" icon={<IconAlert />}>
          {analysis.cautions.map((c) => <p key={c}>{t(`result.cautions.${c}`)}</p>)}
        </Callout>
      )}

      <Card
        title={t('result.profileTitle')}
        subtitle={analysis.uneven ? t('result.profileUneven', { max: s.maxKeys.join('/'), min: s.minKeys.join('/') }) : t('result.profileEven')}
        actions={<Legend items={[
          { key: 'i', label: t('result.legendIndex'), className: 'tone-fill-avg', shape: 'dot' },
          { key: 's', label: t('result.legendSummary'), className: 'tone-fill-avg', shape: 'diamond' },
          { key: 'r', label: t('result.legendRange'), className: 'legend-bracket', shape: 'line' },
        ]} />}
        footer={<p className="caption">{t('result.profileCaption')}</p>}
      >
        <ScoreRuler analysis={analysis} />
      </Card>

      <div className="grid-results">
        <Card title={t('result.focusTitle')}>
          {analysis.focus.length === 0 && <p className="muted">{t('result.focusNone')}</p>}
          <div className="focus-list">
            {analysis.focus.map((k) => (
              <div className="focus-item" key={k}>
                <div className="focus-head">
                  <h3>{t(`index.${k}.name`)}</h3>
                  <Badge tone={toneOfBand(analysis.bands[k])}>{k} {index[k]}</Badge>
                </div>
                <ul>{list(`recs.${k}`).map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            ))}
          </div>
        </Card>
        <div className="stack">
          <Card title={t('result.timingTitle')}>
            <ul className="facts">
              {timing.monthsSinceDischarge !== null && <li>{t('result.monthsSince', { m: fmtNum(timing.monthsSinceDischarge, 1, lang) })}</li>}
              {timing.age && <li>{t('result.age', { y: timing.age.years, mo: timing.age.months })}</li>}
              {timing.warnings.map((w) => (
                <li key={w.code} className="is-warning">
                  {w.code === 'earlyAssessment'
                    ? t('result.warnings.earlyAssessment', { m: fmtNum(w.months, 1, lang) })
                    : t('result.warnings.ageOutOfRange', { y: w.years, mo: w.months })}
                </li>
              ))}
              <li className="is-strong">
                {timing.nextDue ? t('result.nextDue', { date: formatDate(timing.nextDue, lang) }) : t('result.noRecheck')}
                {timing.recheckReason && <span className="muted"> {t(`result.nextDueReason.${timing.recheckReason}`)}</span>}
              </li>
              {form.los && <li>{t('result.los', { v: t(`form.los${form.los}`) })}</li>}
            </ul>
          </Card>
          <Card title={t('result.reportsTitle')}>
            <div className="report-buttons">
              <Button variant="primary" icon={<IconPrint />} onClick={() => onPrint('parent')}>{t('result.printParent')}</Button>
              <Button icon={<IconPrint />} onClick={() => onPrint('school')}>{t('result.printSchool')}</Button>
              <Button icon={<IconFile />} onClick={() => onPrint('clinician')}>{t('result.printClinician')}</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
