'use strict';
/* DEV713 — Book : dépôts en ligne comptés dans le suivi (pas encore importés) ajoutés aux élèves accueillis. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp };
vm.createContext(k);
['apps-script/EUC_DEV665_DemandesAide.js', 'apps-script/EUC_DEV713_BookDepots.js'].forEach(f => vm.runInContext(read(f), k, { filename: f }));
k.EUC_PFMP_ref_ = v => Array.isArray(v) ? v[1] : v;
const eleves = { 1: { id: 1, Nom: 'DUPONT', Prenom: 'Léo', Classe: 20 }, 2: { id: 2, Nom: 'TEST', Prenom: 'X', Classe: 20, Donnee_test: true }, 3: { id: 3, Nom: 'AUTRE', Prenom: 'Y', Classe: 30 } };
const classes = { 20: { famille: 'BACPRO', nom: '1MVA2', periodes: [{ id: 501, libelle: 'PFMP n°1', debut: '2026-11-23', fin: '2026-12-18' }] }, 30: { famille: 'BTS', nom: '1BTS', periodes: [{ id: 601, libelle: 'PFMP n°1', debut: '2027-01-04', fin: '2027-02-05' }] } };
const dep = (id, eleve, o) => Object.assign({ id, Submission_ID: 'SECOURS-PFMP-2026-S00' + id, Eleve_match_id: eleve, Annee_scolaire: '2026-2027', Decision: 'A_CONTROLER', SIRET_statut: 'VERIFIE', SIRET_normalise: '12345678200028',
  Raison_sociale_officielle: 'GARAGE NOUVEAU', Nom_commercial: 'GARAGE N', Adresse_officielle: '2 AVENUE NOUVELLE', CP_officiel: '06200', Ville_officielle: 'NICE', Date_debut: '2026-11-23', Periode_numero: 1,
  Responsable_prenom: 'Paul', Responsable_nom: 'MARTIN', Responsable_telephone: '06 00 00 00 01', Tuteur_prenom: 'Paul', Tuteur_nom: 'MARTIN' }, o || {});

test('dépôt vérifié pas encore importé : élève ajouté au Book, classe et période officielles, entreprise et contacts', () => {
  const d = J(k.EUC_DEV713_details_({ annee: '2026-2027' }, [dep(98, 1)], eleves, classes));
  assert.equal(d.length, 1);
  assert.deepEqual(d[0].classe, { id: 20, nom: '1MVA2' }); assert.deepEqual(d[0].periode, { id: 501, libelle: 'PFMP n°1' }); assert.equal(d[0].famille, 'BACPRO');
  const l = d[0].lignes[0];
  assert.equal(l.eleveId, 1); assert.equal(l.nom, 'DUPONT'); assert.equal(l.entreprise, 'GARAGE NOUVEAU');
  assert.equal(l.adresseEntreprise, '2 AVENUE NOUVELLE, 06200, NICE'); assert.equal(l.siretEntreprise, '12345678200028'); assert.equal(l.depot, 'PFMP-2026-S0098');
});

test('écartés : dépôt importé ou validé (sa convention est déjà lue), classé, SIRET non vérifié, élève d’essai, autre année', () => {
  const l = [dep(1, 1, { Decision: 'VALIDEE' }), dep(2, 1, { Importer: true }), dep(3, 1, { Decision: 'REJETEE' }), dep(4, 1, { SIRET_statut: 'A_CONTROLER', Decision: 'A_CONTROLER' }), dep(5, 2), dep(6, 1, { Annee_scolaire: '2025-2026' }), { id: 7, Submission_ID: 'JOT-1', Eleve_match_id: 1 }];
  assert.equal(k.EUC_DEV713_details_({ annee: '2026-2027' }, l, eleves, classes).length, 0);
});

test('filtres du Book : famille, classe, période ; période retrouvée par les dates (date française du catalogue comprise)', () => {
  assert.equal(k.EUC_DEV713_details_({ annee: '2026-2027', famille: 'BTS' }, [dep(98, 1)], eleves, classes).length, 0);
  assert.equal(k.EUC_DEV713_details_({ annee: '2026-2027', classeId: 30 }, [dep(98, 1)], eleves, classes).length, 0);
  assert.equal(k.EUC_DEV713_details_({ annee: '2026-2027', periodeId: 999 }, [dep(98, 1)], eleves, classes).length, 0);
  assert.equal(k.EUC_DEV713_iso_('23/11/2026'), '2026-11-23'); assert.equal(k.EUC_DEV713_iso_('2026-11-23T00:00:00Z'), '2026-11-23');
});

test('Book : dépôts lus avec les conventions en direct (avant l’instantané), caches renouvelés ; lecture seule', () => {
  const b = read('apps-script/EUC_PFMP_DEV538_BookQuotas.js');
  assert.match(b, /direct707=EUC_DEV513_geoAccessDetails_\(scoped\)\.concat\(typeof EUC_DEV713_depotsDetails_==='function'\?EUC_DEV713_depotsDetails_\(scoped\):\[\]\)\.map\(/);
  assert.match(b, /'PUBLIC-BOOK-11'/);
  assert.doesNotMatch(read('apps-script/EUC_DEV713_BookDepots.js'), /EUC_ENT_grist|patch|post\(/);
});

console.log(n + ' tests DEV713 réussis.');
