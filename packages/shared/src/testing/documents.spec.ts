import { describe, expect, it } from 'vitest';
import { isValidCnpj, isValidCpf } from '../documents.js';
import { generateCnpj, generateCpf } from './documents.js';

describe('testing document generators', () => {
  it('generates deterministic valid CPFs', () => {
    expect(generateCpf(1)).toBe(generateCpf(1));
    expect(generateCpf(1)).not.toBe(generateCpf(2));
    expect(generateCpf(1)).toHaveLength(11);
    expect(isValidCpf(generateCpf(1))).toBe(true);
  });

  it('generates deterministic valid CNPJs', () => {
    expect(generateCnpj(1)).toBe(generateCnpj(1));
    expect(generateCnpj(1)).not.toBe(generateCnpj(2));
    expect(generateCnpj(1)).toHaveLength(14);
    expect(isValidCnpj(generateCnpj(1))).toBe(true);
  });
});
