/**
 * GenAI Studio Preview Configuration System
 *
 * Loads configuration from:
 * 1. Project-local .genairc.json
 * 2. User-level ~/.genairc.json
 * 3. Environment variables
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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
    // legacy support
    altitude?: number;
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

let cachedConfigPromise: Promise<GenAIPreviewConfig> | null = null;

export function loadConfigAsync(projectPath?: string): Promise<GenAIPreviewConfig> {
  if (cachedConfigPromise) return cachedConfigPromise;

  cachedConfigPromise = (async () => {
    let config = { ...DEFAULT_CONFIG };

    // 1. Load user-level config
    const userConfigPath = path.join(os.homedir(), ".genairc.json");
    try {
      const content = await fs.readFile(userConfigPath, "utf-8");
      const userConfig = JSON.parse(content);
      config = deepMerge(config, userConfig);
    } catch (e: any) {
      if (e.code !== "ENOENT") {
        console.warn("[GenAI Preview] Failed to parse ~/.genairc.json:", e);
      }
    }

    // 2. Load project-level config
    if (projectPath) {
      const projectConfigPath = path.join(projectPath, ".genairc.json");
      try {
        const content = await fs.readFile(projectConfigPath, "utf-8");
        const projectConfig = JSON.parse(content);
        config = deepMerge(config, projectConfig);
      } catch (e: any) {
        if (e.code !== "ENOENT") {
          console.warn("[GenAI Preview] Failed to parse .genairc.json:", e);
        }
      }
    }

    // 3. Override with environment variables
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

    return config;
  })();

  return cachedConfigPromise;
}

export function getConfigAsync(): Promise<GenAIPreviewConfig> {
  if (!cachedConfigPromise) {
    return loadConfigAsync();
  }
  return cachedConfigPromise;
}

export function resetConfig(): void {
  cachedConfigPromise = null;
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
