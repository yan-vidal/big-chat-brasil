const CPF_BASE_MIN = 100_000_000;
const CPF_BASE_RANGE = 900_000_000;
const CNPJ_ROOT_MIN = 10_000_000;
const CNPJ_ROOT_RANGE = 90_000_000;

function positiveInteger(seed: number): number {
  return Math.max(1, Math.trunc(Math.abs(seed)));
}

function weightedCheckDigit(base: string, weights: readonly number[]): number {
  const sum = base
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

export function generateCpf(seed = 1): string {
  const normalizedSeed = positiveInteger(seed);
  const base = String(CPF_BASE_MIN + (normalizedSeed % CPF_BASE_RANGE)).padStart(9, '0');
  const firstDigit = weightedCheckDigit(base, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = weightedCheckDigit(`${base}${firstDigit}`, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);

  return `${base}${firstDigit}${secondDigit}`;
}

export function generateCnpj(seed = 1): string {
  const normalizedSeed = positiveInteger(seed);
  const root = String(CNPJ_ROOT_MIN + (normalizedSeed % CNPJ_ROOT_RANGE)).padStart(8, '0');
  const base = `${root}0001`;
  const firstDigit = weightedCheckDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = weightedCheckDigit(
    `${base}${firstDigit}`,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return `${base}${firstDigit}${secondDigit}`;
}
