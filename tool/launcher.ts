import chalk from "chalk";
import { glob } from "glob";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import portfinder from "portfinder";
import prompts from "prompts";
import { createServer } from "vite";

// --- Modular Imports ---
import { CORE_CONFIG, GenAIPreviewPlugin } from "../core/engine.js";

// --- Configuration ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREVIEW_PORT_START = 4000;

type VersionInfo = {
  name: string;
  path: string;
  type: "legacy" | "feature" | "external";
};

/**
 * Scans a directory for valid Vite projects (containing package.json)
 */
async function scanForVersions(rootDir: string): Promise<VersionInfo[]> {
  const versions: VersionInfo[] = [];

  // 1. Scan .versions/legacy
  const legacyDir = path.join(rootDir, ".versions/legacy");
  if (fs.existsSync(legacyDir)) {
    const folders = await glob("*", { cwd: legacyDir, onlyDirectories: true });
    folders.forEach((folder) => {
      if (fs.existsSync(path.join(legacyDir, folder, "package.json"))) {
        versions.push({
          name: `Legacy: ${folder}`,
          path: path.join(legacyDir, folder),
          type: "legacy",
        });
      }
    });
  }

  // 2. Scan .versions/feature
  const featureDir = path.join(rootDir, ".versions/feature");
  if (fs.existsSync(featureDir)) {
    const folders = await glob("*", { cwd: featureDir, onlyDirectories: true });
    folders.forEach((folder) => {
      if (fs.existsSync(path.join(featureDir, folder, "package.json"))) {
        versions.push({
          name: `Feature: ${folder}`,
          path: path.join(featureDir, folder),
          type: "feature",
        });
      }
    });
  }

  // 3. Scan root Projects for RECENTLY-DECEASED or other test cases (External)
  const projectsRoot = path.resolve(__dirname, "../../..");
  const externalRepo = path.join(projectsRoot, "RECENTLY-DECEASED");
  if (fs.existsSync(path.join(externalRepo, "package.json"))) {
    versions.push({
      name: `External: RECENTLY-DECEASED`,
      path: externalRepo,
      type: "external",
    });
  }

  return versions;
}

/**
 * Checks and installs dependencies if needed
 */
async function prepareDependencies(version: VersionInfo) {
  const nodeModulesPath = path.join(version.path, "node_modules");
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(
      chalk.yellow(
        `\n📦 Dependencies missing for ${version.name}. Installing...`,
      ),
    );

    return new Promise<void>((resolve, reject) => {
      const p = spawn("pnpm", ["install"], {
        cwd: version.path,
        stdio: "inherit",
        shell: true,
      });

      p.on("close", (code) => {
        if (code === 0) {
          console.log(chalk.green(`✅ Installed.`));
          resolve();
        } else {
          reject(new Error(`Install failed with code ${code}`));
        }
      });
    });
  }
}

/**
 * Launches the Vite server with core engine injection
 */
async function launchVersion(version: VersionInfo) {
  console.log(chalk.cyan(`\n🚀 Launching ${version.name}...`));

  portfinder.basePort = PREVIEW_PORT_START;
  const port = await portfinder.getPortPromise();

  const server = await createServer({
    configFile: path.join(version.path, "vite.config.ts"),
    root: version.path,
    server: {
      port: port,
      strictPort: true,
      open: false,
    },
    plugins: [
      GenAIPreviewPlugin(version.path), // Use core plugin
    ],
    resolve: {
      alias: {
        "@google/genai": CORE_CONFIG.MOCK_GENAI_PATH, // Use core mock path
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
  });

  await server.listen();
  server.printUrls();
  console.log(chalk.gray(`   (Mock GenAI Active)`));

  setTimeout(() => {
    server.openBrowser();
  }, 500);

  return { server, port };
}

async function main() {
  console.log(chalk.bold.blue("=== GenAI Studio Preview ===\n"));

  const majorVersion = parseInt(process.version.slice(1).split(".")[0]);
  if (majorVersion < 18) {
    console.error(
      chalk.red(
        `❌ Error: Node.js version ${process.version} is not supported.`,
      ),
    );
    console.error(
      chalk.yellow(`Please use Node.js v18 or higher (v24 recommended).`),
    );
    process.exit(1);
  }

  const projectsRoot = path.resolve(__dirname, "../../..");
  const exhibitronRoot = path.join(projectsRoot, "EXHIBITRON");

  console.log(chalk.gray(`Scanning ${exhibitronRoot} and ${projectsRoot}...`));
  const versions = await scanForVersions(exhibitronRoot);

  if (versions.length === 0) {
    console.log(chalk.red("No versions found."));
    return;
  }

  const targetArgIndex = process.argv.indexOf("--target");
  let selectedVersions: VersionInfo[] = [];

  if (targetArgIndex !== -1 && process.argv[targetArgIndex + 1]) {
    const targetName = process.argv[targetArgIndex + 1];
    const match = versions.find((v) => v.name.includes(targetName));
    if (match) {
      console.log(chalk.green(`\nAuto-selecting: ${match.name}`));
      selectedVersions = [match];
    } else {
      console.log(chalk.red(`Target '${targetName}' not found.`));
      return;
    }
  } else {
    const response = await prompts({
      type: "multiselect",
      name: "selected",
      message: "Select versions to launch:",
      choices: versions.map((v) => ({ title: v.name, value: v })),
      min: 1,
    });

    if (!response.selected || response.selected.length === 0) {
      console.log("Operation cancelled.");
      return;
    }
    selectedVersions = response.selected;
  }

  for (const v of selectedVersions) {
    try {
      await prepareDependencies(v);
      await launchVersion(v);
    } catch (e: any) {
      console.error(chalk.red(`Failed to launch ${v.name}: ${e.message}`));
    }
  }

  console.log(
    chalk.green(
      "\n✨ All selected versions are running. Press Ctrl+C to stop.",
    ),
  );
  await new Promise(() => {});
}

main();
