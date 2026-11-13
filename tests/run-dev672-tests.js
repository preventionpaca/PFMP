'use strict';
/* DEV672 — Lien direct « Vérifier l'entreprise et corriger la saisie » dans le courriel de l'équipe. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const ADMIN = 'https://script.google.com/a/macros/exemple.test/s/ADMIN/exec';

function ctx(extra) {
  const s = Object.assign({ console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, encodeURIComponent, EUC_DEV459_ADMIN_URL_: ADMIN }, extra || {});
  vm.createContext(s);
  ['apps-script/EUC_DEV665_DemandesAide.js', 'apps-script/EUC_DEV672_LienCorrection.js', 'apps-script/EUC_DEV649_LieuStageRecap.js'].forEach(f => vm.runInContext(read(f), s));
  return s;
}

test('lien : page d’administration ouverte sur le numéro, numéro nettoyé ; rien sans adresse d’administration', () => {
  const s = ctx();
  assert.equal(s.EUC_DEV672_lien_('soumissions-a-traiter-pfmp', 'PFMP-2026-000321'), ADMIN + '?page=soumissions-a-traiter-pfmp&numero=PFMP-2026-000321');
  assert.equal(s.EUC_DEV672_numero_({ parameter: { numero: 'PFMP-1"><script>' } }), 'PFMP-1script');
  assert.equal(s.EUC_DEV672_numero_(undefined), ''); assert.equal(s.EUC_DEV672_lien_('x', ''), '');
  const sans = ctx({ EUC_DEV459_ADMIN_URL_: undefined }); assert.equal(sans.EUC_DEV672_lien_('x', 'N1'), '');
  assert.match(read('apps-script/EUC_DEV672_LienCorrection.js'), /EUC_DEV459_ADMIN_URL_/); assert.doesNotMatch(read('apps-script/EUC_DEV672_LienCorrection.js'), /https?:\/\//, 'aucune adresse écrite en dur');
});

test('courriel : lien dans le courriel de l’équipe seulement, jamais dans l’accusé de l’élève', () => {
  const s = ctx(), info = { numero: 'N1', entreprise: { nom: 'X' }, g205: { requis: true, motif: 'entreprise non vérifiée' }, lienCorrection: ADMIN + '?page=p&numero=N1' };
  const eleve = s.EUC_DEV649_recap_(info);
  assert.doesNotMatch(eleve.texte + eleve.html, /corriger la saisie|ADMIN/);
  const eq = s.EUC_DEV649_recap_(Object.assign({ equipe: true }, info));
  assert.match(eq.texte, /Vérifier l’entreprise et corriger la saisie \(entreprise, SIRET, responsable, tuteur, lieu du stage\) : https:\/\/script\.google\.com\/a\/macros\/exemple\.test\/s\/ADMIN\/exec\?page=p&numero=N1/);
  assert.match(eq.html, /<a href="https:\/\/script\.google\.com[^"]*numero=N1"[^>]*>Vérifier l’entreprise et corriger la saisie<\/a>/);
  assert.ok(eq.html.indexOf('corriger la saisie') > eq.html.indexOf('bureau G205'), 'après l’alerte G205');
  const d = read('apps-script/EUC_DEV649_LieuStageRecap.js');
  assert.match(d, /info\.lienCorrection = EUC_DEV672_lien_\('soumissions-a-traiter-pfmp', numero\);\s*if \(email\) MailApp\.sendEmail/);
  assert.match(read('apps-script/EUC_CONVENTION_PFMP_NotificationsV143.gs'), /info\.lienCorrection=EUC_DEV672_lien_\('admin-conventions-pfmp',d\.numero\);/);
});

test('correction : seules les colonnes de la saisie, valeurs modifiées seulement, courriel contrôlé, trace dans les alertes', () => {
  const ecrits = [];
  const ligne = { id: 12, fields: { Submission_ID: 'SECOURS-PFMP-2026-000400', Decision: 'A_CONTROLER', Entreprise_saisie: 'Garage X', Nom_tuteur: 'M. Bon', Email_tuteur: '', Alertes: 'Demande d’aide' } };
  const s = ctx({ EUC_IMPORT_exigerAdminTexte_() {}, EUC_V160_TABLE_: 'T',
    Utilities: { formatDate: () => '13/11/2026 09:00' },
    EUC_ENT_grist(m, u, body) {
      if (m === 'get' && /columns$/.test(u)) return { columns: Object.keys(ligne.fields).concat(['Fonction_tuteur', 'Telephone_tuteur', 'Lieu_stage_adresse']).map(id => ({ id })) };
      if (m === 'get') return { records: [ligne] };
      ecrits.push(body.records[0]); return {};
    } });
  assert.throws(() => s.EUC_DEV672_changements_({}, { Email_tuteur: 'pas-un-courriel' }), /Courriel invalide \(courriel du tuteur\)/);
  assert.deepEqual(Object.assign({}, s.EUC_DEV672_changements_({ Nom_tuteur: 'A' }, { Nom_tuteur: ' A ', SIRET_statut: 'VERIFIE', Decision: 'VALIDEE' })), {}, 'colonnes hors saisie ignorées');
  const r = s.EUC_DEV672_corrigerSaisie({ id: 12, champs: { Entreprise_saisie: 'Garage X', Nom_tuteur: 'Paul BON', Fonction_tuteur: 'Chef d’atelier', Email_tuteur: 'paul@garage.test', Lieu_stage_adresse: '', Decision: 'VALIDEE' } });
  assert.deepEqual(Array.from(r.corriges), ['tuteur', 'fonction du tuteur', 'courriel du tuteur']);
  assert.equal(ecrits.length, 1); const f = ecrits[0].fields;
  assert.equal(f.Nom_tuteur, 'Paul BON'); assert.equal(f.Fonction_tuteur, 'Chef d’atelier'); assert.equal(f.Decision, undefined); assert.equal(f.Entreprise_saisie, undefined, 'valeur identique non réécrite');
  assert.equal(f.Email_tuteur, 'paul@garage.test');
  assert.match(f.Alertes, /^Demande d’aide — Saisie corrigée par le bureau : tuteur, fonction du tuteur, courriel du tuteur \(13\/11\/2026 09:00\)$/);
  assert.equal(r.soumission.tuteur.nom, 'Paul BON'); assert.equal(r.soumission.tuteur.fonction, 'Chef d’atelier');
  const r2 = s.EUC_DEV672_corrigerSaisie({ id: 12, champs: { Entreprise_saisie: 'Garage X' } }); assert.equal(r2.inchange, true); assert.equal(ecrits.length, 1, 'rien d’écrit sans changement');
  assert.match(read('apps-script/EUC_DEV672_LienCorrection.js'), /function EUC_DEV672_corrigerSaisie\(q\) \{\n  EUC_IMPORT_exigerAdminTexte_\(\);/, 'réservé à l’administration');
});

test('page « Soumissions à traiter » : ouverte sur le dépôt du courriel, correction dépliée, bouton protégé contre le double clic', () => {
  const h = read('apps-script/Soumissions_A_Traiter_DEV665.html'), srv = read('apps-script/EUC_DEV665_DemandesAide.js');
  assert.match(srv, /t\.numero = typeof EUC_DEV672_numero_ === 'function' \? EUC_DEV672_numero_\(e\) : '';/);
  assert.match(h, /CIBLE='<\?= numero \?>';[^]*if\(CIBLE\)FILTRE='cible';/);
  assert.match(h, /\(FILTRE==='cible'&&x\.numero===CIBLE\)/); assert.match(h, /Dépôt '\+esc\(CIBLE\)\+' introuvable parmi les soumissions en attente/);
  assert.match(h, /id="voirTout"/); assert.match(h, /<details class="corriger" id="d'\+x\.id\+'"'\+\(FILTRE==='cible'\?' open':''\)/);
  ['Entreprise_saisie', 'Adresse_entreprise', 'Nom_responsable', 'Telephone_entreprise', 'Email_entreprise', 'Nom_tuteur', 'Fonction_tuteur', 'Telephone_tuteur', 'Email_tuteur', 'Lieu_stage_adresse', 'Lieu_stage_commune']
    .forEach(k => assert.ok(h.includes("ch('" + k + "'"), 'champ ' + k));
  assert.match(h, /if\(a==='corriger'\)\{[^]*occupe\(b,true,'Enregistrement…'\);[^]*appel\('EUC_DEV672_corrigerSaisie',\{id:id,champs:champs\},60000,function\(r\)\{occupe\(b,false\);[^]*function\(e\)\{occupe\(b,false\);/);
});

test('page « Administration des conventions » : le dossier du courriel s’ouvre tout seul, sinon il est cherché', () => {
  const g = read('apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs'), h = read('apps-script/Admin_Conventions_PFMP.html');
  assert.match(g, /numero:typeof EUC_DEV672_numero_==='function'\?EUC_DEV672_numero_\(e\):''/);
  assert.match(h, /if\(C\.numero\)\{\s*const cible=dossiers\.find\(function\(d\)\{return String\(d\.numero\|\|''\)===String\(C\.numero\)\}\);\s*if\(cible\)\{selected=cible;[^]*openBtn\.onclick\(\);[^]*correctionAdminV149[^]*else\{search\.value=C\.numero;renderSuggestions\(\);/);
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'admin-conventions-pfmp':\s*return EUC_DEV498_afficherAdminConventions_\(e\);/);
});
test('pages de correction réservées à l’administration : un professeur reconnu (ENSEIGNANT, LECTURE_SEULE) est refusé', () => {
  const g = read('apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.gs');
  const debut = g.indexOf('var EUC_ADMIN_WORKFLOW_ROLES_V672_'), fin = g.indexOf('function EUC_ADMIN_WORKFLOW_defsV144_');
  const garde = r => { const s = { Error, EUC_PFMP_contexteAdmin_: () => r }; vm.createContext(s); vm.runInContext(g.slice(debut, fin), s); return s.EUC_ADMIN_WORKFLOW_ctxV144_(); };
  ['ADMIN_PFMP', 'DDFPT', 'BUREAU_ENTREPRISES'].forEach(role => assert.equal(garde({ autorise: true, role }).role, role));
  [{ autorise: true, role: 'ENSEIGNANT' }, { autorise: true, role: 'LECTURE_SEULE' }, { autorise: false }, null].forEach(c => assert.throws(() => garde(c), /Accès administrateur requis/));
  assert.match(read('apps-script/EUC_IMPORT_PFMP_TextService.gs'), /\['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'\]\.indexOf\(ctx\.role\)<0\) throw new Error\('Accès non autorisé\.'\)/, 'Soumissions à traiter : mêmes rôles');
});
console.log(n + ' tests DEV672 réussis.');
