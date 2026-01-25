/**
 * Preview Manager - Manages Vite preview server instances
 */
import * as vscode from "vscode";
import { StoredProject } from "./projectsTree";
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
    isRunning(projectPath: string): boolean;
    getPreviewUrl(projectPath: string): string | undefined;
    launchPreview(project: StoredProject): Promise<void>;
    stopPreview(projectPath: string): Promise<void>;
    stopAllPreviews(): Promise<void>;
    getRunningPreviews(): StoredProject[];
}
export {};
//# sourceMappingURL=previewManager.d.ts.map