#!/usr/bin/env node
'use strict';
/*
 * DEV574 — Retire du paquet Apps Script le code que rien ne peut appeler.
 *
 * Règle, appliquée jusqu'à stabilité :
 *  - une déclaration de fonction de premier niveau `function NOM(...)` est
 *    retirée si NOM n'apparaît nulle part ailleurs dans le paquet (code
 *    serveur, pages HTML, chaînes de caractères : appels google.script.run,
 *    déclencheurs, appels dynamiques compris) ;
 *  - un modèle HTML est retiré si son nom n'apparaît dans aucun autre fichier.
 * Un nom déclaré plusieurs fois n'est jamais retiré (versions successives).
 * Les points d'entrée Apps Script (doGet, onOpen…) sont toujours gardés.
 *
 * Lancé après la minification : les commentaires ont disparu et ne retiennent
 * donc plus de code mort. Le code est analysé avec l'analyseur JavaScript
 * livré avec Node (node --expose-internals).
 */
const fs = require('fs');
const path = require('path');

let acorn;
try {
  acorn = require('internal/deps/acorn/acorn/dist/acorn');
} catch (e) {
  throw new Error('Lancer avec : node --expose-internals strip-dead-code.js <dossier>');
}

const ENTREES = new Set(['doGet', 'doPost', 'onOpen', 'onEdit', 'onInstall', 'onChange', 'onFormSubmit', 'onSelectionChange']);
const MOT = /[A-Za-z_$][\w$]*/g;
/* Un déclencheur installé autrefois peut encore appeler une fonction dont le
 * nom n'est plus écrit dans le code : ces noms-là sont toujours gardés. */
const GARDER = /trigger|declench|d[eé]clench|schedul|planif|prewarm|refresh|nightly|quotid|cron|tick/i;

function declarations(source) {
  const ast = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, allowHashBang: true });
  return ast.body.filter(n => n.type === 'FunctionDeclaration' && n.id).map(n => ({ nom: n.id.name, debut: n.start, fin: n.end }));
}

/* Compte les mots de tout le paquet, hors du texte de chaque déclaration. */
function compter(fichiers) {
  const total = new Map();
  for (const f of fichiers.values()) {
    for (const m of f.texte.matchAll(MOT)) total.set(m[0], (total.get(m[0]) || 0) + 1);
  }
  return total;
}

function alleger(dossier) {
  const fichiers = new Map();
  for (const nom of fs.readdirSync(dossier)) {
    if (!/\.(js|gs|html)$/.test(nom)) continue;
    fichiers.set(nom, { nom, texte: fs.readFileSync(path.join(dossier, nom), 'utf8'), code: /\.(js|gs)$/.test(nom) });
  }
  const avant = [...fichiers.values()].reduce((a, f) => a + Buffer.byteLength(f.texte), 0);
  const retirees = [], modeles = [];

  for (let tour = 0; tour < 50; tour++) {
    const mots = compter(fichiers);
    const decl = new Map(); /* nom -> [{fichier, debut, fin}] */
    for (const f of fichiers.values()) {
      if (!f.code) continue;
      for (const d of declarations(f.texte)) {
        if (!decl.has(d.nom)) decl.set(d.nom, []);
        decl.get(d.nom).push(Object.assign({ fichier: f.nom }, d));
      }
    }
    const aRetirer = new Map(); /* fichier -> [{debut, fin}] */
    let n = 0;
    for (const [nom, liste] of decl) {
      if (liste.length !== 1 || ENTREES.has(nom) || GARDER.test(nom)) continue;
      const d = liste[0], f = fichiers.get(d.fichier);
      const dedans = (f.texte.slice(d.debut, d.fin).match(MOT) || []).filter(x => x === nom).length;
      if ((mots.get(nom) || 0) - dedans > 0) continue;
      if (!aRetirer.has(d.fichier)) aRetirer.set(d.fichier, []);
      aRetirer.get(d.fichier).push(d);
      retirees.push(nom);
      n++;
    }
    for (const [fichier, zones] of aRetirer) {
      const f = fichiers.get(fichier);
      zones.sort((a, b) => b.debut - a.debut).forEach(z => { f.texte = f.texte.slice(0, z.debut) + f.texte.slice(z.fin); });
    }
    /* Modèles HTML cités nulle part ailleurs. */
    for (const f of [...fichiers.values()]) {
      if (f.code) continue;
      const base = f.nom.replace(/\.html$/, '');
      const cite = [...fichiers.values()].some(o => o !== f && new RegExp('(^|[^\\w$])' + base.replace(/\$/g, '\\$') + '(?![\\w$])').test(o.texte));
      if (!cite) { fichiers.delete(f.nom); modeles.push(f.nom); n++; }
    }
    if (!n) break;
  }

  /* Écriture : un fichier serveur vidé est supprimé du paquet. */
  const supprimes = [];
  for (const nom of fs.readdirSync(dossier)) {
    if (!/\.(js|gs|html)$/.test(nom)) continue;
    const f = fichiers.get(nom);
    if (!f) { fs.unlinkSync(path.join(dossier, nom)); continue; }
    if (f.code) {
      declarations(f.texte); /* le résultat doit rester analysable */
      if (!f.texte.replace(/[;\s]/g, '').length) { fs.unlinkSync(path.join(dossier, nom)); supprimes.push(nom); continue; }
    }
    fs.writeFileSync(path.join(dossier, nom), f.texte);
  }
  const apres = [...fichiers.values()].filter(f => !supprimes.includes(f.nom)).reduce((a, f) => a + Buffer.byteLength(f.texte), 0);
  return { avant, apres, fonctions: retirees, modeles, fichiersVides: supprimes };
}

if (require.main === module) {
  const dossier = process.argv[2];
  if (!dossier) { console.error('Usage : node --expose-internals strip-dead-code.js <dossier apps-script>'); process.exit(2); }
  const r = alleger(dossier);
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(r, null, 1));
  console.log(`Code inatteignable retiré : ${r.fonctions.length} fonctions, ${r.modeles.length} modèles HTML, ` +
    `${r.fichiersVides.length} fichiers vidés ; ${(r.avant / 1e6).toFixed(2)} Mo → ${(r.apres / 1e6).toFixed(2)} Mo (code et pages).`);
}

module.exports = { alleger };
