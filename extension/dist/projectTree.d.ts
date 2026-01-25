/**
 * Project Tree Provider - Discovers and displays AI Studio projects
 * Now with persistent project list and per-project configuration
 */
import * as vscode from "vscode";
import { PreviewManager, ProjectInfo } from "./previewManager";
interface ProjectConfig {
    aiMode?: string;
    aiEndpoint?: string;
    aiModel?: string;
}
export declare class ProjectItem extends vscode.TreeItem {
    readonly label: string;
    readonly projectPath: string;
    readonly projectType: "legacy" | "feature" | "external" | "custom";
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly config?: ProjectConfig | undefined;
    constructor(label: string, projectPath: string, projectType: "legacy" | "feature" | "external" | "custom", collapsibleState: vscode.TreeItemCollapsibleState, config?: ProjectConfig | undefined);
}
export declare class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectItem> {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | null | void>;
    private projects;
    private context;
    constructor(context: vscode.ExtensionContext);
    private loadProjects;
    private saveProjects;
    refresh(): void;
    getTreeItem(element: ProjectItem): vscode.TreeItem;
    getChildren(element?: ProjectItem): Thenable<ProjectItem[]>;
    getProjects(): ProjectInfo[];
    getProjectConfig(projectPath: string): ProjectConfig;
    addProject(name: string, projectPath: string): Promise<void>;
    removeProject(projectPath: string): Promise<void>;
    updateProjectConfig(projectPath: string, config: ProjectConfig): Promise<void>;
    private discoverWorkspaceProjects;
    private scanVersionDir;
    private isAIStudioProject;
}
export declare class RunningTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void>;
    private previewManager;
    constructor(previewManager: PreviewManager);
    refresh(): void;
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem;
    getChildren(): Thenable<vscode.TreeItem[]>;
}
export {};
//# sourceMappingURL=projectTree.d.ts.map