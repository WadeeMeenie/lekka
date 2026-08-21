export type FeedCursor = { createdAt: string; id: string };

export function encodeCursor(cursor: FeedCursor | null) {
  return cursor ? `${cursor.createdAt}|${cursor.id}` : null;
}

export function decodeCursor(value: string | null | undefined): FeedCursor | null {
  if (!value) return null;
  const separator = value.lastIndexOf("|");
  if (separator < 1) return null;
  const createdAt = value.slice(0, separator);
  const id = value.slice(separator + 1);
  return createdAt && id ? { createdAt, id } : null;
}

export function cursorForLast<T extends { created_at: string; id: string }>(rows: T[], pageSize: number) {
  if (rows.length < pageSize || rows.length === 0) return null;
  const last = rows[rows.length - 1];
  return encodeCursor({ createdAt: last.created_at, id: last.id });
}

export function mergeUniqueById<T extends { id: string }>(current: T[], next: T[]) {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !seen.has(item.id))];
}
