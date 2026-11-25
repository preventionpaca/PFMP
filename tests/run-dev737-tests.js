/* DEV737 — Statistiques de l'établissement pour la direction : jeton direction signé, lecture seule, même page que l'administration. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
function ctx(admin) {
  const k = { String, Number, Array, Object, JSON, Date, Error, RegExp, console: { log() {} } }; vm.createContext(k);
  vm.runInContext(read('apps-script/EUC_DEV737_StatsDirection.js'), k);
  k.EUC_ACCES_config_ = () => ({ secret: 'secret-fictif' });
  k.EUC_ACCES_hmac_ = (t, s) => crypto.createHmac('sha256', s).update(String(t)).digest('hex');
  k.EUC_ACCES_egal_ = (a, b) => String(a) === String(b);
  k.EUC_DEV736_estAdmin_ = () => !!admin;
  k.appels = [];
  k.EUC_DEV698_anneesLecture_ = () => { k.appels.push('annees'); return { annees: ['2026-2027'], active: '2026-2027' }; };
  k.EUC_DEV698_anneeLecture_ = q => { k.appels.push('annee ' + q.annee); return { annee: q.annee }; };
  k.EUC_DEV703_distancesLecture_ = q => { k.appels.push('dist ' + q.annee); return { compte: {} }; };
  return k;
}
test('jeton direction : valide 12 h ; expiré, falsifié, jeton enseignant (ENS) ou vide refusés', () => {
  const k = ctx(false), j = k.EUC_DEV737_creerJeton_(), p = j.split('.');
  assert.ok(k.EUC_DEV737_jetonValide_(j)); assert.ok(Number(p[0]) - Date.now() > 11.9 * 3600e3 && Number(p[0]) - Date.now() <= 12 * 3600e3);
  const exp = String(Date.now() - 1000); assert.equal(k.EUC_DEV737_jetonValide_(exp + '.' + k.EUC_ACCES_hmac_('DIR|' + exp, 'secret-fictif')), false, 'expiré');
  const e2 = String(Date.now() + 1e6); assert.equal(k.EUC_DEV737_jetonValide_(e2 + '.' + k.EUC_ACCES_hmac_('ENS|' + e2, 'secret-fictif')), false, 'jeton enseignant');
  assert.equal(k.EUC_DEV737_jetonValide_(p[0] + '.' + p[1].replace(/^./, c => c === 'a' ? 'b' : 'a')), false); assert.equal(k.EUC_DEV737_jetonValide_(''), false);
  k.EUC_ACCES_config_ = () => ({ secret: '' }); assert.equal(k.EUC_DEV737_creerJeton_(), ''); assert.equal(k.EUC_DEV737_jetonValide_(j), false, 'sans secret : rien');
});
test('statistiques : servies avec le jeton direction ou à l’administration, refusées sinon, sans calcul d’itinéraire', () => {
  const k = ctx(false), dir = k.EUC_DEV737_creerJeton_();
  assert.throws(() => k.EUC_DEV737_statsAnnee({ annee: '2026-2027' }), /Accès direction expiré/); assert.throws(() => k.EUC_DEV737_statsDistances({ dir: 'x.y' }), /Accès direction/);
  assert.equal(k.appels.length, 0, 'aucune lecture sans accès');
  k.EUC_DEV737_statsAnnees({ dir }); k.EUC_DEV737_statsAnnee({ dir, annee: '2025-2026' }); k.EUC_DEV737_statsDistances({ dir, annee: '2025-2026' });
  assert.deepEqual(k.appels, ['annees', 'annee 2025-2026', 'dist 2025-2026']);
  assert.equal(ctx(true).EUC_DEV737_statsAnnee({ annee: '2026-2027' }).annee, '2026-2027', 'administration sans jeton');
  assert.ok(!/EUC_DEV703_calculer|itineraire|ecrireStock/.test(read('apps-script/EUC_DEV737_StatsDirection.js')), 'lecture seule');
  const s = read('apps-script/EUC_DEV698_Statistiques.js'), d = read('apps-script/EUC_DEV703_Distances.js');
  assert.match(s, /function EUC_DEV698_annee\(q\) \{\n  EUC_ADMIN_WORKFLOW_ctxV144_\(\); return EUC_DEV698_anneeLecture_\(q\);/, 'contrôle admin conservé');
  assert.match(s, /function EUC_DEV698_annees\(\) \{\n  EUC_ADMIN_WORKFLOW_ctxV144_\(\); return EUC_DEV698_anneesLecture_\(\);/);
  assert.match(d, /function EUC_DEV703_distances\(q\) \{\n  EUC_ADMIN_WORKFLOW_ctxV144_\(\); return EUC_DEV703_distancesLecture_\(q\);/);
  assert.match(d, /function EUC_DEV703_calculer\(q\) \{\n  EUC_ADMIN_WORKFLOW_ctxV144_\(\);/, 'calcul des distances : administration seulement');
});
test('page : route, titre direction, bouton de calcul masqué, appels redirigés vers EUC_DEV737 avec le jeton (simulation)', () => {
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'statistiques-direction':\n      return EUC_DEV737_afficherStats\(e\);/);
  assert.match(read('scripts/pfmp-release-config.json'), /"page": "statistiques-direction", "scope": "admin", "expected": "Statistiques de l"/);
  assert.match(read('scripts/generate-acces-liste.js'), /'Statistiques_PFMP_DEV698',/);
  assert.match(read('apps-script/EUC_DEV698_Statistiques.js'), /t\.direction = false; t\.dir = '';/, 'page admin inchangée');
  const h = read('apps-script/Statistiques_PFMP_DEV698.html');
  assert.match(h, /<\? if \(direction\) \{ \?><style>#distCalc\{display:none!important\}<\/style>\n<header><h1>Statistiques de l’établissement<\/h1>/);
  assert.match(h, /<a href="__LIEN_DASHBOARD__" target="_top">Tableau de bord<\/a>/); assert.match(h, /\?page=admin-pfmp">Administration PFMP<\/a> › Statistiques/);
  const i = h.indexOf('const DIR='), shim = h.slice(h.indexOf('const google=', i), h.indexOf('const $=', i));
  const appels = [], run = { withSuccessHandler(s) { this.s = s; return this; }, withFailureHandler(f) { this.f = f; return this; } };
  ['EUC_DEV737_statsAnnees', 'EUC_DEV737_statsAnnee', 'EUC_DEV737_statsDistances'].forEach(nom => { run[nom] = q => { appels.push([nom, q]); run.s('ok'); }; });
  const w = { window: { google: { script: { run } } } }; vm.createContext(w);
  vm.runInContext('const DIR="1.ab",DIRECTION=true;' + shim + 'this.g=google;', w);
  let res = [], err = '';
  w.g.script.run.withSuccessHandler(r => res.push(r)).withFailureHandler(e => { err = e.message; }).EUC_DEV698_annee({ annee: '2026-2027' });
  w.g.script.run.withSuccessHandler(r => res.push(r)).EUC_DEV698_annees(); w.g.script.run.withSuccessHandler(r => res.push(r)).EUC_DEV703_distances({ annee: '2026-2027' });
  w.g.script.run.withSuccessHandler(r => res.push(r)).withFailureHandler(e => { err = e.message; }).EUC_DEV703_calculer({ annee: '2026-2027' });
  assert.deepEqual(JSON.parse(JSON.stringify(appels)), [['EUC_DEV737_statsAnnee', { dir: '1.ab', annee: '2026-2027' }], ['EUC_DEV737_statsAnnees', { dir: '1.ab' }], ['EUC_DEV737_statsDistances', { dir: '1.ab', annee: '2026-2027' }]]);
  assert.deepEqual(res, ['ok', 'ok', 'ok']); assert.match(err, /réservé à l’administration/);
  const w2 = { window: { google: 'global' } }; vm.createContext(w2); vm.runInContext('const DIR="",DIRECTION=false;' + shim + 'this.g=google;', w2); assert.equal(w2.g, 'global', 'administration : google.script.run d’origine');
});
test('tableau de bord : cinq boutons compacts (statistiques de l’établissement avec jeton direction), sans adresse en dur', () => {
  const h = read('apps-script/Tableau_De_Bord_DEV736.html'), t = read('apps-script/EUC_DEV736_TableauDeBord.js');
  const liens = h.slice(h.indexOf('<div class="liens">'), h.indexOf('</div>', h.indexOf('<div class="liens">'))).match(/<a class="lien"[^>]*>[^<]+<\/a>/g);
  assert.deepEqual(liens.map(a => a.slice(a.lastIndexOf('">') + 2, -4)), ['Suivi des PFMP', 'Book des entreprises', 'Suivi des apprentis', 'Cartographie des apprentis', 'Statistiques de l’établissement']);
  assert.ok(h.includes('data-stats="1" href="__LIEN_DASHBOARD__?page=statistiques-direction"'), 'statistiques dans l’enveloppe sans bandeau'); assert.match(h, /\.liens\{display:flex;flex-wrap:wrap;gap:8px\}/);
  assert.match(h, /Statistiques : tout l’établissement \(élèves et apprentis\)/);
  assert.match(t, /r\.dir = typeof EUC_DEV737_creerJeton_ === 'function' \? EUC_DEV737_creerJeton_\(\) : ''/); assert.match(t, /t\.base = typeof EUC_RELEASE_serviceBase_/);
  assert.ok(!/https?:\/\/[a-z-]+\.(lycee-les-eucalyptus\.org|loucodi\.fr)/.test(h + read('apps-script/EUC_DEV737_StatsDirection.js')), 'aucune adresse publique en dur');
});
console.log(n + ' tests DEV737 réussis.');
