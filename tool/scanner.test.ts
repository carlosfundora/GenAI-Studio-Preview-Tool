import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { scanForVersions } from "./scanner";

const TEST_DIR = path.join(__dirname, "test_scanner_versions");

describe("scanForVersions", () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // Legacy
    const legacyDir = path.join(TEST_DIR, ".versions/legacy");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.mkdirSync(path.join(legacyDir, "v1"));
    fs.writeFileSync(path.join(legacyDir, "v1", "package.json"), "{}");

    // Feature
    const featureDir = path.join(TEST_DIR, ".versions/feature");
    fs.mkdirSync(featureDir, { recursive: true });
    fs.mkdirSync(path.join(featureDir, "feat1"));
    fs.writeFileSync(path.join(featureDir, "feat1", "package.json"), "{}");

    // External (RECENTLY-DECEASED) relative to TEST_DIR/projects (mocking projectsRoot)
    const projectsRoot = path.join(TEST_DIR, "projects");
    fs.mkdirSync(path.join(projectsRoot, "RECENTLY-DECEASED"), { recursive: true });
    fs.writeFileSync(path.join(projectsRoot, "RECENTLY-DECEASED", "package.json"), "{}");
  });

  afterAll(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should scan legacy, feature and external versions", async () => {
    const projectsRoot = path.join(TEST_DIR, "projects");
    const versions = await scanForVersions(TEST_DIR, projectsRoot);

    expect(versions).toHaveLength(3);
    const names = versions.map(v => v.name).sort();
    expect(names).toEqual([
      "External: RECENTLY-DECEASED",
      "Feature: feat1",
      "Legacy: v1"
    ]);
  });
});
