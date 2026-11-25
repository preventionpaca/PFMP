/* DEV735 — Effectifs : total détaillé (mixité / classe entière), entreprises estimées, établissement avec ses classes entières rattachées, cache sans recalcul. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const J = x => JSON.parse(JSON.stringify(x));
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
function ctx() { const k = { String, Number, Array, Object, JSON, Date }; vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV592_Effectifs.js'), k); return k; }
const ap = ent => ({ code: 'APPRENTI', entreprise: ent });
const m = { annee: '2026-2027', classes: [
  { id: 1, nom: '1BTS MV', etab: 'LGT', modeApprentissage: 'MIXITE', eleves: [{ id: 1 }, { id: 2 }, { id: 3, apprentissage: ap('GARAGE A') }],
    periodes: [{ id: 1, resume: { statuts: { 1: 'AVEC', 2: 'AVEC' }, fiches: { 1: { entreprise: 'GARAGE B' }, 2: { entreprise: 'GARAGE C' } } } }] },
  { id: 2, nom: '2BTS ELEC Alt', etab: 'LP', rattachement: 'LGT', modeApprentissage: 'CLASSE_ENTIERE', opco: 'CFAI', periodes: [], eleves: [{ id: 4, apprentissage: ap('ENEDIS') }, { id: 5, apprentissage: ap('GARAGE A') }, { id: 6, apprentissage: ap('AFPI PROVENCE') }] },
  { id: 3, nom: 'TPMMA', etab: 'GRETA', modeApprentissage: 'FORMATION_CONTINUE', opco: 'GRETA', periodes: [], eleves: [{ id: 7 }, { id: 8 }] },
  { id: 4, nom: 'TPEEB', etab: 'GRETA', modeApprentissage: 'CLASSE_ENTIERE', opco: 'GRETA', periodes: [], eleves: [{ id: 9, apprentissage: ap('SOLAIRE SA') }, { id: 10, apprentissage: ap('') }] }] };
test('total général : apprentis détaillés en mixité / classe entière, entreprises estimées sans double compte', () => {
  const t = J(ctx().EUC_DEV592_calcul_(m)).total;
  assert.deepEqual([t.apprentis, t.apprentisMixite, t.apprentisClasseEntiere, t.stagiaires], [6, 1, 5, 2]);
  assert.deepEqual([t.entreprises, t.entreprisesNonRenseignees, t.entreprisesEstimees, t.general], [5, 2, 9, true], 'GARAGE A une fois ; 2 sans employeur + 2 stagiaires FC');
});
test('LGT : entreprises des PFMP, des apprentis en mixité et des classes entières rattachées ; organismes : estimation avec stagiaires FC', () => {
  const r = J(ctx().EUC_DEV592_calcul_(m)), t = nom => r.groupes.find(g => g.nom === nom).totaux;
  assert.deepEqual([t('LGT').entreprises, t('LGT').entreprisesNonRenseignees, t('LGT').entreprisesEstimees], [4, 1, 5], 'GARAGE A/B/C + ENEDIS ; AFPI = non renseignée');
  assert.deepEqual([t('CFAI').entreprises, t('CFAI').entreprisesNonRenseignees, t('CFAI').entreprisesEstimees], [2, 1, 3]);
  assert.deepEqual([t('GRETA').entreprises, t('GRETA').entreprisesNonRenseignees, t('GRETA').stagiaires, t('GRETA').entreprisesEstimees], [1, 1, 2, 4]);
});
test('cache : même témoin Grist → résultat rendu sans recalcul ; témoin différent → rendu marqué périmé ; « Mettre à jour » → recalcul', () => {
  const k = ctx(); let calculs = 0, store = {}, temoin = 'T1';
  k.EUC_SUIVI2_exigerAdmin_ = () => ({}); k.EUC_SUIVI2_VERSION_ = '1.0.0-dev.735'; k.EUC_SUIVI2_temoin_ = () => temoin;
  k.EUC_SUIVI2_modele_ = () => { calculs++; return Object.assign({ calculeLe: 'x', temoin }, m); };
  k.EUC_DEV572_lire_ = c => store[c] ? JSON.parse(store[c]) : null; k.EUC_DEV572_ecrire_ = (c, v) => { store[c] = JSON.stringify(v); return true; };
  let r = k.EUC_DEV592_effectifs(''); assert.deepEqual([calculs, r.depuisCache, r.perime], [1, false, false]);
  r = k.EUC_DEV592_effectifs(''); assert.deepEqual([calculs, r.depuisCache, r.perime, r.total.apprentis], [1, true, false, 6], 'aucune modification : affiché direct');
  temoin = 'T2'; r = k.EUC_DEV592_effectifs(''); assert.deepEqual([calculs, r.depuisCache, r.perime], [1, true, true], 'modifié : ancien résultat tout de suite, signalé');
  r = k.EUC_DEV592_effectifs('', { forcer: true }); assert.deepEqual([calculs, r.depuisCache, r.perime], [2, false, false]);
  r = k.EUC_DEV592_effectifs(''); assert.deepEqual([calculs, r.perime], [2, false]);
  k.EUC_SUIVI2_temoin_ = () => { throw new Error('Grist indisponible'); }; r = k.EUC_DEV592_effectifs(''); assert.equal(r.perime, true, 'témoin illisible : jamais présenté comme à jour');
  assert.match(k.EUC_DEV592_cle_('2026-2027'), /^EUC_DEV592_EFF_V2_20262027_100dev735$/);
});
test('page d’accueil : chargement rapide puis recalcul automatique si périmé ; bouton = recalcul forcé ; chiffres précédents conservés en cas d’erreur', () => {
  const a = (() => { const a = read('apps-script/Admin_PFMP.html'); assert.ok(a.includes("EUC_PFMP_inclure_('Effectifs_Rendu_DEV736')"), 'rendu partagé DEV736 inclus'); return a + read('apps-script/Effectifs_Rendu_DEV736.html'); })();
  assert.match(a, /\.EUC_DEV592_effectifs\('',\{forcer:forcer\}\)/); assert.match(a, /majB\.onclick=function\(\)\{charger\(true\);\}/);
  assert.match(a, /if\(r\.perime&&!forcer\)setTimeout\(function\(\)\{charger\(true\);\},0\)/); assert.match(a, /chiffres précédents conservés/);
  assert.match(a, /' en mixité, '\+\(t\.apprentisClasseEntiere\|\|0\)\+' en classe entière\)'/); assert.match(a, /' · ≈ '\+/);
  assert.match(a, /majB\.disabled=true;majB\.innerHTML='<span class="spin"/, 'bouton désactivé avec spinner');
});
console.log(n + ' tests DEV735 réussis.');
