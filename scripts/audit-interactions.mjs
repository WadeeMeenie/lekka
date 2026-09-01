import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("app");
const ROUTE_EXT = /\.(tsx|ts|jsx|js)$/;
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (ROUTE_EXT.test(entry.name)) files.push(full);
  }
}
walk(ROOT);

const routeFiles = new Set();
for (const file of files) {
  let rel = path.relative(ROOT, file).replaceAll(path.sep, "/");
  rel = rel.replace(/\.(tsx|ts|jsx|js)$/, "");
  if (rel === "_layout") continue;
  rel = rel.replace(/\/index$/, "");
  routeFiles.add("/" + rel);
}

const errors = [];
const warnings = [];

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(process.cwd(), file);

  // Every interactive React Native press target must declare an onPress handler.
  for (const tag of source.matchAll(/<(Pressable|TouchableOpacity|Button)\b[\s\S]*?>/g)) {
    const opening = tag[0];
    if (!/\bonPress\s*=/.test(opening) && tag[1] !== "Button") {
      errors.push(`${rel}: ${tag[1]} has no onPress handler`);
    }
    if (tag[1] === "Button" && !/\bonPress\s*=/.test(opening)) {
      errors.push(`${rel}: Button has no onPress handler`);
    }
  }

  // Static navigation targets must exist. Dynamic routes are checked by their parent segment.
  for (const match of source.matchAll(/router\.(?:push|replace|navigate)\(\s*["']([^"']+)["']/g)) {
    const target = match[1].split("?")[0];
    if (!target.startsWith("/")) continue;
    const candidates = [
      target,
      target.replace(/\/[^/]+$/, "/[id]"),
      target.replace(/\/[^/]+$/, "/index"),
    ];
    if (!candidates.some((candidate) => routeFiles.has(candidate))) {
      warnings.push(`${rel}: navigation target ${target} is not present in the Expo Router route inventory`);
    }
  }
}

if (errors.length) {
  console.error("Interaction audit failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Interaction audit passed: ${files.length} source files scanned.`);
if (warnings.length) {
  console.warn(`Navigation warnings: ${warnings.length}`);
  for (const warning of warnings.slice(0, 30)) console.warn(`- ${warning}`);
}
