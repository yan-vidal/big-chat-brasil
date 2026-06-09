import { describe, expect, it } from 'vitest';
import { getSharedPackageName } from './index';

describe('shared package smoke test', () => {
  it('exposes the shared package name for workspace wiring', () => {
    expect(getSharedPackageName()).toBe('@bcb/shared');
  });
});
