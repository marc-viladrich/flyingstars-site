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
/** [id, sichtbarer Name] in der Reihenfolge der Knöpfe */
export const LOGO_EXAMPLES = [
  ["ford", "Ford"], ["rewe", "REWE"], ["eon", "E.ON"], ["volkswagen", "Volkswagen"], ["lamborghini", "Lamborghini"], ["spotify", "Spotify"],
  ["berlin", "Berlin"], ["bremen", "Bremen"], ["nieheim", "Nieheim"],
  ["mastercard", "Mastercard"], ["ikea", "IKEA"], ["dhl", "DHL"], ["firefox", "Firefox"], ["nike", "Nike"], ["apple", "Apple"],
  ["mcdonalds", "McDonald’s"], ["adidas", "Adidas"], ["puma", "Puma"], ["cupra", "Cupra"], ["duolingo", "Duolingo"],
];
/** Echte FlyingStars-Kund*innen unter den Beispielen (Wächter: public/brand/logos/kunde-<id>-weiss.svg muss existieren) */
export const CUSTOMER_EXAMPLES = ["ford", "rewe", "eon", "volkswagen", "lamborghini", "spotify"];
