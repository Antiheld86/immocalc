/**
 * Einstiegspunkt der Berechnung. Eine reine Funktion: gleiche Eingabe,
 * gleiches Ergebnis, keine Seiteneffekte, kein React.
 *
 * Genau deshalb lässt sie sich in Ruhe testen — siehe engine.test.js.
 */

import { calculateProperty } from "./property.js";
import { calculateFinancing } from "./financing.js";
import { effektiverSteuersatz, afaSatzNachBaujahr } from "./taxes.js";
import { simuliere } from "./simulation.js";
import { calculateMetrics } from "./metrics.js";

export function calculateInvestment(roh) {
  const input = normalisiere(roh);
  const objekt = calculateProperty(input);
  const finanzierung = calculateFinancing(input, objekt.gesamtinvestition);
  const simulation = simuliere(input, objekt, finanzierung);
  const kennzahlen = calculateMetrics(input, objekt, finanzierung, simulation);
  return { input, objekt, finanzierung, simulation, kennzahlen };
}

/** Fehlende Felder auffüllen und abgeleitete Steuerwerte setzen. */
export function normalisiere(roh) {
  const input = {
    ...STANDARD,
    ...roh,
    objekt: { ...STANDARD.objekt, ...roh.objekt },
    nebenkosten: { ...STANDARD.nebenkosten, ...roh.nebenkosten },
    bewirtschaftung: { ...STANDARD.bewirtschaftung, ...roh.bewirtschaftung },
    finanzierung: { ...STANDARD.finanzierung, ...roh.finanzierung },
    steuern: { ...STANDARD.steuern, ...roh.steuern },
    annahmen: { ...STANDARD.annahmen, ...roh.annahmen },
    sanierung: roh.sanierung ?? STANDARD.sanierung,
  };
  input.steuern.effektiverSatz = effektiverSteuersatz(input.steuern);
  if (input.steuern.afaAutomatisch)
    input.steuern.afaSatz = afaSatzNachBaujahr(input.objekt.baujahr);
  return input;
}

let lfd = 0;
export const neueEinheit = (name = "Wohnung") => ({
  id: `e${Date.now()}${lfd++}`,
  name,
  flaeche: 70,
  miete: 550,
  zielmiete: 600,
});

/** Startwerte: fiktives Beispielobjekt, keine realen Daten. */
export const STANDARD = {
  objekt: {
    kaufpreis: 360000,
    baujahr: 1965,
    grundstueck: 520,
    bodenrichtwert: 280,
    bodenAbschlag: 0,
    restnutzungsdauer: 35,
    herstellungskosten: 1400,
    gebaeudeanteilManuell: null,
    einheiten: [
      { id: "e1", name: "Wohnung 1", flaeche: 68, miete: 510, zielmiete: 560 },
      { id: "e2", name: "Wohnung 2", flaeche: 72, miete: 540, zielmiete: 590 },
      { id: "e3", name: "Wohnung 3", flaeche: 58, miete: 400, zielmiete: 470 },
    ],
  },
  nebenkosten: { grunderwerb: 6.5, notar: 1.5, grundbuch: 0.5, makler: 3.57 },
  bewirtschaftung: { nkQm: 1.5, mietausfall: 2 },
  finanzierung: {
    eigenkapital: 80000,
    zins: 4.0,
    tilgung: 2,
    zinsbindung: 15,
    anschlussZins: 4.5,
    sondertilgung: 0,
    kuendigung489: false,
  },
  steuern: {
    steuersatz: 35,
    soli: false,
    kirchensteuer: 0,
    afaSatz: 2.0,
    afaAutomatisch: true,
  },
  sanierung: [{ id: "s1", jahr: 10, betrag: 45000, bezeichnung: "Heizung", aktivieren: true }],
  annahmen: {
    mietsteigerung: 1.5,
    kostensteigerung: 2.0,
    wertsteigerung: 1.0,
    etfRendite: 7.0,
    verkaufsjahr: 15,
    verkaufskosten: 3,
  },
};
