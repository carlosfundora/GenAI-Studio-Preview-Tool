
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { GenAIPreviewPlugin } from '../engine';
import path from 'path';
import fs from 'fs';

// Mock loadConfig
vi.mock('../config.js', () => ({
  loadConfigAsync: vi.fn(async () => ({})),
  loadConfig: vi.fn(() => ({})),
  getConfig: vi.fn(),
  getConfigAsync: vi.fn(),
}));

// Mock CORE_CONFIG separately or import it?
// The engine.ts imports config.js, which we mocked.
// But engine.ts also uses CORE_CONFIG which is defined in engine.ts?
// Ah, engine.ts defines CORE_CONFIG constant.
// Wait, the previous test mocked CORE_CONFIG in config.js mock?
// "CORE_CONFIG: { ... }" inside vi.mock('../config.js') block?
// But CORE_CONFIG is exported from engine.ts!
// The previous test file had:
/*
vi.mock('../config.js', () => ({
  loadConfig: vi.fn(() => ({})),
  CORE_CONFIG: { ... }
}));
*/
// This implies CORE_CONFIG was imported from config.js in the test?
// No, the test imports GenAIPreviewPlugin from '../engine'.
// Maybe the test file was wrong or I misread it.
// engine.ts exports CORE_CONFIG. config.ts does NOT.
// So mocking CORE_CONFIG in config.js mock makes no sense unless engine.ts re-exports it from config.js (it doesn't).
// But engine.ts *imports* loadConfig from config.js.
// Let's check engine.ts exports again.
// export { getConfig, getConfigAsync, loadConfig, loadConfigAsync, type GenAIPreviewConfig } from "./config.js";
// export const CORE_CONFIG = { ... };

// So CORE_CONFIG is in engine.ts.
// The previous test might have been confusing or I misread where CORE_CONFIG was coming from in the mock.
// Re-reading previous read_file result for core/tests/engine.test.ts:
/*
vi.mock('../config.js', () => ({
  loadConfig: vi.fn(() => ({})),
  CORE_CONFIG: {
    GEOLOCATION_SHIM_PATH: '/shim',
    SHARED_STYLES_PATH: '/styles.css',
    MOCK_GENAI_PATH: '/mock.ts'
  },
  getConfig: vi.fn(),
}));
*/
// It seems the test author put CORE_CONFIG in the mock of config.js.
// Does engine.ts import CORE_CONFIG from config.js? No.
// Does the test use CORE_CONFIG from config.js?
// The test doesn't use CORE_CONFIG explicitly.
// Maybe it was just junk in the mock.

describe('GenAIPreviewPlugin Engine', () => {
    const testDir = path.resolve(__dirname, 'temp_test');

    beforeAll(() => {
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
        fs.writeFileSync(path.join(testDir, 'existing.css'), 'body {}');
    });

    afterAll(() => {
        fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should resolve missing CSS file to stub', async () => {
        const plugin = await GenAIPreviewPlugin('/dummy/path');
        const resolveId = (plugin as any).resolveId;
        const importer = path.join(testDir, 'importer.js');
        const id = './missing.css';

        const result = await resolveId.call(plugin, id, importer);
        expect(result).toContain('\0genai-css-stub:');
        expect(result).toContain('missing.css');
    });

    it('should return null for existing CSS file', async () => {
        const plugin = await GenAIPreviewPlugin('/dummy/path');
        const resolveId = (plugin as any).resolveId;
        const importer = path.join(testDir, 'importer.js');
        const id = './existing.css';

        const result = await resolveId.call(plugin, id, importer);
        expect(result).toBeNull();
    });
});
