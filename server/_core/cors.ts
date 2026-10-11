export type CorsRequestContext = {
  hostname: string;
  protocol: string;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeOrigin(origin: string) {
  try {
    const url = new URL(origin);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function configuredOrigins() {
  return new Set(
    (process.env.CORS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin: string) => normalizeOrigin(origin.trim()))
      .filter((origin: string | null): origin is string => Boolean(origin)),
  );
}

/**
 * Return the exact origin allowed to receive credentialed responses, or null.
 * When CORS_ALLOWED_ORIGINS is configured, it is authoritative. Without it,
 * local preview mode accepts only the paired 8081 frontend for a 3000 API host.
 */
export function getAllowedCorsOrigin(
  request: CorsRequestContext,
  origin: string | undefined,
): string | null {
  if (!origin) return null;
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return null;

  const allowedOrigins = configuredOrigins();
  if (allowedOrigins.size > 0) {
    return allowedOrigins.has(normalizedOrigin) ? normalizedOrigin : null;
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(normalizedOrigin);
  } catch {
    return null;
  }

  const requestProtocol = request.protocol.toLowerCase();
  if (LOCAL_HOSTS.has(request.hostname)) {
    const expectedPort = parsedOrigin.port || (parsedOrigin.protocol === "https:" ? "443" : "80");
    return parsedOrigin.hostname === request.hostname && expectedPort === "8081"
      ? normalizedOrigin
      : null;
  }

  if (request.hostname.startsWith("3000-")) {
    const expectedFrontendHost = `8081-${request.hostname.slice("3000-".length)}`;
    return parsedOrigin.hostname === expectedFrontendHost && parsedOrigin.protocol === `${requestProtocol}:`
      ? normalizedOrigin
      : null;
  }

  return null;
}
