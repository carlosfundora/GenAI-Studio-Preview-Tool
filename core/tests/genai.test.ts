
import { describe, it, expect, vi } from 'vitest';
import { EmbeddingModel } from '../mocks/genai.js';

vi.mock('../config.js', () => ({
  getConfig: vi.fn(() => ({
    ai: {
      mode: 'mock',
    }
  })),
}));

describe('EmbeddingModel', () => {
  it('should return deterministic embedding for text', async () => {
    const model = new EmbeddingModel();
    const result = await model.embedContent("Hello World");

    // Expected values calculated manually:
    // "Hello World" -> hash 1052
    // values[0] = sin(1052) * 0.5 = 0.21004248595967168

    expect(result.embedding.values).toHaveLength(768);
    expect(result.embedding.values[0]).toBeCloseTo(0.21004248595967168, 10);
    expect(result.embedding.values[1]).toBeCloseTo(-0.2683246140510031, 10);
    expect(result.embedding.values[2]).toBeCloseTo(-0.49999530134554293, 10);
    expect(result.embedding.values[3]).toBeCloseTo(-0.27197261442946136, 10);
    expect(result.embedding.values[4]).toBeCloseTo(0.20610043992709404, 10);
  });
});
