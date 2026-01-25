const path = require("path");

// Mock 'vscode' module
const Module = require("module");
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
  if (id === "vscode") {
    return {
      window: {
        createOutputChannel: () => ({ appendLine: () => {} }),
      },
      ExtensionContext: {},
      TreeItem: class {},
      EventEmitter: class {
        event = () => {};
      },
      ThemeIcon: class {},
      ThemeColor: class {},
    };
  }
  return originalRequire.apply(this, arguments);
};

try {
  const extensionPath = path.resolve(
    __dirname,
    "dist/extension/src/extension.js",
  );
  console.log(`Attempting to require: ${extensionPath}`);
  require(extensionPath);
  console.log("Extension loaded successfully (structure check passed)");
} catch (error) {
  console.error("Extension load failed:", error);
  process.exit(1);
}
