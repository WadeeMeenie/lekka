import { stagingRunnerTarget } from "../../lib/staging-target.ts";

// Read-only. Provisioning, seeding and cleanup must each call the same guard.
try {
  const target = stagingRunnerTarget(process.env);
  const key = process.env.LEKKA_STAGING_PUBLISHABLE_KEY;
  if (!key?.startsWith("sb_publishable_")) {
    throw new Error("Supply the staging publishable key; privileged keys are forbidden here.");
  }
  const response = await fetch(`${target.url}/auth/v1/settings`, {
    headers: { apikey: key }, redirect: "error", signal: AbortSignal.timeout(15000),
  });
  if (response.status !== 200) throw new Error("Staging Auth readiness check failed.");
  console.log(JSON.stringify({ projectRef: target.projectRef, authReachable: true,
    schemaVerified: false, accountsCreated: false }));
} catch {
  // Do not echo transport errors, environment values, or response bodies.
  console.error("Staging preflight refused or failed. Check the approved target and staging configuration.");
  process.exitCode = 1;
}
