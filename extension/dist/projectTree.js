"use strict";
/**
 * Project Tree Provider - Discovers and displays AI Studio projects
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
exports.ProjectTreeProvider = exports.ProjectItem = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
class ProjectItem extends vscode.TreeItem {
    label;
    projectPath;
    projectType;
    collapsibleState;
    constructor(label, projectPath, projectType, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.projectPath = projectPath;
        this.projectType = projectType;
        this.collapsibleState = collapsibleState;
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
exports.ProjectItem = ProjectItem;
class ProjectTreeProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    projects = [];
    refresh() {
        this.discoverProjects().then(() => {
            this._onDidChangeTreeData.fire();
        });
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            // No children for project items
            return Promise.resolve([]);
        }
        // Root level - return all discovered projects
        return this.discoverProjects().then((projects) => projects.map((p) => new ProjectItem(p.name, p.path, p.type, vscode.TreeItemCollapsibleState.None)));
    }
    async discoverProjects() {
        const projects = [];
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
                }
                catch (e) {
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
                }
                catch (e) {
                    console.error("Error scanning feature dir:", e);
                }
            }
            // 3. Check if root folder itself is an AI Studio project
            if (fs.existsSync(path.join(rootDir, "package.json")) &&
                fs.existsSync(path.join(rootDir, "vite.config.ts"))) {
                // Check if it imports @google/genai
                const packageJsonPath = path.join(rootDir, "package.json");
                try {
                    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
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
                }
                catch (e) {
                    // Ignore parse errors
                }
            }
        }
        this.projects = projects;
        return projects;
    }
}
exports.ProjectTreeProvider = ProjectTreeProvider;
//# sourceMappingURL=projectTree.js.map