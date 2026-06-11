import { expect, test } from '@playwright/test';
import enUsTranslations from '../src/assets/i18n/en-US.json';
import esEsTranslations from '../src/assets/i18n/es-ES.json';
import ptBrTranslations from '../src/assets/i18n/pt-BR.json';

type TranslationTree = Record<string, unknown>;

function flattenKeys(value: TranslationTree, prefix = ''): readonly string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (child && typeof child === 'object' && !Array.isArray(child)) {
      return flattenKeys(child as TranslationTree, path);
    }

    return [path];
  });
}

test.describe('i18n assets', () => {
  test('keeps every locale with the same translation keys', () => {
    const ptBrKeys = flattenKeys(ptBrTranslations).sort();

    expect(flattenKeys(enUsTranslations).sort()).toEqual(ptBrKeys);
    expect(flattenKeys(esEsTranslations).sort()).toEqual(ptBrKeys);
  });
});
