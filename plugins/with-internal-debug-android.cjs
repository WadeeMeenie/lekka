const { withAppBuildGradle } = require("@expo/config-plugins");

const RELEASE_SIGNING_MARKER = "// Lekka production signing intentionally unresolved.";
const INTERNAL_VARIANT_MARKER = "// Lekka internal-test variant: debug-signed only.";

/**
 * Adds a dedicated internal-test build type to generated Android projects.
 *
 * Production release signing is deliberately left unresolved. The generated
 * `internalDebug` type uses the normal debug build as its native/runtime base,
 * while retaining debug signing for standalone device testing. This keeps the
 * internal APK out of the production/release runtime path.
 */
function withInternalDebugAndroid(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== "groovy") {
      throw new Error("Lekka internal-debug configuration requires a Groovy Android build file.");
    }

    if (modConfig.modResults.contents.includes(INTERNAL_VARIANT_MARKER)) {
      return modConfig;
    }

    const releaseSigningPattern = /release \{\n\s*\/\/ Caution! In production, you need to generate your own keystore file\.\n\s*\/\/ see https:\/\/reactnative\.dev\/docs\/signed-apk-android\.\n\s*signingConfig signingConfigs\.debug/;
    const withoutReleaseDebugSigning = modConfig.modResults.contents.replace(
      releaseSigningPattern,
      `release {\n            ${RELEASE_SIGNING_MARKER}\n            // A genuine production/upload keystore must be configured separately.`,
    );

    if (withoutReleaseDebugSigning === modConfig.modResults.contents) {
      throw new Error("Lekka internal-debug configuration could not locate the generated release signing block.");
    }

    const insertionPoint = "        }\n    }\n    packagingOptions {";
    const internalVariant = `        }\n        internalDebug {\n            ${INTERNAL_VARIANT_MARKER}\n            // For internal device testing only; never production or Play Store signing.\n            // Base the test APK on the standard debug runtime so release-only\n            // optimization/minification cannot cause a false launch crash.\n            initWith debug\n            signingConfig signingConfigs.debug\n            debuggable true\n            matchingFallbacks = ['debug']\n            versionNameSuffix '-internal'\n            resValue 'string', 'app_name', 'Lekka Internal Test'\n        }\n    }\n    packagingOptions {`;

    if (!withoutReleaseDebugSigning.includes(insertionPoint)) {
      throw new Error("Lekka internal-debug configuration could not locate the Android build-types insertion point.");
    }

    modConfig.modResults.contents = withoutReleaseDebugSigning.replace(insertionPoint, internalVariant);
    return modConfig;
  });
}

module.exports = withInternalDebugAndroid;
