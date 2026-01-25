"use strict";
/**
 * GenAI Studio Preview Tool - VS Code Extension
 *
 * Three-panel sidebar design:
 * 1. Active Previews (Webview) - Running URL + QR Code
 * 2. Projects (Tree) - List of projects (Favorites + All)
 * 3. Configuration (Webview) - Settings for selection
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
const activeWebview_1 = require("./activeWebview");
const configWebview_1 = require("./configWebview");
const previewManager_1 = require("./previewManager");
const projectsTree_1 = require("./projectsTree");
let previewManager;
let projectsTreeProvider;
let configWebviewProvider;
let activeWebviewProvider;
function activate(context) {
    console.log("GenAI Studio Preview extension activated");
    // Initialize managers
    previewManager = new previewManager_1.PreviewManager(context);
    projectsTreeProvider = new projectsTree_1.ProjectsTreeProvider(context, previewManager);
    configWebviewProvider = new configWebview_1.ConfigWebviewProvider(context, projectsTreeProvider);
    activeWebviewProvider = new activeWebview_1.ActiveWebviewProvider(previewManager);
    // 1. Active Previews Webview
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("genai-active", activeWebviewProvider));
    // 2. Projects Tree
    const projectsView = vscode.window.createTreeView("genai-projects", {
        treeDataProvider: projectsTreeProvider,
        showCollapseAll: false,
    });
    context.subscriptions.push(projectsView);
    // 3. Configuration Webview
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("genai-config", configWebviewProvider));
    // Unified refresh function
    const refreshAll = () => {
        projectsTreeProvider.refresh();
        activeWebviewProvider.refresh();
    };
    // Status change listener
    previewManager.onStatusChange((status) => {
        // Update status bar
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
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
    projectsView.onDidChangeSelection((e) => {
        if (e.selection.length > 0) {
            const item = e.selection[0];
            configWebviewProvider.showProjectConfig(item.projectPath);
        }
    });
    // Commands
    context.subscriptions.push(vscode.commands.registerCommand("genai-preview.launchProject", async (item) => {
        if (!item)
            return;
        await projectsTreeProvider.markAsUsed(item.projectPath);
        const project = projectsTreeProvider.getProject(item.projectPath);
        if (project) {
            await previewManager.launchPreview(project);
            refreshAll();
        }
    }), vscode.commands.registerCommand("genai-preview.stopProject", async (item) => {
        const path = item instanceof projectsTree_1.ProjectItem ? item.projectPath : item?.projectPath;
        if (!path)
            return;
        await previewManager.stopPreview(path);
        refreshAll();
    }), vscode.commands.registerCommand("genai-preview.addProject", async () => {
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
    }), vscode.commands.registerCommand("genai-preview.removeProject", async (item) => {
        if (!item)
            return;
        const confirm = await vscode.window.showWarningMessage(`Remove "${item.label}"?`, { modal: true }, "Remove");
        if (confirm === "Remove") {
            await projectsTreeProvider.removeProject(item.projectPath);
            refreshAll();
        }
    }), vscode.commands.registerCommand("genai-preview.toggleFavorite", async (item) => {
        if (!item)
            return;
        await projectsTreeProvider.toggleFavorite(item.projectPath);
        refreshAll();
    }), vscode.commands.registerCommand("genai-preview.refreshProjects", () => {
        refreshAll();
    }), vscode.commands.registerCommand("genai-preview.showQrCode", (item) => {
        if (!item)
            return;
        vscode.commands.executeCommand("genai-active.focus");
    }));
}
function deactivate() {
    previewManager?.stopAllPreviews();
}
//# sourceMappingURL=extension.js.map