import { z } from 'zod';
import type { DocumentType } from './enums.js';

const FORMATTING_CHARACTERS = /[./\s-]/g;
const DIGITS_ONLY = /^\d+$/;
const REPEATED_DIGITS = /^(\d)\1+$/;

export const ADMIN_DOCUMENT_ID = '00000000000';

export function normalizeDocument(value: string): string {
  return value.trim().replace(FORMATTING_CHARACTERS, '');
}

function calculateCheckDigit(base: string, weights: readonly number[]): number {
  const sum = base
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCpf(value: string): boolean {
  const normalized = normalizeDocument(value);
  if (!/^\d{11}$/.test(normalized) || REPEATED_DIGITS.test(normalized)) {
    return false;
  }

  const firstDigit = calculateCheckDigit(normalized.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateCheckDigit(
    `${normalized.slice(0, 9)}${firstDigit}`,
    [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return normalized.endsWith(`${firstDigit}${secondDigit}`);
}

export function isValidCnpj(value: string): boolean {
  const normalized = normalizeDocument(value);
  if (!/^\d{14}$/.test(normalized) || REPEATED_DIGITS.test(normalized)) {
    return false;
  }

  const firstDigit = calculateCheckDigit(
    normalized.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const secondDigit = calculateCheckDigit(
    `${normalized.slice(0, 12)}${firstDigit}`,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return normalized.endsWith(`${firstDigit}${secondDigit}`);
}

export function inferDocumentType(value: string): DocumentType {
  const normalized = normalizeDocument(value);

  if (!DIGITS_ONLY.test(normalized)) {
    throw new Error('Documento deve conter apenas dígitos');
  }
  if (normalized.length === 11) {
    return 'CPF';
  }
  if (normalized.length === 14) {
    return 'CNPJ';
  }

  throw new Error('Documento deve ter 11 ou 14 dígitos');
}

const NormalizedDocumentStringSchema = z
  .string()
  .trim()
  .min(1)
  .transform(normalizeDocument)
  .refine((value) => DIGITS_ONLY.test(value), {
    message: 'Documento deve conter apenas dígitos',
  });

export const CpfSchema = NormalizedDocumentStringSchema.refine(isValidCpf, {
  message: 'CPF inválido',
});

export const CnpjSchema = NormalizedDocumentStringSchema.refine(isValidCnpj, {
  message: 'CNPJ inválido',
});

export const DocumentIdSchema = z.union([CpfSchema, CnpjSchema]);
export const AdminDocumentIdSchema = NormalizedDocumentStringSchema.refine(
  (value) => value === ADMIN_DOCUMENT_ID,
  {
    message: 'CPF de administrador inválido',
  },
);
export const LoginDocumentIdSchema = z.union([DocumentIdSchema, AdminDocumentIdSchema]);
