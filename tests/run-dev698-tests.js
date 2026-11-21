/* DEV698 — Statistiques PFMP : moteur (lecture seule), page, vignette et route. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

function ctx(convs, jot, apprentis, admin) {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, Set, Map };
  vm.createContext(k);
  ['apps-script/EUC_DEV688_ControleNoms.js', 'apps-script/EUC_DEV698_Statistiques.js'].forEach(f => vm.runInContext(read(f), k, { filename: f }));
  const sec = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 1000;
  Object.assign(k, {
    __sec: sec,
    EUC_ADMIN_WORKFLOW_ctxV144_: () => { if (admin === false) throw new Error('Accès administrateur requis.'); return {}; },
    EUC_IMPORT_lireRecords_: t => t === 'EUC_ELEVES_PFMP' ? [{ id: 1, Nom: 'UN', Prenom: 'Élève', Classe: 10 }, { id: 2, Nom: 'DEUX', Prenom: 'Élève', Classe: 20 }]
      : t === 'EUC_MIGRATION_JOTFORM_PFMP' ? (jot || []) : t === 'EUC_ENTREPRISES' ? [{ id: 7, NIS: '7112B19343' }] : [],
    EUC_PFMP_ref_: v => Array.isArray(v) ? v[1] : v,
    EUC_DEV368_catalog: () => ({ classes: [{ classeId: 10, classe: '1CAR', famille: 'BACPRO', periodes: [{ id: 100, libelle: 'PFMP n°1', debut: '05/10/2026', fin: '30/10/2026' }] },
      { classeId: 20, classe: '1BTS', famille: 'BTS', periodes: [{ id: 200, libelle: 'Stage 1', debut: '2026-11-02', fin: '2026-11-27' }] }] }),
    EUC_DEV538_diplomas_: () => ({ 10: 'BAC PRO Carrossier', 20: 'BTS MV' }), EUC_DEV564_diplomaForClass_: (c, d) => d,
    EUC_DEV371_levelOf_: c => /^1/.test(c) ? 'PREMIERE' : 'TERMINALE', EUC_DEV371_levelLabel_: c => c === 'PREMIERE' ? 'Première' : 'Terminale',
    EUC_CONVENTION_lireAccesFraisV108_: () => convs, EUC_ADMIN_WORKFLOW_estDossierVisibleV522_: a => !!a.Entreprise_raison_sociale,
    EUC_PFMP_anneeDossierV148_: a => a.Annee_scolaire, EUC_ADMIN_WORKFLOW_numeroV144_: a => 'N' + a.id,
    EUC_ADMIN_WORKFLOW_identiteEleveV521_: (a, by) => { const e = by[a.Eleve] || {}; return { id: a.Eleve, nom: e.Nom, prenom: e.Prenom, jeune: e.Prenom + ' ' + e.Nom }; },
    EUC_DEV577_modele_: () => apprentis || { groupes: [], cartes: {} },
    EUC_IMPORT_exigerAdminTexte_: () => ({}), EUC_SUIVI2_temoin_: () => ''
  });
  return k;
}
const conv = (id, plus) => Object.assign({ id, Eleve: 1, Annee_scolaire: '2026-2027', Classe_convention: 10, Classe_convention_nom: '1CAR', Periode: 100, Periode_libelle: 'PFMP n°1', Entreprise_raison_sociale: 'Garage A', Entreprise_siret: '12345678900012', Entreprise_commune: 'Nice' }, plus || {});

test('dates, écarts et causes d’interruption (calcul pur)', () => {
  const k = ctx([]);
  assert.equal(k.EUC_DEV698_date_('05/10/2026'), '2026-10-05'); assert.equal(k.EUC_DEV698_date_('2026-10-05T00:00:00Z'), '2026-10-05');
  assert.equal(k.EUC_DEV698_date_(k.__sec('2026-10-12')), '2026-10-12'); assert.equal(k.EUC_DEV698_date_(''), '');
  assert.equal(k.EUC_DEV698_jours_('2026-10-05', '2026-10-12'), 7); assert.equal(k.EUC_DEV698_jours_('', '2026-10-12'), 0);
  assert.equal(k.EUC_DEV698_cause_('Fermeture de l’entreprise (liquidation)'), 'ENTREPRISE');
  assert.equal(k.EUC_DEV698_cause_('Élève renvoyé pour absences répétées'), 'ELEVE');
  assert.equal(k.EUC_DEV698_cause_('Accident de scooter'), 'SANTE'); assert.equal(k.EUC_DEV698_cause_('Autre raison'), 'AUTRE'); assert.equal(k.EUC_DEV698_cause_(''), 'NON_PRECISE');
});

test('année : conventions (y compris interrompues et annulées, révoquées), dépôts en ligne, sans nom d’élève ; décalage, prolongation, rattrapage, remplacement', () => {
  const convs = [
    conv(1, { Date_debut: 0, Date_fin: 0 }),
    conv(2, { Eleve: 2, Classe_convention: 20, Classe_convention_nom: '1BTS', Periode: 200, Periode_libelle: 'Stage 1', Statut_administratif: 'INTERROMPUE', Revoked: true, Motif_interruption: 'Entreprise fermée', Entreprise_raison_sociale: 'Boîte B', Entreprise_siret: '', Entreprise_commune: 'Cannes' }),
    conv(3, { Eleve: 2, Classe_convention: 20, Classe_convention_nom: '1BTS', Periode: 200, Periode_libelle: 'Stage 1', Type_sequence: 'REMPLACEMENT_APRES_RUPTURE', Entreprise_raison_sociale: 'Boîte C', Entreprise_siret: '', Entreprise_nis: '7112Y19343', Entreprise_commune: 'Monaco' }),
    conv(4, { Statut_administratif: 'ANNULEE', Revoked: true, Motif_annulation: 'Erreur' }),
    conv(5, { Revoked: true }), conv(6, { Supprimee_admin: true, Statut_administratif: 'INTERROMPUE' }), conv(7, { Annee_scolaire: '2025-2026' }),
    conv(8, { Type_sequence: 'RATTRAPAGE' }) ];
  const k = ctx(convs);
  convs[0].Date_debut = k.__sec('2026-10-12'); convs[0].Date_fin = k.__sec('2026-11-06');
  convs[2].Date_debut = k.__sec('2026-11-16'); convs[2].Date_fin = k.__sec('2026-12-04'); convs[2].Date_officielle_debut = k.__sec('2026-11-02'); convs[2].Date_officielle_fin = k.__sec('2026-11-27');
  const r = J(k.EUC_DEV698_annee({ annee: '2026-2027' })), x = id => r.conventions.find(c => c.id === String(id));
  assert.deepEqual(r.conventions.map(c => c.id).sort(), ['1', '2', '3', '4', '8']);
  assert.equal(x(1).decalage, 7); assert.equal(x(1).prolongation, 7); assert.equal(x(1).famille, 'BACPRO'); assert.equal(x(1).diplome, 'BAC PRO Carrossier'); assert.equal(x(1).k, 'S12345678900012');
  assert.equal(x(2).statut, 'INTERROMPUE'); assert.equal(x(2).cause, 'ENTREPRISE'); assert.equal(x(2).diplome, 'BTS MV'); assert.equal(x(2).niveau, 'Première');
  assert.equal(x(3).sequence, 'REMPLACEMENT'); assert.equal(x(3).decalage, 14); assert.equal(x(3).prolongation, 7); assert.equal(x(3).k, 'M711219343', 'NIS à la lettre près');
  assert.equal(x(4).statut, 'ANNULEE'); assert.equal(x(8).sequence, 'RATTRAPAGE');
  /* DEV700 : nom de l'élève et n° présents pour les listes de l'administration (débuts décalés, interruptions…) ; page réservée à l'administration. */
  assert.equal(x(2).eleve, 'Élève DEUX'); assert.equal(x(1).numero, 'N1');
  assert.throws(() => ctx(convs, [], null, false).EUC_DEV698_annee({ annee: '2026-2027' }), /administrateur/);
  assert.throws(() => k.EUC_DEV698_annee({ annee: 'x' }), /Année scolaire invalide/);
});

test('apprentis de l’année : entreprise par SIRET, sinon nom ; seuls les contrats en cours', () => {
  const app = { groupes: [{ lignes: [{ classeId: 20, classe: '1BTS', famille: 'BTS', diplome: 'BTS MV' }] }], cartes: { 20: [
    { statut: 'APPRENTI', fiche: { entreprise: 'Garage A', siret: '123 456 789 00012', adresse: '1 rue X, 06000 Nice' } },
    { statut: 'APPRENTI', fiche: { entreprise: 'Atelier Z', siret: '', adresse: '2 rue Y, 06400 Cannes' } },
    { statut: 'FUTUR', fiche: { entreprise: 'Futur', siret: '' } } ] } };
  const r = J(ctx([conv(1)], [], app).EUC_DEV698_annee({ annee: '2026-2027' }));
  assert.equal(r.apprentis.length, 2); assert.equal(r.apprentis[0].k, 'S12345678900012'); assert.equal(r.apprentis[1].commune, 'Cannes'); assert.equal(r.apprentis[1].diplome, 'BTS MV');
  assert.equal(r.conventions[0].k, r.apprentis[0].k, 'stagiaire et apprenti dans la même entreprise');
});

test('années disponibles : année en cours puis les cinq précédentes, pas les années futures', () => {
  const k = ctx([]); k.EUC_DEV368_boot = () => ({ current: '2026-2027', years: ['2026-2027', '2027-2028', '2028-2029', 'x'] });
  assert.deepEqual(J(k.EUC_DEV698_annees()), { annees: ['2026-2027', '2025-2026', '2024-2025', '2023-2024', '2022-2023', '2021-2022'], active: '2026-2027' }, 'années passées, jamais futures');
});

test('page : chargement avec indicateur et délai, filtres, sections, exports Excel bloqués pendant l’export, aucune adresse en dur', () => {
  const h = read('apps-script/Statistiques_PFMP_DEV698.html');
  ['annee', 'fPeriode', 'fFamille', 'fDiplome', 'fClasse', 'comparer', 'calculer', 'xCommunes', 'xListe', 'liste'].forEach(id => assert.match(h, new RegExp('id="' + id + '"')));
  assert.match(h, /calculer\.disabled=true;calculer\.innerHTML='<span class="spinner"><\/span>Calcul en cours…'/);
  assert.match(h, /setTimeout\(function\(\)\{if\(fini\)return;fin\('Le calcul a dépassé 3 minutes/);
  assert.match(h, /withFailureHandler\(function\(e\)\{if\(fini\)return;fin\('Erreur : '/);
  assert.match(h, /btn\.disabled=true;btn\.innerHTML='<span class="spinner"><\/span>Export…'/);
  ['Accueil par entreprise', 'Lieux de stage par commune', 'Filières et diplômes', 'Déroulement des stages', 'Évolution et pistes de prospection', 'Après une interruption', 'Causes des interruptions'].forEach(t => assert.ok(h.includes(t), t));
  assert.match(h, /href="<\?= adminBase \?>\?page=admin-pfmp"/);
  /* Même commune / même filière écrite autrement regroupée (fonction de la page exécutée). */
  const src = h.match(/const cleTexte=[^;]+;/)[0]; const cle = vm.runInNewContext(src + 'cleTexte', {});
  assert.equal(cle('CAGNES-SUR-MER'), cle('Cagnes sur Mer')); assert.equal(cle('ST LAURENT DU VAR'), cle('Saint-Laurent-du-Var'));
  assert.equal(cle("BAC PRO Métiers de l'Électricité"), cle("BAC PRO Metiers de l'Electricité")); assert.notEqual(cle('NICE'), cle('NIZZA'));
  assert.match(h, /DATA\[ans\[i\]\]=normaliser\(m\)/); assert.match(h, /AUTRES_FORMATIONS:'Autres formations'/); assert.ok(!/lycee-les-eucalyptus|loucodi/.test(h));
});

test('route, contrôle de publication et vignette de l’accueil d’administration', () => {
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'statistiques-pfmp':\n      return EUC_DEV698_afficher\(e\);/);
  assert.match(read('scripts/pfmp-release-config.json'), /"page": "statistiques-pfmp", "scope": "admin", "expected": "Statistiques PFMP"/);
  const a = read('apps-script/Admin_PFMP.html'); assert.match(a, /<section class="card stats">\s*<h2>Statistiques<\/h2>/); assert.ok(a.includes('href="<?= adminBase ?>?page=statistiques-pfmp"'));
  assert.match(read('apps-script/EUC_DEV698_Statistiques.js'), /createTemplateFromFile\('Statistiques_PFMP_DEV698'\)[\s\S]*setTitle\('Statistiques PFMP'\)/);
});
console.log(n + ' tests DEV698 réussis.');
