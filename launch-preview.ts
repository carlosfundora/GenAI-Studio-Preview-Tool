import chalk from "chalk";
import { glob } from "glob";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import portfinder from "portfinder";
import prompts from "prompts";
import { createServer } from "vite";

import { fileURLToPath } from "node:url";

// --- Configuration ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREVIEW_PORT_START = 4000;
const MOCK_GENAI_PATH = path.resolve(__dirname, "./mocks/genai.ts");

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
  // This supports the user's request to test with external repos in Projects/
  const projectsRoot = path.dirname(rootDir); // Assuming rootDir is Projects/EXHIBITRON, go up to Projects/
  // Actually, let's just check specific known external test structures if the user passed a different root
  // Or check specific folders in Projects/

  // For the specific request: "ADD IT TO OUR PROJECTS FOLDER"
  // We'll scan relative to the script execution or provided arg, but let's hardcode a check for now based on the plan
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

    // Prefer pnpm if available, else npm
    const cmd = "pnpm";
    // Simplified assumption for this suite. Real world might check `which pnpm`.

    return new Promise<void>((resolve, reject) => {
      const p = spawn(cmd, ["install"], {
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
 * Launches the Vite server with injected configuration
 */
async function launchVersion(version: VersionInfo) {
  console.log(chalk.cyan(`\n🚀 Launching ${version.name}...`));

  portfinder.basePort = PREVIEW_PORT_START;
  const port = await portfinder.getPortPromise();

  // We use Vite's JavaScript API to start a server with inline config override
  // This allows us to inject the alias WITHOUT modifying the user's vite.config.ts
  const server = await createServer({
    configFile: path.join(version.path, "vite.config.ts"), // Use their config as base
    root: version.path,
    server: {
      port: port,
      strictPort: true,
      open: false, // We will open it manually with a small delay for better reliability
    },
    plugins: [
      {
        name: "html-transform",
        transformIndexHtml(html) {
          // 1. Remove importmap to force usage of local node_modules
          let newHtml = html.replace(
            /<script type="importmap">[\s\S]*?<\/script>/gi,
            "",
          );

          // 2. Remove integrity attributes to avoid hash mismatches on external CDNs
          newHtml = newHtml.replace(/\s+integrity="[^"]*"/gi, "");

          // 3. Inject entry point if missing
          const possibleEntries = [
            "index.tsx",
            "src/main.tsx",
            "src/index.tsx",
            "main.tsx",
          ];
          let entryPoint = "";
          for (const entry of possibleEntries) {
            if (fs.existsSync(path.join(version.path, entry))) {
              entryPoint = "/" + entry;
              break;
            }
          }

          if (entryPoint && !newHtml.includes(entryPoint)) {
            // Inject before closing body tag
            newHtml = newHtml.replace(
              "</body>",
              `<script type="module" src="${entryPoint}"></script>\n</body>`,
            );
          }

          return newHtml;
        },
      },
    ],
    resolve: {
      alias: {
        // OVERRIDE: Redirect @google/genai to our local mock
        "@google/genai": MOCK_GENAI_PATH,
      },
    },
    // Force dependency optimization to ensure local packages are used
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
  });

  await server.listen();

  server.printUrls();
  console.log(chalk.gray(`   (Mock GenAI Active)`));

  // Delay browser open slightly to ensure terminal output is seen and server is stable
  setTimeout(() => {
    server.openBrowser();
  }, 500);

  return { server, port };
}

// --- Main Execution ---

async function main() {
  console.log(chalk.bold.blue("=== GenAI Studio Preview ===\n"));

  // --- Environment Check ---
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
    console.error(
      chalk.gray(
        `If you just updated your .bashrc, please restart your terminal or run 'source ~/.bashrc'.`,
      ),
    );
    process.exit(1);
  }

  // Debug info
  console.log(chalk.gray(`Running on Node ${process.version}`));

  // Default to scanning scan relative to script location?
  // The user wants to run this from EXHIBITRON folder usually, pointing to ../.dev-tools...
  // Let's assume the target root is passed as arg, or default to current cwd.
  // Ideally we find the PROJECTS root.

  // If run from Projects/.dev-tools/version-launcher/launch-preview.ts
  // The 'projects root' is ../..
  const projectsRoot = path.resolve(__dirname, "../../");
  // The EXHIBITRON root is likely Projects/EXHIBITRON
  const exhibitronRoot = path.join(projectsRoot, "EXHIBITRON");

  console.log(chalk.gray(`Scanning ${exhibitronRoot} and ${projectsRoot}...`));

  const versions = await scanForVersions(exhibitronRoot);

  if (versions.length === 0) {
    console.log(chalk.red("No versions found."));
    return;
  }

  // Check for CLI args (e.g. --target "Legacy: EXHIBITRON-Z")
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

  // Keep process alive
  await new Promise(() => {});
}

main();
