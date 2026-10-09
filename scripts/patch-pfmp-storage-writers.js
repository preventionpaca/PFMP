#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const appDir = process.argv[2];
if (!appDir) throw new Error('Répertoire Apps Script obligatoire.');
const file = path.join(appDir, 'EUC_PFMP_DEV190_Snapshot.js');
let source = fs.readFileSync(file, 'utf8');

function replaceFunction(name, replacement) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Fonction historique introuvable : ${name}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = bodyStart; i < source.length; i++) {
    const c = source[i];
    const n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        source = source.slice(0, start) + replacement + source.slice(i + 1);
        return;
      }
    }
  }
  throw new Error(`Fin de fonction historique introuvable : ${name}`);
}

replaceFunction('EUC_DEV190E_writeFamilyIndex_', `function EUC_DEV190E_writeFamilyIndex_(annee, famille, payload) {
  return EUC_DEV531_upsertFamilyIndex_(annee, famille, payload);
}`);
replaceFunction('EUC_DEV190I_syncOne', `function EUC_DEV190I_syncOne(payload) {
  return EUC_DEV531_syncLegacyDetail_(payload, false);
}`);
replaceFunction('EUC_DEV190J_syncOne', `function EUC_DEV190J_syncOne(payload) {
  return EUC_DEV531_syncLegacyDetail_(payload, true);
}`);

fs.writeFileSync(file, source);
