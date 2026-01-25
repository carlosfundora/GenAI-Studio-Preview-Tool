/**
 * Preview Manager - Manages Vite preview server instances
 */
import * as vscode from "vscode";
export interface ProjectInfo {
    name: string;
    path: string;
    type: "legacy" | "feature" | "external";
}
type StatusChangeCallback = (status: {
    running: boolean;
    count: number;
}) => void;
export declare class PreviewManager {
    private previews;
    private context;
    private outputChannel;
    private statusCallbacks;
    constructor(context: vscode.ExtensionContext);
    onStatusChange(callback: StatusChangeCallback): void;
    private notifyStatusChange;
    launchPreview(project: ProjectInfo): Promise<void>;
    stopPreview(projectPath: string): Promise<void>;
    stopAllPreviews(): Promise<void>;
    getRunningPreviews(): ProjectInfo[];
    isRunning(projectPath: string): boolean;
}
export {};
//# sourceMappingURL=previewManager.d.ts.map