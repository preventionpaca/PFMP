/* DEV669 — Demande d'aide résolue : courriel « Problème résolu » à l'élève, automatique ou par bouton, une seule fois. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
function ligne(id, extra) {
  return { id, fields: Object.assign({ Submission_ID: 'SECOURS-PFMP-2026-S0013', Eleve_match_id: 22, Eleve_match_libelle: 'Raphaël MANNI', Prenom_eleve: 'Raphaël', Classe_match_libelle: '1MP3D', Periode_numero: 'PFMP n°1',
    Email_eleve: 'eleve@ex.test', Entreprise_saisie: 'SACOME Conti', Pays_officiel: 'MC', SIRET_statut: 'A_CONTROLER', Niveau_controle: 'ROUGE', Decision: 'A_CONTROLER',
    Alertes: 'Entreprise non vérifiée (Monaco) — élève envoyé au bureau G205' }, extra || {}) };
}
function contexte(lignes) {
  const cols = new Set(['Alertes', 'SIRET_brut', 'SIRET_normalise', 'SIRET_statut', 'SIRET_source', 'Raison_sociale_officielle', 'Nom_commercial', 'Adresse_officielle', 'Complement_adresse_officielle', 'CP_officiel', 'Ville_officielle', 'Pays_officiel', 'Niveau_controle', 'Decision', 'Entreprise_identifiant_type', 'NIS_brut', 'NIS_normalise', 'NIS_statut']);
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, __mails: [],
    EUC_V160_TABLE_: 'T', EUC_IMPORT_exigerAdminTexte_: () => ({}), Utilities: { formatDate: () => '12/11/2026 10:00' }, MailApp: { sendEmail: m => k.__mails.push(m) },
    EUC_ENT_validerSiret: () => ({ valide: true }), EUC_ENT_rechercherSiret: () => ({ source: 'grist', entreprise: { raisonSociale: 'SAM SACOM CONTI', adresseComplete: '1 AV ALBERT II', codePostal: '98000', commune: 'MONACO', etat: 'Actif' } }),
    EUC_ENT_grist(method, p, body) {
      if (/\/columns$/.test(p)) return { columns: [...cols].map(id => ({ id })) };
      const m = /\/records(?:\?filter=(.*))?$/.exec(p);
      if (method === 'get') { if (!m[1]) return { records: lignes }; const ids = JSON.parse(decodeURIComponent(m[1])).id; return { records: lignes.filter(r => ids.includes(r.id)) }; }
      if (method === 'patch') body.records.forEach(r => Object.assign(lignes.find(x => x.id === r.id).fields, r.fields));
      return {};
    } };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV665_DemandesAide.js'), k); vm.runInContext(read('apps-script/EUC_DEV669_Resolution.js'), k);
  return k;
}
test('SIRET vérifié par le bureau sur une demande d’aide : élève prévenu tout de suite, une seule fois', () => {
  const l = [ligne(1)], k = contexte(l), r = J(k.EUC_DEV665_verifierSiret({ id: 1, siret: '12345678900012' }));
  assert.equal(r.prevenu, true); assert.equal(k.__mails.length, 1);
  const m = k.__mails[0]; assert.equal(m.to, 'eleve@ex.test'); assert.match(m.subject, /^Problème résolu : ta convention de stage est enregistrée — n° PFMP-2026-S0013$/);
  assert.match(m.body, /Bonjour Raphaël,/); assert.match(m.body, /SAM SACOM CONTI — 1 AV ALBERT II, 98000 MONACO/); assert.match(m.body, /SIRET 12345678900012/); assert.match(m.body, /plus besoin de passer au bureau G205/);
  assert.match(l[0].fields.Alertes, /Élève prévenu par courriel/); assert.equal(r.soumission.aPrevenir, false);
  assert.throws(() => k.EUC_DEV669_prevenir({ id: 1 }), /déjà prévenu/); assert.equal(k.__mails.length, 1);
});
test('NIS enregistré : élève prévenu ; dépôt ordinaire (pas une demande d’aide) : aucun courriel', () => {
  const l = [ligne(2)], k = contexte(l); k.EUC_DEV665_ajouterBaseMonaco_ = () => 'déjà dans la base des entreprises';
  const r = J(k.EUC_DEV665_enregistrerMonaco({ id: 2, nis: '7112B19343', nom: 'TITAN', adresse: '2 RUE DU GABIAN' }));
  assert.equal(r.prevenu, true); assert.match(k.__mails[0].body, /NIS 7112B19343/);
  const l2 = [ligne(3, { Alertes: 'SIRET corrigé par le bureau' })], k2 = contexte(l2); k2.EUC_DEV665_verifierSiret({ id: 3, siret: '12345678900012' }); assert.equal(k2.__mails.length, 0);
});
test('demandes résolues avant DEV669 : repérées, « Prévenir tous » envoie une fois à chacun', () => {
  const resolue = extra => ligne(0, Object.assign({ SIRET_statut: 'VERIFIE', SIRET_normalise: '12345678900012', Niveau_controle: 'VERT', Decision: 'A_VALIDER', Raison_sociale_officielle: 'SAM SACOM CONTI', Alertes: 'Entreprise non vérifiée (Monaco) — élève envoyé au bureau G205 — SIRET corrigé par le bureau : 12345678900012' }, extra));
  const l = [Object.assign(resolue(), { id: 5 }), Object.assign(resolue({ Email_eleve: '' }), { id: 6 }), Object.assign(ligne(7), {}), Object.assign(resolue({ Decision: 'REJETEE' }), { id: 8 })];
  const k = contexte(l), v = J(k.EUC_DEV665_lister().soumissions);
  assert.deepEqual(v.filter(x => x.aPrevenir).map(x => x.id), [5], 'résolue, avec adresse, non classée');
  const r = J(k.EUC_DEV669_prevenirTous()); assert.equal(r.envoyes, 1); assert.deepEqual(r.ids, [5]);
  assert.equal(J(k.EUC_DEV669_prevenirTous()).envoyes, 0, 'jamais deux fois');
});
test('panneau : filtre, bouton par élève et « Prévenir tous » avec confirmation et spinner', () => {
  const h = read('apps-script/Soumissions_A_Traiter_DEV665.html');
  assert.match(h, /data-filtre="prevenir"/); assert.match(h, /appel\('EUC_DEV669_prevenir',\{id:id\},60000,/); assert.match(h, /appel\('EUC_DEV669_prevenirTous',\{\},300000,/);
  assert.match(h, /if\(!confirm\('Envoyer le courriel « Problème résolu » à '/); assert.match(h, /occupe\(b,true,'Envoi en cours…'\)/);
});
console.log(n + ' tests DEV669 réussis.');
