/* DEV732 — Effectifs de l'accueil : classe entière comptée dans le seul organisme de la relation OPCO ;
 * LP / LGT : apprentis en mixité et apprentis des classes entières rattachées. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const J = x => JSON.parse(JSON.stringify(x));
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
function profils(col) {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV579_Profils.js'), k);
  k.EUC_DEV579_colonnesClasses_ = () => col || {};
  return k;
}
test('organisme de la relation OPCO par défaut : BTS ELEC Alt, Bachelor, CQPM → CFAI ; MELEC G, TPEEB, TPMMA → GRETA ; CAP peintre, TSEC → CFA RAN', () => {
  const k = profils(), o = (c, e) => J(k.EUC_DEV579_profil_({}, '2026-2027', 1, c, e || 'LP', 'MIXITE')).opco;
  assert.equal(o('1BTS ELEC ALT'), 'CFAI'); assert.equal(o('2BTS ELEC Alt'), 'CFAI'); assert.equal(o('BACHELOR IP'), 'CFAI'); assert.equal(o('CQPM ASC', 'GRETA'), 'CFAI');
  ['1MELEC G', 'TMELEC G', 'TPEEB', 'TP EEB', 'TPMMA'].forEach(c => assert.equal(o(c, 'GRETA'), 'GRETA', c));
  assert.equal(o('1CAPP'), 'CFA RAN'); assert.equal(o('TSEC'), 'CFA RAN');
  assert.equal(o('TCAR'), 'CFA RAN', 'bac pro mixité : donneur d’ordre (DEV702)');
  const p = J(k.EUC_DEV579_profil_({}, '2026-2027', 1, '1BTS ELEC ALT', 'LP', '')); assert.deepEqual([p.gestionnaire, p.donneur, p.opco], ['CFA RAN', 'CFAI', 'CFAI'], 'gestionnaire et donneur inchangés');
});
test('la colonne Grist « Organisme relation OPCO » est prioritaire ; à défaut de règle, donneur d’ordre puis gestionnaire', () => {
  assert.equal(J(profils({ 1: { modalite: 'CLASSE_ENTIERE', gestionnaire: 'GRETA', donneur: 'CFAI', opco: 'CFA RAN' } }).EUC_DEV579_profil_({}, 'a', 1, '1MELEC G', 'GRETA', '')).opco, 'CFA RAN');
  assert.equal(J(profils({ 1: { modalite: 'CLASSE_ENTIERE', gestionnaire: 'CFA RAN', donneur: 'CFAI' } }).EUC_DEV579_profil_({}, 'a', 1, 'XYZ', 'LP', '')).opco, 'CFAI');
  assert.equal(J(profils({ 1: { modalite: 'CLASSE_ENTIERE', gestionnaire: 'CFA RAN' } }).EUC_DEV579_profil_({}, 'a', 1, 'XYZ', 'LP', '')).opco, 'CFA RAN');
  const src = read('apps-script/EUC_DEV579_Profils.js');
  assert.match(src, /opco: 'Organisme_relation_OPCO'/); assert.match(src, /\[C\.opco, 'Organisme relation OPCO', EUC_DEV579_ORGANISMES_\]/, 'pré-remplissage : colonne créée sur demande');
  assert.match(read('apps-script/EUC_SUIVI2_Moteur.js'), /opco: profil \? profil\.opco \|\| '' : ''/);
  assert.match(read('apps-script/EUC_SUIVI2_Moteur.js'), /EUC_SUIVI2_VERSION_ = '1\.0\.0-dev\.(73[2-9]|7[4-9]\d|[89]\d\d)'/, 'modèle du suivi recalculé (cache par version)');
});
test('effectifs : classe entière dans un seul organisme, total inchangé ; LP / LGT : mixité + classes entières rattachées', () => {
  const k = { String, Number, Array, Object, JSON }; vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV592_Effectifs.js'), k);
  const A = { apprentissage: { code: 'APPRENTI' } };
  const m = { classes: [
    { id: 1, nom: 'TCAR', etab: 'LP', modeApprentissage: 'MIXITE', eleves: [{ id: 1, ...A }, { id: 2 }], periodes: [] },
    { id: 2, nom: '1BTS ELEC ALT', etab: 'LP', modeApprentissage: 'CLASSE_ENTIERE', gestionnaire: 'CFA RAN', donneur: 'CFAI', opco: 'CFAI', eleves: [{ id: 3 }, { id: 4 }, { id: 5 }], periodes: [] },
    { id: 3, nom: 'TSEC', etab: 'LGT', modeApprentissage: 'CLASSE_ENTIERE', gestionnaire: 'CFA RAN', opco: 'CFA RAN', eleves: [{ id: 6 }], periodes: [] },
    { id: 4, nom: '1MELEC G', etab: 'GRETA', modeApprentissage: 'CLASSE_ENTIERE', gestionnaire: 'GRETA', donneur: 'CFAI', opco: 'GRETA', eleves: [{ id: 7 }, { id: 8 }], periodes: [] },
    { id: 5, nom: 'TPMMA', etab: 'LP', modeApprentissage: 'FORMATION_CONTINUE', gestionnaire: 'GRETA', opco: 'GRETA', eleves: [{ id: 9 }], periodes: [] }] };
  const r = J(k.EUC_DEV592_calcul_(m)), g = nom => r.groupes.find(x => x.nom === nom);
  assert.deepEqual(r.groupes.map(x => x.nom), ['LP', 'CFA RAN', 'CFAI', 'GRETA']);
  assert.deepEqual(g('CFAI').classes.map(c => c.nom), ['1BTS ELEC ALT'], 'BTS ELEC Alt : CFAI seul');
  assert.deepEqual(g('CFA RAN').classes.map(c => c.nom), ['TSEC']); assert.deepEqual(g('GRETA').classes.map(c => c.nom), ['1MELEC G', 'TPMMA']);
  const lp = g('LP').totaux; assert.deepEqual([lp.etablissement, lp.apprentisMixite, lp.apprentisClasseEntiere, lp.scolaires], [true, 1, 3, 1], 'FC exclue des apprentis rattachés');
  assert.equal(g('CFAI').totaux.organisme, true);
  assert.deepEqual([r.total.classes, r.total.apprentis, r.total.stagiaires], [5, 7, 1]);
  const lgt = J(k.EUC_DEV592_calcul_({ classes: [m.classes[2], { id: 9, nom: '1BTS CI', etab: 'LGT', modeApprentissage: 'MIXITE', eleves: [{ id: 1, ...A }], periodes: [] }] })).groupes.find(x => x.nom === 'LGT').totaux;
  assert.deepEqual([lgt.apprentisMixite, lgt.apprentisClasseEntiere], [1, 1]);
});
test('accueil : tuiles établissement / organisme et rappel du réglage', () => {
  const h = (() => { const a = read('apps-script/Admin_PFMP.html'); assert.ok(a.includes("EUC_PFMP_inclure_('Effectifs_Rendu_DEV736')"), 'rendu partagé DEV736 inclus'); return a + read('apps-script/Effectifs_Rendu_DEV736.html'); })();
  assert.match(h, /apprenti\(s\) en mixité · '\+t\.apprentisClasseEntiere\+' apprenti\(s\) en classe entière rattachée\(s\)'/);
  assert.match(h, /classe\(s\) dédiée\(s\) · '\+t\.apprentis\+' apprenti\(s\)'/);
  assert.match(h, /page « Quotas d’apprentissage », colonne « Organismes » → OPCO/);
  assert.match(read('apps-script/Apprentissage_Quotas_DEV538.html'), /<b>Organisme relation OPCO<\/b>/);
});
test('page des quotas : organismes réglés dans l’application, seules les cases modifiées écrites dans Grist', () => {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV579_Profils.js'), k); vm.runInContext(read('apps-script/EUC_DEV732_OrganismesClasses.js'), k);
  const recs = [{ id: 1, fields: { Organisme_gestionnaire: 'GRETA', Organisme_donneur_ordre: 'CFAI' } }, { id: 2, fields: { Organisme_gestionnaire: 'CFA RAN' } }, { id: 3, fields: {} }];
  const lignes = [{ classeId: 1, organismesSaisis: { gestionnaire: 'GRETA', donneur: 'CFAI', opco: 'GRETA' } }, { classeId: 2, organismesSaisis: { gestionnaire: 'CFA RAN', donneur: '', opco: '' } }, { classeId: 3 }, { classeId: 99, organismesSaisis: { opco: 'CFAI' } }];
  assert.deepEqual(J(k.EUC_DEV732_modifications_(lignes, recs)), [{ id: 1, fields: { Organisme_relation_OPCO: 'GRETA' } }], 'inchangé, sans saisie ou classe inconnue : rien');
  assert.deepEqual(J(k.EUC_DEV732_modifications_([{ classeId: 1, organismesSaisis: { donneur: '' } }], recs)), [{ id: 1, fields: { Organisme_donneur_ordre: '' } }], 'retour à « Auto » : case vidée');
  assert.throws(() => k.EUC_DEV732_modifications_([{ classeId: 1, organismesSaisis: { opco: 'OPCO2I' } }], recs), /Organisme invalide/);
  const appels = []; k.EUC_ENT_grist = (m, u, b) => { appels.push([m, u, b && J(b)]); return u.endsWith('/records') && m === 'get' ? { records: recs } : u.endsWith('/columns') && m === 'get' ? { columns: [{ id: 'Organisme_gestionnaire' }, { id: 'Organisme_donneur_ordre' }] } : {}; };
  assert.equal(k.EUC_DEV732_ecrireOrganismes_([{ classeId: 3 }]), 0); assert.equal(appels.length, 0, 'aucune saisie : aucun appel Grist');
  assert.equal(k.EUC_DEV732_ecrireOrganismes_(lignes), 1);
  assert.deepEqual(appels.map(a => a[0] + ' ' + a[1]), ['get /tables/Classes/records', 'get /tables/Classes/columns', 'post /tables/Classes/columns', 'patch /tables/Classes/records']);
  assert.equal(appels[2][2].columns[0].id, 'Organisme_relation_OPCO'); assert.deepEqual(appels[3][2].records, [{ id: 1, fields: { Organisme_relation_OPCO: 'GRETA' } }]);
  const h = read('apps-script/Apprentissage_Quotas_DEV538.html'), q = read('apps-script/EUC_PFMP_DEV538_BookQuotas.js');
  assert.match(h, /organismesSaisis:orgLigne\(tr\)/); assert.match(h, /class="org-'\+c\[0\]\+'"/); assert.match(h, /organismes mis à jour dans Grist/);
  assert.match(q, /EUC_DEV732_ecrireOrganismes_\(rows\)/); assert.match(q, /organismesSaisis:p732\.saisis\|\|null/);
});
console.log(n + ' tests DEV732 réussis.');
