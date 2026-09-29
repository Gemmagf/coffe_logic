import type { ReactNode } from 'react';

interface Row { label: ReactNode; sub?: ReactNode; value: number; display?: ReactNode; color?: string }

/** Ranked horizontal bars (top-N lists). Values are labeled directly, so no axis is needed. */
export default function HBarList({ rows, color = 'var(--viz-1)' }: { rows: Row[]; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="col gap-3">
      {rows.map((r, i) => (
        <div key={i} className="col" style={{ gap: 4 }}>
          <div className="row between t-sm">
            <span className="row gap-2 grow t-truncate">
              <span className="t-3 t-num" style={{ width: 18 }}>{i + 1}</span>
              <span className="t-strong t-truncate">{r.label}</span>
              {r.sub && <span className="t-3 hide-mobile">· {r.sub}</span>}
            </span>
            <span className="t-num t-strong">{r.display ?? r.value}</span>
          </div>
          <div className="progress" style={{ marginLeft: 26 }}><div style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? color }} /></div>
        </div>
      ))}
    </div>
  );
}
