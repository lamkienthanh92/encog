import { useMemo, type MouseEvent } from 'react';
import type { Trajectory } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { fmtNum } from '../../i18n';
import { ChartFrame, Legend } from './ChartFrame';
import { linear, scoreDomainMax, scoreTicks } from './scale';

export interface TrajectoriesProps {
  trajectories: readonly Trajectory[];
}

type Direction = 'up' | 'down' | 'flat';

function directionOf(tr: Trajectory): Direction {
  const d = tr.points[tr.points.length - 1].value - tr.points[0].value;
  return d >= 5 ? 'up' : d <= -5 ? 'down' : 'flat';
}

const MARGIN = { l: 60, r: 18, t: 14, b: 50 } as const;

/** Summary index over months since discharge, one line per child. Hover highlighting is pure CSS. */
export function Trajectories({ trajectories }: TrajectoriesProps) {
  const { t, lang } = useLanguage();
  const height = 340;
  const { xMin, xMax, hi, counts } = useMemo(() => {
    const xs = trajectories.flatMap((tr) => tr.points.map((p) => p.x));
    const maxX = Math.max(12, ...xs);
    const c: Record<Direction, number> = { up: 0, down: 0, flat: 0 };
    trajectories.forEach((tr) => { c[directionOf(tr)] += 1; });
    return {
      xMin: xs.length ? Math.max(0, Math.floor(Math.min(...xs) / 6) * 6) : 0,
      xMax: Math.ceil(maxX / 6) * 6,
      hi: scoreDomainMax(trajectories.flatMap((tr) => tr.points.map((p) => p.value))),
      counts: c,
    };
  }, [trajectories]);
  const xTicks: number[] = [];
  for (let v = xMin; v <= xMax; v += 6) xTicks.push(v);

  return (
    <>
      <Legend items={[
        { key: 'up', label: `${t('cohort.charts.up')} (${counts.up})`, className: 'traj-up', shape: 'line' },
        { key: 'flat', label: `${t('cohort.charts.flat')} (${counts.flat})`, className: 'traj-flat', shape: 'line' },
        { key: 'down', label: `${t('cohort.charts.down')} (${counts.down})`, className: 'traj-down', shape: 'line' },
      ]} />
      <ChartFrame height={height} label={t('cohort.charts.trajectories')}>
        {({ width, showTip, hideTip }) => {
          const bottom = height - MARGIN.b;
          const x = linear(xMin, xMax, MARGIN.l + 8, width - MARGIN.r);
          const y = linear(40, hi, bottom - 6, MARGIN.t);
          return (
            <g>
              <rect x={MARGIN.l} y={y(70)} width={width - MARGIN.l - MARGIN.r} height={bottom - y(70)} className="zone-low" />
              {scoreTicks(hi).map((v) => (
                <g key={v}>
                  <line x1={MARGIN.l} x2={width - MARGIN.r} y1={y(v)} y2={y(v)} className={v === 100 ? 'grid-mean' : 'grid'} />
                  <text x={MARGIN.l - 10} y={y(v) + 4} textAnchor="end" className="tick">{v}</text>
                </g>
              ))}
              {xTicks.map((v) => (
                <g key={v}>
                  <line x1={x(v)} x2={x(v)} y1={bottom} y2={bottom + 5} className="axis-line" />
                  <text x={x(v)} y={bottom + 19} textAnchor="middle" className="tick">{v}</text>
                </g>
              ))}
              <line x1={MARGIN.l} x2={width - MARGIN.r} y1={bottom} y2={bottom} className="axis-line" />
              <text x={(MARGIN.l + width - MARGIN.r) / 2} y={height - 6} textAnchor="middle" className="axis-title">{t('cohort.charts.axisMonths')}</text>
              <text transform={`translate(14 ${(MARGIN.t + bottom) / 2}) rotate(-90)`} textAnchor="middle" className="axis-title">{t('cohort.charts.axisSummary')}</text>
              <g className="traj-layer">
                {trajectories.map((tr) => {
                  const pts = tr.points.map((p) => `${x(p.x)},${y(p.value)}`).join(' ');
                  const values = tr.points.map((p) => `${p.value} (${fmtNum(p.x, 1, lang)})`).join(' → ');
                  return (
                    <g
                      key={tr.id}
                      className={`traj traj-${directionOf(tr)}`}
                      onMouseMove={(e: MouseEvent<SVGElement>) => showTip(e, t('cohort.charts.tipTrajectory', { id: tr.id, values }))}
                      onMouseLeave={hideTip}
                    >
                      <polyline points={pts} className="traj-hit" />
                      <polyline points={pts} className="traj-line" />
                      {tr.points.map((p, i) => <circle key={i} cx={x(p.x)} cy={y(p.value)} r={3.5} className="traj-dot" />)}
                    </g>
                  );
                })}
              </g>
            </g>
          );
        }}
      </ChartFrame>
    </>
  );
}
