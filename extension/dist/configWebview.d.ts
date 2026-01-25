/**
 * Configuration Webview Provider - Shows settings for selected project
 */
import * as vscode from "vscode";
import { ProjectsTreeProvider } from "./projectsTree";
export declare class ConfigWebviewProvider implements vscode.WebviewViewProvider {
    private _view?;
    private context;
    private projectsProvider;
    private currentProjectPath?;
    constructor(context: vscode.ExtensionContext, projectsProvider: ProjectsTreeProvider);
    resolveWebviewView(webviewView: vscode.WebviewView): void;
    showProjectConfig(projectPath: string): void;
    private showEmptyState;
    private getConfigHtml;
}
//# sourceMappingURL=configWebview.d.ts.map