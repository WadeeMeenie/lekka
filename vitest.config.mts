import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "react-native": resolve(rootDir, "tests/mocks/react-native.ts"),
      "@react-native-async-storage/async-storage": resolve(rootDir, "tests/mocks/async-storage.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
  },
});
