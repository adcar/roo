export default function ProgramsLoading() {
  return (
    <div className="px-4 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-lg bg-[var(--muted)] animate-pulse" />
        <div className="h-12 w-12 rounded-xl bg-[var(--muted)] animate-pulse" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 rounded-xl bg-[var(--muted)] animate-pulse" />
      ))}
    </div>
  );
}
