// Kuratierte Anordnung der Bildgalerien (Gallery.astro). Material, Maße, Alt-Texte und Belege (Kunde, Ort, Drohnenzahl)
// stehen in public/media/galerie/manifest.json; hier steht nur, welches Bild wo sitzt und wie es zugeschnitten wird.
//
// Runde 5 (Marc, 18.11.2026: „viel zu eng … viel zu wenig Platz zum restlichen Content“, Referenzen „NOIR“ und die
// gestreute Schwarz-Galerie): gleich breite, kleine Spalten (rund ein Sechstel der Seite), großzügige Fugen, jede Spalte
// endet unten bündig und beginnt auf anderer Höhe, so entsteht eine Treppe nach rechts oben. Der Text steht frei im
// Weißraum links oben (text = Spalten, die er überspannt), die Spalten darunter sind kurz, die rechts daneben steigen auf.
// Kleine Leuchtpunkt-Akzente (accent) sitzen wie die Farbquadrate der zweiten Referenz in Lücken, sparsam.
// ar = Seitenverhältnis der Kachel, pos = object-position (Fokus aufs Motiv). Jeder Zuschnitt ist an den echten Bildern
// geprüft: Logo und Formation liegen vollständig im Rahmen. Höhen der Spalten in Spaltenbreiten (w) stehen als Kommentar.
//
// Nicht verwendet (Sichtung 18.11.2026): nfl-loop-1 und ford-loop-1 (zu dunkel), rewe-fc-1 (neblig, Logo kaum zu
// erkennen, Bildrechte offen), publikum-1 (angeschnitten, unbelegt), nfl-2 (Hufeisen fast nur Schwarz),
// bokkenrijders-loop-1 (Marc, Runde 5: kein Video in dieser Section; dasselbe Motiv steht als bokkenrijders-1 drin).

/** @typedef {{ slug: string, ar: string, pos?: string }} Photo */
/** @typedef {{ accent: 'grid' | 'dot', size?: 's' | 'm', side?: 'start' | 'end' }} Accent */
/** @typedef {{ cols: number, text: number, top?: number, columns: (Photo | Accent)[][] }} Layout */

/** @type {Record<string, Layout>} */
export const GALLERY_LAYOUTS = {
  // Werbung #marketing: Logo-Shows großer Marken. Fünf Spalten, der Kopf überspannt vier, der Text zwei; die rechte
  // Spalte steigt neben der Überschrift bis ganz nach oben (dort flog vorher das Auto des Schwarms, schwarm.ts lässt es
  // aus, sobald die Fläche belegt ist). Höhen in Spaltenbreiten: 0,4 · 0,6 | 1,4 · 2,1 | 3,5.
  logos: {
    cols: 5, text: 2, top: 1,
    columns: [
      [{ accent: 'dot', side: 'end' }, { slug: 'siemens-1', ar: '800 / 343' }],
      [{ slug: 'ford-1', ar: '16 / 9', pos: '50% 45%' }],
      [{ accent: 'grid', side: 'start' }, { slug: 'prada-1', ar: '4 / 3', pos: '45% 60%' }, { slug: 'spotify-1', ar: '800 / 433' }],
      [{ slug: 'bokkenrijders-1', ar: '4 / 3', pos: '45% 40%' }, { slug: 'vw-1', ar: '4 / 5', pos: '60% 40%' }],
      [{ slug: 'puma-1', ar: '4 / 5', pos: '44% 30%' }, { slug: 'nfl-1', ar: '1 / 1' }, { slug: 'bokkenrijders-2', ar: '1 / 1', pos: '41% 50%' }],
    ],
  },
  // Über uns #nachhaltigkeit: Feste für alle. Höhen 0,6 · 0,8 | 1,2 · 1,9 · 2,4.
  willkommen: {
    cols: 5, text: 2,
    columns: [
      [{ slug: 'hochzeit-1', ar: '16 / 9', pos: '50% 35%' }],
      [{ accent: 'dot', side: 'start' }, { slug: 'frieden-1', ar: '4 / 3', pos: '47% 30%' }],
      [{ accent: 'grid', side: 'end' }, { slug: 'herz-1', ar: '1 / 1', pos: '48% 15%' }],
      [{ slug: 'extraschicht-1', ar: '4 / 3', pos: '50% 55%' }, { slug: 'abendhimmel-1', ar: '1 / 1', pos: '55% 50%' }],
      [{ slug: 'sea-you-1', ar: '4 / 5', pos: '50% 30%' }, { slug: 'boellerciao-1', ar: '1 / 1', pos: '50% 40%' }],
    ],
  },
  // Nachhaltigkeit #referenzen „Wir fliegen mit Engagement“: Zeichen für Demokratie und Umweltschutz. Dieselben fünf
  // Spalten wie oben (gleiche Bildgröße auf allen Seiten), die Einträge überspannen drei. Für Kein Bock auf Nazis gibt es (Stand 18.11.2026) kein Showfoto im Bestand;
  // sobald eins kommt, gehört es hier rechts oben hin.
  engagement: {
    cols: 5, text: 3,
    columns: [
      [], [], [],
      [{ accent: 'grid', side: 'end' }, { slug: 'herz-1', ar: '4 / 3', pos: '48% 30%' }],
      [{ slug: 'boellerciao-1', ar: '4 / 5', pos: '50% 40%' }, { slug: 'frieden-1', ar: '4 / 3', pos: '47% 30%' }],
    ],
  },
  // Indoor #referenzen: Standbilder aus dem Siemens-Video der Hannover Messe 2025 (echte FlyingStars-Show).
  indoor: {
    cols: 5, text: 3,
    columns: [
      [], [], [],
      [{ accent: 'grid', side: 'start' }, { slug: 'siemens-indoor-1', ar: '4 / 3', pos: '50% 60%' }],
      [{ slug: 'siemens-indoor-2', ar: '4 / 5', pos: '50% 35%' }, { slug: 'siemens-indoor-3', ar: '16 / 10', pos: '50% 40%' }],
    ],
  },
};

export const GALLERY_SETS = /** @type {const} */ (['logos', 'willkommen', 'engagement', 'indoor']);

// Hover-Zeile „Kunde · Ort · Drohnenzahl“: nur Werte aus dem Manifest. name ersetzt den Kunden, wo das Manifest einen
// Agentur- oder Privatnamen führt; place kürzt den Ort auf die Stadt (Übersetzung wie im übrigen Site-Text).
/** @type {Record<string, { name?: Record<string, string>, place?: Record<string, string>, alt: { en: string, nl: string } }>} */
export const GALLERY_TEXT = {
  'ford-1': { name: { de: 'Ford', en: 'Ford', nl: 'Ford' }, place: { de: 'Köln', en: 'Cologne', nl: 'Keulen' },
    alt: { en: 'Blue Ford lettering made of drones above the illuminated factory site.', nl: 'Blauwe Ford-letters van drones boven het verlichte fabrieksterrein.' } },
  'puma-1': { place: { de: 'Mönchengladbach', en: 'Mönchengladbach', nl: 'Mönchengladbach' },
    alt: { en: 'Red and blue PUMA logo made of drones above the illuminated stadium.', nl: 'Rood-blauw PUMA-logo van drones boven het verlichte stadion.' } },
  'bokkenrijders-loop-1': { name: { de: 'Bokkenrijders', en: 'Bokkenrijders', nl: 'Bokkenrijders' }, place: { de: 'Maastricht', en: 'Maastricht', nl: 'Maastricht' },
    alt: { en: 'Above the open-air stage the Bokkenrijders lettering and a glowing skull take turns.', nl: 'Boven het openluchtpodium wisselen de Bokkenrijders-letters en een lichtgevende doodskop elkaar af.' } },
  'bokkenrijders-1': { name: { de: 'Bokkenrijders', en: 'Bokkenrijders', nl: 'Bokkenrijders' }, place: { de: 'Maastricht', en: 'Maastricht', nl: 'Maastricht' },
    alt: { en: 'The Bokkenrijders lettering made of drones above a blue-lit open-air stage.', nl: 'De Bokkenrijders-letters van drones boven een blauw verlicht openluchtpodium.' } },
  'bokkenrijders-2': { name: { de: 'Bokkenrijders', en: 'Bokkenrijders', nl: 'Bokkenrijders' }, place: { de: 'Maastricht', en: 'Maastricht', nl: 'Maastricht' },
    alt: { en: 'Red face with horns made of drones, the motif of the musical Bokkenrijders.', nl: 'Rood gezicht met hoorns van drones, het motief van de musical Bokkenrijders.' } },
  'siemens-1': { place: { de: 'Berlin', en: 'Berlin', nl: 'Berlijn' },
    alt: { en: 'In front of the audience, purple drones form the silhouette of a train.', nl: 'Voor het publiek vormen paarse drones het silhouet van een trein.' } },
  'nfl-1': { name: { de: 'NFL Berlin Game', en: 'NFL Berlin Game', nl: 'NFL Berlin Game' }, place: { de: 'Berlin', en: 'Berlin', nl: 'Berlijn' },
    alt: { en: 'Red NFL letters inside a blue-edged shield made of drones.', nl: 'Rode NFL-letters in een blauw omrand schild van drones.' } },
  'spotify-1': { place: { de: 'Berlin', en: 'Berlin', nl: 'Berlijn' },
    alt: { en: 'Blue drones write “Jetzt auf Spotify” (now on Spotify) into the night sky.', nl: 'Blauwe drones schrijven „Jetzt auf Spotify” (nu op Spotify) in de nachtlucht.' } },
  'prada-1': { name: { de: 'L’Oréal × Prada', en: 'L’Oréal × Prada', nl: 'L’Oréal × Prada' }, place: { de: 'Düsseldorf', en: 'Düsseldorf', nl: 'Düsseldorf' },
    alt: { en: 'Drones draw a tilted perfume bottle above the Düsseldorf skyline.', nl: 'Drones tekenen een gekantelde parfumfles boven de skyline van Düsseldorf.' } },
  'vw-1': { name: { de: '50 Jahre VW Golf', en: '50 years of the VW Golf', nl: '50 jaar VW Golf' }, place: { de: 'Wolfgangsee', en: 'Lake Wolfgang', nl: 'Wolfgangsee' },
    alt: { en: 'The VW emblem made of drones above an illuminated stage and audience.', nl: 'Het VW-embleem van drones boven een verlicht podium en publiek.' } },
  'boellerciao-1': { name: { de: '#Böllerciao', en: '#Böllerciao', nl: '#Böllerciao' }, place: { de: 'Berlin', en: 'Berlin', nl: 'Berlijn' },
    alt: { en: 'Three people look up at a circle of yellow and red drones in the night sky.', nl: 'Drie mensen kijken naar een cirkel van gele en rode drones aan de nachtlucht.' } },
  'extraschicht-1': { name: { de: 'Extraschicht', en: 'Extraschicht', nl: 'Extraschicht' }, place: { de: 'Duisburg', en: 'Duisburg', nl: 'Duisburg' },
    alt: { en: 'The audience at the inner harbour looks at a blue sphere of drones above the water.', nl: 'Publiek aan de binnenhaven kijkt naar een blauwe bol van drones boven het water.' } },
  'herz-1': { place: { de: 'Nieheim', en: 'Nieheim', nl: 'Nieheim' },
    alt: { en: 'A red heart made of drones encloses a smaller blue heart above a dark meadow.', nl: 'Een rood hart van drones omsluit een kleiner blauw hart boven een donkere weide.' } },
  'frieden-1': { place: { de: 'Nieheim', en: 'Nieheim', nl: 'Nieheim' },
    alt: { en: 'A blue peace sign made of drones glows above a dark meadow.', nl: 'Een blauw vredesteken van drones licht op boven een donkere weide.' } },
  'abendhimmel-1': { name: { de: 'Heiratsantrag', en: 'Marriage proposal', nl: 'Huwelijksaanzoek' }, place: { de: 'Essen', en: 'Essen', nl: 'Essen' },
    alt: { en: 'Trees frame several pale blue drone figures in the evening sky.', nl: 'Bomen omlijsten enkele lichtblauwe dronefiguren aan de avondhemel.' } },
  'hochzeit-1': { name: { de: 'Hochzeit', en: 'Wedding', nl: 'Bruiloft' }, place: { de: 'Recklinghausen', en: 'Recklinghausen', nl: 'Recklinghausen' },
    alt: { en: 'Purple flowers made of drones glow above the treetops in the evening.', nl: 'Paarse bloemen van drones lichten ’s avonds op boven de boomkruinen.' } },
  'sea-you-1': { name: { de: 'Sea You', en: 'Sea You', nl: 'Sea You' },
    alt: { en: 'Above the festival crowd, blue drone lights spell “SEA YOU”.', nl: 'Boven het festivalpubliek staat in blauwe dronelichten „SEA YOU”.' } },
  'siemens-indoor-1': { name: { de: 'Siemens', en: 'Siemens', nl: 'Siemens' }, place: { de: 'Hannover Messe', en: 'Hannover Messe', nl: 'Hannover Messe' },
    alt: { en: 'Glowing drones hover above the stage of the Siemens trade-fair show in Hanover, the presenter below.', nl: 'Lichtgevende drones zweven boven het podium van de Siemens-beursshow in Hannover, met de presentator eronder.' } },
  'siemens-indoor-2': { name: { de: 'Siemens', en: 'Siemens', nl: 'Siemens' }, place: { de: 'Hannover Messe', en: 'Hannover Messe', nl: 'Hannover Messe' },
    alt: { en: 'Drones frame the Siemens Xcelerator symbol on the LED wall above the presenter.', nl: 'Drones omlijsten het Siemens Xcelerator-symbool op de ledwand boven de presentator.' } },
  'siemens-indoor-3': { name: { de: 'Siemens', en: 'Siemens', nl: 'Siemens' }, place: { de: 'Hannover Messe', en: 'Hannover Messe', nl: 'Hannover Messe' },
    alt: { en: 'Drones fly in front of an LED wall showing the drawing of an aircraft, the presenter on stage in front.', nl: 'Drones vliegen voor een ledwand met de tekening van een vliegtuig, met de presentator op het podium ervoor.' } },
};

export const DRONES = { de: 'Drohnen', en: 'drones', nl: 'drones' };
