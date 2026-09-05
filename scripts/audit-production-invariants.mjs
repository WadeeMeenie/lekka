import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "app");
const libDir = path.join(root, "lib");
const workflowDir = path.join(root, ".github", "workflows");
const configPath = path.join(root, "app.config.ts");
const supabasePath = path.join(libDir, "supabase.ts");
const packagePath = path.join(root, "package.json");

const errors = [];
const warnings = [];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function walk(dir, extensions = /\.(tsx|ts|jsx|js)$/) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full, extensions));
    else if (extensions.test(entry.name)) result.push(full);
  }
  return result;
}

function requireFile(file, reason) {
  if (!fs.existsSync(file)) errors.push(`${reason}: missing ${path.relative(root, file)}`);
}

// 1. UI interaction/accessibility guard.
const routeFiles = walk(appDir);
for (const file of routeFiles) {
  const source = read(file);
  const rel = path.relative(root, file);
  for (const match of source.matchAll(/<(Pressable|TouchableOpacity|Button)\b([^>]*)>/g)) {
    const attrs = match[2];
    const minHeight = attrs.match(/minHeight\s*:\s*(\d+(?:\.\d+)?)/)?.[1];
    const minWidth = attrs.match(/minWidth\s*:\s*(\d+(?:\.\d+)?)/)?.[1];
    if (minHeight && Number(minHeight) < 44) errors.push(`${rel}: ${match[1]} has explicit minHeight ${minHeight}; interactive controls must not be smaller than 44dp.`);
    if (minWidth && Number(minWidth) < 44) errors.push(`${rel}: ${match[1]} has explicit minWidth ${minWidth}; interactive controls must not be smaller than 44dp.`);
    const looksIconLike = /(?:Icon|Symbol|icon|symbol|name=)/.test(attrs) && !/accessibilityLabel\s*=/.test(attrs);
    if (looksIconLike && /onPress\s*=/.test(attrs)) warnings.push(`${rel}: icon-like interactive control has no accessibilityLabel; verify it has an accessible name.`);
  }
}

// 2. Authentication/session architecture.
requireFile(supabasePath, "Supabase auth client");
const supabaseSource = read(supabasePath);
if (!/persistSession\s*:\s*true/.test(supabaseSource)) errors.push("Supabase auth client must persist sessions.");
if (/service_role|SUPABASE_SERVICE_ROLE|SERVICE_ROLE_KEY/i.test(supabaseSource)) errors.push("Client Supabase code contains a service-role credential reference.");
if (!/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/.test(supabaseSource)) errors.push("Supabase client must use EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
requireFile(path.join(root, "hooks", "use-supabase-auth.ts"), "Supabase auth hook");
requireFile(path.join(appDir, "auth.tsx"), "Authentication route");
requireFile(path.join(appDir, "oauth", "callback.tsx"), "OAuth callback route");

// 3. Social/discovery correctness: one canonical nearby-discovery path.
for (const file of ["lib/discovery.ts", "lib/local-radar.ts", "lib/location.ts", "lib/supabase-repository.ts"]) requireFile(path.join(root, file), "Canonical discovery architecture");
const discoveryFiles = ["lib/discovery.ts", "lib/local-radar.ts", "lib/supabase-repository.ts"].map((file) => read(path.join(root, file))).join("\n");
if (!/discover_nearby/.test(discoveryFiles)) errors.push("Canonical discovery RPC discover_nearby is not referenced by the discovery/repository layer.");
requireFile(path.join(appDir, "(tabs)", "nearby.tsx"), "Local Radar route");

// 4. Communities/business flows. The settings screen is a dynamic child route.
for (const file of [
  "community/create.tsx",
  "community/[id].tsx",
  "community/settings/[id].tsx",
  "community/post.tsx",
  "business-setup.tsx",
]) requireFile(path.join(appDir, file), "Community/business flow");

// 5. Offline/retry behavior.
for (const file of ["lib/async-error.ts", "lib/auth-retry.ts", "lib/onboarding.ts"]) requireFile(path.join(root, file), "Offline/retry foundation");

// 6. Supabase/RLS/storage contract guard.
const migrationsDir = path.join(root, "supabase", "migrations");
requireFile(migrationsDir, "Supabase migrations directory");
if (fs.existsSync(migrationsDir)) {
  const migrationFiles = fs.readdirSync(migrationsDir).filter((name) => name.endsWith(".sql"));
  if (!migrationFiles.some((name) => /delete_own_posts|own_posts/i.test(name))) warnings.push("No own-post deletion migration filename was found; verify the authenticated own-post DELETE policy remains present.");
}

// 7. Android invariants: preserve New Architecture, arm64 and canonical package/scheme.
const configSource = read(configPath);
requireFile(configPath, "Expo Android configuration");
if (!/newArchEnabled\s*:\s*true/.test(configSource)) errors.push("Expo New Architecture must remain enabled.");
if (!/buildArchs\s*:\s*\[\s*[\"']arm64-v8a[\"']\s*\]/.test(configSource)) errors.push("Android build must retain arm64-v8a.");
if (!/androidPackage:\s*bundleId/.test(configSource)) errors.push("Android package must derive from the canonical bundle id.");
if (/manus\$\{\"\"\}:\/\/|manus:\/\//.test(configSource)) errors.push("Malformed Lekka deep-link scheme detected in app.config.ts.");

// 8. Test/CI blind-spot guard.
requireFile(path.join(workflowDir, "lekka-validation.yml"), "GitHub validation workflow");
const workflowFiles = fs.existsSync(workflowDir) ? fs.readdirSync(workflowDir).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml")) : [];
if (workflowFiles.length !== 1 || workflowFiles[0] !== "lekka-validation.yml") errors.push(`Expected exactly one canonical validation workflow; found ${workflowFiles.join(", ") || "none"}.`);
const workflow = read(path.join(workflowDir, "lekka-validation.yml"));
for (const required of ["npm run check", "npm run audit:interactions", "npm test", "npm run lint", "npx expo install --check", "npx expo-doctor", ":app:assembleDebug", ":app:assembleInternalDebug"]) {
  if (!workflow.includes(required)) errors.push(`Validation workflow is missing required gate: ${required}`);
}

// 9. Release/architecture integrity.
const tabDir = path.join(appDir, "(tabs)");
for (const tab of ["index.tsx", "nearby.tsx", "create.tsx", "social.tsx", "local.tsx"]) requireFile(path.join(tabDir, tab), "Five-tab navigation");
const allSource = [...walk(appDir), ...walk(libDir)].map(read).join("\n");
if (!/yoco/i.test(allSource)) warnings.push("No YOCO reference found in app/lib source; verify the existing TEST/admin payment surface remains connected.");
const packageJson = JSON.parse(read(packagePath) || "{}");
if (packageJson.scripts?.["audit:interactions"] !== "node scripts/audit-interactions.mjs") errors.push("audit:interactions package script has changed unexpectedly.");
if (!packageJson.scripts?.["audit:production"]) errors.push("package.json must expose audit:production so CI cannot skip this invariant layer.");

if (errors.length) {
  console.error("Production invariant audit failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Production invariant audit passed: ${routeFiles.length} app route/source files checked.`);
if (warnings.length) {
  console.warn(`Production invariant warnings: ${warnings.length}`);
  for (const warning of warnings.slice(0, 50)) console.warn(`- ${warning}`);
}
