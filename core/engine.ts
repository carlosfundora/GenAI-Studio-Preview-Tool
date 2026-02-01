import fs from "node:fs";
import { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Plugin, ViteDevServer } from "vite";
import { getConfigAsync, loadConfigAsync } from "./config.js";

// @ts-ignore - eval hides import.meta from TS when compiling to CommonJS
const _dirname =
    typeof __dirname !== "undefined"
        ? __dirname
        : path.dirname(fileURLToPath(eval("import.meta.url")));

/**
 * Get the root of the core files (mocks, shims) regardless of whether we're running
 * from source or from a bundled extension.
 *
 * When bundled: server-entry.js is in extension/dist/, core files are in extension/dist/core/
 * When source:  engine.ts is in core/, core files are in core/
 *
 * Vite will transpile the .ts files to ESM on the fly for browser use.
 */
function getCoreRoot(): string {
    // When bundled, _dirname points to extension/dist (where server-entry.js is)
    // Core files are copied to extension/dist/core/ during build
    const bundledCorePath = path.join(_dirname, "core");
    if (
        fs.existsSync(bundledCorePath) &&
        fs.existsSync(path.join(bundledCorePath, "mocks"))
    ) {
        return bundledCorePath;
    }

    // Fallback: running from source, _dirname is core/
    return _dirname;
}

const CORE_ROOT = getCoreRoot();

/**
 * Shared configuration and path resolution for the GenAI Studio Preview engine.
 * These paths MUST point to TypeScript source files, not compiled JS, because:
 * 1. The compiled JS is CommonJS format (not ESM)
 * 2. Browsers cannot use CommonJS modules
 * 3. Vite will transpile the .ts files to ESM on the fly
 */
export const CORE_CONFIG = {
    MOCK_GENAI_PATH: path.resolve(CORE_ROOT, "./mocks/genai.ts"),
    SHARED_STYLES_PATH: path.resolve(
        CORE_ROOT,
        "./assets/shared-module-styles.css",
    ),
    GEOLOCATION_SHIM_PATH: path.resolve(CORE_ROOT, "./shims/geolocation.ts"),
    MAPS_SHIM_PATH: path.resolve(CORE_ROOT, "./shims/maps.ts"),
};

/**
 * A Vite plugin that prepares AI Studio applications for local preview without modification.
 */
export function GenAIPreviewPlugin(projectPath: string): Plugin {
    const configPromise = loadConfigAsync(projectPath);
    // Track CSS files we've stubbed to avoid repeated filesystem checks
    const stubbedCssFiles = new Set<string>();

    // Cache detected entry point to avoid repeated filesystem checks
    let detectedEntryPoint: string | null = null;

    return {
        name: "genai-preview-transform",
        enforce: "pre",

        resolveId(id: string, importer?: string) {
            // Polyfill missing shared styles regardless of relative path depth
            if (id.includes("shared-module-styles.css")) {
                return "\0genai-shared-styles";
            }
            // Virtual module for config injection
            if (id === "virtual:genai-preview-config") {
                return "\0genai-preview-config";
            }

            // Handle missing CSS files - AI Studio doesn't require CSS files to exist
            if (id.endsWith(".css") && importer) {
                // Resolve the absolute path
                const importerDir = path.dirname(importer);
                const absolutePath = path.resolve(importerDir, id);

                // If CSS file doesn't exist, stub it
                if (!fs.existsSync(absolutePath)) {
                    const virtualId = `\0genai-css-stub:${absolutePath}`;
                    stubbedCssFiles.add(virtualId);
                    console.log(`[GenAI Preview] Stubbing missing CSS: ${id}`);
                    return virtualId;
                }
            }

            return null;
        },

        async load(id: string) {
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
                const config = await configPromise;
                return `export default ${JSON.stringify(config)};`;
            }

            // Return empty CSS for stubbed files
            if (id.startsWith("\0genai-css-stub:")) {
                const originalPath = id.replace("\0genai-css-stub:", "");
                return `/* GenAI Studio Preview: CSS stub for missing file */\n/* Original: ${path.basename(originalPath)} */`;
            }

            return null;
        },

        transform(code: string, id: string) {
            if (id.endsWith(".css")) {
                // Only replace shared-module-styles.css import paths with our local copy
                // This is safe and doesn't affect other CSS content
                if (code.includes("shared-module-styles.css")) {
                    return code.replace(
                        /@import\s+(url\(['\"]?)?(\.\.\/)+(modules\/)?shared-module-styles\.css(['\"]?\))?;?/g,
                        `@import "${CORE_CONFIG.SHARED_STYLES_PATH}";`,
                    );
                }
            }
            return null;
        },

        async transformIndexHtml(html: string) {
            const config = await configPromise;
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
                if (detectedEntryPoint === null) {
                    const possibleEntries = [
                        "index.tsx",
                        "src/main.tsx",
                        "src/index.tsx",
                        "main.tsx",
                    ];
                    detectedEntryPoint = "";
                    for (const entry of possibleEntries) {
                        if (fs.existsSync(path.join(projectPath, entry))) {
                            detectedEntryPoint = "/" + entry;
                            break;
                        }
                    }
                }
                entryPoint = detectedEntryPoint;
            } else {
                // Ensure entryPoint starts with /
                if (!entryPoint.startsWith("/")) {
                    entryPoint = "/" + entryPoint;
                }
            }

            if (entryPoint && !newHtml.includes(entryPoint)) {
                // Sanitize entryPoint to prevent XSS via attribute injection
                const safeEntryPoint = entryPoint.replace(/"/g, "&quot;");
                newHtml = newHtml.replace(
                    "</body>",
                    `<script type="module" src="${safeEntryPoint}"></script>\n</body>`,
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
    const configPromise = loadConfigAsync();
    let lastHeartbeat = Date.now();
    let hasReceivedFirstHeartbeat = false;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    const INITIAL_GRACE_PERIOD_MS = 60000; // 60 seconds to allow browser to connect

    return {
        name: "genai-lifecycle",

        async configureServer(server: ViteDevServer) {
            const config = await configPromise;
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
export { getConfigAsync, loadConfigAsync, type GenAIPreviewConfig } from "./config.js";
