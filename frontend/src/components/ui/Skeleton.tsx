import { cn } from '../../lib/cn';

export function Skeleton({ w, h = 14, className, style }: { w?: number | string; h?: number; className?: string; style?: React.CSSProperties }) {
  return <div className={cn('skeleton', className)} style={{ width: w ?? '100%', height: h, ...style }} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card card-pad col gap-3">
      <Skeleton w="40%" h={16} />
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} w={`${90 - i * 15}%`} />)}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="col gap-5">
      <div className="row gap-4"><Skeleton w={220} h={28} /></div>
      <div className="grid-kpi">{[0, 1, 2, 3].map((i) => <div key={i} className="card stat"><Skeleton w="50%" h={12} /><Skeleton w="35%" h={28} /></div>)}</div>
      <div className="grid-auto"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
    </div>
  );
}
