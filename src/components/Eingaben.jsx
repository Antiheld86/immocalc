import React, { useEffect, useId, useState } from "react";
import { eur, num } from "../format.js";
import { GLOSSAR } from "../glossar.js";

/* ---------------------------------------------------------- Zahlenfeld */

const lesen = (s, ganzzahl) => {
  const n = parseFloat(s.replace(",", "."));
  return isFinite(n) ? (ganzzahl ? Math.round(n) : n) : NaN;
};

/**
 * Textfeld für Zahlen (Komma oder Punkt). Beim Tippen zählen nur gültige Werte
 * im erlaubten Bereich; beim Verlassen wird ein zu großer oder kleiner Wert auf
 * die Grenze gesetzt, ein leeres oder ungültiges Feld springt auf den letzten
 * gültigen Wert zurück.
 */
export function Zahlenfeld({ value, onChange, min = -Infinity, max = Infinity, ganzzahl = false, ...rest }) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText((t) => (lesen(t, ganzzahl) === value ? t : String(value)));
  }, [value, ganzzahl]);

  const n = lesen(text, ganzzahl);
  const ausserhalb = text.trim() !== "" && (!isFinite(n) || n < min || n > max);

  const tippen = (s) => {
    setText(s);
    const neu = lesen(s, ganzzahl);
    if (isFinite(neu) && neu >= min && neu <= max) onChange(neu);
  };

  const abschliessen = () => {
    const neu = lesen(text, ganzzahl);
    if (!isFinite(neu)) {
      setText(String(value));
      return;
    }
    const fest = Math.min(Math.max(neu, min), max);
    onChange(fest);
    setText(String(fest));
  };

  return (
    <input
      type="text"
      inputMode={ganzzahl ? "numeric" : "decimal"}
      value={text}
      aria-invalid={ausserhalb || undefined}
      onChange={(e) => tippen(e.target.value)}
      onBlur={abschliessen}
      onKeyDown={(e) => e.key === "Enter" && abschliessen()}
      {...rest}
    />
  );
}

/* --------------------------------------------------------------- Regler */

/**
 * Zahlenfeld mit Schieber. Der Schieber ist ein bequemer Bereich, keine
 * Grenze: Getippte Werte darüber (bis `maxHart`) werden übernommen, die Spur
 * wächst mit.
 */
export function Regler({ label, hint, value, min, max, maxHart, step, unit, onChange }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const spurMax = Math.max(max, Math.min(value, maxHart ?? Infinity));

  return (
    <div className="regler">
      <div className="regler-kopf">
        <label htmlFor={id}>{label}</label>
        <div className="regler-wert">
          <Zahlenfeld
            id={id}
            value={value}
            onChange={onChange}
            min={min}
            max={maxHart ?? Infinity}
            aria-describedby={hintId}
          />
          <span className="einheit">{unit}</span>
        </div>
      </div>
      <input
        className="schieber"
        type="range"
        aria-label={`${label} (Schieber)`}
        aria-describedby={hintId}
        value={Math.min(Math.max(value, min), spurMax)}
        min={min}
        max={spurMax}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {hint && <div className="hint" id={hintId}>{hint}</div>}
    </div>
  );
}

export function Schalter({ label, hint, checked, onChange, kompakt = false }) {
  const hintId = useId();
  return (
    <div className={kompakt ? "schalter kompakt" : "schalter"}>
      <label>
        <input
          type="checkbox"
          checked={!!checked}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="kaestchen" aria-hidden="true" />
        <span>{label}</span>
      </label>
      {hint && <div className="hint" id={hintId}>{hint}</div>}
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
          aria-valuetext={`${num(p, 1)} % Eigenkapital`}
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

/* ------------------------------------------------------------- Begriffe */

/** Fachbegriff mit Erklärung als Tooltip. */
export function Begriff({ id, children }) {
  return <abbr title={GLOSSAR[id].text}>{children ?? GLOSSAR[id].name}</abbr>;
}

/** Alle Begriffe als aufklappbare Liste — funktioniert auch ohne Maus. */
export function Glossar({ ids }) {
  return (
    <details className="glossar">
      <summary>Begriffe erklärt</summary>
      <dl>
        {ids.map((id) => (
          <div key={id}>
            <dt>{GLOSSAR[id].name}</dt>
            <dd>{GLOSSAR[id].text}</dd>
          </div>
        ))}
      </dl>
    </details>
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
              className="name-feld"
              value={e.name}
              aria-label="Bezeichnung der Einheit"
              placeholder="Bezeichnung"
              onChange={(ev) => setze(e.id, "name", ev.target.value)}
            />
            <button
              className="knopf leise"
              aria-label={`${e.name || "Einheit"} entfernen`}
              onClick={() => entfernen(e.id)}
            >
              Entfernen
            </button>
          </div>
          <div className="felder">
            <label className="feld">
              <span>Fläche m²</span>
              <Zahlenfeld value={e.flaeche} min={0} onChange={(n) => setze(e.id, "flaeche", n)} />
            </label>
            <label className="feld">
              <span>Miete €</span>
              <Zahlenfeld value={e.miete} min={0} onChange={(n) => setze(e.id, "miete", n)} />
            </label>
            <label className="feld">
              <span>Zielmiete €</span>
              <Zahlenfeld value={e.zielmiete} min={0} onChange={(n) => setze(e.id, "zielmiete", n)} />
            </label>
          </div>
          <div className="einheit-fuss">
            <span>{num(e.flaeche > 0 ? e.miete / e.flaeche : 0, 2)} €/m² heute</span>
            <span>{num(e.flaeche > 0 ? e.zielmiete / e.flaeche : 0, 2)} €/m² Ziel</span>
          </div>
        </div>
      ))}
      <div className="knopfreihe knopfreihe-unten">
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
              className="name-feld"
              value={p.bezeichnung}
              aria-label="Bezeichnung der Maßnahme"
              placeholder="Bezeichnung"
              onChange={(ev) => setze(p.id, "bezeichnung", ev.target.value)}
            />
            <button
              className="knopf leise"
              aria-label={`${p.bezeichnung || "Maßnahme"} entfernen`}
              onClick={() => onChange(posten.filter((x) => x.id !== p.id))}
            >
              Entfernen
            </button>
          </div>
          <div className="felder felder-zwei">
            <label className="feld">
              <span>Im Jahr</span>
              <Zahlenfeld ganzzahl value={p.jahr} min={1} max={40} onChange={(n) => setze(p.id, "jahr", n)} />
            </label>
            <label className="feld">
              <span>Betrag €</span>
              <Zahlenfeld value={p.betrag} min={0} onChange={(n) => setze(p.id, "betrag", n)} />
            </label>
          </div>
          <Schalter
            kompakt
            label="Über die AfA verteilen (aktivieren)"
            checked={p.aktivieren}
            onChange={(an) => setze(p.id, "aktivieren", an)}
          />
        </div>
      ))}
      <div className="knopfreihe knopfreihe-unten">
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
      <p className="notiz">
        „Aktivieren“ heißt: Der Betrag wird nicht sofort abgezogen, sondern erhöht die
        AfA-Basis und wirkt über viele Jahre.
      </p>
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
