// Kuratierte Anordnung der Bildgalerien (Gallery.astro). Material, Maße, Alt-Texte und Belege (Kunde, Ort, Drohnenzahl)
// stehen in public/media/galerie/manifest.json; hier steht nur, welches Bild wo sitzt und wie es zugeschnitten wird.
//
// Breit (ab --grid-expanded): drei Spalten 4fr · 6fr · 3fr. Links der Text darüber; das letzte Bild jeder Spalte wächst
// bis zur gemeinsamen Unterkante (fill, nur Motive, die einen höheren Zuschnitt vertragen); Mitte das dominante Bild oben; rechts schmale Spalte, die mit Kopf neben der Überschrift
// beginnt (rise) oder abgesetzt tiefer anfängt. ar = Seitenverhältnis, pos = object-position (Fokus aufs Logo).
// Schmal: dichtes Raster aus drei Spalten (Plain „Some of our favourite moments“). m.o = Reihenfolge, m.s = Breite in
// Spalten (Summe je Reihe 3), m.ar = Seitenverhältnis; ohne m.ar übernimmt die Kachel die Höhe ihrer Nachbarin.
// Jeder Zuschnitt ist an den echten Bildern geprüft: Logo und Formation liegen immer vollständig im Rahmen.
//
// Nicht verwendet (Sichtung 18.11.2026): nfl-loop-1 und ford-loop-1 (zu dunkel), rewe-fc-1 (neblig, Logo kaum zu
// erkennen, Bildrechte offen), publikum-1 (angeschnitten, unbelegt), nfl-2 (Hufeisen fast nur Schwarz), bokkenrijders-1 (identisch mit dem Poster des Loops).

/** @typedef {{ o: number, s: 1 | 2 | 3, ar?: string }} Mobile */
/** @typedef {{ slug: string, ar: string, pos?: string, fill?: boolean, m: Mobile }} Tile */
/** @typedef {{ lead: Tile[], cols: [Tile[], Tile[]], rise?: boolean }} Layout */

/** @type {Record<string, Layout>} */
export const GALLERY_LAYOUTS = {
  // Werbung #marketing: Logos großer Marken. PUMA über dem Stadion trägt, die rechte Spalte steigt neben die Überschrift.
  logos: {
    rise: true,
    lead: [
      { slug: 'vw-1', ar: '3 / 2', pos: '60% 40%', fill: true, m: { o: 9, s: 1 } },
    ],
    cols: [
      [
        { slug: 'puma-1', ar: '16 / 9', pos: '50% 0%', m: { o: 1, s: 3, ar: '16 / 9' } },
        { slug: 'bokkenrijders-loop-1', ar: '16 / 9', pos: '50% 40%', m: { o: 4, s: 2, ar: '16 / 9' } },
        { slug: 'siemens-1', ar: '800 / 343', pos: '50% 60%', fill: true, m: { o: 3, s: 2, ar: '800 / 343' } },
      ],
      [
        { slug: 'nfl-1', ar: '1 / 1', m: { o: 2, s: 1 } },
        { slug: 'prada-1', ar: '800 / 410', pos: '50% 60%', m: { o: 8, s: 2, ar: '800 / 410' } },
        { slug: 'bokkenrijders-2', ar: '1 / 1', pos: '41% 50%', m: { o: 5, s: 1 } },
        { slug: 'spotify-1', ar: '800 / 433', m: { o: 7, s: 2, ar: '800 / 433' } },
        { slug: 'ford-1', ar: '4 / 3', pos: '50% 45%', fill: true, m: { o: 6, s: 1 } },
      ],
    ],
  },
  // Über uns #nachhaltigkeit: Feste für alle. #Böllerciao trägt, die rechte Spalte beginnt abgesetzt tiefer.
  willkommen: {
    // Unter dem Text zwei Bilder, sonst würde ein einzelnes bei 1920 px zum überlangen Hochformat
    lead: [
      { slug: 'hochzeit-1', ar: '16 / 9', pos: '50% 35%', m: { o: 5, s: 2, ar: '16 / 9' } },
      { slug: 'sea-you-1', ar: '1 / 1', pos: '50% 30%', fill: true, m: { o: 8, s: 1 } },
    ],
    cols: [
      [
        { slug: 'boellerciao-1', ar: '800 / 411', pos: '50% 40%', m: { o: 1, s: 3, ar: '800 / 411' } },
        { slug: 'extraschicht-1', ar: '800 / 469', pos: '50% 60%', fill: true, m: { o: 2, s: 2, ar: '800 / 469' } },
      ],
      [
        { slug: 'herz-1', ar: '1 / 1', pos: '48% 15%', m: { o: 3, s: 1 } },
        { slug: 'frieden-1', ar: '1 / 1', pos: '47% 20%', m: { o: 4, s: 1 } },
        { slug: 'abendhimmel-1', ar: '4 / 3', pos: '60% 50%', fill: true, m: { o: 7, s: 2, ar: '800 / 505' } },
      ],
    ],
  },
};

export const GALLERY_SETS = /** @type {const} */ (['logos', 'willkommen']);

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
};

export const DRONES = { de: 'Drohnen', en: 'drones', nl: 'drones' };
