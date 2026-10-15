import {editable,inGroup} from './afe-meta.mjs';
import {z} from 'astro/zod';

// Page → visible section → editorial role. Lists own their item roles.
export const siteUiSchema=z.object({
  base: inGroup("Rahmen der Website",z.object({
    navigation: inGroup("Navigation und Bedienung",z.object({
      skipLink: z.string().describe("Text des Sprunglinks").meta({...editable({translatable:true})}),
      ariaLabel: z.string().describe("Barrierefreie Bezeichnung").meta({...editable({translatable:true})}),
      germanLanguage: z.string().describe("Bezeichnung der deutschen Sprachversion").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die Sprachauswahl benennt jede Sprache dynamisch über ihren Sprachcode."}),unused:"Die Sprachauswahl benennt jede Sprache dynamisch über ihren Sprachcode."}),
      pauseMotion: z.string().describe("Button zum Pausieren").meta({...editable({translatable:true})}),
      openMenu: z.string().describe("Button zum Öffnen").meta({...editable({translatable:true})}),
      closeMenu: z.string().describe("Button zum Schließen").meta({...editable({translatable:true})}),
      mobileLabel: z.string().describe("Bezeichnung der mobilen Navigation").meta({...editable({translatable:true})}),
      languageLabel: z.string().describe("Bezeichnung der Sprachauswahl").meta({...editable({translatable:true})}),
      resumeMotion: z.string().describe("Button zum Fortsetzen").meta({...editable({translatable:true})})
    }).strict().describe("Navigation und Bedienung")),
    footer: inGroup("Footer",z.object({
      intro: z.string().describe("Einleitung").meta({...editable({translatable:true})}),
      legalLabel: z.string().describe("Überschrift der rechtlichen Links").meta({...editable({translatable:true})}),
      previewLabel: z.string().describe("Kennzeichnung der Vorschau").meta({...editable({translatable:true})}),
      energyLabel: z.string().describe("Stromhinweis").meta({...editable({translatable:true})})
    }).strict().describe("Footer"))
  }).strict().describe("Rahmen der Website")),
  prices: inGroup("Preisseite",z.object({
    included: inGroup("Immer inklusive",z.object({
      label: z.string().describe("Abschnittsbezeichnung").meta({...editable({translatable:true})}),
      headline: z.string().describe("Überschrift").meta({...editable({translatable:true})}),
      intro: z.string().describe("Einleitung").meta({...editable({translatable:true})}),
      items: z.array(z.object({
        label: z.string().describe("Abschnittsbezeichnung").meta({...editable({translatable:true})}),
        title: z.string().describe("Titel des Eintrags").meta({...editable({translatable:true})}),
        text: z.string().describe("Beschreibung").meta({...editable({translatable:true})})
      }).strict().describe("Eintrag")).describe("Enthaltene Leistungen").meta(editable({array:{role:"list",reorderable:true,insertable:true,removable:true,itemLabel:["title"]}}))
    }).strict().describe("Immer inklusive")),
    extras: inGroup("Extras & Upgrades",z.object({
      label: z.string().describe("Abschnittsbezeichnung").meta({...editable({translatable:true})}),
      headline: z.string().describe("Überschrift").meta({...editable({translatable:true})}),
      intro: z.string().describe("Einleitung").meta({...editable({translatable:true})})
    }).strict().describe("Extras & Upgrades")),
    promise: inGroup("Preisversprechen",z.object({
      label: z.string().describe("Abschnittsbezeichnung").meta({...editable({translatable:true})}),
      headline: z.string().describe("Überschrift").meta({...editable({translatable:true})}),
      text: z.string().describe("Beschreibung").meta({...editable({translatable:true})}),
      buttonText: z.string().describe("Button-Text").meta({...editable({translatable:true})})
    }).strict().describe("Preisversprechen")),
    faq: inGroup("Fragen zum Preis",z.object({
      label: z.string().describe("Abschnittsbezeichnung").meta({...editable({translatable:true})}),
      headline: z.string().describe("Überschrift").meta({...editable({translatable:true})}),
      intro: z.string().describe("Einleitung").meta({...editable({translatable:true})}),
      buttonText: z.string().describe("Button-Text").meta({...editable({translatable:true})}),
      items: z.array(z.object({
        question: z.string().describe("Fragetext").meta({...editable({translatable:true})}),
        answer: z.string().describe("Antworttext").meta({...editable({translatable:true})})
      }).strict().describe("Eintrag")).describe("Preisfragen").meta(editable({array:{role:"list",reorderable:true,insertable:true,removable:true,itemLabel:["question"]}}))
    }).strict().describe("Fragen zum Preis")),
    cta: inGroup("Anfrage am Seitenende",z.object({
      headline: z.string().describe("Überschrift").meta({...editable({translatable:true})}),
      text: z.string().describe("Beschreibung").meta({...editable({translatable:true})}),
      buttonText: z.string().describe("Button-Text").meta({...editable({translatable:true})})
    }).strict().describe("Anfrage am Seitenende")),
    packages: inGroup("Pakete vergleichen",z.object({
      label: z.string().describe("Abschnittsbezeichnung").meta({...editable({translatable:true})}),
      headline: z.string().describe("Überschrift").meta({...editable({translatable:true})}),
      intro: z.string().describe("Einleitung").meta({...editable({translatable:true})}),
      price: inGroup("Preis und Anfrage",z.object({
        fromLabel: z.string().describe("Einleitung vor dem Preis").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Der vollständige Preis verwendet calculator.readout.fromPrice."}),unused:"Der vollständige Preis verwendet calculator.readout.fromPrice."}),
        forLabel: z.string().describe("Einleitung vor der Drohnenzahl").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die vollständige Basisangabe verwendet price.base."}),unused:"Die vollständige Basisangabe verwendet price.base."}),
        dronesLabel: z.string().describe("Einheit der Drohnenzahl").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die vollständige Basisangabe verwendet price.base."}),unused:"Die vollständige Basisangabe verwendet price.base."}),
        stepLabel: z.string().describe("Preiszusatz je Stufe").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die Preisstufe verwendet price.scale."}),unused:"Die Preisstufe verwendet price.scale."}),
        countLabel: z.string().describe("Beschriftung der Drohnenzahl").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die Preisstufe verwendet price.scale."}),unused:"Die Preisstufe verwendet price.scale."}),
        buttonText: z.string().describe("Button-Text").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Der vollständige Button verwendet price.inquiry."}),unused:"Der vollständige Button verwendet price.inquiry."}),
        scale: z.string().describe("Vorlage der Preisstufe").meta({...editable({translatable:true})}),
        maximum: z.string().describe("Vorlage der Obergrenze").meta({...editable({translatable:true})}),
        inquiry: z.string().describe("Vorlage des Anfrage-Buttons").meta({...editable({translatable:true})}),
        base: z.string().describe("Vorlage der Basiseckdaten").meta({...editable({translatable:true})})
      }).strict().describe("Preis und Anfrage"))
    }).strict().describe("Pakete vergleichen"))
  }).strict().describe("Preisseite")),
  configurator: inGroup("Show-Konfigurator",z.object({
    preview: inGroup("Vorschau der Show",z.object({
      ariaLabel: z.string().describe("Barrierefreie Bezeichnung").meta({...editable({translatable:true})}),
      unavailable: z.string().describe("Fehlermeldung").meta({...editable({translatable:true})}),
      galleryLabel: z.string().describe("Bezeichnung der Bildergalerie").meta({...editable({translatable:true})}),
      previousButton: z.string().describe("Bezeichnung des Zurück-Buttons").meta({...editable({translatable:true})}),
      restartButton: z.string().describe("Bezeichnung des Neustart-Buttons").meta({...editable({translatable:true})}),
      nextButton: z.string().describe("Bezeichnung des Weiter-Buttons").meta({...editable({translatable:true})}),
      ownText: z.string().describe("Name des eigenen Textmotivs").meta({...editable({translatable:true})}),
      captionSpark: z.string().describe("Bildunterschrift für SPARK").meta({...editable({translatable:true})}),
      captionHorizon: z.string().describe("Bildunterschrift für HORIZON").meta({...editable({translatable:true})}),
      captionOdyssey: z.string().describe("Bildunterschrift für ODYSSEY").meta({...editable({translatable:true})})
    }).strict().describe("Vorschau der Show")),
    steps: inGroup("Anlass und Aufwand",z.object({
      occasionLabel: z.string().describe("Beschriftung der Anlassauswahl").meta({...editable({translatable:true})}),
      effortLabel: z.string().describe("Beschriftung der Aufwandwahl").meta({...editable({translatable:true})})
    }).strict().describe("Anlass und Aufwand")),
    ownText: inGroup("Eigener Text am Himmel",z.object({
      label: z.string().describe("Beschriftung des Texteingabefelds").meta({...editable({translatable:true})}),
      optionalHint: z.string().describe("Zusatz zur Feldbeschriftung").meta({...editable({translatable:true})}),
      placeholder: z.string().describe("Beispiel im Eingabefeld").meta({...editable({translatable:true})}),
      hint: z.string().describe("Hinweis zum Eingabefeld").meta({...editable({translatable:true})})
    }).strict().describe("Eigener Text am Himmel")),
    result: inGroup("Ergebnis und Anfrage",z.object({
      dronesLabel: z.string().describe("Einheit der Drohnenzahl").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die vollständigen Eckdaten verwenden result.meta."}),unused:"Die vollständigen Eckdaten verwenden result.meta."}),
      priceNote: z.string().describe("Hinweis unter dem Preis").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die vollständigen Eckdaten verwenden result.meta."}),unused:"Die vollständigen Eckdaten verwenden result.meta."}),
      includedLabel: z.string().describe("Einleitung der enthaltenen Leistungen").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die vollständige Leistungsangabe verwendet result.includes."}),unused:"Die vollständige Leistungsangabe verwendet result.includes."}),
      buttonText: z.string().describe("Button-Text").meta({...editable({translatable:true})}),
      prototypeHint: z.string().describe("Hinweis zum Prototyp").meta({...editable({translatable:true})}),
      shortButtonText: z.string().describe("Kurzer Button-Text").meta({...editable({translatable:true})}),
      fromPrice: z.string().describe("Preisvorlage mit Betrag").meta({...editable({translatable:true})}),
      meta: z.string().describe("Vorlage der Paketeckdaten").meta({...editable({translatable:true})}),
      includes: z.string().describe("Vorlage der enthaltenen Leistungen").meta({...editable({translatable:true})})
    }).strict().describe("Ergebnis und Anfrage")),
    textStyles: inGroup("Schriftwahl",z.object({
      script: z.string().describe("Name der Schreibschrift-Option").meta({...editable({translatable:true})}),
      print: z.string().describe("Name der Druckschrift-Option").meta({...editable({translatable:true})}),
      initials: z.string().describe("Name der Initialen-Option").meta({...editable({translatable:true})})
    }).strict().describe("Schriftwahl")),
    summary: inGroup("Anfragezusammenfassung",z.object({
      occasion: z.string().describe("Vorlage der Anlasszusammenfassung").meta({...editable({translatable:true})}),
      motifs: z.string().describe("Vorlage der Motivzusammenfassung").meta({...editable({translatable:true})}),
      text: z.string().describe("Vorlage der Textzusammenfassung").meta({...editable({translatable:true})}),
      effort: z.string().describe("Vorlage der Aufwandzusammenfassung").meta({...editable({translatable:true})})
    }).strict().describe("Anfragezusammenfassung")),
    fallback: inGroup("Hinweis ohne JavaScript",z.object({
      noScript: z.string().describe("Hinweis ohne JavaScript").meta({...editable({translatable:true})}),
      pricesLink: z.string().describe("Text des Preislinks").meta({...editable({translatable:true})})
    }).strict().describe("Hinweis ohne JavaScript"))
  }).strict().describe("Show-Konfigurator")),
  blog: inGroup("Blog",z.object({
    index: inGroup("Blogübersicht",z.object({
      description: z.string().describe("Seitenbeschreibung").meta({...editable({translatable:true})})
    }).strict().describe("Blogübersicht"))
  }).strict().describe("Blog")),
  calculator: inGroup("Preisrechner",z.object({
    hero: inGroup("Auftakt und Animation",z.object({
      pauseMotion: z.string().describe("Button zum Pausieren").meta({...editable({translatable:true})}),
      label: z.string().describe("Abschnittsbezeichnung").meta({...editable({translatable:true})}),
      resumeMotion: z.string().describe("Button zum Fortsetzen").meta({...editable({translatable:true})}),
      reducedMotion: z.string().describe("Status bei reduzierter Bewegung").meta({...editable({translatable:true})})
    }).strict().describe("Auftakt und Animation")),
    controls: inGroup("Drohnen und Paketauswahl",z.object({
      dronesLabel: z.string().describe("Einheit der Drohnenzahl").meta({...editable({translatable:true})}),
      fromLabel: z.string().describe("Einleitung vor dem Preis").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Der Preis wird vollständig durch readout.fromPrice ausgegeben."}),unused:"Der Preis wird vollständig durch readout.fromPrice ausgegeben."}),
      priceNote: z.string().describe("Hinweis unter dem Preis").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die Ausgabe verwendet readout.priceNote."}),unused:"Die Ausgabe verwendet readout.priceNote."}),
      countLabel: z.string().describe("Beschriftung der Drohnenzahl").meta({...editable({translatable:true})}),
      packageLabel: z.string().describe("Beschriftung der Paketauswahl").meta({...editable({translatable:true})})
    }).strict().describe("Drohnen und Paketauswahl")),
    ownText: inGroup("Eigener Text am Himmel",z.object({
      label: z.string().describe("Beschriftung des Texteingabefelds").meta({...editable({translatable:true})}),
      optionalHint: z.string().describe("Zusatz zur Feldbeschriftung").meta({...editable({translatable:true})}),
      placeholder: z.string().describe("Beispiel im Eingabefeld").meta({...editable({translatable:true})}),
      hint: z.string().describe("Hinweis zum Eingabefeld").meta({...editable({translatable:true})})
    }).strict().describe("Eigener Text am Himmel")),
    result: inGroup("Ergebnis und Anfrage",z.object({
      durationLabel: z.string().describe("Beschriftung der Showdauer").meta({...editable({translatable:true})}),
      initialDuration: z.string().describe("Bisheriger Startwert der Showdauer").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die Dauer stammt aus dem gewählten Paket."}),unused:"Die Dauer stammt aus dem gewählten Paket."}),
      initialButton: z.string().describe("Bisheriger Button bei der Startauswahl").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Der Button verwendet selection.buttonText mit der tatsächlichen Drohnenzahl."}),unused:"Der Button verwendet selection.buttonText mit der tatsächlichen Drohnenzahl."}),
      compareButton: z.string().describe("Text des Vergleichslinks").meta({...editable({translatable:true})}),
      noScript: z.string().describe("Hinweis ohne JavaScript").meta({...editable({translatable:true})})
    }).strict().describe("Ergebnis und Anfrage")),
    readout: inGroup("Eckdaten der Auswahl",z.object({
      fromPrice: z.string().describe("Preisvorlage mit Betrag").meta({...editable({translatable:true})}),
      priceNote: z.string().describe("Hinweis unter dem Preis").meta({...editable({translatable:true})}),
      packageLabel: z.string().describe("Beschriftung der Paketauswahl").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die Ausgabe verwendet controls.packageLabel."}),unused:"Die Ausgabe verwendet controls.packageLabel."}),
      durationLabel: z.string().describe("Beschriftung der Showdauer").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die Ausgabe verwendet result.durationLabel."}),unused:"Die Ausgabe verwendet result.durationLabel."}),
      motifsLabel: z.string().describe("Beschriftung der Motivart").meta({...editable({translatable:true})}),
      sizeLabel: z.string().describe("Beschriftung der Motivabmessungen").meta({...editable({translatable:true})}),
      sizeHint: z.string().describe("Erklärung der Motivabmessungen").meta({...editable({translatable:true})}),
      size: z.string().describe("Vorlage für Breite und Höhe").meta({...editable({translatable:true})}),
      depth: z.string().describe("Vorlage für die Tiefe").meta({...editable({translatable:true})})
    }).strict().describe("Eckdaten der Auswahl")),
    selection: inGroup("Paketauswahl und Grenzen",z.object({
      buttonText: z.string().describe("Button-Text").meta({...editable({translatable:true})}),
      rangeLabel: z.string().describe("Vorlage des Schieberegler-Werts").meta({...editable({translatable:true})}),
      selected: z.string().describe("Kennzeichnung des gewählten Pakets").meta({...editable({translatable:true})}),
      limit: z.string().describe("Vorlage der maximalen Drohnenzahl").meta({...editable({translatable:true})}),
      above: z.string().describe("Vorlage des nächsten Pakets").meta({...editable({translatable:true})}),
      included: z.string().describe("Vorlage der enthaltenen Drohnenzahl").meta({...editable({translatable:true})}),
      forCount: z.string().describe("Vorlage der gewählten Drohnenzahl").meta({...editable({translatable:true})})
    }).strict().describe("Paketauswahl und Grenzen")),
    notes: inGroup("Hinweise zur Auswahl",z.object({
      alreadyIncluded: z.string().describe("Hinweis bei unterschrittener Basiszahl").meta({...editable({translatable:true})}),
      starts: z.string().describe("Hinweis zur Basiszahl").meta({...editable({translatable:true})}),
      largeFleet: z.string().describe("Hinweis zu großen Flotten").meta({...editable({translatable:true})}),
      upgrade: z.string().describe("Hinweis auf ein größeres Paket").meta({...editable({translatable:true})}),
      minimum: z.string().describe("Hinweis zur Mindestdrohnenzahl").meta({...editable({translatable:true})}),
      reserve: z.string().describe("Hinweis zur Reservemenge").meta({...editable({translatable:true})})
    }).strict().describe("Hinweise zur Auswahl")),
    ownTextStatus: inGroup("Textvorschau und Fehlermeldungen",z.object({
      tooLong: z.string().describe("Fehlermeldung bei zu langem Text").meta({...editable({translatable:true})}),
      fontFailed: z.string().describe("Fehlermeldung beim Laden der Schrift").meta({...editable({translatable:true})}),
      statistics: z.string().describe("Vorlage der Textstatistik").meta({...editable({translatable:true})}),
      fontStyle: z.string().describe("Vorlage des Schriftzusatzes").meta({...editable({translatable:true})}),
      lines: z.string().describe("Vorlage des Zeilenzusatzes").meta({...editable({translatable:true})}),
      unknown: z.string().describe("Vorlage unbekannter Zeichen").meta({...editable({translatable:true})})
    }).strict().describe("Textvorschau und Fehlermeldungen")),
    motifs: inGroup("Motivarten",z.object({
      catalogue: z.string().describe("Beschreibung der Katalogmotive").meta({...editable({translatable:true})}),
      individual: z.string().describe("Beschreibung individueller Motive").meta({...editable({translatable:true})}),
      storytelling: z.string().describe("Beschreibung der erzählten Motive").meta({...editable({translatable:true})})
    }).strict().describe("Motivarten"))
  }).strict().describe("Preisrechner")),
  caseStudy: inGroup("Projektgeschichte",z.object({
    labels: inGroup("Navigation und Abschnittsbezeichnungen",z.object({
      breadcrumbs: z.string().describe("Bezeichnung des Brotkrumenpfads").meta({...editable({translatable:true})}),
      home: z.string().describe("Text des Startseitenlinks").meta({...editable({translatable:true})}),
      projects: z.string().describe("Text des Projektübersichtslinks").meta({...editable({translatable:true})}),
      project: z.string().describe("Einleitung der Projektnummer").meta({...editable({translatable:true})}),
      numbers: z.string().describe("Bezeichnung des Zahlenabschnitts").meta({...editable({translatable:true})}),
      story: z.string().describe("Bezeichnung des Geschichtenabschnitts").meta({...editable({translatable:true})}),
      press: z.string().describe("Bezeichnung des Presseabschnitts").meta({...editable({translatable:true})}),
      nextProject: z.string().describe("Bisherige Einleitung des Folgeprojekts").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die vollständige Folgeprojektbezeichnung verwendet next.label."}),unused:"Die vollständige Folgeprojektbezeichnung verwendet next.label."}),
      drones: z.string().describe("Einheit der Drohnenzahl").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die Drohnenzahl ist Bestandteil von next.label."}),unused:"Die Drohnenzahl ist Bestandteil von next.label."}),
      inquiryButton: z.string().describe("Text des Anfrage-Buttons").meta({...editable({translatable:true})})
    }).strict().describe("Navigation und Abschnittsbezeichnungen")),
    formation: inGroup("Interaktive Formation",z.object({
      label: z.string().describe("Abschnittsbezeichnung").meta({...editable({translatable:true})}),
      replayButton: z.string().describe("Text des Wiederholen-Buttons").meta({...editable({translatable:true})}),
      pauseMotion: z.string().describe("Button zum Pausieren").meta({...editable({translatable:true})}),
      resumeMotion: z.string().describe("Button zum Fortsetzen").meta({...editable({translatable:true})}),
      sourceCount: z.string().describe("Vorlage der Drohnenzahl aus der Show-Datei").meta({...editable({translatable:true})}),
      detectedCount: z.string().describe("Vorlage der erkannten Drohnenzahl").meta({...editable({translatable:true})}),
      unavailable: z.string().describe("Fehlermeldung").meta({...editable({translatable:true})})
    }).strict().describe("Interaktive Formation")),
    gallery: inGroup("Bilder der Nacht",z.object({
      label: z.string().describe("Abschnittsbezeichnung").meta({...editable({translatable:true})}),
      headingPrefix: z.string().describe("Bisheriger Anfang der Galerieüberschrift").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die vollständige Galerieüberschrift verwendet gallery.headline."}),unused:"Die vollständige Galerieüberschrift verwendet gallery.headline."}),
      headingSuffix: z.string().describe("Bisheriges Ende der Galerieüberschrift").meta({...editable({translatable:true,visibility:"advanced",help:"Nicht verwendet: Die vollständige Galerieüberschrift verwendet gallery.headline."}),unused:"Die vollständige Galerieüberschrift verwendet gallery.headline."}),
      previousButton: z.string().describe("Bezeichnung des Zurück-Buttons").meta({...editable({translatable:true})}),
      nextButton: z.string().describe("Bezeichnung des Weiter-Buttons").meta({...editable({translatable:true})}),
      headline: z.string().describe("Überschrift").meta({...editable({translatable:true})})
    }).strict().describe("Bilder der Nacht")),
    setlist: inGroup("Die Choreografie",z.object({
      label: z.string().describe("Abschnittsbezeichnung").meta({...editable({translatable:true})}),
      headline: z.string().describe("Überschrift").meta({...editable({translatable:true})})
    }).strict().describe("Die Choreografie")),
    media: inGroup("Video und Galerie",z.object({
      playLabel: z.string().describe("Vorlage des Video-Buttons").meta({...editable({translatable:true})}),
      galleryLabel: z.string().describe("Bezeichnung der Bildergalerie").meta({...editable({translatable:true})})
    }).strict().describe("Video und Galerie")),
    next: inGroup("Nächstes Projekt",z.object({
      label: z.string().describe("Vorlage der Folgeprojektbezeichnung").meta({...editable({translatable:true})})
    }).strict().describe("Nächstes Projekt"))
  }).strict().describe("Projektgeschichte")),
  components: inGroup("Wiederverwendbare Bausteine",z.object({
    flightHero: inGroup("Showreel-Auftakt",z.object({
      buttonText: z.string().describe("Button-Text").meta({...editable({translatable:true})}),
      factsLabel: z.string().describe("Bezeichnung der Eckdaten").meta({...editable({translatable:true})})
    }).strict().describe("Showreel-Auftakt")),
    logoBar: inGroup("Kunden und Presse",z.object({
      clientLabel: z.string().describe("Bezeichnung der Kundenlogos").meta({...editable({translatable:true})}),
      pressLabel: z.string().describe("Bezeichnung der Presselogos").meta({...editable({translatable:true})})
    }).strict().describe("Kunden und Presse")),
    projectGrid: inGroup("Projektliste",z.object({
      dronesLabel: z.string().describe("Einheit der Drohnenzahl").meta({...editable({translatable:true})}),
      headline: z.string().describe("Überschrift").meta({...editable({translatable:true})})
    }).strict().describe("Projektliste")),
    team: inGroup("Teamliste",z.object({
      placeholder: z.string().describe("Hinweis bei fehlendem Porträt").meta({...editable({translatable:true})})
    }).strict().describe("Teamliste")),
    logo: inGroup("Website-Logo",z.object({
      homeLabel: z.string().describe("Bezeichnung des Logo-Links").meta({...editable({translatable:true})})
    }).strict().describe("Website-Logo")),
    video: inGroup("Videoplayer",z.object({
      unavailable: z.string().describe("Fehlermeldung").meta({...editable({translatable:true})}),
      buttonText: z.string().describe("Button-Text").meta({...editable({translatable:true})})
    }).strict().describe("Videoplayer")),
    faq: inGroup("Fragen zum Preis",z.object({
      headline: z.string().describe("Überschrift").meta({...editable({translatable:true})})
    }).strict().describe("Fragen zum Preis")),
    postList: inGroup("Artikelliste",z.object({
      headline: z.string().describe("Überschrift").meta({...editable({translatable:true})})
    }).strict().describe("Artikelliste")),
    comparison: inGroup("Vergleichstabelle",z.object({
      scrollLabel: z.string().describe("Vorlage der Tabellenbezeichnung").meta({...editable({translatable:true})})
    }).strict().describe("Vergleichstabelle"))
  }).strict().describe("Wiederverwendbare Bausteine"))
}).strict().describe("Gemeinsame Oberflächentexte").meta(editable({collection:{label:'Gemeinsame Oberflächentexte',title:[],icon:'mail',group:'Website-Daten',operations:['update'],placement:'frontend',i18n:{mode:'overlay'},policies:['flyingstars/media-ownership']}}));
