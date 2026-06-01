export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-700/50 ${className}`}
    />
  )
}
