/* Zahlenformate (de-DE). Ein geschütztes Leerzeichen hält Zahl und Einheit zusammen. */

const NBSP = " ";

export const num = (n, d = 2) =>
  isFinite(n)
    ? n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";

export const eur = (n, d = 0) => (isFinite(n) ? `${num(n, d)}${NBSP}€` : "—");

export const pct = (n, d = 2) => (isFinite(n) ? `${num(n, d)}${NBSP}%` : "—");

/** Kompakte Achsenbeschriftung: 250 T€, 1,2 Mio €. */
export const kurz = (n) => {
  const stellen = (x) => (Math.round(x * 10) % 10 === 0 ? 0 : 1);
  if (Math.abs(n) >= 1e6) return `${num(n / 1e6, stellen(n / 1e6))}${NBSP}Mio${NBSP}€`;
  if (Math.abs(n) >= 1e3) return `${num(n / 1e3, stellen(n / 1e3))}${NBSP}T€`;
  return `${num(n, 0)}${NBSP}€`;
};
