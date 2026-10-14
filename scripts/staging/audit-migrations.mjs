import { readdir } from "node:fs/promises";
const files = (await readdir(new URL("../../supabase/migrations/", import.meta.url)))
  .filter(name => name.endsWith(".sql")).sort();
const versions = new Map();
for (const file of files) {
  const version = file.match(/^(\d+)_/)?.[1];
  if (!version) throw new Error("Malformed migration filename");
  versions.set(version, [...(versions.get(version) ?? []), file]);
}
const duplicates = [...versions].filter(([, names]) => names.length > 1);
console.log(JSON.stringify({ files: files.length, duplicateVersions: duplicates,
  replayApproved: false, databaseContacted: false }, null, 2));
if (duplicates.length) process.exitCode = 1;
