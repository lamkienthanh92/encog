import type { MouseEvent } from 'react';
import type { Proportion } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { fmtPct } from '../../i18n';
import { ChartFrame } from './ChartFrame';
import { linear, textWidth } from './scale';

export interface ForestRow {
  key: string;
  label: string;
  k: number;
  n: number;
  ci: Proportion;
}

export interface ForestPlotProps {
  rows: readonly ForestRow[];
  label: string;
  reference?: number | null;
  referenceLabel?: string;
}

/** Proportions with 95% intervals, one row per group (forest-plot style). */
export function ForestPlot({ rows, label, reference = null, referenceLabel }: ForestPlotProps) {
  const { t, lang } = useLanguage();
  const rowH = 42;
  const height = rows.length * rowH + 64;
  const longest = Math.max(...rows.map((r) => textWidth(r.label, 13)));
  return (
    <ChartFrame height={height} label={label}>
      {({ width, showTip, hideTip }) => {
        const labelW = Math.min(Math.max(100, longest + 14), width * 0.36);
        const valueW = 110;
        const x = linear(0, 1, labelW, width - valueW);
        const axisY = rows.length * rowH + 16;
        return (
          <g>
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <g key={p}>
                <line x1={x(p)} x2={x(p)} y1={8} y2={axisY} className="grid" />
                <text x={x(p)} y={axisY + 18} textAnchor="middle" className="tick">{fmtPct(p, lang)}%</text>
              </g>
            ))}
            {reference !== null && (
              <g>
                <line x1={x(reference)} x2={x(reference)} y1={4} y2={axisY} className="ref-line" />
                {referenceLabel && <text x={x(reference) + 4} y={axisY - 4} className="ref-label">{referenceLabel}</text>}
              </g>
            )}
            {rows.map((r, i) => {
              const y = 22 + i * rowH;
              const tip = t('cohort.charts.tipGroup', { k: r.k, n: r.n, p: fmtPct(r.ci.p, lang), lo: fmtPct(r.ci.lo, lang), hi: fmtPct(r.ci.hi, lang) });
              return (
                <g key={r.key} onMouseMove={(e: MouseEvent<SVGElement>) => showTip(e, <><strong>{r.label}</strong><br />{tip}</>)} onMouseLeave={hideTip}>
                  <rect x={0} y={y - rowH / 2 + 2} width={width} height={rowH - 4} className="row-hit" />
                  <text x={labelW - 12} y={y + 4} textAnchor="end" className="bar-label">{r.label}</text>
                  {r.ci.p !== null && r.ci.lo !== null && r.ci.hi !== null && (
                    <g className="ci">
                      <line x1={x(r.ci.lo)} x2={x(r.ci.hi)} y1={y} y2={y} />
                      <line x1={x(r.ci.lo)} x2={x(r.ci.lo)} y1={y - 6} y2={y + 6} />
                      <line x1={x(r.ci.hi)} x2={x(r.ci.hi)} y1={y - 6} y2={y + 6} />
                      <circle cx={x(r.ci.p)} cy={y} r={7} />
                    </g>
                  )}
                  <text x={width - valueW + 12} y={y + 4} className="value-label">{r.k}/{r.n} ({fmtPct(r.ci.p, lang)}%)</text>
                </g>
              );
            })}
            <text x={(labelW + width - valueW) / 2} y={height - 6} textAnchor="middle" className="axis-title">{t('cohort.charts.axisPct')}</text>
          </g>
        );
      }}
    </ChartFrame>
  );
}
