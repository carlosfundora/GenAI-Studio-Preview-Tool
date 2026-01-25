/**
 * GenAI Studio Preview - VS Code Extension
 *
 * Two-panel sidebar design:
 * - Top: Projects list with play/stop buttons
 * - Bottom: Configuration webview for selected project
 */

import * as vscode from "vscode";
import { ConfigWebviewProvider } from "./configWebview";
import { PreviewManager } from "./previewManager";
import { ProjectItem, ProjectsTreeProvider } from "./projectsTree";

let previewManager: PreviewManager;
let projectsTreeProvider: ProjectsTreeProvider;
let configWebviewProvider: ConfigWebviewProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log("GenAI Studio Preview extension activated");

  // Initialize managers
  previewManager = new PreviewManager(context);
  projectsTreeProvider = new ProjectsTreeProvider(context, previewManager);
  configWebviewProvider = new ConfigWebviewProvider(
    context,
    projectsTreeProvider,
  );

  // Register Projects tree view
  const projectsView = vscode.window.createTreeView("genai-projects", {
    treeDataProvider: projectsTreeProvider,
    showCollapseAll: false,
  });
  context.subscriptions.push(projectsView);

  // When selection changes, update the config panel
  projectsView.onDidChangeSelection((e) => {
    if (e.selection.length > 0) {
      const item = e.selection[0] as ProjectItem;
      configWebviewProvider.showProjectConfig(item.projectPath);
    }
  });

  // Register Configuration webview
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "genai-config",
      configWebviewProvider,
    ),
  );

  // Register commands
  context.subscriptions.push(
    // Launch a project
    vscode.commands.registerCommand(
      "genai-preview.launchProject",
      async (item?: ProjectItem) => {
        if (!item) {
          vscode.window.showWarningMessage("Select a project to launch.");
          return;
        }
        const project = projectsTreeProvider.getProject(item.projectPath);
        if (project) {
          await previewManager.launchPreview(project);
          projectsTreeProvider.refresh();
        }
      },
    ),

    // Stop a project
    vscode.commands.registerCommand(
      "genai-preview.stopProject",
      async (item?: ProjectItem) => {
        if (!item) return;
        await previewManager.stopPreview(item.projectPath);
        projectsTreeProvider.refresh();
      },
    ),

    // Add a new project
    vscode.commands.registerCommand("genai-preview.addProject", async () => {
      const folderUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: "Select AI Studio Project",
        title: "Add AI Studio Project",
      });
      if (folderUri && folderUri[0]) {
        const projectPath = folderUri[0].fsPath;
        const projectName = await vscode.window.showInputBox({
          prompt: "Enter a name for this project",
          value: projectPath.split("/").pop() || "My Project",
        });
        if (projectName) {
          await projectsTreeProvider.addProject(projectName, projectPath);
          vscode.window.showInformationMessage(`Added: ${projectName}`);
        }
      }
    }),

    // Remove a project
    vscode.commands.registerCommand(
      "genai-preview.removeProject",
      async (item?: ProjectItem) => {
        if (!item) return;
        const confirm = await vscode.window.showWarningMessage(
          `Remove "${item.label}"?`,
          { modal: true },
          "Remove",
        );
        if (confirm === "Remove") {
          await projectsTreeProvider.removeProject(item.projectPath);
        }
      },
    ),

    // Refresh projects
    vscode.commands.registerCommand("genai-preview.refreshProjects", () => {
      projectsTreeProvider.refresh();
    }),

    // Open in browser
    vscode.commands.registerCommand(
      "genai-preview.openInBrowser",
      (item?: ProjectItem) => {
        if (!item) return;
        const url = previewManager.getPreviewUrl(item.projectPath);
        if (url) {
          vscode.env.openExternal(vscode.Uri.parse(url));
        }
      },
    ),
  );

  // Status bar
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = "$(beaker) GenAI";
  statusBarItem.tooltip = "GenAI Studio Preview";
  statusBarItem.command = "workbench.view.extension.genai-preview";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  previewManager.onStatusChange((status) => {
    statusBarItem.text = status.running
      ? `$(beaker) GenAI: ${status.count}`
      : "$(beaker) GenAI";
    statusBarItem.backgroundColor = status.running
      ? new vscode.ThemeColor("statusBarItem.warningBackground")
      : undefined;
    projectsTreeProvider.refresh();
  });
}

export function deactivate() {
  previewManager?.stopAllPreviews();
}
