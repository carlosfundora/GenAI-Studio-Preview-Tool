"use strict";
/**
 * Projects Tree Provider - Shows list of AI Studio projects with play/stop buttons
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
exports.ProjectsTreeProvider = exports.ProjectItem = void 0;
const vscode = __importStar(require("vscode"));
const DEFAULT_CONFIG = {
    port: 4000,
    aiMode: "mock",
    aiEndpoint: "http://localhost:11434/v1",
    aiModel: "LFM2.5-1.2B-Instruct",
    autoOpen: true,
    hotReload: true,
};
class ProjectItem extends vscode.TreeItem {
    label;
    projectPath;
    isRunning;
    config;
    constructor(label, projectPath, isRunning, config) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.projectPath = projectPath;
        this.isRunning = isRunning;
        this.config = config;
        this.tooltip = `${projectPath}\nPort: ${config.port} | AI: ${config.aiMode}`;
        this.description = isRunning ? "● Running" : config.aiMode;
        this.contextValue = isRunning ? "project-running" : "project-stopped";
        this.iconPath = new vscode.ThemeIcon(isRunning ? "debug-start" : "folder", isRunning ? new vscode.ThemeColor("charts.green") : undefined);
    }
}
exports.ProjectItem = ProjectItem;
class ProjectsTreeProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    projects = [];
    context;
    previewManager;
    constructor(context, previewManager) {
        this.context = context;
        this.previewManager = previewManager;
        this.loadProjects();
    }
    loadProjects() {
        this.projects = this.context.globalState.get("genai-projects", []);
    }
    async saveProjects() {
        await this.context.globalState.update("genai-projects", this.projects);
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren() {
        return Promise.resolve(this.projects.map((p) => new ProjectItem(p.name, p.path, this.previewManager.isRunning(p.path), p.config)));
    }
    getProject(projectPath) {
        return this.projects.find((p) => p.path === projectPath);
    }
    getProjectConfig(projectPath) {
        return this.getProject(projectPath)?.config || { ...DEFAULT_CONFIG };
    }
    async addProject(name, projectPath) {
        if (this.projects.some((p) => p.path === projectPath)) {
            vscode.window.showWarningMessage("Project already added.");
            return;
        }
        // Find next available port
        const usedPorts = this.projects.map((p) => p.config.port);
        let port = 4000;
        while (usedPorts.includes(port))
            port++;
        this.projects.push({
            name,
            path: projectPath,
            config: { ...DEFAULT_CONFIG, port },
        });
        await this.saveProjects();
        this.refresh();
    }
    async removeProject(projectPath) {
        this.projects = this.projects.filter((p) => p.path !== projectPath);
        await this.saveProjects();
        this.refresh();
    }
    async updateProjectConfig(projectPath, config) {
        const project = this.projects.find((p) => p.path === projectPath);
        if (project) {
            project.config = { ...project.config, ...config };
            await this.saveProjects();
            this.refresh();
        }
    }
}
exports.ProjectsTreeProvider = ProjectsTreeProvider;
//# sourceMappingURL=projectsTree.js.map