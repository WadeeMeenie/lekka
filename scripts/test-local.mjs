// Use Node's native config loading to avoid Windows esbuild path restrictions.
// This runner deliberately tests without backend credentials; CI still runs the
// normal Vitest command and its separately configured read-only integration test.
import { startVitest } from "vitest/node";
import config from "../vitest.config.mts";

for (const name of ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_APP_ENV", "EXPO_PUBLIC_STAGING_PROJECT_REF", "EXPO_TOKEN"]) {
  delete process.env[name];
}
await startVitest("test", [], { run: true, config: false }, config);
