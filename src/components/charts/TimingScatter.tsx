import type { MouseEvent } from 'react';
import type { TimingPoint } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { fmtNum } from '../../i18n';
import { ChartFrame, Legend } from './ChartFrame';
import { linear, scoreDomainMax, scoreTicks } from './scale';

export interface TimingScatterProps {
  points: readonly TimingPoint[];
  label: string;
}

const M = { l: 56, r: 16, t: 14, b: 50 } as const;

/** Summary index against months from discharge to assessment; children below 70 drawn in the alert colour. */
export function TimingScatter({ points, label }: TimingScatterProps) {
  const { t, lang } = useLanguage();
  const height = 300;
  const hi = scoreDomainMax(points.map((p) => p.value));
  const ticks = scoreTicks(hi);
  const maxX = Math.max(12, ...points.map((p) => p.months));
  const xMax = Math.ceil(maxX / 6) * 6;
  const xTicks: number[] = [];
  for (let v = 0; v <= xMax; v += 6) xTicks.push(v);
  return (
    <>
      <Legend items={[
        { key: 'low', label: t('cohort.charts.legendBelow'), className: 'tone-fill-low' },
        { key: 'ok', label: t('cohort.charts.legendAbove'), className: 'tone-fill-primary' },
        { key: 'six', label: t('cohort.charts.legendSix'), className: 'legend-ref', shape: 'line' },
      ]} />
      <ChartFrame height={height} label={label}>
        {({ width, showTip, hideTip }) => {
          const x = linear(0, xMax, M.l, width - M.r);
          const y = linear(40, hi, height - M.b, M.t);
          return (
            <g>
              <rect x={M.l} y={y(70)} width={width - M.l - M.r} height={y(40) - y(70)} className="zone-low" />
              {ticks.map((v) => (
                <g key={v}>
                  <line x1={M.l} x2={width - M.r} y1={y(v)} y2={y(v)} className={v === 100 ? 'grid-mean' : 'grid'} />
                  <text x={M.l - 10} y={y(v) + 4} textAnchor="end" className="tick">{v}</text>
                </g>
              ))}
              {xTicks.map((v) => <text key={v} x={x(v)} y={height - M.b + 18} textAnchor="middle" className="tick">{v}</text>)}
              <line x1={x(6)} x2={x(6)} y1={M.t} y2={y(40)} className="ref-line" />
              <line x1={M.l} x2={width - M.r} y1={y(40)} y2={y(40)} className="axis-line" />
              {points.map((p) => (
                <circle
                  key={`${p.id}-${p.months}`} cx={x(p.months)} cy={y(p.value)} r={5.5}
                  className={`dot ${p.value < 70 ? 'tone-fill-low' : 'tone-fill-primary'}`}
                  onMouseMove={(e: MouseEvent<SVGElement>) => showTip(e, t('cohort.charts.tipTiming', { id: p.id, v: p.value, m: fmtNum(p.months, 1, lang) }))}
                  onMouseLeave={hideTip}
                />
              ))}
              <text x={(M.l + width - M.r) / 2} y={height - 8} textAnchor="middle" className="axis-title">{t('cohort.charts.axisMonths')}</text>
              <text transform={`translate(14 ${(M.t + y(40)) / 2}) rotate(-90)`} textAnchor="middle" className="axis-title">{t('cohort.charts.axisSummary')}</text>
            </g>
          );
        }}
      </ChartFrame>
    </>
  );
}
