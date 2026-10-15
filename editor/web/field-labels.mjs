// Editor wording only. A label in the Zod schema always wins; this table covers
// schema keys that still carry their raw property name, so editors never read
// "kicker" or "href". Move labels into the schema over time and delete them here.
const keyLabels = {
  headline: "Überschrift",
  title: "Titel",
  cardTitle: "Kartentitel",
  kicker: "Dachzeile",
  eyebrow: "Dachzeile",
  badge: "Hinweis-Badge",
  text: "Text",
  lede: "Einleitung",
  intro: "Einleitung",
  description: "Beschreibung",
  summary: "Kurzfassung",
  tagline: "Claim",
  note: "Hinweis",
  label: "Beschriftung",
  href: "Link",
  cta: "Button",
  secondary: "Zweiter Button",
  download: "Download",
  image: "Bild",
  poster: "Vorschaubild",
  cover: "Titelbild",
  video: "Video",
  heroVideo: "Video im Auftakt",
  proofImage: "Nachweis-Bild",
  proofText: "Nachweis-Text",
  portrait: "Hochformat",
  gallery: "Galerie",
  caption: "Bildunterschrift",
  words: "Wechselnde Wörter",
  stats: "Kennzahlen",
  facts: "Fakten",
  features: "Leistungen",
  items: "Einträge",
  cards: "Karten",
  rows: "Zeilen",
  cells: "Zellen",
  steps: "Schritte",
  tiers: "Pakete",
  lines: "Zeilen",
  numbers: "Zahlen",
  credits: "Mitwirkende",
  setlist: "Ablauf der Show",
  story: "Geschichte",
  press: "Presse",
  publication: "Medium",
  meta: "Eckdaten",
  value: "Wert",
  unit: "Einheit",
  tone: "Bewertung",
  category: "Kategorie",
  campaign: "Kampagne",
  client: "Kunde",
  location: "Ort",
  date: "Datum",
  updated: "Aktualisiert am",
  drones: "Drohnen",
  formation: "Formation",
  accent: "Akzentfarbe",
  featured: "Hervorheben",
  showcase: "Projektseite",
  name: "Name",
  question: "Frage",
  tags: "Schlagwörter",
  limit: "Anzahl",
  openFirst: "Erste Frage geöffnet",
  draft: "Entwurf (nicht veröffentlicht)",
  noindex: "Nicht in Suchmaschinen anzeigen",
  decorative: "Dekoratives Bild",
  count: "Anzahl Drohnen",
  shape: "Formation",
  columns: "Spalten",
  sections: "Abschnitte",
};

const choiceLabels = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  left: "Links",
  right: "Rechts",
  ring: "Ring",
  sphere: "Kugel",
  torus: "Torus",
  y: "Ja",
  n: "Nein",
  p: "Teilweise",
  o: "Kontur",
  g: "Farbverlauf",
};

// Values that exist for storage, migration or routing. They stay reachable for
// developers under "Erweitert" but never compete with editorial fields.
const technicalKeys = new Set([
  "id",
  "assetId",
  "sourceIssue",
  "sourceId",
  "sourceHash",
  "locale",
  "titleChars",
  "titleLines",
  "order",
  "route",
  "nextRoute",
  "src",
  "width",
  "height",
  "mime",
]);

function humanize(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

export function fieldLabel(field) {
  const key = [...(field.path || [])].reverse().find((part) => typeof part !== "number");
  const own = field.label === undefined ? "" : String(field.label);
  if (own && own !== key && own !== "Inhalt" && Number.isNaN(Number(own))) return own;
  return keyLabels[key] || humanize(key ?? "Inhalt");
}

export function choiceLabel(choice) {
  if (choice && typeof choice === "object") return choice.label;
  return choiceLabels[choice] || humanize(choice);
}

export function isTechnical(field) {
  const key = [...(field.path || [])].reverse().find((part) => typeof part !== "number");
  return field.advanced === true || technicalKeys.has(key);
}
