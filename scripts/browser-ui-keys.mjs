import assert from 'node:assert/strict';
import ts from 'typescript';
import messages from '../src/i18n/ui.json' with { type: 'json' };
import packages from '../src/content/show-packages.json' with { type: 'json' };

function nodesIn(root) {
  const nodes = [];
  function walk(node) { nodes.push(node); ts.forEachChild(node, walk); }
  walk(root);
  return nodes;
}

// Dynamische Aufrufe dürfen nur aus vollständigen Schlüsseln auswählen. Die Tabellen und
// Aufrufargumente kommen aus dem Quellcode, damit neue Szenen und Varianten automatisch mitgeprüft werden.
export function checkBrowserUiKeys(code, id) {
  if (!/\/ui\.mjs['"]/.test(code) && !/\/(?:package-identity|price-core)\.mjs$/.test(id)) return;
  const filename = '/browser-ui-source.ts';
  const source = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true);
  const nodes = nodesIn(source);
  const uiImports = nodes.filter(ts.isImportDeclaration)
    .filter(node => /\/ui\.mjs$/.test(node.moduleSpecifier.text));
  const bindings = uiImports.flatMap(node => {
    const named = node.importClause?.namedBindings;
    assert.ok(named && ts.isNamedImports(named) && !node.importClause.name, `${id}: benannte UI-Importe erforderlich`);
    return [...named.elements];
  });
  const imported = (name) => bindings.filter(node => (node.propertyName ?? node.name).text === name).map(node => node.name);

  // Nur echte Referenzen zum importierten Symbol prüfen, auch bei namensgleichen lokalen Variablen.
  if (bindings.length) {
    const options = { noLib: true, noResolve: true };
    const host = ts.createCompilerHost(options);
    host.getSourceFile = (name) => name === filename ? source : undefined;
    const checker = ts.createProgram([filename], options, host).getTypeChecker();
    const names = [...imported('t'), ...imported('createTranslator')];
    const symbols = new Set(names.map(node => checker.getSymbolAtLocation(node)));
    for (const node of nodes) {
      if (!ts.isIdentifier(node) || names.includes(node) || !symbols.has(checker.getSymbolAtLocation(node))) continue;
      assert.ok(ts.isCallExpression(node.parent) && node.parent.expression === node, `${id}: ${node.text} muss direkt aufgerufen werden`);
    }
  }
  const translators = new Set(imported('t').map(node => node.text));
  const factories = imported('createTranslator').map(node => node.text);
  const declarations = nodes.filter(ts.isVariableDeclaration);
  const calls = nodes.filter(ts.isCallExpression);
  const factoryCalls = calls.filter(node => factories.includes(node.expression.getText()));
  for (const call of factoryCalls) {
    if (ts.isVariableDeclaration(call.parent) && ts.isIdentifier(call.parent.name)) translators.add(call.parent.name.text);
    else if (id.endsWith('/lib/price.mjs') && ts.isPropertyAssignment(call.parent) && call.parent.name.getText() === 't') {
      // priceParts und priceLine werden in price-core.mjs geprüft.
    } else assert.fail(`${id}: createTranslator ohne prüfbare Bindung`);
  }

  if (id.endsWith('/package-identity.mjs') || id.endsWith('/price-core.mjs')) translators.add('t');
  if (!translators.size) return;
  const check = (node) => {
    assert.ok(node && ts.isStringLiteralLike(node), `${id}: kein statischer UI-Schlüssel: ${node?.getText()}`);
    assert.ok(Object.hasOwn(messages, node.text), `${id}: unbekannter UI-Schlüssel ${node.text}`);
  };
  const lookup = (name) => {
    const matches = declarations.filter(node => node.name.getText() === name && node.parent.flags & ts.NodeFlags.Const);
    assert.equal(matches.length, 1, `${id}: mehrdeutige Schlüsseltabelle ${name}`);
    return matches[0].initializer;
  };
  function checkKey(arg, call) {
    if (arg && ts.isConditionalExpression(arg)) {
      checkKey(arg.whenTrue, call);
      checkKey(arg.whenFalse, call);
    } else if (arg && ts.isElementAccessExpression(arg) && ['ART_NAME_KEYS', 'YOUR_SHOW_KEYS', 'stepIncludes', 'EIGENE_3DPLUS_SZENE', 'DRAW'].includes(arg.expression.getText())) {
      const table = lookup(arg.expression.getText());
      assert.ok(table && ts.isObjectLiteralExpression(table), `${id}: Schlüsseltabelle ${arg.getText()}`);
      for (const prop of table.properties) {
        assert.ok(ts.isPropertyAssignment(prop));
        check(prop.initializer);
      }
    } else if (arg?.getText() === 'data[name].labelKey' && id.endsWith('/package-identity.mjs')) {
      for (const [name, entry] of Object.entries(packages)) if (name !== 'services') {
        assert.ok(Object.hasOwn(messages, entry.labelKey), `${id}: unbekannter Paket-Schlüssel ${entry.labelKey}`);
      }
    } else if (arg?.getText() === 'key') {
      for (let parent = call.parent; parent; parent = parent.parent) {
        if (ts.isArrowFunction(parent) && parent.parameters[0]?.name.getText() === 'key' &&
            ts.isCallExpression(parent.parent) && parent.parent.expression.getText() === 'caps.map') {
          const checkCaps = (caps) => {
            assert.ok(caps && ts.isArrayLiteralExpression(caps), `${id}: Szenenbeschriftungen in caps`);
            caps.elements.forEach(check);
          };
          if (id.endsWith('/gross/robotergreifer.js')) {
            // robotArmStory hat eine zweite, kürzere Beschriftung für die Werkhalle.
            const fallback = nodes.find(node => ts.isBindingElement(node) && node.name.getText() === 'caps');
            checkCaps(fallback?.initializer);
            for (const use of calls.filter(node => node.expression.getText() === 'builders.robotArmStory')) {
              const options = use.arguments[2];
              assert.ok(options && ts.isObjectLiteralExpression(options));
              const variant = options.properties.find(prop => ts.isPropertyAssignment(prop) && prop.name.getText() === 'caps');
              checkCaps(variant?.initializer);
            }
          } else checkCaps(lookup('caps'));
          return;
        }
        if (ts.isFunctionDeclaration(parent) && parent.name?.text === 'floorNote' && parent.parameters[0]?.name.getText() === 'key') {
          check(parent.parameters[0].initializer);
          for (const use of calls.filter(node => node.expression.getText() === 'floorNote' && node.arguments.length)) check(use.arguments[0]);
          return;
        }
      }
      const key = lookup('key');
      assert.ok(key && ts.isElementAccessExpression(key) && key.expression.getText() === 'ART', `${id}: Herkunft von key`);
      const art = lookup('ART');
      assert.ok(art && ts.isObjectLiteralExpression(art), `${id}: Schlüsseltabelle ART`);
      art.properties.forEach(prop => { assert.ok(ts.isPropertyAssignment(prop)); check(prop.initializer); });
    } else check(arg);
  }
  for (const call of calls) if (translators.has(call.expression.getText())) checkKey(call.arguments[0], call);
}

export function browserUiKeyGuard() {
  return {
    name: 'flyingstars:browser-ui-keys',
    apply: 'build',
    applyToEnvironment({ name }) { return name === 'client'; },
    transform(code, id) {
      if (id.includes('/src/')) checkBrowserUiKeys(code, id);
    },
  };
}
