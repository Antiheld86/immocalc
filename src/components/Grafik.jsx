import React from "react";
import { eur, num, pct } from "./Eingaben.jsx";

const FARBEN = {
  restschuld: "#16283c",
  objektwert: "#5e7183",
  eigenkapital: "#b3341f",
  etf: "#2f6b4f",
};

/**
 * Vermögensverlauf: Restschuld, Objektwert und Eigenkapital über die Zeit,
 * dazu das Vergleichsdepot. Alle Reihen teilen sich eine Achse, damit die
 * Größenverhältnisse ablesbar bleiben.
 */
export function Verlauf({ jahre, bis, zinsbindung, verkaufsjahr }) {
  const daten = jahre.slice(0, bis);
  const W = 760, H = 300, ML = 56, MR = 12, MT = 14, MB = 26;

  const max = Math.max(...daten.flatMap((j) => [j.objektwert, j.restschuld, j.eigenkapital, j.etfDepot]));
  const px = (i) => ML + (i / (daten.length - 1 || 1)) * (W - ML - MR);
  const py = (v) => MT + (1 - v / max) * (H - MT - MB);

  const pfad = (feld) =>
    daten.map((j, i) => (i ? "L" : "M") + px(i).toFixed(1) + " " + py(j[feld]).toFixed(1)).join(" ");

  const gitter = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const zb = Math.min(zinsbindung, daten.length) - 1;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Vermögensverlauf">
        {gitter.map((v, k) => (
          <g key={k}>
            <line x1={ML} y1={py(v)} x2={W - MR} y2={py(v)} className={k ? "raster" : "achse"} />
            <text x={ML - 6} y={py(v) + 3} textAnchor="end" className="achstext">
              {Math.round(v / 1000)}k
            </text>
          </g>
        ))}

        {zb > 0 && zb < daten.length && (
          <>
            <line x1={px(zb)} y1={MT} x2={px(zb)} y2={py(0)} className="peillinie" />
            <text x={px(zb) + 5} y={MT + 9} className="achstext" fill={FARBEN.eigenkapital}>
              Zinsbindung
            </text>
          </>
        )}
        {verkaufsjahr && verkaufsjahr <= daten.length && (
          <line x1={px(verkaufsjahr - 1)} y1={MT} x2={px(verkaufsjahr - 1)} y2={py(0)} className="peillinie" />
        )}

        <path d={pfad("objektwert")} className="kurve" stroke={FARBEN.objektwert} />
        <path d={pfad("etfDepot")} className="kurve" stroke={FARBEN.etf} strokeDasharray="5 4" />
        <path d={pfad("restschuld")} className="kurve" stroke={FARBEN.restschuld} />
        <path d={pfad("eigenkapital")} className="kurve" stroke={FARBEN.eigenkapital} />

        {[0, Math.floor(daten.length / 2), daten.length - 1].map((i) => (
          <text key={i} x={px(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === daten.length - 1 ? "end" : "middle"} className="achstext">
            Jahr {i + 1}
          </text>
        ))}
      </svg>
      <div className="legende">
        <span><i style={{ background: FARBEN.objektwert }} />Objektwert</span>
        <span><i style={{ background: FARBEN.restschuld }} />Restschuld</span>
        <span><i style={{ background: FARBEN.eigenkapital }} />Eigenkapital</span>
        <span><i style={{ background: FARBEN.etf, height: 0, borderTop: `2px dashed ${FARBEN.etf}` }} />Vergleichsdepot</span>
      </div>
    </div>
  );
}

/** Cashflow und Steuer je Jahr als Balken — zeigt, wann die Rechnung kippt. */
export function CashflowChart({ jahre, bis }) {
  const daten = jahre.slice(0, bis);
  const W = 760, H = 200, ML = 56, MR = 12, MT = 12, MB = 24;
  const werte = daten.map((j) => j.cashflow);
  const max = Math.max(...werte, 0);
  const min = Math.min(...werte, 0);
  const spanne = max - min || 1;

  const bw = (W - ML - MR) / daten.length;
  const py = (v) => MT + (1 - (v - min) / spanne) * (H - MT - MB);

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cashflow je Jahr">
        <line x1={ML} y1={py(0)} x2={W - MR} y2={py(0)} className="achse" />
        <text x={ML - 6} y={py(max) + 3} textAnchor="end" className="achstext">{Math.round(max / 1000)}k</text>
        <text x={ML - 6} y={py(min) + 3} textAnchor="end" className="achstext">{Math.round(min / 1000)}k</text>
        {daten.map((j, i) => {
          const oben = Math.min(py(j.cashflow), py(0));
          const hoehe = Math.abs(py(j.cashflow) - py(0));
          return (
            <rect
              key={i}
              x={ML + i * bw + 1}
              y={oben}
              width={Math.max(1, bw - 2)}
              height={Math.max(1, hoehe)}
              fill={j.cashflow >= 0 ? "#2f6b4f" : "#b3341f"}
              opacity={0.85}
            >
              <title>{`Jahr ${j.jahr}: ${eur(j.cashflow)}`}</title>
            </rect>
          );
        })}
        <text x={ML} y={H - 6} className="achstext">Jahr 1</text>
        <text x={W - MR} y={H - 6} textAnchor="end" className="achstext">Jahr {daten.length}</text>
      </svg>
      <div className="legende">
        <span>Jahrescashflow nach Steuern. Sanierungsjahre erscheinen als Ausschlag nach unten.</span>
      </div>
    </div>
  );
}

/** Farbskala von Kataster-Rot über Papier nach Grün. */
function farbe(wert, spanne) {
  const t = Math.max(-1, Math.min(1, wert / spanne));
  if (t >= 0) {
    const a = 0.08 + t * 0.42;
    return `rgba(47, 107, 79, ${a})`;
  }
  const a = 0.08 + -t * 0.42;
  return `rgba(179, 52, 31, ${a})`;
}

export function Heatmap({ werte, mietFaktoren, zinsSaetze, basisMiete }) {
  const alle = werte.flat();
  const spanne = Math.max(...alle.map(Math.abs), 1);

  return (
    <div className="huelle">
      <table className="heat">
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Miete \ Zins</th>
            {zinsSaetze.map((z) => (
              <th key={z}>{num(z, 1)} %</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mietFaktoren.map((mf, r) => (
            <tr key={mf}>
              <td className="achse-zelle">{eur(basisMiete * mf)}</td>
              {zinsSaetze.map((z, c) => (
                <td key={z} style={{ background: farbe(werte[r][c], spanne) }}>
                  {eur(werte[r][c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="notiz">
        Monatlicher Cashflow nach Steuern im ersten Jahr. Zeilen sind die Gesamtmiete, Spalten der
        Sollzins. Die Nulllinie ist die Grenze, an der du zuzahlen musst.
      </p>
    </div>
  );
}

/** Drei Annahmensätze nebeneinander statt einer Punktschätzung. */
export function Band({ ergebnisse }) {
  return (
    <div className="band">
      {ergebnisse.map((e) => (
        <div className={`band-spalte ${e.name === "Basis" ? "basis" : ""}`} key={e.name}>
          <h4>{e.name}</h4>
          <div className="zeile">
            <span>Cashflow</span>
            <span className={e.r.kennzahlen.cashflowMonatNachSteuer >= 0 ? "gut" : "schlecht"}>
              {eur(e.r.kennzahlen.cashflowMonatNachSteuer)}
            </span>
          </div>
          <div className="zeile">
            <span>Nettorendite</span>
            <span>{pct(e.r.objekt.nettorendite)}</span>
          </div>
          <div className="zeile">
            <span>Interner Zinsfuß</span>
            <span>{pct(e.r.kennzahlen.irr)}</span>
          </div>
          <div className="zeile">
            <span>Vermögen J{e.r.kennzahlen.horizont}</span>
            <span>{eur(e.r.kennzahlen.vermoegenImmobilie)}</span>
          </div>
          <div className="zeile">
            <span>Depot zum Vergleich</span>
            <span>{eur(e.r.kennzahlen.vermoegenEtf)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
