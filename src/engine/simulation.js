/**
 * Die Jahresschleife. Herzstück des Rechners.
 *
 * Alles, was sich über die Zeit verändert, wird hier einmal durchgerechnet:
 * Mieten wachsen gegen ihre Zielmiete, die Kappungsgrenze bremst sie dabei,
 * der Zinsanteil sinkt und die Steuerlast steigt entsprechend, Sanierungen
 * fallen in bestimmten Jahren an, das Darlehen läuft aus.
 *
 * Jede Kennzahl weiter oben im Programm ist danach nur noch ein Zugriff auf
 * ein Jahr dieser Liste.
 */

import { pruefe15Prozent } from "./taxes.js";

export const JAHRE = 40;

/** § 558 Abs. 3 BGB: höchstens 20 % in drei Jahren, hier als Jahresfaktor. */
export const KAPPUNGSFAKTOR = Math.pow(1.2, 1 / 3);

export function simuliere(input, objekt, finanzierung) {
  const { bewirtschaftung: b, steuern: st, annahmen: a } = input;
  const satz = st.effektiverSatz;

  const pruefung = pruefe15Prozent(input.sanierung, objekt.gebaeudeAnschaffungskosten);

  /* Mietstand je Einheit, wird Jahr für Jahr fortgeschrieben. */
  let mieten = input.objekt.einheiten.map((e) => ({
    miete: e.miete || 0,
    ziel: Math.max(e.miete || 0, e.zielmiete || 0),
  }));

  let afaBasis = objekt.gebaeudeAnschaffungskosten;
  let afaKumuliert = 0;
  let kumulierterCashflow = 0;
  let etfDepot = finanzierung.eigenkapital;
  let etfEinzahlungen = finanzierung.eigenkapital;

  const jahre = [];

  for (let j = 1; j <= JAHRE; j++) {
    /* --- Mieten ------------------------------------------------------- */
    mieten = mieten.map((m) => {
      const ziel = m.ziel * Math.pow(1 + a.mietsteigerung / 100, j - 1);
      const neu =
        m.miete < ziel
          ? Math.min(ziel, m.miete * KAPPUNGSFAKTOR)
          : m.miete * (1 + a.mietsteigerung / 100);
      return { ...m, miete: j === 1 ? m.miete : neu };
    });

    const bruttomiete = mieten.reduce((s, m) => s + m.miete, 0) * 12;
    const kostenIndex = Math.pow(1 + a.kostensteigerung / 100, j - 1);
    const bewirtschaftungskosten =
      b.nkQm * objekt.flaeche * 12 * kostenIndex + (bruttomiete * b.mietausfall) / 100;
    const reinertrag = bruttomiete - bewirtschaftungskosten;

    /* --- Sanierung ---------------------------------------------------- */
    const massnahmen = input.sanierung.filter((s) => s.jahr === j);
    const ausgabe = massnahmen.reduce((s, m) => s + m.betrag, 0);
    /* In den ersten drei Jahren entscheidet die 15-%-Grenze über die
       Behandlung, danach zählt die Einstufung der Maßnahme selbst. */
    const aktivieren = j <= 3 ? pruefung.ueberschritten : false;
    const sofortAbzug = massnahmen
      .filter((m) => aktivieren === false && !m.aktivieren)
      .reduce((s, m) => s + m.betrag, 0);
    const aktiviert = ausgabe - sofortAbzug;
    afaBasis += aktiviert;

    /* --- Darlehen ----------------------------------------------------- */
    const d = finanzierung.plan[j - 1] || {
      zins: 0, tilgung: 0, sondertilgung: 0, restschuld: 0, gezahlt: 0,
    };

    /* --- Steuern ------------------------------------------------------ */
    const afa = (afaBasis * st.afaSatz) / 100;
    afaKumuliert += afa;
    const steuerergebnis = reinertrag - d.zins - afa - sofortAbzug;
    const steuer = (steuerergebnis * satz) / 100;

    /* --- Liquidität --------------------------------------------------- */
    const kapitaldienst = d.gezahlt + d.sondertilgung;
    const cashflowVorSteuer = reinertrag - kapitaldienst - ausgabe;
    const cashflow = cashflowVorSteuer - steuer;
    kumulierterCashflow += cashflow;

    /* --- Vermögen ----------------------------------------------------- */
    const objektwert = input.objekt.kaufpreis * Math.pow(1 + a.wertsteigerung / 100, j);
    const eigenkapital = objektwert - d.restschuld;

    /* --- Vergleichsdepot ---------------------------------------------- */
    etfDepot = etfDepot * (1 + a.etfRendite / 100) - cashflow;
    etfEinzahlungen -= cashflow;

    jahre.push({
      jahr: j,
      bruttomiete,
      bewirtschaftungskosten,
      reinertrag,
      zins: d.zins,
      tilgung: d.tilgung + d.sondertilgung,
      kapitaldienst,
      restschuld: d.restschuld,
      afa,
      afaKumuliert,
      sanierung: ausgabe,
      sanierungSofort: sofortAbzug,
      steuerergebnis,
      steuer,
      cashflowVorSteuer,
      cashflow,
      kumulierterCashflow,
      objektwert,
      eigenkapital,
      etfDepot,
      etfEinzahlungen,
      mieten: mieten.map((m) => m.miete),
    });
  }

  return { jahre, pruefung15: pruefung };
}
