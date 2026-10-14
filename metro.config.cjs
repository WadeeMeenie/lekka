const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const fs = require("node:fs");
const path = require("node:path");

const config = getDefaultConfig(__dirname);

const nativeWindConfig = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});

// NativeWind initializes native placeholders but omits web.css. Create it before
// Metro crawls the filesystem so a first production web build can hash the file.
// NativeWind still generates its actual contents during transformation.
const webCssPath = path.resolve(
  nativeWindConfig.transformer.cssInterop_outputDirectory,
  "web.css",
);
if (!fs.existsSync(webCssPath)) fs.writeFileSync(webCssPath, "");

module.exports = nativeWindConfig;
