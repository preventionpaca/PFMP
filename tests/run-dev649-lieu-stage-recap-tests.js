/* DEV649 — entreprise non diffusible, lieu de stage distinct du siège, récapitulatif complet des dépôts. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp };
vm.createContext(k);
vm.runInContext(read('apps-script/EUC_DEV649_LieuStageRecap.js'), k);

test('annuaire : « [NON-DIFFUSIBLE] » vidé, entreprise signalée non diffusible, SIRET conservé', () => {
  const c = { console, JSON, Object, String, Array, RegExp }; vm.createContext(c);
  vm.runInContext(read('apps-script/EUC_ENT_ApiEntreprise.gs'), c);
  const u = { siren: '123456789', nom_complet: '[NON-DIFFUSIBLE]', statut_diffusion: 'P', siege: { siret: '12345678900017', est_siege: true, etat_administratif: 'A', adresse: '[NON-DIFFUSIBLE]', code_postal: '06510', libelle_commune: 'CARROS' }, matching_etablissements: [] };
  const e = J(c.EUC_ENT_mapperReponseApi(u, '12345678900017'));
  assert.equal(e.nonDiffusible, true); assert.equal(e.raisonSociale, ''); assert.equal(e.siret, '12345678900017'); assert.equal(e.etat, 'Actif');
  assert.ok(!JSON.stringify(e).includes('NON-DIFFUSIBLE'));
  const ok = J(c.EUC_ENT_mapperReponseApi({ siren: '732829320', nom_complet: 'GARAGE', siege: { siret: '73282932000074', adresse: '1 rue A', code_postal: '06000', libelle_commune: 'NICE', etat_administratif: 'A' } }, '73282932000074'));
  assert.ok(!ok.nonDiffusible, 'entreprise ordinaire inchangée'); assert.equal(ok.raisonSociale, 'GARAGE');
});

test('page QR : SIRET non diffusible trouvé (nom et adresse à saisir), preuve signée acceptée sans nom', () => {
  const src = read('apps-script/EUC_SIRET_NIS_StrictV161.gs'), c = { console, JSON, Object, String, Number, Date, Array };
  c.EUC_CONVENTION_resumeSignatureV134_ = s => 'sig' + s.length;
  c.Utilities = { Charset: { UTF_8: 1 }, base64EncodeWebSafe: s => Buffer.from(s).toString('base64'), base64DecodeWebSafe: s => Buffer.from(s, 'base64'), newBlob: b => ({ getDataAsString: () => Buffer.from(b).toString('utf8') }) };
  vm.createContext(c); vm.runInContext(src, c);
  const d = J(c.EUC_V161_mapperEntrepriseFrance_({ entreprise: { nonDiffusible: true, raisonSociale: '', codePostal: '06510', commune: 'CARROS' } }, '12345678900017'));
  assert.equal(d.found, true); assert.equal(d.nonDiffusible, true); assert.equal(d.entrepriseRaisonSociale, ''); assert.equal(d.entrepriseCommune, 'CARROS');
  const preuve = c.EUC_V161_creerPreuveSiretFrance_(d); assert.ok(preuve, 'preuve créée malgré le nom masqué');
  const relu = J(c.EUC_V161_lirePreuveSiretFrance_(preuve, '12345678900017')); assert.equal(relu.nonDiffusible, true); assert.equal(relu.entrepriseSiret, '12345678900017');
  assert.equal(c.EUC_V161_lirePreuveSiretFrance_(preuve, '12345678900018'), null, 'liée au SIRET');
  assert.equal(c.EUC_V161_creerPreuveSiretFrance_({ found: true, entrepriseSiret: '73282932000074', entrepriseRaisonSociale: '' }), '', 'entreprise ordinaire incomplète : pas de preuve');
});

test('enregistrement QR : nom et adresse saisis pour une entreprise non diffusible, statut à vérifier, lieu de stage enregistré', () => {
  const s = read('apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs');
  assert.match(s, /if\(officielFrance\.nonDiffusible===true\)\{[^]*nonDiffusible=true;[^]*raison=String\(officielFrance\.entrepriseRaisonSociale\|\|''\)\.trim\(\)\|\|raison;/);
  assert.match(s, /\(nonDiffusible\?'A_VERIFIER_NON_DIFFUSIBLE':'VALIDE'\)/);
  assert.match(s, /if\(nonDiffusible\)fields\.Entreprise_non_diffusible=true;/);
  assert.match(s, /fields\.Lieu_stage_adresse=lieu\.adresse;fields\.Lieu_stage_code_postal=lieu\.cp;fields\.Lieu_stage_commune=lieu\.commune;/);
  assert.match(s, /EUC_DEV649_assurerColonnesAcces_\(\);/);
  assert.ok(s.indexOf('EUC_DEV649_lieuSaisi_(d)') < s.indexOf('var writeLock'), 'contrôle du lieu avant toute écriture');
});

test('lieu de stage : saisie complète ou vide, texte, adresse à visiter', () => {
  assert.deepEqual(J(k.EUC_DEV649_lieuSaisi_({})), { adresse: '', cp: '', commune: '' });
  assert.deepEqual(J(k.EUC_DEV649_lieuSaisi_({ lieuStageAdresse: ' 2 av.  du Chantier ', lieuStageCodePostal: '06700', lieuStageCommune: 'Saint-Laurent-du-Var' })), { adresse: '2 av. du Chantier', cp: '06700', commune: 'Saint-Laurent-du-Var' });
  assert.throws(() => k.EUC_DEV649_lieuSaisi_({ lieuStageAdresse: '1 rue A' }), /indique aussi la ville/);
  assert.throws(() => k.EUC_DEV649_lieuSaisi_({ lieuStageCommune: 'Nice' }), /indique aussi l’adresse/);
  assert.equal(k.EUC_DEV649_lieuTexte_({ Lieu_stage_adresse: '1 rue A', Lieu_stage_code_postal: '06000', Lieu_stage_commune: 'Nice' }), '1 rue A, 06000 Nice');
  assert.equal(k.EUC_DEV649_lieuTexte_({}), '');
  assert.equal(k.EUC_DEV649_adresseVisite_('', 'Siège'), 'Siège'); assert.equal(k.EUC_DEV649_adresseVisite_('Chantier', 'Siège'), 'Chantier');
});

const INFO = {
  source: 'page du QR code', numero: 'PFMP-2026-000999', intro: 'Bonjour,',
  eleve: { nom: 'ELEVE-TEST', prenom: 'Alex', naissance: '2009-03-14', classe: '1TEST', adresse: '3 rue X, 06000 Nice', telephone: '06 00 00 00 00', courriel: 'alex@ex.test' },
  periode: { libelle: 'PFMP n°1', debut: '2026-11-23', fin: '2026-12-18' },
  entreprise: { nom: 'GARAGE TEST', identifiant: '12345678900017', adresse: '1 rue du Siège, 06510 Carros', nonDiffusible: true },
  lieu: '2 avenue du Chantier, 06700 Saint-Laurent-du-Var',
  responsable: { civilite: 'M.', prenom: 'Jean', nom: 'DUPONT', fonction: 'Gérant', telephone: '06 00 00 00 01', courriel: 'contact@ex.test' },
  tuteurEstResponsable: true, g205: { requis: true, motif: 'entreprise non diffusible' }, pp: ['M. PROF'], signature: 'BFE'
};
test('récapitulatif : toutes les rubriques, lieu de stage et bureau G205 mis en évidence', () => {
  const r = k.EUC_DEV649_recap_(INFO);
  ['ELEVE-TEST', '14/03/2009', '1TEST', '3 rue X', '23/11/2026 au 18/12/2026', 'GARAGE TEST', '12345678900017', 'Carros', 'DUPONT', 'Gérant', 'M. PROF', 'PFMP-2026-000999', 'signature du Proviseur'.replace('signature du Proviseur', 'Proviseur')]
    .forEach(x => { assert.ok(r.texte.includes(x), 'texte : ' + x); assert.ok(r.html.includes(x.replace('’', '&#39;').replace(/'/g, '&#39;')) || r.html.includes(x), 'html : ' + x); });
  assert.match(r.texte, /!!! À FAIRE : passer au bureau G205/); assert.match(r.texte, /!!! LIEU DU STAGE DIFFÉRENT DU SIÈGE — les visites se font à cette adresse : 2 avenue/);
  assert.match(r.html, /border:2px solid #d97706[^]*Lieu du stage différent du siège[^]*2 avenue du Chantier/);
  assert.match(r.html, /#fde8e8;border:2px solid #b42318[^]*passer au bureau G205/);
  assert.match(r.html, /Tuteur \(le responsable\)/);
  assert.ok(!k.EUC_DEV649_recap_(Object.assign({}, INFO, { lieu: '', g205: { requis: false }, entreprise: { nom: 'X' } })).texte.includes('!!!'), 'rien de signalé sans lieu ni G205');
  assert.ok(!k.EUC_DEV649_recap_({ eleve: { nom: '<b>x</b>' } }).html.includes('<b>x</b>'), 'échappement HTML');
});

test('QR : informations du récapitulatif depuis la convention, bureau G205 si non diffusible ou Monaco à valider', () => {
  const d = { numero: 'N1', classe: '1TEST', dateDebut: '2026-11-23', dateFin: '2026-12-18', eleve: { nom: 'A', prenom: 'B', email: 'b@ex.fr' }, fiche: { Adresse: '3 rue X', Code_postal: '06000', Ville: 'Nice', Date_naissance: '2009-03-14' }, ppNoms: ['PP'],
    acces: { Entreprise_raison_sociale: 'E', Entreprise_siret: '12345678900017', Entreprise_non_diffusible: true, Lieu_stage_adresse: '1 chantier', Lieu_stage_commune: 'Nice', Tuteur_est_responsable: true } };
  const i = J(k.EUC_DEV649_infoAcces_(d, 'intro', 'sig'));
  assert.equal(i.g205.requis, true); assert.match(i.g205.motif, /non diffusible/); assert.equal(i.lieu, '1 chantier, Nice'); assert.equal(i.eleve.adresse, '3 rue X, 06000 Nice'); assert.equal(i.eleve.naissance, '2009-03-14');
  const m = J(k.EUC_DEV649_infoAcces_({ acces: { Entreprise_pays: 'Monaco', Entreprise_identifiant_type: 'NIS', Entreprise_validation_statut: 'A_VALIDER' } }));
  assert.equal(m.g205.requis, true); assert.match(m.g205.motif, /Monaco à valider/);
  assert.equal(J(k.EUC_DEV649_infoAcces_({ acces: { Entreprise_validation_statut: 'VALIDE' } })).g205.requis, false);
});

test('courriel QR : récapitulatif HTML, copie aux « Dépôts et numéros de convention »', () => {
  const s = read('apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs');
  assert.match(s, /cc=cc\.concat\(EUC_DEV649_copieDepots_\(\)\);/);
  assert.match(s, /var r=EUC_DEV649_recap_\(EUC_DEV649_infoAcces_\(d,body,sign\)\);/);
  assert.match(s, /htmlBody:n\.htmlBody\|\|undefined,/);
  assert.match(s, /var auto=\/\^\(OUI\|YES\|TRUE\|1\)\$\/i\.test\(String\(params\.NOTIF_AUTO_ENVOI/, 'envoi toujours soumis au réglage');
});

test('formulaire en ligne : non diffusible, lieu de stage, même récapitulatif à l’élève et en copie', () => {
  const f = read('apps-script/Declaration_Entreprise_DEV603.html'), d = read('apps-script/EUC_DEV603_Declaration.js');
  assert.match(f, /<div id="ndBloc" hidden/); assert.match(f, /ND=e\.nonDiffusible===true;\$\('ndBloc'\)\.hidden=!ND;/);
  assert.match(f, /nonDiffusible:ND\?\{nom:\$\('ndNom'\)/); assert.match(f, /lieu:lireLieu\(''\),responsable/); assert.match(f, /message:\$\('aMsg'\)\.value,lieu:lireLieu\('a'\)\}/);
  assert.ok(f.includes('id="LieuAdr"') && f.includes('id="aLieuAdr"'), 'lieu dans les deux parcours');
  assert.match(d, /if \(e\.nonDiffusible === true\) \{[^]*ent\.nonDiffusible = true;/);
  assert.match(d, /EUC_DEV649_ligneTampon_\(ligne, ent\);/); assert.match(d, /EUC_DEV649_ligneTampon_\(ligne, \{ lieu: lieuAide \}\);/);
  assert.match(d, /if \(detail && typeof EUC_DEV649_accuseComplet_ === 'function'\) return EUC_DEV649_accuseComplet_/);
  const l = J(k.EUC_DEV649_ligneTampon_({ Alertes: '' }, { nonDiffusible: true, raisonSociale: 'GARAGE TEST', lieu: { adresse: '1 chantier', cp: '', commune: 'Nice' } }));
  assert.equal(l.Entreprise_non_diffusible, true); assert.equal(l.Raison_sociale_officielle, ''); assert.equal(l.Entreprise_saisie, 'GARAGE TEST'); assert.equal(l.Decision, 'A_CONTROLER'); assert.equal(l.Lieu_stage_commune, 'Nice'); assert.match(l.Alertes, /non diffusible/);
});

test('import : lieu de stage et non diffusible recopiés dans la convention', () => {
  const s = read('apps-script/EUC_PFMP_DEV528_JotFormContacts.js'), i = read('apps-script/EUC_PFMP_DEV466_JotFormReliable.js');
  assert.match(s, /lieu\.Lieu_stage_adresse=String\(row\.Lieu_stage_adresse\|\|''\)\.trim\(\);/);
  assert.match(s, /if\(row\.Entreprise_non_diffusible===true\)\{lieu\.Entreprise_non_diffusible=true;lieu\.Entreprise_validation_statut='A_VERIFIER_NON_DIFFUSIBLE';\}/);
  assert.match(i, /EUC_DEV649_assurerColonnesAcces_\(\);\}catch\(eSchema\)\{\}/);
});

test('suivi, ordres de mission, carte et correction administrative utilisent le lieu de stage', () => {
  const m = read('apps-script/EUC_SUIVI2_Moteur.js'), c = { console, JSON, Object, String, Number, Array, Math, Date, RegExp }; vm.createContext(c); vm.runInContext(m, c);
  const f = J(c.EUC_SUIVI2_ficheDossier_({ Entreprise_raison_sociale: 'E', Entreprise_adresse: '1 siège', Entreprise_commune: 'Carros', Lieu_stage_adresse: '2 av. du Chantier', Lieu_stage_code_postal: '06700', Lieu_stage_commune: 'Saint-Laurent' }, {}));
  assert.equal(f.lieu, '2 av. du Chantier, 06700 Saint-Laurent'); assert.equal(f.adresse, '1 siège, Carros');
  assert.equal(J(c.EUC_SUIVI2_ficheDossier_({ Entreprise_raison_sociale: 'E' }, {})).lieu, '');
  const page = read('apps-script/Suivi_Enseignants_DEV576.html');
  assert.match(page, /data-adr="'\+esc\(f\.lieu\|\|f\.adresse\|\|''\)/); assert.match(page, /f&&f\.lieu\?'<div class="lieu-stage-cell"/); assert.match(page, /'\\nLIEU DU STAGE : '\+f\.lieu/);
  const t = read('apps-script/EUC_PFMP_DEV370_AdminTools.js');
  assert.match(t, /adresse:EUC_DEV368_t\(x\.lieuStage\)\?'⚠ LIEU DU STAGE : '\+EUC_DEV368_t\(x\.lieuStage\)/);
  assert.match(read('apps-script/Ordres_Mission_PFMP_V368.html'), /x\.lieuStage\?'<div class="lieu-stage-cell"/);
  assert.match(read('apps-script/EUC_SUIVI_PFMP_ClasseDetailV155.gs'), /lieuStage:typeof EUC_DEV649_lieuTexte_==='function'\?EUC_DEV649_lieuTexte_\(d\):''/);
  assert.match(read('apps-script/EUC_PFMP_DEV339_FamilleUX.js'), /x\.lieuStage=typeof EUC_DEV649_lieuTexte_==='function'\?EUC_DEV649_lieuTexte_\(dernier\):'';/);
  assert.match(read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js'), /if\(typeof EUC_DEV649_lieuTexte_==='function'&&EUC_DEV649_lieuTexte_\(a\)\)address=EUC_DEV649_lieuTexte_\(a\);/);
  const w = read('apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs');
  assert.match(w, /Lieu_stage_adresse:'Lieu de stage — adresse'/); assert.match(read('apps-script/Admin_Conventions_PFMP.html'), /data-corr="Lieu_stage_adresse"/);
});

test('page QR : bloc lieu de stage facultatif et saisie débloquée pour une entreprise non diffusible', () => {
  const q = read('apps-script/PFMP_Acces_QR_V116.html');
  ['lieuStageAdresse', 'lieuStageCodePostal', 'lieuStageCommune'].forEach(x => assert.ok(q.includes('name="' + x + '"'), x));
  assert.equal((q.match(/\.nonDiffusible===true&&typeof window\.EUC_DEV649_nonDiffusible==='function'/g) || []).length, 2);
  assert.match(q, /window\.EUC_DEV649_nonDiffusible=function\(\)\{[^]*el\.readOnly=false;/);
  assert.ok(q.indexOf('window.EUC_DEV649_nonDiffusible=') < q.indexOf("createHtmlOutputFromFile('Identites_Contacts_DEV602')"));
});
test('DEV650 : entreprise non diffusible → lien direct vers la fiche INPI (courriel, import, deux formulaires)', () => {
  assert.equal(k.EUC_DEV649_lienInpi_('123 456 789 00017'), 'https://data.inpi.fr/entreprises/123456789');
  assert.equal(k.EUC_DEV649_lienInpi_('123456789'), 'https://data.inpi.fr/entreprises/123456789');
  assert.equal(k.EUC_DEV649_lienInpi_('MC-1234'), ''); assert.equal(k.EUC_DEV649_lienInpi_(''), '');
  const r = k.EUC_DEV649_recap_(INFO);
  assert.match(r.texte, /!!! Entreprise « non diffusible »[^\n]*INPI\.\nFiche INPI : https:\/\/data\.inpi\.fr\/entreprises\/123456789\n/);
  assert.match(r.html, /<a href="https:\/\/data\.inpi\.fr\/entreprises\/123456789"[^>]*>Ouvrir la fiche de l’entreprise sur data\.inpi\.fr<\/a>/);
  assert.ok(!k.EUC_DEV649_recap_(Object.assign({}, INFO, { entreprise: { nom: 'X', identifiant: '12345678900017' } })).texte.includes('inpi'), 'pas de lien INPI pour une entreprise diffusible');
  const l = J(k.EUC_DEV649_ligneTampon_({ Alertes: '' }, { nonDiffusible: true, siret: '12345678900017', raisonSociale: 'G' }));
  assert.match(l.Alertes, /https:\/\/data\.inpi\.fr\/entreprises\/123456789/);
  const f = read('apps-script/Declaration_Entreprise_DEV603.html'), q = read('apps-script/PFMP_Acces_QR_V116.html');
  assert.match(f, /<a id="ndInpi" href="#" target="_blank" rel="noopener">/); assert.match(f, /\$\('ndInpi'\)\.href='https:\/\/data\.inpi\.fr\/entreprises\/'\+s\.slice\(0,9\);/);
  assert.match(q, /aI\.href='https:\/\/data\.inpi\.fr\/entreprises\/'\+siren;aI\.target='_blank';aI\.rel='noopener';/);
});
console.log(n + ' tests DEV649 réussis.');
