// Beispiel-Logos im Logo-Modus des Show-Konfigurators: eine Liste für die Knöpfe (ShowConfigurator.astro), die Tests und
// die Erzeugung der vorberechneten Daten (public/media/logo-modus/beispiele/<id>.{svg,json,raster.json}).
// Runde 10b (Marc 20.11.2026): „bei den Beispielen einige mehr von unseren Kunden mitnehmen. Shell und Target rausnehmen,
// stattdessen sowas wie Ford, Rewe, E.ON … uns geht es mehr um lokale Sachen“, dazu Volkswagen und Städte als Zielgruppe.
// Kund*innen zuerst (nur echte FlyingStars-Kund*innen, siehe public/brand/logos/kunde-*), dann Städte, dann bekannte
// Marken als Vergleich.
// Quellen der neuen SVGs (Wikimedia Commons, vereinfacht für den Himmel, Details in docs/show-konfigurator.md):
// Ford_logo_flat.svg; Logo_REWE.svg (rote Schrift ohne Kasten, sonst wechseln die Buchstabenkonturen zwischen Rot und Weiß);
// E.ON aus public/brand/logos/kunde-eon-weiss.svg in E.ON-Rot (#ea1c0a, auf Commons nicht vorhanden);
// Volkswagen_logo_2019.svg; DEU_Berlin_COA.svg ohne Krone; Bremen_Wappen(Mittel).svg ohne Krone und mit nur einer
// Schildkante; DEU_Nieheim_COA.svg ohne schwarze Umrandungen (sonst wechselt das Kreuz die Farbe), Kugeln mit Radius 35
// (sonst zeichnet der Konverter drei als Punktgruppe und eine als Ring). Köln geprüft und verworfen: Kronen und Flammen
// zerfallen bei 100 Drohnen.
// Runde 12 (Marc 21.11.2026): „bei Bremen und Berlin die Wappenform rausnehmen … Bremen soll so nice aussehen wie im
// normalen Konfigurator. Und bei Ford bitte nur den Schriftzug, ohne umliegendes Oval. Und bei Rewe ist der Schriftzug
// einfach nicht ganz korrekt … VW sieht scheiße aus, bitte raus.“ Seitdem: Ford = nur der Schriftzug aus Ford_logo_flat.svg
// in Ford-Blau; Berlin = der Bär aus DEU_Berlin_COA.svg ohne Schild, ohne Zunge, Krallen, Zähne und Ohr (am Himmel
// Punktklumpen); Bremen = eigene vereinfachte Zeichnung des Schlüssels nach dem Katalogmotiv (scenes/wahrzeichen.js, KEY):
// dünne Striche, die der Konverter als Einzellinien zeichnet; REWE = Logo_REWE.svg für den Himmel vorbereitet (Striche je
// Seite 3 Einheiten schmaler, damit die Schlitze im E und die Punze im R aufgelöst werden; Außenecken runder); Volkswagen
// ist raus (das Kundenlogo in der Logo-Leiste bleibt). Details: docs/show-konfigurator.md, „Runde 12 · Beispiel-Logos“.
// Runde 14 (Marc 21.11.2026: „mir gefällt das ehrlich gesagt nicht, so wie es da dargestellt wird“): REWE ist als Beispiel
// raus, das Kundenlogo in der Logo-Leiste bleibt. Die vorbereitete Quelle steht in der Git-Historie (rewe.svg, Runde 12).
/** [id, sichtbarer Name] in der Reihenfolge der Knöpfe */
export const LOGO_EXAMPLES = [
  ["ford", "Ford"], ["eon", "E.ON"], ["lamborghini", "Lamborghini"], ["spotify", "Spotify"],
  ["berlin", "Berlin"], ["bremen", "Bremen"], ["nieheim", "Nieheim"],
  ["mastercard", "Mastercard"], ["ikea", "IKEA"], ["dhl", "DHL"], ["firefox", "Firefox"], ["nike", "Nike"], ["apple", "Apple"],
  ["mcdonalds", "McDonald’s"], ["adidas", "Adidas"], ["puma", "Puma"], ["cupra", "Cupra"], ["duolingo", "Duolingo"],
];
// Runde 14 (Marc 21.11.2026: Bremen im Logo-Modus „janky“, im Stadtfest „mega clean“; „Lass uns das doch einfach
// nehmen.“): Bremen ist keine eigene Zeichnung mehr, sondern der Bremer Schlüssel des Stadtfests (scenes/wahrzeichen.js,
// schluessel) mit dessen Punkten bei jeder Drohnenzahl, ohne den Logo-Konverter (logo-landmark.mjs). Dafür gibt es keine
// vorberechneten Daten unter public/media/logo-modus/beispiele/; das Bild der Minimap entsteht aus denselben Linien.
/** Beispiele, die ein Wahrzeichen aus scenes/wahrzeichen.js sind. shape: Schlüssel in SHAPES; max: höchste gewünschte
 * Drohnenzahl, die das Motiv bestimmt (der Schlüssel hat ab 280 seine volle Zeichnung, 2D geht im Stadtfest bis 300);
 * apart: Teile, die ein eigenes Element sind (nicht mit dem Rest verbunden); ink: Farben im Bild der Minimap. */
export const LANDMARK_EXAMPLES = {
  bremen: { shape: "schluessel", max: 300, apart: ["ornament"], title: "Bremer Schlüssel", ink: { default: "#2f3a44", ornament: "#b07a12" } },
};
/** Beispiele, die der Logo-Konverter vorberechnet hat (SVG, Daten und Raster unter public/media/logo-modus/beispiele/) */
export const CONVERTER_EXAMPLES = LOGO_EXAMPLES.map(([id]) => id).filter((id) => !Object.hasOwn(LANDMARK_EXAMPLES, id));
/** Echte FlyingStars-Kund*innen unter den Beispielen (Wächter: public/brand/logos/kunde-<id>-weiss.svg muss existieren) */
export const CUSTOMER_EXAMPLES = ["ford", "eon", "lamborghini", "spotify"];
