#!/usr/bin/env node
'use strict';
/*
 * DEV571 — Génère `ZZ_EUC_ACCES_Liste.js` dans un paquet Apps Script.
 *
 * Le verrou d'accès (`ZZ_EUC_ACCES_Verrou.js`) ne laisse un visiteur anonyme
 * appeler par `google.script.run` que des fonctions réellement utilisées par
 * une page. La liste est recalculée à chaque construction du paquet, à partir
 * du paquet lui-même (fichiers du socle compris), pour rester exacte.
 *
 *  - REFERENCEES : fonctions globales citées par une page HTML, ou citées dans
 *    le code serveur sur une ligne qui construit un appel `script.run`, ou
 *    entre guillemets (appel dynamique, déclencheur). Sur-approximation
 *    volontaire : une fonction de trop reste ouverte, une fonction oubliée
 *    casserait une page.
 *  - PUBLIQUES : fonctions des pages destinées aux élèves, aux familles et aux
 *    professeurs principaux (QR, formulaire, book des familles, carte des
 *    familles, accès PP). Elles restent ouvertes même quand la clé des liens
 *    enseignants est exigée.
 */
const fs = require('fs');
const path = require('path');

const PAGES_PUBLIQUES = [
  'Book_Entreprises_Eleves_DEV546',
  'Cartographie_PFMP_DEV441',
  'Acces_PP_DEV441',
  /* DEV598 : liens signés du bilan de visite (professeur, tuteur) ; chaque fonction vérifie son jeton. */
  'Bilan_Visite_DEV598',
  'Validation_Bilan_DEV598',
  /* DEV599 : livret de l'apprenti (lien signé de l'apprenti, lien de validation). */
  'Livret_Apprenti_DEV599',
  'Validation_Livret_DEV599',
  /* DEV600 : espace du professeur référent (lien signé ; demande de lien sans révéler les adresses). */
  'Espace_Referent_DEV600',
  'PFMP_Acces_QR',
  'PFMP_Acces_QR_V116',
  'PFMP_Continuation_QR_V117',
  'PFMP',
  'PFMP_Scripts',
  'PFMP_Eleves_Scripts',
  'PFMP_Natif_Startup',
  'Index',
  'Scripts'
];

function nomsGlobaux(sources) {
  const noms = new Set();
  for (const texte of sources) {
    for (const m of texte.matchAll(/^function\s+([A-Za-z$][\w$]*)\s*\(/gm)) noms.add(m[1]);
    for (const m of texte.matchAll(/^(?:var\s+)?([A-Za-z$][\w$]*)\s*=\s*function\b/gm)) noms.add(m[1]);
  }
  return [...noms].filter(n => !n.endsWith('_')).sort();
}

function motif(nom) {
  return new RegExp('(^|[^\\w$])' + nom.replace(/\$/g, '\\$') + '(?![\\w$])');
}

function calculer(dossier) {
  const fichiers = fs.readdirSync(dossier);
  const lire = f => fs.readFileSync(path.join(dossier, f), 'utf8');
  const code = fichiers.filter(f => /\.(js|gs)$/.test(f) && !/^ZZ_EUC_ACCES_/.test(f));
  const pages = fichiers.filter(f => /\.html$/.test(f));
  const noms = nomsGlobaux(code.map(lire));

  const citees = (texte) => noms.filter(n => texte.includes(n) && motif(n).test(texte));

  const referencees = new Set();
  for (const f of pages) citees(lire(f)).forEach(n => referencees.add(n));
  for (const f of code) {
    for (const ligne of lire(f).split('\n')) {
      if (!/script\.run|['"]/.test(ligne)) continue;
      for (const n of noms) {
        if (!ligne.includes(n)) continue;
        if (/script\.run/.test(ligne) && motif(n).test(ligne)) { referencees.add(n); continue; }
        if (new RegExp('[\'"]' + n.replace(/\$/g, '\\$') + '[\'"]').test(ligne)) referencees.add(n);
      }
    }
  }

  const publiques = new Set();
  for (const page of PAGES_PUBLIQUES) {
    const f = page + '.html';
    if (!fichiers.includes(f)) throw new Error('Page publique absente du paquet : ' + f);
    citees(lire(f)).forEach(n => publiques.add(n));
  }
  publiques.forEach(n => referencees.add(n));

  return {
    appelables: noms.length,
    referencees: [...referencees].sort(),
    publiques: [...publiques].sort()
  };
}

function ecrire(dossier, liste) {
  const corps = [
    '/** DEV571 — fichier généré par scripts/generate-acces-liste.js. Ne pas modifier. */',
    'var EUC_ACCES_REFERENCEES_ = ' + JSON.stringify(liste.referencees) + ';',
    'var EUC_ACCES_PUBLIQUES_ = ' + JSON.stringify(liste.publiques) + ';',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(dossier, 'ZZ_EUC_ACCES_Liste.js'), corps);
}

if (require.main === module) {
  const dossier = process.argv[2];
  if (!dossier) {
    console.error('Usage : generate-acces-liste.js <dossier apps-script du paquet>');
    process.exit(2);
  }
  const liste = calculer(dossier);
  ecrire(dossier, liste);
  console.log(`Verrou d'accès : ${liste.referencees.length} fonctions utilisées par les pages, ` +
    `dont ${liste.publiques.length} publiques, sur ${liste.appelables} appelables.`);
}

module.exports = { calculer, ecrire, PAGES_PUBLIQUES };
