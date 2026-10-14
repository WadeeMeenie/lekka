import { readdir, readFile } from "node:fs/promises";
import { PRODUCTION_PROJECT_REF } from "../../lib/staging-target.ts";
const files = (await readdir(new URL("../../supabase/migrations/", import.meta.url)))
  .filter(name => name.endsWith(".sql")).sort();
const versions = new Map();
for (const file of files) {
  const version = file.match(/^(\d+)_/)?.[1];
  if (!version) throw new Error("Malformed migration filename");
  versions.set(version, [...(versions.get(version) ?? []), file]);
}
const duplicates = [...versions].filter(([, names]) => names.length > 1);
const productionReferences = [];
for (const file of files) {
  const sql = await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");
  if (sql.includes(PRODUCTION_PROJECT_REF)) productionReferences.push(file);
}
console.log(JSON.stringify({ files: files.length, duplicateVersions: duplicates,
  productionReferences,
  replayApproved: false, databaseContacted: false }, null, 2));
if (duplicates.length || productionReferences.length) process.exitCode = 1;
