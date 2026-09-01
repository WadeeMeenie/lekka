import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";

const ROOT = path.resolve("app");
const ROUTE_EXT = /\.(tsx|ts|jsx|js)$/;
const INTERACTIVE = new Set(["Pressable", "TouchableOpacity", "Button"]);
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

function isInteractiveName(node) {
  return node?.type === "JSXIdentifier" && INTERACTIVE.has(node.name);
}

function walkAst(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) walkAst(child, visit);
    } else if (value && typeof value === "object" && value.type) {
      walkAst(value, visit);
    }
  }
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(process.cwd(), file);
  let ast;

  try {
    ast = parse(source, {
      sourceType: "module",
      plugins: ["typescript", "jsx", "optionalChaining", "nullishCoalescingOperator"],
    });
  } catch (error) {
    errors.push(`${rel}: could not parse source for interaction audit (${error.message})`);
    continue;
  }

  walkAst(ast, (node) => {
    if (node.type !== "JSXOpeningElement" || !isInteractiveName(node.name)) return;
    const hasOnPress = node.attributes.some(
      (attribute) =>
        attribute?.type === "JSXAttribute" &&
        attribute.name?.type === "JSXIdentifier" &&
        attribute.name.name === "onPress"
    );

    if (!hasOnPress) {
      const line = node.loc?.start?.line ?? 0;
      errors.push(`${rel}:${line}: ${node.name.name} has no onPress handler`);
    }
  });

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
