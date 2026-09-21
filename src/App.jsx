import React, { useState, useMemo, useEffect, useCallback } from "react";
import { calculateInvestment, STANDARD, normalisiere } from "./engine/index.js";
import { SZENARIEN, anwenden, heatmap } from "./engine/scenarios.js";
import {
  Regler, Schalter, Bemassung, Einheiten, Sanierungsliste, eur, pct, num,
} from "./components/Eingaben.jsx";
import { Verlauf, CashflowChart, Heatmap, Band } from "./components/Grafik.jsx";

const SPEICHER = "immorechner:objekte";
const ENTWURF = "immorechner:entwurf";

export default function App() {
  const [v, setV] = useState(() => {
    try {
      const roh = localStorage.getItem(ENTWURF);
      return roh ? normalisiere(JSON.parse(roh)) : STANDARD;
    } catch {
      return STANDARD;
    }
  });
  const [objekte, setObjekte] = useState([]);
  const [reiter, setReiter] = useState("eingabe");
  const [name, setName] = useState("");
  const [ausgabe, setAusgabe] = useState("");

  const r = useMemo(() => calculateInvestment(v), [v]);

  useEffect(() => {
    try {
      setObjekte(JSON.parse(localStorage.getItem(SPEICHER) || "[]"));
    } catch {
      setObjekte([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ENTWURF, JSON.stringify(v));
    } catch { /* Speicher voll oder gesperrt — nicht kritisch */ }
  }, [v]);

  /* Setter für verschachtelte Felder: set("finanzierung", "zins")(4.3) */
  const set = useCallback(
    (bereich, feld) => (wert) =>
      setV((p) => ({ ...p, [bereich]: { ...p[bereich], [feld]: wert } })),
    []
  );

  const schreiben = (liste) => {
    setObjekte(liste);
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(liste));
    } catch { /* siehe oben */ }
  };

  const sichern = () => {
    schreiben([
      ...objekte,
      { id: Date.now(), titel: name.trim() || `Objekt ${objekte.length + 1}`, werte: v },
    ]);
    setName("");
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
    leser.onload = () => {
      try {
        const d = JSON.parse(leser.result);
        if (d.entwurf) setV(normalisiere(d.entwurf));
        if (Array.isArray(d.objekte)) schreiben(d.objekte);
      } catch {
        setAusgabe("Die Datei ließ sich nicht lesen.");
      }
    };
    leser.readAsText(datei);
  };

  const szenarien = useMemo(
    () =>
      Object.values(SZENARIEN).map((s) => ({
        name: s.name,
        r: calculateInvestment(anwenden(v, s)),
      })),
    [v]
  );

  const mietFaktoren = [0.85, 0.925, 1, 1.075, 1.15];
  const zinsSaetze = useMemo(() => {
    const z = v.finanzierung.zins;
    return [z - 1, z - 0.5, z, z + 0.5, z + 1].map((x) => Math.max(0.2, Math.round(x * 10) / 10));
  }, [v.finanzierung.zins]);

  const heat = useMemo(
    () => heatmap(v, calculateInvestment, mietFaktoren, zinsSaetze),
    [v, zinsSaetze]
  );

  const j1 = r.simulation.jahre[0];
  const k = r.kennzahlen;
  const horizont = v.annahmen.verkaufsjahr || 25;

  return (
    <div className="app">
      <div className="mitte">
        <header className="kopf">
          <div className="kopf-zeile">
            <div>
              <h1>Immobilienrechner</h1>
              <p>
                Einheitengenau, über 40 Jahre gerechnet, mit Kaufpreisaufteilung, Steuerwirkung
                und Vergleichsdepot.
              </p>
            </div>
            <div className="knopfreihe">
              <button className="knopf leise" onClick={exportieren}>Exportieren</button>
              <label className="knopf leise" style={{ display: "inline-block" }}>
                Importieren
                <input
                  type="file"
                  accept="application/json"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files[0] && importieren(e.target.files[0])}
                />
              </label>
              <button className="knopf leise" onClick={() => setV(STANDARD)}>Zurücksetzen</button>
            </div>
          </div>
        </header>

        <nav className="reiter" role="tablist">
          {[
            ["eingabe", "Eingabe"],
            ["ergebnis", "Ergebnis"],
            ["verlauf", "Verlauf"],
            ["risiko", "Risiko"],
            ["vergleich", "Vergleich"],
          ].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={reiter === id}
              onClick={() => setReiter(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {ausgabe && <p className="notiz warnung">{ausgabe}</p>}

        {/* =============================================== Eingabe */}
        {reiter === "eingabe" && (
          <div className="spalten">
            <div>
              <section className="karte">
                <h2>Objekt</h2>
                <Regler label="Kaufpreis" value={v.objekt.kaufpreis} min={20000} max={1500000}
                  step={1000} unit="€" onChange={set("objekt", "kaufpreis")}
                  hint={`${eur(r.objekt.kaufpreisQm)} pro m² Wohnfläche`} />
                <Regler label="Baujahr" value={v.objekt.baujahr} min={1850} max={2030}
                  step={1} maxHart={2100} unit="" onChange={set("objekt", "baujahr")}
                  hint={`AfA daraus: ${num(v.steuern.afaSatz, 1)} % — vor 1925: 2,5 %, ab 2023: 3 %`} />
                <Regler label="Grundstück" value={v.objekt.grundstueck} min={0} max={3000}
                  step={10} unit="m²" onChange={set("objekt", "grundstueck")} />
                <Regler label="Bodenrichtwert" value={v.objekt.bodenrichtwert} min={0} max={1200}
                  step={1} unit="€" onChange={set("objekt", "bodenrichtwert")}
                  hint="Amtlich über BORIS NRW abfragbar, zonengenau statt Stadtteilschnitt." />
                <Regler label="Abschlag für Grundstücksgröße" value={v.objekt.bodenAbschlag} min={0} max={40}
                  step={1} maxHart={80} unit="%" onChange={set("objekt", "bodenAbschlag")}
                  hint="Der Richtwert gilt für 300–400 m². Größere Grundstücke erzielen je m² weniger." />
                <Regler label="Restnutzungsdauer" value={v.objekt.restnutzungsdauer} min={5} max={80}
                  step={1} maxHart={80} unit="J" onChange={set("objekt", "restnutzungsdauer")}
                  hint="Nicht rechnerisch aus dem Baujahr, sondern nach Modernisierungsgrad. Neues Dach, neue Heizung und neue Bäder verlängern sie deutlich." />
                <Regler label="Herstellungskosten" value={v.objekt.herstellungskosten} min={800} max={3500}
                  step={50} unit="€" onChange={set("objekt", "herstellungskosten")}
                  hint="Je m² Wohnfläche, für die Ermittlung des Gebäudesachwerts." />
                <Schalter
                  label="Gebäudeanteil manuell festlegen"
                  checked={v.objekt.gebaeudeanteilManuell != null}
                  onChange={(an) =>
                    set("objekt", "gebaeudeanteilManuell")(an ? Math.round(r.objekt.gebaeudeanteil) : null)
                  }
                  hint="Für den Wert aus Kaufvertrag, Gutachten oder BMF-Arbeitshilfe."
                />
                {v.objekt.gebaeudeanteilManuell != null && (
                  <Regler label="Gebäudeanteil" value={v.objekt.gebaeudeanteilManuell}
                    min={10} max={95} step={0.5} maxHart={100} unit="%"
                    onChange={set("objekt", "gebaeudeanteilManuell")} />
                )}
                <div className="zeile"><span>Bodenwert</span><span>{eur(r.objekt.bodenwert)}</span></div>
                <div className="zeile"><span>Gebäudesachwert</span><span>{eur(r.objekt.gebaeudesachwert)}</span></div>
                <div className="zeile summe">
                  <span>Gebäudeanteil <em className="sub">(AfA-Basis {eur(r.objekt.gebaeudeAnschaffungskosten)})</em></span>
                  <span>{pct(r.objekt.gebaeudeanteil, 1)}</span>
                </div>
                <p className="notiz">
                  Aufteilung nach Sachwertverfahren statt Pauschale: Boden- und Gebäudesachwert
                  werden getrennt ermittelt, ihr Verhältnis auf den Kaufpreis angewendet. Bei
                  großen Grundstücken ist das der größte Einzelhebel der ganzen Rechnung, weil er
                  die AfA und damit die Steuerlast bestimmt.
                </p>
              </section>

              <section className="karte">
                <h2>Kaufnebenkosten</h2>
                <Regler label="Grunderwerbsteuer" value={v.nebenkosten.grunderwerb} min={0} max={7}
                  step={0.1} maxHart={20} unit="%" onChange={set("nebenkosten", "grunderwerb")}
                  hint="NRW 6,5 % · Bayern 3,5 %" />
                <Regler label="Notar" value={v.nebenkosten.notar} min={0} max={3}
                  step={0.1} maxHart={10} unit="%" onChange={set("nebenkosten", "notar")} />
                <Regler label="Grundbuch" value={v.nebenkosten.grundbuch} min={0} max={2}
                  step={0.1} maxHart={10} unit="%" onChange={set("nebenkosten", "grundbuch")} />
                <Regler label="Makler" value={v.nebenkosten.makler} min={0} max={8}
                  step={0.01} maxHart={20} unit="%" onChange={set("nebenkosten", "makler")}
                  hint="Die hälftige Teilung nach § 656c BGB gilt nur für Einfamilienhäuser und Eigentumswohnungen." />
              </section>

              <section className="karte">
                <h2>Bewirtschaftung</h2>
                <Regler label="Nicht umlagefähige Kosten" value={v.bewirtschaftung.nkQm} min={0} max={4}
                  step={0.05} maxHart={20} unit="€" onChange={set("bewirtschaftung", "nkQm")}
                  hint={`Pro m² und Monat: Verwaltung, Rücklage, Kleinreparaturen. Ergibt ${eur(j1.bewirtschaftungskosten)} im ersten Jahr.`} />
                <Regler label="Mietausfallwagnis" value={v.bewirtschaftung.mietausfall} min={0} max={10}
                  step={0.5} maxHart={50} unit="%" onChange={set("bewirtschaftung", "mietausfall")} />
              </section>
            </div>

            <div>
              <section className="karte">
                <h2>Einheiten</h2>
                <Einheiten einheiten={v.objekt.einheiten} onChange={set("objekt", "einheiten")} />
                <div className="kennzahlen">
                  <div className="kz"><dt>Wohnfläche</dt><dd>{num(r.objekt.flaeche, 0)} <span className="klein">m²</span></dd></div>
                  <div className="kz"><dt>Miete heute</dt><dd>{num(r.objekt.mieteQm, 2)} <span className="klein">€/m²</span></dd></div>
                  <div className="kz"><dt>Jahresmiete</dt><dd style={{ fontSize: 16 }}>{eur(r.objekt.bruttomiete)}</dd></div>
                  <div className="kz"><dt>Bei Zielmiete</dt><dd style={{ fontSize: 16 }}>{eur(r.objekt.zielmiete)}</dd></div>
                </div>
              </section>

              <section className="karte">
                <h2>Finanzierung</h2>
                <Bemassung
                  anteil={r.finanzierung.ekAnteil}
                  boden={(r.objekt.nebenkosten / r.objekt.gesamtinvestition) * 100}
                  ek={r.finanzierung.eigenkapital}
                  fk={r.finanzierung.darlehen}
                  onChange={(p) => set("finanzierung", "eigenkapital")((r.objekt.gesamtinvestition * p) / 100)}
                />
                <div className="zeile">
                  <span>Eigenkapital <em className="sub">({pct(r.finanzierung.ekAnteil, 1)} der Gesamtinvestition)</em></span>
                  <span>{eur(r.finanzierung.eigenkapital)}</span>
                </div>
                <div className="zeile">
                  <span>davon für Nebenkosten</span>
                  <span>{eur(Math.min(r.finanzierung.eigenkapital, r.objekt.nebenkosten))}</span>
                </div>
                <div className="zeile">
                  <span>Beleihungsauslauf <em className="sub">(Darlehen zum Kaufpreis)</em></span>
                  <span className={r.finanzierung.beleihungsauslauf > 80 ? "schlecht" : ""}>
                    {pct(r.finanzierung.beleihungsauslauf, 1)}
                  </span>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Regler label="Sollzins" value={v.finanzierung.zins} min={0.5} max={8}
                    step={0.05} maxHart={30} unit="%" onChange={set("finanzierung", "zins")}
                    hint="Nominal, monatlich verrechnet. Der Effektivzins liegt leicht darüber." />
                  <Regler label="Anfängliche Tilgung" value={v.finanzierung.tilgung} min={0.5} max={10}
                    step={0.1} maxHart={100} unit="%" onChange={set("finanzierung", "tilgung")} />
                  <Regler label="Zinsbindung" value={v.finanzierung.zinsbindung} min={5} max={30}
                    step={1} maxHart={40} unit="J" onChange={set("finanzierung", "zinsbindung")} />
                  <Regler label="Anschlusszins" value={v.finanzierung.anschlussZins} min={0.5} max={10}
                    step={0.1} maxHart={30} unit="%" onChange={set("finanzierung", "anschlussZins")} />
                  <Regler label="Jährliche Sondertilgung" value={v.finanzierung.sondertilgung} min={0} max={30000}
                    step={500} unit="€" onChange={set("finanzierung", "sondertilgung")}
                    hint="Meist bis 5 % der Darlehenssumme ohne Aufschlag vereinbar." />
                  <Schalter
                    label="Nach § 489 BGB im Jahr 10 umschulden"
                    checked={v.finanzierung.kuendigung489}
                    onChange={set("finanzierung", "kuendigung489")}
                    hint="Jedes Darlehen ist zehn Jahre nach Vollauszahlung entschädigungsfrei kündbar. Eine lange Zinsbindung ist damit eine einseitige Option zu deinen Gunsten."
                  />
                </div>
              </section>

              <section className="karte">
                <h2>Steuern</h2>
                <Regler label="Grenzsteuersatz" value={v.steuern.steuersatz} min={0} max={45}
                  step={1} maxHart={100} unit="%" onChange={set("steuern", "steuersatz")} />
                <Schalter label="Solidaritätszuschlag" checked={v.steuern.soli} onChange={set("steuern", "soli")} />
                <Regler label="Kirchensteuer" value={v.steuern.kirchensteuer} min={0} max={9}
                  step={1} maxHart={20} unit="%" onChange={set("steuern", "kirchensteuer")} />
                <Schalter
                  label="AfA-Satz aus dem Baujahr ableiten"
                  checked={v.steuern.afaAutomatisch}
                  onChange={set("steuern", "afaAutomatisch")}
                />
                {!v.steuern.afaAutomatisch && (
                  <Regler label="AfA-Satz" value={v.steuern.afaSatz} min={0} max={5}
                    step={0.5} maxHart={20} unit="%" onChange={set("steuern", "afaSatz")} />
                )}
                <div className="zeile">
                  <span>Effektiver Satz</span><span>{pct(v.steuern.effektiverSatz ?? 0, 1)}</span>
                </div>
              </section>

              <section className="karte">
                <h2>Sanierungsplan</h2>
                <Sanierungsliste
                  posten={v.sanierung}
                  onChange={(s) => setV((p) => ({ ...p, sanierung: s }))}
                  pruefung={r.simulation.pruefung15}
                />
              </section>

              <section className="karte">
                <h2>Annahmen</h2>
                <Regler label="Mietsteigerung" value={v.annahmen.mietsteigerung} min={0} max={5}
                  step={0.1} maxHart={20} unit="%" onChange={set("annahmen", "mietsteigerung")} />
                <Regler label="Kostensteigerung" value={v.annahmen.kostensteigerung} min={0} max={6}
                  step={0.1} maxHart={20} unit="%" onChange={set("annahmen", "kostensteigerung")} />
                <Regler label="Wertsteigerung" value={v.annahmen.wertsteigerung} min={-2} max={5}
                  step={0.1} maxHart={20} unit="%" onChange={set("annahmen", "wertsteigerung")}
                  hint="Die sensibelste Annahme der ganzen Rechnung. Bei schlechter Energieklasse eher am unteren Rand." />
                <Regler label="Verkauf im Jahr" value={v.annahmen.verkaufsjahr} min={1} max={40}
                  step={1} maxHart={40} unit="J" onChange={set("annahmen", "verkaufsjahr")}
                  hint="Ab Jahr 11 ist der Gewinn nach § 23 EStG steuerfrei." />
                <Regler label="Verkaufskosten" value={v.annahmen.verkaufskosten} min={0} max={10}
                  step={0.5} maxHart={30} unit="%" onChange={set("annahmen", "verkaufskosten")} />
                <Regler label="Rendite Vergleichsdepot" value={v.annahmen.etfRendite} min={0} max={12}
                  step={0.1} maxHart={30} unit="%" onChange={set("annahmen", "etfRendite")}
                  hint="Vor Steuern. Die Abgeltungsteuer wird beim Vergleich abgezogen." />
              </section>
            </div>
          </div>
        )}

        {/* =============================================== Ergebnis */}
        {reiter === "ergebnis" && (
          <div className="spalten">
            <div>
              <section className="karte">
                <h2>Investition</h2>
                <div className="zeile"><span>Kaufpreis</span><span>{eur(v.objekt.kaufpreis)}</span></div>
                <div className="zeile">
                  <span>Nebenkosten <em className="sub">({num(r.objekt.nebenkostenSatz, 2)} %)</em></span>
                  <span>{eur(r.objekt.nebenkosten)}</span>
                </div>
                <div className="zeile summe"><span>Gesamtinvestition</span><span>{eur(r.objekt.gesamtinvestition)}</span></div>
                <div className="zeile"><span>davon Bodenwert</span><span>{eur(r.objekt.bodenwert)}</span></div>
                <div className="zeile"><span>Eigenkapital</span><span>{eur(r.finanzierung.eigenkapital)}</span></div>
                <div className="zeile"><span>Darlehen</span><span>{eur(r.finanzierung.darlehen)}</span></div>
              </section>

              <section className="karte">
                <h2>Erstes Jahr</h2>
                <div className="zeile"><span>Jahresmiete</span><span>{eur(j1.bruttomiete)}</span></div>
                <div className="zeile"><span>− Bewirtschaftung</span><span>{eur(j1.bewirtschaftungskosten)}</span></div>
                <div className="zeile summe"><span>Reinertrag</span><span>{eur(j1.reinertrag)}</span></div>
                <div className="zeile"><span>− Zinsen</span><span>{eur(j1.zins)}</span></div>
                <div className="zeile"><span>− Tilgung</span><span>{eur(j1.tilgung)}</span></div>
                <div className="zeile"><span>− AfA <em className="sub">(steuerlich)</em></span><span>{eur(j1.afa)}</span></div>
                <div className="zeile">
                  <span>Steuerliches Ergebnis</span>
                  <span className={j1.steuerergebnis <= 0 ? "gut" : ""}>{eur(j1.steuerergebnis)}</span>
                </div>
                <div className="zeile summe">
                  <span>{j1.steuer <= 0 ? "Steuererstattung" : "Steuerlast"}</span>
                  <span className={j1.steuer <= 0 ? "gut" : "schlecht"}>{eur(Math.abs(j1.steuer))}</span>
                </div>
              </section>
            </div>

            <div>
              <section className="karte">
                <h2>Kennzahlen</h2>
                <dl className="kennzahlen">
                  <div className="kz"><dt>Vervielfältiger</dt><dd>{num(r.objekt.vervielfaeltiger, 1)}</dd></div>
                  <div className="kz"><dt>Nettorendite</dt><dd>{pct(r.objekt.nettorendite)}</dd></div>
                  <div className="kz">
                    <dt>Cashflow n. Steuern</dt>
                    <dd className={k.cashflowMonatNachSteuer >= 0 ? "gut" : "schlecht"}>
                      {eur(k.cashflowMonatNachSteuer)}
                    </dd>
                  </div>
                  <div className="kz">
                    <dt>EK-Rendite n. St.</dt>
                    <dd className={k.ekRenditeNachSteuer >= 0 ? "gut" : "schlecht"}>{pct(k.ekRenditeNachSteuer)}</dd>
                  </div>
                  <div className="kz">
                    <dt>Kapitaldienstdeckung</dt>
                    <dd className={k.deckungsgrad >= 1 ? "gut" : "schlecht"}>{num(k.deckungsgrad, 2)}</dd>
                  </div>
                  <div className="kz"><dt>Break-even-Miete</dt><dd>{num(k.breakEvenMiete, 2)} <span className="klein">€/m²</span></dd></div>
                  <div className="kz"><dt>Leerstand tragbar</dt><dd>{num(k.leerstandMonate, 1)} <span className="klein">Mon/J</span></dd></div>
                  <div className="kz"><dt>Laufzeit Darlehen</dt><dd>{isFinite(r.finanzierung.laufzeit) ? `${r.finanzierung.laufzeit} J` : "∞"}</dd></div>
                </dl>
              </section>

              {k.verkauf && (
                <section className="karte">
                  <h2>Verkauf im Jahr {k.verkauf.verkaufsjahr}</h2>
                  <div className="zeile"><span>Objektwert</span><span>{eur(r.simulation.jahre[k.verkauf.verkaufsjahr - 1].objektwert)}</span></div>
                  <div className="zeile"><span>− Verkaufskosten</span><span>{eur(r.simulation.jahre[k.verkauf.verkaufsjahr - 1].objektwert - k.verkauf.erloes)}</span></div>
                  <div className="zeile"><span>Veräußerungsgewinn</span><span>{eur(k.verkauf.gewinn)}</span></div>
                  <div className="zeile">
                    <span>
                      Steuer nach § 23 EStG
                      <em className="sub"> {k.verkauf.steuerpflichtig ? "(innerhalb 10 Jahren)" : "(steuerfrei)"}</em>
                    </span>
                    <span className={k.verkauf.steuerpflichtig ? "schlecht" : "gut"}>{eur(k.verkauf.steuer)}</span>
                  </div>
                  <div className="zeile"><span>− Restschuld</span><span>{eur(k.verkauf.restschuld)}</span></div>
                  <div className="zeile summe"><span>Netto-Zufluss</span><span>{eur(k.verkauf.nettoZufluss)}</span></div>
                  <p className="notiz">
                    Die bereits abgesetzte AfA von {eur(r.simulation.jahre[k.verkauf.verkaufsjahr - 1].afaKumuliert)} wird bei
                    einem Verkauf innerhalb der Zehnjahresfrist nachversteuert — sie mindert den
                    Buchwert und erhöht damit den Gewinn.
                  </p>
                </section>
              )}

              <section className="karte">
                <h2>Immobilie gegen Vergleichsdepot</h2>
                <div className="zeile"><span>Vermögen Immobilie nach {k.horizont} Jahren</span><span>{eur(k.vermoegenImmobilie)}</span></div>
                <div className="zeile"><span>Vergleichsdepot nach Abgeltungsteuer</span><span>{eur(k.vermoegenEtf)}</span></div>
                <div className="zeile summe">
                  <span>Unterschied</span>
                  <span className={k.vermoegenImmobilie >= k.vermoegenEtf ? "gut" : "schlecht"}>
                    {eur(k.vermoegenImmobilie - k.vermoegenEtf)}
                  </span>
                </div>
                <div className="zeile"><span>Interner Zinsfuß der Immobilie</span><span>{pct(k.irr)}</span></div>
                <p className="notiz">
                  Das Depot startet mit demselben Eigenkapital und erhält jeden negativen Cashflow
                  als zusätzliche Einzahlung — beide Seiten binden also dasselbe Geld. Der interne
                  Zinsfuß hängt vollständig an der unterstellten Wertsteigerung von{" "}
                  {pct(v.annahmen.wertsteigerung, 1)}.
                </p>
              </section>
            </div>
          </div>
        )}

        {/* =============================================== Verlauf */}
        {reiter === "verlauf" && (
          <>
            <section className="karte">
              <h2>Vermögensverlauf</h2>
              <Verlauf
                jahre={r.simulation.jahre}
                bis={Math.max(horizont, v.finanzierung.zinsbindung + 5)}
                zinsbindung={r.finanzierung.wechseljahr}
                verkaufsjahr={v.annahmen.verkaufsjahr}
              />
            </section>

            <section className="karte">
              <h2>Cashflow je Jahr</h2>
              <CashflowChart jahre={r.simulation.jahre} bis={Math.max(horizont, 20)} />
            </section>

            <section className="karte">
              <h2>Jahrestabelle</h2>
              <div className="huelle scrollbereich">
                <table className="tabelle">
                  <thead>
                    <tr>
                      <th>Jahr</th><th>Miete</th><th>Reinertrag</th><th>Zins</th><th>Tilgung</th>
                      <th>AfA</th><th>Steuer</th><th>Cashflow</th><th>Restschuld</th><th>Objektwert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.simulation.jahre.slice(0, 40).map((j) => (
                      <tr key={j.jahr} className={j.jahr === v.annahmen.verkaufsjahr ? "markiert" : ""}>
                        <td style={{ textAlign: "left" }}>{j.jahr}</td>
                        <td>{eur(j.bruttomiete)}</td>
                        <td>{eur(j.reinertrag)}</td>
                        <td>{eur(j.zins)}</td>
                        <td>{eur(j.tilgung)}</td>
                        <td>{eur(j.afa)}</td>
                        <td className={j.steuer <= 0 ? "gut" : ""}>{eur(j.steuer)}</td>
                        <td className={j.cashflow >= 0 ? "gut" : "schlecht"}>{eur(j.cashflow)}</td>
                        <td>{eur(j.restschuld)}</td>
                        <td>{eur(j.objektwert)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* =============================================== Risiko */}
        {reiter === "risiko" && (
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
                mietFaktoren={mietFaktoren}
                zinsSaetze={zinsSaetze}
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
        )}

        {/* =============================================== Vergleich */}
        {reiter === "vergleich" && (
          <section className="karte">
            <h2>Objekte vergleichen</h2>
            <div className="knopfreihe" style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Bezeichnung, z. B. Musterstraße 12"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sichern()}
                style={{ flex: 1, minWidth: 200, border: "1px solid var(--linie)", padding: "7px 9px", fontFamily: "Inter" }}
              />
              <button className="knopf" onClick={sichern}>Sichern</button>
            </div>

            <div className="huelle">
              <table className="tabelle">
                <thead>
                  <tr>
                    <th>Objekt</th><th>Gesamt</th><th>EK</th><th>Rate</th><th>Netto</th>
                    <th>Cashflow</th><th>IRR</th><th>Vermögen</th><th />
                  </tr>
                </thead>
                <tbody>
                  {[{ id: "jetzt", titel: "Aktuelle Eingabe", res: r, jetzt: true },
                    ...objekte.map((o) => ({ id: o.id, titel: o.titel, res: calculateInvestment(o.werte), werte: o.werte }))
                  ].map((z) => (
                    <tr key={z.id} className={z.jetzt ? "jetzt" : ""}>
                      <td className="titel">{z.titel}</td>
                      <td>{eur(z.res.objekt.gesamtinvestition)}</td>
                      <td>{eur(z.res.finanzierung.eigenkapital)}</td>
                      <td>{eur(z.res.finanzierung.rate)}</td>
                      <td>{pct(z.res.objekt.nettorendite)}</td>
                      <td className={z.res.kennzahlen.cashflowMonatNachSteuer >= 0 ? "gut" : "schlecht"}>
                        {eur(z.res.kennzahlen.cashflowMonatNachSteuer)}
                      </td>
                      <td>{pct(z.res.kennzahlen.irr)}</td>
                      <td>{eur(z.res.kennzahlen.vermoegenImmobilie)}</td>
                      <td>
                        {!z.jetzt && (
                          <span className="knopfreihe" style={{ justifyContent: "flex-end" }}>
                            <button className="knopf leise" onClick={() => setV(normalisiere(z.werte))}>Laden</button>
                            <button className="knopf leise" onClick={() => schreiben(objekte.filter((o) => o.id !== z.id))}>Löschen</button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="notiz">
              Gespeichert wird im Browser. Für eine Sicherung über Geräte hinweg die
              Export-Funktion oben nutzen — die JSON-Datei enthält alle Objekte und lässt sich
              wieder einlesen.
            </p>
          </section>
        )}

        <p className="notiz" style={{ marginTop: 24, maxWidth: "72ch" }}>
          Alle Berechnungen sind Modellrechnungen und ersetzen weder Steuerberatung noch
          Finanzierungsberatung. Steuerlich vereinfacht: konstanter Grenzsteuersatz, sofortige
          Verlustverrechnung, keine Kirchensteuer-Sonderfälle.
        </p>
      </div>
    </div>
  );
}
