/* DEV648 — Import JotForm : liste complète des lignes bloquées, et proposition d'importer les autres. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const src = read('apps-script/EUC_PFMP_DEV466_JotFormReliable.js'), page = read('apps-script/Migration_JotForm_PFMP_V160.html');

test('message de blocage : toutes les lignes (pas seulement 5) et leurs identifiants', () => {
  const k = {}; vm.createContext(k); vm.runInContext(/function EUC_DEV648_messageBlocage_[^]*?\n\}/.exec(src)[0], k);
  const errs = Array.from({ length: 7 }, (_, i) => ({ id: 10 + i, eleve: 'Élève ' + i, erreur: 'Dates PFMP absentes ou illisibles.' }));
  const msg = k.EUC_DEV648_messageBlocage_(errs, 42);
  assert.match(msg, /^PRÉCONTRÔLE BLOQUÉ — aucune écriture effectuée\. 7 ligne\(s\) bloquée\(s\) sur 42 :/);
  assert.ok(msg.includes('• Élève 6 : Dates PFMP absentes'), 'la 7e ligne est listée');
  assert.match(msg, /\[\[BLOQUEES:10,11,12,13,14,15,16\]\]$/);
  assert.match(src, /throw new Error\(EUC_DEV648_messageBlocage_\(errors,selected\.length\)\);/);
});

test('l’import reste tout ou rien : le précontrôle bloque avant toute écriture', () => {
  const prep = /function EUC_DEV466_prepare_[^]*?\n\}/.exec(src)[0];
  assert.ok(!/EUC_ENT_grist\('(post|patch)'/.test(prep), 'aucune écriture pendant le précontrôle');
  const imp = /function EUC_DEV466_importSelection[^]*?\n\}/.exec(src)[0];
  assert.ok(imp.indexOf('EUC_DEV466_prepare_') < imp.indexOf("EUC_ENT_grist('post'"));
});

test('page : marqueur masqué, retrait des lignes bloquées après confirmation, nouveau précontrôle', () => {
  assert.match(page, /replace\(\/\\s\*\\\[\\\[BLOQUEES:\[\\d,\]\*\\\]\\\]\/,''\)/);
  assert.match(page, /Retirer ces '\+bloquees\.length\+' ligne\(s\) de la sélection et importer les '\+restantes\.length\+' autre\(s\) \?/);
  assert.match(page, /bloquees\.forEach\(function\(id\)\{chosen\.delete\(id\);chosen\.delete\(String\(id\)\);\}\);/);
  assert.match(page, /setTimeout\(function\(\)\{btn\.click\(\);\},30\);/);
  assert.match(page, /btn\.disabled=false;\s*btn\.innerHTML=previous;\s*var brut=/, 'le bouton retrouve son état avant la proposition');
});
test('dates JotForm en français restées dans le tampon : lues au moment de l’import', () => {
  const k = { JSON, Object, String }; vm.createContext(k);
  vm.runInContext(/var EUC_V160_MOIS_[^;]*;/.exec(read('apps-script/EUC_MIGRATION_JOTFORM_V160.gs'))[0] + '\n' + /function EUC_V160_txt_[^\n]*/.exec(read('apps-script/EUC_MIGRATION_JOTFORM_V160.gs'))[0] + '\n' + /function EUC_V160_dateIso_[^]*?\n\}/.exec(read('apps-script/EUC_MIGRATION_JOTFORM_V160.gs'))[0] + '\n' + /function EUC_DEV466_txt_[^\n]*/.exec(src)[0] + '\n' + /function EUC_DEV648_datesLisibles_[^]*?\n\}/.exec(src)[0], k);
  const ligne = { id: 5, Date_debut_brut: 'nov. 23, 2026', Date_fin_brut: 'déc. 18, 2026' };
  const r = k.EUC_DEV648_datesLisibles_(ligne);
  assert.equal(r.Date_debut_brut, '2026-11-23'); assert.equal(r.Date_fin_brut, '2026-12-18');
  assert.equal(ligne.Date_debut_brut, 'nov. 23, 2026', 'le tampon n’est pas modifié');
  assert.equal(k.EUC_DEV648_datesLisibles_({ Date_debut_brut: '2026-11-23', Date_fin_brut: '18/12/2026' }).Date_fin_brut, '2026-12-18');
  const vide = k.EUC_DEV648_datesLisibles_({ Date_debut_brut: '', Date_fin_brut: '', Raw_JSON: JSON.stringify({ 'Date de début': 'janv. 5, 2027', 'Date de fin': 'févr. 6, 2027' }) });
  assert.equal(vide.Date_debut_brut, '2027-01-05'); assert.equal(vide.Date_fin_brut, '2027-02-06');
  assert.equal(k.EUC_DEV648_datesLisibles_({ Date_debut_brut: '', Date_fin_brut: '' }).Date_debut_brut, '', 'vraiment absente : reste absente (bloquée)');
  assert.match(src, /function EUC_DEV466_prepare_\(selected,ctx,payload\)\{\n  selected=\(selected\|\|\[\]\)\.map\(EUC_DEV648_datesLisibles_\);/);
});
test('stockage des propriétés : anciens compteurs quotidiens Grist effacés (14 derniers jours gardés)', () => {
  const u = read('apps-script/EUC_PFMP_DEV447_GristUsage.js'), k = {}; vm.createContext(k);
  vm.runInContext(/var EUC_DEV447_USAGE_PREFIX_[^\n]*/.exec(u)[0] + '\n' + /var EUC_DEV447_USAGE_RETENTION_[^\n]*/.exec(u)[0] + '\n' + /function EUC_DEV648_clesUsageAnciennes_[^]*?\n\}/.exec(u)[0] + '\n' + /function EUC_DEV648_purgerUsageAncien_[^]*?\n\}/.exec(u)[0], k);
  const P = k.EUC_DEV447_USAGE_PREFIX_, jours = Array.from({ length: 60 }, (_, i) => '2026-' + String(9 + Math.floor(i / 30)).padStart(2, '0') + '-' + String(1 + i % 30).padStart(2, '0'));
  const store = {}; jours.forEach(d => store[P + d] = '{}'); store.AUTRE_REGLAGE = 'x'; store.EUC_DEV447_GRIST_USAGE_INDEX_V1 = '[]';
  const props = { getKeys: () => Object.keys(store), deleteProperty: key => { delete store[key]; } };
  assert.equal(k.EUC_DEV648_purgerUsageAncien_(props), 46);
  assert.deepEqual(Object.keys(store).filter(x => x.startsWith(P)).map(x => x.slice(P.length)), jours.slice(-14));
  assert.ok(store.AUTRE_REGLAGE && 'EUC_DEV447_GRIST_USAGE_INDEX_V1' in store, 'les autres propriétés ne sont pas touchées');
  assert.match(u, /if\(!raw\)try\{EUC_DEV648_purgerUsageAncien_\(props\);\}catch\(ePurge\)\{\}/);
  assert.match(src, /le stockage interne du script est plein/); assert.match(u, /function EUC_DEV648_proprietesLourdes_/);
  assert.match(src, /EUC_DEV648_purgerUsageAncien_\(\);\}catch\(ePurge\)\{\}/);
  const imp = /function EUC_DEV466_importSelection[^]*?\n\}/.exec(src)[0];
  assert.ok(imp.indexOf('EUC_DEV648_purgerUsageAncien_') < imp.indexOf('EUC_DEV425_beginImportItems_'), 'purge avant le marquage DIRTY');
});
test('écriture Grist : un envoi par ensemble identique de colonnes ; motif Grist affiché en cas de refus', () => {
  const k = {}; vm.createContext(k); vm.runInContext(/function EUC_DEV648_parColonnes_[^]*?\n\}/.exec(src)[0], k);
  const g = JSON.parse(JSON.stringify(k.EUC_DEV648_parColonnes_([{ fields: { A: 1, B: 2 } }, { id: 4, fields: { A: 1 } }, { fields: { B: 3, A: 5 } }])));
  assert.deepEqual(g, [[{ fields: { A: 1, B: 2 } }, { fields: { B: 3, A: 5 } }], [{ id: 4, fields: { A: 1 } }]]);
  assert.deepEqual(JSON.parse(JSON.stringify(k.EUC_DEV648_parColonnes_([]))), []);
  const imp = /function EUC_DEV466_importSelection[^]*?\n\}/.exec(src)[0];
  assert.match(imp, /EUC_DEV648_parColonnes_\(creates\)\.forEach/); assert.match(imp, /EUC_DEV648_parColonnes_\(updates\)\.forEach/);
  assert.ok(!/\{records:creates\}|\{records:updates\}/.test(imp), 'plus d’envoi groupé hétérogène');
  const gr = read('apps-script/EUC_ENT_Grist.gs');
  assert.match(gr, /Grist indisponible ou requête refusée \('\+code\+'\)'\+\(det\?/); assert.match(gr, /replace\(\/\\\?\.\*\$\/,''\)/, 'chemin sans paramètres');
});
console.log(n + ' tests DEV648 réussis.');
