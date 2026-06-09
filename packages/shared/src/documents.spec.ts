import { describe, expect, it } from 'vitest';
import {
  CnpjSchema,
  CpfSchema,
  DocumentIdSchema,
  inferDocumentType,
  isValidCnpj,
  isValidCpf,
  normalizeDocument,
} from './documents.js';

describe('document normalization and validation', () => {
  it('normalizes formatted CPF and CNPJ values', () => {
    expect(normalizeDocument('529.982.247-25')).toBe('52998224725');
    expect(normalizeDocument('11.222.333/0001-81')).toBe('11222333000181');
  });

  it('validates CPF check digits', () => {
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('11144477735')).toBe(true);
    expect(isValidCpf('52998224724')).toBe(false);
    expect(isValidCpf('11111111111')).toBe(false);
  });

  it('validates CNPJ check digits', () => {
    expect(isValidCnpj('11222333000181')).toBe(true);
    expect(isValidCnpj('11444777000161')).toBe(true);
    expect(isValidCnpj('11222333000180')).toBe(false);
    expect(isValidCnpj('00000000000000')).toBe(false);
  });

  it('infers document type from normalized shape', () => {
    expect(inferDocumentType('123.456.789-09')).toBe('CPF');
    expect(inferDocumentType('11.222.333/0001-81')).toBe('CNPJ');
    expect(() => inferDocumentType('123')).toThrow('Documento deve ter 11 ou 14 dígitos');
    expect(() => inferDocumentType('abc12345678909')).toThrow(
      'Documento deve conter apenas dígitos',
    );
  });

  it('parses and normalizes valid schemas', () => {
    expect(CpfSchema.parse('529.982.247-25')).toBe('52998224725');
    expect(CnpjSchema.parse('11.222.333/0001-81')).toBe('11222333000181');
    expect(DocumentIdSchema.parse('123.456.789-09')).toBe('12345678909');
  });

  it('rejects invalid check digits and letters', () => {
    expect(DocumentIdSchema.safeParse('529.982.247-24').success).toBe(false);
    expect(DocumentIdSchema.safeParse('abc52998224725').success).toBe(false);
  });
});
