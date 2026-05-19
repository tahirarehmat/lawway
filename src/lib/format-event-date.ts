export function formatEventWhen(startsAt: string | null): string {
  if (!startsAt) return "Date to be confirmed";

  const date = new Date(startsAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (diffDays < 0) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Tomorrow · ${time}`;
  return `In ${diffDays} days · ${time}`;
}

export function formatDaysUntil(startsAt: string | null): string | null {
  if (!startsAt) return null;

  const date = new Date(startsAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day";
  return `${diffDays} days`;
}
