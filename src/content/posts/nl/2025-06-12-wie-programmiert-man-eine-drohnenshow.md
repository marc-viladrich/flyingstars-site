---
authorId: florian-becker
title: Hoe wordt een droneshow geprogrammeerd?
description: "Hoe een droneshow wordt geprogrammeerd: showdrones, choreografiesoftware, vliegroutes,
  simulaties en tests vóór de live-show."
date: "2025-06-12T00:00:00.000Z"
updated: "2026-09-18T00:00:00.000Z"
tags:
  - Drohnenshow
  - Programmierung
cover:
  src: /media/wordpress/94d1ca9baa8870a62ae2942a7e503612e2943e9e6d295815c0a1efb9b785c6be.jpg
  alt: Een man houdt een drone naast een laptop, terwijl een vrouw met een tablet ernaast staat.
  width: 1680
  height: 1120
draft: false
translationSourceHash: 6178e682d917f1b87f31c47350ae7a637590ccc2e513d3036fb4190da7476f28
translationContractVersion: 2
translationEvidence:
  version: 2
  addressing: stable-keys
  locale: nl
  sourceFingerprint: 6178e682d917f1b87f31c47350ae7a637590ccc2e513d3036fb4190da7476f28
  legacy:
    provenanceFile: docs/i18n/content-provenance.json
    migration: I01-v2-2026-11-04
  fields:
    - address: /body
      sourceFingerprint: 256af8bf49f7d2411b41837eecb163e3efd60f18b839ef77b765fb371ce3a924
      targetFingerprint: 5bd6874288ccbf61d4dcd718321b42b6dca64bfa02d969b8477d634155c97f75
      status: adopted-existing
    - address: /cover/alt
      sourceFingerprint: c77be7984da8ca55607921e741bcc3c774e96227a765307dc811e54cff2b0243
      targetFingerprint: 825076cde2c3d53eda1db68a418f0a6a2dbfbcb7e27e97abae8064d198df860c
      status: adopted-existing
    - address: /description
      sourceFingerprint: ccc352593482a4ed6bff39a6ff1defe6a8401d43f4e10d0b7ea680257606382a
      targetFingerprint: 85c7f9bccc557c207702ce9847ad2f9c4a74e5c76ac9bbbe85926e58f0ac7d08
      status: adopted-existing
    - address: /title
      sourceFingerprint: fcc6e42b2001364688f42c3ee74186057378157cd51caf8d05ba36b92855ec4b
      targetFingerprint: f6477758c432119c723f1e897aa2fecea662186e5b91ecb342ebfec3d18ef6fd
      status: adopted-existing
---
Op stadsfeesten, bedrijfsjubilea en muziekfestivals trekken droneshows wereldwijd publiek. Lichtgevende drones stijgen op en vormen logo's, harten en bewegende animaties. Maar hoe ontstaat zo'n show? Welke techniek zit erachter en hoe werkt het programmeren van drones?

In dit artikel leggen we uit hoe een droneshow wordt geprogrammeerd, van het eerste idee tot een synchroon vliegende formatie.

![Een man houdt een drone naast een laptop, terwijl een vrouw met een tablet ernaast staat.](/media/wordpress/0bb0965834ac5f92c9e687dda34482ca07df2ea842dc1a084b152efece898e92.jpg)

## Wat is droneprogrammering?

Droneprogrammering is de technische basis van elke droneshow. Het omvat de **nauwkeurige planning, synchronisatie en uitvoering** van een complete voorstelling, meestal met tientallen tot honderden drones, naast de besturing van afzonderlijke toestellen.

Een showdrone volgt een **vooraf bepaalde, GPS-gebaseerde vliegroute** en wordt niet met een afstandsbediening gevlogen. Die routes worden vooraf op de computer geprogrammeerd en gesimuleerd en daarna naar elke drone gestuurd.

## De belangrijkste bouwstenen van een droneshow

### 1. Speciale showdrones

[Showdrones](/nl/blog/2025-03-31-drohnen-feuerwerk-als-alternative/) zijn **kleiner en lichter** dan gewone cameradrones. Ze hebben felle leds en zijn ontworpen om synchroon te vliegen. Meestal hebben ze **GPS, een hoogtemeter en een gyroscoop**, soms ook RTK, of Real Time Kinematics, voor zeer nauwkeurige positionering.

### 2. Plannings- en choreografiesoftware

Met software zoals **[DroneShowSoftware](https://www.droneshowsoftware.com/)**, **Blender** met geschikte plug-ins of oplossingen van fabrikanten zoals **Verity** of Intel wordt elke vliegbeweging ontworpen.

Elke drone krijgt een eigen route, timing en lichtsequentie. De uitdaging is botsingen te vermijden en soepele overgangen en herkenbare vormen te maken, afgestemd op muziek en licht.

### 3. Simulatie en tests

Voordat er buiten wordt gevlogen, wordt alles op de computer gesimuleerd. Gegevens van de dronehardware worden beoordeeld om de betrouwbaarheid van de show te controleren. Wind, vliegsnelheid en startposities worden gecontroleerd voordat er getest mag worden.

### 4. Communicatie- en veiligheidssystemen

Een **centraal grondstation** communiceert met de hele dronevloot. Een stabiele verbinding met elk toestel is nodig. Het station bewaakt de uitvoering en grijpt zo nodig in, bijvoorbeeld bij GPS-uitval of een dreigende botsing.

## Een mogelijk programmeerproces

### 1. Het idee en het 3D-ontwerp

Het begint met een concept: een bedrijfslogo aan de hemel, een danser of een geanimeerd verhaal in meerdere scènes. Deze beelden worden meestal in **3D-software** ontworpen.

### 2. Vliegroutes en lichtontwerp

De 3D-modellen worden omgezet in losse punten, elk vertegenwoordigd door een drone. Elke beweging heeft een **vliegroute** nodig en elk lichtsignaal een **tijdstip**. Hier krijgt de programmering vorm.

### 3. Simulatie op de computer

De planningssoftware simuleert vliegroutes in realtime. Zo worden te kleine afstanden en schokkerige bewegingen zichtbaar. Aanpassingen zijn in deze fase eenvoudiger dan op het veld.

### 4. Uploaden en veldtests

Na geslaagde simulaties wordt de definitieve code **op de drones geladen**. Tijdens testvluchten onder echte omstandigheden worden de laatste details verfijnd.

### 5. De live-show

Vóór het evenement volgen de laatste veiligheidscontroles van **GPS-signaalsterkte, weer en vliegverbodzones**. Tijdens de show bewaakt het grondstation het verloop, terwijl elke drone zelfstandig zijn route volgt.

## Droneshows van FlyingStars

We zijn gespecialiseerd in **drone-lichtshows** en combineren techniek met creatieve concepten voor sportevenementen, grote stadsfeesten, bedrijfsevenementen en privéfeesten.

Bekijk onze [prijzen](/nl/drohnenshow-preise/) en vraag een show aan.

![FlyingStars-logo in zwart, paars en turquoise](/media/wordpress/350a8cc09aa9f85f1626c8c5e166eaac33cc2e79a4cd8041453ac8536b470ff0.jpg)
