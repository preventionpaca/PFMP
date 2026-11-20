/* DEV699 — Période officielle (dates décalées), « Ne pas prévenir l'élève », statistiques détaillées. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

function ctx(convs, jot) {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, Set, Map };
  vm.createContext(k);
  ['apps-script/EUC_DEV688_ControleNoms.js', 'apps-script/EUC_DEV698_Statistiques.js'].forEach(f => vm.runInContext(read(f), k, { filename: f }));
  Object.assign(k, {
    EUC_ADMIN_WORKFLOW_ctxV144_: () => ({}),
    EUC_IMPORT_lireRecords_: t => t === 'EUC_ELEVES_PFMP' ? [{ id: 1, Nom: 'UN', Prenom: 'A', Classe: 10 }, { id: 2, Nom: 'DEUX', Prenom: 'B', Classe: 10 }, { id: 3, Nom: 'TROIS', Prenom: 'C', Classe: 10 }]
      : t === 'EUC_MIGRATION_JOTFORM_PFMP' ? (jot || []) : [],
    EUC_PFMP_ref_: v => Array.isArray(v) ? v[1] : v,
    EUC_DEV368_catalog: () => ({ classes: [{ classeId: 10, classe: '1MELEC', famille: 'BACPRO', periodes: [
      { id: 101, libelle: 'PFMP 1ère 2026-11-23 → 2026-12-18', debut: '23/11/2026', fin: '18/12/2026' }, { id: 102, libelle: 'PFMP 1ère 2027-03-01 → 2027-03-26', debut: '01/03/2027', fin: '26/03/2027' }] }] }),
    EUC_DEV371_levelOf_: () => 'PREMIERE', EUC_DEV371_levelLabel_: () => 'Première',
    EUC_CONVENTION_lireAccesFraisV108_: () => convs, EUC_ADMIN_WORKFLOW_estDossierVisibleV522_: a => !!a.Entreprise_raison_sociale,
    EUC_PFMP_anneeDossierV148_: a => a.Annee_scolaire, EUC_ADMIN_WORKFLOW_numeroV144_: a => 'N' + a.id,
    EUC_ADMIN_WORKFLOW_identiteEleveV521_: (a, by) => { const e = by[a.Eleve] || {}; return { id: a.Eleve, nom: e.Nom, prenom: e.Prenom, jeune: e.Prenom + ' ' + e.Nom }; },
    EUC_DEV577_modele_: () => ({ groupes: [], cartes: { 10: [{ statut: 'APPRENTI', fiche: { entreprise: '', siret: '' } }] } }), EUC_SUIVI2_temoin_: () => ''
  });
  return k;
}
const conv = (id, plus) => Object.assign({ id, Eleve: 1, Annee_scolaire: '2026-2027', Classe_convention: 10, Classe_convention_nom: '1MELEC', Entreprise_raison_sociale: 'Garage A', Entreprise_siret: '12345678900012', Entreprise_commune: 'Nice', Entreprise_code_postal: '06200' }, plus || {});
const iso = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 1000;

test('période officielle : par référence, par dates (décalées), par numéro seul ; libellés différents réunis', () => {
  const k = ctx([]), l = [{ id: 101, libelle: 'P1', debut: '2026-11-23', fin: '2026-12-18' }, { id: 102, libelle: 'P2', debut: '2027-03-01', fin: '2027-03-26' }];
  assert.equal(k.EUC_DEV688_periodeOfficielle_(l, 102, '', '', '').id, 102);
  assert.equal(k.EUC_DEV688_periodeOfficielle_(l, 0, '2026-11-30', '2026-12-24', 'Dates individuelles').id, 101, 'départ décalé d’une semaine');
  assert.equal(k.EUC_DEV688_periodeOfficielle_(l, 0, '2027-02-15', '2027-02-26', '').id, 102, 'départ 2 semaines avant, sans chevauchement');
  assert.equal(k.EUC_DEV688_periodeOfficielle_(l, 0, '', '', 'PFMP n°2').id, 102); assert.equal(k.EUC_DEV688_periodeOfficielle_(l, 0, '', '', '1').id, 101);
  assert.equal(k.EUC_DEV688_periodeOfficielle_(l, 0, '2026-06-01', '2026-06-20', 'x'), null);
});

test('contrôle des noms : toutes les conventions d’une même période ont le même libellé, dates décalées signalées', () => {
  const convs = [conv(1, { Periode: 101, Periode_libelle: 'PFMP 1ère 2026-11-23 → 2026-12-18', Date_debut: iso('2026-11-23'), Date_fin: iso('2026-12-18') }),
    conv(2, { Eleve: 2, Periode_libelle: 'Du 30/11 au 24/12', Date_debut: iso('2026-11-30'), Date_fin: iso('2026-12-24') }),
    conv(3, { Eleve: 3, Periode_libelle: 'PFMP n°1' })];
  const jot = [{ id: 9, Eleve_match_id: 1, Submission_ID: 'SECOURS-PFMP-2026-S0001', Periode_numero: '1', SIRET_normalise: '99999999900011', SIRET_statut: 'VERIFIE', Date_debut_brut: '2026-11-23', Date_fin_brut: '2026-12-18' }];
  const r = J(ctx(convs, jot).EUC_DEV688_controleNoms({ annee: '2026-2027' })), x = id => r.conventions.find(c => String(c.id) === String(id));
  const lib = 'PFMP 1ère 2026-11-23 → 2026-12-18';
  [1, 2, 3, 'S9'].forEach(id => assert.equal(x(id).periode, lib, 'conv ' + id));
  assert.equal(x(1).decale, false); assert.equal(x(2).decale, true); assert.equal(x(2).debut, '2026-11-30'); assert.equal(x(2).periodeDebut, '2026-11-23'); assert.equal(x(2).periodeBrute, 'Du 30/11 au 24/12');
  assert.equal(x('S9').decale, false);
  const h = read('apps-script/Admin_Conventions_PFMP.html');
  assert.match(h, /cnOpts\(cnPeriode,perOpts\(r1\),'Toutes les périodes'\)/); assert.match(h, /cnOpts\(lsPeriode,perOpts\(r1\),'Toutes les périodes'\)/);
  assert.match(h, /⚠ dates décalées : /); assert.match(h, /\(x\.decale\?'<br>'\+decale\(x\):''\)/); assert.match(h, /\(c\.decale\?' '\+decale\(c\):''\)/);
});

test('statistiques : code postal du lieu de stage, période officielle, apprenti sans entreprise jamais compté comme entreprise', () => {
  const convs = [conv(1, { Periode_libelle: 'Dates individuelles', Date_debut: iso('2026-11-30'), Date_fin: iso('2026-12-18') })];
  const r = J(ctx(convs).EUC_DEV698_annee({ annee: '2026-2027' }));
  assert.equal(r.conventions[0].cp, '06200'); assert.equal(r.conventions[0].periode, 'PFMP 1ère 2026-11-23 → 2026-12-18'); assert.equal(r.conventions[0].decalage, 7);
  assert.equal(r.conventions[0].debutOfficiel, '2026-11-23'); assert.equal(r.apprentis.length, 1); assert.equal(r.apprentis[0].k, '', 'pas de clé d’entreprise vide');
});

test('« Ne pas prévenir l’élève » : trace seule, plus d’alerte, décision et suivi inchangés, aucun courriel', () => {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, __patch: [] };
  vm.createContext(k);
  vm.runInContext(read('apps-script/EUC_DEV669_Resolution.js'), k);
  const f = { Alertes: 'Entreprise non vérifiée (Monaco) — élève envoyé au bureau G205', Email_eleve: 'e@exemple.test', Decision: 'A_VALIDER', Submission_ID: 'SECOURS-PFMP-2026-S0013' };
  Object.assign(k, { EUC_IMPORT_exigerAdminTexte_: () => ({}), EUC_DEV666_dansSuivi_: () => true, EUC_DEV665_ligne_: () => ({ id: 13, fields: f }),
    EUC_DEV665_trace_: (a, t) => a + ' — ' + t, EUC_DEV665_patch_: (id, c) => k.__patch.push([id, c]), EUC_DEV666_finir_: (id, x) => ({ id, aPrevenir: k.EUC_DEV669_aPrevenir_(x) }),
    MailApp: { sendEmail() { throw new Error('aucun courriel'); } }, GmailApp: { sendEmail() { throw new Error('aucun courriel'); } } });
  assert.equal(k.EUC_DEV669_aPrevenir_(f), true);
  const r = J(k.EUC_DEV669_nePasPrevenir({ id: 13 }));
  assert.equal(r.soumission.aPrevenir, false); assert.deepEqual(Object.keys(k.__patch[0][1]), ['Alertes']); assert.match(k.__patch[0][1].Alertes, /Élève non prévenu \(choix du bureau\)$/);
  assert.equal(k.EUC_DEV669_aPrevenir_(Object.assign({}, f, { Alertes: k.__patch[0][1].Alertes })), false);
  const h = read('apps-script/Soumissions_A_Traiter_DEV665.html');
  assert.match(h, /bouton\('nePasPrevenir',x\.id,'Ne pas prévenir l’élève','gris'\)/); assert.match(h, /if\(a==='nePasPrevenir'\)\{occupe\(b,true,'Enregistrement…'\)/);
  assert.match(h, /appel\('EUC_DEV669_nePasPrevenir',\{id:id\},60000,/);
});

test('page des statistiques : détails des chiffres clés (survol ou clic, fenêtre défilante), tableaux triables, secteurs de Nice, classes accueillies ensemble, totaux', () => {
  const h = read('apps-script/Statistiques_PFMP_DEV698.html');
  ['eleves', 'conventions', 'entreprises', 'communes', 'apprentis', 'mixtes'].forEach(c => assert.ok(h.includes("'" + c + "'"), c));
  assert.match(h, /#detail \.corps\{max-height:60vh;overflow:auto/); assert.match(h, /addEventListener\('mouseover'/); assert.match(h, /addEventListener\('click',function\(ev\)\{const t=ev\.target\.closest\('\.tuile'\)/);
  assert.match(h, /button\[data-tri\]/); assert.match(h, /'06000':'Nice centre','06100':'Nice nord','06200':'Nice ouest','06300':'Nice est'/);
  assert.match(h, /e\.etiquettes\.add\(x\.classe\+' \(stage\)'\)/); assert.match(h, /e\.etiquettes\.add\(a\.classe\+' \(apprenti\)'\)/);
  assert.match(h, /Total : '\+both\.length\+' entreprises avec au moins un stagiaire et un apprenti/);
  assert.match(h, /x\.classe\?'Classe '\+x\.classe\+' \(diplôme non renseigné\)'/);
  /* Tri : exécution réelle du composant de tableau. */
  const src = h.match(/const TABLES=\{\};[\s\S]*?function rendreTable\(id\)\{[\s\S]*?\n  document\.addEventListener/)[0].replace(/\n  document\.addEventListener$/, '');
  const c = vm.createContext({ String, Number, Array, Math });
  vm.runInContext('const esc=function(v){return String(v)};' + src + ';this.tableau=tableau;this.rendreTable=rendreTable;this.TABLES=TABLES;', c);
  c.tableau('t', ['Commune', 'Secteur', 'Entreprises'], [{ c: ['NICE', '4 codes postaux', 120], enfants: [['NICE', '06000', 50], ['NICE', '06100', 70]] }, ['CANNES', '06400', 6], ['ANTIBES', '06600', 7]], [2], [2, -1]);
  const ordre = () => (c.rendreTable('t').match(/<tr(?: class="enfant")?><td>[^<]*<\/td><td>[^<]*/g) || []).map(x => x.replace(/<[^>]+>/g, '|').split('|').filter(Boolean).join(' '));
  assert.deepEqual(ordre(), ['NICE 4 codes postaux', 'NICE 06000', 'NICE 06100', 'ANTIBES 06600', 'CANNES 06400']);
  c.TABLES.t.col = 0; c.TABLES.t.dir = 1;
  assert.deepEqual(ordre(), ['ANTIBES 06600', 'CANNES 06400', 'NICE 4 codes postaux', 'NICE 06000', 'NICE 06100'], 'tri alphabétique, secteurs sous Nice');
});
console.log(n + ' tests DEV699 réussis.');
