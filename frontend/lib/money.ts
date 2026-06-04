/**
 * Currency formatting for the app.
 *
 * Mahrousa operates in Egyptian Pounds (EGP). All monetary values
 * shown in the UI MUST go through `egp()` so they look consistent
 * (thousand separators + two decimals + "EGP" prefix).
 */

const _formatter = new Intl.NumberFormat("en-EG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function egp(n: number): string {
  if (!Number.isFinite(n)) return "EGP 0.00";
  return `EGP ${_formatter.format(n)}`;
}

/** Short form without the "EGP" prefix — for tight UI like preview chips. */
export function egpShort(n: number): string {
  if (!Number.isFinite(n)) return "0.00";
  return _formatter.format(n);
}
