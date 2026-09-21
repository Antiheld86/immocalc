/**
 * Darlehen. Monatliche Verrechnung, wie deutsche Banken tatsächlich rechnen.
 *
 * Zwei Besonderheiten sind eingebaut:
 *
 *  - § 489 BGB: Jedes Darlehen lässt sich zehn Jahre nach Vollauszahlung mit
 *    sechs Monaten Frist entschädigungsfrei kündigen, unabhängig von der
 *    vereinbarten Zinsbindung. Eine 20-jährige Bindung ist damit faktisch
 *    eine 10-jährige mit kostenloser Verlängerungsoption.
 *
 *  - Zinsphasen: Nach Ablauf der Bindung (oder nach Ausübung von § 489)
 *    gilt der Anschlusszins. Die Annuität bleibt bestehen, wodurch sich die
 *    Laufzeit verschiebt statt der Rate.
 */

/** Zinssatz, der in einem gegebenen Monat gilt. */
export function zinsImMonat(f, monat) {
  const wechsel = wechselMonat(f);
  return (monat < wechsel ? f.zins : f.anschlussZins) / 100 / 12;
}

/** Monat, in dem der Anschlusszins greift. */
export function wechselMonat(f) {
  const bindung = f.zinsbindung * 12;
  if (f.kuendigung489 && f.zinsbindung > 10) return Math.min(bindung, 120);
  return bindung;
}

/**
 * Tilgungsplan über die gewünschte Zahl an Jahren.
 * Liefert je Jahr: Zins, Tilgung, Sondertilgung, Restschuld, Rate.
 */
export function tilgungsplan(darlehen, f, jahre) {
  const annuitaet = (darlehen * (f.zins + f.tilgung)) / 100;
  const rate = annuitaet / 12;
  const plan = [];
  let rest = darlehen;

  for (let j = 1; j <= jahre; j++) {
    let zins = 0;
    let tilgung = 0;
    let gezahlt = 0;

    for (let m = 0; m < 12; m++) {
      if (rest <= 0) break;
      const i = zinsImMonat(f, (j - 1) * 12 + m);
      const zm = rest * i;
      const zahlung = Math.min(rate, rest + zm);
      zins += zm;
      tilgung += zahlung - zm;
      gezahlt += zahlung;
      rest = Math.max(0, rest + zm - zahlung);
    }

    /* Sondertilgung am Jahresende — die meisten Verträge erlauben 5 % p. a. */
    const sonder = Math.min(f.sondertilgung || 0, rest);
    rest -= sonder;

    plan.push({ jahr: j, zins, tilgung, sondertilgung: sonder, gezahlt, restschuld: rest, rate });
    if (rest <= 0 && j < jahre) {
      for (let k = j + 1; k <= jahre; k++)
        plan.push({ jahr: k, zins: 0, tilgung: 0, sondertilgung: 0, gezahlt: 0, restschuld: 0, rate: 0 });
      break;
    }
  }
  return plan;
}

export function calculateFinancing(input, gesamtinvestition) {
  const f = input.finanzierung;
  const ek = Math.min(f.eigenkapital, gesamtinvestition);
  const darlehen = Math.max(0, gesamtinvestition - ek);
  const annuitaet = (darlehen * (f.zins + f.tilgung)) / 100;
  const rate = annuitaet / 12;
  const kaufpreis = input.objekt.kaufpreis;

  const plan = tilgungsplan(darlehen, f, 40);
  const getilgt = plan.findIndex((p) => p.restschuld <= 0);

  return {
    eigenkapital: ek,
    darlehen,
    annuitaet,
    rate,
    beleihungsauslauf: kaufpreis > 0 ? (darlehen / kaufpreis) * 100 : NaN,
    ekAnteil: gesamtinvestition > 0 ? (ek / gesamtinvestition) * 100 : NaN,
    /** Eigenkapital, das über die Nebenkosten hinaus den Kaufpreis mindert. */
    ekAufKaufpreis: ek - (gesamtinvestition - kaufpreis),
    plan,
    laufzeit: getilgt >= 0 ? getilgt + 1 : Infinity,
    wechseljahr: wechselMonat(f) / 12,
    restschuldBeiWechsel: plan[Math.ceil(wechselMonat(f) / 12) - 1]?.restschuld ?? darlehen,
  };
}
