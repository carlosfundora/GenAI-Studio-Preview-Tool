import * as fs from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig, resetConfig } from "@core/config";

// Mock fs to avoid reading real files
vi.mock("fs");

describe("Configuration System", () => {
  const mockProjectPath = "/mock/project";

  beforeEach(() => {
    vi.resetAllMocks();
    resetConfig();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should load default configuration when no file exists", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    // Config should default to what's defined in core/config
    const config = loadConfig(mockProjectPath);

    expect(config.port).toBe(4000);
    expect(config.ai.mode).toBe("mock");
  });

  it("should merge user config from .genairc.json", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        port: 5000,
        ai: { mode: "local", endpoint: "http://test:1234" },
      }),
    );

    const config = loadConfig(mockProjectPath);

    expect(config.port).toBe(5000);
    expect(config.ai.mode).toBe("local");
    expect(config.ai.endpoint).toBe("http://test:1234");
  });

  it("should respect environment variable overrides", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    process.env.GENAI_PORT = "6000";
    process.env.GENAI_MODE = "local";

    const config = loadConfig(mockProjectPath);

    expect(config.port).toBe(6000);
    expect(config.ai.mode).toBe("local");

    // Cleanup
    delete process.env.GENAI_PORT;
    delete process.env.GENAI_MODE;
  });
});
