// Kuratierte Bildleitern (Gallery.astro). Material, Maße, Alt-Texte und Belege (Kunde, Ort, Drohnenzahl) stehen in
// public/media/galerie/manifest.json; hier steht nur, welche drei Bilder in welcher Reihenfolge stehen und wie sie
// zugeschnitten werden.
//
// Runde 7 (Marc, 19.11.2026): „Das Bilder-Grid sollte sich steadily als zusammenhängende Leiter von links nach rechts
// aufbauen … Drei Bilder in so einer von links nach rechts angeordneten Leiter, plus die Background-Dot-Shape, und mehr
// brauchen wir nicht.“ Deshalb je Galerie genau drei Bilder in derselben Form (ar), von links unten nach rechts oben,
// das stärkste Motiv oben rechts. Kein Bild unter der Textspalte, keine Spalten mit mehreren Bildern.
// items[0] steht links unten, items[2] rechts oben. pos = object-position (Fokus aufs Motiv), an den echten Bildern
// geprüft: Logo und Formation liegen vollständig im quadratischen Ausschnitt. field = Leuchtpunkt-Unterlage (DotField)
// als inset relativ zur Leiter, m = Lage bis --grid-stacked, focus = dichteste Stelle; sie liegt in der freien Fläche
// über der Treppe, damit sie dort als Fläche hinter den Bildern hervorschaut.
//
// Nicht verwendet (Sichtung 18.11.2026): nfl-loop-1 und ford-loop-1 (zu dunkel), rewe-fc-1 (neblig, Logo kaum zu
// erkennen, Bildrechte offen), publikum-1 (angeschnitten, unbelegt), nfl-2 (Hufeisen fast nur Schwarz),
// bokkenrijders-loop-1 (Marc, Runde 5: kein Video in dieser Section). Runde 7 aus der Galerie genommen, weil nur noch drei
// Plätze bleiben: prada-1, spotify-1, siemens-1, bokkenrijders-1/-2, nfl-1 (Werbung), herz-1, extraschicht-1,
// abendhimmel-1, sea-you-1 (Über uns), siemens-indoor-1/-3/-4/-7/-8 (Indoor). Sie bleiben im Manifest.

/** @typedef {{ slug: string, pos?: string }} Photo */
/** @typedef {{ inset: string, m?: string, focus?: string }} Field */
/** @typedef {{ ar: string, items: [Photo, Photo, Photo], field: Field }} Layout */

/** @type {Record<string, Layout>} */
export const GALLERY_LAYOUTS = {
  // Werbung #marketing: Logo-Shows großer Marken, von der Stadt über die Bühne ins Stadion.
  logos: {
    ar: '1 / 1',
    items: [{ slug: 'ford-1', pos: '47% 50%' }, { slug: 'vw-1', pos: '80% 50%' }, { slug: 'puma-1', pos: '40% 50%' }],
    field: { inset: '-10% 30% 26% 0%', m: '-12% 28% 30% -4%', focus: '60% 62%' },
  },
  // Über uns #nachhaltigkeit: Feste für alle, Zeichen für Demokratie, Publikum unter dem Himmel.
  willkommen: {
    ar: '1 / 1',
    items: [{ slug: 'hochzeit-1', pos: '50% 50%' }, { slug: 'frieden-1', pos: '41% 50%' }, { slug: 'boellerciao-1', pos: '50% 50%' }],
    field: { inset: '-10% 30% 26% 0%', m: '-12% 28% 30% -4%', focus: '60% 62%' },
  },
  // Indoor #referenzen: Standbilder aus dem Siemens-Video der Hannover Messe 2025 (echte FlyingStars-Show).
  indoor: {
    ar: '1 / 1',
    items: [{ slug: 'siemens-indoor-6', pos: '49% 50%' }, { slug: 'siemens-indoor-5', pos: '49% 50%' }, { slug: 'siemens-indoor-2', pos: '50% 50%' }],
    field: { inset: '-10% 30% 26% 0%', m: '-12% 28% 30% -4%', focus: '60% 62%' },
  },
};

export const GALLERY_SETS = /** @type {const} */ (['logos', 'willkommen', 'indoor']);

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
  'siemens-indoor-4': { name: { de: 'Siemens', en: 'Siemens', nl: 'Siemens' }, place: { de: 'Hannover Messe', en: 'Hannover Messe', nl: 'Hannover Messe' },
    alt: { en: 'Drones hover beside a double arrow on the LED wall above the stage of the Siemens trade-fair show.', nl: 'Drones zweven naast een dubbele pijl op de ledwand boven het podium van de Siemens-beursshow.' } },
  'siemens-indoor-5': { name: { de: 'Siemens', en: 'Siemens', nl: 'Siemens' }, place: { de: 'Hannover Messe', en: 'Hannover Messe', nl: 'Hannover Messe' },
    alt: { en: 'Drones sit at the corners of a grid of coloured squares on the LED wall, the presenter in front.', nl: 'Drones staan op de hoeken van een raster van gekleurde vierkanten op de ledwand, met de presentator ervoor.' } },
  'siemens-indoor-6': { name: { de: 'Siemens', en: 'Siemens', nl: 'Siemens' }, place: { de: 'Hannover Messe', en: 'Hannover Messe', nl: 'Hannover Messe' },
    alt: { en: 'Drones mark the corners of a glowing cube on the LED wall above the presenter.', nl: 'Drones markeren de hoeken van een lichtgevende kubus op de ledwand boven de presentator.' } },
  'siemens-indoor-7': { name: { de: 'Siemens', en: 'Siemens', nl: 'Siemens' }, place: { de: 'Hannover Messe', en: 'Hannover Messe', nl: 'Hannover Messe' },
    alt: { en: 'A circle of drones surrounds a glowing ring on the LED wall, the presenter below.', nl: 'Een cirkel van drones omringt een lichtgevende ring op de ledwand, met de presentator eronder.' } },
  'siemens-indoor-8': { name: { de: 'Siemens', en: 'Siemens', nl: 'Siemens' }, place: { de: 'Hannover Messe', en: 'Hannover Messe', nl: 'Hannover Messe' },
    alt: { en: 'Drones fly through a tunnel of light lines on the LED wall above the stage.', nl: 'Drones vliegen door een tunnel van lichtlijnen op de ledwand boven het podium.' } },
};

export const DRONES = { de: 'Drohnen', en: 'drones', nl: 'drones' };
