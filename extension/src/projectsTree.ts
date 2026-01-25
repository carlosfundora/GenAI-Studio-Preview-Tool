/**
 * Projects Tree Provider - Shows list of AI Studio projects with play/stop buttons
 */

import * as vscode from "vscode";
import { PreviewManager } from "./previewManager";

export interface StoredProject {
  name: string;
  path: string;
  config: ProjectConfig;
}

export interface ProjectConfig {
  port: number;
  aiMode: "mock" | "local";
  aiEndpoint: string;
  aiModel: string;
  autoOpen: boolean;
  hotReload: boolean;
}

const DEFAULT_CONFIG: ProjectConfig = {
  port: 4000,
  aiMode: "mock",
  aiEndpoint: "http://localhost:11434/v1",
  aiModel: "LFM2.5-1.2B-Instruct",
  autoOpen: true,
  hotReload: true,
};

export class ProjectItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly projectPath: string,
    public readonly isRunning: boolean,
    public readonly config: ProjectConfig,
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.tooltip = `${projectPath}\nPort: ${config.port} | AI: ${config.aiMode}`;
    this.description = isRunning ? "● Running" : config.aiMode;
    this.contextValue = isRunning ? "project-running" : "project-stopped";

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
    this.projects = this.context.globalState.get<StoredProject[]>(
      "genai-projects",
      [],
    );
  }

  private async saveProjects(): Promise<void> {
    await this.context.globalState.update("genai-projects", this.projects);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProjectItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<ProjectItem[]> {
    return Promise.resolve(
      this.projects.map(
        (p) =>
          new ProjectItem(
            p.name,
            p.path,
            this.previewManager.isRunning(p.path),
            p.config,
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
    if (this.projects.some((p) => p.path === projectPath)) {
      vscode.window.showWarningMessage("Project already added.");
      return;
    }

    // Find next available port
    const usedPorts = this.projects.map((p) => p.config.port);
    let port = 4000;
    while (usedPorts.includes(port)) port++;

    this.projects.push({
      name,
      path: projectPath,
      config: { ...DEFAULT_CONFIG, port },
    });
    await this.saveProjects();
    this.refresh();
  }

  async removeProject(projectPath: string): Promise<void> {
    this.projects = this.projects.filter((p) => p.path !== projectPath);
    await this.saveProjects();
    this.refresh();
  }

  async updateProjectConfig(
    projectPath: string,
    config: Partial<ProjectConfig>,
  ): Promise<void> {
    const project = this.projects.find((p) => p.path === projectPath);
    if (project) {
      project.config = { ...project.config, ...config };
      await this.saveProjects();
      this.refresh();
    }
  }
}
