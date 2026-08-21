const { withAppBuildGradle } = require("@expo/config-plugins");

const RELEASE_SIGNING_MARKER = "// Lekka production signing intentionally unresolved.";
const INTERNAL_VARIANT_MARKER = "// Lekka internal-test variant: debug-signed only.";

/**
 * Adds a dedicated internal-test build type to generated Android projects.
 *
 * Production release signing is deliberately left unresolved. The generated
 * `internalDebug` type can use the existing local debug signing configuration
 * for internal device testing without representing the output as a production
 * or Play Store artifact.
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
    const internalVariant = `        }
        internalDebug {
            ${INTERNAL_VARIANT_MARKER}
            // For internal device testing only; never production or Play Store signing.
            initWith release
            signingConfig signingConfigs.debug
            debuggable false
            matchingFallbacks = ['release']
            versionNameSuffix '-internal'
            resValue 'string', 'app_name', 'Lekka Internal Test'
        }
    }
    packagingOptions {`;

    if (!withoutReleaseDebugSigning.includes(insertionPoint)) {
      throw new Error("Lekka internal-debug configuration could not locate the Android build-types insertion point.");
    }

    modConfig.modResults.contents = withoutReleaseDebugSigning.replace(insertionPoint, internalVariant);
    return modConfig;
  });
}

module.exports = withInternalDebugAndroid;
