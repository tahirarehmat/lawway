export function ClientEventsSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i}>
          <div className="h-24 animate-pulse rounded-xl bg-black/5" aria-hidden />
        </li>
      ))}
    </ul>
  );
}
