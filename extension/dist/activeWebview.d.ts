/**
 * Active Previews Webview Provider - Shows running previews with QR codes
 */
import * as vscode from "vscode";
import { PreviewManager } from "./previewManager";
export declare class ActiveWebviewProvider implements vscode.WebviewViewProvider {
    private _view?;
    private previewManager;
    constructor(previewManager: PreviewManager);
    resolveWebviewView(webviewView: vscode.WebviewView): void;
    refresh(): Promise<void>;
    private getNetworkIp;
}
//# sourceMappingURL=activeWebview.d.ts.map