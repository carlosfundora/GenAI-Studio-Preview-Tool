/**
 * Projects Tree Provider - Shows list of AI Studio projects with play/stop buttons
 */
import * as vscode from "vscode";
import { PreviewManager } from "./previewManager";
export interface StoredProject {
    name: string;
    path: string;
    config: ProjectConfig;
}
export interface ProjectConfig {
    port: number;
    aiMode: "mock" | "local";
    aiEndpoint: string;
    aiModel: string;
    autoOpen: boolean;
    hotReload: boolean;
}
export declare class ProjectItem extends vscode.TreeItem {
    readonly label: string;
    readonly projectPath: string;
    readonly isRunning: boolean;
    readonly config: ProjectConfig;
    constructor(label: string, projectPath: string, isRunning: boolean, config: ProjectConfig);
}
export declare class ProjectsTreeProvider implements vscode.TreeDataProvider<ProjectItem> {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<void | ProjectItem | undefined>;
    private projects;
    private context;
    private previewManager;
    constructor(context: vscode.ExtensionContext, previewManager: PreviewManager);
    private loadProjects;
    private saveProjects;
    refresh(): void;
    getTreeItem(element: ProjectItem): vscode.TreeItem;
    getChildren(): Thenable<ProjectItem[]>;
    getProject(projectPath: string): StoredProject | undefined;
    getProjectConfig(projectPath: string): ProjectConfig;
    addProject(name: string, projectPath: string): Promise<void>;
    removeProject(projectPath: string): Promise<void>;
    updateProjectConfig(projectPath: string, config: Partial<ProjectConfig>): Promise<void>;
}
//# sourceMappingURL=projectsTree.d.ts.map