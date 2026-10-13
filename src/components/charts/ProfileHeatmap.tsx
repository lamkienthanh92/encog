import type { ProfileRow } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { fmtNum } from '../../i18n';

export interface ProfileHeatmapProps {
  rows: readonly ProfileRow[];
  rowLabel: (level: string) => string;
}

const COLS = ['VCI', 'PRI', 'WMI', 'PSI', 'summary'] as const;

/** Shade from dark (45) to white (100): a single-hue sequential scale. */
function shade(v: number | null): { background: string; color: string } {
  if (v === null) return { background: 'var(--subtle)', color: 'var(--text-3)' };
  const f = Math.max(0, Math.min(1, (v - 45) / 55));
  const light = 30 + f * 66; // HSL lightness 30% → 96%
  return { background: `hsl(176 42% ${light}%)`, color: light < 58 ? '#fff' : 'var(--text)' };
}

/** Median index scores per group as a shaded table (values < 70 in bold). */
export function ProfileHeatmap({ rows, rowLabel }: ProfileHeatmapProps) {
  const { t, lang } = useLanguage();
  return (
    <div className="table-wrap heat-wrap">
      <table className="table heat">
        <thead>
          <tr>
            <th>{t('cohort.charts.colGroup')}</th>
            <th className="c">n</th>
            {COLS.map((c) => <th key={c} className="c">{c === 'summary' ? t('cohort.charts.colSummary') : c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.level}>
              <td>{rowLabel(r.level)}</td>
              <td className="c num">{r.n}</td>
              {COLS.map((c) => {
                const v = r.medians[c];
                return (
                  <td key={c} className="c heat-cell" style={shade(v)}>
                    {v === null ? '–' : <span className={v < 70 ? 'strong' : undefined}>{fmtNum(v, Number.isInteger(v) ? 0 : 1, lang)}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
