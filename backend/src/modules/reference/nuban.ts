/**
 * NUBAN — Nigeria Uniform Bank Account Number (CBN, 2010).
 *
 * A NUBAN is 10 digits: a 9-digit serial the bank assigns, plus 1 check digit
 * computed from the bank's 3-digit CBN code and the serial. The check digit
 * lets anyone reject a mistyped account number before money moves, without
 * asking the bank.
 *
 * Algorithm (CBN "Revised Standards on NUBAN", section 2):
 *   1. Concatenate bank code (3) + serial (9) → 12 digits.
 *   2. Multiply each digit by the repeating weights 3, 7, 3.
 *   3. check = (10 − (sum mod 10)) mod 10.
 */

const WEIGHTS = [3, 7, 3] as const;

export const BANK_CODE = /^\d{3}$/;
export const SERIAL = /^\d{9}$/;
export const NUBAN = /^\d{10}$/;

export function checkDigit(bankCode: string, serial: string): number {
  if (!BANK_CODE.test(bankCode)) throw new RangeError('bank code must be 3 digits');
  if (!SERIAL.test(serial)) throw new RangeError('serial must be 9 digits');
  const digits = `${bankCode}${serial}`;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += Number(digits[i]) * WEIGHTS[i % 3]!;
  }
  return (10 - (sum % 10)) % 10;
}

/** Serial + check digit: the 10-digit account number. */
export function generate(bankCode: string, serial: string): string {
  return `${serial}${checkDigit(bankCode, serial)}`;
}

/** Does this 10-digit number carry the right check digit for this bank? */
export function validate(bankCode: string, accountNumber: string): boolean {
  if (!NUBAN.test(accountNumber)) return false;
  return checkDigit(bankCode, accountNumber.slice(0, 9)) === Number(accountNumber[9]);
}
