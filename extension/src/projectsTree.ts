/**
 * Projects Tree Provider - Shows list of AI Studio projects with play/stop buttons
 */

import * as path from "path";
import * as os from "os";
import * as vscode from "vscode";
import { PreviewManager } from "./previewManager";

export interface StoredProject {
  name: string;
  path: string;
  config: ProjectConfig;
  isFavorite?: boolean;
  lastUsed?: number;
}

export interface ProjectConfig {
  port: number;
  aiMode: "mock" | "local";
  aiEndpoint: string;
  aiModel: string;
  entryPoint: string;
  autoOpen: boolean;
  hotReload: boolean;
}

const DEFAULT_CONFIG: ProjectConfig = {
  port: 4000,
  aiMode: "mock",
  aiEndpoint: "http://localhost:11434/v1",
  aiModel: "LFM2.5-1.2B-Instruct",
  entryPoint: "",
  autoOpen: true,
  hotReload: true,
};

export class ProjectItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly projectPath: string,
    public readonly isRunning: boolean,
    public readonly config: ProjectConfig,
    public readonly isFavorite: boolean,
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.tooltip = `${projectPath}\nPort: ${config.port} | AI: ${config.aiMode}`;
    this.description = isRunning ? "● Running" : isFavorite ? "★" : undefined;

    let contextValue = isRunning ? "project-running" : "project-stopped";
    if (isFavorite) {
      contextValue += "-favorite";
    }
    this.contextValue = contextValue;

    this.iconPath = new vscode.ThemeIcon(
      isRunning ? "debug-start" : "folder",
      isRunning ? new vscode.ThemeColor("charts.green") : undefined,
    );
  }
}

export class ProjectsTreeProvider implements vscode.TreeDataProvider<ProjectItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ProjectItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private projects: StoredProject[] = [];
  private context: vscode.ExtensionContext;
  private previewManager: PreviewManager;

  constructor(
    context: vscode.ExtensionContext,
    previewManager: PreviewManager,
  ) {
    this.context = context;
    this.previewManager = previewManager;
    this.loadProjects();
  }

  private loadProjects(): void {
    // Shared state across all provider instances
    this.projects = this.context.globalState.get<StoredProject[]>(
      "genai-projects",
      [],
    );
  }

  private async saveProjects(): Promise<void> {
    await this.context.globalState.update("genai-projects", this.projects);
    // Trigger refresh on all providers is handled by command
  }

  refresh(): void {
    this.loadProjects(); // Reload latest state
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProjectItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<ProjectItem[]> {
    // Sort: Favorites first, then by name
    const sorted = [...this.projects].sort((a, b) => {
      if (a.isFavorite === b.isFavorite) {
        return a.name.localeCompare(b.name);
      }
      return a.isFavorite ? -1 : 1;
    });

    return Promise.resolve(
      sorted.map(
        (p) =>
          new ProjectItem(
            p.name,
            p.path,
            this.previewManager.isRunning(p.path),
            p.config,
            !!p.isFavorite,
          ),
      ),
    );
  }

  getProject(projectPath: string): StoredProject | undefined {
    return this.projects.find((p) => p.path === projectPath);
  }

  getProjectConfig(projectPath: string): ProjectConfig {
    return this.getProject(projectPath)?.config || { ...DEFAULT_CONFIG };
  }

  async addProject(name: string, projectPath: string): Promise<void> {
    // 1. Security: Validate path is absolute and doesn't contain traversal
    const normalizedPath = path.normalize(projectPath);
    console.log(`[GenAI] Adding project: ${projectPath} -> ${normalizedPath}`);

    if (normalizedPath !== projectPath || projectPath.includes("..")) {
      console.error(`[GenAI] Security Alert: Invalid path traversal detected: "${projectPath}"`);
      vscode.window.showErrorMessage(
        `Failed to add project: The path "${projectPath}" is unsafe.`,
      );
      return;
    }

    // 2. Security: Ensure path is within user workspace or home directory
    const homedir = os.homedir();
    const workspaceFolders =
      vscode.workspace.workspaceFolders?.map((f) => f.uri.fsPath) || [];
    const allowedRoots = [homedir, ...workspaceFolders];

    console.log(`[GenAI] Allowed roots: ${allowedRoots.join(", ")}`);
    console.log(`[GenAI] Checking if matches: ${normalizedPath}`);

    const isAllowed = allowedRoots.some((root) =>
      normalizedPath.startsWith(root),
    );
    if (!isAllowed) {
      console.error(`[GenAI] Security Alert: Path "${normalizedPath}" is not within allowed roots (Home or Workspace).`);
      vscode.window.showErrorMessage(
        "Access Denied: Projects must be located within your home directory or an open workspace folder for security reasons.",
      );
      return;
    }

    // 3. Validation: Check for package.json
    const packageJsonPath = vscode.Uri.file(normalizedPath + "/package.json");
    try {
      await vscode.workspace.fs.stat(packageJsonPath);
      console.log(`[GenAI] Validation Success: Found package.json at ${packageJsonPath.fsPath}`);
    } catch {
      console.error(`[GenAI] Validation Error: No package.json found at ${packageJsonPath.fsPath}`);
      vscode.window.showErrorMessage(
        `Invalid Project: The folder "${normalizedPath}" does not appear to be a Node.js project (missing package.json).`,
      );
      return;
    }

    if (this.projects.some((p) => p.path === normalizedPath)) {
      vscode.window.showWarningMessage("Project already added.");
      return;
    }

    const usedPorts = this.projects.map((p) => p.config.port);
    let port = 4000;
    while (usedPorts.includes(port)) port++;

    console.log(`[GenAI] Assigned port ${port} for ${name}`);

    // Load defaults from VS Code settings
    const globalConfig = vscode.workspace.getConfiguration("genaiPreview");

    this.projects.push({
      name,
      path: normalizedPath,
      isFavorite: false,
      lastUsed: Date.now(),
      config: {
        ...DEFAULT_CONFIG,
        port,
        aiMode:
          globalConfig.get<"mock" | "local">("AI.Mode") ||
          DEFAULT_CONFIG.aiMode,
        aiEndpoint:
          globalConfig.get<string>("AI.Endpoint") || DEFAULT_CONFIG.aiEndpoint,
        aiModel: globalConfig.get<string>("AI.Model") || DEFAULT_CONFIG.aiModel,
      },
    });
    await this.saveProjects();
    console.log(`[GenAI] Project saved. Total projects: ${this.projects.length}`);
  }

  async removeProject(projectPath: string): Promise<void> {
    this.projects = this.projects.filter((p) => p.path !== projectPath);
    await this.saveProjects();
  }

  async updateProjectConfig(
    projectPath: string,
    config: Partial<ProjectConfig>,
  ): Promise<void> {
    const project = this.projects.find((p) => p.path === projectPath);
    if (project) {
      project.config = { ...project.config, ...config };
      await this.saveProjects();
    }
  }

  async toggleFavorite(projectPath: string): Promise<void> {
    const project = this.projects.find((p) => p.path === projectPath);
    if (project) {
      project.isFavorite = !project.isFavorite;
      await this.saveProjects();
    }
  }

  async markAsUsed(projectPath: string): Promise<void> {
    const project = this.projects.find((p) => p.path === projectPath);
    if (project) {
      project.lastUsed = Date.now();
      await this.saveProjects();
    }
  }
}
