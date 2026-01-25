import fs from "node:fs";
import { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Plugin, ViteDevServer } from "vite";
import { loadConfig } from "./config.js";

// @ts-ignore - eval hides import.meta from TS when compiling to CommonJS
const _dirname =
    typeof __dirname !== "undefined"
        ? __dirname
        : path.dirname(fileURLToPath(eval("import.meta.url")));

/**
 * Get the root of the project source (core/) regardless of whether we're running 
 * from dist/ or source. This is needed because browser-facing files (mocks, shims)
 * must be TypeScript source files - the compiled JS is CommonJS which doesn't work in browsers.
 * Vite will transpile the .ts files to ESM on the fly.
 */
function getSourceRoot(): string {
    // If running from dist/core/, go up to find the actual core/ source
    if (_dirname.includes("dist")) {
        // e.g., /path/to/extension/dist/core -> /path/to/core
        const projectRoot = _dirname.replace(/[/\\]extension[/\\]dist[/\\]core$/, "");
        return path.join(projectRoot, "core");
    }
    return _dirname;
}

const SOURCE_ROOT = getSourceRoot();

/**
 * Shared configuration and path resolution for the GenAI Studio Preview engine.
 * These paths MUST point to TypeScript source files, not compiled JS, because:
 * 1. The compiled JS is CommonJS format (not ESM)
 * 2. Browsers cannot use CommonJS modules
 * 3. Vite will transpile the .ts files to ESM on the fly
 */
export const CORE_CONFIG = {
    MOCK_GENAI_PATH: path.resolve(SOURCE_ROOT, "./mocks/genai.ts"),
    SHARED_STYLES_PATH: path.resolve(SOURCE_ROOT, "./assets/shared-module-styles.css"),
    GEOLOCATION_SHIM_PATH: path.resolve(SOURCE_ROOT, "./shims/geolocation.ts"),
    MAPS_SHIM_PATH: path.resolve(SOURCE_ROOT, "./shims/maps.ts"),
};

/**
 * A Vite plugin that prepares AI Studio applications for local preview without modification.
 */
export function GenAIPreviewPlugin(projectPath: string): Plugin {
    const config = loadConfig(projectPath);

    return {
        name: "genai-preview-transform",
        enforce: "pre",

        resolveId(id: string) {
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

        load(id: string) {
            if (id === "\0genai-shared-styles") {
                if (fs.existsSync(CORE_CONFIG.SHARED_STYLES_PATH)) {
                    return fs.readFileSync(
                        CORE_CONFIG.SHARED_STYLES_PATH,
                        "utf-8",
                    );
                }
                return "/* GenAI Studio Preview: Shared Styles Polyfill (Empty) */";
            }
            if (id === "\0genai-preview-config") {
                return `export default ${JSON.stringify(config)};`;
            }
            return null;
        },

        transform(code: string, id: string) {
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

        transformIndexHtml(html: string) {
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
                newHtml = newHtml.replace(
                    "</head>",
                    `${heartbeatScript}\n</head>`,
                );
            }

            // 4. Inject geolocation config if not passthrough
            if (config.location.mode !== "passthrough") {
                // Safe stringify to prevent XSS via HTML injection
                const safeConfig = JSON.stringify({
                    location: config.location,
                }).replace(/</g, "\\u003c");
                const geoConfigScript = `
<script>
  window.__GENAI_PREVIEW_CONFIG__ = ${safeConfig};
</script>
<script type="module" src="/@fs${CORE_CONFIG.GEOLOCATION_SHIM_PATH}"></script>`;
                newHtml = newHtml.replace(
                    "</head>",
                    `${geoConfigScript}\n</head>`,
                );
            }

            // 5. Inject mobile viewport meta tag if missing
            if (!newHtml.includes("viewport")) {
                newHtml = newHtml.replace(
                    "<head>",
                    '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
                );
            }

            // 6. Inject entry point
            let entryPoint = config.entryPoint || "";

            if (!entryPoint) {
              const possibleEntries = [
                  "index.tsx",
                  "src/main.tsx",
                  "src/index.tsx",
                  "main.tsx",
              ];
              for (const entry of possibleEntries) {
                  if (fs.existsSync(path.join(projectPath, entry))) {
                      entryPoint = "/" + entry;
                      break;
                  }
              }
            } else {
              // Ensure entryPoint starts with /
              if (!entryPoint.startsWith("/")) {
                entryPoint = "/" + entryPoint;
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
            server.middlewares.use(
                "/__genai_heartbeat",
                (req: IncomingMessage, res: ServerResponse) => {
                    lastHeartbeat = Date.now();
                    hasReceivedFirstHeartbeat = true;
                    res.writeHead(200, { "Content-Type": "text/plain" });
                    res.end("ok");
                },
            );

            // Shutdown endpoint (optional manual trigger)
            server.middlewares.use(
                "/__genai_shutdown",
                (req: IncomingMessage, res: ServerResponse) => {
                    console.log("\n🛑 Manual shutdown requested...");
                    res.writeHead(200, { "Content-Type": "text/plain" });
                    res.end("bye");
                    setTimeout(() => process.exit(0), 500);
                },
            );

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
