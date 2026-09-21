import React, { useState } from "react";
import { eur, kurz, pct } from "../format.js";
import { useBreite } from "./useBreite.js";

/* Farben und Linienarten stehen in styles.css (.s-objektwert usw.). */
const REIHEN = [
  { feld: "objektwert", klasse: "s-objektwert", name: "Objektwert" },
  { feld: "etfDepot", klasse: "s-etf", name: "Vergleichsdepot" },
  { feld: "restschuld", klasse: "s-restschuld", name: "Restschuld" },
  { feld: "eigenkapital", klasse: "s-eigenkapital", name: "Eigenkapital" },
];

/** Runde Achsenwerte: 0, 250 T€, 500 T€ … statt 0, 287 T€, 574 T€. */
function achse(lo, hi, anzahl = 4) {
  const roh = (hi - lo || 1) / anzahl;
  const mag = 10 ** Math.floor(Math.log10(roh));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= roh);
  const min = Math.floor(lo / schritt) * schritt;
  const max = Math.ceil(hi / schritt) * schritt;
  const ticks = [];
  for (let t = min; t <= max + schritt / 2; t += schritt) ticks.push(Math.round(t / schritt) * schritt);
  return { min, max, ticks };
}

/** Jahresmarken so wählen, dass sie sich nicht berühren. */
function jahresmarken(daten, breitePlot) {
  const abstand = breitePlot / Math.max(daten.length - 1, 1);
  const schritt = [1, 2, 5, 10].find((s) => abstand * s >= 58) ?? 10;
  return daten.map((j, i) => ({ jahr: j.jahr, i })).filter((m) => m.jahr % schritt === 0);
}

/**
 * Vermögensverlauf: Restschuld, Objektwert und Eigenkapital über die Zeit,
 * dazu das Vergleichsdepot. Alle Reihen teilen sich eine Achse, damit die
 * Größenverhältnisse ablesbar bleiben. Über dem Diagramm zeigt ein Fadenkreuz
 * die Werte eines Jahres.
 */
export function Verlauf({ jahre, bis, zinsbindung, verkaufsjahr }) {
  const [ref, W] = useBreite();
  const [aktiv, setAktiv] = useState(null);

  const daten = jahre.slice(0, bis);
  const n = daten.length;
  const H = W < 520 ? 240 : 300;
  const ML = 64, MR = 12, MT = 14, MB = 28;

  const alleWerte = daten.flatMap((j) => REIHEN.map((r) => j[r.feld]));
  const y = achse(Math.min(0, ...alleWerte), Math.max(...alleWerte));
  const px = (i) => ML + (i / (n - 1 || 1)) * (W - ML - MR);
  const py = (v) => MT + (1 - (v - y.min) / (y.max - y.min || 1)) * (H - MT - MB);

  const pfad = (feld) =>
    daten.map((j, i) => (i ? "L" : "M") + px(i).toFixed(1) + " " + py(j[feld]).toFixed(1)).join(" ");

  const marken = [];
  if (zinsbindung >= 1 && zinsbindung <= n)
    marken.push({ i: zinsbindung - 1, text: "Zinsbindung endet", klasse: "peil-zins" });
  if (verkaufsjahr >= 1 && verkaufsjahr <= n)
    marken.push({ i: verkaufsjahr - 1, text: "Verkauf", klasse: "peil-verkauf" });

  const zeigen = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - box.left) / box.width) * (n - 1));
    setAktiv(Math.min(Math.max(i, 0), n - 1));
  };

  const letztes = daten[n - 1];
  const beschreibung =
    `Vermögensverlauf über ${n} Jahre. Nach Jahr ${n}: ` +
    REIHEN.map((r) => `${r.name} ${eur(letztes[r.feld])}`).join(", ") +
    ". Alle Jahreswerte stehen in der Jahrestabelle.";

  const j = aktiv !== null ? daten[aktiv] : null;
  const TW = 200, TH = 24 + REIHEN.length * 16;
  const tx = j ? Math.min(Math.max(px(aktiv) > W / 2 ? px(aktiv) - TW - 10 : px(aktiv) + 10, 4), W - TW - 4) : 0;

  return (
    <div className="chart" ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={beschreibung}>
        {y.ticks.map((t) => (
          <g key={t}>
            <line x1={ML} y1={py(t)} x2={W - MR} y2={py(t)} className={t === 0 ? "achse" : "raster"} />
            <text x={ML - 8} y={py(t) + 4} textAnchor="end" className="achstext">{kurz(t)}</text>
          </g>
        ))}

        {jahresmarken(daten, W - ML - MR).map((m) => (
          <text key={m.jahr} x={px(m.i)} y={H - 8} textAnchor="middle" className="achstext">
            Jahr {m.jahr}
          </text>
        ))}

        {marken.map((m, k) => (
          <g key={m.klasse}>
            <line x1={px(m.i)} y1={MT} x2={px(m.i)} y2={py(y.min)} className={`peillinie ${m.klasse}`} />
            <text
              x={px(m.i) + (px(m.i) > W - 130 ? -5 : 5)}
              y={MT + 11 + k * 14}
              textAnchor={px(m.i) > W - 130 ? "end" : "start"}
              className={`marke-text ${m.klasse}`}
            >
              {m.text}
            </text>
          </g>
        ))}

        {REIHEN.map((r) => (
          <path key={r.feld} d={pfad(r.feld)} className={`kurve ${r.klasse}`} />
        ))}

        {j && (
          <g pointerEvents="none">
            <line x1={px(aktiv)} y1={MT} x2={px(aktiv)} y2={py(y.min)} className="fadenkreuz" />
            {REIHEN.map((r) => (
              <circle key={r.feld} cx={px(aktiv)} cy={py(j[r.feld])} r={4} className={`punkt ${r.klasse}`} />
            ))}
            <rect x={tx} y={MT + 4} width={TW} height={TH} className="tip" />
            <text x={tx + 10} y={MT + 22} className="tip-kopf">Jahr {j.jahr}</text>
            {REIHEN.map((r, k) => (
              <g key={r.feld} className={r.klasse}>
                <rect x={tx + 10} y={MT + 32 + k * 16} width={8} height={8} className="tip-farbe" />
                <text x={tx + 24} y={MT + 40 + k * 16} className="tip-text">{r.name}</text>
                <text x={tx + TW - 10} y={MT + 40 + k * 16} textAnchor="end" className="tip-text">
                  {eur(j[r.feld])}
                </text>
              </g>
            ))}
          </g>
        )}

        <rect
          x={ML} y={MT} width={W - ML - MR} height={H - MT - MB}
          fill="transparent" style={{ touchAction: "pan-y" }}
          onPointerMove={zeigen} onPointerDown={zeigen}
          onPointerLeave={(e) => e.pointerType === "mouse" && setAktiv(null)}
        />
      </svg>
      <div className="legende">
        {REIHEN.map((r) => (
          <span key={r.feld} className={r.klasse}><i className="swatch" />{r.name}</span>
        ))}
        <span className="legende-hinweis">Über das Diagramm fahren oder tippen zeigt die Werte eines Jahres.</span>
      </div>
    </div>
  );
}

/** Cashflow je Jahr als Balken — zeigt, wann die Rechnung kippt. */
export function CashflowChart({ jahre, bis }) {
  const [ref, W] = useBreite();
  const [aktiv, setAktiv] = useState(null);

  const daten = jahre.slice(0, bis);
  const n = daten.length;
  const H = 200, ML = 64, MR = 12, MT = 12, MB = 28;
  const werte = daten.map((j) => j.cashflow);
  const y = achse(Math.min(...werte, 0), Math.max(...werte, 0), 3);

  const bw = (W - ML - MR) / n;
  const py = (v) => MT + (1 - (v - y.min) / (y.max - y.min || 1)) * (H - MT - MB);

  return (
    <div className="chart" ref={ref}>
      <svg
        width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Cashflow nach Steuern je Jahr, ${n} Jahre. Die Werte stehen in der Jahrestabelle.`}
        onPointerLeave={(e) => e.pointerType === "mouse" && setAktiv(null)}
      >
        {y.ticks.map((t) => (
          <g key={t}>
            <line x1={ML} y1={py(t)} x2={W - MR} y2={py(t)} className={t === 0 ? "achse" : "raster"} />
            <text x={ML - 8} y={py(t) + 4} textAnchor="end" className="achstext">{kurz(t)}</text>
          </g>
        ))}
        {daten.map((j, i) => (
          <rect
            key={j.jahr}
            x={ML + i * bw + 1}
            y={Math.min(py(j.cashflow), py(0))}
            width={Math.max(1, bw - 2)}
            height={Math.max(1, Math.abs(py(j.cashflow) - py(0)))}
            className={`balken ${j.cashflow >= 0 ? "plus" : "minus"} ${aktiv === i ? "aktiv" : ""}`}
            onPointerEnter={() => setAktiv(i)}
            onPointerDown={() => setAktiv(i)}
          >
            <title>{`Jahr ${j.jahr}: ${eur(j.cashflow)}`}</title>
          </rect>
        ))}
        {jahresmarken(daten, W - ML - MR).map((m) => (
          <text key={m.jahr} x={ML + m.i * bw + bw / 2} y={H - 8} textAnchor="middle" className="achstext">
            Jahr {m.jahr}
          </text>
        ))}
      </svg>
      <div className="legende">
        <span className="ablesung">
          {aktiv !== null
            ? `Jahr ${daten[aktiv].jahr}: ${eur(daten[aktiv].cashflow)} nach Steuern`
            : "Jahrescashflow nach Steuern. Sanierungsjahre erscheinen als Ausschlag nach unten. Balken antippen zeigt den Wert."}
        </span>
      </div>
    </div>
  );
}

/** Farbstärke nach Betrag; die Farben selbst kommen aus den CSS-Variablen. */
function farbe(wert, spanne) {
  const t = Math.max(-1, Math.min(1, wert / spanne));
  const stark = Math.round((0.08 + Math.abs(t) * 0.42) * 100);
  return `color-mix(in srgb, var(${t >= 0 ? "--gut" : "--kataster"}) ${stark}%, transparent)`;
}

const zinsText = (z) => pct(z, Math.round(z * 10) === z * 10 ? 1 : 2);

const mietText = (faktor) =>
  faktor === 1 ? "aktuell" : `${faktor > 1 ? "+" : "−"}${pct(Math.abs(faktor - 1) * 100, 1)}`;

/**
 * Cashflow im ersten Jahr über Miete und Zins.
 * `spalten`: [{ zins, aktuell }], `mietFaktoren`: relativ zur heutigen Gesamtmiete.
 */
export function Heatmap({ werte, spalten, mietFaktoren, basisMiete }) {
  const spanne = Math.max(...werte.flat().map(Math.abs), 1);

  return (
    <div className="huelle">
      <table className="heat">
        <caption className="nur-sr">
          Monatlicher Cashflow nach Steuern im ersten Jahr, je Gesamtmiete und Sollzins
        </caption>
        <thead>
          <tr>
            <th rowSpan={2} scope="col" className="ecke">Miete pro Monat</th>
            <th colSpan={spalten.length} scope="colgroup">Sollzins</th>
          </tr>
          <tr>
            {spalten.map((s) => (
              <th key={s.zins} scope="col" className={s.aktuell ? "aktuell" : ""}>{zinsText(s.zins)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mietFaktoren.map((mf, r) => (
            <tr key={mf}>
              <th scope="row" className="achse-zelle">
                {eur(basisMiete * mf)}
                <em className="sub">{mietText(mf)}</em>
              </th>
              {spalten.map((s, c) => (
                <td
                  key={s.zins}
                  className={mf === 1 && s.aktuell ? "aktuell" : ""}
                  style={{ background: farbe(werte[r][c], spanne) }}
                >
                  {eur(werte[r][c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="notiz">
        Monatlicher Cashflow nach Steuern im ersten Jahr. Zeilen sind die Gesamtmiete, Spalten der
        Sollzins; die umrandete Zelle ist deine aktuelle Eingabe. Rot heißt: Du musst zuzahlen.
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
          <h3>{e.name}</h3>
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
            <span>Vermögen Jahr {e.r.kennzahlen.horizont}</span>
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
