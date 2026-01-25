"use strict";
/**
 * Active Previews Webview Provider - Shows running previews with QR codes
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
exports.ActiveWebviewProvider = void 0;
const QRCode = __importStar(require("qrcode"));
const vscode = __importStar(require("vscode"));
class ActiveWebviewProvider {
    _view;
    previewManager;
    constructor(previewManager) {
        this.previewManager = previewManager;
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        this.refresh();
    }
    async refresh() {
        if (!this._view)
            return;
        const running = this.previewManager.getRunningPreviews();
        const previewsHtml = await Promise.all(running.map(async (p) => {
            const url = this.previewManager.getPreviewUrl(p.path);
            const networkUrl = url?.replace("localhost", this.getNetworkIp() || "localhost");
            const qrCodeData = networkUrl ? await QRCode.toDataURL(networkUrl) : "";
            return `
          <div class="card">
            <div class="header">
              <span class="status-dot"></span>
              <strong>${p.name}</strong>
            </div>
            <div class="url">
              <a href="${url}">${url}</a>
            </div>
            ${networkUrl
                ? `
              <div class="qr-section">
                <img src="${qrCodeData}" class="qr-code" />
                <div class="scan-text">Scan for Mobile</div>
              </div>
            `
                : ""}
            <div class="actions">
              <button onclick="stop('${p.path}')">Stop</button>
            </div>
          </div>
        `;
        }));
        this._view.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
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
        </style>
      </head>
      <body>
        ${previewsHtml.length > 0 ? previewsHtml.join("") : '<div class="empty">No active previews</div>'}
        <script>
          const vscode = acquireVsCodeApi();
          function stop(path) {
            vscode.postMessage({ type: 'stop', path });
          }
        </script>
      </body>
      </html>
    `;
        this._view.webview.onDidReceiveMessage((message) => {
            if (message.type === "stop") {
                vscode.commands.executeCommand("genai-preview.stopProject", {
                    projectPath: message.path,
                });
            }
        });
    }
    // Helper to guess network ID - in a real extension we might pass this from the server
    getNetworkIp() {
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
}
exports.ActiveWebviewProvider = ActiveWebviewProvider;
//# sourceMappingURL=activeWebview.js.map