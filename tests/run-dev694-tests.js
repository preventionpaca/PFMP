/* DEV694 — Dépôts en ligne corrigés dans l'Administration des conventions, bouton « Éditer la fiche » du suivi, bandeau « À faire ». */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

function ctx(lignes, colonnes) {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, encodeURIComponent, decodeURIComponent,
    Utilities: { formatDate: d => new Date(d).toISOString().slice(0, 16), getUuid: () => 'u' }, __appels: [] };
  vm.createContext(k);
  ['apps-script/EUC_SUIVI2_Moteur.js', 'apps-script/EUC_DEV602_Identites.js', 'apps-script/EUC_DEV603_Declaration.js', 'apps-script/EUC_DEV665_DemandesAide.js', 'apps-script/EUC_DEV694_Depots.js', 'apps-script/EUC_ENT_Validation.gs']
    .forEach(f => vm.runInContext(read(f), k, { filename: f }));
  const cols = new Set(colonnes || ['Submission_ID', 'Nom_tuteur', 'Telephone_tuteur', 'Email_tuteur', 'Fonction_tuteur', 'Nom_responsable', 'Telephone_entreprise', 'Email_entreprise', 'Raw_JSON', 'Decision', 'Prenom_eleve', 'Nom_eleve']);
  k.EUC_V160_TABLE_ = 'EUC_MIGRATION_JOTFORM_PFMP';
  k.EUC_ADMIN_WORKFLOW_ctxV144_ = () => ({ email: 'admin@exemple.test', role: 'DDFPT', autorise: true });
  k.EUC_IMPORT_exigerAdminTexte_ = () => ({ email: 'admin@exemple.test' });
  k.EUC_DEV608_prenom_ = v => v;
  /* DEV713 : annuaire officiel simulé (entreprise du dépôt, active, inchangée). */
  k.EUC_ENT_rechercherSiret = siret => ({ source: 'grist', entreprise: { siret, raisonSociale: 'HOTEL EXEMPLE', etat: 'Actif' } });
  k.EUC_ENT_grist = (m, url, body) => {
    k.__appels.push([m, url, body]);
    if (m === 'get' && /\/columns$/.test(url)) return { columns: [...cols].map(id => ({ id })) };
    if (m === 'post' && /\/columns$/.test(url)) { body.columns.forEach(c => cols.add(c.id)); return {}; }
    if (m === 'get' && /\/records\?filter=/.test(url)) {
      const f = JSON.parse(decodeURIComponent(url.split('filter=')[1]));
      if (f.id) return { records: lignes.filter(r => f.id.includes(r.id)) };
      if (f.Submission_ID) return { records: lignes.filter(r => f.Submission_ID.includes(r.fields.Submission_ID)) };
    }
    if (m === 'get' && /\/records$/.test(url)) return { records: lignes };
    if (m === 'patch') { body.records.forEach(x => { const r = lignes.find(l => l.id === x.id); Object.assign(r.fields, x.fields); }); return {}; }
    return {};
  };
  return k;
}
/* Dépôt type : l'élève s'est inscrite comme tuteur et responsable (noms fictifs). */
const RAW = { 'Prénom du responsable': 'Camille', 'Nom du responsable': 'ELEVETEST', 'Fonction du responsable': 'Gérante', 'Téléphone du responsable': '06 11 22 33 44', 'E-mail du responsable': 'eleve@exemple.test',
  'Prénom du tuteur': 'Camille', 'Nom du tuteur': 'ELEVETEST', 'Fonction du tuteur': 'Réception', 'Téléphone du tuteur': '06 11 22 33 44', 'Adresse e-mail du tuteur': 'eleve@exemple.test' };
const depot = (id, plus) => ({ id, fields: Object.assign({ Submission_ID: 'SECOURS-PFMP-2026-S0053', Prenom_eleve: 'Camille', Nom_eleve: 'ELEVETEST', Eleve_match_libelle: 'Camille ELEVETEST', Classe_match_libelle: '1MELEC',
  Periode_numero: 'PFMP n°1', Raison_sociale_officielle: 'HOTEL EXEMPLE', SIRET_normalise: '11122233300044', SIRET_statut: 'VERIFIE', Decision: 'A_VALIDER', Pays_officiel: 'FR',
  Nom_tuteur: 'ELEVETEST', Fonction_tuteur: 'Réception', Telephone_tuteur: '06 11 22 33 44', Email_tuteur: 'eleve@exemple.test', Nom_responsable: 'ELEVETEST', Telephone_entreprise: '06 11 22 33 44', Email_entreprise: 'eleve@exemple.test',
  Raw_JSON: JSON.stringify(RAW) }, plus || {}) });

test('vue d’un dépôt : mêmes valeurs que le suivi (colonnes puis texte d’origine), numéro sans SECOURS-, compté dans le suivi', () => {
  const k = ctx([depot(53)]);
  const v = J(k.EUC_DEV694_vueDepot({ numero: 'PFMP-2026-S0053' }));
  assert.equal(v.id, 53); assert.equal(v.numero, 'PFMP-2026-S0053'); assert.equal(v.eleve, 'Camille ELEVETEST'); assert.equal(v.classe, '1MELEC'); assert.equal(v.dansSuivi, true);
  assert.deepEqual(v.Tuteur, { prenom: 'Camille', nom: 'ELEVETEST', fonction: 'Réception', telephone: '06 11 22 33 44', courriel: 'eleve@exemple.test' });
  assert.equal(v.Responsable.fonction, 'Gérante');
  assert.throws(() => k.EUC_DEV694_vueDepot({ numero: 'PFMP-2026-S9999' }), /Dépôt introuvable \(PFMP-2026-S9999\)/);
});

test('correction : tuteur remplacé, mis en forme, colonnes créées au besoin, anciennes colonnes et texte d’origine à jour, historique avec motif', () => {
  const lignes = [depot(53)], k = ctx(lignes);
  const v = J(k.EUC_DEV694_corrigerDepot({ id: 53, motif: 'L’élève s’était inscrite comme tutrice', changements: { Tuteur_prenom: 'jean-pierre', Tuteur_nom: 'Dupont', Tuteur_telephone: '0493123456', Tuteur_courriel: 'JP.Dupont@Hotel-Exemple.fr', Responsable_prenom: 'Camille' } }));
  assert.deepEqual(v.Tuteur, { prenom: 'Jean-Pierre', nom: 'DUPONT', fonction: 'Réception', telephone: '04 93 12 34 56', courriel: 'jp.dupont@hotel-exemple.fr' });
  const f = lignes[0].fields;
  assert.equal(f.Tuteur_nom, 'DUPONT'); assert.equal(f.Nom_tuteur, 'DUPONT'); assert.equal(f.Telephone_tuteur, '04 93 12 34 56'); assert.equal(f.Email_tuteur, 'jp.dupont@hotel-exemple.fr');
  const raw = JSON.parse(f.Raw_JSON); assert.equal(raw['Prénom du tuteur'], 'Jean-Pierre'); assert.equal(raw['Nom du tuteur'], 'DUPONT'); assert.equal(raw['Prénom du responsable'], 'Camille');
  const h = JSON.parse(f.Historique_admin_JSON); assert.equal(h.length, 1); assert.equal(h[0].motif, 'L’élève s’était inscrite comme tutrice'); assert.equal(h[0].auteur, 'admin@exemple.test');
  assert.deepEqual(h[0].avant, { Tuteur_prenom: 'Camille', Tuteur_nom: 'ELEVETEST', Tuteur_telephone: '06 11 22 33 44', Tuteur_courriel: 'eleve@exemple.test' }, 'un champ inchangé (prénom du responsable) n’est pas tracé');
  const creees = k.__appels.filter(a => a[0] === 'post').flatMap(a => a[2].columns.map(c => c.id));
  assert.ok(creees.includes('Tuteur_prenom') && creees.includes('Historique_admin_JSON')); assert.ok(!creees.includes('Responsable_prenom'), 'aucune colonne créée pour un champ non modifié');
  assert.equal(k.__appels.filter(a => a[0] === 'patch').length, 1, 'une seule écriture, sur une seule ligne');
  /* Le suivi lit la nouvelle valeur. */
  const c = k.EUC_SUIVI2_contactsTampon_(f); assert.equal(c.tuteur.nom, 'DUPONT'); assert.equal(c.tuteur.prenom, 'Jean-Pierre'); assert.equal(c.tuteur.tel, '04 93 12 34 56');
  assert.equal(J(k.EUC_DEV694_vueDepot({ id: 53 })).historique[0].apres.Tuteur_nom, 'DUPONT');
});

test('DEV697 : SIRET manquant ajouté (ou NIS de Monaco), sans changer la décision ; SIRET faux ou vidé refusé ; carte avec le champ', () => {
  const lignes = [depot(60, { SIRET_normalise: '', SIRET_brut: '' })], k = ctx(lignes);
  const v = J(k.EUC_DEV694_corrigerDepot({ id: 60, motif: 'SIRET manquant, même entreprise que les autres conventions', changements: { Entreprise_identifiant: '408 228 773 00060' } }));
  const f = lignes[0].fields; assert.equal(f.SIRET_normalise, '40822877300060'); assert.equal(f.SIRET_brut, '40822877300060'); assert.equal(f.Decision, 'A_VALIDER'); assert.equal(f.SIRET_statut, 'VERIFIE');
  assert.equal(v.Entreprise.identifiant, '40822877300060'); const h = JSON.parse(f.Historique_admin_JSON).pop(); assert.deepEqual(h.avant, { Entreprise_identifiant: '' }); assert.deepEqual(h.apres, { Entreprise_identifiant: '40822877300060' });
  assert.throws(() => k.EUC_DEV694_corrigerDepot({ id: 60, motif: 'x', changements: { Entreprise_identifiant: '40822877300061' } }), /SIRET \/ NIS : Le SIRET est mathématiquement incorrect/);
  assert.throws(() => k.EUC_DEV694_corrigerDepot({ id: 60, motif: 'x', changements: { Entreprise_identifiant: '' } }), /ne peut pas être vidé/);
  const l2 = [depot(61, { SIRET_normalise: '', Pays_officiel: 'MC' })], k2 = ctx(l2);
  k2.EUC_DEV694_corrigerDepot({ id: 61, motif: 'NIS', changements: { Entreprise_identifiant: '7112 b 19343' } });
  assert.equal(l2[0].fields.NIS_normalise, '7112B19343'); assert.equal(l2[0].fields.Entreprise_identifiant_type, 'NIS');
  const h2 = read('apps-script/Admin_Conventions_PFMP.html'); assert.match(h2, /data-dep="Entreprise_identifiant"/); assert.match(h2, /if\(k==='Entreprise_identifiant'\)return 'SIRET \/ NIS de l’entreprise'/);
});
test('correction refusée : motif absent, rien de changé, champ vidé, élève comme tuteur, chiffres dans le nom, téléphone ou courriel faux, dépôt classé', () => {
  const k = ctx([depot(53), depot(54, { Decision: 'REJETEE' })]);
  assert.throws(() => k.EUC_DEV694_corrigerDepot({ id: 53, motif: ' ', changements: { Tuteur_nom: 'Dupont' } }), /Motif de correction obligatoire/);
  assert.throws(() => k.EUC_DEV694_corrigerDepot({ id: 53, motif: 'm', changements: { Tuteur_nom: 'ELEVETEST' } }), /Aucune modification/);
  assert.throws(() => k.EUC_DEV694_corrigerDepot({ id: 53, motif: 'm', changements: { Tuteur_courriel: '' } }), /ne peut pas être vidé/);
  assert.equal(J(k.EUC_DEV694_corrigerDepot({ id: 53, motif: 'm', changements: { Tuteur_fonction: 'Chef de réception' } })).Tuteur.fonction, 'Chef de réception', 'la fonction seule se corrige');
});

test('correction refusée (suite) et téléphone de Monaco accepté', () => {
  const k = ctx([depot(53), depot(54, { Decision: 'REJETEE' })]);
  assert.throws(() => k.EUC_DEV694_corrigerDepot({ id: 53, motif: 'm', changements: { Responsable_prenom: 'Camille', Responsable_nom: 'Elevetest', Responsable_fonction: 'Gérante' } }), /Aucune modification|pas le tien/);
  assert.throws(() => k.EUC_DEV694_corrigerDepot({ id: 53, motif: 'm', changements: { Tuteur_prenom: 'Camille', Tuteur_nom: 'Elevetest2' } }), /que des lettres/);
  assert.throws(() => k.EUC_DEV694_corrigerDepot({ id: 53, motif: 'm', changements: { Tuteur_telephone: '0612' } }), /Tuteur : numéro français/);
  assert.throws(() => k.EUC_DEV694_corrigerDepot({ id: 53, motif: 'm', changements: { Tuteur_courriel: 'x@gmial.com' } }), /gmail\.com/);
  assert.throws(() => k.EUC_DEV694_corrigerDepot({ id: 54, motif: 'm', changements: { Tuteur_nom: 'Dupont' } }), /classé sans suite/);
  const v = J(k.EUC_DEV694_corrigerDepot({ id: 53, motif: 'tuteur monégasque', changements: { Tuteur_telephone: '44 12 34 56' } }));
  assert.equal(v.Tuteur.telephone, '+377 44 12 34 56');
});

test('élève inscrit comme tuteur refusé (prénom et nom de l’élève, dans un sens ou dans l’autre)', () => {
  const k = ctx([depot(60, { Raw_JSON: JSON.stringify(Object.assign({}, RAW, { 'Prénom du tuteur': 'Luc', 'Nom du tuteur': 'MARTIN' })), Nom_tuteur: 'MARTIN' })]);
  assert.throws(() => k.EUC_DEV694_corrigerDepot({ id: 60, motif: 'm', changements: { Tuteur_prenom: 'Camille', Tuteur_nom: 'Elevetest' } }), /pas le tien/);
  assert.throws(() => k.EUC_DEV694_corrigerDepot({ id: 60, motif: 'm', changements: { Tuteur_prenom: 'Elevetest', Tuteur_nom: 'Camille' } }), /pas le tien/);
});

test('bandeau « À faire » : comptes par type, rien quand tout est traité', () => {
  const k = ctx([]);
  const l = [{ aTraiter: true, dansSuivi: false, aide: true }, { aTraiter: true, dansSuivi: false, aide: true }, { aTraiter: true, dansSuivi: false, pays: 'FR' }, { aTraiter: true, dansSuivi: false, pays: 'MC' },
    { aTraiter: true, dansSuivi: true, ferme: true }, { aTraiter: true, doublonDe: 'PFMP-2026-S0018', dansSuivi: false }, { aTraiter: false, dansSuivi: true, aPrevenir: true }, { aTraiter: false, dansSuivi: true }];
  assert.deepEqual(J(k.EUC_DEV694_compter_(l)).map(x => x.cle + ':' + x.nombre + ':' + x.texte), [
    'aide:2:demandes d’aide : entreprise à identifier', 'siret:1:SIRET à vérifier', 'nis:1:NIS de Monaco à saisir', 'ferme:1:établissement fermé selon l’INSEE à vérifier', 'doublon:1:doublon à classer sans suite', 'prevenir:1:élève à prévenir (problème résolu)']);
  assert.deepEqual(J(k.EUC_DEV694_compter_([{ aTraiter: false, dansSuivi: true }])), []);
  /* De bout en bout sur la table d'attente : un dépôt vérifié ne demande rien ; un SIRET non vérifié et un doublon s'affichent. */
  const lignes = [depot(53), depot(70, { Submission_ID: 'SECOURS-PFMP-2026-S0070', Eleve_match_id: 9, Periode_numero: 'PFMP n°1', SIRET_statut: 'A_CONTROLER', Decision: 'A_CONTROLER', Niveau_controle: 'ROUGE', SIRET_normalise: '' }),
    depot(71, { Submission_ID: 'SECOURS-PFMP-2026-S0071', Eleve_match_id: 8, Periode_numero: 'PFMP n°1' }), depot(72, { Submission_ID: 'SECOURS-PFMP-2026-S0072', Eleve_match_id: 8, Periode_numero: 'PFMP n°1', SIRET_statut: 'A_CONTROLER', SIRET_normalise: '' })];
  const r = J(ctx(lignes).EUC_DEV694_aFaire());
  assert.equal(r.page, 'soumissions-a-traiter-pfmp');
  assert.deepEqual(r.points.map(x => x.cle + ':' + x.nombre), ['aide:1', 'doublon:1']);
  assert.deepEqual(J(ctx([depot(53)]).EUC_DEV694_aFaire()).points, [], 'bandeau absent quand tout est traité');
});

test('suivi : fiches avec l’identifiant du dossier ou du dépôt ; identifiants retirés hors administration ; bouton « Éditer la fiche » réservé à l’administration', () => {
  const k = ctx([]);
  assert.equal(k.EUC_SUIVI2_ficheDossier_({ id: 812, Entreprise_raison_sociale: 'E' }, {}).dossier, 812);
  assert.equal(k.EUC_SUIVI2_ficheTampon_({ id: 53, Submission_ID: 'SECOURS-PFMP-2026-S0053', Raison_sociale_officielle: 'HOTEL' }, '').depot, 53);
  assert.match(read('apps-script/EUC_SUIVI2_Moteur.js'), /EUC_SUIVI2_VERSION_ = '1\.0\.0-dev\.(69[4-9]|[7-9]\d\d)'/, 'cache du suivi recalculé');
  const ens = read('apps-script/EUC_SUIVI2_Enseignants.js');
  assert.match(ens, /if \(!admin\) \(vue\.fiches \|\| \[\]\)\.forEach\(function\(f\) \{ if \(f\) \{ delete f\.dossier; delete f\.depot; \} \}\);/);
  const s = read('apps-script/Suivi_Enseignants_DEV576.html');
  assert.ok(s.includes("(CFG.admin&&f&&(f.depot||f.dossier)?'<br><a class=\"btn editer-fiche noprint\""), 'bouton seulement en administration, pour une fiche corrigeable');
  assert.ok(s.includes("CFG.base+'?page=admin-conventions-pfmp&'+(f.depot?'depot='+f.depot:'dossier='+f.dossier)"));
  assert.ok(!/__LIEN_|https?:\/\/[a-z-]+\.lycee-les-eucalyptus/.test(s.split('Éditer la fiche')[0].slice(-400)), 'aucune adresse écrite en dur');
});

test('DEV713 : SIRET corrigé : nom, adresse, ville et état officiels repris de l’annuaire ; historique ; sinon lecture par le navigateur sans rien écrire', () => {
  const lignes = [depot(70, { SIRET_normalise: '12345678200010', SIRET_brut: '12345678200010', Raison_sociale_officielle: 'GARAGE ANCIEN', Adresse_officielle: '1 RUE ANCIENNE', CP_officiel: '06300', Ville_officielle: 'NICE', Niveau_controle: 'ORANGE' })];
  const COLS = ['Submission_ID', 'Raw_JSON', 'Decision', 'Prenom_eleve', 'Nom_eleve', 'SIRET_brut', 'SIRET_normalise', 'SIRET_statut', 'SIRET_source', 'Raison_sociale_officielle', 'Nom_commercial', 'Adresse_officielle', 'Complement_adresse_officielle', 'CP_officiel', 'Ville_officielle', 'Pays_officiel', 'Niveau_controle'], k = ctx(lignes, COLS);
  k.EUC_ENT_rechercherSiret = siret => ({ source: 'api', entreprise: { siret, raisonSociale: 'GARAGE NOUVEAU', enseigne: 'GARAGE N', etat: 'Actif', adresseComplete: '2 AVENUE NOUVELLE', codePostal: '06200', commune: 'NICE' } });
  k.EUC_DEV694_corrigerDepot({ id: 70, motif: 'déménagement', changements: { Entreprise_identifiant: '12345678200028' } });
  const f = lignes[0].fields;
  assert.equal(f.SIRET_normalise, '12345678200028'); assert.equal(f.Adresse_officielle, '2 AVENUE NOUVELLE'); assert.equal(f.CP_officiel, '06200'); assert.equal(f.Ville_officielle, 'NICE');
  assert.equal(f.Raison_sociale_officielle, 'GARAGE NOUVEAU'); assert.equal(f.Niveau_controle, 'VERT'); assert.equal(f.SIRET_statut, 'VERIFIE'); assert.equal(f.Decision, 'A_VALIDER', 'décision inchangée');
  const h = JSON.parse(f.Historique_admin_JSON).pop();
  assert.equal(h.avant.Entreprise_officielle, 'GARAGE ANCIEN — 1 RUE ANCIENNE, 06300 NICE'); assert.equal(h.apres.Entreprise_officielle, 'GARAGE NOUVEAU — 2 AVENUE NOUVELLE, 06200 NICE');
  assert.ok(!('Entreprise_officielle' in f), 'aucune colonne inventée');
  const l2 = [depot(71, { SIRET_normalise: '12345678200010' })], k2 = ctx(l2, COLS), n0 = l2[0].fields.SIRET_normalise;
  k2.EUC_ENT_rechercherSiret = siret => ({ source: 'api_navigateur', siret, url: 'https://annuaire.exemple.test/?q=' + siret });
  k2.EUC_ENT_traiterReponseApiNavigateur = (json, siret) => ({ entreprise: { siret, raisonSociale: 'X', etat: 'Fermé', adresseComplete: '1 RUE', codePostal: '06000', commune: 'NICE' } });
  const r = J(k2.EUC_DEV694_corrigerDepot({ id: 71, motif: 'm', changements: { Entreprise_identifiant: '12345678200028' } }));
  assert.equal(r.aVerifierNavigateur, true); assert.equal(l2[0].fields.SIRET_normalise, n0, 'rien écrit avant la réponse de l’annuaire');
  assert.ok(!k2.__appels.some(a => a[0] === 'patch'));
  k2.EUC_DEV694_corrigerDepot({ id: 71, motif: 'm', changements: { Entreprise_identifiant: '12345678200028' }, reponseApi: { results: [] } });
  assert.equal(l2[0].fields.SIRET_normalise, '12345678200028'); assert.equal(l2[0].fields.Niveau_controle, 'ORANGE', 'établissement fermé signalé');
  const k3 = ctx([depot(72)]); k3.EUC_ENT_rechercherSiret = () => ({ source: 'api', introuvable: true });
  assert.throws(() => k3.EUC_DEV694_corrigerDepot({ id: 72, motif: 'm', changements: { Entreprise_identifiant: '12345678200028' } }), /Aucune entreprise trouvée/);
  const h2 = read('apps-script/Admin_Conventions_PFMP.html');
  assert.match(h2, /if\(v&&v\.aVerifierNavigateur\)\{/); assert.match(h2, /L’annuaire officiel ne répond pas : rien n’a été enregistré/);
});

test('administration des conventions : éditeur de dépôt (motif, double clic bloqué, indicateur, délai), ouverture directe par dépôt, dossier ou n° S', () => {
  const h = read('apps-script/Admin_Conventions_PFMP.html'), g = read('apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs');
  assert.match(h, /<section class="card hidden" id="depotV694"/);
  ['Responsable_prenom', 'Responsable_nom', 'Responsable_fonction', 'Responsable_telephone', 'Responsable_courriel', 'Tuteur_prenom', 'Tuteur_nom', 'Tuteur_fonction', 'Tuteur_telephone', 'Tuteur_courriel']
    .forEach(c => assert.ok(h.includes('data-dep="' + c + '"'), c));
  assert.ok(h.includes("depBtn.disabled=true;depBtn.classList.add('busy');depBtn.innerHTML='<span class=\"spinner\"></span>Enregistrement en cours'"));
  assert.ok(h.includes("function retour(){fini=true;clearTimeout(minuteur);depBtn.disabled=false;depBtn.classList.remove('busy');depBtn.innerHTML=old}"));
  assert.match(h, /setTimeout\(function\(\)\{if\(fini\)return;retour\(\);depStatus\('Délai dépassé/);
  assert.ok(h.includes("if(!motif){depStatus('Motif de correction obligatoire.','err')"));
  assert.ok(h.includes('.EUC_DEV694_corrigerDepot({id:DEP.id,changements:ch,motif:motif,reponseApi:reponseApi||null})'));
  assert.ok(h.includes("<span class=\"spinner\"></span>Chargement du dépôt…") && h.includes('.EUC_DEV694_vueDepot(q)'), 'état de chargement');
  assert.ok(h.includes("if(C.depot)ouvrirDepot({id:C.depot});") && h.includes('else if(C.dossier){'));
  assert.ok(h.includes("else if(/-S\\d+$/.test(String(C.numero)))ouvrirDepot({numero:C.numero});"), 'lien ?numero=…-S… : dépôt ouvert');
  assert.ok(!h.includes('Corriger dans les soumissions reçues'));
  assert.match(g, /dossier:Number\(e&&e\.parameter&&e\.parameter\.dossier\)\|\|0,\n\s*depot:Number\(e&&e\.parameter&&e\.parameter\.depot\)\|\|0/);
  assert.match(read('apps-script/EUC_DEV688_ControleNoms.js'), /statut: valide \? 'Dépôt en ligne' : 'Dépôt en ligne — entreprise à vérifier'/);
});

test('accueil d’administration : bandeau masqué par défaut, affiché seulement s’il reste quelque chose à faire, lien sans adresse en dur', () => {
  const a = read('apps-script/Admin_PFMP.html');
  assert.match(a, /<section id="aFaireV694" hidden role="status"/);
  assert.ok(a.includes('href="<?= adminBase ?>?page=soumissions-a-traiter-pfmp"'));
  /* DEV728 : bandeau par rubriques ; la rubrique des dépôts disparaît quand il n'y a rien, le bandeau quand aucune rubrique n'est affichée. */
  assert.ok(a.includes("if(!l.length){g('aFaireEleves').hidden=true;voir();return;}") && a.includes(".withFailureHandler(function(){g('aFaireEleves').hidden=true;voir();}).EUC_DEV694_aFaire();"));
  assert.ok(a.includes("function voir(){z.hidden=g('aFaireEleves').hidden&&g('aFaireCarte').hidden;}"));
});

test('recherche de l’Administration : dépôts en ligne de l’année ajoutés (n° S, classe, entreprise), ouverts dans l’éditeur de dépôt', () => {
  const k = ctx([]);
  k.EUC_DEV688_parcourir_ = (annee, fn) => { assert.equal(annee, '2026-2027');
    fn({}, {}, {}, { id: 812, source: 'CONVENTION', numero: 'PFMP-2026-001180', eleve: 'Zoé MARTIN', classe: '1MELEC', entreprise: 'ORECA' });
    fn({}, {}, {}, { id: 'S226', source: 'SOUMISSION', statut: 'Dépôt en ligne', numero: 'PFMP-2026-S0053', eleve: 'Camille ELEVETEST', classe: '1MELEC', entreprise: 'HOTEL EXEMPLE', periode: 'PFMP n°1' });
    fn({}, {}, {}, { id: 'S12', source: 'SOUMISSION', statut: 'Dépôt en ligne', numero: 'PFMP-2026-S0003', eleve: 'Adam TEST', classe: '1CAR', entreprise: 'AZUR', periode: 'PFMP n°1' }); };
  const l = J(k.EUC_DEV694_listeDepots({ annee: '2026-2027' }));
  assert.deepEqual(l.map(x => x.id + ':' + x.depot + ':' + x.numero), ['S12:12:PFMP-2026-S0003', 'S226:226:PFMP-2026-S0053'], 'seulement les dépôts, triés par classe puis élève');
  assert.match(l[1].recherche, /PFMP-2026-S0053 Camille ELEVETEST 1MELEC HOTEL EXEMPLE depot en ligne/);
  const h = read('apps-script/Admin_Conventions_PFMP.html');
  assert.ok(h.includes("    if(selected.depot){ouvrirDepot({id:selected.depot});return}"), 'Ouvrir le dossier : dépôt ouvert dans l’éditeur');
  assert.ok(h.includes(".EUC_DEV694_listeDepots({annee:annee})") && h.includes("dossiers=dossiers.filter(function(d){return !d.depot})"), 'dépôts rechargés au changement d’année, sans doublon');
  assert.ok(h.includes("d.depot?'dépôt en ligne':"), 'mention « dépôt en ligne » dans la recherche');
  assert.ok(h.includes("(dépôts en ligne indisponibles : "), 'erreur affichée sans bloquer les conventions');
});
console.log(n + ' tests DEV694 réussis.');
