/* DEV733 — Établissement (LP / LGT) de rattachement des classes entières : réglable, règle par défaut, effectifs de l'accueil. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const J = x => JSON.parse(JSON.stringify(x));
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
function profils(col) {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV579_Profils.js'), k); vm.runInContext(read('apps-script/EUC_DEV732_OrganismesClasses.js'), k);
  k.EUC_DEV579_colonnesClasses_ = () => col || {};
  return k;
}
test('rattachement par défaut : TSEC et CAP peintre → LP ; BTS ELEC Alt et Bachelor → LGT ; sinon colonne Etab ; colonne Grist prioritaire', () => {
  const k = profils(), r = (c, e) => J(k.EUC_DEV579_profil_({}, 'a', 1, c, e || 'CFA', '')).rattachement;
  assert.equal(r('TSEC'), 'LP'); assert.equal(r('1CAPP'), 'LP'); assert.equal(r('1BTS ELEC ALT', 'LP'), 'LGT'); assert.equal(r('2BTS ELEC Alt'), 'LGT'); assert.equal(r('BACHELOR IP'), 'LGT');
  assert.equal(r('XYZ', 'LGT'), 'LGT'); assert.equal(r('CQPM ASC', 'GRETA'), '');
  assert.equal(J(profils({ 1: { rattachement: 'Aucun' } }).EUC_DEV579_profil_({}, 'a', 1, 'TSEC', 'LP', '')).rattachement, 'Aucun');
  assert.equal(J(profils({ 1: { rattachement: 'LP' } }).EUC_DEV579_profil_({}, 'a', 1, 'BACHELOR IP', '', '')).rattachement, 'LP');
  assert.deepEqual(['lp', 'Lgt', 'aucun', 'CFAI'].map(k.EUC_DEV579_rattachementDe_), ['LP', 'LGT', 'Aucun', '']);
});
test('effectifs : apprentis des classes entières comptés dans l’établissement de rattachement (liste des classes), « Aucun » exclu', () => {
  const k = { String, Number, Array, Object, JSON }; vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV592_Effectifs.js'), k);
  const el = nb => Array.from({ length: nb }, (_, i) => ({ id: i + 1 }));
  const m = { classes: [
    { id: 1, nom: 'TCAR', etab: 'LP', modeApprentissage: 'MIXITE', eleves: [{ id: 1, apprentissage: { code: 'APPRENTI' } }], periodes: [] },
    { id: 2, nom: '1BTS CI', etab: 'LGT', modeApprentissage: 'MIXITE', eleves: el(2), periodes: [] },
    { id: 3, nom: 'TSEC', etab: 'CFA', rattachement: 'LP', modeApprentissage: 'CLASSE_ENTIERE', opco: 'CFA RAN', eleves: el(4), periodes: [] },
    { id: 4, nom: '1CAPP', etab: 'CFA', rattachement: 'LP', modeApprentissage: 'CLASSE_ENTIERE', opco: 'CFA RAN', eleves: el(3), periodes: [] },
    { id: 5, nom: '2BTS ELEC Alt', etab: 'LP', rattachement: 'LGT', modeApprentissage: 'CLASSE_ENTIERE', opco: 'CFAI', eleves: el(10), periodes: [] },
    { id: 6, nom: 'BACHELOR IP', etab: '', rattachement: 'LGT', modeApprentissage: 'CLASSE_ENTIERE', opco: 'CFAI', eleves: el(5), periodes: [] },
    { id: 7, nom: 'CQPM ASC', etab: 'LP', rattachement: 'Aucun', modeApprentissage: 'CLASSE_ENTIERE', opco: 'CFAI', eleves: el(12), periodes: [] }] };
  const r = J(k.EUC_DEV592_calcul_(m)), t = nom => r.groupes.find(x => x.nom === nom).totaux;
  assert.deepEqual([t('LP').apprentisMixite, t('LP').apprentisClasseEntiere, t('LP').classesRattachees], [1, 7, ['1CAPP', 'TSEC']]);
  assert.deepEqual([t('LGT').apprentisMixite, t('LGT').apprentisClasseEntiere, t('LGT').classesRattachees], [0, 15, ['2BTS ELEC Alt', 'BACHELOR IP']]);
  assert.deepEqual([t('CFAI').classes, t('CFAI').apprentis], [3, 27], 'organismes inchangés');
  const sansReglage = J(k.EUC_DEV592_calcul_({ classes: [{ id: 1, nom: 'X', etab: 'LP', modeApprentissage: 'CLASSE_ENTIERE', opco: 'CFAI', eleves: el(2), periodes: [] }, { id: 2, nom: 'Y', etab: 'LP', modeApprentissage: 'MIXITE', eleves: el(1), periodes: [] }] }));
  assert.equal(sansReglage.groupes.find(x => x.nom === 'LP').totaux.apprentisClasseEntiere, 2, 'à défaut : colonne Etab');
});
test('réglage depuis la page des quotas : 4e liste « Établ. » (LP / LGT / Aucun), écrite dans la colonne Grist Etablissement_rattachement', () => {
  const k = profils(), recs = [{ id: 1, fields: { Etablissement_rattachement: 'LP' } }];
  assert.deepEqual(J(k.EUC_DEV732_modifications_([{ classeId: 1, organismesSaisis: { rattachement: 'LGT' } }], recs)), [{ id: 1, fields: { Etablissement_rattachement: 'LGT' } }]);
  assert.deepEqual(J(k.EUC_DEV732_modifications_([{ classeId: 1, organismesSaisis: { rattachement: 'LP' } }], recs)), []);
  assert.throws(() => k.EUC_DEV732_modifications_([{ classeId: 1, organismesSaisis: { rattachement: 'CFAI' } }], recs), /Établissement invalide/);
  assert.throws(() => k.EUC_DEV732_modifications_([{ classeId: 1, organismesSaisis: { opco: 'LP' } }], recs), /Organisme invalide/);
  const h = read('apps-script/Apprentissage_Quotas_DEV538.html');
  assert.match(h, /\['rattachement','Établ\.','Établissement de rattachement de la classe entière[^']*',\['LP','LGT','Aucun'\]\]/); assert.match(h, /\(c\[3\]\|\|ORG\)\.map/);
  assert.match(read('apps-script/EUC_PFMP_DEV538_BookQuotas.js'), /rattachement:p732\.rattachement\|\|''/);
  assert.match(read('apps-script/EUC_SUIVI2_Moteur.js'), /rattachement: profil \? profil\.rattachement \|\| '' : ''/);
  assert.match(read('apps-script/EUC_SUIVI2_Moteur.js'), /EUC_SUIVI2_VERSION_ = '1\.0\.0-dev\.733'/);
  assert.match(read('apps-script/Admin_PFMP.html'), /t\.classesRattachees\.join\(', '\)/);
});
console.log(n + ' tests DEV733 réussis.');
