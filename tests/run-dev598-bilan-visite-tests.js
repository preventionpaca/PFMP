'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const moteur = read('apps-script/EUC_SUIVI2_Moteur.js'), echeancier = read('apps-script/EUC_DEV597_Echeancier.js'), bilan = read('apps-script/EUC_DEV598_BilanVisite.js');
const pageProf = read('apps-script/Bilan_Visite_DEV598.html'), pageTuteur = read('apps-script/Validation_Bilan_DEV598.html'), pageEch = read('apps-script/Echeancier_Apprentis_DEV597.html');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const octets = buf => Array.from(buf).map(b => (b > 127 ? b - 256 : b));

/* Contexte Apps Script simulé : Grist en mémoire, courriels capturés. */
function contexte(opts) {
  opts = opts || {};
  const props = { EUC_DEV598_SECRET: 'secret-de-test' }, mails = [], grist = { calls: [] }, tables = opts.tables || {};
  const k = {
    String, Number, Array, Object, JSON, Date, Math, Error, RegExp, console: { log() {} }, encodeURIComponent,
    Utilities: {
      computeHmacSha256Signature: (t, s) => octets(crypto.createHmac('sha256', s).update(t, 'utf8').digest()),
      computeDigest: (a, t) => octets(crypto.createHash('sha256').update(t, 'utf8').digest()),
      DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' }, getUuid: () => 'uuid'
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: x => props[x] || null, setProperty: (x, v) => { props[x] = v; } }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/ID/exec' }) },
    CacheService: { getScriptCache: () => ({ get: () => '1', put() {} }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: m => mails.push(m) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'proprietaire@example.org' }) },
    EUC_ENT_grist(method, p, body) {
      grist.calls.push({ method, p, body });
      const m = /^\/tables\/([^/?]+)\/records(?:\?filter=(.*))?$/.exec(p);
      if (!m) return {};
      const t = tables[m[1]] = tables[m[1]] || [];
      if (method === 'get') {
        if (!m[2]) return { records: t };
        const f = JSON.parse(decodeURIComponent(m[2])), cle = Object.keys(f)[0];
        return { records: t.filter(r => f[cle].includes(cle === 'id' ? r.id : r.fields[cle])) };
      }
      if (method === 'post') { const out = body.records.map(r => { const id = t.length + 1; t.push({ id, fields: Object.assign({}, r.fields) }); return { id }; }); return { records: out }; }
      if (method === 'patch') { body.records.forEach(r => { const x = t.find(y => y.id === r.id); Object.assign(x.fields, r.fields); }); return {}; }
      return {};
    }
  };
  vm.createContext(k);
  vm.runInContext(moteur + '\n' + echeancier + '\n' + bilan, k);
  k.EUC_SUIVI2_aujourdhui_ = () => opts.aujourdhui || '2026-10-20';
  k.EUC_SUIVI2_modele_ = () => ({ annee: '2026-2027', classes: [{ nom: '1CAPP', modeApprentissage: 'CLASSE_ENTIERE', eleves: [{ id: 7, libelle: 'DUPONT Léa' }] }] });
  k.EUC_SUIVI2_exigerAdmin_ = () => ({ email: 'admin@example.org', role: 'ADMIN_PFMP' });
  k.__props = props; k.__mails = mails; k.__grist = grist; k.__tables = tables;
  return k;
}
function tablesBase() {
  return {
    EUC_APPRENTISSAGE_PFMP: [{ id: 12, fields: { Eleve: 7, Nom_entreprise: 'Carrosserie Martin', Adresse: '3 rue du Port', Code_postal: '06000', Ville: 'Nice', Date_debut: '2026-09-15', Tuteur_nom: 'MARTIN', Tuteur_prenom: 'Paul', Tuteur_fonction: 'Chef d’atelier', Tuteur_courriel: 'contact@martin.fr' } }],
    EUC_REFERENTS_APPRENTIS_PFMP: [{ id: 1, fields: { Eleve: 7, Annee_scolaire: '2026-2027', Professeur: 5, Professeur_nom: 'M. Prof', Actif: true } }],
    EUC_ACTIVITES_BILAN_VISITE: [], EUC_BILANS_VISITE_APPRENTIS: [],
    EUC_PROFESSEURS_PFMP: [{ id: 5, fields: { Prenom: 'Jean', Nom: 'Prof', Email: 'jean.prof@ac-nice.fr', Telephone: '06 11 22 33 44' } }]
  };
}
const saisie = (k, extra) => Object.assign({ t: k.EUC_DEV598_jetonProf_(12), date: '2026-10-20', modalite: 'SUR_PLACE', type: 'POSITIONNEMENT', professeur: 'M. Prof', bilan: 'SATISFAISANT', contenu: { comportement: { tenue: 1, langage: 9 }, observations: 'Bon début' } }, extra || {});
const signature = 'data:image/png;base64,' + 'A'.repeat(600);

test('DEV598 : liens signés — professeur par contrat, tuteur par bilan, falsification refusée, expiration à 7 jours', () => {
  const k = contexte();
  const tp = k.EUC_DEV598_jetonProf_(12);
  assert.strictEqual(k.EUC_DEV598_lireJetonProf_(tp), 12);
  assert.throws(() => k.EUC_DEV598_lireJetonProf_(tp.replace('p12', 'p13')), /invalide/);
  assert.throws(() => k.EUC_DEV598_lireJetonProf_(''), /invalide/);
  const ts = k.EUC_DEV598_jetonTuteur_(4, '20261020');
  assert.strictEqual(k.EUC_DEV598_lireJetonTuteur_(ts, '2026-10-27'), 4);
  assert.throws(() => k.EUC_DEV598_lireJetonTuteur_(ts, '2026-10-28'), /expiré/);
  assert.throws(() => k.EUC_DEV598_lireJetonTuteur_(ts.replace('20261020', '20261025'), '2026-10-26'), /invalide/);
  assert.throws(() => k.EUC_DEV598_lireJetonTuteur_(tp, '2026-10-20'), /invalide/);
  assert.match(k.EUC_DEV598_lienTuteur_(4), /^https:\/\/script\.google\.com\/macros\/s\/ID\/exec\?page=validation-bilan-visite&s=s4\.20261020\./);
});

test('DEV598 : saisie nettoyée — modalité, type et date obligatoires, appréciations bornées, empreinte sensible au contenu', () => {
  const k = contexte(), m = k.EUC_DEV598_modele_('1CAPP', []);
  const b = k.EUC_DEV598_nettoyer_(saisie(k), m);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(b.contenu.comportement)), { tenue: 1 });
  assert.throws(() => k.EUC_DEV598_nettoyer_(saisie(k, { modalite: '' }), m), /modalité/);
  assert.throws(() => k.EUC_DEV598_nettoyer_(saisie(k, { type: 'X' }), m), /type/);
  assert.throws(() => k.EUC_DEV598_nettoyer_(saisie(k, { date: '20/10/2026' }), m), /Date/);
  const b2 = k.EUC_DEV598_nettoyer_(saisie(k, { contenu: { comportement: { tenue: 2 }, observations: 'Bon début' } }), m);
  assert.notStrictEqual(k.EUC_DEV598_empreinte_(b), k.EUC_DEV598_empreinte_(b2));
  assert.strictEqual(k.EUC_DEV598_empreinte_(b), k.EUC_DEV598_empreinte_(k.EUC_DEV598_nettoyer_(saisie(k), m)));
});

test('DEV598 : modèle de fiche — 13 critères communs, repères et activités du CAP Peintre pour la classe CAPP seulement', () => {
  const k = contexte();
  const lignes = k.EUC_DEV598_SEMENCE_.map((s, i) => ({ fields: { Classe_motif: 'CAPP', Diplome: 'CAP Peintre automobile', Type: s[0], Bloc: s[1], Libelle: s[2], Ordre: (i + 1) * 10, Actif: true } }));
  const m = k.EUC_DEV598_modele_('1CAPP', lignes);
  assert.strictEqual(m.comportement.length, 13);
  assert.strictEqual(m.reperes.length, 3); assert.strictEqual(m.activites.length, 6); assert.strictEqual(m.aVerifier.length, 1);
  assert.strictEqual(m.intitule, 'CAP Peintre automobile');
  assert.match(m.activites[0].bloc, /^Bloc 1/); assert.match(m.activites[5].libelle, /bases et vernis/);
  const autre = k.EUC_DEV598_modele_('TMELEC', lignes);
  assert.strictEqual(autre.activites.length + autre.reperes.length, 0); assert.strictEqual(autre.comportement.length, 13);
});

test('DEV598 : vigilance — signataire différent, adresse académique, contact d’un professeur, même contact pour deux entreprises', () => {
  const k = contexte(), profs = [{ email: 'jean.prof@ac-nice.fr', telephone: '06 11 22 33 44' }];
  const v = (sig, autres) => Array.from(k.EUC_DEV598_vigilance_(Object.assign({ nom: 'MARTIN', prenom: 'Paul', email: '', telephone: '' }, sig), { nom: 'Paul MARTIN' }, 'Carrosserie Martin', autres || [], profs));
  assert.deepStrictEqual(v({ email: 'paul@martin.fr' }), []);
  assert.deepStrictEqual(v({ nom: 'Martin', prenom: 'Paul' }), []);
  assert.deepStrictEqual(v({ nom: 'DURAND', prenom: 'Luc', telephone: '0612345678' }), ['SIGNATAIRE_DIFFERENT']);
  assert.ok(v({ email: 'x.y@ac-nice.fr' }).includes('ADRESSE_ACADEMIQUE'));
  assert.ok(v({ telephone: '+33 6 11 22 33 44' }).includes('CONTACT_PROFESSEUR'));
  assert.deepStrictEqual(v({ email: 'paul@martin.fr' }, [{ entreprise: 'Garage Autre', email: 'PAUL@martin.fr' }]), ['CONTACT_PLUSIEURS_ENTREPRISES']);
  assert.deepStrictEqual(v({ email: 'paul@martin.fr' }, [{ entreprise: 'CARROSSERIE MARTIN', email: 'paul@martin.fr' }]), []);
});

test('DEV598 : parcours simulé — création, QR, validation par le tuteur, accusé avec copie, modification qui annule la validation', () => {
  const k = contexte({ tables: tablesBase() });
  const r = k.EUC_DEV598_enregistrer(saisie(k));
  assert.strictEqual(r.ok, true); assert.ok(r.bilanId);
  const row = k.__tables.EUC_BILANS_VISITE_APPRENTIS[0].fields;
  assert.strictEqual(row.Statut, 'A_VALIDER'); assert.strictEqual(row.Classe, '1CAPP'); assert.strictEqual(row.Entreprise, 'Carrosserie Martin');
  const s = /s=([^&]+)/.exec(r.lienTuteur)[1];
  const lu = k.EUC_DEV598_lireValidation({ s });
  assert.strictEqual(lu.apprenti, 'DUPONT Léa'); assert.strictEqual(lu.tuteur.prenom, 'Paul');
  assert.strictEqual(lu.bilan.signataire, ''); assert.strictEqual(lu.bilan.contenu.observations, 'Bon début');
  assert.throws(() => k.EUC_DEV598_valider({ s, empreinte: 'autre', prenom: 'Paul', nom: 'MARTIN', email: 'paul@martin.fr', signature }), /modifié pendant votre lecture/);
  assert.throws(() => k.EUC_DEV598_valider({ s, empreinte: lu.bilan.empreinte, prenom: 'Paul', nom: 'MARTIN', signature }), /téléphone ou un courriel/);
  assert.throws(() => k.EUC_DEV598_valider({ s, empreinte: lu.bilan.empreinte, prenom: 'Paul', nom: 'MARTIN', email: 'paul@martin.fr', signature: '' }), /Signez/);
  k.__props.EUC_DEV598_COPIE_VALIDATIONS = 'bureau@example.org';
  const v = k.EUC_DEV598_valider({ s, empreinte: lu.bilan.empreinte, prenom: 'Paul', nom: 'MARTIN', fonction: 'Chef d’atelier', email: 'paul@martin.fr', signature });
  assert.strictEqual(v.accuse, 'paul@martin.fr');
  assert.strictEqual(row.Statut, 'VALIDE'); assert.strictEqual(row.Valide_via, 'QR_SUR_PLACE'); assert.strictEqual(row.Vigilance, ''); assert.ok(row.Accuse_envoye_le);
  assert.strictEqual(k.__mails.length, 1);
  assert.strictEqual(k.__mails[0].to, 'paul@martin.fr'); assert.strictEqual(k.__mails[0].cc, 'bureau@example.org');
  assert.match(k.__mails[0].body, /pas à l’origine de cette validation/); assert.doesNotMatch(k.__mails[0].body, /Vigilance/);
  assert.throws(() => k.EUC_DEV598_valider({ s, empreinte: lu.bilan.empreinte, prenom: 'Paul', nom: 'MARTIN', email: 'paul@martin.fr', signature }), /déjà validé/);
  const ouvert = k.EUC_DEV598_ouvrir({ t: k.EUC_DEV598_jetonProf_(12) });
  assert.strictEqual(ouvert.bilans[0].statut, 'VALIDE'); assert.strictEqual(ouvert.bilans[0].signataire, 'Paul MARTIN'); assert.strictEqual(ouvert.bilans[0].lienTuteur, '');
  assert.strictEqual(k.EUC_DEV598_enregistrer(saisie(k, { bilanId: r.bilanId })).inchange, true);
  const mod = k.EUC_DEV598_enregistrer(saisie(k, { bilanId: r.bilanId, bilan: 'A_RENFORCER' }));
  assert.strictEqual(mod.annulee, true); assert.strictEqual(row.Statut, 'A_VALIDER'); assert.ok(row.Validation_annulee_le);
  assert.match(row.Journal, /validation annulée/);
  assert.strictEqual(k.EUC_DEV598_resume_(k.__tables.EUC_BILANS_VISITE_APPRENTIS[0]).statut, 'A_VALIDER');
  assert.throws(() => k.EUC_DEV598_enregistrer(saisie(k, { t: 'p12.' + '0'.repeat(32) })), /invalide/);
});

test('DEV598 : remplaçant avec téléphone seul — validation acceptée, signalée à l’administration seule', () => {
  const k = contexte({ tables: tablesBase() });
  const r = k.EUC_DEV598_enregistrer(saisie(k, { modalite: 'VISIO' })), s = /s=([^&]+)/.exec(r.lienTuteur)[1], lu = k.EUC_DEV598_lireValidation({ s });
  const v = k.EUC_DEV598_valider({ s, empreinte: lu.bilan.empreinte, prenom: 'Luc', nom: 'DURAND', fonction: 'Peintre', telephone: '06 98 76 54 32', signature });
  assert.strictEqual(v.accuse, '');
  const row = k.__tables.EUC_BILANS_VISITE_APPRENTIS[0].fields;
  assert.strictEqual(row.Valide_via, 'QR_VISIO'); assert.strictEqual(row.Vigilance, 'SIGNATAIRE_DIFFERENT');
  assert.strictEqual(k.__mails.length, 1); assert.strictEqual(k.__mails[0].to, 'proprietaire@example.org');
  assert.match(k.__mails[0].subject, /^\[Vigilance\]/); assert.match(k.__mails[0].body, /Tuteur du contrat : Paul MARTIN/); assert.match(k.__mails[0].body, /Téléphone donné : 06 98 76 54 32/);
});

test('DEV598 : entretien téléphonique — lien envoyé au courriel dicté, validation « par lien »', () => {
  const k = contexte({ tables: tablesBase() });
  const r = k.EUC_DEV598_enregistrer(saisie(k, { modalite: 'TELEPHONE' }));
  assert.throws(() => k.EUC_DEV598_envoyerLien({ t: k.EUC_DEV598_jetonProf_(12), bilanId: r.bilanId, email: 'pas-une-adresse' }), /invalide/);
  assert.throws(() => k.EUC_DEV598_envoyerLien({ t: k.EUC_DEV598_jetonProf_(99), bilanId: r.bilanId, email: 'paul@martin.fr' }), /ne correspond pas/);
  k.EUC_DEV598_envoyerLien({ t: k.EUC_DEV598_jetonProf_(12), bilanId: r.bilanId, email: 'Paul@Martin.fr' });
  assert.strictEqual(k.__mails[0].to, 'paul@martin.fr'); assert.match(k.__mails[0].body, /page=validation-bilan-visite&s=s\d+\.\d{8}\.[0-9a-f]{32}&via=lien/);
  const row = k.__tables.EUC_BILANS_VISITE_APPRENTIS[0].fields; assert.strictEqual(row.Lien_envoye_a, 'paul@martin.fr');
  const s = /s=([^&]+)/.exec(k.__mails[0].body)[1], lu = k.EUC_DEV598_lireValidation({ s });
  k.EUC_DEV598_valider({ s, via: 'LIEN', empreinte: lu.bilan.empreinte, prenom: 'Paul', nom: 'Martin', email: 'paul@martin.fr', signature });
  assert.strictEqual(row.Valide_via, 'LIEN');
});

test('DEV598 : échéancier — un bilan vaut contact, état de validation et lien de fiche par ligne, lien dans le courriel du référent', () => {
  const k = contexte({ tables: tablesBase() });
  k.EUC_DEV597_tables_ = () => {};
  k.EUC_DEV598_enregistrer(saisie(k, { bilan: 'ALERTE' }));
  const d = k.EUC_DEV597_donnees_('2026-2027');
  const l = d.lignes.find(x => x.contratId === 12);
  assert.strictEqual(l.statut, 'FAIT'); assert.strictEqual(l.contact.mode, 'VISITE'); assert.match(l.contact.compteRendu, /en attente de validation du tuteur/);
  assert.match(l.lienFiche, /page=bilan-visite-apprenti&t=p12\./);
  assert.strictEqual(l.bilans[0].statut, 'A_VALIDER');
  assert.strictEqual(d.compteurs.aValider, 1); assert.strictEqual(d.compteurs.bilansAlerte, 1);
  const msg = k.EUC_DEV597_message_({ nom: 'M. Prof' }, [Object.assign({}, l, { echeance: '2026-10-30' })], '');
  assert.match(msg.corps, /Bilan de visite en ligne \(lien personnel, à garder\) : https:\/\/.*page=bilan-visite-apprenti/);
  assert.match(msg.corps, /scanne le QR code/); assert.doesNotMatch(msg.corps, /Merci de répondre à ce courriel/);
});

test('DEV598 : pages — routes, pages publiques du verrou, boutons protégés, signature tactile, QR, impression', () => {
  const routes = read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), gen = require(path.join(root, 'scripts/generate-acces-liste.js'));
  assert.match(routes, /case 'bilan-visite-apprenti':\s*return EUC_DEV598_afficherFiche\(e\);/);
  assert.match(routes, /case 'validation-bilan-visite':\s*return EUC_DEV598_afficherValidation\(e\);/);
  const pub = gen.PAGES_PUBLIQUES || read('scripts/generate-acces-liste.js');
  for (const p of ['Bilan_Visite_DEV598', 'Validation_Bilan_DEV598']) assert.ok(String(pub).includes(p), p);
  for (const t of ['EUC_DEV598_ouvrir', 'EUC_DEV598_enregistrer', 'EUC_DEV598_envoyerLien', 'occupe(bt,', 'class="spin"', 'new QRCode(', 'window.print()', 'annulera sa validation', 'localStorage']) assert.ok(pageProf.includes(t), t);
  for (const t of ['EUC_DEV598_lireValidation', 'EUC_DEV598_valider', 'touch-action:none', 'pointerdown', "bt.disabled=true", 'class="spin"', 'remplacez le tuteur habituel']) assert.ok(pageTuteur.includes(t), t);
  for (const t of ['EUC_DEV598_reglerCopie', 'Bilan de visite</a>', 'validé par ', 'à vérifier : ']) assert.ok(pageEch.includes(t), t);
  assert.match(pageProf, /cdnjs\.cloudflare\.com\/ajax\/libs\/qrcodejs\/1\.0\.0\/qrcode\.min\.js/);
});

test('DEV598 : valeurs injectées par contextual escaping (pas de JSON.stringify doublement guillemeté)', () => {
  for (const [nom, page] of [['prof', pageProf], ['tuteur', pageTuteur], ['echeancier', pageEch]]) assert.doesNotMatch(page, /<\?= *JSON\.stringify/, nom);
  assert.match(pageEch, /ANNEE=<\?= annee \?>/); assert.match(pageProf, /T=<\?= jeton \?>/);
});

console.log(`\n${n} tests DEV598 bilan de visite réussis.`);
