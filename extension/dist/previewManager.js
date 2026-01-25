"use strict";
/**
 * Preview Manager - Manages Vite preview server instances
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewManager = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const portfinder = __importStar(require("portfinder"));
const vscode = __importStar(require("vscode"));
class PreviewManager {
    previews = new Map();
    context;
    outputChannel;
    statusCallbacks = [];
    constructor(context) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel("GenAI Studio Preview");
    }
    onStatusChange(callback) {
        this.statusCallbacks.push(callback);
    }
    notifyStatusChange() {
        const status = {
            running: this.previews.size > 0,
            count: this.previews.size,
        };
        this.statusCallbacks.forEach((cb) => cb(status));
    }
    async launchPreview(project) {
        // Check if already running
        if (this.previews.has(project.path)) {
            const existing = this.previews.get(project.path);
            vscode.window.showInformationMessage(`Preview already running at ${existing.url}`);
            vscode.env.openExternal(vscode.Uri.parse(existing.url));
            return;
        }
        this.outputChannel.show();
        this.outputChannel.appendLine(`\n🚀 Launching ${project.name}...`);
        try {
            // Find available port
            const port = await portfinder.getPortPromise({ port: 4000 });
            // Get extension config
            const config = vscode.workspace.getConfiguration("genaiPreview");
            const aiMode = config.get("aiMode", "mock");
            const aiEndpoint = config.get("aiEndpoint", "http://localhost:11434/v1");
            const aiModel = config.get("aiModel", "LFM2.5-1.2B-Instruct");
            // Path to the core engine
            const extensionPath = this.context.extensionPath;
            const corePath = path.join(extensionPath, "..", "core");
            // Spawn Vite dev server with our plugin
            const env = {
                ...process.env,
                GENAI_MODE: aiMode,
                GENAI_ENDPOINT: aiEndpoint,
                GENAI_MODEL: aiModel,
                GENAI_PORT: port.toString(),
            };
            const proc = (0, child_process_1.spawn)("npx", ["vite", "--port", port.toString(), "--strictPort", "--host"], {
                cwd: project.path,
                env,
                shell: true,
            });
            const url = `http://localhost:${port}`;
            // Store instance
            this.previews.set(project.path, {
                project,
                process: proc,
                port,
                url,
            });
            // Handle output
            proc.stdout?.on("data", (data) => {
                this.outputChannel.append(data.toString());
            });
            proc.stderr?.on("data", (data) => {
                this.outputChannel.append(data.toString());
            });
            proc.on("close", (code) => {
                this.outputChannel.appendLine(`\n${project.name} exited with code ${code}`);
                this.previews.delete(project.path);
                this.notifyStatusChange();
            });
            proc.on("error", (err) => {
                this.outputChannel.appendLine(`Error: ${err.message}`);
                vscode.window.showErrorMessage(`Failed to start preview: ${err.message}`);
                this.previews.delete(project.path);
                this.notifyStatusChange();
            });
            // Wait a moment for server to start
            await new Promise((resolve) => setTimeout(resolve, 2000));
            this.notifyStatusChange();
            vscode.window
                .showInformationMessage(`Preview running at ${url}`, "Open in Browser")
                .then((action) => {
                if (action === "Open in Browser") {
                    vscode.env.openExternal(vscode.Uri.parse(url));
                }
            });
            // Open in browser
            vscode.env.openExternal(vscode.Uri.parse(url));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.outputChannel.appendLine(`Error: ${message}`);
            vscode.window.showErrorMessage(`Failed to launch preview: ${message}`);
        }
    }
    async stopPreview(projectPath) {
        const instance = this.previews.get(projectPath);
        if (instance) {
            this.outputChannel.appendLine(`Stopping ${instance.project.name}...`);
            instance.process.kill();
            this.previews.delete(projectPath);
            this.notifyStatusChange();
        }
    }
    async stopAllPreviews() {
        this.outputChannel.appendLine("\nStopping all previews...");
        for (const [path, instance] of this.previews) {
            instance.process.kill();
        }
        this.previews.clear();
        this.notifyStatusChange();
    }
    getRunningPreviews() {
        return Array.from(this.previews.values()).map((p) => p.project);
    }
    isRunning(projectPath) {
        return this.previews.has(projectPath);
    }
}
exports.PreviewManager = PreviewManager;
//# sourceMappingURL=previewManager.js.map