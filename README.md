# Immobilienrechner 2.0

Renditerechner für vermietete Wohnimmobilien in Deutschland. Rechnet
einheitengenau über 40 Jahre, mit Kaufpreisaufteilung nach Sachwertverfahren,
Steuerwirkung, Sanierungsplan, Verkaufsrechnung nach § 23 EStG und einem
Vergleichsdepot als Opportunitätskosten.

Läuft vollständig im Browser. Keine Datenübertragung, kein Konto, keine
Datenbank — gespeichert wird im localStorage, gesichert per JSON-Export.

## Schnellstart

```bash
docker compose up -d --build
```

Danach erreichbar unter `http://<host>:8087`.

In Dockge das Verzeichnis als Stack anlegen, `compose.yaml` einfügen,
Deploy. Der Build läuft im Container und führt die Tests des Rechenkerns aus —
schlägt einer fehl, entsteht kein Image.

## Release als Docker-Image

Ein Push mit Versions-Tag löst `.github/workflows/release.yml` aus. Der Workflow
baut das Image (amd64 und arm64), veröffentlicht es in der GitHub Container
Registry und legt das GitHub-Release an.

```bash
npm version minor --no-git-tag-version   # oder patch / major
git commit -am "Version $(node -p "require('./package.json').version")"
git tag -a "v$(node -p "require('./package.json').version")" -m "Release"
git push origin main --tags
```

Der Tag muss zur Version in `package.json` passen, sonst bricht der Workflow ab.
Fertige Images ohne lokalen Build:

```bash
docker pull ghcr.io/antiheld86/immocalc:latest
docker run -d -p 8087:80 --name immorechner ghcr.io/antiheld86/immocalc:latest
```

Ist das Repository privat, ist es das Paket zunächst auch — vor dem Pull
`docker login ghcr.io` mit einem Token (`read:packages`) oder das Paket in den
GitHub-Paketeinstellungen freigeben.

### Entwicklung

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # Rechenkern prüfen
npm run build
```

## Aufbau

Die Berechnung ist vollständig von der Oberfläche getrennt. `src/engine/` ist
reines JavaScript ohne React — gleiche Eingabe, gleiches Ergebnis, keine
Seiteneffekte. Deshalb lässt sie sich testen, und deshalb ist sie die einzige
Stelle, an der Zahlen entstehen.

```
src/
├── engine/
│   ├── property.js     Nebenkosten, Kaufpreisaufteilung, Mieteinnahmen
│   ├── financing.js    Annuitätendarlehen, monatliche Verrechnung, § 489 BGB
│   ├── taxes.js        AfA, 15-%-Grenze, Grenzsteuersatz, § 23 EStG
│   ├── simulation.js   Jahresschleife über 40 Jahre — das Herzstück
│   ├── metrics.js      Interner Zinsfuß, Verkauf, Depotvergleich
│   ├── scenarios.js    Szenarioband und Heatmap
│   ├── index.js        Einstiegspunkt, Standardwerte, Normalisierung
│   └── engine.test.js  23 Tests
├── components/
│   ├── Eingaben.jsx    Zahlenfeld, Regler, Bemaßung, Einheiten, Sanierungsliste, Glossar
│   ├── Grafik.jsx      Verlauf, Cashflow, Heatmap, Szenarioband (zeichnen in echten Pixeln)
│   ├── Hinweis.jsx     Meldungen und „Rückgängig“
│   └── useBreite.js    Misst die Breite eines Elements für die Diagramme
├── tabs/               Ein Reiter je Datei: Eingabe, Verlauf, Risiko, Vergleich
├── App.jsx             Reiter, Speicherung, Export/Import
├── format.js           Zahlenformate (de-DE)
├── glossar.js          Erklärungen der Fachbegriffe
└── styles.css
```

Jede Kennzahl ist ein Zugriff auf ein Jahr der Simulation. Willst du den
Cashflow in Jahr 17, ist das `simulation.jahre[16].cashflow` — keine zweite
Rechnung, kein Sonderfall.

## Was der Rechner besser macht als die üblichen

**Einheiten statt Durchschnitt.** Vier Wohnungen mit unterschiedlicher Miete
je m² sind nicht dasselbe wie eine Fläche mal einer Durchschnittsmiete. Jede
Einheit hat ihre eigene Zielmiete, und der Weg dorthin wird durch die
Kappungsgrenze von 20 % in drei Jahren begrenzt (§ 558 Abs. 3 BGB).

**Kaufpreisaufteilung statt Pauschale.** Der Gebäudeanteil wird aus
Bodenrichtwert, Grundstücksgröße und Restnutzungsdauer nach Sachwertverfahren
ermittelt. Bei großen Grundstücken in einfachen Lagen liegt er oft bei 35 %
statt bei den üblichen 80 % — was die AfA halbiert und die Steuerlast
entsprechend erhöht. Das ist der am häufigsten übersehene Fehler in
Renditerechnungen.

**Monatliche Verrechnung.** Restschuld, Laufzeit und Zinsanteil rechnen Monat
für Monat, wie deutsche Banken es tun. Eingegeben wird der Sollzins, nicht der
Effektivzins.

**§ 489 BGB.** Jedes Darlehen ist zehn Jahre nach Vollauszahlung
entschädigungsfrei kündbar, unabhängig von der Zinsbindung. Eine 20-jährige
Bindung ist damit faktisch eine 10-jährige mit kostenloser
Verlängerungsoption — der Schalter rechnet das durch.

**Die 15-%-Grenze.** Instandsetzungen über 15 % der Gebäude-Anschaffungskosten
in den ersten drei Jahren werden zu anschaffungsnahem Herstellungsaufwand
(§ 6 Abs. 1 Nr. 1a EStG): nicht sofort abziehbar, sondern über 40 Jahre. Der
Sanierungsplan zeigt den verbleibenden Spielraum.

**Verkauf mit AfA-Nachversteuerung.** Innerhalb der Zehnjahresfrist mindert
die bereits abgesetzte AfA den Buchwert und erhöht damit den steuerpflichtigen
Gewinn. Ab Jahr 11 ist der Verkauf steuerfrei.

**Vergleichsdepot.** Dasselbe Eigenkapital am Aktienmarkt, jeder negative
Cashflow als zusätzliche Einzahlung, Abgeltungsteuer mit 30 %
Teilfreistellung. Beide Seiten binden dasselbe Geld — erst dann ist der
Vergleich ehrlich.

**Unsicherheit als Band.** Drei Annahmensätze nebeneinander statt einer
Punktschätzung. Der Abstand zwischen den Spalten ist meistens die eigentliche
Information.

## Bewusste Vereinfachungen

- Konstanter Grenzsteuersatz über die gesamte Laufzeit
- Verluste werden sofort mit anderen Einkünften verrechnet, kein Verlustvortrag
- Keine Modernisierungsumlage nach § 559 BGB
- Keine Grundsteuer als separater Posten (steckt in den umlagefähigen Kosten)
- Wertsteigerung als konstanter Prozentsatz auf den Kaufpreis
- Der interne Zinsfuß hängt vollständig an der unterstellten Wertsteigerung
  und wird deshalb nie ohne diese Angabe gezeigt

## Datenhaltung

`localStorage` unter den Schlüsseln `immorechner:entwurf` (aktuelle Eingabe,
wird laufend gesichert) und `immorechner:objekte` (gespeicherte Vergleiche).

Für Sicherungen und den Umzug zwischen Geräten die Export-Funktion nutzen. Die
JSON-Datei enthält beides und lässt sich über Importieren wieder einlesen.
Sinnvoll als regelmäßige Sicherung neben den Objektunterlagen.

## Anpassen

Standardwerte stehen in `src/engine/index.js` unter `STANDARD`. Grunderwerbsteuer,
typische Bewirtschaftungskosten und Zinsannahmen dort auf die eigene Region
setzen, dann startet der Rechner passend.

Neue Kennzahlen gehören nach `metrics.js` und brauchen einen Test in
`engine.test.js`. Neue zeitabhängige Größen nach `simulation.js`.

## Rechtliches

Modellrechnung, keine Steuer-, Rechts- oder Anlageberatung. Die
Kaufpreisaufteilung ist eine Schätzung; verbindlich ist die Feststellung des
Finanzamts. Für die tatsächliche Entscheidung Steuerberater und
Finanzierungsberatung hinzuziehen.
