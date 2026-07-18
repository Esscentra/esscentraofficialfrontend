/** Skeleton loading placeholder used while a table/list is fetching. */
export function LoadingCard({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="glass-card p-5" role="status" aria-label={label}>
      <div className="skeleton h-10 w-10 rounded-xl" />
      <div className="skeleton mt-4 h-7 w-2/5" />
      <div className="skeleton mt-3 h-3 w-3/5" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
