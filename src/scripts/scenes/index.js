import { t as message } from "../../i18n/ui.mjs";
import { prepareCatalogScene } from "./catalog.js";
import { GROSS } from "./gross/index.js";
import { once } from "./load-once.js";

// Verwandte Fassungen teilen sich ein Modul. Der Bauname gilt anlassübergreifend.
const groups = [
  ["ringsLink heartTunnel lotus3d lotusStory butterfly2d butterfly3d butterflyStory ringStory weddingRings2d", () => import("./hochzeit.js")],
  ["kick2d kickHorizon kickStory diveHorizon diveStory", () => import("./jubilaeum.js")],
  ["qr2d qrHorizon qrStory qrLogoStory spiral2d spiral3d spiralStory", () => import("./launch.js")],
  ["book2d book3d bookStory harpHorizon harpStory dancer2d dancer3d dancerStory", () => import("./kultur.js")],
  ["fireworkSpark fireworkHorizon fireworkStory snow2d tree3d treeStory champagne3d", () => import("./winter.js")],
  ["compass2d compass3d travelStory dragon3d dragonStory wheel2d wheel3d wheelStory", () => import("./festival.js")],
  ["hummingbird2d hummingbird3d hummingbirdStory dolphin2d dolphin3d dolphinStory", () => import("./natur.js")],
  ["sphere3d", () => import("./kugel.js")],
  ["snow3d snowTree3d snowTreeStory snowTreeStarStory", () => import("./schnee.js")],
  ["fernsehturm2d fernsehturm3d fernsehturmPlus rheinturm2d rheinturm3d rheinturmPlus tor2d tor3d torPlus dom2d dom3d domPlus elphi2d elphi3d elphiPlus schwebebahn2d schwebebahn3d schwebebahnPlus schluessel2d schluessel3d schluesselPlus skyline2d skyline3d skylinePlus siegessaeule2d siegessaeule3d siegessaeulePlus jahre2d jahre3d jahrePlus", () => import("./wahrzeichen.js")],
  ["dragonRise dragonHead", () => import("./catalog-3d/drache.js")],
  ["cakeNumberStory tachoCarStory", () => import("./umbau-geschichten.js")],
  ["rings3d heart2d heartsStory flutes2d flutes3d flutesStory", () => import("./alt-ehe.js")],
  ["trophy2d trophy3d trophyStory", () => import("./alt-pokal.js")],
  ["bulb2d bulb3d bulbStory", () => import("./alt-gluehbirne.js")],
  ["clover2d clover3d cloverStory", () => import("./alt-kleeblatt.js")],
  ["shield shield3d shieldStory", () => import("./alt-wappen.js")],
  ["tower tower3d towerStory", () => import("./alt-fernsehturm.js")],
  ["rocket rocket3d rocketStory", () => import("./alt-rakete.js")],
  ["logo logo3d logoStory", () => import("./alt-logo.js")],
  ["notes2d masks masks3d maskStory curtain curtainStar curtainStory", () => import("./alt-theater.js")],
  ["clock clock3d clockStory champagneStory", () => import("./alt-uhr.js")],
];
const modules = new Map(groups.flatMap(([names, load]) => {
  const module = once(load);
  return names.split(" ").map((name) => [name, module]);
}));
const loadText = once(() => import("./text.js"));
const loadHeart = once(() => import("../heart-data.js"));
const loadDevil = once(() => import("./bokkenrijders-quelle.js"));
const loadSkull = once(() => import("./bokkenrijders.js"));
const textTiers = new Map(["SPARK", "HORIZON", "ODYSSEY"].map((tier) => ["text" + tier, tier]));
const aliases = {
  medalStory: "diveStory", fireworkFinale: "fireworkStory", planeStory: "travelStory",
  rocketLaunch: "rocketStory", moonStory: "rocketStory", maskStoryAll: "maskStory", clockStoryAll: "clockStory",
};
const slices = {
  diveStory: [0, 3], medalStory: [3, 4, () => message('showScenes.ripplesBecomeYourNumber')],
  fireworkStory: [0, 3], fireworkFinale: [3, 5],
  travelStory: [0, 4], planeStory: [4, 6, () => message('showScenes.paperPlaneFollowsTheRoute')],
  rocketLaunch: [0, 3], moonStory: [2, 4], maskStory: [0, 3], clockStory: [0, 4],
};
const canBeWhole = new Set(["diveStory", "fireworkStory", "travelStory", "maskStory", "clockStory"]);
const grossModules = new Map();

async function getBuilder(name) {
  if (modules.has(name)) return (await modules.get(name)()).builders[name];
  if (!Object.hasOwn(GROSS, name)) throw new Error(`Unbekannter Szenen-Bauname: ${name}`);
  if (!grossModules.has(name)) grossModules.set(name, once(GROSS[name]));
  return (await grossModules.get(name)()).builders[name];
}

/** Lädt die benötigten Module und Daten. Die zurückgegebene Funktion baut die Szene. */
export async function prepareScene(version, n) {
  const { build, caption } = version;
  if (build.startsWith("catalog:")) {
    const [, key, tier] = build.split(":");
    const render = await prepareCatalogScene(key, tier, n);
    return () => render(caption);
  }
  if (textTiers.has(build)) {
    const { textScene } = await loadText();
    return () => textScene(n, caption, version, textTiers.get(build));
  }
  if (build === "devilStory" || build === "bokkenrijdersStory") {
    const [source, skull] = await Promise.all([
      loadDevil().then(async (module) => { await module.loadFigure(); return module; }),
      build === "bokkenrijdersStory" ? loadSkull() : null,
    ]);
    return async () => skull
      ? skull.maskSkullStory(await source.devilBeat(n, caption), n, { linger: version.linger ?? 0 })
      : { beats: [await source.devilBeat(n, message('showScenes.theDevilFromOurBokkenrijdersShow'), 4)] };
  }
  const slice = version.whole && canBeWhole.has(build) ? null : slices[build];
  const name = aliases[build] ?? build;
  const [builder] = await Promise.all([
    getBuilder(name),
    build === "heartsStory" ? loadHeart().then((module) => module.loadHeartData()) : null,
    name === "maskStory" && !slice ? loadDevil().then((module) => module.loadFigure()) : null,
  ]);
  return async () => {
    const scene = await builder(n, caption, name === "maskStory" && slice ? { ...version, omitDevil: true } : version);
    if (!slice) return scene;
    const [from, to, first] = slice, beats = scene.beats.slice(from, to);
    if (first) beats[0] = { ...beats[0], caption: first() }; // Bildunterschrift in der Seitensprache (23.11.: war fest Deutsch)
    return { ...scene, beats };
  };
}

/** Zugriff für Motivprüfungen, ohne die übrigen Builder einzulesen. */
export const loadBuilder = getBuilder;
export const hasBuilder = (name) => modules.has(name);
