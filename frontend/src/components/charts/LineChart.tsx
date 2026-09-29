import type { ReactNode } from 'react';
import { useTooltip, useWidth, niceTicks, compact } from './useTooltip';

export interface LineSeries { key: string; label: string; color: string; area?: boolean; dashed?: boolean }

interface Props<T extends object> {
  data: T[];
  xKey: string;
  series: LineSeries[];
  height?: number;
  format?: (v: number) => string;
  tooltip?: (d: T) => ReactNode;
  xLabel?: (d: T, i: number) => string;
}

export default function LineChart<T extends object>({ data, xKey, series, height = 180, format = compact, tooltip, xLabel }: Props<T>) {
  const { show, hide, node } = useTooltip();
  const { ref, width } = useWidth();
  const W = width, H = height, padL = 40, padR = 14, padT = 12, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number((d as Record<string, unknown>)[s.key]) || 0)));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const y = (v: number) => padT + plotH - (v / top) * plotH;
  const x = (i: number) => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const step = plotW / Math.max(1, data.length - 1);

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
        {series.map((s) => {
          const pts = data.map((d, i) => [x(i), y(Number((d as Record<string, unknown>)[s.key]) || 0)] as const);
          const line = pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px},${py}`).join(' ');
          const area = `${line} L${pts[pts.length - 1][0]},${padT + plotH} L${pts[0][0]},${padT + plotH} Z`;
          return (
            <g key={s.key}>
              {s.area && <path d={area} fill={s.color} opacity={0.1} />}
              <path d={line} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '4 4' : undefined} />
              {pts.map(([px, py], i) => (
                <circle key={i} cx={px} cy={py} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              ))}
            </g>
          );
        })}
        {data.map((d, i) => (
          <g key={i}>
            <rect x={x(i) - step / 2} y={padT} width={step} height={plotH} fill="transparent"
              onMouseMove={(e) => show(e, tooltip ? tooltip(d) : (
                <>{series.map((s) => <div key={s.key}><b>{s.label}</b> {format(Number((d as Record<string, unknown>)[s.key]) || 0)}</div>)}</>
              ))} onMouseLeave={hide} />
            {(data.length <= 8 || i % Math.ceil(data.length / 8) === 0) && (
              <text className="chart-axis" x={x(i)} y={H - 8} textAnchor="middle">{xLabel ? xLabel(d, i) : String((d as Record<string, unknown>)[xKey])}</text>
            )}
          </g>
        ))}
      </svg>
      {node}
    </div>
  );
}
