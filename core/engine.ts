import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Plugin, ViteDevServer } from "vite";
import { loadConfig } from "./config.js";

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Shared configuration and path resolution for the GenAI Studio Preview engine.
 */
export const CORE_CONFIG = {
  MOCK_GENAI_PATH: path.resolve(__dirname, "./mocks/genai.ts"),
  SHARED_STYLES_PATH: path.resolve(
    __dirname,
    "./assets/shared-module-styles.css",
  ),
  GEOLOCATION_SHIM_PATH: path.resolve(__dirname, "./shims/geolocation.ts"),
};

/**
 * A Vite plugin that prepares AI Studio applications for local preview without modification.
 */
export function GenAIPreviewPlugin(projectPath: string): Plugin {
  const config = loadConfig(projectPath);

  return {
    name: "genai-preview-transform",
    enforce: "pre",

    resolveId(id) {
      // Polyfill missing shared styles regardless of relative path depth
      if (id.includes("shared-module-styles.css")) {
        return "\0genai-shared-styles";
      }
      // Virtual module for config injection
      if (id === "virtual:genai-preview-config") {
        return "\0genai-preview-config";
      }
      return null;
    },

    load(id) {
      if (id === "\0genai-shared-styles") {
        if (fs.existsSync(CORE_CONFIG.SHARED_STYLES_PATH)) {
          return fs.readFileSync(CORE_CONFIG.SHARED_STYLES_PATH, "utf-8");
        }
        return "/* GenAI Studio Preview: Shared Styles Polyfill (Empty) */";
      }
      if (id === "\0genai-preview-config") {
        return `export default ${JSON.stringify(config)};`;
      }
      return null;
    },

    transform(code, id) {
      if (id.endsWith(".css")) {
        // Polyfill shared-module-styles.css by replacing any relative import with an absolute path to our local copy
        // This handles cases like: @import '../shared-module-styles.css'; or @import '../../shared-module-styles.css';
        if (code.includes("shared-module-styles.css")) {
          return code.replace(
            /@import\s+(url\(['"]?)?(\.\/*)+shared-module-styles\.css(['"]?\))?;?/g,
            `@import "${CORE_CONFIG.SHARED_STYLES_PATH}";`,
          );
        }
      }
      return null;
    },

    transformIndexHtml(html) {
      let newHtml = html;

      // 1. Remove importmap to force usage of local node_modules
      newHtml = newHtml.replace(
        /<script type="importmap">[\s\S]*?<\/script>/gi,
        "",
      );

      // 2. Remove integrity attributes to avoid hash mismatches on external CDNs
      newHtml = newHtml.replace(/\s+integrity="[^"]*"/gi, "");

      // 3. Inject heartbeat script for browser close detection
      if (config.autoShutdown.enabled) {
        const heartbeatScript = `
<script>
  // GenAI Studio Preview - Heartbeat for auto-shutdown
  // Only uses heartbeat polling - no beforeunload to avoid false positives during HMR
  (function() {
    var heartbeatInterval = setInterval(function() {
      fetch('/__genai_heartbeat').catch(function() {});
    }, 5000);
    // Clean up on page unload (but don't trigger shutdown - let heartbeat timeout handle it)
    window.addEventListener('pagehide', function() {
      clearInterval(heartbeatInterval);
    });
  })();
</script>`;
        newHtml = newHtml.replace("</head>", `${heartbeatScript}\n</head>`);
      }

      // 4. Inject geolocation config if not passthrough
      if (config.location.mode !== "passthrough") {
        const geoConfigScript = `
<script>
  window.__GENAI_PREVIEW_CONFIG__ = ${JSON.stringify({ location: config.location })};
</script>
<script type="module" src="/@fs${CORE_CONFIG.GEOLOCATION_SHIM_PATH}"></script>`;
        newHtml = newHtml.replace("</head>", `${geoConfigScript}\n</head>`);
      }

      // 5. Inject mobile viewport meta tag if missing
      if (!newHtml.includes("viewport")) {
        newHtml = newHtml.replace(
          "<head>",
          '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
        );
      }

      // 6. Inject entry point if missing
      const possibleEntries = [
        "index.tsx",
        "src/main.tsx",
        "src/index.tsx",
        "main.tsx",
      ];
      let entryPoint = "";
      for (const entry of possibleEntries) {
        if (fs.existsSync(path.join(projectPath, entry))) {
          entryPoint = "/" + entry;
          break;
        }
      }

      if (entryPoint && !newHtml.includes(entryPoint)) {
        newHtml = newHtml.replace(
          "</body>",
          `<script type="module" src="${entryPoint}"></script>\n</body>`,
        );
      }

      return newHtml;
    },
  };
}

/**
 * Lifecycle plugin for browser close detection and auto-shutdown.
 */
export function GenAILifecyclePlugin(): Plugin {
  const config = loadConfig();
  let lastHeartbeat = Date.now();
  let hasReceivedFirstHeartbeat = false;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  const INITIAL_GRACE_PERIOD_MS = 60000; // 60 seconds to allow browser to connect

  return {
    name: "genai-lifecycle",

    configureServer(server: ViteDevServer) {
      if (!config.autoShutdown.enabled) return;

      // Heartbeat endpoint
      server.middlewares.use("/__genai_heartbeat", (req, res) => {
        lastHeartbeat = Date.now();
        hasReceivedFirstHeartbeat = true;
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");
      });

      // Shutdown endpoint (optional manual trigger)
      server.middlewares.use("/__genai_shutdown", (req, res) => {
        console.log("\n🛑 Manual shutdown requested...");
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("bye");
        setTimeout(() => process.exit(0), 500);
      });

      // Check for stale heartbeat (only after first heartbeat received)
      const serverStartTime = Date.now();
      heartbeatInterval = setInterval(() => {
        const now = Date.now();

        // During initial grace period, don't check for heartbeat
        if (now - serverStartTime < INITIAL_GRACE_PERIOD_MS) {
          return;
        }

        // Only shutdown if we've received at least one heartbeat and it's gone stale
        if (
          hasReceivedFirstHeartbeat &&
          now - lastHeartbeat > config.autoShutdown.timeoutMs
        ) {
          console.log("\n⏱️ No heartbeat received. Shutting down...");
          process.exit(0);
        }
      }, 10000);

      // Clean up on server close
      server.httpServer?.on("close", () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      });
    },
  };
}

// Re-export config for use in other modules
export { getConfig, loadConfig, type GenAIPreviewConfig } from "./config.js";
