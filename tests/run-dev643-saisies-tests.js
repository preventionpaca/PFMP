'use strict';
/* DEV643 — Coordonnées du formulaire de secours dans le suivi et page « Contrôle des saisies ». */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const c = { console, JSON, Math, Date, Object, Array, String, Number, Error };
vm.createContext(c); vm.runInContext(read('apps-script/EUC_SUIVI2_Moteur.js') + '\n' + read('apps-script/EUC_DEV643_Saisies.js'), c);
const page = read('apps-script/Controle_Saisies_DEV643.html');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const R = (id, fields) => ({ id, fields });
const J = x => JSON.parse(JSON.stringify(x));
const SIRET = '93510938900012';

/* Ligne telle que l'écrit EUC_DEV603_ligne_ : pas de colonne Tuteur_nom, le détail dans Raw_JSON. */
function ligneSecours(id, eleve) {
  return R(id, { Eleve_match_id: eleve, Annee_scolaire: '2026-2027', Submission_ID: 'SECOURS-PFMP-2026-S0007', Decision: 'A_VALIDER', SIRET_statut: 'VERIFIE', SIRET_normalise: SIRET,
    Date_debut_brut: '2026-11-23', Date_fin_brut: '2026-12-18', Date_import: '2026-11-03T10:00:00.000Z', Raison_sociale_officielle: 'ATELIER TEST', Adresse_officielle: '1 RUE TEST', CP_officiel: '06100', Ville_officielle: 'NICE',
    Nom_tuteur: 'TUTEUR', Fonction_tuteur: 'Chef', Email_tuteur: 't@atelier.test', Telephone_tuteur: '06 00 00 00 01', Nom_responsable: 'RESPONSABLE', Email_entreprise: 'r@atelier.test', Telephone_entreprise: '04 00 00 00 02',
    Raw_JSON: JSON.stringify({ 'Civilité du responsable': 'Mme', 'Prénom du responsable': 'Rita', 'Nom du responsable': 'RESPONSABLE', 'Fonction du responsable': 'Gérante', 'Téléphone du responsable': '04 00 00 00 02', 'E-mail du responsable': 'r@atelier.test',
      'Civilité du tuteur': 'M.', 'Prénom du tuteur': 'Tom', 'Nom du tuteur': 'TUTEUR', 'Fonction du tuteur': 'Chef', 'Téléphone du tuteur': '06 00 00 00 01', 'Adresse e-mail du tuteur': 't@atelier.test' }) });
}
function sources(dossiers, jotform) {
  return { annees: [R(1, { Code: '2026-2027' })], classes: [R(10, { Nom: '1TEST' })], diplomes: [],
    periodes: [R(100, { Annee_scolaire: 1, Classes_concernees: ['L', 10], Date_debut: '2026-11-23', Date_fin: '2026-12-18', Libelle: 'PFMP 1' })],
    eleves: [R(1, { Nom: 'ALPHA', Prenom: 'Ana', Classe: 10, Annee_scolaire: 1 }), R(2, { Nom: 'BETA', Prenom: 'Bob', Classe: 10, Annee_scolaire: 1 })],
    dossiers: dossiers || [], jotform: jotform || [], entreprises: [], apprentissage: [], pdif: [], types: [], affectations: [], professeurs: [], classesProfs: [] };
}
const modele = s => c.EUC_SUIVI2_calculer_(s, '2026-2027', '2026-11-06');
const resumeDe = m => m.classes[0].periodes[0].resume;

test('une déclaration du formulaire de secours affiche responsable, tuteur, numéro et date', () => {
  const f = resumeDe(modele(sources([], [ligneSecours(800, 1)]))).fiches[1];
  assert.deepEqual(J(f.contact), { nom: 'Rita RESPONSABLE', tel: '04 00 00 00 02', mail: 'r@atelier.test' });
  assert.deepEqual(J(f.tuteur), { nom: 'Tom TUTEUR', tel: '06 00 00 00 01', mail: 't@atelier.test' });
  assert.equal(f.numero, 'PFMP-2026-S0007'); assert.equal(f.enregistreLe, '2026-11-03');
});

test('une ancienne ligne JotForm sans prénom séparé garde son tuteur', () => {
  const j = R(801, { Eleve_match_id: 1, Decision: 'VALIDEE', SIRET_statut: 'VERIFIE', SIRET_normalise: SIRET, Date_debut_brut: '2026-11-23', Date_fin_brut: '2026-12-18', Entreprise_saisie: 'ATELIER TEST',
    Raw_JSON: JSON.stringify({ 'Nom du tuteur': 'Tom TUTEUR', 'Téléphone entreprise': '04 00 00 00 02', "Adresse e-mail de l'entreprise": 'r@atelier.test' }) });
  const f = resumeDe(modele(sources([], [j]))).fiches[1];
  assert.equal(f.tuteur.nom, 'Tom TUTEUR'); assert.equal(f.contact.tel, '04 00 00 00 02'); assert.equal(f.numero, ''); assert.equal(f.enregistreLe, '');
});

test('un dossier sans contacts est complété par la saisie de la même entreprise, jamais par une autre', () => {
  const dossier = R(500, { Eleve: 1, Periode: 100, Statut_administratif: 'CONVENTION_ENREGISTREE', Entreprise_siret: SIRET, Entreprise_raison_sociale: 'ATELIER TEST', Tuteur_nom: 'DEJA' });
  const f = resumeDe(modele(sources([dossier], [ligneSecours(800, 1)]))).fiches[1];
  assert.equal(f.tuteur.nom, 'DEJA'); assert.equal(f.tuteur.tel, '06 00 00 00 01'); assert.equal(f.contact.mail, 'r@atelier.test');
  const autre = ligneSecours(801, 1); autre.fields.SIRET_normalise = '12345678901234';
  const g = resumeDe(modele(sources([dossier], [autre]))).fiches[1];
  assert.equal(g.tuteur.tel, '');
});

test('le contrôle liste la saisie réelle et la dit complète une fois affichée', () => {
  const s = sources([], [ligneSecours(800, 1)]), r = c.EUC_DEV643_lignes_(modele(s), s, 10);
  const e = r.eleves.find(x => x.id === 1);
  assert.equal(e.saisies[0].origine, 'Formulaire de secours');
  assert.equal(e.saisies[0].tuteur.prenom, 'Tom'); assert.equal(e.saisies[0].responsable.fonction, 'Gérante');
  assert.deepEqual(J(e.saisies[0].manques), []);
  assert.equal(e.periodes[0].etat.code, 'OK');
  assert.equal(r.resume.OK, 1); assert.equal(r.resume.AUCUNE, 1);
});

test('le contrôle distingue saisi non affiché, jamais saisi, non comptée et rien', () => {
  const saisie = { siret: SIRET, responsable: { nom: 'R', tel: '1', mail: 'm' }, tuteur: { nom: 'T', tel: '2', mail: 'n' } };
  const vide = { siret: SIRET, responsable: {}, tuteur: {} };
  const fiche = { siret: SIRET, contact: { nom: 'R', tel: '1', mail: 'm' }, tuteur: { nom: '', tel: '', mail: '' } };
  const etat = c.EUC_DEV643_etat_;
  assert.equal(etat('AVEC', fiche, [saisie]).code, 'NON_AFFICHE');
  assert.match(etat('AVEC', fiche, [saisie]).texte, /nom du tuteur, téléphone du tuteur, courriel du tuteur/);
  assert.equal(etat('AVEC', fiche, [vide]).code, 'NON_SAISI');
  assert.equal(etat('AVEC', fiche, [Object.assign({}, saisie, { siret: '12345678901234' })]).code, 'NON_SAISI');
  assert.equal(etat('SANS', null, [saisie]).code, 'NON_COMPTEE');
  assert.equal(etat('SANS', null, []).code, 'AUCUNE');
  assert.equal(etat('APPRENTI', null, []).code, 'AUTRE');
});

test('un dossier préparé sans rien de saisi n’est pas une saisie ; un champ vide est nommé', () => {
  const s = sources([R(500, { Eleve: 1, Periode: 100, Statut_administratif: 'A_COMPLETER_ENTREPRISE' }),
    R(501, { Eleve: 2, Periode: 100, Statut_administratif: 'CONVENTION_ENREGISTREE', Entreprise_siret: SIRET, Entreprise_raison_sociale: 'ATELIER', Tuteur_nom: 'T' })]);
  const r = c.EUC_DEV643_lignes_(modele(s), s, 10);
  assert.equal(r.eleves.find(x => x.id === 1).saisies.length, 0);
  const b = r.eleves.find(x => x.id === 2).saisies[0];
  assert.equal(b.origine, 'Dossier du bureau');
  assert.ok(b.manques.includes('téléphone du tuteur') && b.manques.includes('nom du responsable'));
});

test('une saisie ne compte que pour sa période : pas de fausse alerte sur la période suivante', () => {
  const s = sources([], [ligneSecours(800, 1)]);
  s.periodes.push(R(101, { Annee_scolaire: 1, Classes_concernees: ['L', 10], Date_debut: '2027-03-22', Date_fin: '2027-04-16', Libelle: 'PFMP 2' }));
  const e = c.EUC_DEV643_lignes_(modele(s), s, 10).eleves.find(x => x.id === 1);
  assert.deepEqual(J(e.periodes.map(p => p.etat.code)), ['OK', 'AUCUNE']);
  const d = { periode: 0, debut: '', fin: '' }, p = { id: 101, debut: '2027-03-22', fin: '2027-04-16' };
  assert.equal(c.EUC_DEV643_concerne_(d, p), true);
  assert.equal(c.EUC_DEV643_concerne_({ periode: 100, debut: '', fin: '' }, p), false);
  assert.equal(c.EUC_DEV643_concerne_({ periode: 101, debut: '', fin: '' }, p), true);
});

test('le journal liste tout, la saisie la plus récente d’abord, même un élève non reconnu, sans dossier vide', () => {
  const inconnu = R(802, { Annee_scolaire: '2026-2027', Submission_ID: '6200', Nom_eleve: 'OMEGA', Prenom_eleve: 'Oli', Classe_saisie: '1X', Entreprise_saisie: 'AUTRE', Date_import: '2026-11-05T08:00:00.000Z' });
  const horsAnnee = R(803, { Annee_scolaire: '2025-2026', Entreprise_saisie: 'ANCIENNE', Date_import: '2025-11-05T08:00:00.000Z' });
  const s = sources([R(500, { Eleve: 2, Periode: 100, Statut_administratif: 'INFORMATIONS_ENREGISTREES', Entreprise_siret: SIRET, Entreprise_raison_sociale: 'ATELIER', Date_saisie_entreprise: 1793986000 }),
    R(501, { Eleve: 1, Periode: 100, Statut_administratif: 'A_COMPLETER_ENTREPRISE' })], [ligneSecours(800, 1), inconnu, horsAnnee]);
  s.annees.push(R(2, { Code: '2025-2026' }));
  const r = c.EUC_DEV643_journal_('2026-2027', s);
  assert.deepEqual(J(r.saisies.map(x => x.ligne)), [500, 802, 800]);
  assert.equal(r.saisies[0].eleve, 'BETA Bob'); assert.equal(r.saisies[0].classe, '1TEST'); assert.equal(r.saisies[0].origine, 'QR code');
  assert.equal(r.saisies[1].eleve, 'OMEGA Oli'); assert.equal(r.saisies[1].classe, '1X'); assert.equal(r.saisies[1].origine, 'JotForm');
  assert.equal(r.saisies[2].debut, '2026-11-23'); assert.equal(r.saisies[2].fin, '2026-12-18');
});

test('une classe inconnue est refusée et les fonctions restent réservées à l’administration', () => {
  const s = sources(); assert.throws(() => c.EUC_DEV643_lignes_(modele(s), s, 999), /Classe introuvable/);
  const code = read('apps-script/EUC_DEV643_Saisies.js');
  for (const f of ['EUC_DEV643_afficher(e)', 'EUC_DEV643_classes(annee)', 'EUC_DEV643_saisies(annee, classeId)', 'EUC_DEV643_journal(annee)'])
    assert.ok(code.slice(code.indexOf('function ' + f)).split('\n')[1].includes('EUC_SUIVI2_exigerAdmin_()'), f);
  assert.doesNotMatch(code, /'(?:post|patch|put|delete)'/i);
});

test('la page est branchée et respecte le contrat du bouton', () => {
  assert.ok(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js').includes("case 'saisies-conventions-pfmp':\n      return EUC_DEV643_afficher(e);"));
  assert.ok(read('scripts/pfmp-release-config.json').includes('"page": "saisies-conventions-pfmp"'));
  assert.ok(read('apps-script/Admin_PFMP.html').includes('?page=saisies-conventions-pfmp">Contrôle des saisies'));
  assert.ok(page.includes("$('lancer').disabled=on") && page.includes('class="spin"') && page.includes('Lecture des saisies…'));
  assert.ok(page.includes('Toutes les saisies par date') && page.includes("$('journal').disabled=on") && page.includes("occupe(false,'journal')") && page.includes('Aucune saisie à afficher'));
  assert.ok(page.includes('withFailureHandler') && page.includes('Pas de réponse après 2 minutes'));
  assert.ok(page.includes('Aucune saisie enregistrée') && page.includes('Aucun élève à afficher'));
});

console.log(n + ' tests DEV643 saisies réussis');
