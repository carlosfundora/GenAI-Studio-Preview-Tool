/**
 * Preview Manager - Manages Vite preview server instances
 */

import { ChildProcess, spawn } from "child_process";
import * as path from "path";
import * as portfinder from "portfinder";
import * as vscode from "vscode";
import { StoredProject } from "./projectsTree";

interface PreviewInstance {
  project: StoredProject;
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
      "GenAI Studio Preview Tool",
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

  isRunning(projectPath: string): boolean {
    return this.previews.has(projectPath);
  }

  getPreviewUrl(projectPath: string): string | undefined {
    return this.previews.get(projectPath)?.url;
  }

  async launchPreview(project: StoredProject): Promise<void> {
    if (this.previews.has(project.path)) {
      const existing = this.previews.get(project.path)!;
      vscode.window.showInformationMessage(
        `Already running at ${existing.url}`,
      );
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

      const serverEntry = path.join(
        this.context.extensionPath,
        "dist",
        "extension",
        "src",
        "server-entry.js",
      );

      const proc = spawn(
        "node",
        [serverEntry, "--project", project.path, "--port", port.toString()],
        {
          cwd: project.path,
          env,
          stdio: ["pipe", "pipe", "pipe", "ipc"],
        },
      );

      // Default URL until updated by server
      let url = `http://localhost:${port}`;

      this.previews.set(project.path, {
        project,
        process: proc,
        port,
        url,
      });

      proc.stdout?.on("data", (data) =>
        this.outputChannel.append(data.toString()),
      );
      proc.stderr?.on("data", (data) =>
        this.outputChannel.append(data.toString()),
      );

      proc.on("message", (msg: any) => {
        if (msg && msg.type === "genai:ready") {
          url = msg.url;
          const instance = this.previews.get(project.path);
          if (instance) {
            instance.url = url;
            this.notifyStatusChange(); // Update UI with correct URL

            vscode.window
              .showInformationMessage(`Running at ${url}`, "Open")
              .then((action) => {
                if (action) vscode.env.openExternal(vscode.Uri.parse(url));
              });

            if (config.autoOpen) {
              vscode.env.openExternal(vscode.Uri.parse(url));
            }
          }
        } else if (msg && msg.type === "genai:error") {
          vscode.window.showErrorMessage(`Server Error: ${msg.message}`);
        }
      });

      proc.on("close", (code) => {
        this.outputChannel.appendLine(
          `\n${project.name} exited (code ${code})`,
        );
        this.previews.delete(project.path);
        this.notifyStatusChange();
      });

      proc.on("error", (err) => {
        this.outputChannel.appendLine(`Error: ${err.message}`);
        vscode.window.showErrorMessage(`Failed: ${err.message}`);
        this.previews.delete(project.path);
        this.notifyStatusChange();
      });

      this.notifyStatusChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(`Error: ${message}`);
      vscode.window.showErrorMessage(`Failed: ${message}`);
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
    this.outputChannel.appendLine("\nStopping all...");
    for (const [, instance] of this.previews) {
      instance.process.kill();
    }
    this.previews.clear();
    this.notifyStatusChange();
  }

  getRunningPreviews(): StoredProject[] {
    return Array.from(this.previews.values()).map((p) => p.project);
  }
}
