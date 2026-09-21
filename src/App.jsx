import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { calculateInvestment, STANDARD, normalisiere } from "./engine/index.js";
import { Hinweis } from "./components/Hinweis.jsx";
import { EingabeTab } from "./tabs/EingabeTab.jsx";
import { VerlaufTab } from "./tabs/VerlaufTab.jsx";
import { RisikoTab } from "./tabs/RisikoTab.jsx";
import { VergleichTab } from "./tabs/VergleichTab.jsx";
import { eur, pct, num } from "./format.js";

const SPEICHER = "immorechner:objekte";
const ENTWURF = "immorechner:entwurf";
const HINWEIS_DAUER = 10000;

const REITER = [
  ["eingabe", "Eingabe & Ergebnis"],
  ["verlauf", "Verlauf"],
  ["risiko", "Risiko"],
  ["vergleich", "Vergleich"],
];

/** Nur Objekte übernehmen, die sich auch berechnen lassen — sonst bliebe die Seite weiß. */
const rechenbar = (werte) => {
  try {
    calculateInvestment(normalisiere(werte));
    return true;
  } catch {
    return false;
  }
};

const istObjekt = (o) => o && typeof o.titel === "string" && o.werte && rechenbar(o.werte);

function ladeEntwurf() {
  try {
    const roh = localStorage.getItem(ENTWURF);
    if (!roh) return STANDARD;
    const werte = JSON.parse(roh);
    return rechenbar(werte) ? normalisiere(werte) : STANDARD;
  } catch {
    return STANDARD;
  }
}

export default function App() {
  const [v, setV] = useState(ladeEntwurf);
  const [objekte, setObjekte] = useState([]);
  const [reiter, setReiter] = useState("eingabe");
  const [hinweis, setHinweis] = useState(null);
  const dateiRef = useRef(null);

  const r = useMemo(() => calculateInvestment(v), [v]);
  const k = r.kennzahlen;

  useEffect(() => {
    try {
      setObjekte(JSON.parse(localStorage.getItem(SPEICHER) || "[]").filter(istObjekt));
    } catch {
      setObjekte([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ENTWURF, JSON.stringify(v));
    } catch { /* Speicher voll oder gesperrt — nicht kritisch */ }
  }, [v]);

  /* Meldungen mit „Rückgängig“ verschwinden nach einer Weile, Fehler bleiben. */
  useEffect(() => {
    if (!hinweis || hinweis.art === "fehler") return undefined;
    const timer = setTimeout(() => setHinweis(null), HINWEIS_DAUER);
    return () => clearTimeout(timer);
  }, [hinweis]);

  const melde = useCallback(
    (text, art = "info", zurueck) => setHinweis({ id: Date.now(), art, text, zurueck }),
    []
  );

  /* Setter für verschachtelte Felder: set("finanzierung", "zins")(4.3) */
  const set = useCallback(
    (bereich, feld) => (wert) =>
      setV((p) => ({ ...p, [bereich]: { ...p[bereich], [feld]: wert } })),
    []
  );

  const schreiben = useCallback((liste) => {
    setObjekte(liste);
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(liste));
    } catch { /* siehe oben */ }
  }, []);

  const zuruecksetzen = () => {
    const alt = v;
    setV(STANDARD);
    melde("Alle Eingaben auf die Beispielwerte zurückgesetzt.", "info", () => setV(alt));
  };

  const exportieren = () => {
    const blob = new Blob([JSON.stringify({ entwurf: v, objekte }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `immorechner-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importieren = (datei) => {
    const leser = new FileReader();
    leser.onerror = () => melde("Die Datei ließ sich nicht lesen.", "fehler");
    leser.onload = () => {
      try {
        const d = JSON.parse(leser.result);
        const hatEntwurf = d && typeof d.entwurf === "object" && d.entwurf !== null;
        const hatListe = d && Array.isArray(d.objekte);
        if (!hatEntwurf && !hatListe) throw new Error("kein Export dieser Anwendung");
        if (hatEntwurf && !rechenbar(d.entwurf)) throw new Error("Entwurf nicht berechenbar");

        const altV = v;
        const altObjekte = objekte;
        const neueObjekte = hatListe ? d.objekte.filter(istObjekt) : null;
        const verworfen = hatListe ? d.objekte.length - neueObjekte.length : 0;

        if (hatEntwurf) setV(normalisiere(d.entwurf));
        if (neueObjekte) schreiben(neueObjekte);
        melde(
          `Import erfolgreich${neueObjekte ? `: ${neueObjekte.length} gespeicherte Objekte` : ""}` +
            `${verworfen ? `, ${verworfen} unlesbare übersprungen` : ""}. Bisherige Daten wurden ersetzt.`,
          "info",
          () => {
            setV(altV);
            schreiben(altObjekte);
          }
        );
      } catch {
        melde("Die Datei ist kein gültiger Export dieses Rechners und wurde nicht importiert.", "fehler");
      }
    };
    leser.readAsText(datei);
  };

  const reiterTaste = (e) => {
    const i = REITER.findIndex(([id]) => id === reiter);
    const ziel = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: REITER.length - 1 }[e.key];
    if (ziel === undefined) return;
    e.preventDefault();
    const [id] = REITER[(ziel + REITER.length) % REITER.length];
    setReiter(id);
    document.getElementById(`reiter-${id}`)?.focus();
  };

  return (
    <div className="app">
      <div className="mitte">
        <header className="kopf">
          <div className="kopf-zeile">
            <div>
              <h1>Immobilienrechner</h1>
              <p>
                Einheitengenau, über 40 Jahre gerechnet, mit Kaufpreisaufteilung, Steuerwirkung
                und Vergleichsdepot. Deine Eingaben werden automatisch in diesem Browser gespeichert.
              </p>
            </div>
            <div className="knopfreihe">
              <button className="knopf leise" onClick={exportieren}>Exportieren</button>
              <button className="knopf leise" onClick={() => dateiRef.current?.click()}>Importieren</button>
              <input
                ref={dateiRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const datei = e.target.files[0];
                  e.target.value = ""; /* dieselbe Datei darf erneut gewählt werden */
                  if (datei) importieren(datei);
                }}
              />
              <button className="knopf leise gefahr" onClick={zuruecksetzen}>Zurücksetzen</button>
            </div>
          </div>
        </header>

        <nav className="reiter" role="tablist" aria-label="Bereiche" onKeyDown={reiterTaste}>
          {REITER.map(([id, label]) => (
            <button
              key={id}
              id={`reiter-${id}`}
              role="tab"
              aria-selected={reiter === id}
              aria-controls={reiter === id ? `bereich-${id}` : undefined}
              tabIndex={reiter === id ? 0 : -1}
              onClick={() => setReiter(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Auf schmalen Bildschirmen liegt das Ergebnis unter den Eingaben — diese Leiste
            hält die wichtigsten Zahlen beim Verändern im Blick. */}
        {(reiter === "eingabe" || reiter === "verlauf") && (
          <div className="kurzleiste" aria-hidden="true">
            <div>
              <span>Cashflow / Monat</span>
              <b className={k.cashflowMonatNachSteuer >= 0 ? "gut" : "schlecht"}>{eur(k.cashflowMonatNachSteuer)}</b>
            </div>
            <div>
              <span>EK-Rendite</span>
              <b className={k.ekRenditeNachSteuer >= 0 ? "gut" : "schlecht"}>{pct(k.ekRenditeNachSteuer, 1)}</b>
            </div>
            <div>
              <span>Deckung</span>
              <b className={k.deckungsgrad >= 1 ? "gut" : "schlecht"}>{num(k.deckungsgrad, 2)}</b>
            </div>
          </div>
        )}

        <div role="tabpanel" id={`bereich-${reiter}`} aria-labelledby={`reiter-${reiter}`}>
          {reiter === "eingabe" && <EingabeTab v={v} setV={setV} set={set} r={r} melde={melde} />}
          {reiter === "verlauf" && <VerlaufTab v={v} set={set} r={r} />}
          {reiter === "risiko" && <RisikoTab v={v} r={r} />}
          {reiter === "vergleich" && (
            <VergleichTab
              r={r} v={v} setV={setV} objekte={objekte} schreiben={schreiben} melde={melde}
            />
          )}
        </div>

        <p className="notiz haftung">
          Alle Berechnungen sind Modellrechnungen und ersetzen weder Steuerberatung noch
          Finanzierungsberatung. Steuerlich vereinfacht: konstanter Grenzsteuersatz, sofortige
          Verlustverrechnung, keine Kirchensteuer-Sonderfälle.
        </p>
      </div>

      <Hinweis hinweis={hinweis} onSchliessen={() => setHinweis(null)} />
    </div>
  );
}
