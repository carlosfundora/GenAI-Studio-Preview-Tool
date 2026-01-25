/**
 * Preview Manager - Manages Vite preview server instances
 */

import { ChildProcess, spawn } from "child_process";
import * as path from "path";
import * as portfinder from "portfinder";
import * as vscode from "vscode";

export interface ProjectInfo {
  name: string;
  path: string;
  type: "legacy" | "feature" | "external";
}

interface PreviewInstance {
  project: ProjectInfo;
  process: ChildProcess;
  port: number;
  url: string;
}

type StatusChangeCallback = (status: {
  running: boolean;
  count: number;
}) => void;

export class PreviewManager {
  private previews: Map<string, PreviewInstance> = new Map();
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private statusCallbacks: StatusChangeCallback[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel(
      "GenAI Studio Preview",
    );
  }

  onStatusChange(callback: StatusChangeCallback): void {
    this.statusCallbacks.push(callback);
  }

  private notifyStatusChange(): void {
    const status = {
      running: this.previews.size > 0,
      count: this.previews.size,
    };
    this.statusCallbacks.forEach((cb) => cb(status));
  }

  async launchPreview(project: ProjectInfo): Promise<void> {
    // Check if already running
    if (this.previews.has(project.path)) {
      const existing = this.previews.get(project.path)!;
      vscode.window.showInformationMessage(
        `Preview already running at ${existing.url}`,
      );
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
      const aiMode = config.get<string>("aiMode", "mock");
      const aiEndpoint = config.get<string>(
        "aiEndpoint",
        "http://localhost:11434/v1",
      );
      const aiModel = config.get<string>("aiModel", "LFM2.5-1.2B-Instruct");

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

      const proc = spawn(
        "npx",
        ["vite", "--port", port.toString(), "--strictPort", "--host"],
        {
          cwd: project.path,
          env,
          shell: true,
        },
      );

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
        this.outputChannel.appendLine(
          `\n${project.name} exited with code ${code}`,
        );
        this.previews.delete(project.path);
        this.notifyStatusChange();
      });

      proc.on("error", (err) => {
        this.outputChannel.appendLine(`Error: ${err.message}`);
        vscode.window.showErrorMessage(
          `Failed to start preview: ${err.message}`,
        );
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`Error: ${message}`);
      vscode.window.showErrorMessage(`Failed to launch preview: ${message}`);
    }
  }

  async stopPreview(projectPath: string): Promise<void> {
    const instance = this.previews.get(projectPath);
    if (instance) {
      this.outputChannel.appendLine(`Stopping ${instance.project.name}...`);
      instance.process.kill();
      this.previews.delete(projectPath);
      this.notifyStatusChange();
    }
  }

  async stopAllPreviews(): Promise<void> {
    this.outputChannel.appendLine("\nStopping all previews...");
    for (const [path, instance] of this.previews) {
      instance.process.kill();
    }
    this.previews.clear();
    this.notifyStatusChange();
  }

  getRunningPreviews(): ProjectInfo[] {
    return Array.from(this.previews.values()).map((p) => p.project);
  }

  isRunning(projectPath: string): boolean {
    return this.previews.has(projectPath);
  }
}
