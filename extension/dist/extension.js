"use strict";
/**
 * GenAI Studio Preview - VS Code Extension
 *
 * Two-panel sidebar design:
 * - Top: Projects list with play/stop buttons
 * - Bottom: Configuration webview for selected project
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const configWebview_1 = require("./configWebview");
const previewManager_1 = require("./previewManager");
const projectsTree_1 = require("./projectsTree");
let previewManager;
let projectsTreeProvider;
let configWebviewProvider;
function activate(context) {
    console.log("GenAI Studio Preview extension activated");
    // Initialize managers
    previewManager = new previewManager_1.PreviewManager(context);
    projectsTreeProvider = new projectsTree_1.ProjectsTreeProvider(context, previewManager);
    configWebviewProvider = new configWebview_1.ConfigWebviewProvider(context, projectsTreeProvider);
    // Register Projects tree view
    const projectsView = vscode.window.createTreeView("genai-projects", {
        treeDataProvider: projectsTreeProvider,
        showCollapseAll: false,
    });
    context.subscriptions.push(projectsView);
    // When selection changes, update the config panel
    projectsView.onDidChangeSelection((e) => {
        if (e.selection.length > 0) {
            const item = e.selection[0];
            configWebviewProvider.showProjectConfig(item.projectPath);
        }
    });
    // Register Configuration webview
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("genai-config", configWebviewProvider));
    // Register commands
    context.subscriptions.push(
    // Launch a project
    vscode.commands.registerCommand("genai-preview.launchProject", async (item) => {
        if (!item) {
            vscode.window.showWarningMessage("Select a project to launch.");
            return;
        }
        const project = projectsTreeProvider.getProject(item.projectPath);
        if (project) {
            await previewManager.launchPreview(project);
            projectsTreeProvider.refresh();
        }
    }), 
    // Stop a project
    vscode.commands.registerCommand("genai-preview.stopProject", async (item) => {
        if (!item)
            return;
        await previewManager.stopPreview(item.projectPath);
        projectsTreeProvider.refresh();
    }), 
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
    vscode.commands.registerCommand("genai-preview.removeProject", async (item) => {
        if (!item)
            return;
        const confirm = await vscode.window.showWarningMessage(`Remove "${item.label}"?`, { modal: true }, "Remove");
        if (confirm === "Remove") {
            await projectsTreeProvider.removeProject(item.projectPath);
        }
    }), 
    // Refresh projects
    vscode.commands.registerCommand("genai-preview.refreshProjects", () => {
        projectsTreeProvider.refresh();
    }), 
    // Open in browser
    vscode.commands.registerCommand("genai-preview.openInBrowser", (item) => {
        if (!item)
            return;
        const url = previewManager.getPreviewUrl(item.projectPath);
        if (url) {
            vscode.env.openExternal(vscode.Uri.parse(url));
        }
    }));
    // Status bar
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
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
function deactivate() {
    previewManager?.stopAllPreviews();
}
//# sourceMappingURL=extension.js.map