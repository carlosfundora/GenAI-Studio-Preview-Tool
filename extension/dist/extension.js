"use strict";
/**
 * GenAI Studio Preview - VS Code Extension
 *
 * Provides IDE integration for previewing AI Studio prototypes locally.
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
const previewManager_1 = require("./previewManager");
const projectTree_1 = require("./projectTree");
let previewManager;
let projectTreeProvider;
function activate(context) {
    console.log("GenAI Studio Preview extension activated");
    // Initialize managers
    previewManager = new previewManager_1.PreviewManager(context);
    projectTreeProvider = new projectTree_1.ProjectTreeProvider();
    // Register tree view
    const treeView = vscode.window.createTreeView("genai-preview-projects", {
        treeDataProvider: projectTreeProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(treeView);
    // Set context for "when" clauses
    vscode.commands.executeCommand("setContext", "genai-preview.hasProjects", true);
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand("genai-preview.launch", async () => {
        const projects = await projectTreeProvider.discoverProjects();
        if (projects.length === 0) {
            vscode.window.showWarningMessage("No AI Studio projects found in workspace.");
            return;
        }
        if (projects.length === 1) {
            await previewManager.launchPreview(projects[0]);
            return;
        }
        // Multiple projects - show quick pick
        const selected = await vscode.window.showQuickPick(projects.map((p) => ({
            label: p.name,
            description: p.path,
            project: p,
        })), { placeHolder: "Select a project to preview" });
        if (selected) {
            await previewManager.launchPreview(selected.project);
        }
    }), vscode.commands.registerCommand("genai-preview.stop", async () => {
        await previewManager.stopAllPreviews();
        vscode.window.showInformationMessage("All previews stopped.");
    }), vscode.commands.registerCommand("genai-preview.selectProject", async (item) => {
        if (item) {
            await previewManager.launchPreview({
                name: item.label,
                path: item.projectPath,
                type: item.projectType,
            });
        }
    }), vscode.commands.registerCommand("genai-preview.refresh", () => {
        projectTreeProvider.refresh();
    }));
    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(zap) GenAI";
    statusBarItem.tooltip = "GenAI Studio Preview";
    statusBarItem.command = "genai-preview.launch";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Watch for preview status changes
    previewManager.onStatusChange((status) => {
        if (status.running) {
            statusBarItem.text = `$(zap) GenAI: ${status.count} running`;
            statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
        }
        else {
            statusBarItem.text = "$(zap) GenAI";
            statusBarItem.backgroundColor = undefined;
        }
    });
    // Initial project discovery
    projectTreeProvider.refresh();
}
function deactivate() {
    if (previewManager) {
        previewManager.stopAllPreviews();
    }
}
//# sourceMappingURL=extension.js.map