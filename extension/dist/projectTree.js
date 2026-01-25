"use strict";
/**
 * Project Tree Provider - Discovers and displays AI Studio projects
 * Now with persistent project list and per-project configuration
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
exports.RunningTreeProvider = exports.ProjectTreeProvider = exports.ProjectItem = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
class ProjectItem extends vscode.TreeItem {
    label;
    projectPath;
    projectType;
    collapsibleState;
    config;
    constructor(label, projectPath, projectType, collapsibleState, config) {
        super(label, collapsibleState);
        this.label = label;
        this.projectPath = projectPath;
        this.projectType = projectType;
        this.collapsibleState = collapsibleState;
        this.config = config;
        this.tooltip = `${this.projectPath}\nAI Mode: ${config?.aiMode || "mock"}`;
        this.description =
            config?.aiMode === "local" ? `🤖 ${config.aiModel || "local"}` : "mock";
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
            case "custom":
                this.iconPath = new vscode.ThemeIcon("folder");
                break;
        }
    }
}
exports.ProjectItem = ProjectItem;
class ProjectTreeProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    projects = [];
    context;
    constructor(context) {
        this.context = context;
        this.loadProjects();
        this.discoverWorkspaceProjects();
    }
    loadProjects() {
        const stored = this.context.globalState.get("genai-projects", []);
        this.projects = stored;
    }
    async saveProjects() {
        await this.context.globalState.update("genai-projects", this.projects);
    }
    refresh() {
        this.discoverWorkspaceProjects();
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }
        return Promise.resolve(this.projects.map((p) => new ProjectItem(p.name, p.path, p.type, vscode.TreeItemCollapsibleState.None, p.config)));
    }
    getProjects() {
        return this.projects.map((p) => ({
            name: p.name,
            path: p.path,
            type: p.type === "custom" ? "external" : p.type,
            config: p.config,
        }));
    }
    getProjectConfig(projectPath) {
        const project = this.projects.find((p) => p.path === projectPath);
        return project?.config || {};
    }
    async addProject(name, projectPath) {
        // Check if already exists
        if (this.projects.some((p) => p.path === projectPath)) {
            vscode.window.showWarningMessage("Project already in list.");
            return;
        }
        this.projects.push({
            name,
            path: projectPath,
            type: "custom",
            config: {},
        });
        await this.saveProjects();
        this._onDidChangeTreeData.fire();
    }
    async removeProject(projectPath) {
        this.projects = this.projects.filter((p) => p.path !== projectPath);
        await this.saveProjects();
        this._onDidChangeTreeData.fire();
    }
    async updateProjectConfig(projectPath, config) {
        const project = this.projects.find((p) => p.path === projectPath);
        if (project) {
            project.config = { ...project.config, ...config };
            await this.saveProjects();
            this._onDidChangeTreeData.fire();
        }
    }
    discoverWorkspaceProjects() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders)
            return;
        for (const folder of workspaceFolders) {
            const rootDir = folder.uri.fsPath;
            // Auto-discover .versions directories
            const legacyDir = path.join(rootDir, ".versions/legacy");
            const featureDir = path.join(rootDir, ".versions/feature");
            if (fs.existsSync(legacyDir)) {
                this.scanVersionDir(legacyDir, "legacy");
            }
            if (fs.existsSync(featureDir)) {
                this.scanVersionDir(featureDir, "feature");
            }
            // Check if root is an AI Studio project
            if (this.isAIStudioProject(rootDir)) {
                const name = `External: ${path.basename(rootDir)}`;
                if (!this.projects.some((p) => p.path === rootDir)) {
                    this.projects.push({ name, path: rootDir, type: "external" });
                }
            }
        }
    }
    scanVersionDir(dir, type) {
        try {
            const folders = fs
                .readdirSync(dir, { withFileTypes: true })
                .filter((d) => d.isDirectory())
                .map((d) => d.name);
            for (const folderName of folders) {
                const projectPath = path.join(dir, folderName);
                if (fs.existsSync(path.join(projectPath, "package.json"))) {
                    const name = `${type === "legacy" ? "Legacy" : "Feature"}: ${folderName}`;
                    if (!this.projects.some((p) => p.path === projectPath)) {
                        this.projects.push({ name, path: projectPath, type });
                    }
                }
            }
        }
        catch (e) {
            console.error(`Error scanning ${dir}:`, e);
        }
    }
    isAIStudioProject(dir) {
        const packageJsonPath = path.join(dir, "package.json");
        if (!fs.existsSync(packageJsonPath) ||
            !fs.existsSync(path.join(dir, "vite.config.ts"))) {
            return false;
        }
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
            const deps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies,
            };
            return !!deps["@google/genai"];
        }
        catch {
            return false;
        }
    }
}
exports.ProjectTreeProvider = ProjectTreeProvider;
// Running Previews Tree Provider
class RunningTreeProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    previewManager;
    constructor(previewManager) {
        this.previewManager = previewManager;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren() {
        const running = this.previewManager.getRunningPreviews();
        if (running.length === 0) {
            const item = new vscode.TreeItem("No previews running");
            item.iconPath = new vscode.ThemeIcon("circle-outline");
            return Promise.resolve([item]);
        }
        return Promise.resolve(running.map((p) => {
            const item = new vscode.TreeItem(p.name);
            item.iconPath = new vscode.ThemeIcon("debug-start", new vscode.ThemeColor("charts.green"));
            item.description = `Running`;
            item.tooltip = p.path;
            return item;
        }));
    }
}
exports.RunningTreeProvider = RunningTreeProvider;
//# sourceMappingURL=projectTree.js.map