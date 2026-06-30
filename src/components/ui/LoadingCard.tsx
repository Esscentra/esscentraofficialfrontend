/** Centered loading placeholder used while a table/list is fetching. */
export function LoadingCard({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="glass-card grid place-items-center py-20 text-sm text-slate-400">{label}</div>
  );
}
