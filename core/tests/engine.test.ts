
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { GenAIPreviewPlugin } from '../engine';
import path from 'path';
import fs from 'fs';

// Mock loadConfig
vi.mock('../config.js', () => ({
  loadConfig: vi.fn(() => ({})),
  CORE_CONFIG: {
    GEOLOCATION_SHIM_PATH: '/shim',
    SHARED_STYLES_PATH: '/styles.css',
    MOCK_GENAI_PATH: '/mock.ts'
  },
  getConfig: vi.fn(),
}));

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
        const plugin = GenAIPreviewPlugin('/dummy/path');
        const resolveId = (plugin as any).resolveId;
        const importer = path.join(testDir, 'importer.js');
        const id = './missing.css';

        const result = await resolveId.call(plugin, id, importer);
        expect(result).toContain('\0genai-css-stub:');
        expect(result).toContain('missing.css');
    });

    it('should return null for existing CSS file', async () => {
        const plugin = GenAIPreviewPlugin('/dummy/path');
        const resolveId = (plugin as any).resolveId;
        const importer = path.join(testDir, 'importer.js');
        const id = './existing.css';

        const result = await resolveId.call(plugin, id, importer);
        expect(result).toBeNull();
    });
});
