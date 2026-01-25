/**
 * Centralized logger for GenAI Studio Preview extension
 * Outputs to both the "GenAI Studio Preview" Output channel and console
 */

import * as vscode from "vscode";

let outputChannel: vscode.OutputChannel | undefined;

export function initLogger(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel(
            "GenAI Studio Preview",
        );
    }
    return outputChannel;
}

export function log(message: string, ...args: any[]): void {
    const timestamp = new Date().toLocaleTimeString();
    const formatted =
        args.length > 0
            ? `[${timestamp}] ${message} ${args.map((a) => JSON.stringify(a)).join(" ")}`
            : `[${timestamp}] ${message}`;

    outputChannel?.appendLine(formatted);
    console.log(`[GenAI] ${message}`, ...args);
}

export function logError(message: string, error?: unknown): void {
    const timestamp = new Date().toLocaleTimeString();
    const errorStr =
        error instanceof Error ? error.message : String(error ?? "");
    const formatted = `[${timestamp}] ERROR: ${message}${errorStr ? ` - ${errorStr}` : ""}`;

    outputChannel?.appendLine(formatted);
    console.error(`[GenAI] ERROR: ${message}`, error);

    // Also show to user
    vscode.window.showErrorMessage(
        `GenAI Preview: ${message}${errorStr ? ` (${errorStr})` : ""}`,
    );
}

export function logWarn(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] WARN: ${message}`;

    outputChannel?.appendLine(formatted);
    console.warn(`[GenAI] WARN: ${message}`);
}

export function showOutput(): void {
    outputChannel?.show(true);
}
