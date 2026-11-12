/* DEV668 — NIS de Monaco reconnu à la lettre près (TITAN : 7112Y19343 au registre RCI, 7112B19343 à l'IMSEE). */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
const FICHE = '<p><strong>Numéro RCI :</strong> 17S07483</p><p><strong>Raison sociale :</strong> TITAN ENGINEERING MONACO</p><p><strong>Adresse :</strong> 2 Rue du Gabian ; Les Industries ; 98000 Monaco</p>'
  + '<p><strong>Numéro d\'identification Statistique (NIS*) de l\'établissement principal :</strong> 7112Y19343</p>';
function ctx(rows) {
  const urls = [], cache = {};
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, __urls: urls,
    Utilities: { base64EncodeWebSafe: s => Buffer.from(s).toString('base64') }, CacheService: { getScriptCache: () => ({ get: c => cache[c] || null, put: (c, v) => { cache[c] = v; } }) },
    EUC_IMPORT_lireRecords_: () => rows || [], EUC_DEV646_table_: () => 'EUC_ENTREPRISES', EUC_IMPORT_exigerAdminTexte_: () => ({}),
    UrlFetchApp: {
      fetch: u => { urls.push(u); return { getResponseCode: () => 200, getContentText: () => FICHE }; },
      fetchAll: reqs => reqs.map(r => { urls.push(r.url); const y = /value=7112Y19343&/.test(r.url); return { getResponseCode: () => 200, getContentText: () => JSON.stringify(y ? { total: 1, data: [{ numeroRci: '17S07483', titre: 'TITAN ENGINEERING MONACO', etat: 'ACTIVE' }] } : { total: 0, data: [] }) }; })
    } };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV667_RciMonaco.js'), k); vm.runInContext(read('apps-script/EUC_DEV668_NisEquivalent.js'), k);
  return k;
}
test('clé de comparaison : Y et B désignent la même entreprise ; autres chiffres ou numéro interne : non', () => {
  const k = ctx();
  assert.equal(k.EUC_DEV668_cle_('7112B 19343'), '711219343'); assert.ok(k.EUC_DEV668_memeNis_('7112Y19343', '7112B19343'));
  assert.ok(!k.EUC_DEV668_memeNis_('7112Y19343', '7112Y19344')); assert.ok(!k.EUC_DEV668_memeNis_('7112Y19343', '7113Y19343'));
  assert.ok(k.EUC_DEV668_memeNis_('EUC-MC-0001', 'EUCMC0001')); assert.ok(!k.EUC_DEV668_memeNis_('', ''));
  const v = k.EUC_DEV668_variantes_('7112B19343'); assert.equal(v.length, 26); assert.equal(v[0], '7112B19343'); assert.ok(v.includes('7112Y19343'));
});
test('base des entreprises : NIS saisi avec l’autre lettre retrouvé, sans appeler le registre', () => {
  const k = ctx([{ id: 4, NIS: '7112B19343', Raison_sociale: 'TITAN ENGINEERING MONACO', Numero_voie: '2 RUE DU GABIAN', Commune: 'Monaco' }]);
  const r = J(k.EUC_DEV668_verifierNis_('7112Y19343'));
  assert.equal(r.trouve, true); assert.equal(r.source, 'BASE'); assert.equal(r.nis, '7112B19343', 'NIS de la base gardé'); assert.equal(r.baseId, 4); assert.equal(k.__urls.length, 0);
});
test('registre de Monaco : NIS IMSEE (B) introuvable tel quel, retrouvé par la variante Y ; résultat gardé en cache', () => {
  const k = ctx([]), r = J(k.EUC_DEV668_verifierNis_('7112B19343'));
  assert.equal(r.trouve, true); assert.equal(r.source, 'RCI'); assert.equal(r.nis, '7112B19343', 'NIS saisi gardé'); assert.equal(r.nisRegistre, '7112Y19343');
  assert.equal(r.nom, 'TITAN ENGINEERING MONACO'); assert.equal(r.adresse, '2 Rue du Gabian, Les Industries'); assert.equal(r.rci, '17S07483');
  const appels = k.__urls.length; assert.equal(J(k.EUC_DEV668_verifierNis_('7112Y19343')).trouve, true); assert.equal(k.__urls.length, appels, 'cache par clé');
  const k2 = ctx([]); assert.equal(J(k2.EUC_DEV668_verifierNis_('9999Z99999')).trouve, false);
  assert.throws(() => k2.EUC_DEV668_verifierNis({ nis: 'abc' }), /NIS invalide/);
});
test('QR code : NIS reconnu à la lettre près dans la base, sinon au registre (créée à l’enregistrement) ', () => {
  const rows = [{ id: 4, NIS: '7112B19343', Raison_sociale: 'TITAN ENGINEERING MONACO', Commune: 'Monaco' }];
  const k = ctx(rows); k.EUC_V161F8_tableEntreprise_ = () => 'EUC_ENTREPRISES'; k.EUC_V161F8_txt_ = v => v == null ? '' : String(v).trim();
  vm.runInContext(read('apps-script/EUC_PFMP_Monaco_V161Fix8.gs'), k);
  const a = J(k.EUC_V161_rechercherEntrepriseMonaco('7112Y19343')); assert.equal(a.found, true); assert.equal(a.id, 4);
  rows.length = 0; const b = J(k.EUC_V161_rechercherEntrepriseMonaco('7112Y19343'));
  assert.equal(b.found, true); assert.equal(b.id, 0); assert.equal(b.source, 'RCI'); assert.equal(b.nom, 'TITAN ENGINEERING MONACO');
  assert.match(read('apps-script/EUC_PFMP_Monaco_V161Fix8.gs'), /if\(existing&&existing\.found&&existing\.id\)return \{created:false/, 'trouvée au registre seulement : bien créée dans la base');
});
test('formulaire en ligne : NIS reconnu → entreprise identifiée, plus de passage au bureau ; panneau : contrôle affiché', () => {
  const d = read('apps-script/EUC_DEV603_Declaration.js');
  assert.match(d, /ligne\.Niveau_controle = nisOk \? 'VERT' : 'ROUGE'; ligne\.Decision = !j\.eleveId \? 'ESSAI' : nisOk \? 'A_VALIDER' : 'A_CONTROLER';/);
  assert.match(d, /ligne\.NIS_statut = 'VALIDE_' \+ nisOk\.source; ligne\.SIRET_statut = 'NIS_MONACO';/);
  assert.match(d, /periode\.libelle, !nisOk, c\.id,/, 'accusé ordinaire');
  assert.match(read('apps-script/Declaration_Entreprise_DEV603.html'), /r\.nisReconnu\?'<p>Numéro d’enregistrement/);
  assert.match(read('apps-script/Soumissions_A_Traiter_DEV665.html'), /NIS introuvable au registre de Monaco, même à la lettre près/);
  assert.match(read('apps-script/EUC_DEV665_DemandesAide.js'), /EUC_DEV668_memeNis_\(x\.NIS, nis\)/, 'jamais créée deux fois');
});
console.log(n + ' tests DEV668 réussis.');
