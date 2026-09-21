import React from "react";
import {
  Regler, Schalter, Bemassung, Einheiten, Sanierungsliste, Begriff, Glossar,
} from "../components/Eingaben.jsx";
import { eur, pct, num } from "../format.js";

const GLOSSAR_IDS = [
  "vervielfaeltiger", "nettorendite", "cashflow", "ekRendite", "deckung",
  "breakEven", "leerstand", "laufzeit", "beleihung", "afa",
];

/** Eingaben links, Ergebnis rechts — die Ergebnisspalte läuft beim Scrollen mit. */
export function EingabeTab({ v, setV, set, r, melde }) {
  const j1 = r.simulation.jahre[0];
  const k = r.kennzahlen;
  const o = r.objekt;
  const f = r.finanzierung;

  /* Beleihungsauslauf = Darlehen / Kaufpreis. Gespeichert wird das Eigenkapital, also
     wird beim Tippen das Eigenkapital so gesetzt, dass genau dieses Darlehen bleibt.
     Gerundet, damit das Feld nicht 80,00000000000001 statt 80 anzeigt. */
  const kaufpreis = v.objekt.kaufpreis;
  const beleihung = isFinite(f.beleihungsauslauf) ? Math.round(f.beleihungsauslauf * 100) / 100 : 0;
  const maxBeleihung = kaufpreis > 0 ? Math.floor((o.gesamtinvestition / kaufpreis) * 10000) / 100 : 100;
  const setzeBeleihung = (prozent) =>
    set("finanzierung", "eigenkapital")(Math.max(0, o.gesamtinvestition - (prozent / 100) * kaufpreis));

  /* Entfernen lässt sich zurücknehmen; Hinzufügen und Bearbeiten nicht nötig. */
  const einheitenAendern = (neu) => {
    const alt = v.objekt.einheiten;
    set("objekt", "einheiten")(neu);
    if (neu.length < alt.length)
      melde("Einheit entfernt.", "info", () => set("objekt", "einheiten")(alt));
  };

  const sanierungAendern = (neu) => {
    const alt = v.sanierung;
    setV((p) => ({ ...p, sanierung: neu }));
    if (neu.length < alt.length)
      melde("Maßnahme entfernt.", "info", () => setV((p) => ({ ...p, sanierung: alt })));
  };

  return (
    <div className="spalten-eingabe">
      <div className="eingaben">
        <div>
          <section className="karte">
            <h2>Objekt</h2>
            <Regler label="Kaufpreis" value={v.objekt.kaufpreis} min={20000} max={1500000}
              step={1000} unit="€" onChange={set("objekt", "kaufpreis")}
              hint={`${eur(o.kaufpreisQm)} pro m² Wohnfläche`} />
            <Regler label="Baujahr" value={v.objekt.baujahr} min={1850} max={2030}
              step={1} maxHart={2100} unit="" onChange={set("objekt", "baujahr")}
              hint={<>
                <Begriff id="afa" /> daraus: {num(v.steuern.afaSatz, 1)} % — vor 1925: 2,5 %, ab 2023: 3 %
              </>} />
            <Regler label="Grundstück" value={v.objekt.grundstueck} min={0} max={3000}
              step={10} unit="m²" onChange={set("objekt", "grundstueck")} />

            <details className="erweitert">
              <summary>Erweitert: Kaufpreisaufteilung Boden und Gebäude</summary>
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
                  set("objekt", "gebaeudeanteilManuell")(an ? Math.round(o.gebaeudeanteil) : null)
                }
                hint="Für den Wert aus Kaufvertrag, Gutachten oder BMF-Arbeitshilfe."
              />
              {v.objekt.gebaeudeanteilManuell != null && (
                <Regler label="Gebäudeanteil" value={v.objekt.gebaeudeanteilManuell}
                  min={10} max={95} step={0.5} maxHart={100} unit="%"
                  onChange={set("objekt", "gebaeudeanteilManuell")} />
              )}
            </details>

            <div className="zeile"><span>Bodenwert</span><span>{eur(o.bodenwert)}</span></div>
            <div className="zeile"><span>Gebäudesachwert</span><span>{eur(o.gebaeudesachwert)}</span></div>
            <div className="zeile summe">
              <span>Gebäudeanteil <em className="sub">(AfA-Basis {eur(o.gebaeudeAnschaffungskosten)})</em></span>
              <span>{pct(o.gebaeudeanteil, 1)}</span>
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
            <Einheiten einheiten={v.objekt.einheiten} onChange={einheitenAendern} />
            <dl className="kennzahlen kennzahlen-oben">
              <div className="kz"><dt>Wohnfläche</dt><dd>{num(o.flaeche, 0)} <span className="klein">m²</span></dd></div>
              <div className="kz"><dt>Miete heute</dt><dd>{num(o.mieteQm, 2)} <span className="klein">€/m²</span></dd></div>
              <div className="kz"><dt>Jahresmiete</dt><dd className="klein-zahl">{eur(o.bruttomiete)}</dd></div>
              <div className="kz"><dt>Bei Zielmiete</dt><dd className="klein-zahl">{eur(o.zielmiete)}</dd></div>
            </dl>
          </section>

          <section className="karte">
            <h2>Finanzierung</h2>
            <Bemassung
              anteil={f.ekAnteil}
              boden={(o.nebenkosten / o.gesamtinvestition) * 100}
              ek={f.eigenkapital}
              fk={f.darlehen}
              onChange={(p) => set("finanzierung", "eigenkapital")((o.gesamtinvestition * p) / 100)}
            />
            <div className="zeile">
              <span>Eigenkapital <em className="sub">({pct(f.ekAnteil, 1)} der Gesamtinvestition)</em></span>
              <span>{eur(f.eigenkapital)}</span>
            </div>
            <div className="zeile">
              <span>davon für Nebenkosten</span>
              <span>{eur(Math.min(f.eigenkapital, o.nebenkosten))}</span>
            </div>
            <div className="abstand-oben">
              <Regler label="Beleihungsauslauf" value={beleihung} min={0} max={100}
                step={0.5} maxHart={maxBeleihung} unit="%" onChange={setzeBeleihung}
                hint={`Darlehen ${eur(f.darlehen)} im Verhältnis zum Kaufpreis. Eine Änderung setzt das Eigenkapital entsprechend.`} />
              {f.beleihungsauslauf > 80 && (
                <p className="notiz warnung">Über 80 %: Banken verlangen meist einen Zinsaufschlag.</p>
              )}
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
            <Sanierungsliste posten={v.sanierung} onChange={sanierungAendern} pruefung={r.simulation.pruefung15} />
          </section>
        </div>
      </div>

      <aside className="seitenleiste" aria-label="Ergebnis">
        <section className="karte">
          <h2>Kennzahlen</h2>
          <dl className="kennzahlen">
            <div className="kz"><dt><Begriff id="vervielfaeltiger" /></dt><dd>{num(o.vervielfaeltiger, 1)}</dd></div>
            <div className="kz"><dt><Begriff id="nettorendite" /></dt><dd>{pct(o.nettorendite)}</dd></div>
            <div className="kz">
              <dt><Begriff id="cashflow" /></dt>
              <dd className={k.cashflowMonatNachSteuer >= 0 ? "gut" : "schlecht"}>
                {eur(k.cashflowMonatNachSteuer)}
              </dd>
            </div>
            <div className="kz">
              <dt><Begriff id="ekRendite" /></dt>
              <dd className={k.ekRenditeNachSteuer >= 0 ? "gut" : "schlecht"}>{pct(k.ekRenditeNachSteuer)}</dd>
            </div>
            <div className="kz">
              <dt><Begriff id="deckung" /></dt>
              <dd className={k.deckungsgrad >= 1 ? "gut" : "schlecht"}>
                {num(k.deckungsgrad, 2)}
                <span className="kz-hinweis">
                  {k.deckungsgrad >= 1 ? "Miete deckt die Rate" : "Miete deckt die Rate nicht"}
                </span>
              </dd>
            </div>
            <div className="kz"><dt><Begriff id="breakEven" /></dt><dd>{num(k.breakEvenMiete, 2)} <span className="klein">€/m²</span></dd></div>
            <div className="kz"><dt><Begriff id="leerstand" /></dt><dd>{num(k.leerstandMonate, 1)} <span className="klein">Mon/J</span></dd></div>
            <div className="kz"><dt><Begriff id="laufzeit" /></dt><dd>{isFinite(f.laufzeit) ? `${f.laufzeit} J` : "∞"}</dd></div>
          </dl>
          <Glossar ids={GLOSSAR_IDS} />
        </section>

        <section className="karte">
          <h2>Investition</h2>
          <div className="zeile"><span>Kaufpreis</span><span>{eur(v.objekt.kaufpreis)}</span></div>
          <div className="zeile">
            <span>Nebenkosten <em className="sub">({num(o.nebenkostenSatz, 2)} %)</em></span>
            <span>{eur(o.nebenkosten)}</span>
          </div>
          <div className="zeile summe"><span>Gesamtinvestition</span><span>{eur(o.gesamtinvestition)}</span></div>
          <div className="zeile"><span>davon Bodenwert</span><span>{eur(o.bodenwert)}</span></div>
          <div className="zeile"><span>Eigenkapital</span><span>{eur(f.eigenkapital)}</span></div>
          <div className="zeile"><span>Darlehen</span><span>{eur(f.darlehen)}</span></div>
        </section>

        <section className="karte">
          <h2>Erstes Jahr</h2>
          <div className="zeile"><span>Jahresmiete</span><span>{eur(j1.bruttomiete)}</span></div>
          <div className="zeile"><span>− Bewirtschaftung</span><span>{eur(j1.bewirtschaftungskosten)}</span></div>
          <div className="zeile summe"><span>Reinertrag</span><span>{eur(j1.reinertrag)}</span></div>
          <div className="zeile"><span>− Zinsen</span><span>{eur(j1.zins)}</span></div>
          <div className="zeile"><span>− Tilgung</span><span>{eur(j1.tilgung)}</span></div>
          <div className="zeile"><span>− <Begriff id="afa" /> <em className="sub">(steuerlich)</em></span><span>{eur(j1.afa)}</span></div>
          <div className="zeile">
            <span>Steuerliches Ergebnis</span>
            <span className={j1.steuerergebnis <= 0 ? "gut" : ""}>{eur(j1.steuerergebnis)}</span>
          </div>
          <div className="zeile summe">
            <span>{j1.steuer <= 0 ? "Steuererstattung" : "Steuerlast"}</span>
            <span className={j1.steuer <= 0 ? "gut" : "schlecht"}>{eur(Math.abs(j1.steuer))}</span>
          </div>
        </section>
      </aside>
    </div>
  );
}
