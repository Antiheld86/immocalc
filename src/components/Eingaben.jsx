import React, { useEffect, useState } from "react";

/* ---------------------------------------------------------- Formatierung */

export const eur = (n, d = 0) =>
  isFinite(n)
    ? n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d }) + " €"
    : "—";

export const pct = (n, d = 2) =>
  isFinite(n)
    ? n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d }) + " %"
    : "—";

export const num = (n, d = 2) =>
  isFinite(n)
    ? n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";

/* --------------------------------------------------------------- Regler */

/**
 * Zahlenfeld mit Schieber. Der Schieber ist ein bequemer Bereich, keine
 * Grenze: Getippte Werte darüber werden übernommen, die Spur wächst mit.
 */
export function Regler({ label, hint, value, min, max, maxHart, step, unit, onChange }) {
  const [text, setText] = useState(String(value));
  const grenze = maxHart ?? Infinity;

  useEffect(() => {
    setText((t) => (parseFloat(t.replace(",", ".")) === value ? t : String(value)));
  }, [value]);

  const tippen = (s) => {
    setText(s);
    const n = parseFloat(s.replace(",", "."));
    if (isFinite(n)) onChange(n);
  };

  const abschliessen = () => {
    const n = parseFloat(text.replace(",", "."));
    const fest = isFinite(n) ? Math.min(Math.max(n, min), grenze) : min;
    onChange(fest);
    setText(String(fest));
  };

  const spurMax = Math.max(max, Math.min(value, grenze));
  const id = `r-${label.replace(/\s+/g, "-")}`;

  return (
    <div className="regler">
      <div className="regler-kopf">
        <label htmlFor={id}>{label}</label>
        <div className="regler-wert">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={text}
            onChange={(e) => tippen(e.target.value)}
            onBlur={abschliessen}
            onKeyDown={(e) => e.key === "Enter" && abschliessen()}
          />
          <span className="einheit">{unit}</span>
        </div>
      </div>
      <input
        className="schieber"
        type="range"
        aria-label={label}
        value={Math.min(Math.max(value, min), spurMax)}
        min={min}
        max={spurMax}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function Schalter({ label, hint, checked, onChange }) {
  return (
    <div className="schalter">
      <label>
        <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="kaestchen" aria-hidden="true" />
        <span>{label}</span>
      </label>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

/** Kapitalaufteilung als Bemaßungslinie einer Bauzeichnung. */
export function Bemassung({ anteil, boden, ek, fk, onChange }) {
  const p = Math.min(Math.max(anteil, 0), 100);
  return (
    <div className="bemassung">
      <div className="bem-zeile">
        <span>Eigenkapital</span>
        <span>Fremdkapital</span>
      </div>
      <div className="bem-spur" style={{ "--p": `${p}%`, "--b": `${Math.min(boden, 100)}%` }}>
        <div className="bem-fuellung" />
        {boden > 0.5 && <div className="bem-boden" />}
        <div className="bem-marke" />
        <input
          type="range"
          className="bem-input"
          aria-label="Eigenkapitalanteil"
          min={0}
          max={100}
          step={0.1}
          value={p}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
      <div className="bem-zeile bem-zahlen">
        <span>{num(p, 1)} % · {eur(ek)}</span>
        <span>{num(100 - p, 1)} % · {eur(fk)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Einheiten */

export function Einheiten({ einheiten, onChange }) {
  const setze = (id, feld, wert) =>
    onChange(einheiten.map((e) => (e.id === id ? { ...e, [feld]: wert } : e)));

  const entfernen = (id) => onChange(einheiten.filter((e) => e.id !== id));

  const hinzufuegen = () =>
    onChange([
      ...einheiten,
      {
        id: `e${Date.now()}`,
        name: `Einheit ${einheiten.length + 1}`,
        flaeche: 70,
        miete: 550,
        zielmiete: 600,
      },
    ]);

  return (
    <div>
      {einheiten.map((e) => (
        <div className="einheit-zeile" key={e.id}>
          <div className="einheit-kopf">
            <input
              type="text"
              value={e.name}
              aria-label="Bezeichnung der Einheit"
              onChange={(ev) => setze(e.id, "name", ev.target.value)}
            />
            <button className="knopf leise" onClick={() => entfernen(e.id)}>
              Entfernen
            </button>
          </div>
          <div className="felder">
            <label className="feld">
              <span>Fläche m²</span>
              <input
                type="number"
                value={e.flaeche}
                onChange={(ev) => setze(e.id, "flaeche", parseFloat(ev.target.value) || 0)}
              />
            </label>
            <label className="feld">
              <span>Miete €</span>
              <input
                type="number"
                value={e.miete}
                onChange={(ev) => setze(e.id, "miete", parseFloat(ev.target.value) || 0)}
              />
            </label>
            <label className="feld">
              <span>Zielmiete €</span>
              <input
                type="number"
                value={e.zielmiete}
                onChange={(ev) => setze(e.id, "zielmiete", parseFloat(ev.target.value) || 0)}
              />
            </label>
          </div>
          <div className="einheit-fuss">
            <span>{num(e.flaeche > 0 ? e.miete / e.flaeche : 0, 2)} €/m² heute</span>
            <span>{num(e.flaeche > 0 ? e.zielmiete / e.flaeche : 0, 2)} €/m² Ziel</span>
          </div>
        </div>
      ))}
      <div className="knopfreihe" style={{ marginTop: 12 }}>
        <button className="knopf leise" onClick={hinzufuegen}>
          Einheit hinzufügen
        </button>
      </div>
      <p className="notiz">
        Die Zielmiete ist die ortsübliche Vergleichsmiete. Der Rechner hebt jede Einheit im Rahmen
        der Kappungsgrenze von 20 % in drei Jahren dorthin — schneller geht es in der Praxis nur
        bei Mieterwechsel.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ Sanierung */

export function Sanierungsliste({ posten, onChange, pruefung }) {
  const setze = (id, feld, wert) =>
    onChange(posten.map((p) => (p.id === id ? { ...p, [feld]: wert } : p)));

  return (
    <div>
      {posten.map((p) => (
        <div className="einheit-zeile" key={p.id}>
          <div className="einheit-kopf">
            <input
              type="text"
              value={p.bezeichnung}
              aria-label="Bezeichnung der Maßnahme"
              onChange={(ev) => setze(p.id, "bezeichnung", ev.target.value)}
            />
            <button className="knopf leise" onClick={() => onChange(posten.filter((x) => x.id !== p.id))}>
              Entfernen
            </button>
          </div>
          <div className="felder">
            <label className="feld">
              <span>Jahr</span>
              <input
                type="number"
                min={1}
                max={40}
                value={p.jahr}
                onChange={(ev) => setze(p.id, "jahr", parseInt(ev.target.value) || 1)}
              />
            </label>
            <label className="feld">
              <span>Betrag €</span>
              <input
                type="number"
                value={p.betrag}
                onChange={(ev) => setze(p.id, "betrag", parseFloat(ev.target.value) || 0)}
              />
            </label>
            <label className="feld">
              <span>Aktivieren</span>
              <input
                type="checkbox"
                checked={!!p.aktivieren}
                style={{ width: 16, height: 16, alignSelf: "center", marginTop: 6 }}
                onChange={(ev) => setze(p.id, "aktivieren", ev.target.checked)}
              />
            </label>
          </div>
        </div>
      ))}
      <div className="knopfreihe" style={{ marginTop: 12 }}>
        <button
          className="knopf leise"
          onClick={() =>
            onChange([
              ...posten,
              { id: `s${Date.now()}`, jahr: 5, betrag: 20000, bezeichnung: "Maßnahme", aktivieren: false },
            ])
          }
        >
          Maßnahme hinzufügen
        </button>
      </div>
      <p className={pruefung.ueberschritten ? "notiz warnung" : "notiz"}>
        15-%-Grenze (§ 6 Abs. 1 Nr. 1a EStG): {eur(pruefung.grenze)} in den ersten drei Jahren.
        Geplant sind dort {eur(pruefung.inDreiJahren)}.{" "}
        {pruefung.ueberschritten
          ? "Überschritten — die Kosten sind nicht sofort abziehbar, sondern erhöhen die AfA-Basis über 40 Jahre."
          : `Noch ${eur(pruefung.spielraum)} Spielraum für sofort abziehbaren Erhaltungsaufwand.`}
      </p>
    </div>
  );
}
