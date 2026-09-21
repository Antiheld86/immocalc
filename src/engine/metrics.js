/**
 * Kennzahlen, die sich erst aus der Zeitreihe ergeben.
 *
 * Der interne Zinsfuß steht bewusst nicht allein: Er ist nur mit einer
 * Verkaufsannahme definiert, und diese Annahme dominiert das Ergebnis.
 * Deshalb wird die unterstellte Wertsteigerung immer mit ausgewiesen.
 */

import { veraeusserungsgewinn } from "./taxes.js";

/** Interner Zinsfuß über Bisektion — robuster als Newton bei Vorzeichenwechseln. */
export function irr(zahlungen) {
  const npv = (r) => zahlungen.reduce((s, z, t) => s + z / Math.pow(1 + r, t), 0);
  if (npv(0) <= 0) return NaN;
  let lo = -0.9, hi = 1.0;
  if (npv(hi) > 0) return NaN;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2) * 100;
}

/** Verkauf im gewählten Jahr, inklusive § 23 EStG. */
export function verkaufsrechnung(input, objekt, jahre, verkaufsjahr) {
  const j = jahre[verkaufsjahr - 1];
  if (!j) return null;

  const erloes = j.objektwert * (1 - input.annahmen.verkaufskosten / 100);
  const g = veraeusserungsgewinn(
    erloes,
    objekt.gesamtinvestition,
    j.afaKumuliert,
    verkaufsjahr,
    input.steuern.effektiverSatz
  );

  return {
    ...g,
    erloes,
    verkaufsjahr,
    /* Was nach Tilgung der Restschuld tatsächlich übrig bleibt. */
    nettoZufluss: g.nettoerloes - j.restschuld,
    restschuld: j.restschuld,
  };
}

/** ETF-Depot nach Abgeltungsteuer (Teilfreistellung 30 % für Aktienfonds). */
export function etfNachSteuern(jahr) {
  const gewinn = Math.max(0, jahr.etfDepot - jahr.etfEinzahlungen);
  const steuer = gewinn * 0.7 * 0.26375;
  return jahr.etfDepot - steuer;
}

export function calculateMetrics(input, objekt, finanzierung, sim) {
  const j1 = sim.jahre[0];
  const ek = finanzierung.eigenkapital;
  const vj = input.annahmen.verkaufsjahr;
  const verkauf = vj ? verkaufsrechnung(input, objekt, sim.jahre, vj) : null;

  /* Zahlungsreihe für den internen Zinsfuß. */
  const reihe = [-ek];
  const bis = vj || 40;
  for (let i = 0; i < bis; i++) reihe.push(sim.jahre[i].cashflow);
  if (verkauf) reihe[bis] += verkauf.nettoZufluss;

  const jVergleich = sim.jahre[bis - 1];

  return {
    cashflowMonat: j1.cashflowVorSteuer / 12,
    cashflowMonatNachSteuer: j1.cashflow / 12,
    ekRendite: ek > 0 ? ((j1.reinertrag - j1.zins) / ek) * 100 : NaN,
    ekRenditeNachSteuer: ek > 0 ? ((j1.reinertrag - j1.zins - j1.steuer) / ek) * 100 : NaN,
    cashOnCash: ek > 0 ? (j1.cashflow / ek) * 100 : NaN,
    /* Kapitaldienstdeckung: Reinertrag zu Rate. Unter 1,0 zahlst du zu. */
    deckungsgrad: j1.kapitaldienst > 0 ? j1.reinertrag / j1.kapitaldienst : Infinity,
    breakEvenMiete:
      objekt.flaeche > 0
        ? j1.kapitaldienst / 12 / objekt.flaeche + input.bewirtschaftung.nkQm
        : NaN,
    leerstandMonate:
      j1.bruttomiete > 0 ? Math.max(0, (j1.reinertrag - j1.kapitaldienst) / (j1.bruttomiete / 12)) : NaN,
    irr: irr(reihe),
    verkauf,
    vermoegenImmobilie: verkauf
      ? verkauf.nettoZufluss + jVergleich.kumulierterCashflow
      : jVergleich.eigenkapital + jVergleich.kumulierterCashflow,
    vermoegenEtf: etfNachSteuern(jVergleich),
    horizont: bis,
  };
}
