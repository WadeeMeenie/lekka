const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const isWebExport = process.env.EXPO_PLATFORM === "web";

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules for native
  // development. Web export cannot hash NativeWind's generated node_modules
  // cache file, so keep web on the virtual-module path.
  forceWriteFileSystem: !isWebExport,
});
