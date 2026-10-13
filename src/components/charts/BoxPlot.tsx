import { useMemo, type MouseEvent } from 'react';
import type { BoxStats, ChildPoint } from '../../types';
import { boxStats } from '../../core/stats';
import { useLanguage } from '../../context/LanguageContext';
import { fmtNum } from '../../i18n';
import { ChartFrame } from './ChartFrame';
import { clamp, jitter, linear, scoreDomainMax, scoreTicks } from './scale';

export interface BoxGroup {
  key: string;
  label: string;
  sublabel?: string;
  points: readonly ChildPoint[];
}

export interface BoxPlotProps {
  groups: readonly BoxGroup[];
  label: string;
  showMean?: boolean;
  height?: number;
}

interface PreparedGroup {
  group: BoxGroup;
  stats: BoxStats | null;
  outlierSet: Set<number>;
}

const MARGIN = { l: 60, r: 16, t: 14, b: 58 } as const;
const FLOOR_PAD = 8; // keeps points at 40 off the axis line
const MIN_N_FOR_BOX = 4; // smaller groups show their dots only

/**
 * Box-and-whisker per category, centred on its label, with every child drawn as a
 * jittered dot over the box. Whiskers follow Tukey (1.5 × IQR); outliers get a red ring.
 */
export function BoxPlot({ groups, label, showMean = true, height = 330 }: BoxPlotProps) {
  const { t, lang } = useLanguage();
  const prepared = useMemo<PreparedGroup[]>(() => groups.map((group) => {
    const stats = boxStats(group.points.map((p) => p.value));
    return { group, stats, outlierSet: new Set(stats?.outliers ?? []) };
  }), [groups]);
  const hi = useMemo(() => scoreDomainMax(groups.flatMap((g) => g.points.map((p) => p.value))), [groups]);
  const ticks = scoreTicks(hi);

  return (
    <ChartFrame height={height} label={label}>
      {({ width, showTip, hideTip }) => {
        const bottom = height - MARGIN.b;
        const y = linear(40, hi, bottom - FLOOR_PAD, MARGIN.t);
        const colW = (width - MARGIN.l - MARGIN.r) / Math.max(1, prepared.length);
        const boxW = clamp(colW * 0.42, 28, 96);
        return (
          <g>
            <rect x={MARGIN.l} y={y(70)} width={width - MARGIN.l - MARGIN.r} height={bottom - y(70)} className="zone-low" />
            {ticks.map((v) => (
              <g key={v}>
                <line x1={MARGIN.l} x2={width - MARGIN.r} y1={y(v)} y2={y(v)} className={v === 100 ? 'grid-mean' : 'grid'} />
                <text x={MARGIN.l - 10} y={y(v) + 4} textAnchor="end" className="tick">{v}</text>
              </g>
            ))}
            <line x1={MARGIN.l} x2={width - MARGIN.r} y1={bottom} y2={bottom} className="axis-line" />
            <text transform={`translate(14 ${(MARGIN.t + bottom) / 2}) rotate(-90)`} textAnchor="middle" className="axis-title">
              {t('cohort.charts.axisScore')}
            </text>

            {prepared.map(({ group, stats, outlierSet }, gi) => {
              const cx = MARGIN.l + colW * gi + colW / 2;
              const x0 = cx - boxW / 2;
              const statsTip = stats
                ? t('cohort.charts.tipBox', {
                    n: stats.n, med: fmtNum(stats.median, 1, lang), q1: fmtNum(stats.q1, 1, lang), q3: fmtNum(stats.q3, 1, lang), mean: fmtNum(stats.mean, 1, lang),
                  })
                : '';
              return (
                <g key={group.key}>
                  {/* whole column: hovering anywhere but a dot shows the group statistics */}
                  <rect
                    x={cx - colW / 2 + 4} y={MARGIN.t} width={colW - 8} height={bottom - MARGIN.t} rx={6} className="col-hit"
                    onMouseMove={(e: MouseEvent<SVGElement>) => showTip(e, <><strong>{group.label}{group.sublabel ? ` – ${group.sublabel}` : ''}</strong><br />{statsTip}</>)}
                    onMouseLeave={hideTip}
                  />
                  {stats && stats.n >= MIN_N_FOR_BOX && (
                    <>
                      <line x1={cx} x2={cx} y1={y(stats.upperWhisker)} y2={y(stats.q3)} className="whisker" />
                      <line x1={cx} x2={cx} y1={y(stats.q1)} y2={y(stats.lowerWhisker)} className="whisker" />
                      <line x1={cx - boxW * 0.22} x2={cx + boxW * 0.22} y1={y(stats.upperWhisker)} y2={y(stats.upperWhisker)} className="whisker" />
                      <line x1={cx - boxW * 0.22} x2={cx + boxW * 0.22} y1={y(stats.lowerWhisker)} y2={y(stats.lowerWhisker)} className="whisker" />
                      <rect x={x0} y={y(stats.q3)} width={boxW} height={Math.max(1, y(stats.q1) - y(stats.q3))} rx={4} className="box-body" />
                    </>
                  )}
                  {group.points.map((p, i) => (
                    <circle
                      key={`${p.id}-${i}`}
                      cx={cx + (group.points.length > 1 ? jitter(i, boxW * 0.85) : 0)} cy={y(p.value)} r={3.6}
                      className={stats && stats.n >= MIN_N_FOR_BOX && outlierSet.has(p.value) ? 'pt pt-outlier' : 'pt'}
                      onMouseMove={(e: MouseEvent<SVGElement>) => showTip(e, t('cohort.charts.tipChild', { id: p.id, v: p.value }))}
                      onMouseLeave={hideTip}
                    />
                  ))}
                  {stats && stats.n >= MIN_N_FOR_BOX && (
                    <>
                      <line x1={x0} x2={x0 + boxW} y1={y(stats.median)} y2={y(stats.median)} className="box-median" />
                      {showMean && (
                        <rect x={cx - 5} y={y(stats.mean) - 5} width={10} height={10} transform={`rotate(45 ${cx} ${y(stats.mean)})`} className="box-mean" />
                      )}
                    </>
                  )}
                  <text x={cx} y={bottom + 22} textAnchor="middle" className="cat-label">{group.label}</text>
                  <text x={cx} y={bottom + 40} textAnchor="middle" className="tick">{group.sublabel ?? `n = ${stats?.n ?? 0}`}</text>
                </g>
              );
            })}
          </g>
        );
      }}
    </ChartFrame>
  );
}
