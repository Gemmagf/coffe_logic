export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ width: size * 0.58, height: size * 0.58 }}>
        <path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8zM7 2v2M11 2v2" />
      </svg>
    </span>
  );
}
