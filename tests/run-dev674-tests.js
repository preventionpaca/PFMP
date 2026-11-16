/* DEV674 — Codes des professeurs principaux par niveau (Seconde, Première, Terminale ; 1re/2e année BTS et CAP). */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
const P1 = { id: 11, libelle: 'PFMP 1', debutFr: '04/01/2027', finFr: '29/01/2027' }, P2 = { id: 12, libelle: 'PFMP 2', debutFr: '01/03/2027', finFr: '26/03/2027' };
const P1b = { id: 21, libelle: 'PFMP 1', debutFr: '04/01/2027', finFr: '29/01/2027' }, PT = { id: 31, libelle: 'PFMP 1', debutFr: '08/02/2027', finFr: '05/03/2027' };
const FAM = {
  BACPRO: { classes: [{ classeId: 1, classe: '2MVA1', periodes: [P1, P2] }, { classeId: 2, classe: '2MELEC', periodes: [P1b] }, { classeId: 3, classe: '1MELEC', periodes: [PT] }, { classeId: 4, classe: 'TMELEC', periodes: [PT] }] },
  BTS: { classes: [{ classeId: 5, classe: '1BTS CRSA', periodes: [] }, { classeId: 6, classe: '2BTS CRSA', periodes: [] }] },
  CAP: { classes: [{ classeId: 7, classe: '1CAPP', periodes: [P1] }, { classeId: 8, classe: 'TCAP', periodes: [] }] }
};
function ctx(rows) {
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, Map, Set,
    Utilities: { formatDate: () => '' }, EUC_DEV368_year: y => y || '2026-2027', EUC_DEV368_admin: () => ({ email: 'admin' }), EUC_DEV368_catalog: () => ({ classes: [] }),
    EUC_DEV456_familyCacheGet_: (y, f) => FAM[f], EUC_IMPORT_lireRecords_: () => rows || [] };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js'), k); vm.runInContext(read('apps-script/EUC_DEV674_CampagneNiveau.js'), k);
  return k;
}
test('niveau déduit du nom de la classe, par famille', () => {
  const k = ctx();
  assert.equal(k.EUC_DEV674_niveau_('BACPRO', '2MVA1'), 'Seconde'); assert.equal(k.EUC_DEV674_niveau_('BACPRO', '1MELEC'), 'Première'); assert.equal(k.EUC_DEV674_niveau_('BACPRO', 'TMELEC'), 'Terminale');
  assert.equal(k.EUC_DEV674_niveau_('BTS', '1BTS CRSA'), '1re année BTS'); assert.equal(k.EUC_DEV674_niveau_('BTS', '2BTS CRSA'), '2e année BTS'); assert.equal(k.EUC_DEV674_niveau_('BTS', 'BTS MCO 2'), '2e année BTS');
  assert.equal(k.EUC_DEV674_niveau_('CAP', '1CAPP'), '1re année CAP'); assert.equal(k.EUC_DEV674_niveau_('CAP', 'TCAP'), '2e année CAP');
});
test('catalogue : chaque classe porte son niveau et chaque période sa clé libellé|début|fin', () => {
  const c = J(ctx().EUC_DEV441_catalog_('2026-2027', false)), seconde = c.classes.find(x => x.classeId === 1);
  assert.equal(seconde.niveau, 'Seconde'); assert.equal(seconde.periodes[0].cle, 'PFMP 1|2027-01-04|2027-01-29');
  assert.equal(c.classes.find(x => x.classeId === 4).niveau, 'Terminale');
});
test('lot par niveau : toutes les classes du niveau ayant cette période, et seulement elles', () => {
  const k = ctx(), cle = 'PFMP 1|2027-01-04|2027-01-29';
  const r = J(k.EUC_DEV444_campaignTargets_({ annee: '2026-2027', famille: 'BACPRO', niveau: 'Seconde', periodeCle: cle }));
  assert.deepEqual(r.targets.map(t => t.classe + ':' + t.periode.id), ['2MELEC:21', '2MVA1:11'], 'une période par classe, ids propres à chaque classe');
  const t = J(k.EUC_DEV444_campaignTargets_({ annee: '2026-2027', famille: 'BACPRO', niveau: 'Terminale', periodeCle: 'PFMP 1|2027-02-08|2027-03-05' }));
  assert.deepEqual(t.targets.map(x => x.classe), ['TMELEC'], 'la Première de même période est exclue');
  const tous = J(k.EUC_DEV444_campaignTargets_({ annee: '2026-2027', famille: 'BACPRO', niveau: '', periodeCle: 'PFMP 1|2027-02-08|2027-03-05' }));
  assert.deepEqual(tous.targets.map(x => x.classe), ['1MELEC', 'TMELEC'], 'Tous les niveaux : toute la famille');
  const une = J(k.EUC_DEV444_campaignTargets_({ annee: '2026-2027', famille: 'BACPRO', niveau: 'Seconde', classeId: 1, periodeCle: cle }));
  assert.deepEqual(une.targets.map(x => x.classe), ['2MVA1'], 'classe choisie : lot limité à la classe');
  assert.deepEqual(J(k.EUC_DEV444_campaignTargets_({ annee: '2026-2027', famille: 'BACPRO', niveau: 'Seconde', periodeCle: cle })).targets.every(x => x.famille === 'BACPRO'), true, 'le CAP de même période reste hors du lot');
  assert.throws(() => k.EUC_DEV674_cible_({ famille: 'BACPRO', niveau: 'Seconde' }), /Choisissez une période/);
  assert.throws(() => k.EUC_DEV674_cible_({ famille: 'BACPRO', niveau: 'Terminale', periodeCle: cle }), /Aucune classe/);
});
test('ancien lot (classe de référence, sans clé) inchangé', () => {
  const r = J(ctx().EUC_DEV444_campaignTargets_({ annee: '2026-2027', classeId: 1, periodeId: 11 }));
  assert.deepEqual(r.targets.map(x => x.classe), ['2MELEC', '2MVA1']); assert.equal(r.anchor.classe, '2MVA1');
});
test('accès du niveau : lecture des codes des seules classes visées', () => {
  const rows = [{ id: 1, Annee_scolaire: '2026-2027', Classe_id: 1, Classe_nom: '2MVA1', Periode_id: 11, Professeur_nom: 'A', Actif: true, Expiration: '2027-01-29T22:59:59Z', Etat_courriel: 'ENVOYE' },
    { id: 2, Annee_scolaire: '2026-2027', Classe_id: 3, Classe_nom: '1MELEC', Periode_id: 31, Professeur_nom: 'B', Actif: true }];
  const r = J(ctx(rows).EUC_DEV674_accesNiveau({ annee: '2026-2027', famille: 'BACPRO', niveau: 'Seconde', periodeCle: 'PFMP 1|2027-01-04|2027-01-29' }));
  assert.deepEqual(r.classes, ['2MELEC', '2MVA1']); assert.deepEqual(r.acces.map(x => x.professeur), ['A']);
});
test('page : sélecteur Niveau, lot par niveau, boutons protégés avec indicateur et délai', () => {
  const h = read('apps-script/Acces_PP_Admin_DEV441.html');
  assert.match(h, /<label>Niveau<select id="niveau"><\/select><\/label><label>Classe/);
  assert.match(h, /Campagne de codes par niveau/);
  assert.match(h, /periodeCle:cle/); assert.match(h, /'EUC_DEV674_accesNiveau'/);
  assert.match(h, /function appel\(b,libelle,fn,arg,ok,ko\)\{if\(b\.disabled\)return;busy\(b,true,libelle\)/);
  assert.match(h, /class="spin"/); assert.match(h, /délai dépassé/);
  assert.match(h, /'EUC_DEV444_sendCampaign',lot,/, 'le lot envoyé est celui affiché, pas les filtres modifiés depuis');
  assert.match(h, /\$\('periode'\)\.onchange=\(\)=>\{razLot\(\);inspect\(\)\}/, 'changer de période efface le lot préparé');
  assert.match(h, /href="__LIEN_ACCUEIL__"/);
  assert.match(h, /Recopier la première ligne remplie sur les autres classes/); assert.match(h, /if\(!i\.value\.trim\(\)&&v\.trim\(\)\)\{i\.value=v;n\+\+\}/, 'recopie sans écraser une saisie existante');
});
console.log(n + ' tests DEV674 réussis.');
