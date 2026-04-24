const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// ── Web: stub out native-only packages that can't bundle on web ──────────────
const nativeOnlyModules = [
  "react-native-maps",
];

const originalResolver = config.resolver?.resolveRequest;

config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (platform === "web" && nativeOnlyModules.some((m) => moduleName === m || moduleName.startsWith(m + "/"))) {
      // Return an empty stub so web bundling succeeds
      return {
        filePath: path.resolve(__dirname, "lib/stubs/empty.js"),
        type: "sourceFile",
      };
    }
    if (originalResolver) {
      return originalResolver(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });
