import type { MouseEvent } from 'react';
import type { OddsEstimate } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { fmtNum, fmtPEq } from '../../i18n';
import { ChartFrame, Legend } from './ChartFrame';
import { clamp, textWidth } from './scale';

export interface OddsRow {
  key: string;
  label: string;
  crude: OddsEstimate | null;
  /** undefined = no adjusted model for this row (e.g. the interval itself). */
  adjusted?: OddsEstimate | null;
}

export interface OddsForestProps {
  rows: readonly OddsRow[];
  label: string;
}

const NICE = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];

/** Odds ratios on a log axis: crude (circle) and interval-adjusted (square) per exposure. */
export function OddsForest({ rows, label }: OddsForestProps) {
  const { t, lang } = useLanguage();
  const lineH = 22;
  const rowH = (r: OddsRow): number => (r.adjusted === undefined ? lineH + 14 : 2 * lineH + 14);
  const offsets = rows.reduce<number[]>((acc, _r, i) => [...acc, i === 0 ? 0 : acc[i - 1] + rowH(rows[i - 1])], []);
  const height = rows.reduce((a, r) => a + rowH(r), 0) + 56;
  const ends = rows.flatMap((r) => [r.crude, r.adjusted]).flatMap((e) => (e ? [e.lo ?? e.or, e.hi ?? e.or, e.or] : []));
  const lo = clamp(Math.min(0.5, ...ends) * 0.8, 0.01, 1);
  const hi = clamp(Math.max(2, ...ends) * 1.25, 1, 500);
  const ticks = NICE.filter((v) => v >= lo && v <= hi);
  const longest = Math.max(...rows.map((r) => textWidth(r.label, 13)));
  const fmtOr = (v: number | null): string => (v === null ? '∞' : v >= 100 ? fmtNum(v, 0, lang) : v >= 10 ? fmtNum(v, 1, lang) : fmtNum(v, 2, lang));
  const est = (e: OddsEstimate | null): string => (e ? `${fmtOr(e.or)} (${fmtOr(e.lo)}–${fmtOr(e.hi)}); p ${fmtPEq(e.p, lang)}` : '–');
  return (
    <>
      <Legend items={[
        { key: 'crude', label: t('cohort.charts.crude'), className: 'tone-fill-primary' },
        { key: 'adj', label: t('cohort.charts.adjusted'), className: 'tone-fill-ink', shape: 'box' },
      ]} />
      <ChartFrame height={height} label={label}>
        {({ width, showTip, hideTip }) => {
          const labelW = Math.min(Math.max(120, longest + 16), width * 0.34);
          const valueW = width < 560 ? 0 : 190;
          const x0 = labelW; const x1 = width - valueW - 8;
          const x = (v: number): number => x0 + ((Math.log(clamp(v, lo, hi)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * (x1 - x0);
          const axisY = height - 48;
          const mark = (e: OddsEstimate | null, yy: number, kind: 'crude' | 'adj') => {
            if (!e) return <text x={x(1) + 6} y={yy + 4} className="tick">{t('cohort.charts.notEstimable')}</text>;
            const l = e.lo ?? lo; const h = e.hi ?? hi;
            return (
              <g className={`or-mark or-${kind}`}>
                <line x1={x(l)} x2={x(h)} y1={yy} y2={yy} />
                {e.hi === null && <path d={`M ${x(hi) - 6} ${yy - 4} L ${x(hi)} ${yy} L ${x(hi) - 6} ${yy + 4}`} />}
                {kind === 'crude' ? <circle cx={x(e.or)} cy={yy} r={5.5} /> : <rect x={x(e.or) - 5} y={yy - 5} width={10} height={10} />}
              </g>
            );
          };
          return (
            <g>
              {ticks.map((v) => (
                <g key={v}>
                  <line x1={x(v)} x2={x(v)} y1={4} y2={axisY} className={v === 1 ? 'ref-line' : 'grid'} />
                  <text x={x(v)} y={axisY + 18} textAnchor="middle" className="tick">{fmtNum(v, v < 1 ? (v < 0.1 ? 2 : 1) : 0, lang)}</text>
                </g>
              ))}
              {rows.map((r, i) => {
                const y = 8 + offsets[i] + lineH * 0.6;
                const tip = <><strong>{r.label}</strong><br />{t('cohort.charts.crude')}: {est(r.crude)}{r.adjusted !== undefined && <><br />{t('cohort.charts.adjusted')}: {est(r.adjusted)}</>}</>;
                return (
                  <g key={r.key} onMouseMove={(e: MouseEvent<SVGElement>) => showTip(e, tip)} onMouseLeave={hideTip}>
                    <rect x={0} y={y - lineH * 0.6} width={width} height={rowH(r) - 6} className="row-hit" />
                    <text x={labelW - 12} y={y + 4} textAnchor="end" className="bar-label">{r.label}</text>
                    {mark(r.crude, y, 'crude')}
                    {r.adjusted !== undefined && mark(r.adjusted, y + lineH, 'adj')}
                    {valueW > 0 && <text x={width - valueW + 4} y={y + 4} className="value-label">{est(r.crude)}</text>}
                    {valueW > 0 && r.adjusted !== undefined && <text x={width - valueW + 4} y={y + lineH + 4} className="value-label">{est(r.adjusted)}</text>}
                  </g>
                );
              })}
              <text x={(x0 + x1) / 2} y={height - 6} textAnchor="middle" className="axis-title">{t('cohort.charts.axisOr')}</text>
            </g>
          );
        }}
      </ChartFrame>
    </>
  );
}
