import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {COLOR_TOKENS, colorVar, rgbOf, isColorToken, colorTokenCSS} from '../src/lib/color-tokens.mjs';
import {packageSchema} from '../src/content/package-schema.mjs';
import {projectShowcaseSchema} from '../src/schemas/project-showcase.mjs';
import {describeSchema, schemaDescription} from './native-schema.mjs';
import {describe} from './web/native-schema.mjs';
import {fieldLabel, isTechnical} from './web/field-labels.mjs';
import {textFields, translatableFields} from '../src/lib/translatable-fields.mjs';

const root = new URL('../', import.meta.url);
test('colour registry has immutable unique identifiers, German labels and six-digit values', () => {
  assert.ok(Object.isFrozen(COLOR_TOKENS));
  assert.equal(new Set(COLOR_TOKENS.map(t => t.id)).size, COLOR_TOKENS.length);
  for (const token of COLOR_TOKENS) {
    assert.ok(Object.isFrozen(token));
    assert.match(token.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(token.value, /^#[0-9a-f]{6}$/);
    assert.ok(token.label && token.group);
    assert.equal(isColorToken(token.id), true);
    assert.equal(colorVar(token.id), `var(--c-${token.id})`);
    assert.deepEqual(rgbOf(token.id), token.value.slice(1).match(/../g).map(v => parseInt(v, 16)));
    assert.ok(colorTokenCSS().includes(`--c-${token.id}:${token.value}`));
  }
  assert.deepEqual(rgbOf('project-nfl'), [91,141,239]);
  assert.deepEqual(rgbOf('package-spark'), [255,158,41]);
  assert.deepEqual(rgbOf('package-horizon'), [219,100,232]);
  assert.deepEqual(rgbOf('package-odyssey'), [51,237,242]);
  for (const invalid of ['no-such-colour', '#5b8def', 'var(--amber)', '', null, ['amber']]) {
    assert.equal(isColorToken(invalid), false);
    assert.throws(() => colorVar(invalid), RangeError);
    assert.throws(() => rgbOf(invalid), RangeError);
  }
});

test('both colour schemas accept only registry ids and both field descriptor paths keep format', () => {
  for (const [schema, key] of [[packageSchema,'color'],[projectShowcaseSchema,'accent']]) {
    const field = schema.shape[key];
    for (const {id} of COLOR_TOKENS) assert.equal(field.safeParse(id).success, true);
    for (const value of ['#5b8def', [255,158,41], 'missing', '']) assert.equal(field.safeParse(value).success, false);
    const data = {[key]:'amber'};
    assert.equal(describeSchema(schema,data).fields.find(f => f.path[0] === key).format, 'color');
    const browserField = describe(schemaDescription(schema),data).fields.find(f => f.path[0] === key);
    assert.equal(browserField.format, 'color');
    assert.equal(isTechnical(browserField), false);
    assert.equal(fieldLabel(browserField), key === 'color' ? 'Paketfarbe' : 'Akzentfarbe');
  }
});

test('colour metadata excludes future fields from translation regardless of their name', () => {
  const record = {id:'project/example',data:{paint:'amber',caption:'Unsere Show'},fields:[
    {path:['paint'],kind:'text',format:'color'}, {path:['caption'],kind:'text'}
  ]};
  assert.deepEqual(translatableFields(record).map(f => f.path), [['caption']]);
  assert.equal(textFields(packageSchema,{color:'package-spark'}).find(f => f.path[0] === 'color').format, 'color');
});

async function filesAt(relative) {
  const out = [];
  for (const entry of await readdir(new URL(relative,root), {withFileTypes:true})) {
    const name = `${relative}/${entry.name}`;
    if (entry.isDirectory()) out.push(...await filesAt(name));
    else out.push(name);
  }
  return out;
}
// Artwork channels in logo/formation rendering are data; numerical fixed CSS colours are forbidden.
const namedColors = 'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'.split(' ').join('|');
const literal = new RegExp(String.raw`#[\da-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\((?!\s*(?:from\s+var\(|var\(|\$\{))|[:,(]\s*(?:${namedColors})(?=[\s,;)}])`, 'gi');
test('site styles, components and editor chrome contain no fixed colour literals', async () => {
  const fixedPattern = new RegExp(literal.source, 'i');
  for (const fixed of ['#12ab34', 'rgb(1 2 3 / .4)', 'color(srgb .2 .3 .4)', 'background: rebeccapurple;', 'linear-gradient(navy, white)']) assert.match(fixed,fixedPattern);
  for (const variable of ['var(--c-text)', 'rgb(from var(--c-text) r g b / .5)', 'color-mix(in srgb,var(--c-text),transparent)', 'rgba(${channels},.5)']) assert.doesNotMatch(variable,fixedPattern);
  const files = [...await filesAt('src/components'),...await filesAt('src/styles'),'editor/web/editor.css','editor/web/frame.js','src/scripts/site.ts','src/scripts/pricing.js'];
  const violations = [];
  for (const file of files) {
    const source = (await readFile(new URL(file,root), 'utf8')).replace(/\/\*[\s\S]*?\*\/|^\s*\/\/[^\n]*$/gm, comment => comment.replace(/[^\n]/g,' '));
    for (const match of source.matchAll(literal)) violations.push(`${file}:${source.slice(0,match.index).split('\n').length} ${match[0]}`);
  }
  assert.deepEqual(violations, []);
});

test('editor and iframe use the same variable definitions with no unresolved UI tokens', async () => {
  const definitions = await readFile(new URL('editor/web/ui-tokens.css',root),'utf8');
  const declared = new Set([...definitions.matchAll(/(--ui-[\w-]+)\s*:/g)].map(m => m[1]));
  for (const file of ['editor/web/editor.css','editor/web/frame.js','editor/web/ui-tokens.css']) {
    const source = await readFile(new URL(file,root),'utf8');
    for (const [,id] of source.matchAll(/var\((--ui-[\w-]+)/g)) assert.ok(declared.has(id), `${file}: ${id}`);
  }
  assert.match(await readFile(new URL('editor/web/editor.css',root),'utf8'), /@import "\.\/ui-tokens\.css"/);
  assert.match(await readFile(new URL('editor/web/frame.js',root),'utf8'), /uiTokens\.href = "\/editor\/ui-tokens\.css"/);
  assert.doesNotMatch(definitions.replace(/--ui-[\w-]+\s*:[^;]+;/g,''), literal);
});
