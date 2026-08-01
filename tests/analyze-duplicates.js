const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'apps-script');
const files = fs.readdirSync(root).filter((name) => /\.(?:js|gs)$/.test(name)).sort();
const declarations = new Map();

function findClosingBrace(source, opening) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = opening; i < source.length; i++) {
    const c = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && next === '/') { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '/' && next === '/') { lineComment = true; i++; continue; }
    if (c === '/' && next === '*') { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  throw new Error(`Accolade fermante introuvable à l'index ${opening}`);
}

function normalized(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '');
}

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const re = /(?:^|\n)\s*function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g;
  let match;
  while ((match = re.exec(source))) {
    const opening = source.indexOf('{', match.index + match[0].indexOf('function'));
    const closing = findClosingBrace(source, opening);
    const line = source.slice(0, match.index).split('\n').length;
    const item = { file, line, body: normalized(source.slice(match.index, closing + 1)) };
    if (!declarations.has(match[1])) declarations.set(match[1], []);
    declarations.get(match[1]).push(item);
  }
}

const duplicates = [...declarations.entries()].filter(([, items]) => items.length > 1);
for (const [name, items] of duplicates.sort(([a], [b]) => a.localeCompare(b))) {
  const strict = new Set(items.map((item) => item.body)).size === 1;
  console.log(`${strict ? 'STRICT' : 'DIVERGENT'}\t${name}\t${items.map((item) => `${item.file}:${item.line}`).join(', ')}`);
}
console.log(`TOTAL\t${duplicates.length}`);
