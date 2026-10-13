import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';
import { clamp } from './scale';

export interface ChartApi {
  width: number;
  showTip: (event: MouseEvent<Element>, content: ReactNode) => void;
  hideTip: () => void;
}

export interface ChartFrameProps {
  height: number;
  label: string;
  children: (api: ChartApi) => ReactNode;
}

interface TipState {
  x: number;
  y: number;
  content: ReactNode;
}

export interface TooltipHandle {
  show: (x: number, y: number, content: ReactNode) => void;
  hide: () => void;
}

interface ChartTooltipProps {
  containerWidth: number;
}

/**
 * Tooltip with its own state. Mouse movement only re-renders this small element,
 * never the chart that contains it.
 */
const ChartTooltip = forwardRef<TooltipHandle, ChartTooltipProps>(function ChartTooltip({ containerWidth }, ref) {
  const [tip, setTip] = useState<TipState | null>(null);
  useImperativeHandle(ref, () => ({
    show: (x: number, y: number, content: ReactNode) => setTip({ x, y, content }),
    hide: () => setTip(null),
  }), []);
  if (!tip) return null;
  return (
    <div className="chart-tip" role="tooltip" style={{ left: clamp(tip.x + 14, 0, Math.max(0, containerWidth - 240)), top: Math.max(0, tip.y - 10) }}>
      {tip.content}
    </div>
  );
});

/** Responsive SVG container: measures its width, renders the chart at that width, hosts the tooltip. */
export function ChartFrame({ height, label, children }: ChartFrameProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const tipRef = useRef<TooltipHandle>(null);

  const showTip = useCallback((event: MouseEvent<Element>, content: ReactNode) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    tipRef.current?.show(event.clientX - rect.left, event.clientY - rect.top, content);
  }, [ref]);
  const hideTip = useCallback(() => tipRef.current?.hide(), []);

  return (
    <div className="chart-frame" ref={ref} style={{ minHeight: height }} onMouseLeave={hideTip}>
      {width > 0 && (
        <svg className="chart-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
          {children({ width, showTip, hideTip })}
        </svg>
      )}
      <ChartTooltip ref={tipRef} containerWidth={width} />
    </div>
  );
}

export interface LegendItem {
  key: string;
  label: string;
  className: string;
  shape?: 'dot' | 'line' | 'box' | 'diamond';
}

export function Legend({ items }: { items: readonly LegendItem[] }) {
  return (
    <ul className="legend">
      {items.map((it) => (
        <li key={it.key}>
          <span className={`legend-mark legend-${it.shape ?? 'dot'} ${it.className}`} aria-hidden="true" />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
