/**
 * GenAI Studio Preview - VS Code Extension
 *
 * Four-panel sidebar design:
 * 1. Active Previews (Webview) - Running URL + QR Code
 * 2. Favorites (Tree) - Starred projects
 * 3. Recent Projects (Tree) - Other projects history
 * 4. Configuration (Webview) - Settings for selection
 */

import * as vscode from "vscode";
import { ActiveWebviewProvider } from "./activeWebview";
import { ConfigWebviewProvider } from "./configWebview";
import { PreviewManager } from "./previewManager";
import { ProjectItem, ProjectsTreeProvider } from "./projectsTree";

let previewManager: PreviewManager;
let projectsTreeProvider: ProjectsTreeProvider;
let favoritesProvider: ProjectsTreeProvider;
let recentsProvider: ProjectsTreeProvider;
let configWebviewProvider: ConfigWebviewProvider;
let activeWebviewProvider: ActiveWebviewProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log("GenAI Studio Preview extension activated");

  // Initialize managers
  previewManager = new PreviewManager(context);

  // Shared data source logic handled internally by providers reading globalState
  favoritesProvider = new ProjectsTreeProvider(
    context,
    previewManager,
    "favorites",
  );
  recentsProvider = new ProjectsTreeProvider(
    context,
    previewManager,
    "recents",
  );

  // We keep a "main" provider just for logic re-use if needed, but UI uses specific ones
  projectsTreeProvider = new ProjectsTreeProvider(
    context,
    previewManager,
    "all",
  );

  configWebviewProvider = new ConfigWebviewProvider(
    context,
    projectsTreeProvider,
  );
  activeWebviewProvider = new ActiveWebviewProvider(previewManager);

  // 1. Active Previews Webview
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "genai-active",
      activeWebviewProvider,
    ),
  );

  // 2. Favorites Tree
  const favoritesView = vscode.window.createTreeView("genai-favorites", {
    treeDataProvider: favoritesProvider,
    showCollapseAll: false,
  });
  context.subscriptions.push(favoritesView);

  // 3. Recent Projects Tree
  const recentsView = vscode.window.createTreeView("genai-recents", {
    treeDataProvider: recentsProvider,
    showCollapseAll: false,
  });
  context.subscriptions.push(recentsView);

  // 4. Configuration Webview
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "genai-config",
      configWebviewProvider,
    ),
  );

  // Unified refresh function
  const refreshAll = () => {
    favoritesProvider.refresh();
    recentsProvider.refresh();
    activeWebviewProvider.refresh();
  };

  // Status change listener
  previewManager.onStatusChange((status) => {
    // Update status bar
    const statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    statusBarItem.text = status.running
      ? `$(beaker) GenAI: ${status.count}`
      : "$(beaker) GenAI";
    statusBarItem.backgroundColor = status.running
      ? new vscode.ThemeColor("statusBarItem.warningBackground")
      : undefined;
    statusBarItem.show();

    refreshAll();
  });

  // Selection handling for config panel
  const handleSelection = (
    e: vscode.TreeViewSelectionChangeEvent<ProjectItem>,
  ) => {
    if (e.selection.length > 0) {
      const item = e.selection[0];
      configWebviewProvider.showProjectConfig(item.projectPath);
    }
  };
  favoritesView.onDidChangeSelection(handleSelection);
  recentsView.onDidChangeSelection(handleSelection);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "genai-preview.launchProject",
      async (item?: ProjectItem) => {
        if (!item) return;
        // Mark as used
        await projectsTreeProvider.markAsUsed(item.projectPath);

        const project = projectsTreeProvider.getProject(item.projectPath);
        if (project) {
          await previewManager.launchPreview(project);
          refreshAll();
        }
      },
    ),

    vscode.commands.registerCommand(
      "genai-preview.stopProject",
      async (item?: ProjectItem | { projectPath: string }) => {
        const path =
          item instanceof ProjectItem ? item.projectPath : item?.projectPath;
        if (!path) return;
        await previewManager.stopPreview(path);
        refreshAll();
      },
    ),

    vscode.commands.registerCommand("genai-preview.addProject", async () => {
      const folderUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        openLabel: "Select Project",
      });
      if (folderUri && folderUri[0]) {
        const projectPath = folderUri[0].fsPath;
        const projectName = await vscode.window.showInputBox({
          prompt: "Project Name",
          value: projectPath.split("/").pop() || "My Project",
        });
        if (projectName) {
          await projectsTreeProvider.addProject(projectName, projectPath);
          refreshAll();
        }
      }
    }),

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
          refreshAll();
        }
      },
    ),

    vscode.commands.registerCommand(
      "genai-preview.toggleFavorite",
      async (item?: ProjectItem) => {
        if (!item) return;
        await projectsTreeProvider.toggleFavorite(item.projectPath);
        refreshAll();
      },
    ),

    vscode.commands.registerCommand("genai-preview.refreshProjects", () => {
      refreshAll();
    }),

    vscode.commands.registerCommand(
      "genai-preview.showQrCode",
      (item?: ProjectItem) => {
        if (!item) return;
        // Just focus active view, ideally we'd highlight the specific one but for now this works
        vscode.commands.executeCommand("genai-active.focus");
      },
    ),
  );
}

export function deactivate() {
  previewManager?.stopAllPreviews();
}
