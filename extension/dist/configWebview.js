"use strict";
/**
 * Configuration Webview Provider - Shows settings for selected project
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
exports.ConfigWebviewProvider = void 0;
const vscode = __importStar(require("vscode"));
class ConfigWebviewProvider {
    _view;
    context;
    projectsProvider;
    currentProjectPath;
    constructor(context, projectsProvider) {
        this.context = context;
        this.projectsProvider = projectsProvider;
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.onDidReceiveMessage((message) => {
            if (message.type === "updateConfig" && this.currentProjectPath) {
                this.projectsProvider.updateProjectConfig(this.currentProjectPath, message.config);
                vscode.window.showInformationMessage("Configuration saved!");
            }
        });
        this.showEmptyState();
    }
    showProjectConfig(projectPath) {
        this.currentProjectPath = projectPath;
        const project = this.projectsProvider.getProject(projectPath);
        if (!project || !this._view)
            return;
        this._view.webview.html = this.getConfigHtml(project.name, project.config);
    }
    showEmptyState() {
        if (!this._view)
            return;
        this._view.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 16px;
            color: var(--vscode-foreground);
          }
          .empty { opacity: 0.6; text-align: center; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="empty">
          <p>👆 Select a project to configure</p>
        </div>
      </body>
      </html>
    `;
    }
    getConfigHtml(name, config) {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 12px;
            color: var(--vscode-foreground);
            font-size: 13px;
          }
          h3 {
            margin: 0 0 12px 0;
            font-size: 14px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 8px;
          }
          .field { margin-bottom: 12px; }
          label {
            display: block;
            margin-bottom: 4px;
            opacity: 0.8;
            font-size: 11px;
            text-transform: uppercase;
          }
          input, select {
            width: 100%;
            padding: 6px 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            box-sizing: border-box;
          }
          input[type="checkbox"] {
            width: auto;
            margin-right: 8px;
          }
          .checkbox-field {
            display: flex;
            align-items: center;
          }
          .checkbox-field label {
            margin: 0;
            text-transform: none;
            font-size: 13px;
          }
          button {
            width: 100%;
            padding: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            margin-top: 8px;
          }
          button:hover {
            background: var(--vscode-button-hoverBackground);
          }
          .local-options {
            margin-top: 8px;
            padding: 8px;
            background: var(--vscode-editor-background);
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <h3>${name}</h3>

        <div class="field">
          <label>Port</label>
          <input type="number" id="port" value="${config.port}" min="3000" max="9999">
        </div>

        <div class="field">
          <label>AI Mode</label>
          <select id="aiMode">
            <option value="mock" ${config.aiMode === "mock" ? "selected" : ""}>Mock (Simulated Responses)</option>
            <option value="local" ${config.aiMode === "local" ? "selected" : ""}>Local LLM (Ollama/LFM)</option>
          </select>
        </div>

        <div id="localOptions" class="local-options" style="display: ${config.aiMode === "local" ? "block" : "none"}">
          <div class="field">
            <label>Endpoint</label>
            <input type="text" id="aiEndpoint" value="${config.aiEndpoint}" placeholder="http://localhost:11434/v1">
          </div>
          <div class="field">
            <label>Model</label>
            <input type="text" id="aiModel" value="${config.aiModel}" placeholder="LFM2.5-1.2B-Instruct">
          </div>
        </div>

        <div class="field checkbox-field">
          <input type="checkbox" id="autoOpen" ${config.autoOpen ? "checked" : ""}>
          <label for="autoOpen">Open browser on launch</label>
        </div>

        <div class="field checkbox-field">
          <input type="checkbox" id="hotReload" ${config.hotReload ? "checked" : ""}>
          <label for="hotReload">Enable hot reload</label>
        </div>

        <button id="save">💾 Save Configuration</button>

        <script>
          const vscode = acquireVsCodeApi();

          document.getElementById('aiMode').addEventListener('change', (e) => {
            document.getElementById('localOptions').style.display =
              e.target.value === 'local' ? 'block' : 'none';
          });

          document.getElementById('save').addEventListener('click', () => {
            vscode.postMessage({
              type: 'updateConfig',
              config: {
                port: parseInt(document.getElementById('port').value),
                aiMode: document.getElementById('aiMode').value,
                aiEndpoint: document.getElementById('aiEndpoint').value,
                aiModel: document.getElementById('aiModel').value,
                autoOpen: document.getElementById('autoOpen').checked,
                hotReload: document.getElementById('hotReload').checked,
              }
            });
          });
        </script>
      </body>
      </html>
    `;
    }
}
exports.ConfigWebviewProvider = ConfigWebviewProvider;
//# sourceMappingURL=configWebview.js.map