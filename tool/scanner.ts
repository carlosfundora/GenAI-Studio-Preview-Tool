import { glob } from "glob";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type VersionInfo = {
  name: string;
  path: string;
  type: "legacy" | "feature" | "external";
};

/**
 * Scans a directory for valid Vite projects (containing package.json).
 * ⚡ Optimized to scan legacy, feature, and external directories in parallel.
 */
export async function scanForVersions(
  rootDir: string,
  projectsRootOverride?: string,
): Promise<VersionInfo[]> {
  const projectsRoot =
    projectsRootOverride || path.resolve(__dirname, "../../..");

  const scanLegacy = async (): Promise<VersionInfo[]> => {
    const legacyDir = path.join(rootDir, ".versions/legacy");
    if (!fs.existsSync(legacyDir)) return [];

    const folders = (
      await glob("*", { cwd: legacyDir, withFileTypes: true })
    ).filter((dirent) => dirent.isDirectory());

    const found: VersionInfo[] = [];
    for (const folder of folders) {
      if (fs.existsSync(path.join(legacyDir, folder.name, "package.json"))) {
        found.push({
          name: `Legacy: ${folder.name}`,
          path: path.join(legacyDir, folder.name),
          type: "legacy",
        });
      }
    }
    return found;
  };

  const scanFeature = async (): Promise<VersionInfo[]> => {
    const featureDir = path.join(rootDir, ".versions/feature");
    if (!fs.existsSync(featureDir)) return [];

    const folders = (
      await glob("*", { cwd: featureDir, withFileTypes: true })
    ).filter((dirent) => dirent.isDirectory());

    const found: VersionInfo[] = [];
    for (const folder of folders) {
      if (fs.existsSync(path.join(featureDir, folder.name, "package.json"))) {
        found.push({
          name: `Feature: ${folder.name}`,
          path: path.join(featureDir, folder.name),
          type: "feature",
        });
      }
    }
    return found;
  };

  const scanExternal = async (): Promise<VersionInfo[]> => {
    const externalRepo = path.join(projectsRoot, "RECENTLY-DECEASED");
    if (fs.existsSync(path.join(externalRepo, "package.json"))) {
      return [
        {
          name: `External: RECENTLY-DECEASED`,
          path: externalRepo,
          type: "external",
        },
      ];
    }
    return [];
  };

  const results = await Promise.all([
    scanLegacy(),
    scanFeature(),
    scanExternal(),
  ]);

  return results.flat();
}
