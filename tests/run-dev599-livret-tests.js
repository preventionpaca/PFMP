'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const sources = ['EUC_SUIVI2_Moteur.js', 'EUC_DEV597_Echeancier.js', 'EUC_DEV598_BilanVisite.js', 'EUC_DEV599_Livret.js', 'EUC_SUIVI_PFMP_DestinatairesV158.gs'].map(f => read('apps-script/' + f)).join('\n');
const pageLivret = read('apps-script/Livret_Apprenti_DEV599.html'), pageVal = read('apps-script/Validation_Livret_DEV599.html'), pageEch = read('apps-script/Echeancier_Apprentis_DEV597.html'), pageDest = read('apps-script/Destinataires_Envois_PFMP_V158.html');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const octets = buf => Array.from(buf).map(b => (b > 127 ? b - 256 : b));
const signature = 'data:image/png;base64,' + 'A'.repeat(600);

function contexte(opts) {
  opts = opts || {};
  const props = { EUC_DEV598_SECRET: 'secret-de-test', EUC_DEV598_COPIE_VALIDATIONS: 'bureau@example.org' }, mails = [], tables = opts.tables || {}, drive = {};
  const k = {
    String, Number, Array, Object, JSON, Date, Math, Error, RegExp, console: { log() {} }, encodeURIComponent,
    Utilities: {
      computeHmacSha256Signature: (t, s) => octets(crypto.createHmac('sha256', s).update(t, 'utf8').digest()),
      computeDigest: (a, t) => octets(crypto.createHash('sha256').update(t, 'utf8').digest()),
      DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' }, getUuid: () => 'uuid',
      base64Decode: s => Array.from(Buffer.from(s, 'base64')), base64Encode: b => Buffer.from(b).toString('base64'),
      newBlob: (bytes, type, name) => ({ bytes, type, name })
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: x => props[x] || null, setProperty: (x, v) => { props[x] = v; } }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/ID/exec' }) },
    CacheService: { getScriptCache: () => ({ get: () => '1', put() {} }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: m => mails.push(m) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'proprietaire@example.org' }) },
    DriveApp: { getFileById: id => { if (!drive[id]) throw new Error('absent'); return { getBlob: () => ({ getBytes: () => drive[id].bytes, name: drive[id].name }), setTrashed() { drive[id].corbeille = true; } }; } },
    EUC_ENT_grist(method, p, body) {
      const m = /^\/tables\/([^/?]+)\/records(?:\?filter=(.*))?$/.exec(p);
      if (!m) return {};
      const t = tables[m[1]] = tables[m[1]] || [];
      if (method === 'get') {
        if (!m[2]) return { records: t };
        const f = JSON.parse(decodeURIComponent(m[2])), cle = Object.keys(f)[0];
        return { records: t.filter(r => f[cle].includes(cle === 'id' ? r.id : r.fields[cle])) };
      }
      if (method === 'post') return { records: body.records.map(r => { const id = t.length + 1; t.push({ id, fields: Object.assign({}, r.fields) }); return { id }; }) };
      if (method === 'patch') { body.records.forEach(r => Object.assign(t.find(y => y.id === r.id).fields, r.fields)); return {}; }
      return {};
    }
  };
  vm.createContext(k);
  vm.runInContext(sources, k);
  k.EUC_SUIVI2_aujourdhui_ = () => opts.aujourdhui || '2026-10-20';
  k.EUC_SUIVI2_modele_ = () => ({ annee: '2026-2027', classes: [{ id: 30, nom: '1CAPP', etab: 'LP', gestionnaire: 'CFA RAN', donneur: '', modeApprentissage: 'CLASSE_ENTIERE', eleves: [{ id: 7, libelle: 'DUPONT Léa' }] }] });
  k.EUC_SUIVI2_exigerAdmin_ = () => ({ email: 'admin@example.org', role: 'ADMIN_PFMP' });
  k.EUC_V156_contexteAdmin_ = () => ({ email: 'admin@example.org' });
  k.EUC_PFMP_ref_ = v => Array.isArray(v) ? Number(v[1]) : Number(v);
  k.EUC_IMPORT_lireRecords_ = t => (tables[t] || []).map(r => Object.assign({ id: r.id }, r.fields));
  k.EUC_V159_scopeClasse_ = () => ({ etablissement: 'LP', filiere: 'Carrosserie' });
  let nf = 0;
  k.EUC_DEV562_folder_ = () => ({ createFile: blob => { const id = 'f' + (++nf); drive[id] = blob; return { getId: () => id }; } });
  Object.assign(k, { __props: props, __mails: mails, __tables: tables, __drive: drive });
  return k;
}
function tablesBase(naissance) {
  return {
    EUC_APPRENTISSAGE_PFMP: [{ id: 12, fields: { Eleve: 7, Nom_entreprise: 'Carrosserie Martin', Date_debut: '2026-09-15', Tuteur_nom: 'MARTIN', Tuteur_prenom: 'Paul', Tuteur_fonction: 'Chef d’atelier', Tuteur_courriel: 'contact@martin.fr' } }],
    EUC_REFERENTS_APPRENTIS_PFMP: [{ id: 1, fields: { Eleve: 7, Annee_scolaire: '2026-2027', Professeur: 5, Professeur_nom: 'M. Prof', Actif: true } }],
    EUC_PROFESSEURS_PFMP: [{ id: 5, fields: { Prenom: 'Jean', Nom: 'Prof', Email: 'jean.prof@ac-nice.fr' } }],
    EUC_ELEVES_PFMP: [{ id: 7, fields: { Nom: 'DUPONT', Prenom: 'Léa', Email_eleve: 'lea@example.org', Date_naissance: naissance || '2009-05-01' } }],
    EUC_RESPONSABLES_ELEVES_PFMP: [{ id: 1, fields: { Eleve: 7, Responsable_legal: true, Email: 'parent@example.org' } }, { id: 2, fields: { Eleve: 8, Responsable_legal: true, Email: 'autre.parent@example.org' } }],
    EUC_ACTIVITES_BILAN_VISITE: [{ id: 1, fields: { Classe_motif: 'CAPP', Type: 'ACTIVITE', Bloc: 'Bloc 1', Libelle: 'Dépose et repose', Ordre: 10, Actif: true } }, { id: 2, fields: { Classe_motif: 'CAPP', Type: 'ACTIVITE', Bloc: 'Bloc 2', Libelle: 'Préparation des fonds', Ordre: 20, Actif: true } }],
    EUC_BILANS_VISITE_APPRENTIS: [], EUC_LIVRET_APPRENTIS: [],
    EUC_DESTINATAIRES_ENVOIS_PFMP: [
      { id: 1, fields: { Code: 'PERSO_1', Fonction: 'Coordonnateur carrosserie', Email: 'coordo@example.org', Actif: true, LIVRET_APPRENTIS: true, Perimetre_etablissement: 'LP', Filieres_JSON: '["Carrosserie"]' } },
      { id: 2, fields: { Code: 'PERSO_2', Fonction: 'Coordonnateur électrotechnique', Email: 'elec@example.org', Actif: true, LIVRET_APPRENTIS: true, Perimetre_etablissement: 'TOUS', Filieres_JSON: '["Électrotechnique"]' } },
      { id: 3, fields: { Code: 'PERSO_3', Fonction: 'CFA RAN', Email: 'cfa@example.org', Actif: true, LIVRET_APPRENTIS: true, Organisme: 'CFA RAN' } },
      { id: 4, fields: { Code: 'PERSO_4', Fonction: 'GRETA', Email: 'greta@example.org', Actif: true, LIVRET_APPRENTIS: true, Organisme: 'GRETA' } },
      { id: 5, fields: { Code: 'PROVISEUR', Fonction: 'Proviseur', Email: 'proviseur@example.org', Actif: true, TABLEAUX_SUIVI: true, LIVRET_APPRENTIS: false } }
    ]
  };
}
const L = k => k.EUC_DEV599_jetonApprenti_(7);
const saisie = (k, extra) => Object.assign({ l: L(k), lieu: 'ENTREPRISE', du: '2026-10-05', au: '2026-10-16', contenu: { activites: { a10: { niveau: 'AVEC_AIDE', texte: 'Dépose d’un pare-chocs' }, zz: { texte: 'ignoré' } }, autres: 'Nettoyage', ressenti: 'Bien' } }, extra || {});

test('DEV599 : liens signés — apprenti (permanent), validation (14 jours), falsification refusée', () => {
  const k = contexte();
  assert.strictEqual(k.EUC_DEV599_lireJetonApprenti_(L(k)), 7);
  assert.throws(() => k.EUC_DEV599_lireJetonApprenti_(L(k).replace('l7', 'l8')), /invalide/);
  assert.throws(() => k.EUC_DEV599_lireJetonApprenti_(k.EUC_DEV598_jetonProf_(7)), /invalide/);
  const v = k.EUC_DEV599_jetonValidation_(3, '20261020');
  assert.strictEqual(k.EUC_DEV599_lireJetonValidation_(v, '2026-11-03'), 3);
  assert.throws(() => k.EUC_DEV599_lireJetonValidation_(v, '2026-11-04'), /expiré/);
  assert.match(k.EUC_DEV599_lienApprenti_(7), /\?page=livret-apprenti&l=l7\.[0-9a-f]{32}$/);
});

test('DEV599 : saisie de l’apprenti — lieu et dates obligatoires, activités du modèle seulement, mineur, destinataires de la table', () => {
  const k = contexte(), m = { activites: [{ id: 'a10' }] };
  const f = k.EUC_DEV599_nettoyer_(saisie(k), m);
  assert.deepStrictEqual(Object.keys(f.contenu.activites), ['a10']);
  assert.throws(() => k.EUC_DEV599_nettoyer_(saisie(k, { lieu: '' }), m), /lycée ou en entreprise/);
  assert.throws(() => k.EUC_DEV599_nettoyer_(saisie(k, { du: '' }), m), /dates/);
  assert.throws(() => k.EUC_DEV599_nettoyer_(saisie(k, { au: '2026-10-01' }), m), /avant/);
  assert.strictEqual(k.EUC_DEV599_mineur_('2009-05-01', '2026-10-20'), true);
  assert.strictEqual(k.EUC_DEV599_mineur_('2008-10-20', '2026-10-20'), false);
  assert.strictEqual(k.EUC_DEV599_mineur_('', '2026-10-20'), false);
  const lignes = tablesBase().EUC_DESTINATAIRES_ENVOIS_PFMP.map(r => r.fields);
  assert.deepStrictEqual(Array.from(k.EUC_DEV599_destinatairesTable_(lignes, { etablissement: 'LP', filiere: 'Carrosserie' }, ['CFA RAN'])), ['coordo@example.org', 'cfa@example.org']);
  assert.deepStrictEqual(Array.from(k.EUC_DEV599_destinatairesTable_(lignes, { etablissement: 'LGT', filiere: 'Électrotechnique' }, ['GRETA'])), ['elec@example.org', 'greta@example.org']);
});

test('DEV599 : séquence en entreprise — QR, validation du tuteur (remplaçant), compte rendu à tous les destinataires en copie cachée, photos jointes, fiche figée', () => {
  const k = contexte({ tables: tablesBase() });
  const o = k.EUC_DEV599_ouvrir({ l: L(k) });
  assert.strictEqual(o.apprenti, 'DUPONT Léa'); assert.strictEqual(o.modele.activites.length, 2); assert.strictEqual(o.tuteur.email, 'contact@martin.fr');
  assert.strictEqual(o.tuteur.fonction, undefined);
  const r = k.EUC_DEV599_enregistrer(saisie(k)), id = r.fiche.id;
  assert.strictEqual(r.fiche.statut, 'BROUILLON'); assert.strictEqual(r.fiche.lienValidation, '');
  const jpeg = 'data:image/jpeg;base64,' + Buffer.from('photo').toString('base64');
  for (let i = 0; i < 4; i++) k.EUC_DEV599_ajouterPhoto({ l: L(k), ficheId: id, nom: 'p' + i + '.jpg', data: jpeg });
  assert.throws(() => k.EUC_DEV599_ajouterPhoto({ l: L(k), ficheId: id, nom: 'p5.jpg', data: jpeg }), /Pas plus de 4/);
  k.EUC_DEV599_retirerPhoto({ l: L(k), ficheId: id, photoId: 'f4' }); assert.strictEqual(k.__drive.f4.corbeille, true);
  const d = k.EUC_DEV599_demanderValidation({ l: L(k), ficheId: id });
  assert.strictEqual(d.envoyeA, ''); assert.strictEqual(d.fiche.statut, 'A_VALIDER'); assert.match(d.fiche.lienValidation, /page=validation-livret&v=v1\./);
  assert.strictEqual(k.__mails.length, 0);
  const v = /v=([^&]+)/.exec(d.fiche.lienValidation)[1], lu = k.EUC_DEV599_lireValidation({ v });
  assert.strictEqual(lu.role, 'TUTEUR'); assert.strictEqual(lu.proposition.prenom, 'Paul'); assert.strictEqual(lu.fiche.photos.length, 3);
  assert.match(k.EUC_DEV599_photo({ v, photoId: 'f1' }), /^data:image\/jpeg;base64,/);
  assert.throws(() => k.EUC_DEV599_photo({ v, photoId: 'f4' }), /introuvable/);
  assert.throws(() => k.EUC_DEV599_valider({ v, empreinte: 'x', prenom: 'Luc', nom: 'DURAND', telephone: '0612345678', signature }), /modifiée pendant votre lecture/);
  const ok = k.EUC_DEV599_valider({ v, empreinte: lu.fiche.empreinte, prenom: 'Luc', nom: 'DURAND', fonction: 'Peintre', email: 'luc@martin.fr', commentaire: 'Très impliquée', signature });
  const row = k.__tables.EUC_LIVRET_APPRENTIS[0].fields;
  assert.strictEqual(row.Statut, 'VALIDE'); assert.strictEqual(row.Valideur_role, 'TUTEUR'); assert.strictEqual(row.Vigilance, 'SIGNATAIRE_DIFFERENT'); assert.strictEqual(row.Valide_via, 'QR');
  const cr = k.__mails[0];
  assert.strictEqual(cr.to, 'bureau@example.org');
  assert.deepStrictEqual(cr.bcc.split(',').sort(), ['cfa@example.org', 'contact@martin.fr', 'coordo@example.org', 'jean.prof@ac-nice.fr', 'lea@example.org', 'luc@martin.fr', 'parent@example.org']);
  assert.strictEqual(ok.diffuseA, 7);
  assert.strictEqual(cr.attachments.length, 3);
  assert.match(cr.body, /Bloc 1\n• Dépose et repose \[avec aide\] : Dépose d’un pare-chocs/); assert.match(cr.body, /Validé le 20\/10\/2026 par Luc DURAND \(Peintre\)/); assert.match(cr.body, /Commentaire : Très impliquée/);
  assert.match(k.__mails[1].subject, /^\[Vigilance\] Livret de DUPONT Léa/);
  assert.ok(row.Diffuse_le);
  assert.throws(() => k.EUC_DEV599_enregistrer(saisie(k, { ficheId: id })), /plus modifiable/);
  assert.throws(() => k.EUC_DEV599_ajouterPhoto({ l: L(k), ficheId: id, nom: 'x.jpg', data: jpeg }), /plus modifiable/);
  assert.throws(() => k.EUC_DEV599_valider({ v, empreinte: lu.fiche.empreinte, prenom: 'Luc', nom: 'DURAND', email: 'luc@martin.fr', signature }), /déjà validée/);
});

test('DEV599 : séquence au lycée — lien au professeur référent, validation en un clic avec commentaire ; majeur : pas de parents', () => {
  const k = contexte({ tables: tablesBase('2007-01-01') });
  const id = k.EUC_DEV599_enregistrer(saisie(k, { lieu: 'LYCEE', contenu: {} })).fiche.id;
  assert.throws(() => k.EUC_DEV599_demanderValidation({ l: L(k), ficheId: id }), /vide/);
  k.EUC_DEV599_enregistrer(saisie(k, { lieu: 'LYCEE', ficheId: id }));
  const d = k.EUC_DEV599_demanderValidation({ l: L(k), ficheId: id });
  assert.strictEqual(d.envoyeA, 'jean.prof@ac-nice.fr'); assert.match(k.__mails[0].body, /page=validation-livret&v=v1\./); assert.match(k.__mails[0].subject, /séquence au lycée du 05\/10\/2026 au 16\/10\/2026 à valider/);
  const v = /v=(v[^\s&]+)/.exec(k.__mails[0].body)[1], lu = k.EUC_DEV599_lireValidation({ v });
  assert.strictEqual(lu.role, 'REFERENT'); assert.strictEqual(lu.proposition.nom, 'M. Prof');
  k.EUC_DEV599_valider({ v, empreinte: lu.fiche.empreinte, nom: 'M. Prof', commentaire: 'Bon travail' });
  const row = k.__tables.EUC_LIVRET_APPRENTIS[0].fields;
  assert.strictEqual(row.Valideur_role, 'REFERENT'); assert.strictEqual(row.Signature, undefined);
  const cr = k.__mails[1]; assert.ok(!cr.bcc.includes('parent@example.org')); assert.ok(cr.bcc.includes('contact@martin.fr')); assert.match(cr.body, /par M\. Prof \(professeur référent\)/);
  assert.strictEqual(k.__mails.length, 2);
});

test('DEV599 : lien envoyé au tuteur par courriel, validation « par lien » ; envoi des liens personnels aux apprentis avec aperçu', () => {
  const k = contexte({ tables: tablesBase() });
  const id = k.EUC_DEV599_enregistrer(saisie(k)).fiche.id;
  assert.throws(() => k.EUC_DEV599_demanderValidation({ l: L(k), ficheId: id, email: 'faux' }), /invalide/);
  k.EUC_DEV599_demanderValidation({ l: L(k), ficheId: id, email: 'Contact@Martin.fr' });
  assert.strictEqual(k.__mails[0].to, 'contact@martin.fr'); assert.match(k.__mails[0].body, /&via=lien/);
  const v = /v=(v[^\s&]+)/.exec(k.__mails[0].body)[1], lu = k.EUC_DEV599_lireValidation({ v });
  k.EUC_DEV599_valider({ v, via: 'LIEN', empreinte: lu.fiche.empreinte, prenom: 'Paul', nom: 'Martin', telephone: '0611111111', signature });
  assert.strictEqual(k.__tables.EUC_LIVRET_APPRENTIS[0].fields.Valide_via, 'LIEN'); assert.strictEqual(k.__tables.EUC_LIVRET_APPRENTIS[0].fields.Vigilance, '');
  const ap = k.EUC_DEV599_envoyerLiens({ eleveIds: [7] });
  assert.strictEqual(ap.apercu, true); assert.strictEqual(ap.envois[0].email, 'lea@example.org');
  const avant = k.__mails.length, env = k.EUC_DEV599_envoyerLiens({ eleveIds: [7], confirmation: 'ENVOYER' });
  assert.strictEqual(env.envoyes, 1); assert.match(k.__mails[avant].body, /page=livret-apprenti&l=l7\./);
});

test('DEV599 : table des envois — colonnes Livret et Organisme, destinataire ajouté, enregistrement', () => {
  const k = contexte({ tables: { Classes: [{ id: 30, fields: { Nom: '1CAPP', Organisme_gestionnaire: 'CFA RAN', Organisme_donneur_ordre: 'CFAI' } }], EUC_DESTINATAIRES_ENVOIS_PFMP: [], EUC_PERIMETRES_CLASSES_PFMP: [] } });
  const r = k.EUC_V158_ajouter({ fonction: 'Coordonnateur électrotechnique' });
  const l = r.lignes.find(x => x.perso);
  assert.strictEqual(l.fonction, 'Coordonnateur électrotechnique'); assert.strictEqual(l.livret, true);
  assert.deepStrictEqual(Array.from(r.organismes), ['CFA RAN', 'CFAI']);
  k.EUC_V158_sauver({ lignes: [{ id: l.id, fonction: 'Coordo élec', nom: 'Stéphane', email: 's@example.org', actif: true, livret: true, organisme: 'CFAI', etablissement: 'LP', filieres: [] }] });
  const row = k.__tables.EUC_DESTINATAIRES_ENVOIS_PFMP.find(x => x.id === l.id).fields;
  assert.strictEqual(row.Fonction, 'Coordo élec'); assert.strictEqual(row.LIVRET_APPRENTIS, true); assert.strictEqual(row.Organisme, 'CFAI'); assert.strictEqual(row.Nom, 'Stéphane');
  const prov = k.__tables.EUC_DESTINATAIRES_ENVOIS_PFMP.find(x => x.fields.Code === 'PROVISEUR');
  k.EUC_V158_sauver({ lignes: [{ id: prov.id, fonction: 'Pirate', nom: '', email: 'p@example.org', actif: true, etablissement: 'TOUS', filieres: [] }] });
  assert.strictEqual(prov.fields.Fonction, 'Proviseur');
  assert.throws(() => k.EUC_V158_ajouter({ fonction: '' }), /fonction/);
});

test('DEV599 : pages — routes, pages publiques, boutons protégés, photos réduites, QR, signature, échéancier et destinataires', () => {
  const routes = read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), gen = read('scripts/generate-acces-liste.js');
  assert.match(routes, /case 'livret-apprenti':\s*return EUC_DEV599_afficherLivret\(e\);/);
  assert.match(routes, /case 'validation-livret':\s*return EUC_DEV599_afficherValidation\(e\);/);
  for (const p of ['Livret_Apprenti_DEV599', 'Validation_Livret_DEV599']) assert.ok(gen.includes("'" + p + "'"), p);
  for (const [nom, page] of [['livret', pageLivret], ['validation', pageVal]]) assert.doesNotMatch(page, /<\?= *JSON\.stringify/, nom);
  for (const t of ['EUC_DEV599_ouvrir', 'EUC_DEV599_enregistrer', 'EUC_DEV599_demanderValidation', 'EUC_DEV599_ajouterPhoto', 'EUC_DEV599_retirerPhoto', "toDataURL('image/jpeg',0.75)", '1280/Math.max', 'new QRCode(', 'occupe(b,', 'class="spin"', 'localStorage']) assert.ok(pageLivret.includes(t), t);
  for (const t of ['EUC_DEV599_lireValidation', 'EUC_DEV599_valider', 'EUC_DEV599_photo', 'touch-action:none', "r.role==='REFERENT'", 'bt.disabled=true', 'class="spin"']) assert.ok(pageVal.includes(t), t);
  for (const t of ['EUC_DEV599_envoyerLiens', 'Imprimer les QR des livrets', 'lienLivret', '@media print', 'qrcodejs/1.0.0']) assert.ok(pageEch.includes(t), t);
  for (const t of ['Livret des apprentis', 'class="livret"', 'class="organisme"', 'EUC_V158_ajouter', 'spinner']) assert.ok(pageDest.includes(t), t);
});

console.log(`\n${n} tests DEV599 livret des apprentis réussis.`);
