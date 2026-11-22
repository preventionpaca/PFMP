/* DEV706 — Fiabiliser les contacts entreprises : regroupement par personne, incohérences, référence sans réécrire les conventions. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

function ctx(convs, jot, refs) {
  const ecrits = [];
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, Set, Map };
  vm.createContext(k);
  ['apps-script/EUC_DEV688_ControleNoms.js', 'apps-script/EUC_DEV706_Contacts.js'].forEach(f => vm.runInContext(read(f), k, { filename: f }));
  Object.assign(k, {
    EUC_ADMIN_WORKFLOW_ctxV144_: () => ({ email: 'admin@test' }),
    EUC_IMPORT_lireRecords_: t => t === 'EUC_ELEVES_PFMP' ? [{ id: 1, Nom: 'UN', Prenom: 'A', Classe: 20 }, { id: 2, Nom: 'DEUX', Prenom: 'B', Classe: 20 }] : t === 'EUC_MIGRATION_JOTFORM_PFMP' ? (jot || []) : t === 'EUC_CONTACTS_REFERENCE' ? (refs || []) : [],
    EUC_PFMP_ref_: v => Array.isArray(v) ? v[1] : v,
    EUC_DEV368_catalog: () => ({ classes: [] }), EUC_DEV371_levelOf_: () => '', EUC_DEV371_levelLabel_: () => '',
    EUC_CONVENTION_lireAccesFraisV108_: () => convs, EUC_ADMIN_WORKFLOW_estDossierVisibleV522_: () => true,
    EUC_PFMP_anneeDossierV148_: a => a.Annee_scolaire, EUC_ADMIN_WORKFLOW_numeroV144_: a => 'N' + a.id,
    EUC_ADMIN_WORKFLOW_identiteEleveV521_: (a, by) => { const e = by[a.Eleve] || {}; return { id: a.Eleve, nom: e.Nom, prenom: e.Prenom, jeune: e.Prenom + ' ' + e.Nom }; },
    EUC_SUIVI2_temoin_: () => '', EUC_DEV572_lire_: () => null, EUC_DEV572_ecrire_: () => true,
    EUC_DEV562_ensureTable_: () => {}, LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    EUC_ENT_grist: (m, chemin, corps) => { ecrits.push([m, chemin, corps]); return {}; }
  });
  k.ecrits = ecrits;
  return k;
}
const conv = (id, o) => Object.assign({ id, Eleve: 1, Annee_scolaire: '2026-2027', Entreprise_raison_sociale: 'GARAGE AZUR', Entreprise_siret: '12345678900012', Entreprise_adresse: '1 rue du Port', Entreprise_code_postal: '06300', Entreprise_commune: 'NICE' }, o);

test('clés : accents, civilité, prénom et nom inversés ; téléphones France et Monaco ; courriels suspects', () => {
  const k = ctx([]);
  assert.equal(k.EUC_DEV706_cleNom_('M. Jérôme MARTIN'), k.EUC_DEV706_cleNom_('martin jerome'));
  assert.equal(k.EUC_DEV706_tel_('+33 6 12 34 56 78'), '0612345678'); assert.equal(k.EUC_DEV706_tel_('00377 93 15 00 00'), '37793150000');
  assert.equal(k.EUC_DEV706_telValide_('0612345678'), true); assert.equal(k.EUC_DEV706_telValide_('061234567'), false); assert.equal(k.EUC_DEV706_telValide_('37793150000'), true); assert.equal(k.EUC_DEV706_telValide_('93150000'), true);
  assert.equal(k.EUC_DEV706_telAffiche_('0612345678'), '06 12 34 56 78');
  assert.equal(k.EUC_DEV706_courrielValide_('jean.martin@garage.fr'), true); assert.equal(k.EUC_DEV706_courrielValide_('jean.martin@garage'), false);
  assert.equal(k.EUC_DEV706_courrielSuspect_('jean@gmial.com'), true); assert.equal(k.EUC_DEV706_courrielSuspect_('jean@gmail.con'), true); assert.equal(k.EUC_DEV706_courrielSuspect_('jean@gmail.com'), false);
  assert.equal(k.EUC_DEV706_proches_('jerome martin', 'jerome martn'), true, 'une lettre');
  assert.equal(k.EUC_DEV706_proches_('martin', 'jerome martin'), true, 'nom seul');
  assert.equal(k.EUC_DEV706_proches_('jerome martin', 'paul durand'), false);
});

test('regroupement : variantes d’une même personne réunies, coordonnées divergentes et douteuses signalées, lieu ou siège', () => {
  const k = ctx([
    conv(1, { Responsable_prenom: 'Jérôme', Responsable_nom: 'MARTIN', Responsable_telephone: '06 12 34 56 78', Responsable_courriel: 'j.martin@garage-azur.fr', Tuteur_prenom: 'Paul', Tuteur_nom: 'DURAND', Tuteur_telephone: '04 93 00 00 00', Tuteur_courriel: 'paul@gmial.com' }),
    conv(2, { Eleve: 2, Annee_scolaire: '2025-2026', Responsable_prenom: 'Jerome', Responsable_nom: 'MARTN', Responsable_telephone: '06 12 34 56 79', Responsable_courriel: 'j.martin@garage-azur.fr', Tuteur_prenom: '', Tuteur_nom: 'Durand', Tuteur_telephone: '0493000000', Tuteur_courriel: '',
      Lieu_stage_adresse: '9 quai Lunel', Lieu_stage_code_postal: '06300', Lieu_stage_commune: 'NICE' })]);
  const l = J(k.EUC_DEV706_calcul_()).personnes;
  assert.equal(l.length, 2, 'deux personnes : MARTIN (2 orthographes) et DURAND (nom seul)');
  const m = l.find(p => /MARTIN/i.test(p.nom)), d = l.find(p => /DURAND/i.test(p.nom));
  assert.deepEqual(m.roles, ['RESPONSABLE']); assert.equal(m.noms.length, 2); assert.equal(m.risque, 3);
  assert.ok(m.alertes.some(a => /Orthographes différentes/.test(a.t))); assert.ok(m.alertes.some(a => /2 téléphones différents/.test(a.t)));
  assert.deepEqual(m.annees, ['2026-2027', '2025-2026']); assert.equal(m.siege, '1 rue du Port, 06300 NICE'); assert.ok(m.lieux.indexOf('9 quai Lunel, 06300 NICE') >= 0);
  assert.ok(d.alertes.some(a => /Domaine de courriel suspect/.test(a.t))); assert.ok(d.alertes.some(a => /Nom incomplet/.test(a.t)));
  assert.equal(d.saisies.length, 2); assert.equal(d.saisies[0].numero, 'N1');
  assert.equal(d.nom, 'Paul DURAND', 'à égalité, le nom le plus complet est proposé'); assert.deepEqual(m.lieux, ['SIEGE', '9 quai Lunel, 06300 NICE'], 'siège et lieu de stage');
  assert.equal(d.courriels[0].proposition, 'paul@gmail.com'); assert.ok(d.alertes.some(a => /vouliez-vous dire paul@gmail\.com/.test(a.t)));
});

test('même téléphone pour deux personnes différentes ; téléphone invalide ; saisie sans nom rattachée par le téléphone', () => {
  const k = ctx([conv(1, { Responsable_prenom: 'Ana', Responsable_nom: 'ROSSI', Responsable_telephone: '0493000000', Tuteur_prenom: 'Luc', Tuteur_nom: 'BLANC', Tuteur_telephone: '0493000000', Tuteur_courriel: 'luc@azur.fr' }),
    conv(2, { Responsable_prenom: '', Responsable_nom: '', Responsable_telephone: '', Responsable_courriel: 'luc@azur.fr', Tuteur_prenom: 'Luc', Tuteur_nom: 'BLANC', Tuteur_telephone: '06 12 34', Tuteur_courriel: 'luc@azur.fr' })]);
  const l = J(k.EUC_DEV706_calcul_()).personnes, b = l.find(p => p.nom === 'Luc BLANC'), r = l.find(p => p.nom === 'Ana ROSSI');
  assert.ok(r.alertes.some(a => /Même téléphone que Luc BLANC/.test(a.t)));
  assert.ok(b.alertes.some(a => /Téléphone invalide : 061234/.test(a.t)));
  assert.equal(b.saisies.length, 3, 'courriel seul rattaché à Luc BLANC'); assert.deepEqual(b.roles, ['RESPONSABLE', 'TUTEUR']);
  assert.ok(!l.some(p => p.nom === '(nom absent)'));
});

test('référence : alertes levées ; nouvelle saisie différente depuis la validation signalée ; jamais d’écriture dans les conventions', () => {
  const convs = [conv(1, { Responsable_prenom: 'Jérôme', Responsable_nom: 'MARTIN', Responsable_telephone: '0612345678', Responsable_courriel: 'j.martin@garage-azur.fr' }), conv(2, { Responsable_prenom: 'Jerome', Responsable_nom: 'MARTN', Responsable_telephone: '0612345678', Responsable_courriel: 'j.martin@garage-azur.fr' })];
  const k0 = ctx(convs), p = J(k0.EUC_DEV706_calcul_()).personnes[0];
  const ref = { id: 7, Cle_entreprise: p.k, Nom_reference: 'Jérôme MARTIN', Telephone_reference: '06 12 34 56 78', Courriel_reference: 'j.martin@garage-azur.fr', Cles_noms: p.cles.noms.join('|'), Cles_telephones: p.cles.tels.join('|'), Cles_courriels: p.cles.courriels.join('|'), Valide_le: '2026-11-22T10:00:00Z', Actif: true };
  const v = J(ctx(convs, [], [ref]).EUC_DEV706_calcul_()).personnes[0];
  assert.equal(v.risque, 0); assert.deepEqual(v.alertes, []); assert.equal(v.reference.nom, 'Jérôme MARTIN'); assert.equal(v.reference.le, '2026-11-22');
  const v2 = J(ctx(convs.concat([conv(3, { Responsable_prenom: 'Jérôme', Responsable_nom: 'MARTIN', Responsable_telephone: '0699999999' })]), [], [ref]).EUC_DEV706_calcul_()).personnes[0];
  assert.equal(v2.risque, 2); assert.match(v2.alertes[0].t, /Nouvelle saisie différente depuis la validation du 2026-11-22/);
  assert.equal(J(ctx(convs, [], [Object.assign({}, ref, { Actif: false })]).EUC_DEV706_calcul_()).personnes[0].reference, null, 'référence retirée');
  /* Enregistrement : une seule écriture, dans la base des contacts. */
  const k = ctx(convs);
  k.EUC_DEV706_enregistrer({ k: p.k, entreprise: 'GARAGE AZUR', roles: ['RESPONSABLE'], cles: p.cles, nom: 'Jérôme MARTIN', telephone: '+33 6 12 34 56 78', courriel: 'J.Martin@garage-azur.fr', motif: 'confirmé' });
  assert.equal(k.ecrits.length, 1); assert.equal(k.ecrits[0][0], 'post'); assert.equal(k.ecrits[0][1], '/tables/EUC_CONTACTS_REFERENCE/records');
  const f = k.ecrits[0][2].records[0].fields;
  assert.equal(f.Telephone_reference, '06 12 34 56 78'); assert.equal(f.Courriel_reference, 'j.martin@garage-azur.fr'); assert.equal(f.Valide_par, 'admin@test'); assert.equal(f.Actif, true);
  assert.throws(() => k.EUC_DEV706_enregistrer({ k: p.k, nom: 'Jérôme MARTIN', telephone: '06 12' }), /Téléphone de référence invalide/);
  assert.throws(() => k.EUC_DEV706_enregistrer({ k: p.k, nom: 'Jérôme MARTIN', courriel: 'jerome@' }), /Courriel de référence mal formé/);
  assert.throws(() => k.EUC_DEV706_enregistrer({ k: p.k, nom: '' }), /nom de référence/);
  k.EUC_DEV706_retirer({ referenceId: 7 });
  assert.deepEqual(k.ecrits[1][2].records[0].fields.Actif, false, 'retrait : désactivée, jamais supprimée');
  const js = read('apps-script/EUC_DEV706_Contacts.js');
  const ecritures = js.match(/EUC_ENT_grist\((?:'(?:post|patch|delete|put)'|id \? 'patch' : 'post'|existing \? 'patch' : 'post'), [^,)]*/g) || [];
  assert.ok(ecritures.length >= 3, ecritures.join(' / '));
  assert.deepEqual(ecritures.filter(x => !/EUC_DEV706_TABLE_|, t$/.test(x)), [], 'aucune autre table écrite');
  assert.match(js, /\bt = '\/tables\/' \+ EUC_DEV706_TABLE_ \+ '\/records'/);
  assert.doesNotMatch(js, /'delete'/); assert.doesNotMatch(js, /EUC_CONVENTIONS?_PFMP|Conventions'/);
});

test('dépôts en ligne : courriels du responsable et du tuteur repris', () => {
  const k = ctx([], [{ id: 5, Eleve_match_id: 1, Submission_ID: 'SECOURS-PFMP-2026-S0005', SIRET_normalise: '99999999900011', SIRET_statut: 'VERIFIE', Raison_sociale_officielle: 'Garage Z',
    Responsable_prenom: 'Ana', Responsable_nom: 'ROSSI', Responsable_courriel: 'ana@garagez.fr', Tuteur_prenom: 'Ana', Tuteur_nom: 'Rossi', Tuteur_courriel: 'ana@garagez.fr' }]);
  const l = J(k.EUC_DEV706_calcul_()).personnes;
  assert.equal(l.length, 1); assert.deepEqual(l[0].roles, ['RESPONSABLE', 'TUTEUR']); assert.equal(l[0].courriels[0].v, 'ana@garagez.fr'); assert.equal(l[0].annees[0], '2026-2027');
});

test('page, route et vignette : spinner et délai sur chaque bouton asynchrone, tri entreprise / lieu / responsable / tuteur, export', () => {
  const h = read('apps-script/Contacts_Entreprises_DEV706.html');
  assert.match(h, /btn\.disabled=true;btn\.innerHTML='<span class="spinner"><\/span>'\+esc\(libelle\)/);
  assert.match(h, /const tm=setTimeout\(function\(\)\{if\(fait\)return;fin\(\);fini\(new Error\('Délai dépassé/);
  assert.match(h, /withFailureHandler\(ko\)\.EUC_DEV706_liste\(/); assert.match(h, /withFailureHandler\(ko\)\.EUC_DEV706_enregistrer\(q\)/); assert.match(h, /withFailureHandler\(ko\)\.EUC_DEV706_retirer\(/);
  assert.match(h, /<option value="entreprise">Entreprise<\/option><option value="lieu">Lieu de stage<\/option><option value="responsable">Nom du responsable<\/option><option value="tuteur">Nom du tuteur<\/option>/);
  assert.match(h, /les conventions ne sont jamais modifiées/); assert.match(h, /href="<\?= adminBase \?>\?page=admin-pfmp"/);
  assert.ok(!/lycee-les-eucalyptus|loucodi/.test(h));
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'contacts-entreprises-pfmp':\n      return EUC_DEV706_afficher\(e\);/);
  assert.match(read('scripts/pfmp-release-config.json'), /"page": "contacts-entreprises-pfmp", "scope": "admin", "expected": "Fiabiliser les contacts entreprises"/);
  assert.ok(read('apps-script/Admin_PFMP.html').includes('href="<?= adminBase ?>?page=contacts-entreprises-pfmp">Fiabiliser les contacts<small>'));
});
console.log(n + ' tests DEV706 réussis.');
