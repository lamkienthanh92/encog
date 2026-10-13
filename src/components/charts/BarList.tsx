import type { MouseEvent } from 'react';
import type { Tone } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { fmtNum, fmtPct } from '../../i18n';
import { ChartFrame } from './ChartFrame';
import { linear, textWidth } from './scale';

export interface BarItem {
  key: string;
  label: string;
  value: number;
  tone?: Tone | 'primary';
}

export interface BarListProps {
  items: readonly BarItem[];
  total: number;
  label: string;
  decimals?: number;
}

/** Horizontal bars with count and percentage; full-width track shows the share of the total. */
export function BarList({ items, total, label, decimals = 0 }: BarListProps) {
  const { lang } = useLanguage();
  const rowH = 36;
  const height = items.length * rowH + 6;
  const longest = Math.max(...items.map((i) => textWidth(i.label, 13)));
  return (
    <ChartFrame height={height} label={label}>
      {({ width, showTip, hideTip }) => {
        const labelW = Math.min(Math.max(90, longest + 12), width * 0.42);
        const valueW = 86;
        const x = linear(0, Math.max(1, total), labelW, width - valueW);
        return (
          <g>
            {items.map((it, i) => {
              const y = 4 + i * rowH;
              const pct = total ? it.value / total : 0;
              const text = `${fmtNum(it.value, decimals, lang)} (${fmtPct(pct, lang)}%)`;
              return (
                <g key={it.key} onMouseMove={(e: MouseEvent<SVGElement>) => showTip(e, <><strong>{it.label}</strong><br />{text}</>)} onMouseLeave={hideTip}>
                  <text x={labelW - 10} y={y + 21} textAnchor="end" className="bar-label">{it.label}</text>
                  <rect x={labelW} y={y + 8} width={Math.max(0, x(total) - labelW)} height={18} rx={4} className="bar-track" />
                  <rect x={labelW} y={y + 8} width={Math.max(0, x(it.value) - labelW)} height={18} rx={4} className={`bar tone-fill-${it.tone ?? 'primary'}`} />
                  <text x={width - valueW + 10} y={y + 21} className="value-label">{text}</text>
                </g>
              );
            })}
          </g>
        );
      }}
    </ChartFrame>
  );
}
