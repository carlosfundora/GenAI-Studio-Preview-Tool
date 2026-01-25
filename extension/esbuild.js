const esbuild = require('esbuild');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * Plugin to report build errors in a format compatible with VS Code's problem matcher
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => {
      console.log('[esbuild] build started');
    });
    build.onEnd(result => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location == null) return;
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[esbuild] build finished');
    });
  }
};

/**
 * Build the main extension bundle
 */
async function buildExtension() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: [
      'vscode',  // Provided by VS Code runtime
      'vite',    // We spawn vite as a separate process, don't bundle it
    ],
    logLevel: 'warning',
    plugins: [esbuildProblemMatcherPlugin]
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

/**
 * Build the server entry point (separate bundle for spawned process)
 */
async function buildServerEntry() {
  const ctx = await esbuild.context({
    entryPoints: ['src/server-entry.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/server-entry.js',
    external: [
      'vscode',
      'vite',  // Vite is loaded at runtime for the dev server
    ],
    logLevel: 'warning',
    plugins: [esbuildProblemMatcherPlugin]
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

/**
 * Copy core directory files (mocks, shims, config) that need to be available at runtime.
 * These TypeScript files are loaded by Vite and transpiled to ESM for browser use.
 */
async function copyCoreFiles() {
  const fs = require('fs');
  const coreDir = path.join(__dirname, '..', 'core');
  const distCoreDir = path.join(__dirname, 'dist', 'core');

  // Directories to copy
  const dirsToCopy = ['mocks', 'shims', 'assets'];
  // Individual files to copy
  const filesToCopy = ['config.ts'];

  // Recursive copy function
  function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  // Ensure dist/core exists
  fs.mkdirSync(distCoreDir, { recursive: true });

  // Copy directories
  for (const dir of dirsToCopy) {
    copyDir(path.join(coreDir, dir), path.join(distCoreDir, dir));
  }

  // Copy individual files
  for (const file of filesToCopy) {
    const src = path.join(coreDir, file);
    const dest = path.join(distCoreDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  console.log('[esbuild] Core files copied to dist/core');
}

async function main() {
  try {
    await Promise.all([
      buildExtension(),
      buildServerEntry(),
      copyCoreFiles()
    ]);
    console.log('[esbuild] All builds completed successfully');
  } catch (e) {
    console.error('[esbuild] Build failed:', e);
    process.exit(1);
  }
}

main();
