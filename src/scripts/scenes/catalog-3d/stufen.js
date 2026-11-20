// Runde 9 (Marc, 20.11.2026: „der Unterschied zwischen 3D und 3D plus ist noch nicht krass genug … bei 3D … einfache
// 3D-Elemente, also wirklich einfache Elemente, und dann die komplexen 3D-Elemente eher bei 3D Plus“): Einstufung jeder
// 3D-Fassung in eine Show-Art. Die Stufe folgt allein aus der Formklasse, damit die Regel bei jedem neuen Motiv gilt:
//
//   3D  (einfach): ein Gegenstand aus wenigen Grundkörpern (Kugel, Rotationskörper, Ring, Scheibe) oder ein Zeichen;
//                  Bewegung ist Drehung, Licht oder EIN einfacher Teil (Nadel, Zahnräder, Korken).
//   3D+ (komplex): Figuren und Tiere mit Gliedern oder Flügeln, Fahrzeuge mit Rädern und Rotoren, Pflanzen mit vielen
//                  Blättern, Szenen aus mehreren Dingen (Turm mit Meer, Kanone mit Luftschlangen), volumetrische
//                  Effekte und erzählte Abläufe.
//
// Wächter: scripts/catalog-3d.test.mjs (jede 3D-Fassung hat eine Klasse, jede Klasse eine Stufe). Angewendet wird die
// Stufe im Konfigurator (src/content/show-configurator.js, Konfigurator-Agent): Motive der Stufe 3D+ spielen nur in
// Storytelling (ODYSSEY), nicht in 3D (HORIZON).

/** Formklasse → Show-Art. */
export const STUFE_DER_KLASSE = {
  zeichen: '3D', koerper: '3D', gegenstand: '3D', technik: '3D',
  figur: '3D+', tier: '3D+', pflanze: '3D+', fahrzeug: '3D+', szene: '3D+', effekt: '3D+',
};

/** Formklasse und Begründung je Katalogmotiv mit 3D-Fassung (Register in index.js). */
export const KLASSE_KATALOG = {
  stern: ['zeichen', 'ein Stern mit Graten, dreht sich'],
  sonne: ['zeichen', 'Kugelkern mit Strahlenkrone, die Krone dreht sich'],
  galaxie: ['zeichen', 'zwei Spiralarme in einer geneigten Scheibe, starre Drehung'],
  diskokugel: ['koerper', 'eine Kugel an der Schnur, Meridiane drehen sich'],
  basketball: ['koerper', 'eine Kugel, Nähte drehen sich'],
  smiley: ['koerper', 'eine Kugel mit Gesicht, nickt'],
  ballons: ['koerper', 'fünf Kugeln an Schnüren, schweben'],
  zuckerstange: ['gegenstand', 'eine Röhre mit Streifen, Licht läuft'],
  sektflasche: ['gegenstand', 'ein Rotationskörper, der Korken wippt'],
  bierkrug: ['gegenstand', 'ein Rotationskörper mit Henkel, Bläschen'],
  cocktail: ['gegenstand', 'Kelch mit Schirmchen, das Schirmchen dreht sich'],
  mikrofon: ['gegenstand', 'Gitterkugel mit Griff, das Gitter dreht sich'],
  geburtstag: ['gegenstand', 'drei Stockwerke als Rotationskörper, Flamme'],
  glocke: ['gegenstand', 'zwei Rotationskörper, schwingen'],
  eheringe: ['gegenstand', 'zwei verschlungene Ringe, Glanz'],
  anstossen: ['gegenstand', 'zwei Gläser als Rotationskörper, stoßen an (Marc 20.11.: „Anstoßen kann ruhig in 3D rein“)'],
  zahnraeder: ['technik', 'drei Scheiben, die sich gegeneinander drehen'],
  drehzahl: ['technik', 'ein Zylinder mit Skala, die Nadel dreht hoch'],
  batterie: ['technik', 'ein liegender Zylinder, Ladebalken leuchten nacheinander'],
  doppelherz: ['zeichen', 'ein gewölbtes Herz, schlägt'],
  unendlich: ['zeichen', 'eine Röhre als räumliche Schleife, Licht läuft'],
  peace: ['zeichen', 'Ring und drei Striche als Röhren, schwenkt'],
  anker: ['gegenstand', 'Schaft, Ring, Arme und quer stehender Stock, pendelt'],
  torte: ['gegenstand', 'drei Stockwerke als Rotationskörper, Herzen obenauf'],
  lebkuchen: ['figur', 'Figur mit Armen und Beinen, winkt'],
  schneemann: ['figur', 'Figur aus drei Kugeln mit Hut, Armen und Nase, lüftet den Hut'],
  roboter: ['figur', 'Figur mit Greifarmen, Zangen und Rollen'],
  hund: ['tier', 'Tier mit vier Beinen, Ohren, Schwanz und Ball'],
  biene: ['tier', 'Tier mit vier Flügeln und Fühlern'],
  taube: ['tier', 'Tier mit Flügelschlag und Ölzweig'],
  marienkaefer: ['tier', 'Tier mit sechs Beinen im Laufrhythmus'],
  schmetterling: ['tier', 'Tier mit vier Flügeln, Adern und Fühlern'],
  sparschwein: ['tier', 'Tier mit Beinen, Rüssel, Schwanz und schwebender Münze'],
  lotusblume: ['pflanze', 'zwölf Blütenblätter in zwei Kränzen, Blatt auf dem Wasser (Marc 20.11.: 3D+ bestätigt)'],
  sportwagen: ['fahrzeug', 'Karosserie mit Fenstern, vier Rädern, Lichtern'],
  hubschrauber: ['fahrzeug', 'Rumpf, Ausleger, Kufen, Haupt- und Heckrotor'],
  flugzeug: ['fahrzeug', 'Rumpf, Tragflächen, Leitwerk, Triebwerke, Fensterreihe'],
  lkw: ['fahrzeug', 'Laderaum, Führerhaus, drei Achsen, Lichter'],
  feuerwehr: ['fahrzeug', 'Aufbau, Führerhaus, Drehleiter, Blaulicht, Räder'],
  leuchtturm: ['szene', 'Turm, Galerie, Laterne, Felsen, Meer und kreisende Lichtkegel'],
  konfetti: ['szene', 'Kanone auf Rädern mit fliegenden Luftschlangen'],
};

/**
 * Vorschlag für die eigenen Motive des Konfigurators (nicht im Register, Bauweise in scenes/*): Motiv-ID → [Stufe,
 * Begründung]. Gilt für deren HORIZON-Fassung; eingestuft nach Bildunterschrift und docs/katalog-3d.md.
 */
export const STUFE_EIGEN = {
  uhr: ['3D', 'Zifferblatt als Körper, die Zeiger laufen'],
  schnee: ['3D', 'Lichterbaum als Spirale'],
  sekt: ['3D', 'eine Flasche, Perlen steigen'],
  klee: ['3D', 'ein Zeichen'],
  rakete: ['3D', 'ein Rotationskörper, schwebt und dreht sich'],
  logo: ['3D', 'Logo mit Lichtschimmer (präzise Logos gehören zu 3D)'],
  idee: ['3D', 'Glühbirne als Rotationskörper'],
  qr: ['3D', 'ein Zeichen, das sich aufbaut'],
  spirale: ['3D', 'eine Spirale'],
  wappen: ['3D', 'ein Schild mit Zahl, die Fahne weht'],
  wahrzeichen: ['3D', 'ein Rotationskörper (Turm)'],
  pokal: ['3D', 'ein Rotationskörper'],
  reise: ['3D', 'ein Kompass, die Nadel schwingt'],
  ring: ['3D', 'ein Ring mit Stein'],
  glaeser: ['3D', 'zwei Gläser stoßen an, Perlen steigen (wie anstossen; Marc 20.11.: Anstoßen gehört in 3D)'],
  buch: ['3D', 'ein Buch, eine Seite wendet sich'],
  maske: ['3D', 'zwei Masken als Flächen'],
  noten: ['3D', 'Harfe, Licht zupft die Saiten'],
  feuerwerk: ['3D+', 'volumetrischer Effekt (blühende Sterne im Raum)'],
  herz: ['3D+', 'volumetrischer Effekt (Tunnel aus vielen Herzen; Marc 20.11.: 3D+ bestätigt)'],
  vorhang: ['3D+', 'erzählter Ablauf (Vorhang öffnet, Stern löst sich)'],
  fussball: ['3D+', 'Figur mit Gliedern (Schuss)'],
  sprung: ['3D+', 'Figur mit Gliedern und Wasser'],
  tanz: ['3D+', 'Figur mit fliegendem Rock'],
  kolibri: ['3D+', 'Tier mit Flügelschlag'],
  delfin: ['3D+', 'Tier mit Wasser'],
  drache: ['3D', 'Runde 10b (Marc 20.11.): in 3D ein aufsteigender Drache als Körper, in 3D+ der Azteken-Kopf (scenes/catalog-3d/drache.js)'],
  falter: ['3D+', 'Tier mit Flügelschlag'],
  lotus: ['3D+', 'zwei Blüten mit vielen Blättern (Marc 20.11.: 3D+ bestätigt)'],
  riesenrad: ['3D+', 'Szene: Rad mit Gondeln, Speichen, Gestell (Marc 20.11.: 3D+ bestätigt)'],
  // Runde 10, Agent W (Wahrzeichen und Jahreszahl fürs Stadtfest, scenes/catalog-3d/wahrzeichen.js): die 3D-Fassung ist je
  // schlicht (Stufe 3D), die aufwendigere spielt als ODYSSEY-Fassung in 3D+ (docs/katalog-wahrzeichen.md)
  fernsehturm: ['3D', 'Rotationskörper mit Kugel, Licht läuft um die Kugel'],
  rheinturm: ['3D', 'Rotationskörper mit Kanzel, die Lichtzeituhr leuchtet'],
  brandenburgertor: ['3D', 'Säulenhalle als Körper, Licht gleitet'],
  koelnerdom: ['3D', 'Fassade mit zwei Turmhelmen als Körper, Licht steigt'],
  elbphilharmonie: ['3D', 'Sockel und Glasbau mit Wellenkrone, Licht gleitet'],
  schwebebahn: ['3D', 'Gerüst und Wagen aus Grundkörpern, der Wagen steht (fährt erst in 3D+)'],
  jahreszahl: ['3D', 'ein Zeichen mit kreisendem Lichtkranz'],
  bremerschluessel: ['3D', 'ein flacher Gegenstand, dreht sich um den Schaft wie im Schloss'],
  frankfurtskyline: ['3D', 'Silhouette mit Dächern in der Tiefe, Licht gleitet'],
  siegessaeule: ['3D', 'Säule als Rotationskörper auf Sockelquadern, Gold glänzt'],
};

/** Katalogformationen, die schon im Katalog räumlich sind (kein Register-Eintrag, sie drehen sich als Formation). */
export const STUFE_FORMATION = { kugel: '3D', atom: '3D', pyramide: '3D', moebius: '3D', wasserball: '3D', welle: '3D', hexenkessel: '3D' };

/** Stufe eines Katalogmotivs mit 3D-Fassung ('3D' | '3D+'), undefined ohne Fassung. */
export const stufeKatalog = (key) => (KLASSE_KATALOG[key] ? STUFE_DER_KLASSE[KLASSE_KATALOG[key][0]] : undefined);
