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
const portfinder = __importStar(require("portfinder"));
const vscode = __importStar(require("vscode"));
class PreviewManager {
    previews = new Map();
    context;
    outputChannel;
    statusCallbacks = [];
    constructor(context) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel("GenAI Studio Preview Tool");
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
    isRunning(projectPath) {
        return this.previews.has(projectPath);
    }
    getPreviewUrl(projectPath) {
        return this.previews.get(projectPath)?.url;
    }
    async launchPreview(project) {
        if (this.previews.has(project.path)) {
            const existing = this.previews.get(project.path);
            vscode.window.showInformationMessage(`Already running at ${existing.url}`);
            vscode.env.openExternal(vscode.Uri.parse(existing.url));
            return;
        }
        this.outputChannel.show();
        this.outputChannel.appendLine(`\n🚀 Launching ${project.name}...`);
        const config = project.config;
        try {
            // Use configured port or find available
            const port = await portfinder.getPortPromise({ port: config.port });
            this.outputChannel.appendLine(`  Port: ${port}`);
            this.outputChannel.appendLine(`  AI Mode: ${config.aiMode}`);
            if (config.aiMode === "local") {
                this.outputChannel.appendLine(`  Endpoint: ${config.aiEndpoint}`);
                this.outputChannel.appendLine(`  Model: ${config.aiModel}`);
            }
            const env = {
                ...process.env,
                GENAI_MODE: config.aiMode,
                GENAI_ENDPOINT: config.aiEndpoint,
                GENAI_MODEL: config.aiModel,
                GENAI_PORT: port.toString(),
            };
            const proc = (0, child_process_1.spawn)("npx", ["vite", "--port", port.toString(), "--strictPort", "--host"], {
                cwd: project.path,
                env,
                shell: true,
            });
            const url = `http://localhost:${port}`;
            this.previews.set(project.path, {
                project,
                process: proc,
                port,
                url,
            });
            proc.stdout?.on("data", (data) => this.outputChannel.append(data.toString()));
            proc.stderr?.on("data", (data) => this.outputChannel.append(data.toString()));
            proc.on("close", (code) => {
                this.outputChannel.appendLine(`\n${project.name} exited (code ${code})`);
                this.previews.delete(project.path);
                this.notifyStatusChange();
            });
            proc.on("error", (err) => {
                this.outputChannel.appendLine(`Error: ${err.message}`);
                vscode.window.showErrorMessage(`Failed: ${err.message}`);
                this.previews.delete(project.path);
                this.notifyStatusChange();
            });
            await new Promise((resolve) => setTimeout(resolve, 2000));
            this.notifyStatusChange();
            if (config.autoOpen) {
                vscode.env.openExternal(vscode.Uri.parse(url));
            }
            vscode.window
                .showInformationMessage(`Running at ${url}`, "Open")
                .then((action) => {
                if (action)
                    vscode.env.openExternal(vscode.Uri.parse(url));
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.outputChannel.appendLine(`Error: ${message}`);
            vscode.window.showErrorMessage(`Failed: ${message}`);
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
        this.outputChannel.appendLine("\nStopping all...");
        for (const [, instance] of this.previews) {
            instance.process.kill();
        }
        this.previews.clear();
        this.notifyStatusChange();
    }
    getRunningPreviews() {
        return Array.from(this.previews.values()).map((p) => p.project);
    }
}
exports.PreviewManager = PreviewManager;
//# sourceMappingURL=previewManager.js.map