import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Plugin } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Shared configuration and path resolution for the GenAI Studio Preview engine.
 */
export const CORE_CONFIG = {
  MOCK_GENAI_PATH: path.resolve(__dirname, "./mocks/genai.ts"),
};

/**
 * A Vite plugin that prepares AI Studio applications for local preview without modification.
 */
export function GenAIPreviewPlugin(projectPath: string): Plugin {
  return {
    name: "genai-preview-transform",
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
        if (fs.existsSync(path.join(projectPath, entry))) {
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
  };
}
