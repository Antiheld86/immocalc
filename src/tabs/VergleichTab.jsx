import React, { useMemo, useState } from "react";
import { calculateInvestment, normalisiere } from "../engine/index.js";
import { eur, pct } from "../format.js";

function Zeile({ titel, res, jetzt, aktionen }) {
  const k = res.kennzahlen;
  return (
    <tr className={jetzt ? "jetzt" : ""}>
      <th scope="row" className="titel">{titel}</th>
      <td>{eur(res.objekt.gesamtinvestition)}</td>
      <td>{eur(res.finanzierung.eigenkapital)}</td>
      <td>{eur(res.finanzierung.rate)}</td>
      <td>{pct(res.objekt.nettorendite)}</td>
      <td className={k.cashflowMonatNachSteuer >= 0 ? "gut" : "schlecht"}>{eur(k.cashflowMonatNachSteuer)}</td>
      <td>{pct(k.irr)}</td>
      <td>{eur(k.vermoegenImmobilie)}</td>
      <td>{aktionen}</td>
    </tr>
  );
}

export function VergleichTab({ r, v, setV, objekte, schreiben, melde }) {
  const [name, setName] = useState("");

  const zeilen = useMemo(
    () => objekte.map((o) => ({ ...o, res: calculateInvestment(o.werte) })),
    [objekte]
  );

  const sichern = () => {
    const titel = name.trim() || `Objekt ${objekte.length + 1}`;
    schreiben([...objekte, { id: Date.now(), titel, werte: v }]);
    melde(`„${titel}“ gespeichert.`);
    setName("");
  };

  const laden = (o) => {
    const alt = v;
    setV(normalisiere(o.werte));
    melde(`„${o.titel}“ geladen. Die bisherige Eingabe wurde ersetzt.`, "info", () => setV(alt));
  };

  const loeschen = (o) => {
    const alt = objekte;
    schreiben(objekte.filter((x) => x.id !== o.id));
    melde(`„${o.titel}“ gelöscht.`, "info", () => schreiben(alt));
  };

  return (
    <section className="karte">
      <h2>Objekte vergleichen</h2>
      <div className="knopfreihe knopfreihe-unten">
        <input
          type="text"
          className="textfeld"
          aria-label="Bezeichnung des Objekts"
          placeholder="Bezeichnung, z. B. Musterstraße 12"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sichern()}
        />
        <button className="knopf" onClick={sichern}>Aktuelle Eingabe speichern</button>
      </div>

      <div className="huelle" tabIndex={0} role="region" aria-label="Objektvergleich, scrollbar">
        <table className="tabelle">
          <thead>
            <tr>
              <th scope="col">Objekt</th>
              <th scope="col">Investition</th>
              <th scope="col">Eigenkapital</th>
              <th scope="col">Rate / Monat</th>
              <th scope="col">Nettorendite</th>
              <th scope="col">Cashflow / Monat</th>
              <th scope="col">Interner Zinsfuß</th>
              <th scope="col">Endvermögen</th>
              <th scope="col"><span className="nur-sr">Aktionen</span></th>
            </tr>
          </thead>
          <tbody>
            <Zeile titel="Aktuelle Eingabe" res={r} jetzt />
            {zeilen.map((o) => (
              <Zeile
                key={o.id}
                titel={o.titel}
                res={o.res}
                aktionen={
                  <span className="knopfreihe knopfreihe-rechts">
                    <button className="knopf leise" aria-label={`${o.titel} laden`} onClick={() => laden(o)}>
                      Laden
                    </button>
                    <button className="knopf leise gefahr" aria-label={`${o.titel} löschen`} onClick={() => loeschen(o)}>
                      Löschen
                    </button>
                  </span>
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {objekte.length === 0 && (
        <p className="leer">
          Noch nichts gespeichert. Gib oben eine Bezeichnung ein und speichere die aktuelle Eingabe, dann
          erscheint sie hier neben weiteren Objekten.
        </p>
      )}
      <p className="notiz">
        Endvermögen: Vermögen zum Ende des Betrachtungszeitraums (Verkaufsjahr, sonst Jahr 40).
        Gespeichert wird im Browser. Für eine Sicherung über Geräte hinweg die Export-Funktion oben
        nutzen — die JSON-Datei enthält alle Objekte und lässt sich wieder einlesen.
      </p>
    </section>
  );
}
