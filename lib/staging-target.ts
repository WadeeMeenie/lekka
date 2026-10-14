export const PRODUCTION_PROJECT_REF = "vnitwsjidlurlwlpsmtf";

/** Fail closed: no app defaults, custom domains, credentials, or URL redirects. */
export function assertStagingTarget(url: string | undefined, expectedRef: string | undefined) {
  if (!expectedRef || !/^[a-z]{20}$/.test(expectedRef)) {
    throw new Error("An explicit staging project reference is required.");
  }
  if (expectedRef === PRODUCTION_PROJECT_REF) {
    throw new Error("Production is forbidden for staging operations.");
  }
  let parsed: URL;
  try { parsed = new URL(url ?? ""); } catch {
    throw new Error("An explicit staging URL is required.");
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== `${expectedRef}.supabase.co`
      || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash
      || parsed.pathname !== "/") {
    throw new Error("Staging URL must match the approved project exactly.");
  }
  return { projectRef: expectedRef, url: parsed.origin };
}

export function stagingRunnerTarget(env: Record<string, string | undefined>) {
  if (env.LEKKA_TEST_ENVIRONMENT !== "staging") {
    throw new Error("LEKKA_TEST_ENVIRONMENT must explicitly be staging.");
  }
  const target = assertStagingTarget(env.LEKKA_STAGING_URL, env.LEKKA_STAGING_PROJECT_REF);
  if (env.LEKKA_STAGING_CONFIRM_PROJECT_REF !== target.projectRef) {
    throw new Error("Confirm the approved staging project reference before running tests.");
  }
  return target;
}

export function assertStagingManifest(
  target: { projectRef: string },
  manifest: { projectRef: string; runId: string; accounts: { label: string; userId: string }[] },
) {
  assertStagingTarget(`https://${target.projectRef}.supabase.co`, target.projectRef);
  if (target.projectRef === PRODUCTION_PROJECT_REF || manifest.projectRef !== target.projectRef
      || !/^lekka-test-[a-z0-9-]{8,80}$/.test(manifest.runId)) {
    throw new Error("Test manifest does not belong to this staging run.");
  }
  const labels = new Set<string>();
  const ids = new Set<string>();
  for (const account of manifest.accounts) {
    if (!/^lekka-test-(owner|member-a|member-b|outsider|admin)$/.test(account.label)
        || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(account.userId)
        || labels.has(account.label) || ids.has(account.userId.toLowerCase())) {
      throw new Error("Invalid or duplicate disposable account in test manifest.");
    }
    labels.add(account.label);
    ids.add(account.userId.toLowerCase());
  }
}
