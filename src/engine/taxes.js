/**
 * Steuern für private Vermietung (Einkünfte aus Vermietung und Verpachtung).
 *
 * Vereinfachungen, die du kennen solltest:
 *  - Der Grenzsteuersatz wird als konstant angenommen.
 *  - Verluste werden sofort mit anderen Einkünften verrechnet (§ 2 Abs. 3
 *    EStG). Das trifft den Regelfall; ein Verlustvortrag entsteht nur, wenn
 *    keine anderen Einkünfte da sind.
 *  - Kein Ersatz für den Steuerberater.
 */

/** AfA-Satz nach Baujahr (§ 7 Abs. 4 EStG). */
export function afaSatzNachBaujahr(baujahr) {
  if (baujahr >= 2023) return 3.0;
  if (baujahr < 1925) return 2.5;
  return 2.0;
}

/** Grenzsteuersatz inklusive Soli und Kirchensteuer. */
export function effektiverSteuersatz(s) {
  const soli = s.soli ? 0.055 : 0;
  const kirche = (s.kirchensteuer || 0) / 100;
  return (s.steuersatz / 100) * (1 + soli + kirche) * 100;
}

/**
 * Anschaffungsnaher Herstellungsaufwand (§ 6 Abs. 1 Nr. 1a EStG).
 *
 * Übersteigen Instandsetzungen in den ersten drei Jahren 15 % der
 * Gebäude-Anschaffungskosten (netto), sind sie nicht sofort abziehbar,
 * sondern erhöhen die AfA-Basis — also 40 Jahre statt einem Jahr.
 */
export function pruefe15Prozent(sanierung, gebaeudeAnschaffungskosten) {
  const grenze = gebaeudeAnschaffungskosten * 0.15;
  const inDreiJahren = sanierung
    .filter((s) => s.jahr <= 3)
    .reduce((sum, s) => sum + s.betrag, 0);
  return {
    grenze,
    inDreiJahren,
    ueberschritten: inDreiJahren > grenze,
    spielraum: grenze - inDreiJahren,
  };
}

/**
 * Steuerpflichtiger Veräußerungsgewinn (§ 23 EStG).
 *
 * Innerhalb der Zehnjahresfrist ist der Gewinn voll steuerpflichtig, und
 * zwar nach Abzug der bereits geltend gemachten AfA — die wird also
 * nachversteuert. Danach ist der Verkauf steuerfrei.
 */
export function veraeusserungsgewinn(erloes, anschaffungskosten, afaKumuliert, haltedauer, satz) {
  const buchwert = anschaffungskosten - afaKumuliert;
  const gewinn = erloes - buchwert;
  const steuerpflichtig = haltedauer < 10 && gewinn > 0;
  return {
    gewinn,
    steuerpflichtig,
    steuer: steuerpflichtig ? (gewinn * satz) / 100 : 0,
    nettoerloes: erloes - (steuerpflichtig ? (gewinn * satz) / 100 : 0),
  };
}
