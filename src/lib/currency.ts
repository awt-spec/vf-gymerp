export const CURRENCIES = [
  { code: "CRC", symbol: "₡", name: "Colón costarricense" },
  { code: "USD", symbol: "$", name: "Dólar estadounidense" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "MXN", symbol: "$", name: "Peso mexicano" },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]["code"];

export function formatCurrency(amount: number, currency: string = "CRC"): string {
  const curr = CURRENCIES.find((c) => c.code === currency);
  const symbol = curr?.symbol ?? "$";
  return `${symbol}${amount.toLocaleString()}`;
}

export function getCurrencySymbol(currency: string = "CRC"): string {
  return CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$";
}
