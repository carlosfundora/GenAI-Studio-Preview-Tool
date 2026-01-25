/**
 * Configuration Webview Provider - Shows settings for selected project
 */

import * as vscode from "vscode";
import { ProjectConfig, ProjectsTreeProvider } from "./projectsTree";

export class ConfigWebviewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private context: vscode.ExtensionContext;
  private projectsProvider: ProjectsTreeProvider;
  private currentProjectPath?: string;

  constructor(
    context: vscode.ExtensionContext,
    projectsProvider: ProjectsTreeProvider,
  ) {
    this.context = context;
    this.projectsProvider = projectsProvider;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.type === "updateConfig" && this.currentProjectPath) {
        this.projectsProvider.updateProjectConfig(
          this.currentProjectPath,
          message.config,
        );
        vscode.window.showInformationMessage("Configuration saved!");
      }
    });

    // If we have a selected project, show it. Otherwise empty state.
    if (this.currentProjectPath) {
      this.showProjectConfig(this.currentProjectPath);
    } else {
      this.showEmptyState();
    }
  }

  showProjectConfig(projectPath: string): void {
    this.currentProjectPath = projectPath;
    const project = this.projectsProvider.getProject(projectPath);

    // If view isn't ready yet, just return (currentProjectPath is saved)
    // When view resolves, it will check currentProjectPath
    if (!project || !this._view) return;

    this._view.webview.html = this.getConfigHtml(project.name, project.config);
  }

  private showEmptyState(): void {
    if (!this._view) return;
    this._view.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 16px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
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

  private getConfigHtml(name: string, config: ProjectConfig): string {
    const globalConfig = vscode.workspace.getConfiguration("genaiPreview");
    const defaultMode = globalConfig.get<string>("ai.mode");
    const defaultEndpoint = globalConfig.get<string>("ai.endpoint");
    const defaultModel = globalConfig.get<string>("ai.model");
    const nonce = this.getNonce();

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 12px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            font-size: 13px;
          }
          h3 {
            margin: 0 0 16px 0;
            font-size: 11px;
            font-weight: 600;
            opacity: 0.8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 8px;
          }
          .field { margin-bottom: 16px; }
          label {
            display: block;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 500;
          }
          .help-text {
            font-size: 11px;
            opacity: 0.7;
            margin-top: 4px;
            margin-bottom: 4px;
          }
          input[type="text"], input[type="number"], select {
            width: 100%;
            padding: 6px 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            box-sizing: border-box;
            font-family: inherit;
          }
          input:focus, select:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
          }
          .checkbox-field {
            display: flex;
            align-items: flex-start;
            margin-bottom: 12px;
          }
          input[type="checkbox"] {
            width: 16px;
            height: 16px;
            margin: 0 8px 0 0;
            accent-color: var(--vscode-button-background);
          }
          .checkbox-label {
            line-height: 1.4;
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
            font-weight: 500;
            margin-top: 16px;
            transition: opacity 0.2s;
          }
          button:hover {
            background: var(--vscode-button-hoverBackground);
          }
          .local-options {
            margin-top: 12px;
            padding: 12px;
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textBlockQuote-border);
            border-radius: 2px;
          }
          .info-badge {
            display: inline-block;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 10px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            margin-left: 6px;
            opacity: 0.8;
          }
        </style>
      </head>
      <body>
        <h3>${name}</h3>

        <div class="field">
          <label>Preview Port</label>
          <input type="number" id="port" value="${config.port}" min="3000" max="9999">
          <div class="help-text">Port to run the preview server on</div>
        </div>

        <div class="field">
          <label>AI Mode <span class="help-text">(Default: ${defaultMode})</span></label>
          <select id="aiMode">
            <option value="mock" ${config.aiMode === "mock" ? "selected" : ""}>Mock (Simulated)</option>
            <option value="local" ${config.aiMode === "local" ? "selected" : ""}>Local LLM (Ollama/LFM)</option>
          </select>
        </div>

        <div id="localOptions" class="local-options" style="display: ${config.aiMode === "local" ? "block" : "none"}">
          <div class="field">
            <label>Ollama Endpoint</label>
            <input type="text" id="aiEndpoint" value="${config.aiEndpoint}" placeholder="${defaultEndpoint}">
            <div class="help-text">Default: ${defaultEndpoint}</div>
          </div>
          <div class="field">
            <label>Model Name</label>
            <input type="text" id="aiModel" value="${config.aiModel}" placeholder="${defaultModel}">
            <div class="help-text">Default: ${defaultModel}</div>
          </div>
        </div>

        <div class="field checkbox-field">
          <input type="checkbox" id="autoOpen" ${config.autoOpen ? "checked" : ""}>
          <div class="checkbox-label">
            <label for="autoOpen" style="margin-bottom:0">Auto-open Browser</label>
            <div class="help-text">Open browser when launch starts</div>
          </div>
        </div>

        <div class="field checkbox-field">
          <input type="checkbox" id="hotReload" ${config.hotReload ? "checked" : ""}>
          <div class="checkbox-label">
            <label for="hotReload" style="margin-bottom:0">Hot Reload</label>
            <div class="help-text">Reload page on code changes</div>
          </div>
        </div>

        <button id="save">Save Configuration</button>

        <script nonce="${nonce}">
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
  private getNonce() {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
