/**
 * Project Tree Provider - Discovers and displays AI Studio projects
 */

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export interface DiscoveredProject {
  name: string;
  path: string;
  type: "legacy" | "feature" | "external";
}

export class ProjectItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly projectPath: string,
    public readonly projectType: "legacy" | "feature" | "external",
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);
    this.tooltip = this.projectPath;
    this.description = this.projectType;
    this.contextValue = "project";

    // Set icon based on type
    switch (this.projectType) {
      case "legacy":
        this.iconPath = new vscode.ThemeIcon("archive");
        break;
      case "feature":
        this.iconPath = new vscode.ThemeIcon("beaker");
        break;
      case "external":
        this.iconPath = new vscode.ThemeIcon("globe");
        break;
    }

    // Make clickable
    this.command = {
      command: "genai-preview.selectProject",
      title: "Launch Preview",
      arguments: [this],
    };
  }
}

export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    ProjectItem | undefined | null | void
  > = new vscode.EventEmitter<ProjectItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    ProjectItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private projects: DiscoveredProject[] = [];

  refresh(): void {
    this.discoverProjects().then(() => {
      this._onDidChangeTreeData.fire();
    });
  }

  getTreeItem(element: ProjectItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ProjectItem): Thenable<ProjectItem[]> {
    if (element) {
      // No children for project items
      return Promise.resolve([]);
    }

    // Root level - return all discovered projects
    return this.discoverProjects().then((projects) =>
      projects.map(
        (p) =>
          new ProjectItem(
            p.name,
            p.path,
            p.type,
            vscode.TreeItemCollapsibleState.None,
          ),
      ),
    );
  }

  async discoverProjects(): Promise<DiscoveredProject[]> {
    const projects: DiscoveredProject[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      return projects;
    }

    for (const folder of workspaceFolders) {
      const rootDir = folder.uri.fsPath;

      // 1. Scan .versions/legacy
      const legacyDir = path.join(rootDir, ".versions/legacy");
      if (fs.existsSync(legacyDir)) {
        try {
          const folders = fs
            .readdirSync(legacyDir, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => d.name);

          for (const folderName of folders) {
            const projectPath = path.join(legacyDir, folderName);
            if (fs.existsSync(path.join(projectPath, "package.json"))) {
              projects.push({
                name: `Legacy: ${folderName}`,
                path: projectPath,
                type: "legacy",
              });
            }
          }
        } catch (e) {
          console.error("Error scanning legacy dir:", e);
        }
      }

      // 2. Scan .versions/feature
      const featureDir = path.join(rootDir, ".versions/feature");
      if (fs.existsSync(featureDir)) {
        try {
          const folders = fs
            .readdirSync(featureDir, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => d.name);

          for (const folderName of folders) {
            const projectPath = path.join(featureDir, folderName);
            if (fs.existsSync(path.join(projectPath, "package.json"))) {
              projects.push({
                name: `Feature: ${folderName}`,
                path: projectPath,
                type: "feature",
              });
            }
          }
        } catch (e) {
          console.error("Error scanning feature dir:", e);
        }
      }

      // 3. Check if root folder itself is an AI Studio project
      if (
        fs.existsSync(path.join(rootDir, "package.json")) &&
        fs.existsSync(path.join(rootDir, "vite.config.ts"))
      ) {
        // Check if it imports @google/genai
        const packageJsonPath = path.join(rootDir, "package.json");
        try {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, "utf-8"),
          );
          const deps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
          };
          if (deps["@google/genai"]) {
            projects.push({
              name: `External: ${path.basename(rootDir)}`,
              path: rootDir,
              type: "external",
            });
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    this.projects = projects;
    return projects;
  }
}
