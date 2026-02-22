
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfigAsync, resetConfig } from "@core/config";
import * as fsPromises from "node:fs/promises";

// Mock fs promises for dynamic import
vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
  readFile: vi.fn(),
}));

// Mock os for homedir
vi.mock("node:os", () => ({
  homedir: () => "/mock/home",
  // We don't need other methods for this test
}));

// Mock path? Real path is fine usually, but let's be safe if environment differs
// Actually path.join is safe to use real.
// But we mocked fs/promises and os.

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
    // Simulate file not found (ENOENT)
    vi.mocked(fsPromises.access).mockRejectedValue({ code: 'ENOENT' });

    // Config should default to what's defined in core/config
    const config = await loadConfigAsync(mockProjectPath);

    expect(config.port).toBe(4000);
    expect(config.ai.mode).toBe("mock");
  });

  it("should merge user config from .genairc.json", async () => {
    // Simulate file exists and returns JSON
    vi.mocked(fsPromises.access).mockResolvedValue(undefined);
    vi.mocked(fsPromises.readFile).mockResolvedValue(
      JSON.stringify({
        port: 5000,
        ai: { mode: "local", endpoint: "http://test:1234" },
      })
    );

    const config = await loadConfigAsync(mockProjectPath);

    expect(config.port).toBe(5000);
    expect(config.ai.mode).toBe("local");
    expect(config.ai.endpoint).toBe("http://test:1234");
  });

  it("should respect environment variable overrides", async () => {
    // Simulate no file
    vi.mocked(fsPromises.access).mockRejectedValue({ code: 'ENOENT' });

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
