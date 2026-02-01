import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenAIPreviewPlugin } from '../engine.js';
import fs from 'node:fs';

// Mock fs to track calls
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: {
        ...actual,
        existsSync: vi.fn(),
    },
    existsSync: vi.fn(),
  };
});

// Mock config to ensure entryPoint is empty and triggers detection
vi.mock('../config.js', () => ({
  loadConfig: vi.fn(() => ({
      scanPaths: [],
      externalProjects: [],
      entryPoint: "", // Empty to trigger detection
      port: 4000,
      ai: { mode: 'mock', endpoint: '', models: { text: '' }, gpuPassthrough: false, timeout: 0 },
      location: { mode: 'passthrough' },
      autoShutdown: { enabled: false, timeoutMs: 0 },
  })),
  CORE_CONFIG: { GEOLOCATION_SHIM_PATH: '/shim', SHARED_STYLES_PATH: '/styles' },
  getConfig: vi.fn(),
}));

describe('Performance: GenAIPreviewPlugin', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should memoize entry point detection', () => {
        const existsSync = vi.mocked(fs.existsSync);
        // Simulate no entry points found initially
        existsSync.mockReturnValue(false);

        const plugin = GenAIPreviewPlugin('/test/project');
        const transformIndexHtml = (plugin as any).transformIndexHtml;
        const html = '<body></body>';

        // First call
        transformIndexHtml(html);
        const initialCallCount = existsSync.mock.calls.length;
        console.log('Initial FS calls:', initialCallCount);

        // Expect at least one check (since we have 4 candidates)
        expect(initialCallCount).toBeGreaterThan(0);

        // Second call
        transformIndexHtml(html);
        const secondCallCount = existsSync.mock.calls.length;
        console.log('Total FS calls after 2nd:', secondCallCount);

        const additionalCalls = secondCallCount - initialCallCount;

        // This assertion expects optimization (0 additional calls)
        // Ideally this fails before the fix
        expect(additionalCalls).toBe(0);
    });
});
