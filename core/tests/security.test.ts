
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenAIPreviewPlugin } from '../engine.js';
import { loadConfigAsync } from '../config.js';

// Mock loadConfig
vi.mock('../config.js', () => ({
  loadConfigAsync: vi.fn(),
  loadConfig: vi.fn(),
  CORE_CONFIG: { GEOLOCATION_SHIM_PATH: '/shim' },
  getConfig: vi.fn(),
  getConfigAsync: vi.fn(),
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

    const plugin = await GenAIPreviewPlugin('/dummy/path');
    const transformIndexHtml = (plugin as any).transformIndexHtml;

    expect(transformIndexHtml).toBeDefined();

    const html = '<html><head></head><body></body></html>';
    const result = await transformIndexHtml(html);

    // Check for safe escaping
    expect(result).not.toContain('</script><script>alert("XSS")</script>');
    // The previous test expected double backslashes because of JSON.stringify escaping inside string literal in JS code?
    // Let's keep expectations same.
    // Original: expect(result).toContain('\\u003c/script>\\u003cscript>alert(\\"XSS\\")\\u003c/script>');

    // My new implementation: JSON.stringify(config).replace(/</g, "\\u003c");
    // So < becomes \u003c
    // " remains " (escaped by JSON.stringify)

    // If input has </script>
    // JSON.stringify: "<\/script>" (wait, does JSON.stringify escape /? No. It escapes " and \ and control chars)
    // So input string in JS: "</script>"
    // JSON.stringify: '"</script>"'
    // .replace(/</g, "\\u003c"): '"\\u003c/script>"'
    // Wait, in JS string literal \\u003c means \u003c characters.

    // The original test expectation:
    // expect(result).toContain('\\u003c/script>\\u003cscript>alert(\\"XSS\\")\\u003c/script>');
    // This looks like it expects \u003c

    expect(result).toContain('\\u003c/script>\\u003cscript>alert(\\"XSS\\")\\u003c/script>');
  });
});
