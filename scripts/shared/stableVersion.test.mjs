import { describe, expect, it } from 'vitest';

import { isStableVersionAtLeast } from './stableVersion.mjs';

describe('isStableVersionAtLeast', () => {
  it.each([
    ['0.19.99', false],
    ['0.20.0-alpha', false],
    ['0.20.0', true],
    ['0.20.1-alpha', true],
    ['0.21.0-alpha', true],
    ['1.0.0-rc.1', true],
    ['1.0.0', true],
    ['not-a-version', false],
  ])('compares %s with the stable 0.20.0 floor', (version, expected) => {
    expect(isStableVersionAtLeast(version, 20)).toBe(expected);
  });
});
