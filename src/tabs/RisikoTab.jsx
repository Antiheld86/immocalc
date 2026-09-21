import React, { useMemo } from "react";
import { calculateInvestment } from "../engine/index.js";
import { SZENARIEN, anwenden, heatmap } from "../engine/scenarios.js";
import { Heatmap, Band } from "../components/Grafik.jsx";
import { eur, num } from "../format.js";

/* Relativ zur heutigen Gesamtmiete, damit die Achse unabhängig von der Einheitenzahl bleibt. */
const MIET_FAKTOREN = [0.85, 0.925, 1, 1.075, 1.15];
const ZINS_SCHRITTE = [-1, -0.5, 0, 0.5, 1, 1.5, 2];

/**
 * Fünf Zinssätze um den aktuellen herum. Nahe der Untergrenze rückt das Fenster
 * nach oben, statt Werte zu wiederholen; der aktuelle Zins bleibt immer enthalten.
 */
function zinsachse(zins) {
  return ZINS_SCHRITTE
    .map((s) => ({ zins: s === 0 ? zins : Math.round((zins + s) * 100) / 100, aktuell: s === 0 }))
    .filter((p) => p.zins >= 0.2)
    .slice(0, 5);
}

export function RisikoTab({ v, r }) {
  const k = r.kennzahlen;

  const szenarien = useMemo(
    () => Object.values(SZENARIEN).map((s) => ({ name: s.name, r: calculateInvestment(anwenden(v, s)) })),
    [v]
  );

  const spalten = useMemo(() => zinsachse(v.finanzierung.zins), [v.finanzierung.zins]);

  const heat = useMemo(
    () => heatmap(v, calculateInvestment, MIET_FAKTOREN, spalten.map((s) => s.zins)),
    [v, spalten]
  );

  return (
    <>
      <section className="karte">
        <h2>Szenarioband</h2>
        <Band ergebnisse={szenarien} />
        <p className="notiz">
          Gut und Schlecht verschieben Zins, Mietsteigerung, Wertsteigerung, Mietausfall und
          Bewirtschaftungskosten gemeinsam. Nicht die mittlere Zahl ist die Information,
          sondern der Abstand zwischen den Spalten.
        </p>
      </section>

      <section className="karte">
        <h2>Miete gegen Zins</h2>
        <Heatmap
          werte={heat}
          spalten={spalten}
          mietFaktoren={MIET_FAKTOREN}
          basisMiete={r.objekt.bruttomiete / 12}
        />
      </section>

      <section className="karte">
        <h2>Belastungsgrenzen</h2>
        <div className="zeile">
          <span>Break-even-Miete</span>
          <span>{num(k.breakEvenMiete, 2)} €/m² <em className="sub">(heute {num(r.objekt.mieteQm, 2)})</em></span>
        </div>
        <div className="zeile">
          <span>Tragbarer Leerstand</span><span>{num(k.leerstandMonate, 1)} Monate pro Jahr</span>
        </div>
        <div className="zeile">
          <span>Restschuld bei Zinsbindungsende</span><span>{eur(r.finanzierung.restschuldBeiWechsel)}</span>
        </div>
        <div className="zeile">
          <span>Zinsänderung um +1 Punkt kostet</span>
          <span className="schlecht">
            {eur((r.finanzierung.darlehen * 0.01 * (1 - v.steuern.effektiverSatz / 100)) / 12)} pro Monat
          </span>
        </div>
      </section>
    </>
  );
}
