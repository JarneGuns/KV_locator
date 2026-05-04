# Koeienvlaai Locator — Kakje Vakje (Chiro Ottenburg)

Webtool om te bepalen in welk vakje een koeienvlaai gevallen is, op basis van twee afstandsmetingen vanuit de hoeken van het veld.

## Gebruik

Open `index.html` in een browser. Geen installatie of internet vereist.

### Stap 1 — Veldafmetingen

Vul de afmetingen van het veld in (lengte langs de straat, breedte langs de parking) en het aantal kolommen en rijen van het raster.

### Stap 2 — Meten op het veld

Meet vanuit **twee verschillende hoeken** de afstand tot de koeienvlaai. Voer de hoek en de gemeten afstand in bij Meting A en Meting B.

> Als beide snijpunten binnen het veld liggen (ambiguïteit), meet dan ook vanuit een derde hoek en vul Meting C in.

### Stap 3 — Uitgesloten vakjes

Vul vakjes in die niet meespelen voor de Lucky Loser Prijs (vakjes van de organisatie (Leiding)), als kommagescheiden lijst: `5, 12, 47`.

### Stap 4 — Berekenen

Klik **Bereken & Visualiseer**. De tool toont:

- Het **winnend vakje** met exacte coördinaten en hoekpunten
- De **lucky loser** — een random vakje buiten de winnaar, diens 8 buren en de uitgesloten vakjes
- Een veldtekening met de twee meetcirkels en het snijpunt
- Het volledige genummerde raster met winnaar, lucky loser en uitgesloten vakjes gemarkeerd