/**
 * Objektebene: Investitionssumme, Kaufpreisaufteilung, Mieteinnahmen.
 *
 * Die Kaufpreisaufteilung ist der Punkt, an dem die meisten Rechner zu
 * optimistisch sind. Ein pauschaler Gebäudeanteil von 80 % stimmt bei
 * kleinen Grundstücken; bei großen Grundstücken in einfachen Lagen kann
 * der Boden den halben Kaufpreis ausmachen und die AfA halbieren.
 */

/** Nebenkostensatz in Prozent des Kaufpreises. */
export function nebenkostenSatz(nk) {
  return nk.grunderwerb + nk.notar + nk.grundbuch + nk.makler;
}

/**
 * Bodenwert nach Bodenrichtwert.
 *
 * Der Bodenrichtwert bezieht sich auf die typische Grundstücksgröße seiner
 * Zone (meist 300–400 m²). Bei deutlich größeren Grundstücken liegt der
 * realisierbare Wert je m² darunter — der Abschlag bildet das ab.
 */
export function bodenwert(o) {
  if (!o.grundstueck || !o.bodenrichtwert) return 0;
  return o.grundstueck * o.bodenrichtwert * (1 - (o.bodenAbschlag || 0) / 100);
}

/** Gesamtnutzungsdauer für Wohngebäude nach Anlage 1 ImmoWertV. */
export const GESAMTNUTZUNGSDAUER = 80;

/**
 * Gebäudesachwert: Herstellungskosten minus Alterswertminderung.
 *
 * Die Restnutzungsdauer ist die entscheidende Stellschraube. Bei einem
 * Altbau ist sie nicht rechnerisch (Baujahr minus heute), sondern hängt am
 * Modernisierungsgrad — ein 1898er Haus mit neuem Dach, neuer Heizung und
 * neuen Bädern hat ein deutlich jüngeres fiktives Baujahr als eines ohne.
 */
export function gebaeudesachwert(o, wohnflaeche) {
  const rnd = Math.max(5, Math.min(o.restnutzungsdauer ?? 30, GESAMTNUTZUNGSDAUER));
  return wohnflaeche * (o.herstellungskosten ?? 1400) * (rnd / GESAMTNUTZUNGSDAUER);
}

/**
 * Gebäudeanteil an den Anschaffungskosten (Prozent).
 *
 * Sachwertverfahren in Anlehnung an die BMF-Arbeitshilfe: Boden- und
 * Gebäudesachwert werden getrennt ermittelt, ihr Verhältnis auf den
 * Kaufpreis angewendet. Das reine Restwertverfahren (Kaufpreis minus
 * Bodenwert) liefert bei großen Grundstücken absurd niedrige Werte und
 * würde die AfA künstlich kleinrechnen.
 */
export function gebaeudeanteil(o, wohnflaeche) {
  if (o.gebaeudeanteilManuell != null) return o.gebaeudeanteilManuell;
  const bw = bodenwert(o);
  if (!bw || !o.kaufpreis) return 80;
  const gw = gebaeudesachwert(o, wohnflaeche);
  if (gw + bw <= 0) return 80;
  return Math.max(10, Math.min(95, (gw / (gw + bw)) * 100));
}

/** Summe der Wohnflächen aller Einheiten. */
export const flaeche = (einheiten) =>
  einheiten.reduce((s, e) => s + (e.flaeche || 0), 0);

/** Aktuelle Jahresnettokaltmiete über alle Einheiten. */
export const jahresmiete = (einheiten) =>
  einheiten.reduce((s, e) => s + (e.miete || 0), 0) * 12;

/** Jahresmiete, wenn alle Einheiten ihre Zielmiete erreichen. */
export const zielJahresmiete = (einheiten) =>
  einheiten.reduce((s, e) => s + Math.max(e.miete || 0, e.zielmiete || 0), 0) * 12;

export function calculateProperty(input) {
  const o = input.objekt;
  const satz = nebenkostenSatz(input.nebenkosten);
  const nebenkosten = (o.kaufpreis * satz) / 100;
  const gesamtinvestition = o.kaufpreis + nebenkosten;

  const wf = flaeche(o.einheiten);
  const brutto = jahresmiete(o.einheiten);
  const ziel = zielJahresmiete(o.einheiten);

  const bewirtschaftung =
    input.bewirtschaftung.nkQm * wf * 12 +
    (brutto * input.bewirtschaftung.mietausfall) / 100;
  const reinertrag = brutto - bewirtschaftung;

  const bw = bodenwert(o);
  const anteil = gebaeudeanteil(o, wf);
  const gw = gebaeudesachwert(o, wf);

  return {
    nebenkostenSatz: satz,
    nebenkosten,
    gesamtinvestition,
    flaeche: wf,
    kaufpreisQm: wf > 0 ? o.kaufpreis / wf : NaN,
    mieteQm: wf > 0 ? brutto / 12 / wf : NaN,
    bruttomiete: brutto,
    zielmiete: ziel,
    bewirtschaftungskosten: bewirtschaftung,
    reinertrag,
    vervielfaeltiger: brutto > 0 ? gesamtinvestition / brutto : NaN,
    bruttorendite: gesamtinvestition > 0 ? (brutto / gesamtinvestition) * 100 : NaN,
    nettorendite: gesamtinvestition > 0 ? (reinertrag / gesamtinvestition) * 100 : NaN,
    bodenwert: bw,
    bodenanteil: o.kaufpreis > 0 ? (bw / o.kaufpreis) * 100 : NaN,
    gebaeudesachwert: gw,
    gebaeudeanteil: anteil,
    /** Anschaffungskosten des Gebäudes — Basis für AfA und die 15-%-Grenze. */
    gebaeudeAnschaffungskosten: (gesamtinvestition * anteil) / 100,
  };
}
