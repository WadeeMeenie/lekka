const DEFAULT_PUBLIC_PREFIXES = ["generated/"];

function publicPrefixes() {
  const configured = (process.env.PUBLIC_STORAGE_PREFIXES ?? "")
    .split(",")
    .map((prefix: string) => prefix.trim())
    .filter(Boolean)
    .map((prefix: string) => (prefix.endsWith("/") ? prefix : `${prefix}/`));
  return configured.length > 0 ? configured : DEFAULT_PUBLIC_PREFIXES;
}

export function normalizeStorageKey(rawKey: string): string | null {
  let key: string;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    return null;
  }
  if (!key || key.startsWith("/") || key.includes("\\") || key.includes("\0")) {
    return null;
  }
  const segments = key.split("/");
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    return null;
  }
  return key;
}

export function isPublicStorageKey(key: string): boolean {
  return publicPrefixes().some((prefix: string) => key.startsWith(prefix));
}
