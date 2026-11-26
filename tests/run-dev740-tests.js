'use strict';
/* DEV740 — « Valider sous réserve » : entreprise injoignable, SIRET non confirmé (données fictives). */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

/* Bureau : table d'attente simulée (une ligne), écritures relevées. */
function bureau(fields) {
  const ecrits = [], ligne = { id: 79, fields };
  const s = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, encodeURIComponent,
    EUC_IMPORT_exigerAdminTexte_() { return { email: 'bureau@exemple.invalid' }; }, EUC_V160_TABLE_: 'T', Utilities: { formatDate: () => '26/11/2026 10:00' },
    EUC_ENT_grist(m, u, body) {
      if (m === 'get' && /columns$/.test(u)) return { columns: Object.keys(fields).concat(['Niveau_controle', 'Decision', 'Alertes', 'Date_validation', 'Valide_par']).map(id => ({ id })) };
      if (m === 'get') return { records: [ligne] };
      ecrits.push([m, u, body]); Object.assign(ligne.fields, ((body && body.records) || [])[0] ? body.records[0].fields : {}); return {};
    } };
  vm.createContext(s);
  ['apps-script/EUC_DEV665_DemandesAide.js', 'apps-script/EUC_DEV740_SousReserve.js'].forEach(f => vm.runInContext(read(f), s, { filename: f }));
  s.ecrits = ecrits; s.ligne = ligne; return s;
}
const depot = o => Object.assign({ Submission_ID: 'SECOURS-PFMP-2026-S9101', Eleve_match_id: 20, Eleve_match_libelle: 'KAPPA Kim', Periode_numero: '1', Decision: 'A_CONTROLER',
  Niveau_controle: 'ROUGE', SIRET_statut: 'A_CONTROLER', SIRET_brut: '11122233300012', SIRET_normalise: '11122233300012', Entreprise_saisie: 'GARAGE FICTIF', Alertes: 'SIRET introuvable' }, o);

test('avant : SIRET non vérifié → hors du suivi, à traiter ; bouton « Valider sous réserve » proposé', () => {
  const x = bureau(depot()).EUC_DEV665_enAttente_([{ id: 79, fields: depot() }])[0];
  assert.equal(x.dansSuivi, false); assert.equal(x.reserve, false); assert.equal(x.aTraiter, true);
  assert.match(read('apps-script/Soumissions_A_Traiter_DEV665.html'), /\(!x\.reserve&&x\.eleveId&&\(!x\.dansSuivi\|\|x\.ferme\)&&!x\.doublonDe\?bouton\('reserve'/);
});

test('valider sous réserve : une seule ligne écrite (RESERVE, motif tracé) ; dans le suivi et toujours à traiter ; ni convention ni courriel', () => {
  const s = bureau(depot());
  const r = J(s.EUC_DEV740_sousReserve({ id: 79, motif: 'entreprise injoignable : SIRET à confirmer' }));
  assert.equal(s.ecrits.length, 1);
  const f = s.ecrits[0][2].records[0].fields;
  assert.equal(f.Niveau_controle, 'RESERVE'); assert.equal(f.Decision, 'A_CONTROLER'); assert.match(f.Alertes, /Validé sous réserve par le bureau \(numéro 11122233300012\) — entreprise injoignable/);
  assert.equal(r.soumission.reserve, true); assert.equal(r.soumission.dansSuivi, true); assert.equal(r.soumission.aTraiter, true); assert.equal(r.soumission.pret, false, 'pas de « Valider : créer la convention »');
  assert.match(r.soumission.raison, /Validé sous réserve/);
  const code = read('apps-script/EUC_DEV740_SousReserve.js');
  assert.ok(!/EUC_DEV466_importSelection|MailApp|GmailApp|EUC_DEV669_prevenir_/.test(code), 'aucune convention ni courriel');
});

test('refus : motif vide, déjà sous réserve, déjà dans le suivi sans alerte, élève non reconnu, dépôt clos', () => {
  assert.throws(() => bureau(depot()).EUC_DEV740_sousReserve({ id: 79, motif: ' ' }), /raison/);
  assert.throws(() => bureau(depot({ Niveau_controle: 'RESERVE' })).EUC_DEV740_sousReserve({ id: 79, motif: 'x' }), /déjà validé sous réserve/);
  assert.throws(() => bureau(depot({ Niveau_controle: 'VERT', SIRET_statut: 'VERIFIE' })).EUC_DEV740_sousReserve({ id: 79, motif: 'x' }), /déjà compté/);
  assert.throws(() => bureau(depot({ Eleve_match_id: 0 })).EUC_DEV740_sousReserve({ id: 79, motif: 'x' }), /Élève non reconnu/);
  assert.throws(() => bureau(depot({ Decision: 'REJETEE' })).EUC_DEV740_sousReserve({ id: 79, motif: 'x' }), /déjà (clos|traité)/);
  /* Établissement fermé selon l'INSEE (SIRET vérifié) : la réserve est possible. */
  const s = bureau(depot({ Niveau_controle: 'ORANGE', SIRET_statut: 'VERIFIE' }));
  assert.equal(J(s.EUC_DEV740_sousReserve({ id: 79, motif: 'patron injoignable' })).soumission.reserve, true);
});

test('issue positive : nouveau SIRET vérifié (« Vérifier le SIRET » remet le contrôle) ou réserve levée sur un SIRET vérifié', () => {
  const v = bureau(depot({ Niveau_controle: 'RESERVE' })).EUC_DEV665_vue_({ id: 79, fields: depot({ Niveau_controle: 'VERT', SIRET_statut: 'VERIFIE' }) });
  assert.equal(v.reserve, false, 'Niveau_controle VERT ou ORANGE (posé par « Vérifier le SIRET ») = réserve levée');
  assert.throws(() => bureau(depot({ Niveau_controle: 'RESERVE' })).EUC_DEV740_leverReserve({ id: 79, motif: 'x' }), /SIRET non vérifié/);
  const s = bureau(depot({ Niveau_controle: 'RESERVE', SIRET_statut: 'VERIFIE' }));
  const r = J(s.EUC_DEV740_leverReserve({ id: 79, motif: 'entreprise contactée : SIRET confirmé' }));
  const f = s.ecrits[0][2].records[0].fields;
  assert.equal(f.Niveau_controle, 'VERT'); assert.match(f.Alertes, /Réserve levée par le bureau : SIRET 11122233300012 confirmé/);
  assert.equal(r.soumission.reserve, false); assert.equal(r.soumission.aTraiter, false); assert.equal(r.soumission.dansSuivi, true);
});

test('issue négative : « Annuler le stage » = classé sans suite (jamais supprimé) ; plus dans le suivi', () => {
  const s = bureau(depot({ Niveau_controle: 'RESERVE', SIRET_statut: 'VERIFIE' }));
  s.EUC_DEV665_sansSuite({ id: 79, motif: 'entreprise non confirmée : stage annulé' });
  const f = s.ecrits[0][2].records[0].fields;
  assert.equal(f.Decision, 'REJETEE'); assert.ok(!s.ecrits.some(e => e[0] === 'delete' || /remove/i.test(e[1])));
  assert.equal(s.EUC_DEV666_dansSuivi_(Object.assign(depot({ Niveau_controle: 'RESERVE', SIRET_statut: 'VERIFIE' }), { Decision: 'REJETEE' })), false);
  assert.match(read('apps-script/Soumissions_A_Traiter_DEV665.html'), /x\.reserve\?bouton\('annulerStage'/);
});

/* Suivi : moteur réel sur une classe fictive. */
const m = { console, JSON, Math, Date, Object, Array, String, Number, Error };
vm.createContext(m); vm.runInContext(read('apps-script/EUC_SUIVI2_Moteur.js'), m);
const R = (id, fields) => ({ id, fields });
function suivi(jotform) {
  const src = { annees: [R(1, { Code: '2026-2027' })], classes: [R(11, { Nom: '1MVA1' })], diplomes: [], dossiers: [], pdif: [], entreprises: [], types: [], affectations: [], professeurs: [], classesProfs: [], apprentissage: [],
    periodes: [R(100, { Annee_scolaire: 1, Classes_concernees: ['L', 11], Date_debut: '2026-11-02', Date_fin: '2026-11-27' })],
    eleves: [R(20, { Nom: 'KAPPA', Prenom: 'Kim', Classe: 11, Annee_scolaire: 1 })], jotform };
  const r = m.EUC_SUIVI2_calculer_(src, '2026-2027', '2026-11-26').classes[0].periodes[0].resume;
  return { statut: r.statuts[20] || 'SANS', fiche: r.fiches[20] || null };
}
const tampon = o => R(840, Object.assign({ Eleve_match_id: 20, Submission_ID: 'SECOURS-PFMP-2026-S9101', Decision: 'A_CONTROLER', SIRET_statut: 'A_CONTROLER', SIRET_normalise: '1112223', Entreprise_saisie: 'GARAGE FICTIF', Date_debut_brut: '2026-11-02', Date_fin_brut: '2026-11-27' }, o));

test('suivi : sous réserve = compté avec la mention ; sans réserve = non compté ; stage annulé = non compté', () => {
  const a = suivi([tampon({ Niveau_controle: 'RESERVE' })]);
  assert.equal(a.statut, 'AVEC'); assert.equal(a.fiche.reserve, true); assert.equal(a.fiche.entreprise, 'GARAGE FICTIF');
  assert.equal(suivi([tampon({ Niveau_controle: 'ROUGE' })]).statut, 'SANS', 'comportement inchangé sans réserve');
  assert.equal(suivi([tampon({ Niveau_controle: 'RESERVE', Decision: 'REJETEE', SIRET_statut: 'VERIFIE', SIRET_normalise: '11122233300012' })]).statut, 'SANS', 'stage annulé');
  const v = suivi([tampon({ Niveau_controle: 'VERT', SIRET_statut: 'VERIFIE', SIRET_normalise: '11122233300012' })]);
  assert.equal(v.statut, 'AVEC'); assert.ok(!v.fiche.reserve, 'réserve levée : plus de mention');
  assert.match(read('apps-script/EUC_SUIVI2_Moteur.js'), /EUC_SUIVI2_VERSION_ = '1\.0\.0-dev\.740'/, 'modèle recalculé');
});

test('affichage : tableau du suivi, export et tableau de dépôt portent « Sous réserve de validation de l’entreprise » ; boutons avec indicateur', () => {
  const p = read('apps-script/Suivi_Enseignants_DEV576.html');
  assert.match(p, /if\(f\.reserve\)badge\+='<span class="decale">Sous réserve de validation de l’entreprise<\/span>'/);
  assert.match(p, /if\(f\.reserve\)statut\+='\\nSous réserve de validation de l’entreprise'/);
  assert.match(read('apps-script/EUC_DEV663_TableauDepot.js'), /f\.reserve \? 'Sous réserve de validation de l’entreprise' : ''/);
  const h = read('apps-script/Soumissions_A_Traiter_DEV665.html');
  ['EUC_DEV740_sousReserve', 'EUC_DEV740_leverReserve'].forEach(fn => assert.match(h, new RegExp("occupe\\(b,true,'Enregistrement…'\\);msg\\(id,''\\);\\n\\s+appel\\('" + fn + "'")));
  assert.match(h, /occupe\(b,true,'Annulation…'\)/);
  assert.match(h, /function bouton\(action,id,texte,cls\)\{return '<button[^']*'[^>]*><span class="spin"><\/span>/);
});

console.log('\n' + n + ' tests DEV740 réussis.');
