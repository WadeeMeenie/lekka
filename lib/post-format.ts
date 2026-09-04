export function formatPostTime(value: string): string {
  if (!value) return "now";
  const raw = value.trim();
  const timestamp = Date.parse(raw);
  if (!Number.isNaN(timestamp)) {
    const seconds = Math.max(0, (Date.now() - timestamp) / 1000);
    if (seconds < 45) return "now";
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.round(seconds / 86400)}d`;
    if (seconds < 2592000) return `${Math.round(seconds / 604800)}w`;
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
    });
  }
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(min|mins|minute|minutes|hr|hrs|hour|hours|day|days|week|weeks)$/i);
  if (match) {
    const amount = Math.max(1, Math.round(Number(match[1])));
    const unit = match[2].toLowerCase();
    if (unit.startsWith("min")) return `${amount}m`;
    if (unit.startsWith("hr") || unit.startsWith("hour")) return `${amount}h`;
    if (unit.startsWith("day")) return `${amount}d`;
    return `${amount}w`;
  }
  return raw;
}

export function formatPostLocation(area?: string | null): string {
  const value = area?.trim();
  return value || "Nearby";
}

export function formatPostMetadata(area: string | null | undefined, createdAt: string): string {
  return `${formatPostLocation(area)} · ${formatPostTime(createdAt)}`;
}
