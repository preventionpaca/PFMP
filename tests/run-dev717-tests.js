'use strict';
/* DEV717 — Formulaires élève : responsables et tuteurs déjà connus pour un SIRET (pré-remplis, nom verrouillé, téléphone et courriel modifiables sur clic). */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
const SIRET = '12345678200010';
function ctx(convs, depots, refs, acces) {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp };
  vm.createContext(k);
  ['apps-script/EUC_DEV706_Contacts.js', 'apps-script/EUC_DEV717_ContactsConnus.js'].forEach(f => vm.runInContext(read(f), k, { filename: f }));
  const appels = [];
  Object.assign(k, {
    EUC_CONVENTION_lireRepriseV117_: t => { appels.push(['reprise', t]); if (t !== 'R-OK') throw new Error('Lien invalide'); return { id: 1 }; },
    EUC_CONVENTION_exigerQRValideV511_: () => true,
    EUC_DEV603_lireJeton_: t => { appels.push(['jeton', t]); if (t !== 'J-OK') throw new Error('Jeton invalide'); return { eleveId: 1 }; },
    EUC_CONVENTION_lireAccesFraisV108_: () => convs || [], EUC_IMPORT_lireRecords_: t => t === 'EUC_MIGRATION_JOTFORM_PFMP' ? (depots || []) : t === 'EUC_CONTACTS_REFERENCE' ? (refs || []) : [],
    EUC_ENT_grist: () => { throw new Error('aucune écriture attendue'); }
  });
  k.appels = appels; return k;
}
/* Données fictives. */
const conv = (id, o) => Object.assign({ id, Entreprise_siret: SIRET, Responsable_civilite: 'M.', Responsable_prenom: 'Paul', Responsable_nom: 'MARTIN', Responsable_fonction: 'Gérant', Responsable_telephone: '06 00 00 00 01', Responsable_courriel: 'paul@garage.test',
  Tuteur_civilite: 'Mme', Tuteur_prenom: 'Léa', Tuteur_nom: 'DURAND', Tuteur_fonction: 'Chef d’atelier', Tuteur_telephone: '06 00 00 00 02', Tuteur_courriel: 'lea@garage.test' }, o || {});

test('regroupement : variantes d’un même nom réunies (orthographe la plus fréquente), coordonnées les plus récentes, autres SIRET et conventions annulées ignorés', () => {
  const k = ctx([conv(1, { Responsable_telephone: '06 00 00 00 09' }), conv(2, { Responsable_nom: 'MARTN', Responsable_telephone: '' }), conv(5), conv(3, { Entreprise_siret: '12345678200028', Responsable_prenom: 'Autre', Responsable_nom: 'PERSONNE' }), conv(4, { Statut_administratif: 'ANNULEE', Responsable_prenom: 'Zoe', Responsable_nom: 'ANNULEE' })]);
  const r = J(k.EUC_DEV717_contactsConnus({ siret: SIRET, jeton: 'J-OK' }));
  assert.equal(r.personnes.length, 2);
  const p = r.personnes.find(x => x.roles.includes('RESPONSABLE'));
  assert.deepEqual([p.civilite, p.prenom, p.nom, p.fonction, p.telephone, p.courriel], ['M.', 'Paul', 'MARTIN', 'Gérant', '06 00 00 00 01', 'paul@garage.test']);
  const t = r.personnes.find(x => x.roles.includes('TUTEUR'));
  assert.equal(t.nom, 'DURAND'); assert.equal(t.valide, false);
});

test('dépôts en ligne vérifiés compris ; dépôt classé ou SIRET non vérifié ignorés ; téléphone ou courriel invalides écartés', () => {
  const dep = (id, o) => Object.assign({ id, Submission_ID: 'SECOURS-X', SIRET_normalise: SIRET, SIRET_statut: 'VERIFIE', Decision: 'A_VALIDER', Responsable_prenom: 'Nora', Responsable_nom: 'BLANC', Responsable_telephone: '0600000003', Responsable_courriel: 'nora@garage.test', Tuteur_prenom: 'Nora', Tuteur_nom: 'BLANC' }, o || {});
  const k = ctx([], [dep(1), dep(2, { Decision: 'REJETEE', Responsable_prenom: 'Rejet', Responsable_nom: 'NON' }), dep(3, { SIRET_statut: 'A_CONTROLER', Responsable_prenom: 'Pas', Responsable_nom: 'VERIFIE' }), dep(4, { Responsable_telephone: '061234', Responsable_courriel: 'nora@gmial.com' })]);
  k.EUC_SUIVI2_contactsTampon_ = j => ({ responsable: { prenom: j.Responsable_prenom, nom: j.Responsable_nom, tel: j.Responsable_telephone, mail: j.Responsable_courriel }, tuteur: { prenom: j.Tuteur_prenom, nom: j.Tuteur_nom } });
  const r = J(k.EUC_DEV717_contactsConnus({ siret: SIRET, reprise: 'R-OK' }));
  assert.equal(r.personnes.length, 1);
  assert.deepEqual(r.personnes[0].roles, ['RESPONSABLE', 'TUTEUR']);
  assert.equal(r.personnes[0].telephone, '06 00 00 00 03', 'dernier téléphone valide'); assert.equal(r.personnes[0].courriel, 'nora@garage.test', 'courriel suspect écarté');
});

test('référence validée par le bureau : nom, téléphone et courriel de référence, en tête de liste', () => {
  const ref = { id: 9, Actif: true, Cle_entreprise: 'S' + SIRET, Nom_reference: 'Paul MARTIN', Telephone_reference: '06 00 00 00 07', Courriel_reference: 'contact@garage.test', Cles_noms: 'martin paul|martn paul' };
  const k = ctx([conv(1, { Responsable_nom: 'MARTN' })], [], [ref]);
  const r = J(k.EUC_DEV717_contactsConnus({ siret: SIRET, jeton: 'J-OK' }));
  const p = r.personnes[0];
  assert.deepEqual([p.prenom, p.nom, p.telephone, p.courriel, p.valide], ['Paul', 'MARTIN', '06 00 00 00 07', 'contact@garage.test', true]);
  assert.deepEqual(J(k.EUC_DEV717_scinder_('Ayoub de la FONTAINE')), { prenom: 'Ayoub de la', nom: 'FONTAINE' });
  assert.deepEqual(J(k.EUC_DEV717_scinder_('Jean Dupont')), { prenom: 'Jean', nom: 'Dupont' });
});

test('accès : jeton de reprise du QR code ou jeton signé de la déclaration, sinon refus ; SIRET incomplet : liste vide ; aucune écriture', () => {
  const k = ctx([conv(1)]);
  assert.throws(() => k.EUC_DEV717_contactsConnus({ siret: SIRET }), /Accès refusé/);
  assert.throws(() => k.EUC_DEV717_contactsConnus({ siret: SIRET, reprise: 'faux' }), /Lien invalide/);
  assert.throws(() => k.EUC_DEV717_contactsConnus({ siret: SIRET, jeton: 'faux' }), /Jeton invalide/);
  assert.equal(J(k.EUC_DEV717_contactsConnus({ siret: '123', jeton: 'J-OK' })).personnes.length, 0);
  assert.doesNotMatch(read('apps-script/EUC_DEV717_ContactsConnus.js'), /EUC_ENT_grist|MailApp/);
});

test('composant : choix d’une personne = champs remplis, nom verrouillé, téléphone et courriel sur « Modifier » ; « Autre personne » = saisie libre', () => {
  const h = read('apps-script/Contacts_Connus_DEV717.html'), js = h.match(/<script id="EUC_DEV717_SCRIPT">([\s\S]*?)<\/script>/)[1];
  const champ = () => { const el = { value: '', readOnly: false, dataset: {}, cls: new Set(), classList: { add(c) { el.cls.add(c); }, remove(c) { el.cls.delete(c); } }, dispatchEvent() {}, focus() {}, select() {},
    insertAdjacentElement(_, b) { el._ajout = b; } }; return el; };
  const doc = { createElement: () => ({ remove() { this.supprime = true; }, set onclick(f) { this._clic = f; }, get onclick() { return this._clic; } }), querySelectorAll: () => [] };
  const w = {}; const c = vm.createContext({ window: w, document: doc, Event: function(t) { this.type = t; }, setTimeout, clearTimeout, Object, String, Number, Date });
  vm.runInContext(js, c);
  const champs = { prenom: champ(), nom: champ(), fonction: champ(), tel: champ(), mail: champ() };
  w.EUC717._appliquer({ champs }, { prenom: 'Paul', nom: 'MARTIN', fonction: 'Gérant', telephone: '06 00 00 00 01', courriel: 'paul@garage.test' });
  assert.equal(champs.prenom.value, 'Paul'); assert.equal(champs.nom.value, 'MARTIN'); assert.equal(champs.tel.value, '06 00 00 00 01'); assert.equal(champs.mail.value, 'paul@garage.test');
  assert.equal(champs.prenom.readOnly, true); assert.equal(champs.nom.readOnly, true); assert.equal(champs.fonction.readOnly, false);
  assert.equal(champs.tel.readOnly, true); assert.ok(champs.tel._ajout, 'bouton « Modifier le téléphone »');
  champs.tel._ajout.onclick(); assert.equal(champs.tel.readOnly, false, 'téléphone modifiable après le clic');
  assert.equal(champs.mail.readOnly, true);
  w.EUC717._appliquer({ champs }, null);
  ['prenom', 'nom', 'fonction', 'tel', 'mail'].forEach(k => { assert.equal(champs[k].readOnly, false, k); assert.equal(champs[k].value, '', k); });
  assert.match(h, /Autre personne<\/b> — le '\+nom\+' n’est pas dans la liste : saisie complète \(prénom, nom, fonction, téléphone, courriel\)/);
  assert.match(js, /Recherche des personnes déjà connues pour cette entreprise…/); assert.match(js, /var DELAI=30000/);
  /* Erreur du serveur : panneau retiré, le formulaire reste utilisable (comportement vérifié, plus seulement la forme du code). */
  const panneaux = [], appels = [];
  const el2 = () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, remove() { this.supprime = true; }, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; }, querySelectorAll: () => [] });
  const run = (ok, ko) => new Proxy({}, { get: (t, k) => k === 'withSuccessHandler' ? h => run(h, ko) : k === 'withFailureHandler' ? h => run(ok, h) : (...a) => appels.push({ k, a, ok, ko }) });
  const w2 = { google: { script: { run: run() } } };
  const doc2 = { createElement: () => { const p = el2(); panneaux.push(p); return p; }, querySelectorAll: () => [] };
  const c2 = vm.createContext({ window: w2, google: w2.google, document: doc2, Event: function() {}, setTimeout, clearTimeout, Object, String, Number, Date });
  vm.runInContext(js, c2);
  const ancre = { parentNode: { insertBefore() {} } }, bloc = () => ({ role: 'RESPONSABLE', ancre, champs: { prenom: champ(), nom: champ(), fonction: champ(), tel: champ(), mail: champ() } });
  w2.EUC717.proposer({ siret: '12345678200010', auth: { jeton: 'J' }, blocs: [bloc()] });
  assert.equal(appels.length, 1); assert.equal(appels[0].k, 'EUC_DEV717_contactsConnus');
  appels[0].ko(new Error('panne'));
  assert.ok(panneaux[0].supprime, 'erreur : panneau retiré, le formulaire reste utilisable');
  /* Après une erreur, une nouvelle demande repart ; une demande réussie est partagée par la page (préchargement puis panneau). */
  w2.EUC717.precharger('12345678200010', { jeton: 'J' }); assert.equal(appels.length, 2, 'nouvel essai après une erreur');
  appels[1].ok({ personnes: [{ prenom: 'Paul', nom: 'MARTIN', roles: ['RESPONSABLE'] }] });
  w2.EUC717.proposer({ siret: '12345678200010', auth: { jeton: 'J' }, blocs: [bloc()] });
  assert.equal(appels.length, 2, 'réponse déjà reçue réutilisée, aucun nouvel appel');
  assert.match(panneaux[panneaux.length - 1].innerHTML, /Paul<\/b>|MARTIN/, 'liste affichée immédiatement');
  w2.EUC717.prechauffer({ jeton: 'J' }); w2.EUC717.prechauffer({ jeton: 'J' });
  assert.deepEqual(appels.slice(2).map(x => x.k), ['EUC_DEV717_prechauffer'], 'préchauffage une seule fois');
});

test('formulaires : composant inclus et appelé après le SIRET vérifié (QR code, reprise QR, « Déclarer mon entreprise »)', () => {
  const inc = "<?!= HtmlService.createHtmlOutputFromFile('Contacts_Connus_DEV717').getContent() ?>";
  [['apps-script/PFMP_Acces_QR_V116.html', /proposerContactsConnus717\(\);[\s\S]*auth:\{reprise:RESUME\}/], ['apps-script/PFMP_Continuation_QR_V117.html', /EUC717\.proposer\(\{siret:d\.siret\|\|field\('entrepriseSiret'\)\.value,auth:\{reprise:RESUME\}/],
    ['apps-script/Declaration_Entreprise_DEV603.html', /SIRET=s;\n\s*\/\* DEV717[^\n]*\n\s*if\(window\.EUC717\)\{[^\n]*auth:\{jeton:JETON\}/]].forEach(([f, re]) => {
    const h = read(f); assert.ok(h.includes(inc), f + ' : inclusion'); assert.match(h, re, f + ' : appel');
  });
});

console.log(n + ' tests DEV717 réussis.');
