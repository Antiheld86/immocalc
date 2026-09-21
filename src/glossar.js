/* Fachbegriffe, die in den Kennzahlen auftauchen. Einmal definiert, an zwei Stellen genutzt:
   als Tooltip (<abbr>) und als aufklappbare Liste, die auch auf Touchgeräten funktioniert. */

export const GLOSSAR = {
  vervielfaeltiger: {
    name: "Vervielfältiger",
    text: "Gesamtinvestition geteilt durch die Jahresmiete: wie viele Jahresmieten das Objekt kostet.",
  },
  nettorendite: {
    name: "Nettorendite",
    text: "Reinertrag (Miete abzüglich nicht umlagefähiger Kosten und Mietausfall) geteilt durch die Gesamtinvestition, vor Finanzierung und Steuern.",
  },
  cashflow: {
    name: "Cashflow n. Steuern",
    text: "Monatlicher Überschuss im ersten Jahr nach Zins, Tilgung, Sanierung und Steuer. Negativ heißt: Du zahlst monatlich zu.",
  },
  ekRendite: {
    name: "EK-Rendite n. St.",
    text: "Reinertrag minus Zinsen minus Steuer im ersten Jahr, geteilt durch das eingesetzte Eigenkapital. Die Tilgung zählt nicht als Kosten, sie baut Vermögen auf.",
  },
  deckung: {
    name: "Kapitaldienstdeckung",
    text: "Reinertrag geteilt durch Zins plus Tilgung im ersten Jahr. Ab 1,0 deckt die Miete die Rate, darunter musst du zuzahlen.",
  },
  breakEven: {
    name: "Break-even-Miete",
    text: "Miete pro m² und Monat, bei der die Einnahmen im ersten Jahr Rate und Bewirtschaftung gerade decken.",
  },
  leerstand: {
    name: "Leerstand tragbar",
    text: "Monate pro Jahr ohne Miete, bevor der Reinertrag die Rate nicht mehr deckt.",
  },
  laufzeit: {
    name: "Laufzeit Darlehen",
    text: "Jahre bis zur vollständigen Tilgung. ∞ heißt: Das Darlehen wird im Modell nicht abbezahlt.",
  },
  beleihung: {
    name: "Beleihungsauslauf",
    text: "Darlehen im Verhältnis zum Kaufpreis. Über 80 % verlangen Banken meist einen Zinsaufschlag.",
  },
  afa: {
    name: "AfA",
    text: "Absetzung für Abnutzung: der jährliche steuerlich abziehbare Wertverbrauch des Gebäudes (ohne Grundstück).",
  },
  irr: {
    name: "Interner Zinsfuß",
    text: "Jährliche Verzinsung des eingesetzten Eigenkapitals über die ganze Haltedauer inklusive Verkauf. Hängt stark an der unterstellten Wertsteigerung.",
  },
};
