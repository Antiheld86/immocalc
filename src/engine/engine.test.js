import { describe, it, expect } from "vitest";
import { calculateInvestment, STANDARD, normalisiere } from "./index.js";
import { tilgungsplan } from "./financing.js";
import { gebaeudeanteil, bodenwert } from "./property.js";
import { veraeusserungsgewinn, afaSatzNachBaujahr, pruefe15Prozent } from "./taxes.js";
import { irr } from "./metrics.js";

const nah = (a, b, t = 1) => expect(Math.abs(a - b)).toBeLessThan(t);

describe("Kaufpreisaufteilung", () => {
  it("berechnet den Bodenwert mit Größenabschlag", () => {
    const o = { kaufpreis: 400000, grundstueck: 1000, bodenrichtwert: 300, bodenAbschlag: 20 };
    nah(bodenwert(o), 240000, 1);
  });

  it("teilt nach Sachwertverfahren, nicht nach Restwert", () => {
    const o = {
      kaufpreis: 400000, grundstueck: 1000, bodenrichtwert: 300, bodenAbschlag: 20,
      restnutzungsdauer: 30, herstellungskosten: 1400,
    };
    /* Reines Restwertverfahren ergäbe hier nur 40 %, das Sachwertverfahren
       gewichtet Boden und Gebäude nach ihren eigenen Werten. */
    const anteil = gebaeudeanteil(o, 300);
    nah(anteil, 39.6, 0.5);
  });

  it("hebt den Gebäudeanteil mit der Restnutzungsdauer", () => {
    const basis = { kaufpreis: 400000, grundstueck: 1000, bodenrichtwert: 300, bodenAbschlag: 20 };
    const jung = gebaeudeanteil({ ...basis, restnutzungsdauer: 50 }, 323);
    const alt = gebaeudeanteil({ ...basis, restnutzungsdauer: 20 }, 323);
    expect(jung).toBeGreaterThan(alt);
  });

  it("respektiert die manuelle Vorgabe", () => {
    expect(gebaeudeanteil({ kaufpreis: 400000, gebaeudeanteilManuell: 40 }, 323)).toBe(40);
  });

  it("fällt ohne Grundstücksdaten auf 80 % zurück", () => {
    expect(gebaeudeanteil({ kaufpreis: 400000 }, 323)).toBe(80);
  });
});

describe("Tilgungsplan", () => {
  const f = { zins: 4, tilgung: 2, zinsbindung: 20, anschlussZins: 4, sondertilgung: 0 };

  it("tilgt im ersten Jahr etwas mehr als den Nominalsatz", () => {
    /* Monatliche Verrechnung: die Tilgung wächst unterjährig mit. */
    const p = tilgungsplan(300000, f, 5);
    expect(p[0].tilgung).toBeGreaterThan(6000);
    expect(p[0].tilgung).toBeLessThan(6200);
  });

  it("erreicht bei 4 % und 2 % rund 27 Jahre Laufzeit", () => {
    const p = tilgungsplan(300000, f, 40);
    const fertig = p.findIndex((x) => x.restschuld <= 0) + 1;
    expect(fertig).toBeGreaterThanOrEqual(26);
    expect(fertig).toBeLessThanOrEqual(28);
  });

  it("verkürzt die Laufzeit durch Sondertilgung", () => {
    const ohne = tilgungsplan(300000, f, 40).findIndex((x) => x.restschuld <= 0);
    const mit = tilgungsplan(300000, { ...f, sondertilgung: 5000 }, 40).findIndex(
      (x) => x.restschuld <= 0
    );
    expect(mit).toBeLessThan(ohne);
  });

  it("wechselt nach § 489 spätestens im Jahr 11 auf den Anschlusszins", () => {
    const teuer = { ...f, zinsbindung: 20, anschlussZins: 8, kuendigung489: true };
    const p = tilgungsplan(300000, teuer, 12);
    expect(p[11].zins).toBeGreaterThan(p[8].zins);
  });
});

describe("Steuern", () => {
  it("leitet den AfA-Satz aus dem Baujahr ab", () => {
    expect(afaSatzNachBaujahr(1898)).toBe(2.5);
    expect(afaSatzNachBaujahr(1960)).toBe(2.0);
    expect(afaSatzNachBaujahr(2024)).toBe(3.0);
  });

  it("erkennt anschaffungsnahen Herstellungsaufwand", () => {
    const p = pruefe15Prozent([{ jahr: 2, betrag: 60000 }], 300000);
    expect(p.ueberschritten).toBe(true);
    const q = pruefe15Prozent([{ jahr: 2, betrag: 40000 }], 300000);
    expect(q.ueberschritten).toBe(false);
  });

  it("besteuert den Verkauf innerhalb von zehn Jahren inklusive AfA-Nachversteuerung", () => {
    const g = veraeusserungsgewinn(500000, 450000, 50000, 8, 42);
    expect(g.steuerpflichtig).toBe(true);
    nah(g.gewinn, 100000);
    nah(g.steuer, 42000);
  });

  it("lässt den Verkauf nach zehn Jahren steuerfrei", () => {
    const g = veraeusserungsgewinn(500000, 450000, 50000, 11, 42);
    expect(g.steuerpflichtig).toBe(false);
    expect(g.steuer).toBe(0);
  });
});

describe("Interner Zinsfuß", () => {
  it("findet 10 % bei bekannter Zahlungsreihe", () => {
    nah(irr([-1000, 100, 100, 100, 1100]), 10, 0.1);
  });
});

describe("Gesamtrechnung", () => {
  const r = calculateInvestment(STANDARD);

  it("rechnet die Investitionssumme korrekt", () => {
    nah(r.objekt.nebenkostenSatz, 12.07, 0.01);
    nah(r.objekt.gesamtinvestition, 403452, 1);
  });

  it("bildet die Einheiten einzeln ab", () => {
    nah(r.objekt.flaeche, 198);
    nah(r.objekt.bruttomiete, 17400, 1);
  });

  it("liefert 40 Jahre", () => {
    expect(r.simulation.jahre).toHaveLength(40);
  });

  it("lässt die Steuerlast über die Zeit steigen", () => {
    const j = r.simulation.jahre;
    expect(j[19].steuer).toBeGreaterThan(j[0].steuer);
  });

  it("hebt die Mieten gegen die Zielmiete, ohne sie zu überschreiten", () => {
    const j = r.simulation.jahre;
    /* Wohnung 3 startet bei 400 € und soll auf 470 € steigen. */
    expect(j[0].mieten[2]).toBe(400);
    expect(j[5].mieten[2]).toBeGreaterThan(450);
    expect(j[5].mieten[2]).toBeLessThanOrEqual(470 * Math.pow(1.015, 5) + 1);
  });

  it("hält die Kappungsgrenze ein", () => {
    const j = r.simulation.jahre;
    const wachstum = j[3].mieten[2] / j[0].mieten[2];
    expect(wachstum).toBeLessThanOrEqual(1.2 * 1.001);
  });

  it("reagiert auf den Gebäudeanteil", () => {
    const hoch = calculateInvestment({
      ...STANDARD,
      objekt: { ...STANDARD.objekt, gebaeudeanteilManuell: 80 },
    });
    const niedrig = calculateInvestment({
      ...STANDARD,
      objekt: { ...STANDARD.objekt, gebaeudeanteilManuell: 40 },
    });
    expect(hoch.simulation.jahre[0].afa).toBeGreaterThan(niedrig.simulation.jahre[0].afa);
    expect(hoch.simulation.jahre[0].cashflow).toBeGreaterThan(niedrig.simulation.jahre[0].cashflow);
  });

  it("verschlechtert sich bei höherem Zins", () => {
    const teuer = calculateInvestment({
      ...STANDARD,
      finanzierung: { ...STANDARD.finanzierung, zins: 5 },
    });
    expect(teuer.kennzahlen.cashflowMonatNachSteuer).toBeLessThan(
      calculateInvestment(STANDARD).kennzahlen.cashflowMonatNachSteuer
    );
  });

  it("normalisiert unvollständige Eingaben", () => {
    const n = normalisiere({ objekt: { kaufpreis: 200000 } });
    expect(n.finanzierung.zins).toBe(STANDARD.finanzierung.zins);
    expect(n.steuern.effektiverSatz).toBeGreaterThan(0);
  });
});
