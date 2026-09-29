import type { ReactNode } from 'react';
import { useTooltip, useWidth, niceTicks, compact } from './useTooltip';

export interface BarSeries { key: string; label: string; color: string }

interface Props<T extends object> {
  data: T[];
  xKey: string;
  series: BarSeries[];
  height?: number;
  format?: (v: number) => string;
  tooltip?: (d: T) => ReactNode;
  highlightIndex?: number;
  xLabel?: (d: T) => string;
}

/** Grouped column chart. Bars are capped at 24px, rounded at the data end, with a 2px surface gap. */
export default function BarChart<T extends object>({ data, xKey, series, height = 180, format = compact, tooltip, highlightIndex, xLabel }: Props<T>) {
  const { show, hide, node } = useTooltip();
  const { ref, width } = useWidth();
  const W = width, H = height, padL = 40, padR = 8, padT = 12, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number((d as Record<string, unknown>)[s.key]) || 0)));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const y = (v: number) => padT + plotH - (v / top) * plotH;
  const band = plotW / Math.max(1, data.length);
  const gap = 2;
  const barW = Math.min(24, (band * 0.7 - gap * (series.length - 1)) / series.length);
  const groupW = barW * series.length + gap * (series.length - 1);

  if (data.length === 0) return null;

  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ height, width: '100%' }}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} />
            <text className="chart-axis" x={padL - 6} y={y(t) + 3.5} textAnchor="end">{format(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x0 = padL + band * i + (band - groupW) / 2;
          const dim = highlightIndex !== undefined && highlightIndex !== i;
          return (
            <g key={i} opacity={dim ? 0.45 : 1}>
              {series.map((s, si) => {
                const v = Number((d as Record<string, unknown>)[s.key]) || 0;
                const h = Math.max(0, padT + plotH - y(v));
                const x = x0 + si * (barW + gap);
                const r = Math.min(4, h / 2);
                const path = h <= 0 ? '' : `M${x},${padT + plotH} v${-(h - r)} a${r},${r} 0 0 1 ${r},${-r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} z`;
                return (
                  <g key={s.key}>
                    <rect x={x - 2} y={padT} width={barW + 4} height={plotH} fill="transparent"
                      onMouseMove={(e) => show(e, tooltip ? tooltip(d) : <><b>{s.label}</b><br />{format(v)}</>)} onMouseLeave={hide} />
                    <path d={path} fill={s.color} pointerEvents="none" />
                  </g>
                );
              })}
              <text className="chart-axis" x={x0 + groupW / 2} y={H - 8} textAnchor="middle">{xLabel ? xLabel(d) : String((d as Record<string, unknown>)[xKey])}</text>
            </g>
          );
        })}
        <line className="chart-grid" x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} style={{ stroke: 'var(--border-strong)' }} />
      </svg>
      {node}
    </div>
  );
}
