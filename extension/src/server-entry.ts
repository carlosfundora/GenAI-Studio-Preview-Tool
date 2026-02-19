import { createRequire } from "module";
import path from "path";
import {
    CORE_CONFIG,
    GenAILifecyclePlugin,
    GenAIPreviewPlugin,
} from "@core/engine";

// Rudimentary arg parsing to avoid dependencies
function getArg(name: string): string | undefined {
    const index = process.argv.indexOf(name);
    return index !== -1 ? process.argv[index + 1] : undefined;
}

const projectPath = getArg("--project");
const portStr = getArg("--port");

if (!projectPath || !portStr) {
    console.error("Usage: node server-entry.js --project <path> --port <port>");
    process.exit(1);
}

const port = parseInt(portStr, 10);

async function startServer() {
    try {
        // Dynamically resolve vite from the project's node_modules
        // This allows us to use whatever vite version the project has installed
        const projectRequire = createRequire(
            path.join(projectPath!, "package.json"),
        );
        let vite: typeof import("vite");

        try {
            vite = projectRequire("vite");
        } catch {
            console.error(
                "Error: Could not find 'vite' in your project.\n" +
                    "Please ensure vite is installed: npm install vite",
            );
            process.exit(1);
        }

        const config: any = {
            configFile: path.join(projectPath!, "vite.config.ts"),
            root: projectPath!,
            server: {
                port: port,
                strictPort: true,
                open: false,
            },
            plugins: [
                GenAIPreviewPlugin(projectPath!) as any,
                GenAILifecyclePlugin() as any,
            ],
            resolve: {
                alias: [
                    {
                        find: "@google/genai",
                        replacement: CORE_CONFIG.MOCK_GENAI_PATH,
                    },
                    {
                        find: "@googlemaps/js-api-loader",
                        replacement: CORE_CONFIG.MAPS_SHIM_PATH,
                    },
                    // Handle shared-module-styles.css at any depth
                    {
                        find: /.*shared-module-styles\.css$/,
                        replacement: CORE_CONFIG.SHARED_STYLES_PATH,
                    },
                ],
            },
            optimizeDeps: {
                include: ["react", "react-dom"],
            },
        };

        const server = await vite.createServer(config);

        await server.listen();

        const url = server.resolvedUrls?.local[0] || `http://localhost:${port}`;
        console.log(`Server started at ${url}`);

        // Notify parent process (the extension)
        if (process.send) {
            process.send({ type: "genai:ready", url });
        }
    } catch (e: any) {
        console.error(`Failed to start server: ${e.message}`);
        if (process.send) {
            process.send({ type: "genai:error", message: e.message });
        }
        process.exit(1);
    }
}

startServer();
