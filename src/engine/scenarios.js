/**
 * Unsicherheit sichtbar machen.
 *
 * Ein einzelner Cashflow-Wert suggeriert eine Genauigkeit, die keine
 * Immobilienrechnung hat. Drei Annahmensätze nebeneinander zeigen die
 * Bandbreite — und meistens ist die Bandbreite die eigentliche Information.
 */

export const SZENARIEN = {
  gut: {
    name: "Gut",
    zins: -0.3,
    mietsteigerung: +0.8,
    wertsteigerung: +1.0,
    mietausfall: -1,
    nkQm: -0.2,
  },
  basis: { name: "Basis", zins: 0, mietsteigerung: 0, wertsteigerung: 0, mietausfall: 0, nkQm: 0 },
  schlecht: {
    name: "Schlecht",
    zins: +0.5,
    mietsteigerung: -0.8,
    wertsteigerung: -1.5,
    mietausfall: +3,
    nkQm: +0.4,
  },
};

/** Eingaben eines Szenarios auf den Basisfall anwenden. */
export function anwenden(input, s) {
  return {
    ...input,
    finanzierung: {
      ...input.finanzierung,
      zins: Math.max(0.1, input.finanzierung.zins + s.zins),
      anschlussZins: Math.max(0.1, input.finanzierung.anschlussZins + s.zins),
    },
    bewirtschaftung: {
      ...input.bewirtschaftung,
      mietausfall: Math.max(0, input.bewirtschaftung.mietausfall + s.mietausfall),
      nkQm: Math.max(0, input.bewirtschaftung.nkQm + s.nkQm),
    },
    annahmen: {
      ...input.annahmen,
      mietsteigerung: Math.max(0, input.annahmen.mietsteigerung + s.mietsteigerung),
      wertsteigerung: input.annahmen.wertsteigerung + s.wertsteigerung,
    },
  };
}

/**
 * Heatmap: Cashflow nach Steuern im ersten Jahr über Miete und Zins.
 * Die Mietachse ist relativ, damit sie unabhängig von der Einheitenzahl bleibt.
 */
export function heatmap(input, rechne, mietFaktoren, zinsSaetze) {
  return mietFaktoren.map((mf) =>
    zinsSaetze.map((z) => {
      const variante = {
        ...input,
        objekt: {
          ...input.objekt,
          einheiten: input.objekt.einheiten.map((e) => ({
            ...e,
            miete: e.miete * mf,
            zielmiete: (e.zielmiete || 0) * mf,
          })),
        },
        finanzierung: { ...input.finanzierung, zins: z, anschlussZins: z + 0.5 },
      };
      return rechne(variante).simulation.jahre[0].cashflow / 12;
    })
  );
}
