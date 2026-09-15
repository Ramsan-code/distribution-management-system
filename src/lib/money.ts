export const MAX_AMOUNT_CENTS = 100_000_000;
export function parseMoney(value: string): number {
  const trimmed = value.trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(trimmed)) throw new Error("Enter a positive amount with at most two decimal places.");
  const [whole, fraction = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents <= 0 || cents > MAX_AMOUNT_CENTS) throw new Error("Amount must be between 0.01 and 1,000,000.00.");
  return cents;
}
export function money(cents: number): string {
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(cents / 100);
}
export function checkedAdd(a: number, b: number): number {
  const result = a + b;
  if (!Number.isSafeInteger(result) || result < 0) throw new Error("Invalid balance.");
  return result;
}
