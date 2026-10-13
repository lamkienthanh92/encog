import type { MouseEvent } from 'react';
import { histogram } from '../../core/stats';
import { toneOf } from '../../core/wisc';
import { useLanguage } from '../../context/LanguageContext';
import { fmtPct } from '../../i18n';
import { ChartFrame } from './ChartFrame';
import { countTicks, linear } from './scale';

export interface HistogramProps {
  values: readonly number[];
}

/** Distribution of the summary index in 10-point bins, coloured by band, with the 70 cut-off. */
export function Histogram({ values }: HistogramProps) {
  const { t, lang } = useLanguage();
  const bins = histogram(values);
  const ticks = countTicks(Math.max(...bins.map((b) => b.count)));
  const height = 280;
  const m = { l: 48, r: 16, t: 18, b: 52 };
  return (
    <ChartFrame height={height} label={t('cohort.charts.distribution')}>
      {({ width, showTip, hideTip }) => {
        const x = linear(40, 160, m.l, width - m.r);
        const y = linear(0, ticks[ticks.length - 1], height - m.b, m.t);
        const bw = x(50) - x(40);
        return (
          <g>
            {ticks.map((v) => (
              <g key={v}>
                <line x1={m.l} x2={width - m.r} y1={y(v)} y2={y(v)} className="grid" />
                <text x={m.l - 8} y={y(v) + 4} textAnchor="end" className="tick">{v}</text>
              </g>
            ))}
            {bins.map((b) => {
              const h = y(0) - y(b.count);
              return (
                <g key={b.from}>
                  <rect
                    x={x(b.from) + 2} y={y(b.count)} width={Math.max(0, bw - 4)} height={Math.max(0, h)} rx={3}
                    className={`bar tone-fill-${toneOf(b.from + 5) ?? 'avg'}`}
                    onMouseMove={(e: MouseEvent<SVGElement>) => showTip(e, t('cohort.charts.tipBin', { from: b.from, to: b.to - 1, n: b.count, p: fmtPct(values.length ? b.count / values.length : 0, lang) }))}
                    onMouseLeave={hideTip}
                  />
                  {b.count > 0 && <text x={x(b.from) + bw / 2} y={y(b.count) - 5} textAnchor="middle" className="value-label">{b.count}</text>}
                </g>
              );
            })}
            <line x1={x(70)} x2={x(70)} y1={m.t - 6} y2={y(0)} className="cut-line" />
            <text x={x(70) + 5} y={m.t + 4} className="cut-label">70</text>
            <line x1={m.l} x2={width - m.r} y1={y(0)} y2={y(0)} className="axis-line" />
            {[40, 60, 80, 100, 120, 140, 160].map((v) => (
              <text key={v} x={x(v)} y={y(0) + 18} textAnchor="middle" className="tick">{v}</text>
            ))}
            <text x={(m.l + width - m.r) / 2} y={height - 8} textAnchor="middle" className="axis-title">{t('cohort.charts.axisSummary')}</text>
            <text transform={`translate(13 ${(m.t + y(0)) / 2}) rotate(-90)`} textAnchor="middle" className="axis-title">{t('cohort.charts.axisCount')}</text>
          </g>
        );
      }}
    </ChartFrame>
  );
}
