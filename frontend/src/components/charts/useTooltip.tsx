import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface Tip { x: number; y: number; content: ReactNode }

/** Shared tooltip state for SVG charts; positions are in container pixels. */
export function useTooltip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const show = (e: React.MouseEvent, content: ReactNode) => {
    const rect = (e.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect() ?? (e.currentTarget as Element).getBoundingClientRect();
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, content });
  };
  const hide = () => setTip(null);
  const node = tip ? <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>{tip.content}</div> : null;
  return { show, hide, node };
}

export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 1000) / 1000);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1000)}k`;
  if (Math.abs(n) >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

/** Width of the chart container, kept in sync with a ResizeObserver so SVG text never stretches. */
export function useWidth(fallback = 600) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}
