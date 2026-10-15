#!/usr/bin/env node
'use strict';
/*
 * DEV574 — Allège le code serveur du paquet Apps Script.
 *
 * Mesure du 16 octobre 2026 : chaque appel au serveur (ouverture de page ou
 * google.script.run) paie environ 1 seconde par mégaoctet de code du projet,
 * avant même l'exécution. On retire donc commentaires et espaces des fichiers
 * .js/.gs du paquet. Aucun nom n'est changé (pas de « mangle »), aucune
 * transformation du code (pas de « compress ») : seul le texte est compacté.
 *
 * Le module terser est cherché dans l'installation système (/usr/share/nodejs)
 * puis dans les modules Node habituels. S'il manque, la construction échoue :
 * un paquet non allégé ne doit pas partir en silence.
 */
const fs = require('fs');
const path = require('path');

function chargerTerser() {
  const essais = ['terser', '/usr/share/nodejs/terser'];
  for (const m of essais) {
    try { return require(m); } catch (e) { /* essai suivant */ }
  }
  throw new Error('Module terser introuvable : installez-le (apt install node-terser ou npm i -g terser).');
}

async function minifier(dossier) {
  const { minify } = chargerTerser();
  const fichiers = fs.readdirSync(dossier).filter(f => /\.(js|gs)$/.test(f));
  let avant = 0, apres = 0;
  for (const f of fichiers) {
    const chemin = path.join(dossier, f);
    const source = fs.readFileSync(chemin, 'utf8');
    const r = await minify(source, {
      compress: false,
      mangle: false,
      format: { comments: false, ascii_only: false },
      ecma: 2019,
      module: false
    });
    if (typeof r.code !== 'string' || !r.code.length && source.trim().length) {
      throw new Error('Minification vide pour ' + f);
    }
    fs.writeFileSync(chemin, r.code);
    avant += Buffer.byteLength(source);
    apres += Buffer.byteLength(r.code);
  }
  return { fichiers: fichiers.length, avant, apres };
}

if (require.main === module) {
  const dossier = process.argv[2];
  if (!dossier) {
    console.error('Usage : minify-apps-script.js <dossier apps-script du paquet>');
    process.exit(2);
  }
  minifier(dossier).then(r => {
    console.log(`Code serveur allégé : ${r.fichiers} fichiers, ${(r.avant / 1e6).toFixed(2)} Mo → ${(r.apres / 1e6).toFixed(2)} Mo.`);
  }).catch(e => { console.error(e.message || e); process.exit(1); });
}

module.exports = { minifier };
