import React from "react";
import { Regler } from "../components/Eingaben.jsx";
import { Verlauf, CashflowChart } from "../components/Grafik.jsx";
import { eur, pct } from "../format.js";

export function VerlaufTab({ v, set, r }) {
  const k = r.kennzahlen;
  const jahre = r.simulation.jahre;
  const horizont = v.annahmen.verkaufsjahr || 25;
  const verkauf = k.verkauf;
  const verkaufsjahr = verkauf ? jahre[verkauf.verkaufsjahr - 1] : null;

  return (
    <div className="spalten">
      <aside className="seitenleiste" aria-label="Zukünftige Entwicklung">
        <section className="karte">
          <h2>Zukünftige Entwicklung</h2>
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

        {verkauf && (
          <section className="karte">
            <h2>Verkauf im Jahr {verkauf.verkaufsjahr}</h2>
            <div className="zeile"><span>Objektwert</span><span>{eur(verkaufsjahr.objektwert)}</span></div>
            <div className="zeile"><span>− Verkaufskosten</span><span>{eur(verkaufsjahr.objektwert - verkauf.erloes)}</span></div>
            <div className="zeile"><span>Veräußerungsgewinn</span><span>{eur(verkauf.gewinn)}</span></div>
            <div className="zeile">
              <span>
                Steuer nach § 23 EStG
                <em className="sub"> {verkauf.steuerpflichtig ? "(innerhalb 10 Jahren)" : "(steuerfrei)"}</em>
              </span>
              <span className={verkauf.steuerpflichtig ? "schlecht" : "gut"}>{eur(verkauf.steuer)}</span>
            </div>
            <div className="zeile"><span>− Restschuld</span><span>{eur(verkauf.restschuld)}</span></div>
            <div className="zeile summe"><span>Netto-Zufluss</span><span>{eur(verkauf.nettoZufluss)}</span></div>
            <p className="notiz">
              Die bereits abgesetzte AfA von {eur(verkaufsjahr.afaKumuliert)} wird bei
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
      </aside>

      <div>
        <section className="karte">
          <h2>Vermögensverlauf</h2>
          <Verlauf
            jahre={jahre}
            bis={Math.max(horizont, v.finanzierung.zinsbindung + 5)}
            zinsbindung={r.finanzierung.wechseljahr}
            verkaufsjahr={v.annahmen.verkaufsjahr}
          />
        </section>

        <section className="karte">
          <h2>Cashflow je Jahr</h2>
          <CashflowChart jahre={jahre} bis={Math.max(horizont, 20)} />
        </section>

        <section className="karte">
          <h2>Jahrestabelle</h2>
          <div className="huelle scrollbereich" tabIndex={0} role="region" aria-label="Jahrestabelle, scrollbar">
            <table className="tabelle">
              <thead>
                <tr>
                  {["Jahr", "Miete", "Reinertrag", "Zins", "Tilgung", "AfA", "Steuer", "Cashflow", "Restschuld", "Objektwert"].map(
                    (h) => <th key={h} scope="col">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {jahre.map((j) => (
                  <tr key={j.jahr} className={j.jahr === v.annahmen.verkaufsjahr ? "markiert" : ""}>
                    <th scope="row">{j.jahr}</th>
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
          {v.annahmen.verkaufsjahr ? (
            <p className="notiz">Die hervorgehobene Zeile ist das Verkaufsjahr.</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
