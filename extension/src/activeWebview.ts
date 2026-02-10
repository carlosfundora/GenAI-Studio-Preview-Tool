/**
 * Active Previews Webview Provider - Shows running previews with QR codes
 */

import * as QRCode from "qrcode";
import * as vscode from "vscode";
import { PreviewManager } from "./previewManager";
import { StoredProject } from "./projectsTree";

export class ActiveWebviewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private previewManager: PreviewManager;

  constructor(previewManager: PreviewManager) {
    this.previewManager = previewManager;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this._view) return;

    try {
      const running = this.previewManager.getRunningPreviews();
      const networkIp = this.getNetworkIp() || "localhost";
      const previewsHtml = await Promise.all(
        running.map(async (p: StoredProject) => {
          const url = this.previewManager.getPreviewUrl(p.path);
          const networkUrl = url?.replace("localhost", networkIp);
          const qrCodeData = networkUrl
            ? await QRCode.toDataURL(networkUrl)
            : "";

          return `
            <div class="card">
              <div class="header">
                <span class="status-dot"></span>
                <strong>${p.name}</strong>
              </div>
              <div class="url">
                <a href="${url}">${url}</a>
              </div>
              ${
                networkUrl
                  ? `
                <div class="qr-section">
                  <img src="${qrCodeData}" class="qr-code" />
                  <div class="scan-text">Scan for Mobile</div>
                </div>
              `
                  : ""
              }
              <div class="actions">
                <button onclick="stop('${p.path}')">Stop</button>
              </div>
            </div>
          `;
        }),
      );

      const nonce = this.getNonce();

      this._view.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src data:;">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${this.getStyles()}
          </style>
        </head>
        <body>
          ${previewsHtml.length > 0 ? previewsHtml.join("") : '<div class="empty">No active previews</div>'}
          <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            function stop(path) {
              vscode.postMessage({ type: 'stop', path });
            }
          </script>
        </body>
        </html>
      `;
    } catch (e) {
      this._view.webview.html = `
        <!DOCTYPE html>
        <html><body><div style="padding:10px;color:var(--vscode-errorForeground)">
          Error loading active previews: ${e instanceof Error ? e.message : String(e)}
        </div></body></html>
      `;
    }

    this._view.webview.onDidReceiveMessage((message) => {
      if (message.type === "stop") {
        vscode.commands.executeCommand("genai-preview.stopProject", {
          projectPath: message.path,
        });
      }
    });
  }

  // Helper to guess network ID - in a real extension we might pass this from the server
  private getNetworkIp(): string | undefined {
    const interfaces = require("os").networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
    return undefined;
  }

  private getNonce() {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private getStyles(): string {
    return `
      body {
        font-family: var(--vscode-font-family);
        padding: 12px;
        color: var(--vscode-foreground);
        background-color: var(--vscode-sideBar-background);
      }
      .card {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 12px;
      }
      .header {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        font-size: 13px;
      }
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--vscode-charts-green);
        margin-right: 8px;
      }
      .url {
        font-size: 11px;
        margin-bottom: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        opacity: 0.8;
      }
      .url a {
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
      }
      .qr-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: white;
        padding: 8px;
        border-radius: 4px;
        margin-bottom: 12px;
      }
      .qr-code {
        width: 120px;
        height: 120px;
      }
      .scan-text {
        color: #333;
        font-size: 10px;
        margin-top: 4px;
        font-weight: 500;
      }
      button {
        width: 100%;
        padding: 6px;
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }
      button:hover {
        background: var(--vscode-button-secondaryHoverBackground);
      }
      .empty {
        text-align: center;
        opacity: 0.6;
        margin-top: 24px;
      }
    `;
  }
}
