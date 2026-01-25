/**
 * Project Tree Provider - Discovers and displays AI Studio projects
 */
import * as vscode from "vscode";
export interface DiscoveredProject {
    name: string;
    path: string;
    type: "legacy" | "feature" | "external";
}
export declare class ProjectItem extends vscode.TreeItem {
    readonly label: string;
    readonly projectPath: string;
    readonly projectType: "legacy" | "feature" | "external";
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    constructor(label: string, projectPath: string, projectType: "legacy" | "feature" | "external", collapsibleState: vscode.TreeItemCollapsibleState);
}
export declare class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectItem> {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | null | void>;
    private projects;
    refresh(): void;
    getTreeItem(element: ProjectItem): vscode.TreeItem;
    getChildren(element?: ProjectItem): Thenable<ProjectItem[]>;
    discoverProjects(): Promise<DiscoveredProject[]>;
}
//# sourceMappingURL=projectTree.d.ts.map