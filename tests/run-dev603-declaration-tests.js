'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const sources = ['EUC_SUIVI2_Moteur.js', 'EUC_DEV597_Echeancier.js', 'EUC_DEV598_BilanVisite.js', 'EUC_DEV602_Identites.js', 'EUC_DEV603_Declaration.js'].map(f => read('apps-script/' + f)).join('\n');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const J = x => JSON.parse(JSON.stringify(x));
const octets = buf => Array.from(buf).map(b => (b > 127 ? b - 256 : b));

function contexte(tables, opts) {
  opts = opts || {}; tables = tables || {};
  const props = { EUC_DEV598_SECRET: 'secret' }, cache = {}, mails = [], calls = [];
  const k = {
    String, Number, Array, Object, JSON, Date, Math, Error, RegExp, console: { log() {} }, encodeURIComponent,
    Utilities: { computeHmacSha256Signature: (t, s) => octets(crypto.createHmac('sha256', s).update(t, 'utf8').digest()), getUuid: () => crypto.randomUUID(), base64Encode: s => Buffer.from(s, 'utf8').toString('base64'), Charset: { UTF_8: 'UTF_8' }, formatDate: () => '20261020-101500' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: x => props[x] || null, setProperty: (x, v) => { props[x] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: x => cache[x] || null, put: (x, v) => { cache[x] = v; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    MailApp: { sendEmail: m => mails.push(m) },
    EUC_CONVENTION_ACCES_TABLE_: 'EUC_ACCES_FORMULAIRES_PFMP', EUC_V160_TABLE_: 'EUC_MIGRATION_JOTFORM_PFMP',
    EUC_ENT_validerSiret: v => /^\d{14}$/.test(String(v)) ? { valide: true, siret: String(v) } : { valide: false, message: 'SIRET : 14 chiffres attendus.' },
    EUC_ENT_rechercherSiret: () => opts.siret || { source: 'grist', entreprise: { raisonSociale: 'CARROSSERIE MARTIN', enseigne: 'Martin Auto', adresseComplete: '3 RUE DU PORT', codePostal: '06000', commune: 'NICE', etat: 'Actif' } },
    EUC_ENT_traiterReponseApiNavigateur: (json, s) => ({ entreprise: json && json.ok ? { raisonSociale: 'API SARL', adresseComplete: '1 AV', codePostal: '06100', commune: 'NICE', etat: 'Fermé' } : null }),
    EUC_CONVENTION_numeroEnregistrementV568_: a => String(a.Numero_enregistrement || '').trim() || 'PFMP-2026-' + String(a.id).padStart(6, '0'),
    EUC_ENT_grist(method, p, body) {
      calls.push({ method, p, body });
      const c = /^\/tables\/([^/?]+)\/columns$/.exec(p); if (c) return { columns: (opts.colonnes || Object.keys(k.EUC_DEV603_ligne_('X', 'A', { id: 1, nom: '', prenom: '' }, { id: 1, nom: '' }, { libelle: '' }, {}, {}, {}, ''))).map(id => ({ id })) };
      const m = /^\/tables\/([^/?]+)\/records(?:\?filter=(.*))?$/.exec(p); if (!m) return {};
      const t = tables[m[1]] = tables[m[1]] || [];
      if (method === 'get') { if (!m[2]) return { records: t }; const f = JSON.parse(decodeURIComponent(m[2])), cle = Object.keys(f)[0]; return { records: t.filter(r => f[cle].includes(cle === 'id' ? r.id : r.fields[cle])) }; }
      if (method === 'post') { body.records.forEach(r => t.push({ id: t.length + 100, fields: Object.assign({}, r.fields) })); return {}; }
      if (method === 'patch') { body.records.forEach(r => Object.assign(t.find(x => x.id === r.id).fields, r.fields)); return {}; }
      return {};
    }
  };
  vm.createContext(k); vm.runInContext(sources, k);
  k.EUC_SUIVI2_aujourdhui_ = () => '2026-10-20';
  k.EUC_SUIVI2_modele_ = () => ({ annee: '2026-2027', classes: [
    { id: 10, nom: '1MVA1', modeApprentissage: '', periodes: [{ id: 100, libelle: 'PFMP 1', debut: '2026-11-02', fin: '2026-11-27' }, { id: 101, libelle: 'Appel', suivi: 'APPEL' }], eleves: [{ id: 7, libelle: 'DUPONT Léa' }] },
    { id: 11, nom: '1CAPP', modeApprentissage: 'CLASSE_ENTIERE', periodes: [{ id: 102, libelle: 'P' }], eleves: [{ id: 8 }] },
    { id: 12, nom: '2MVA', modeApprentissage: '', periodes: [], eleves: [{ id: 9 }] }] });
  Object.assign(k, { __mails: mails, __calls: calls, __cache: cache, __props: props });
  return k;
}
function base() {
  return { EUC_ELEVES_PFMP: [{ id: 7, fields: { Nom: 'Dupont', Prenom: 'Léa', Date_naissance: 1209600000, Email_eleve: 'lea@ex.org' } }, { id: 8, fields: { Nom: 'Dupont', Prenom: 'Léa', Date_naissance: 1209600000 } }],
    EUC_ACCES_FORMULAIRES_PFMP: [], EUC_MIGRATION_JOTFORM_PFMP: [] };
}
/* Réponse au captcha : relue depuis la signature (le test connaît le secret). */
function resoudre(k, jeton) {
  const m = /^c(\d+)\.([0-9a-f]{16})\./.exec(jeton), al = 'ABCDEFGHJKMNPRSTUVWXYZ23456789';
  const sig = c => k.EUC_DEV598_sig_('C|' + c + '|' + m[2] + '|' + m[1]);
  /* Recherche bornée : le test régénère un code connu plutôt que de deviner. */
  return { m, sig, al };
}
function captchaConnu(k, code, ilya) {
  const emis = Date.now() - (ilya == null ? 10000 : ilya), nonce = '0123456789abcdef'.split('').sort(() => Math.random() - .5).join('');
  return 'c' + emis + '.' + nonce + '.' + k.EUC_DEV598_sig_('C|' + code + '|' + nonce + '|' + emis);
}
const resp = { civilite: 'M.', prenom: 'paul', nom: 'martin', fonction: 'Gérant', telephone: '04 93 00 00 00', courriel: 'paul@martin.fr' };

test('DEV603 : captcha — image tracée sans le code en clair, bonne réponse acceptée une seule fois, trop rapide / expirée / fausse refusées', () => {
  const k = contexte(base());
  const c = k.EUC_DEV603_captcha(), svg = Buffer.from(c.image.split(',')[1], 'base64').toString('utf8');
  assert.match(svg, /^<svg/); assert.doesNotMatch(svg, /<text/); assert.match(svg, /<polyline/);
  assert.match(c.jeton, /^c\d+\.[0-9a-f]{16}\.[0-9a-f]{32}$/);
  const j = captchaConnu(k, 'AB2C9');
  assert.throws(() => k.EUC_DEV603_verifierCaptcha_(j, 'AB2C8'), /incorrect/);
  k.EUC_DEV603_verifierCaptcha_(j, ' ab2c9 ');
  assert.throws(() => k.EUC_DEV603_verifierCaptcha_(j, 'AB2C9'), /déjà utilisé/);
  assert.throws(() => k.EUC_DEV603_verifierCaptcha_(captchaConnu(k, 'AB2C9', 1000), 'AB2C9'), /trop rapide/);
  assert.throws(() => k.EUC_DEV603_verifierCaptcha_(captchaConnu(k, 'AB2C9', 700000), 'AB2C9'), /expiré/);
  for (const ch of 'ABCDEFGHJKMNPRSTUVWXYZ23456789') assert.ok(k.EUC_DEV603_GLYPHES_[ch], ch);
});

test('DEV603 : identification — classes PFMP seulement, élève reconnu par nom, prénom et date de naissance, case piège, tentatives limitées', () => {
  const k = contexte(base());
  assert.deepStrictEqual(J(k.EUC_DEV603_classes().classes), [{ id: 10, nom: '1MVA1' }]);
  const q = x => Object.assign({ classeId: 10, nom: 'DUPONT', prenom: 'lea', naissance: '2008-05-01', captcha: 'ZZZZZ', captchaJeton: captchaConnu(k, 'ZZZZZ') }, x);
  const r = k.EUC_DEV603_identifier(q());
  assert.strictEqual(r.eleve, 'Léa DUPONT'); assert.deepStrictEqual(J(r.periodes).map(p => p.id), [100]);
  assert.deepStrictEqual(J(k.EUC_DEV603_lireJeton_(r.jeton)), { eleveId: 7, classeId: 10 });
  assert.throws(() => k.EUC_DEV603_identifier(q({ site: 'http://spam' })), /refusé/);
  for (let i = 0; i < 6; i++) assert.throws(() => k.EUC_DEV603_identifier(q({ naissance: '2008-05-02', captchaJeton: captchaConnu(k, 'ZZZZZ') })), /ne trouvons pas/);
  assert.throws(() => k.EUC_DEV603_identifier(q({ captchaJeton: captchaConnu(k, 'ZZZZZ') })), /Trop de tentatives/);
  assert.throws(() => k.EUC_DEV603_lireJeton_(r.jeton.replace(/^e7/, 'e8')), /invalide/);
});

test('DEV603 : dépôt — SIRET revérifié, noms mis en forme (Prénom, NOM), ligne au format de l’import JotForm, élève déjà rapproché, numéro de dépôt', () => {
  const t = base(), k = contexte(t);
  const jeton = k.EUC_DEV603_jeton_(7, 10, Date.now() + 3600000);
  const d = k.EUC_DEV603_deposer({ jeton, periodeId: 100, siret: '73282932000074', responsable: resp, tuteurEstResponsable: false, tuteur: { civilite: 'Mme', prenom: 'anne-sophie', nom: "d'arcy", fonction: 'Cheffe d’atelier', telephone: '0611223344', courriel: 'as@martin.fr' } });
  assert.strictEqual(d.numero, 'PFMP-2026-S0001'); assert.strictEqual(d.entreprise, 'CARROSSERIE MARTIN');
  const f = t.EUC_MIGRATION_JOTFORM_PFMP[0].fields, raw = JSON.parse(f.Raw_JSON);
  assert.strictEqual(f.Submission_ID, 'SECOURS-PFMP-2026-S0001'); assert.strictEqual(f.Eleve_match_id, 7); assert.strictEqual(f.Classe_match_id, 10);
  assert.strictEqual(f.SIRET_statut, 'VERIFIE'); assert.strictEqual(f.Decision, 'A_VALIDER'); assert.strictEqual(f.Date_debut_brut, '2026-11-02');
  assert.strictEqual(f.Nom_tuteur, "D'ARCY"); assert.strictEqual(raw['Prénom du tuteur'], 'Anne-Sophie'); assert.strictEqual(raw['Civilité du tuteur'], 'Mme');
  assert.strictEqual(raw['Nom du responsable'], 'MARTIN'); assert.strictEqual(raw['Prénom du responsable'], 'Paul'); assert.strictEqual(f.Email_eleve, 'lea@ex.org');
  /* Deuxième envoi pour la même période : le dépôt en attente est remplacé, même numéro. */
  const d2 = k.EUC_DEV603_deposer({ jeton, periodeId: 100, siret: '73282932000074', responsable: resp, tuteurEstResponsable: true });
  assert.strictEqual(d2.numero, 'PFMP-2026-S0001'); assert.strictEqual(d2.remplace, true); assert.strictEqual(t.EUC_MIGRATION_JOTFORM_PFMP.length, 1); assert.strictEqual(t.EUC_MIGRATION_JOTFORM_PFMP[0].fields.Nom_tuteur, 'MARTIN');
  /* Une fois validé, un nouvel envoi crée un nouveau dépôt. */
  t.EUC_MIGRATION_JOTFORM_PFMP[0].fields.Decision = 'VALIDEE';
  assert.strictEqual(k.EUC_DEV603_deposer({ jeton, periodeId: 100, siret: '73282932000074', responsable: resp, tuteurEstResponsable: true }).numero, 'PFMP-2026-S0002');
});

test('DEV603 : refus — contrôle des noms, téléphone, période inconnue, SIRET faux ou introuvable, convention déjà enregistrée', () => {
  const t = base(), k = contexte(t), jeton = k.EUC_DEV603_jeton_(7, 10, Date.now() + 3600000);
  const dep = x => () => k.EUC_DEV603_deposer(Object.assign({ jeton, periodeId: 100, siret: '73282932000074', responsable: resp, tuteurEstResponsable: true }, x));
  assert.throws(dep({ responsable: Object.assign({}, resp, { nom: 'Chef' }) }), /n’est pas un vrai nom/);
  assert.throws(dep({ responsable: Object.assign({}, resp, { civilite: '' }) }), /civilité/);
  assert.throws(dep({ responsable: Object.assign({}, resp, { telephone: '0493' }) }), /10 chiffres/);
  assert.throws(dep({ periodeId: 101 }), /période/);
  assert.throws(dep({ siret: '123' }), /14 chiffres/);
  const k2 = contexte(base(), { siret: { source: 'api_navigateur', url: 'u' } }), jeton2 = k2.EUC_DEV603_jeton_(7, 10, Date.now() + 3600000);
  assert.throws(() => k2.EUC_DEV603_deposer({ jeton: jeton2, periodeId: 100, siret: '73282932000074', responsable: resp, tuteurEstResponsable: true, reponseApi: {} }), /introuvable/);
  const ok = k2.EUC_DEV603_deposer({ jeton: jeton2, periodeId: 100, siret: '73282932000074', responsable: resp, tuteurEstResponsable: true, reponseApi: { ok: 1 } });
  assert.strictEqual(ok.entreprise, 'API SARL');
  t.EUC_ACCES_FORMULAIRES_PFMP.push({ id: 55, fields: { Eleve: 7, Periode: 100, Entreprise_siret: '73282932000074' } });
  assert.throws(dep({}), /déjà enregistrée pour cette période \(PFMP-2026-000055\)/);
});

test('DEV603 : après validation — numéro de convention écrit et envoyé à l’élève, uniquement pour le formulaire de secours', () => {
  const t = base(), k = contexte(t);
  t.EUC_MIGRATION_JOTFORM_PFMP.push({ id: 1, fields: { Submission_ID: 'SECOURS-PFMP-2026-S0003', Email_eleve: 'lea@ex.org', Prenom_eleve: 'Léa', Periode_numero: 'PFMP 1', Raison_sociale_officielle: 'CARROSSERIE MARTIN' } }, { id: 2, fields: { Submission_ID: '6123', Email_eleve: 'x@ex.org' } });
  t.EUC_ACCES_FORMULAIRES_PFMP.push({ id: 123, fields: { Annee_scolaire: '2026-2027' } }, { id: 124, fields: {} });
  assert.strictEqual(k.EUC_DEV603_apresValidation_([{ rowId: 1, accessId: 123 }, { rowId: 2, accessId: 124 }]), 1);
  assert.strictEqual(t.EUC_ACCES_FORMULAIRES_PFMP[0].fields.Numero_enregistrement, 'PFMP-2026-S0003');
  assert.strictEqual(k.__mails.length, 1); assert.strictEqual(k.__mails[0].to, 'lea@ex.org'); assert.match(k.__mails[0].subject, /validée — n° PFMP-2026-S0003/); assert.match(k.__mails[0].body, /\(inchangé\) : PFMP-2026-S0003/);
});

test('DEV603 : branchements — route publique, verrou, validation JotForm, accueil admin, page (étapes, captcha, case piège, boutons protégés), NOM en capitales du QR', () => {
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'declaration-entreprise':\s*return EUC_DEV603_afficher\(e\);/);
  assert.ok(read('scripts/generate-acces-liste.js').includes("'Declaration_Entreprise_DEV603'"));
  assert.match(read('apps-script/EUC_PFMP_DEV466_JotFormReliable.js'), /EUC_DEV322_patchBufferValidated_\(items\.map\(function\(x\)\{return x\.rowId;\}\),ctx\);\n[^\n]*\n    if\(typeof EUC_DEV603_apresValidation_==='function'\)EUC_DEV603_apresValidation_\(items\);/);
  const admin = read('apps-script/Admin_PFMP.html');
  assert.match(admin, /page=migration-jotform-pfmp">Soumissions reçues/); assert.match(admin, /page=declaration-entreprise">Formulaire de secours/);
  const page = read('apps-script/Declaration_Entreprise_DEV603.html');
  for (const t of ['EUC_DEV603_classes', 'EUC_DEV603_identifier', 'EUC_DEV603_deposer', 'EUC_ENT_rechercherSiret', 'EUC_DEV603_traiterApi', 'id="site"', 'class="piege"', 'id="captchaImg"', 'Nouveau code', 'occupe(b,', 'class="spin"', 'AbortController', "toLocaleUpperCase('fr-FR')"]) assert.ok(page.includes(t), t);
  assert.doesNotMatch(page, /<\?= *JSON\.stringify/);
  const qr = read('apps-script/EUC_CONVENTION_PFMP_QRPublicV85.gs');
  assert.match(qr, /respNom=String\(respNom\)\.toLocaleUpperCase\('fr-FR'\);tNom=String\(tNom\)\.toLocaleUpperCase\('fr-FR'\);/);
  assert.match(read('apps-script/Identites_Contacts_DEV602.html'), /\['responsableNom','tuteurNom'\]\.forEach/);
});

test('DEV603 : mode essai 24 h — identité d’essai reconnue dans toute classe, dépôt ESSAI non rattaché et non validable, compteur intact, expiration', () => {
  const t = base(), k = contexte(t);
  k.EUC_SUIVI2_exigerAdmin_ = () => ({ email: 'admin@example.org' });
  const q = { classeId: 10, nom: 'essai', prenom: 'FORMULAIRE', naissance: '2000-01-01', captcha: 'ZZZZZ' };
  assert.throws(() => k.EUC_DEV603_identifier(Object.assign({}, q, { captchaJeton: captchaConnu(k, 'ZZZZZ') })), /ne trouvons pas/);
  const a = k.EUC_DEV603_activerEssai(); assert.strictEqual(a.naissance, '01/01/2000');
  const r = k.EUC_DEV603_identifier(Object.assign({}, q, { captchaJeton: captchaConnu(k, 'ZZZZZ') }));
  assert.strictEqual(r.essai, true); assert.deepStrictEqual(J(k.EUC_DEV603_lireJeton_(r.jeton)), { eleveId: 0, classeId: 10 });
  const d = k.EUC_DEV603_deposer({ jeton: r.jeton, periodeId: 100, siret: '73282932000074', responsable: resp, tuteurEstResponsable: true });
  assert.strictEqual(d.essai, true); assert.match(d.numero, /^ESSAI-/);
  const f = t.EUC_MIGRATION_JOTFORM_PFMP[0].fields;
  assert.strictEqual(f.Decision, 'ESSAI'); assert.strictEqual(f.Eleve_match_id, 0); assert.strictEqual(f.Niveau_controle, 'ROUGE'); assert.match(f.Alertes, /ne pas valider/);
  assert.strictEqual(k.__props['EUC_DEV603_COMPTEUR_2026-2027'], undefined);
  k.__props.EUC_DEV603_ESSAI = JSON.stringify({ nom: 'ESSAI', prenom: 'Formulaire', naissance: '2000-01-01', jusqua: Date.now() - 1 });
  assert.throws(() => k.EUC_DEV603_identifier(Object.assign({}, q, { captchaJeton: captchaConnu(k, 'ZZZZZ') })), /ne trouvons pas/);
  assert.match(read('apps-script/Admin_PFMP.html'), /EUC_DEV603_activerEssai\(\)/);
});

test('DEV604 : classe de test « TEST … » — reconnue, écartée des effectifs, du suivi des professeurs, de la carte et des books, gardée pour le formulaire de secours', () => {
  const m = read('apps-script/EUC_SUIVI2_Moteur.js'), k = { String, RegExp }; vm.createContext(k); vm.runInContext(/function EUC_SUIVI2_classeTest_[^\n]*/.exec(m)[0], k);
  for (const x of ['TEST PFMP', 'test', 'TEST-PFMP', ' Test 1']) assert.strictEqual(k.EUC_SUIVI2_classeTest_(x), true, x);
  for (const x of ['TSEC', 'TESTEUR', '1MVA1', 'TPEEB', '']) assert.strictEqual(k.EUC_SUIVI2_classeTest_(x), false, x);
  assert.match(m, /test: EUC_SUIVI2_classeTest_\(nom\)/);
  assert.match(read('apps-script/EUC_DEV592_Effectifs.js'), /\(m\.classes \|\| \[\]\)\.forEach\(function\(c\) \{\n    if \(c\.test\) return;/);
  assert.doesNotMatch(read('apps-script/EUC_SUIVI2_Enseignants.js'), /!c\.test/); /* visible dans le suivi pour les essais */
  const carte = read('apps-script/EUC_DEV583_CarteSuivi.js'); assert.match(carte, /if \(c\.test\) return;/); assert.match(carte, /c\.periodes\.length && !c\.test/);
  assert.match(read('apps-script/EUC_PFMP_DEV538_BookQuotas.js'), /details\.forEach\(function\(d\)\{if\(typeof EUC_SUIVI2_classeTest_==='function'&&EUC_SUIVI2_classeTest_\(/);
  assert.doesNotMatch(read('apps-script/EUC_DEV603_Declaration.js'), /c\.test/);
});

test('DEV604 : jeu de test — aperçu puis création (classe TEST, période PFMP de l’année, élève), formats Grist respectés, sans doublon', () => {
  const tables = { Annees_Scolaires: [{ id: 3, fields: { Code: '2026-2027' } }], Types_Planning: [{ id: 9, fields: { Type: 'PFMP' } }], Classes: [], Planning_Periodes: [], EUC_ELEVES_PFMP: [] };
  const types = { Classes: { Nom: 'Text', Actif: 'Bool', Etab: 'Choice', Code_import: 'Text' }, Planning_Periodes: { Libelle_periode: 'Text', Classe_PFMP: 'Ref:Classes', Commentaire: 'Text', Type: 'Ref:Types_Planning', Date_debut: 'Date', Date_fin: 'Date', Annee_scolaire: 'Ref:Annees_Scolaires', Classes_concernees: 'RefList:Classes', Actif: 'Bool' },
    EUC_ELEVES_PFMP: { Nom: 'Text', Prenom: 'Text', Date_naissance: 'Date', Email_eleve: 'Text', Courriel: 'Text*', Classe: 'Ref:Classes', Annee_scolaire: 'Text', Actif: 'Bool', Present_dernier_import: 'Bool' } };
  const k = { String, Number, Array, Object, JSON, Date, Math, Error, RegExp, CacheService: { getScriptCache: () => ({ remove() {} }) },
    EUC_ENT_grist(m, p, body) { const c = /^\/tables\/([^/]+)\/columns$/.exec(p); if (c) return { columns: Object.keys(types[c[1]] || {}).map(id => { const ty = types[c[1]][id]; return { id, fields: /\*$/.test(ty) ? { type: 'Text', isFormula: true, formula: '$Email_eleve' } : { type: ty } }; }) };
      const r = /^\/tables\/([^/]+)\/records$/.exec(p), t = tables[r[1]]; if (m === 'get') return { records: t };
      if (m === 'post') return { records: body.records.map(x => { const id = t.length + 1; t.push({ id, fields: x.fields }); return { id }; }) };
      body.records.forEach(x => Object.assign(t.find(y => y.id === x.id).fields, x.fields)); return {}; } };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_SUIVI2_Moteur.js') + '\n' + read('apps-script/EUC_DEV604_JeuTest.js'), k);
  k.EUC_SUIVI2_exigerAdmin_ = () => ({ email: 'admin@example.org' }); k.EUC_SUIVI2_aujourdhui_ = () => '2026-10-20';
  const q = { prenom: 'René', nom: 'Test', email: 'Admin@Example.org', naissance: '2008-01-01', debut: '2026-11-02', fin: '2026-11-27' };
  const a = k.EUC_DEV604_jeuTest(q);
  assert.strictEqual(a.apercu, true); assert.strictEqual(a.classe.existe, false); assert.strictEqual(tables.Classes.length, 0);
  assert.throws(() => k.EUC_DEV604_jeuTest(Object.assign({}, q, { classe: '1MVA1' })), /commencer par « TEST »/);
  const r = k.EUC_DEV604_jeuTest(Object.assign({}, q, { confirmation: 'CREER' }));
  assert.strictEqual(r.apercu, false);
  assert.deepStrictEqual(J(tables.Classes[0].fields), { Nom: 'TEST PFMP', Actif: true, Etab: 'LP', Code_import: 'TEST PFMP' });
  const p = tables.Planning_Periodes[0].fields;
  assert.deepStrictEqual(J(p.Classes_concernees), ['L', 1]); assert.strictEqual(p.Classe_PFMP, 1); assert.strictEqual(p.Commentaire, 'Période de test (DEV604)'); assert.strictEqual(p.Type, 9); assert.strictEqual(p.Annee_scolaire, 3); assert.strictEqual(p.Date_debut, Date.parse('2026-11-02T00:00:00Z') / 1000); assert.strictEqual(p.Libelle_periode, 'PFMP test');
  const e = tables.EUC_ELEVES_PFMP[0].fields;
  assert.strictEqual(e.Nom, 'TEST'); assert.strictEqual(e.Email_eleve, 'admin@example.org'); assert.strictEqual(e.Classe, 1); assert.strictEqual(e.Annee_scolaire, '2026-2027'); assert.strictEqual(e.Present_dernier_import, true); assert.strictEqual('Courriel' in e, false);
  const r2 = k.EUC_DEV604_jeuTest(Object.assign({}, q, { fin: '2026-12-04', confirmation: 'CREER' }));
  assert.strictEqual(r2.classe.existe, true); assert.strictEqual(r2.periode.existe, true); assert.strictEqual(r2.eleve.existe, true);
  assert.strictEqual(tables.Classes.length, 1); assert.strictEqual(tables.Planning_Periodes.length, 1); assert.strictEqual(tables.EUC_ELEVES_PFMP.length, 1);
  assert.strictEqual(tables.Planning_Periodes[0].fields.Date_fin, Date.parse('2026-12-04T00:00:00Z') / 1000);
  tables.EUC_PROFESSEURS_PFMP = []; tables.EUC_CLASSES_PROFESSEURS_PFMP = [{ id: 1, fields: { Classe: 1, Professeur: 0, Actif: false } }];
  types.EUC_PROFESSEURS_PFMP = { Civilite: 'Text', Prenom: 'Text', Nom: 'Text', Email: 'Text', Actif: 'Bool' };
  types.EUC_CLASSES_PROFESSEURS_PFMP = { Classe: 'Ref:Classes', Professeur: 'Ref:EUC_PROFESSEURS_PFMP', Role: 'Text', Actif: 'Bool', Annee_scolaire: 'Text', Retire_le: 'Text' };
  const r3 = k.EUC_DEV604_jeuTest(Object.assign({}, q, { ppEmail: 'Prof.Test@Example.org', confirmation: 'CREER' }));
  assert.strictEqual(r3.pp.id, 1); assert.strictEqual(tables.EUC_PROFESSEURS_PFMP[0].fields.Email, 'prof.test@example.org'); assert.strictEqual(tables.EUC_PROFESSEURS_PFMP[0].fields.Nom, 'TEST');
  assert.strictEqual(tables.EUC_CLASSES_PROFESSEURS_PFMP.length, 1);
  assert.deepStrictEqual(J(tables.EUC_CLASSES_PROFESSEURS_PFMP[0].fields), { Classe: 1, Professeur: 1, Actif: true, Role: 'PROFESSEUR_PRINCIPAL', Annee_scolaire: '2026-2027', Retire_le: '' });
  k.EUC_DEV604_jeuTest(Object.assign({}, q, { ppEmail: 'prof.test@example.org', confirmation: 'CREER' }));
  assert.strictEqual(tables.EUC_PROFESSEURS_PFMP.length, 1); assert.strictEqual(tables.EUC_CLASSES_PROFESSEURS_PFMP.length, 1);
  assert.doesNotMatch(read('apps-script/EUC_DEV604_JeuTest.js'), /@gmail|TARAYRE/i);
  assert.match(read('apps-script/Admin_PFMP.html'), /EUC_DEV604_jeuTest\(q\(conf\)\)/);
});

test('DEV605 : téléphone et courriel — France, Monaco (ou France), étranger ; mise en forme ; fautes de frappe ; accusé au dépôt ; demande d’aide (SIRET, Monaco, étranger) envoyée au bureau G205', () => {
  const t = base(), k = contexte(t), T = (v, p) => J(k.EUC_DEV603_telephone_(v, p));
  assert.deepStrictEqual(T('0610132014', 'FR'), { ok: true, format: '06 10 13 20 14' });
  assert.deepStrictEqual(T('+33 4.93.00.00.00', 'FR'), { ok: true, format: '04 93 00 00 00' });
  assert.strictEqual(T('0610132014141104', 'FR').ok, false); assert.match(T('0610132014141104', 'FR').erreur, /10 chiffres/);
  assert.strictEqual(T('+377 93 15 00 00', 'FR').ok, false);
  assert.deepStrictEqual(T('+377 93 15 00 00', 'MC'), { ok: true, format: '+377 93 15 00 00' });
  assert.deepStrictEqual(T('00377 612345678', 'MC'), { ok: true, format: '+377 6 12 34 56 78' });
  assert.deepStrictEqual(T('06 12 34 56 78', 'MC'), { ok: true, format: '06 12 34 56 78' });
  assert.deepStrictEqual(T('+39 0184 123456', 'AUTRE'), { ok: true, format: '+390184123456' });
  assert.strictEqual(T('0184 123456', 'AUTRE').ok, false);
  assert.strictEqual(k.EUC_DEV603_courriel_('paul@martin.fr').ok, true);
  assert.match(k.EUC_DEV603_courriel_('rudy@gmail.con').erreur, /gmail\.com/);
  assert.match(k.EUC_DEV603_courriel_('rudy@gmail').erreur, /invalide/);
  const jeton = k.EUC_DEV603_jeton_(7, 10, Date.now() + 3600000);
  assert.throws(() => k.EUC_DEV603_deposer({ jeton, periodeId: 100, siret: '73282932000074', responsable: Object.assign({}, resp, { telephone: '0610132014141104' }), tuteurEstResponsable: true }), /Responsable de l’entreprise : numéro français/);
  k.__props.EUC_DEV598_COPIE_VALIDATIONS = 'bureau@example.org';
  const d = k.EUC_DEV603_deposer({ jeton, periodeId: 100, siret: '73282932000074', responsable: resp, tuteurEstResponsable: true });
  assert.strictEqual(t.EUC_MIGRATION_JOTFORM_PFMP[0].fields.Telephone_tuteur, '04 93 00 00 00');
  assert.strictEqual(d.courriel, 'l…@ex.org');
  assert.deepStrictEqual(k.__mails.map(m => m.to), ['lea@ex.org', 'bureau@example.org']);
  assert.match(k.__mails[0].subject, /numéro d’enregistrement PFMP-2026-S0001/); assert.match(k.__mails[0].body, /recopie-le sur ta convention/); assert.match(k.__mails[1].subject, /^\[Dépôt\] PFMP-2026-S0001 — Léa DUPONT \(1MVA1\)/);
  const a = k.EUC_DEV603_signalerProbleme({ jeton, periodeId: 100, entreprise: 'Garage Rives', ville: 'Monaco', pays: 'MC', telephone: '+377 93 15 00 00', courriel: 'contact@rives.mc', message: 'Pas de SIRET' });
  assert.match(a.bureau, /G205/); assert.strictEqual(a.numero, 'PFMP-2026-S0002');
  const f = t.EUC_MIGRATION_JOTFORM_PFMP[1].fields;
  assert.strictEqual(f.Decision, 'A_CONTROLER'); assert.strictEqual(f.SIRET_statut, 'A_CONTROLER'); assert.strictEqual(f.Niveau_controle, 'ROUGE'); assert.match(f.Alertes, /Monaco/); assert.match(f.Alertes, /G205/); assert.strictEqual(f.Pays_officiel, 'MC');
  assert.match(k.__mails[2].body, /bureau G205/); assert.match(k.__mails[3].subject, /^\[À traiter au bureau\] PFMP-2026-S0002/);
  assert.throws(() => k.EUC_DEV603_signalerProbleme({ jeton, periodeId: 100, entreprise: 'X', ville: 'Y', pays: 'FR', telephone: '12' }), /numéro français/);
  assert.throws(() => k.EUC_DEV603_signalerProbleme({ jeton, periodeId: 100, entreprise: '', ville: '' }), /nom de l’entreprise/);
  const page = read('apps-script/Declaration_Entreprise_DEV603.html');
  for (const x of ['EUC_DEV603_signalerProbleme', 'Mon SIRET ne fonctionne pas', 'value="MC"', 'surveiller(', 'mailErr(']) assert.ok(page.includes(x), x);
});

test('DEV605 : copies selon « Destinataires & envois » — dépôts et validations des tuteurs par rubrique cochée, secours sinon ; page et accueil', () => {
  const k = contexte(base());
  k.EUC_V158_TABLE_ = 'EUC_DESTINATAIRES_ENVOIS_PFMP';
  let lignes = [{ Actif: true, Email: 'Bureau@Lycee.fr', DEPOTS_CONVENTIONS: true }, { Actif: true, Email: 'ddfpt@lycee.fr', DEPOTS_CONVENTIONS: true, VALIDATIONS_TUTEURS: true }, { Actif: false, Email: 'ancien@lycee.fr', DEPOTS_CONVENTIONS: true }, { Actif: true, Email: 'pasune', VALIDATIONS_TUTEURS: true }];
  k.EUC_IMPORT_lireRecords_ = () => lignes;
  assert.strictEqual(k.EUC_DEV598_copie_('DEPOTS_CONVENTIONS'), 'bureau@lycee.fr,ddfpt@lycee.fr');
  assert.strictEqual(k.EUC_DEV598_copie_(), 'ddfpt@lycee.fr');
  lignes = []; k.__props.EUC_DEV598_COPIE_VALIDATIONS = 'secours@lycee.fr';
  assert.strictEqual(k.EUC_DEV598_copie_('DEPOTS_CONVENTIONS'), 'secours@lycee.fr');
  assert.match(read('apps-script/EUC_DEV603_Declaration.js'), /EUC_DEV598_copie_\('DEPOTS_CONVENTIONS'\)/);
  const dest = read('apps-script/EUC_SUIVI_PFMP_DestinatairesV158.gs'), page = read('apps-script/Destinataires_Envois_PFMP_V158.html'), admin = read('apps-script/Admin_PFMP.html');
  assert.match(dest, /c\('DEPOTS_CONVENTIONS','Dépôts et numéros de convention','Bool'\)/); assert.match(dest, /VALIDATIONS_TUTEURS:x\.validations===true/);
  for (const x of ['class="depots"', 'class="validations"', 'Dépôts et numéros de convention</th>', 'Validations des tuteurs</th>']) assert.ok(page.includes(x), x);
  const glob = admin.indexOf('<h2>Paramétrage global</h2>'), sco = admin.indexOf('<h3>Paramétrage scolaires</h3>'), lien = admin.indexOf('page=destinataires-envois-pfmp');
  assert.ok(lien > glob && admin.indexOf('page=destinataires-envois-pfmp', lien + 1) < 0 && !(lien > sco && lien < glob));
});

test('DEV605 : copie au professeur principal de la classe (ligne automatique cochée) et au BFE', () => {
  const t = base(), k = contexte(t);
  t.EUC_PROFESSEURS_PFMP = [{ id: 5, fields: { Email: 'PP.mva@ac-nice.fr' } }, { id: 6, fields: { Email: 'autre@ac-nice.fr' } }];
  const modele = k.EUC_SUIVI2_modele_(); modele.classes[0].ppIds = [5]; k.EUC_SUIVI2_modele_ = () => modele;
  k.EUC_V158_TABLE_ = 'EUC_DESTINATAIRES_ENVOIS_PFMP';
  let lignes = [{ Code: 'BUREAU_ENTREPRISES', Actif: true, Email: 'bfe@lycee.fr', DEPOTS_CONVENTIONS: true }, { Code: 'PROFESSEUR_PRINCIPAL', Actif: true, Email: '', DEPOTS_CONVENTIONS: true }];
  k.EUC_IMPORT_lireRecords_ = () => lignes;
  const jeton = k.EUC_DEV603_jeton_(7, 10, Date.now() + 3600000);
  k.EUC_DEV603_deposer({ jeton, periodeId: 100, siret: '73282932000074', responsable: resp, tuteurEstResponsable: true });
  assert.deepStrictEqual(k.__mails.map(m => m.to), ['lea@ex.org', 'bfe@lycee.fr,pp.mva@ac-nice.fr']);
  lignes[1].DEPOTS_CONVENTIONS = false; k.__mails.length = 0;
  k.EUC_DEV603_deposer({ jeton, periodeId: 100, siret: '73282932000074', responsable: resp, tuteurEstResponsable: true });
  assert.deepStrictEqual(k.__mails.map(m => m.to), ['lea@ex.org', 'bfe@lycee.fr']);
  assert.match(read('apps-script/EUC_SUIVI_PFMP_DestinatairesV158.gs'), /code:'PROFESSEUR_PRINCIPAL',fonction:'Professeur principal de la classe \(automatique\)'/);
  assert.match(read('apps-script/EUC_SUIVI2_Moteur.js'), /c\.ppIds = c\.ppIds \|\| \[\]/);
});

console.log(`\n${n} tests DEV603 formulaire de secours réussis.`);
