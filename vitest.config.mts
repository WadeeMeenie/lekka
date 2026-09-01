import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "react-native": resolve(__dirname, "tests/mocks/react-native.ts"),
      "@react-native-async-storage/async-storage": resolve(__dirname, "tests/mocks/async-storage.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
  },
});
