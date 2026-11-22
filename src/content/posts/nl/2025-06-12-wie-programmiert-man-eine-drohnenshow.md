---
authorId: florian-becker
title: "Hoe programmeer je een droneshow? Zo doen wij het"
description: "Hoe wij een droneshow programmeren: jullie idee, vliegroutes, muziek en licht, simulatie en het aftellen op de showavond."
date: "2025-06-12T00:00:00.000Z"
updated: "2026-11-22T00:00:00.000Z"
tags:
  - Drohnenshow
  - Programmierung
cover:
  src: https://flyingstars.art/wp-content/uploads/2025/05/drohnenprogrammierung-1.jpg
  alt: Een man houdt een drone naast een laptop, terwijl een vrouw met een tablet ernaast staat.
  width: 1680
  height: 1120
draft: false
translationSourceHash: e934b97e1b18e74081de6964972674f1dfa34fc566331e5f74bb1a771cd4f1d7
translationContractVersion: 2
translationEvidence:
  version: 2
  addressing: stable-keys
  locale: nl
  sourceFingerprint: e934b97e1b18e74081de6964972674f1dfa34fc566331e5f74bb1a771cd4f1d7
  legacy:
    provenanceFile: docs/i18n/content-provenance.json
    migration: I01-v2-2026-11-04
  fields:
    - address: /body
      sourceFingerprint: c14f32eb8e8fbafe46a8bc2138bd9ca8bacf5714779c5d47584b41904852c5cd
      targetFingerprint: fc5a79096dbe93d427759bf124bddaca9e503e1235e69536b9aa9e17ced314b3
      status: adopted-existing
    - address: /cover/alt
      sourceFingerprint: debf6f3890f470655260d1c585061012aab399099fdb5f2a21f10d398a9ba7e0
      targetFingerprint: 825076cde2c3d53eda1db68a418f0a6a2dbfbcb7e27e97abae8064d198df860c
      status: adopted-existing
    - address: /description
      sourceFingerprint: ec73ddf113c81d097787533321cbb94cac55eb0747a126404baa1f4214dba455
      targetFingerprint: 387de8251713f43e653a2bd220a4f9b4929fc10945aa5b41dabb13ee6627d416
      status: adopted-existing
    - address: /title
      sourceFingerprint: 1b4fdd2bc73c1bbd4c5f94bcf1174c0656341a727461852a1cf64e5351b0e1e2
      targetFingerprint: 4247bd1bd7a008327df4c1690dd36ff639639b7f5c65f9c6eba28297b46b136e
      status: adopted-existing
---

Bij een show tekenen honderden drones een logo, een tekst of een heel verhaal aan de hemel. Zodat elke drone op het juiste moment op de juiste plek oplicht, programmeren we ze vooraf allemaal afzonderlijk.

Wij zijn FlyingStars en vliegen sinds 2021 droneshows, inmiddels meer dan 150. Hier laten we jullie zien waarmee we werken en hoe jullie show bij ons ontstaat. Hoe één drone in de zwerm werkt, lezen jullie uitgebreider in [Hoe werkt een droneshow?](/nl/blog/2025-01-14-wie-funktioniert-drohnenshow-drohne/)

## Wat betekent “programmeren” bij ons?

Elke drone krijgt van ons een eigen vliegroute. Onze showsoftware legt die vooraf tot op de centimeter vast, samen met de timing en de lichtvolgorde. Tijdens de show bestuurt niemand de drones met een afstandsbediening, en sturing in realtime is er niet. Elke drone vliegt precies wat we vooraf hebben gepland.

Die planning doen we zelf. Alejandro uit ons designteam maakt van jullie verhaal een choreografie in 2D en 3D, en Patrick stelt de vloot samen en zorgt voor het technische verloop. Externe dienstverleners halen we daar niet bij.

## Waarmee we werken

Op het showterrein draait het om twee dingen: onze drones en het grondstation.

### Onze showdrone

Elk van onze drones weegt maar zo'n 300 gram. Bovenop zit de led die aan de hemel een lichtpunt wordt. GPS en een gyroscoop houden de drone op koers en in balans. Camera's hebben ze niet, en hun stroom komt uit twee gewone oplaadbare AA-batterijen, die we net als de motoren en rotoren los kunnen vervangen.

### Het grondstation

Voor de start staan alle drones in een raster op de grond. Vanaf het grondstation zetten we de show op elke drone afzonderlijk, geven we het startsein en houden we de hele zwerm in de gaten. Zijn route vliegt elke drone zelf. Een digitaal hek, de geofence, houdt ze binnen het showgebied. Heeft een drone een probleem, dan vliegt hij meestal automatisch terug of landt hij in noodgevallen in de veiligheidszone, waar niemand staat.

## Hoe jullie show ontstaat

Jullie show ontstaat bij ons in vijf stappen, en jullie zijn er zo veel bij betrokken als jullie willen.

### Idee en motief

We beginnen met een gesprek over de aanleiding en over wat er aan de hemel te zien moet zijn. Samen ontwikkelen we de verhaallijn, de motieven en de muziek. Ons designteam bouwt de motieven daarna als 3D-modellen, bijvoorbeeld een ster, jullie logo of een tekst.

### Van motief naar vliegroute

Elke drone is één lichtpunt. Voor een letter hebben we zo'n 10 tot 13 drones nodig, voor een gedetailleerd logo eerder 100 tot 200. We verdelen de punten van een motief over de drones en leggen voor elke drone de weg vast van het startraster naar zijn plek, en van daar verder naar het volgende beeld. Zo ontstaat een ruwe animatie van start tot landing, nog helemaal zonder kleur.

### Muziek en licht

Langs deze ruwe animatie monteren we de muziek, met rechtenvrije nummers of jullie eigen muziekkeuze. De muziekmontage zit in het pakket. Als laatste zetten we kleuren en lichteffecten op de accenten in de muziek, zodat vliegroute, timing en licht op dezelfde tijdlijn lopen.

### Simulatie en testvlucht

Voordat de show op de drones gaat, spelen we hem in onze software volledig af. We controleren de afstanden tussen de drones, en komen twee routes te dicht bij elkaar, dan passen we ze aan. Daarna doen we een testvlucht met echte drones. Buiten moet de formatie ook tegen wind kunnen. Onze drones blijven stabiel in formatie tot windkracht 5 en ook bij lichte motregen.

### De showavond

Op de dag zelf beginnen we zo'n drieënhalf uur voor de show met de opbouw. Het veiligheidsgebied van ongeveer 100 × 100 meter houden we tijdens de show vrij van onbevoegden, en kort ervoor controleren we de GPS-ontvangst, het weer en de vliegverbodzones. Dan geven we jullie dj of technici via portofoon of telefoon het aftellen door. Bij nul drukt iemand op “Play” en stijgen de drones op.

## Hoeveel tijd jullie moeten inplannen

Vraag zo vroeg mogelijk aan. Twee tot drie maanden voorbereidingstijd is ideaal, vooral als de showlocatie ingewikkelde vergunningen nodig heeft. Als het haast heeft, plannen we jullie show tegen een expresstoeslag ook binnen een of twee weken.

Het geluid ter plaatse regelen jullie of jullie technici. De afgemonteerde muziek sturen we vooraf, bijvoorbeeld als WAV-bestand, zodat er op de avond alleen nog de countdown overblijft. Boeken jullie al in het jaar ervoor, dan krijgen jullie 10 % vroegboekkorting.

## Jullie show met FlyingStars

Een show duurt bij ons meestal zo'n 13 minuten, tot 25 minuten is mogelijk. Hoeveel drones jullie motieven nodig hebben en wat dat kost, zien jullie op onze [prijzenpagina](/nl/drohnenshow-preise/). Of [vertel ons meteen over jullie idee](/nl/kontakt/), we antwoorden binnen 48 uur.
