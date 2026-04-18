import { describe, expect, it } from 'vitest';
import { LIB_VERSION } from '../../src';

describe('smoke', () => {
  it('exposes a version string', () => {
    expect(typeof LIB_VERSION).toBe('string');
    expect(LIB_VERSION.length).toBeGreaterThan(0);
  });
});
