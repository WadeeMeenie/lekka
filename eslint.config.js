// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

export default defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      // React 19's rule is too aggressive for our Expo screens: these effects
      // intentionally kick off async data loads and update UI state when the
      // async work completes. Keep the dependency linting, but don't reject
      // these established screen-loading patterns.
      "react-hooks/set-state-in-effect": "off",
      // React Native Animated.Value refs are intentionally created once and
      // consumed by Animated components/event handlers.
      "react-hooks/refs": "off",
    },
  },
]);
