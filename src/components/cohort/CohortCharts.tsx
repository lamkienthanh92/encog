import { useMemo, type ChangeEvent } from 'react';
import type { AssociationResult, CohortSummary } from '../../types';
import { BANDS, INDEXES } from '../../core/wisc';
import { useLanguage } from '../../context/LanguageContext';
import { fmtNum, fmtPEq, fmtPct, levelLabel, varLabel } from '../../i18n';
import { Card, Stat } from '../common/ui';
import { BarList } from '../charts/BarList';
import { BoxPlot } from '../charts/BoxPlot';
import { ForestPlot } from '../charts/ForestPlot';
import { Histogram } from '../charts/Histogram';
import { Trajectories } from '../charts/Trajectories';
import { TimingScatter } from '../charts/TimingScatter';
import { OddsForest } from '../charts/OddsForest';
import { ProfileHeatmap } from '../charts/ProfileHeatmap';

export interface CohortChartsProps {
  summary: CohortSummary;
  assoc: AssociationResult | null;
  candidates: readonly string[];
  groupBy: string;
  onGroupBy: (column: string) => void;
}

/** Summary tiles and all cohort charts. */
export function CohortCharts({ summary, assoc, candidates, groupBy, onGroupBy }: CohortChartsProps) {
  const { t, lang } = useLanguage();
  const s = summary;
  const fisher = s.groups?.fisherP;
  const indexGroups = useMemo(
    () => INDEXES.map((k) => ({ key: k, label: k, sublabel: t(`index.${k}.name`), points: s.indexPoints[k] })),
    [s, t],
  );
  const losGroups = useMemo(
    () => [2, 3, 4, 5].map((v) => ({ key: String(v), label: `LOS ${v}`, points: (s.los?.points ?? []).filter((p) => p.los === v) })),
    [s],
  );
  const summaryValues = useMemo(() => s.summaryPoints.map((p) => p.value), [s]);
  const oddsRows = useMemo(() => (assoc?.rows ?? []).map((r) => {
    const name = varLabel(t, r.key);
    const unit = t(`vars.${r.key}.unit`);
    const label = r.kind === 'binary'
      ? t('cohort.charts.versus', { label: name, level: levelLabel(t, r.key, r.level ?? ''), ref: levelLabel(t, r.key, r.reference ?? '') })
      : unit !== `vars.${r.key}.unit` ? t('cohort.charts.perUnit', { label: name, unit }) : name;
    return { key: r.key, label, crude: r.crude, adjusted: r.kind === 'interval' ? undefined : r.adjusted };
  }), [assoc, t]);
  const tm = s.timing;

  return (
    <>
      <div className="kpis kpis-5">
        <Stat label={t('cohort.cards.children')} value={s.children} sub={t('cohort.cards.childrenSub', { rows: s.rows })} />
        <Stat
          label={t('cohort.cards.below70')} tone="low" value={`${fmtPct(s.below70.p, lang)}%`}
          sub={<>{s.below70.k}/{s.below70.n}; {t('cohort.cards.ci', { lo: fmtPct(s.below70.lo, lang), hi: fmtPct(s.below70.hi, lang) })}</>}
        />
        <Stat
          label={t('cohort.cards.uneven')} tone="border" value={`${fmtPct(s.uneven.p, lang)}%`}
          sub={<>{s.uneven.k}/{s.uneven.n}; {t('cohort.cards.unevenSub', { t: 23 })}</>}
        />
        <Stat label={t('cohort.cards.followed')} value={s.trajectories.length} sub={t('cohort.cards.followedSub')} />
        <Stat
          label={t('cohort.cards.followUp')}
          value={fmtNum(s.followUp.median, 1, lang)}
          sub={<>({fmtNum(s.followUp.q1, 1, lang)}–{fmtNum(s.followUp.q3, 1, lang)}) {t('cohort.cards.followUpSub')}</>}
        />
      </div>

      <div className="chart-grid">
        <Card title={t('cohort.charts.distribution')} subtitle={t('cohort.charts.distributionNote')}>
          <Histogram values={summaryValues} />
        </Card>
        <Card title={t('cohort.charts.bands')} subtitle={t('cohort.charts.bandsNote')}>
          <BarList
            label={t('cohort.charts.bands')} total={s.withSummary}
            items={BANDS.map((b) => ({ key: b.key, label: t(`band.${b.key}`), value: s.bandCounts[b.key], tone: b.tone }))}
          />
        </Card>
        <Card title={t('cohort.charts.profile')} subtitle={t('cohort.charts.profileNote')} className="span-2">
          <BoxPlot
            label={t('cohort.charts.profile')}
            groups={indexGroups}
          />
        </Card>
        <Card title={t('cohort.charts.lowest')} subtitle={t('cohort.charts.lowestNote')}>
          <BarList
            label={t('cohort.charts.lowest')} total={s.children} decimals={1}
            items={INDEXES.map((k) => ({ key: k, label: `${k} – ${t(`index.${k}.name`)}`, value: s.lowest[k], tone: 'primary' }))}
          />
        </Card>
        <Card title={t('cohort.charts.types')} subtitle={s.agreement ? t('cohort.charts.agreement', s.agreement) : undefined}>
          <BarList
            label={t('cohort.charts.types')} total={s.children}
            items={(['FSIQ', 'GAI', 'CPI', 'NONE'] as const).map((k) => ({ key: k, label: k === 'NONE' ? t('index.NONE.short') : k, value: s.typeCounts[k], tone: 'primary' }))}
          />
        </Card>
        <Card
          title={t('cohort.charts.groups')}
          subtitle={t('cohort.charts.groupsNote')}
          className="span-2"
          actions={candidates.length > 0 ? (
            <label className="select-inline no-print">
              <span>{t('cohort.charts.groupBy')}</span>
              <select className="input" value={groupBy} onChange={(e: ChangeEvent<HTMLSelectElement>) => onGroupBy(e.target.value)}>
                {candidates.map((c) => <option key={c} value={c}>{varLabel(t, c)}</option>)}
              </select>
            </label>
          ) : undefined}
          footer={fisher !== null && fisher !== undefined ? <p className="caption strong">{t('cohort.charts.fisher', { p: fmtPEq(fisher, lang) })}</p> : undefined}
        >
          {s.groups && s.groups.items.length > 0 ? (
            <ForestPlot
              label={t('cohort.charts.groups')}
              rows={s.groups.items.map((g) => ({ key: g.level, label: levelLabel(t, s.groups?.by ?? '', g.level), k: g.k, n: g.n, ci: g.ci }))}
              reference={s.below70.p} referenceLabel={t('cohort.charts.overall')}
            />
          ) : <p className="muted">{t('cohort.charts.noGroups')}</p>}
        </Card>
        {tm && (
          <Card
            title={t('cohort.charts.timing')} subtitle={t('cohort.charts.timingNote')} className="span-2"
            footer={
              <p className="timing-stats">
                <span>{t('cohort.charts.timingBelow', { m: fmtNum(tm.below.median, 1, lang), q1: fmtNum(tm.below.q1, 1, lang), q3: fmtNum(tm.below.q3, 1, lang) })}</span>
                <span>{t('cohort.charts.timingAbove', { m: fmtNum(tm.above.median, 1, lang), q1: fmtNum(tm.above.q1, 1, lang), q3: fmtNum(tm.above.q3, 1, lang) })}</span>
                <b>{t('cohort.charts.timingP', { p: fmtPEq(tm.p, lang) })}</b>
                <b>{t('cohort.charts.timingRho', { rho: fmtNum(tm.rho, 2, lang), p: fmtPEq(tm.rhoP, lang) })}</b>
              </p>
            }
          >
            <TimingScatter points={tm.points} label={t('cohort.charts.timing')} />
          </Card>
        )}
        <Card
          title={t('cohort.charts.assoc')} subtitle={t('cohort.charts.assocNote')} className="span-2"
          footer={assoc && oddsRows.length ? <p className="caption">{t('cohort.charts.assocEvents', { events: assoc.events, n: assoc.n })}</p> : undefined}
        >
          {oddsRows.length ? <OddsForest rows={oddsRows} label={t('cohort.charts.assoc')} /> : <p className="muted">{t('cohort.charts.assocNone')}</p>}
        </Card>
        {s.profiles.length > 0 && (
          <Card title={`${t('cohort.charts.profiles')}: ${varLabel(t, groupBy)}`} subtitle={t('cohort.charts.profilesNote')} className="span-2">
            <ProfileHeatmap rows={s.profiles} rowLabel={(lv) => levelLabel(t, groupBy, lv)} />
          </Card>
        )}
        <Card title={t('cohort.charts.trajectories')} subtitle={t('cohort.charts.trajectoriesNote')} className="span-2">
          {s.trajectories.length ? <Trajectories trajectories={s.trajectories} /> : <p className="muted">{t('cohort.charts.trajectoriesNone')}</p>}
        </Card>
        {s.los && (
          <Card title={t('cohort.charts.los')} subtitle={t('cohort.charts.losNote')}>
            <BoxPlot
              label={t('cohort.charts.los')} showMean={false} height={300}
              groups={losGroups}
            />
          </Card>
        )}
        {s.fsiq && (
          <Card
            title={t('cohort.charts.sensitivity')} subtitle={t('cohort.charts.sensitivityNote')}
            footer={!s.fsiq.complete ? <p className="caption">{t('cohort.charts.sensitivityIncomplete', { n: s.fsiq.n, total: s.children })}</p> : undefined}
          >
            <ForestPlot
              label={t('cohort.charts.sensitivity')}
              rows={[
                { key: 'rule', label: t('cohort.charts.ruleLabel'), k: s.below70.k, n: s.below70.n, ci: s.below70 },
                { key: 'fsiq', label: t('cohort.charts.fsiqLabel'), k: s.fsiq.k, n: s.fsiq.n, ci: s.fsiq },
                ...(s.excludingCpi ? [{ key: 'nocpi', label: t('cohort.charts.excludingCpiLabel'), k: s.excludingCpi.k, n: s.excludingCpi.n, ci: s.excludingCpi }] : []),
              ]}
            />
          </Card>
        )}
      </div>
    </>
  );
}
