import * as fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfigAsync, resetConfig } from "../../core/config";

// Mock fs to avoid reading real files
vi.mock("node:fs/promises");

describe("Configuration System", () => {
  const mockProjectPath = "/mock/project";

  beforeEach(() => {
    vi.resetAllMocks();
    resetConfig();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should load default configuration when no file exists", async () => {
    // Mock readFile to throw ENOENT
    vi.mocked(fs.readFile).mockRejectedValue({ code: "ENOENT" });

    // Config should default to what's defined in core/config
    const config = await loadConfigAsync(mockProjectPath);

    expect(config.port).toBe(4000);
    expect(config.ai.mode).toBe("mock");
  });

  it("should merge user config from .genairc.json", async () => {
    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      // Mock both user and project config files
      if (typeof path === "string" && path.includes(".genairc.json")) {
        return JSON.stringify({
          port: 5000,
          ai: { mode: "local", endpoint: "http://test:1234" },
        });
      }
      throw { code: "ENOENT" };
    });

    const config = await loadConfigAsync(mockProjectPath);

    expect(config.port).toBe(5000);
    expect(config.ai.mode).toBe("local");
    expect(config.ai.endpoint).toBe("http://test:1234");
  });

  it("should respect environment variable overrides", async () => {
    vi.mocked(fs.readFile).mockRejectedValue({ code: "ENOENT" });

    process.env.GENAI_PORT = "6000";
    process.env.GENAI_MODE = "local";

    const config = await loadConfigAsync(mockProjectPath);

    expect(config.port).toBe(6000);
    expect(config.ai.mode).toBe("local");

    // Cleanup
    delete process.env.GENAI_PORT;
    delete process.env.GENAI_MODE;
  });
});
