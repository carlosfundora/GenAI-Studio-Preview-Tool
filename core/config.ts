/**
 * GenAI Studio Preview Configuration System
 *
 * Loads configuration from:
 * 1. Project-local .genairc.json
 * 2. User-level ~/.genairc.json
 * 3. Environment variables
 */

// Removed top-level Node imports for browser compatibility
// import fs from "node:fs";
// import os from "node:os";
// import path from "node:path";

// --- Type Definitions ---

export interface AIBackendConfig {
  mode: "mock" | "local" | "remote";
  endpoint: string;
  models: {
    text: string;
    vision?: string;
    audio?: string;
    embedding?: string;
  };
  apiKey?: string;
  gpuPassthrough: boolean;
  timeout: number;
}

export interface LocationConfig {
  mode: "passthrough" | "mock" | "prompt";
  mockCoords?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

export interface GenAIPreviewConfig {
  scanPaths: string[];
  externalProjects: string[];
  entryPoint?: string;
  port: number;
  ai: AIBackendConfig;
  location: LocationConfig;
  autoShutdown: {
    enabled: boolean;
    timeoutMs: number;
  };
}

// --- Default Configuration ---

const DEFAULT_CONFIG: GenAIPreviewConfig = {
  scanPaths: [".versions/legacy", ".versions/feature"],
  externalProjects: [],
  entryPoint: "",
  port: 4000,
  ai: {
    mode: "mock",
    endpoint: "http://localhost:11434/v1",
    models: {
      text: "LFM2.5-1.2B-Instruct",
      vision: "LFM2.5-VL-1.6B",
      audio: "LFM2-Audio-1.5B",
      embedding: "nomic-embed-text",
    },
    gpuPassthrough: false,
    timeout: 60000,
  },
  location: {
    mode: "passthrough",
  },
  autoShutdown: {
    enabled: true,
    timeoutMs: 30000,
  },
};

// --- Configuration Loading ---

let cachedConfig: GenAIPreviewConfig | null = null;

/**
 * Asynchronously loads configuration.
 * Safe for use in both Node.js and Browser environments.
 */
export async function loadConfigAsync(projectPath?: string): Promise<GenAIPreviewConfig> {
  if (cachedConfig) return cachedConfig;

  let config = { ...DEFAULT_CONFIG };

  // 1. Browser Environment Check
  if (typeof window !== "undefined" && (window as any).__GENAI_PREVIEW_CONFIG__) {
    // We are in browser and have injected config
    config = deepMerge(config, (window as any).__GENAI_PREVIEW_CONFIG__);
    cachedConfig = config;
    return config;
  }

  // 2. Node.js Environment Loading
  try {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");

    // Load user-level config
    const userConfigPath = path.join(os.homedir(), ".genairc.json");
    try {
      await fs.access(userConfigPath);
      const content = await fs.readFile(userConfigPath, "utf-8");
      const userConfig = JSON.parse(content);
      config = deepMerge(config, userConfig);
    } catch (e: any) {
       if (e.code !== 'ENOENT') {
          console.warn("[GenAI Preview] Failed to parse ~/.genairc.json:", e);
       }
    }

    // Load project-level config
    if (projectPath) {
      const projectConfigPath = path.join(projectPath, ".genairc.json");
       try {
        await fs.access(projectConfigPath);
        const content = await fs.readFile(projectConfigPath, "utf-8");
        const projectConfig = JSON.parse(content);
        config = deepMerge(config, projectConfig);
      } catch (e: any) {
         if (e.code !== 'ENOENT') {
            console.warn("[GenAI Preview] Failed to parse .genairc.json:", e);
         }
      }
    }
  } catch (e) {
     // Dynamic import failed (likely browser without injected config) or other error
     // Proceed with defaults or env vars if available
  }

  // 3. Override with environment variables
  if (typeof process !== "undefined" && process.env) {
      if (process.env.GENAI_ENDPOINT) {
        config.ai.endpoint = process.env.GENAI_ENDPOINT;
      }
      if (process.env.GENAI_ENTRYPOINT) {
        config.entryPoint = process.env.GENAI_ENTRYPOINT;
      }
      if (process.env.GENAI_MODE) {
        config.ai.mode = process.env.GENAI_MODE as "mock" | "local" | "remote";
      }
      if (process.env.GENAI_MODEL) {
        config.ai.models.text = process.env.GENAI_MODEL;
      }
      if (process.env.GENAI_GPU === "true") {
        config.ai.gpuPassthrough = true;
      }
      if (process.env.GENAI_API_KEY) {
        config.ai.apiKey = process.env.GENAI_API_KEY;
      }
      if (process.env.GENAI_PORT) {
        const parsed = parseInt(process.env.GENAI_PORT, 10);
        if (!isNaN(parsed)) {
          config.port = parsed;
        }
      }
  }

  cachedConfig = config;
  return config;
}

export async function getConfigAsync(): Promise<GenAIPreviewConfig> {
  if (!cachedConfig) {
    return loadConfigAsync();
  }
  return cachedConfig;
}

/**
 * @deprecated Use loadConfigAsync() instead. This function no longer loads from disk synchronously.
 */
export function loadConfig(projectPath?: string): GenAIPreviewConfig {
  if (cachedConfig) return cachedConfig;

  // Check if we can synchronously access browser config
  if (typeof window !== "undefined" && (window as any).__GENAI_PREVIEW_CONFIG__) {
    const config = deepMerge({ ...DEFAULT_CONFIG }, (window as any).__GENAI_PREVIEW_CONFIG__);
    cachedConfig = config;
    return config;
  }

  throw new Error(
    "Synchronous loadConfig() called before configuration was loaded. Ensure loadConfigAsync() is awaited first.",
  );
}

export function getConfig(): GenAIPreviewConfig {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}

// --- Utility Functions ---

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue)
    ) {
      result[key] = deepMerge(
        (target[key] as object) || {},
        sourceValue as object,
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }
  return result;
}
