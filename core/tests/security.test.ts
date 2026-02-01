
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenAIPreviewPlugin } from '../engine.js';
import { loadConfigAsync } from '../config.js';

// Mock loadConfig
vi.mock('../config.js', () => ({
  loadConfigAsync: vi.fn(),
  getConfigAsync: vi.fn(),
  CORE_CONFIG: { GEOLOCATION_SHIM_PATH: '/shim' },
}));

describe('Security: GenAIPreviewPlugin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should escape malicious script tags in injected configuration', async () => {
    const maliciousConfig = {
      scanPaths: [],
      externalProjects: [],
      port: 4000,
      ai: { mode: 'mock', endpoint: '', models: { text: '' }, gpuPassthrough: false, timeout: 0 },
      location: {
        mode: 'mock', // Must not be passthrough
        mockCoords: {
            latitude: 0,
            longitude: 0,
            metadata: '</script><script>alert("XSS")</script>'
        }
      },
      autoShutdown: { enabled: false, timeoutMs: 0 },
    };

    vi.mocked(loadConfigAsync).mockResolvedValue(maliciousConfig as any);

    const plugin = GenAIPreviewPlugin('/dummy/path');
    const transformIndexHtml = (plugin as any).transformIndexHtml;

    expect(transformIndexHtml).toBeDefined();

    const html = '<html><head></head><body></body></html>';
    const result = await transformIndexHtml(html);

    // Check for safe escaping
    expect(result).not.toContain('</script><script>alert("XSS")</script>');
    expect(result).toContain('\\u003c/script>\\u003cscript>alert(\\"XSS\\")\\u003c/script>');
  });

  it('should not allow XSS via entryPoint configuration', () => {
    const maliciousConfig = {
      scanPaths: [],
      externalProjects: [],
      port: 4000,
      ai: { mode: 'mock', endpoint: '', models: { text: '' }, gpuPassthrough: false, timeout: 0 },
      location: { mode: 'passthrough' },
      autoShutdown: { enabled: false, timeoutMs: 0 },
      entryPoint: '"><script>alert("XSS")</script><script src="'
    };

    vi.mocked(loadConfig).mockReturnValue(maliciousConfig as any);

    const plugin = GenAIPreviewPlugin('/dummy/path');
    const transformIndexHtml = (plugin as any).transformIndexHtml;

    expect(transformIndexHtml).toBeDefined();

    const html = '<html><head></head><body></body></html>';
    const result = transformIndexHtml(html);

    expect(result).not.toContain('<script>alert("XSS")</script>');
  });
});
