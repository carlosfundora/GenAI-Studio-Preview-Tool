/**
 * GenAI Studio Preview - VS Code Extension
 *
 * Provides IDE integration for previewing AI Studio prototypes locally.
 */

import * as vscode from "vscode";
import { PreviewManager } from "./previewManager";
import { ProjectItem, ProjectTreeProvider } from "./projectTree";

let previewManager: PreviewManager;
let projectTreeProvider: ProjectTreeProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log("GenAI Studio Preview extension activated");

  // Initialize managers
  previewManager = new PreviewManager(context);
  projectTreeProvider = new ProjectTreeProvider();

  // Register tree view
  const treeView = vscode.window.createTreeView("genai-preview-projects", {
    treeDataProvider: projectTreeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  // Set context for "when" clauses
  vscode.commands.executeCommand(
    "setContext",
    "genai-preview.hasProjects",
    true,
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("genai-preview.launch", async () => {
      const projects = await projectTreeProvider.discoverProjects();

      if (projects.length === 0) {
        vscode.window.showWarningMessage(
          "No AI Studio projects found in workspace.",
        );
        return;
      }

      if (projects.length === 1) {
        await previewManager.launchPreview(projects[0]);
        return;
      }

      // Multiple projects - show quick pick
      const selected = await vscode.window.showQuickPick(
        projects.map((p) => ({
          label: p.name,
          description: p.path,
          project: p,
        })),
        { placeHolder: "Select a project to preview" },
      );

      if (selected) {
        await previewManager.launchPreview(selected.project);
      }
    }),

    vscode.commands.registerCommand("genai-preview.stop", async () => {
      await previewManager.stopAllPreviews();
      vscode.window.showInformationMessage("All previews stopped.");
    }),

    vscode.commands.registerCommand(
      "genai-preview.selectProject",
      async (item?: ProjectItem) => {
        if (item) {
          await previewManager.launchPreview({
            name: item.label as string,
            path: item.projectPath,
            type: item.projectType,
          });
        }
      },
    ),

    vscode.commands.registerCommand("genai-preview.refresh", () => {
      projectTreeProvider.refresh();
    }),
  );

  // Status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = "$(zap) GenAI";
  statusBarItem.tooltip = "GenAI Studio Preview";
  statusBarItem.command = "genai-preview.launch";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Watch for preview status changes
  previewManager.onStatusChange((status) => {
    if (status.running) {
      statusBarItem.text = `$(zap) GenAI: ${status.count} running`;
      statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
    } else {
      statusBarItem.text = "$(zap) GenAI";
      statusBarItem.backgroundColor = undefined;
    }
  });

  // Initial project discovery
  projectTreeProvider.refresh();
}

export function deactivate() {
  if (previewManager) {
    previewManager.stopAllPreviews();
  }
}
