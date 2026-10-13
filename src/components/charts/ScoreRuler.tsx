import type { MouseEvent } from 'react';
import type { CompleteAnalysis } from '../../types';
import { BANDS, INDEXES, SCORE_MAX, SCORE_MIN, toneOf } from '../../core/wisc';
import { useLanguage } from '../../context/LanguageContext';
import { ChartFrame } from './ChartFrame';
import { SCORE_TICKS, SCORE_TICKS_SHORT, linear, textWidth } from './scale';

export interface ScoreRulerProps {
  analysis: CompleteAnalysis;
}

/** Four indexes (and the summary index) on the 40–160 standard-score scale. */
export function ScoreRuler({ analysis }: ScoreRulerProps) {
  const { t } = useLanguage();
  const { index, selection, summary } = analysis;
  const hasSummary = summary.value !== null;
  const rowH = 44;
  const top = 92;
  const rows = INDEXES.length + (hasSummary ? 1 : 0);
  const axisY = top + rows * rowH - 10;
  const height = axisY + 34;
  const label = `${INDEXES.map((k) => `${k} ${index[k]}`).join(', ')}. ${t('result.spread', { spread: selection.spread })}`;

  return (
    <ChartFrame height={height} label={label}>
      {({ width, showTip, hideTip }) => {
        const labelW = width < 560 ? 84 : 168;
        const ticks = width < 480 ? SCORE_TICKS_SHORT : SCORE_TICKS;
        const x = linear(SCORE_MIN, SCORE_MAX, labelW + 8, width - 18);
        const xc = (v: number): number => x(Math.max(SCORE_MIN, Math.min(SCORE_MAX, v)));
        const uneven = selection.spread >= selection.threshold;
        const thrX = selection.min + selection.threshold <= SCORE_MAX ? xc(selection.min + selection.threshold) : null;
        const rowY = (i: number): number => top + i * rowH + 12;
        return (
          <g>
            {/* band strip with names */}
            {BANDS.map((b) => {
              const from = b.min === -Infinity ? SCORE_MIN : b.min - 0.5;
              const to = b.max === Infinity ? SCORE_MAX : b.max + 0.5;
              const x0 = xc(from);
              const w = xc(to) - x0;
              const name = t(`band.${b.key}`);
              return (
                <g key={b.key}>
                  <rect x={x0} y={8} width={w} height={22} className={`band-fill tone-soft-${b.tone}`} />
                  {w > textWidth(name, 11) + 8 && <text x={x0 + w / 2} y={23} textAnchor="middle" className={`band-name tone-text-${b.tone}`}>{name}</text>}
                </g>
              );
            })}
            {/* vertical grid */}
            {ticks.map((v) => (
              <line key={v} x1={xc(v)} x2={xc(v)} y1={30} y2={axisY} className={v === 100 ? 'grid-mean' : 'grid'} />
            ))}
            {/* spread bracket */}
            <g className={uneven ? 'bracket is-uneven' : 'bracket'}>
              <path d={`M${xc(selection.min)} 66 V58 H${xc(selection.max)} V66`} />
              <text x={(xc(selection.min) + xc(selection.max)) / 2} y={51} textAnchor="middle">
                {t('result.spread', { spread: selection.spread })}
              </text>
            </g>
            {thrX !== null && (
              <g className="threshold">
                <line x1={thrX} x2={thrX} y1={70} y2={axisY} />
                <text x={thrX + 5} y={82}>{t('result.thresholdMark', { t: selection.threshold })}</text>
              </g>
            )}
            {/* rows */}
            {INDEXES.map((k, i) => {
              const y = rowY(i);
              const tone = toneOf(index[k]) ?? 'avg';
              return (
                <g key={k}>
                  <text x={0} y={y - 2} className="row-key">{k}</text>
                  {width >= 560 && <text x={0} y={y + 14} className="row-name">{t(`index.${k}.name`)}</text>}
                  <text x={labelW - 6} y={y + 6} textAnchor="end" className="row-value">{index[k]}</text>
                  <line x1={labelW + 8} x2={width - 18} y1={y} y2={y} className="row-track" />
                  <circle
                    cx={xc(index[k])} cy={y} r={9} className={`dot tone-fill-${tone}`}
                    onMouseMove={(e: MouseEvent<SVGElement>) => showTip(e, <><strong>{k} – {t(`index.${k}.name`)}</strong><br />{index[k]} ({t(`band.${analysis.bands[k]}`)})</>)}
                    onMouseLeave={hideTip}
                  />
                </g>
              );
            })}
            {hasSummary && summary.value !== null && (
              <g>
                <text x={0} y={rowY(4) - 2} className="row-key is-summary">{summary.type}</text>
                {width >= 560 && <text x={0} y={rowY(4) + 14} className="row-name">{t(`index.${summary.type}.name`)}</text>}
                <text x={labelW - 6} y={rowY(4) + 6} textAnchor="end" className="row-value is-summary">{summary.value}</text>
                <line x1={labelW + 8} x2={width - 18} y1={rowY(4)} y2={rowY(4)} className="row-track" />
                <rect
                  x={xc(summary.value) - 9} y={rowY(4) - 9} width={18} height={18} rx={2}
                  transform={`rotate(45 ${xc(summary.value)} ${rowY(4)})`}
                  className={`diamond tone-fill-${toneOf(summary.value) ?? 'avg'}`}
                  onMouseMove={(e: MouseEvent<SVGElement>) => showTip(e, <><strong>{summary.type}</strong><br />{summary.value}{summary.band ? ` (${t(`band.${summary.band}`)})` : ''}</>)}
                  onMouseLeave={hideTip}
                />
              </g>
            )}
            {/* axis */}
            <line x1={labelW + 8} x2={width - 18} y1={axisY} y2={axisY} className="axis-line" />
            {ticks.map((v) => (
              <text key={v} x={xc(v)} y={axisY + 18} textAnchor="middle" className="tick">{v}</text>
            ))}
          </g>
        );
      }}
    </ChartFrame>
  );
}
