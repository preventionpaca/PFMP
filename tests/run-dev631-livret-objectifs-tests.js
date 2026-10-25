'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const sources = ['EUC_SUIVI2_Moteur.js', 'EUC_DEV597_Echeancier.js', 'EUC_DEV598_BilanVisite.js', 'EUC_DEV599_Livret.js', 'EUC_SUIVI_PFMP_DestinatairesV158.gs', 'EUC_DEV630_Referentiels.js', 'EUC_DEV631_LivretObjectifs.js'].map(f => read('apps-script/' + f)).join('\n');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const J = x => JSON.parse(JSON.stringify(x));
const octets = buf => Array.from(buf).map(b => (b > 127 ? b - 256 : b));
const signature = 'data:image/png;base64,' + 'A'.repeat(600);
function contexte(opts) {
  opts = opts || {};
  const colonnes = opts.colonnes || {}, props = { EUC_DEV598_SECRET: 'secret-de-test', EUC_DEV598_COPIE_VALIDATIONS: 'bureau@example.org' }, mails = [], tables = opts.tables || {}, drive = {};
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
    CacheService: { getScriptCache: () => ({ get: x => /DEV631/.test(x) ? null : '1', put() {} }) },
    EUC_DEV441_col_: (id, label, type) => ({ id, fields: { label, type: type || 'Text' } }),
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: m => mails.push(m) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'proprietaire@example.org' }) },
    DriveApp: { getFileById: id => { if (!drive[id]) throw new Error('absent'); return { getBlob: () => ({ getBytes: () => drive[id].bytes, name: drive[id].name }), setTrashed() { drive[id].corbeille = true; } }; } },
    EUC_ENT_grist(method, p, body) {
      k.__appels.push({ method, p });
      if (p === '/tables' && method === 'get') return { tables: Object.keys(tables).map(id => ({ id })) };
      if (p === '/tables' && method === 'post') { body.tables.forEach(t => { tables[t.id] = tables[t.id] || []; colonnes[t.id] = t.columns.map(c => c.id); }); return {}; }
      const c = /^\/tables\/([^/?]+)\/columns$/.exec(p);
      if (c) { if (method === 'get') return { columns: (colonnes[c[1]] || []).map(id => ({ id })) }; colonnes[c[1]] = (colonnes[c[1]] || []).concat(body.columns.map(x => x.id)); return {}; }
      const m = /^\/tables\/([^/?]+)\/records(?:\?filter=(.*))?$/.exec(p);
      if (!m) return {};
      if (method !== 'get' && colonnes[m[1]]) body.records.forEach(r => Object.keys(r.fields).forEach(f => { if (!colonnes[m[1]].includes(f)) throw new Error('Colonne inconnue ' + m[1] + '.' + f); }));
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
  k.__appels = [];
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
  k.__appels = k.__appels || [];
  Object.assign(k, { __colonnes: colonnes, __props: props, __mails: mails, __tables: tables, __drive: drive });
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
/* Colonnes d'origine du livret (DEV599), sans les colonnes ajoutées par DEV631. */
const COLS599 = (read('apps-script/EUC_DEV599_Livret.js').match(/id: EUC_DEV599_FICHES_, columns: \[([\s\S]*?)\] \}\] \}\);/)[1].match(/col\('([A-Za-z_]+)'/g) || []).map(x => x.slice(5, -1));
const base = () => ({ tables: tablesBase(), colonnes: { EUC_LIVRET_APPRENTIS: COLS599.slice() } });
const BC1 = 'RNCP39617BC01', BC2 = 'RNCP39617BC02';
const periodes = [{ label: 'S1', du: '2026-10-05', au: '2026-10-09' }, { label: 'P1', du: '2026-10-12', au: '2026-10-30' }, { label: 'S2', du: '2026-11-02', au: '2026-11-06' }];
function livretBachelor(k) {
  k.__tables.EUC_PLAN_LIGNES_CLASSES = [{ id: 1, fields: { Annee_scolaire: '2026-2027', Ligne: 'BACHELOR_IP', Classes: ['L', 30] } }];
  return k.EUC_DEV631_enregistrerObjectifs({ annee: '2026-2027', ligne: 'BACHELOR_IP', periodes, objectifs: [
    { periode: 'P1', bloc: BC1, texte: 'Analyser la gamme  de fabrication' }, { periode: 'P1', bloc: BC1, texte: 'Proposer une amélioration chiffrée' }, { periode: 'P1', bloc: 'AUTRES', texte: 'Se former au logiciel de FAO' },
    { periode: 'S1', bloc: BC2, texte: 'Préparer le planning du projet' }, { periode: 'S2', bloc: BC1, texte: '' }] });
}

test('DEV631 : objectifs contrôlés (période S/P, dates, bloc du référentiel ou AUTRES, 30 au plus), relus dans l’ordre', () => {
  const k = contexte(base()), blocs = k.EUC_DEV630_referentielLigne_('BACHELOR_IP').blocs;
  assert.throws(() => k.EUC_DEV631_normaliser_({ periodes: [{ label: 'X1', du: '2026-10-05', au: '2026-10-09' }] }, blocs), /Période inconnue/);
  assert.throws(() => k.EUC_DEV631_normaliser_({ periodes: [{ label: 'S1', du: '2026-10-09', au: '2026-10-05' }] }, blocs), /Dates invalides/);
  assert.throws(() => k.EUC_DEV631_normaliser_({ periodes: [periodes[0], periodes[0]] }, blocs), /en double/);
  assert.throws(() => k.EUC_DEV631_normaliser_({ periodes, objectifs: [{ periode: 'P9', bloc: BC1, texte: 'x' }] }, blocs), /période inconnue/);
  assert.throws(() => k.EUC_DEV631_normaliser_({ periodes, objectifs: [{ periode: 'P1', bloc: 'RNCP1BC01', texte: 'x' }] }, blocs), /Bloc inconnu/);
  assert.throws(() => k.EUC_DEV631_normaliser_({ periodes, objectifs: Array.from({ length: 31 }, (_, i) => ({ periode: 'P1', bloc: BC1, texte: 'o' + i })) }, blocs), /30 objectifs/);
  const r = livretBachelor(k);
  assert.deepStrictEqual(J([r.periodes, r.objectifs]), [3, 4], 'objectif vide ignoré');
  assert.deepStrictEqual(J(r.lu.objectifs.filter(o => o.periode === 'P1').map(o => [o.bloc, o.texte, o.ordre])), [['AUTRES', 'Se former au logiciel de FAO', 1], [BC1, 'Analyser la gamme de fabrication', 1], [BC1, 'Proposer une amélioration chiffrée', 2]]);
  assert.ok(k.__colonnes.EUC_LIVRET_OBJECTIFS.includes('Bloc') && ['Periode', 'Ligne', 'Objectifs_decoches'].every(c => k.__colonnes.EUC_LIVRET_APPRENTIS.includes(c)), 'table créée, colonnes ajoutées au livret');
});

test('DEV631 : nouvel enregistrement — lignes réutilisées, surplus désactivé (jamais supprimé), périodes mises à jour', () => {
  const k = contexte(base()); livretBachelor(k);
  const avant = k.__tables.EUC_LIVRET_OBJECTIFS.length;
  const r = k.EUC_DEV631_enregistrerObjectifs({ annee: '2026-2027', ligne: 'BACHELOR_IP', periodes: periodes.slice(0, 2).map(p => p.label === 'P1' ? Object.assign({}, p, { au: '2026-11-06' }) : p), objectifs: [{ periode: 'P1', bloc: BC1, texte: 'Analyser la gamme de fabrication' }] });
  assert.strictEqual(k.__tables.EUC_LIVRET_OBJECTIFS.length, avant, 'aucune ligne créée ni supprimée');
  assert.deepStrictEqual(J([r.lu.periodes.map(p => p.label + ':' + p.au), r.lu.objectifs.length]), [['S1:2026-10-09', 'P1:2026-11-06'], 1]);
  assert.strictEqual(k.__tables.EUC_LIVRET_OBJECTIFS.filter(x => x.fields.Actif === false).length, 4);
  assert.ok(!k.__appels.some(a => a.method === 'delete'));
});

test('DEV631 : regroupements de périodes enregistrés avec le livret (réglage de la formation), relus, retirables', () => {
  const k = contexte(base()); livretBachelor(k);
  assert.throws(() => k.EUC_DEV631_enregistrerObjectifs({ annee: '2026-2027', ligne: 'BACHELOR_IP', periodes, fusion: ['Z9'] }), /Regroupement invalide/);
  let r = k.EUC_DEV631_enregistrerObjectifs({ annee: '2026-2027', ligne: 'BACHELOR_IP', periodes, objectifs: [], fusion: ['S2', 's3', 'S2'] });
  assert.deepStrictEqual(J(r.lu.fusion), ['S2', 'S3']);
  r = k.EUC_DEV631_enregistrerObjectifs({ annee: '2026-2027', ligne: 'BACHELOR_IP', periodes, objectifs: [] });
  assert.deepStrictEqual(J(r.lu.fusion), [], 'aucun regroupement : réglage désactivé');
  assert.ok(k.__tables.EUC_LIVRET_OBJECTIFS.some(x => x.fields.Type === 'REGLAGE' && x.fields.Actif === false));
});

test('DEV631 : livret de l’apprenti — période choisie (dates du planning), objectifs par bloc, réalisations et liens, compte rendu', () => {
  const k = contexte(base()); livretBachelor(k);
  const o = k.EUC_DEV599_ouvrir({ l: k.EUC_DEV599_jetonApprenti_(7) });
  assert.deepStrictEqual(J([o.livret.ligne, o.livret.blocs.map(b => b.code), o.livret.periodes.map(p => p.label + ':' + p.lieu)]), ['BACHELOR_IP', [BC1, BC2], ['S1:LYCEE', 'P1:ENTREPRISE', 'S2:LYCEE']]);
  assert.deepStrictEqual(J(o.livret.periodes[1].objectifs), { AUTRES: ['Se former au logiciel de FAO'], [BC1]: ['Analyser la gamme de fabrication', 'Proposer une amélioration chiffrée'] });
  const l = k.EUC_DEV599_jetonApprenti_(7), q = { l, periode: 'P1', lieu: 'LYCEE', du: '2020-01-01', au: '2020-01-02', contenu: { blocs: { [BC1]: 'Revue de la gamme', INCONNU: 'ignoré' }, autres: 'Tuto FAO', liens: [{ url: 'https://exemple.fr/fao', titre: 'Tuto' }] } };
  assert.throws(() => k.EUC_DEV599_enregistrer(Object.assign({}, q, { periode: 'P7' })), /Période inconnue/);
  assert.throws(() => k.EUC_DEV599_enregistrer(Object.assign({}, q, { contenu: { liens: [{ url: 'javascript:alert(1)' }] } })), /Lien invalide/);
  const r = k.EUC_DEV599_enregistrer(q), f = k.__tables.EUC_LIVRET_APPRENTIS[0].fields;
  assert.deepStrictEqual(J([r.fiche.periode, r.fiche.lieu, r.fiche.du, r.fiche.au, f.Ligne]), ['P1', 'ENTREPRISE', '2026-10-12', '2026-10-30', 'BACHELOR_IP'], 'lieu et dates viennent du planning');
  assert.deepStrictEqual(J(r.fiche.contenu.blocs), { [BC1]: 'Revue de la gamme' }); assert.strictEqual(r.fiche.contenu.liens.length, 1);
  const cr = k.EUC_DEV599_compteRendu_({ apprenti: 'DUPONT Léa', classe: '1CAPP', entreprise: 'Carrosserie Martin' }, { activites: [] }, r.fiche, { jour: '2026-11-02', qui: 'Paul MARTIN' }, o.livret);
  assert.ok(/^P1 — séquence en entreprise du 12\/10\/2026/m.test(cr) && cr.includes('  Objectif : Proposer une amélioration chiffrée') && cr.includes('Revue de la gamme') && cr.includes('Se former au logiciel de FAO') && cr.includes('Tuto : https://exemple.fr/fao'), cr);
  const v = k.EUC_DEV599_demanderValidation({ l, ficheId: r.fiche.id });
  assert.strictEqual(v.fiche.statut, 'A_VALIDER');
  const lv = k.EUC_DEV599_lireValidation({ v: k.EUC_DEV599_jetonValidation_(r.fiche.id, '20261020') });
  assert.deepStrictEqual(J([lv.fiche.periode, lv.livret.periodes[1].objectifs[BC1].length]), ['P1', 2], 'le tuteur voit les objectifs');
});

test('DEV631 : sans périodes enregistrées, le livret garde l’ancienne saisie (lieu et dates libres)', () => {
  const k = contexte(base());
  const o = k.EUC_DEV599_ouvrir({ l: k.EUC_DEV599_jetonApprenti_(7) });
  assert.strictEqual(o.livret, null);
  const r = k.EUC_DEV599_enregistrer({ l: k.EUC_DEV599_jetonApprenti_(7), lieu: 'LYCEE', du: '2026-10-05', au: '2026-10-09', contenu: { autres: 'Atelier' } });
  assert.deepStrictEqual(J([r.fiche.periode, r.fiche.lieu]), ['', 'LYCEE']);
});

test('DEV631 : pages — éditeur des objectifs (récapitulatif des périodes), livret par période, validation avec objectifs', () => {
  const pl = read('apps-script/Plannings_DEV610.html'), lv = read('apps-script/Livret_Apprenti_DEV599.html'), va = read('apps-script/Validation_Livret_DEV599.html'), js = read('apps-script/EUC_DEV610_Plannings.js');
  for (const x of ["var REF630=<?!= referentiels ?>;", '<div id="objectifsLivret"></div>', "occupe(this,'Enregistrement du livret…','EUC_DEV631_enregistrerObjectifs'", 'Recopier vers toutes les périodes', 'Regrouper des périodes', 'fusion:OBJ.fusion}', 'EUC_DEV610_regrouperPeriodes_(BRUT,', 'var H_ENT_JOUR=7;', '* Total indicatif en entreprise', "≈ '+hfmt(tot.E.j*H_ENT_JOUR)+' h*", '||OBJ_SALE||HSALE||COUL_SALE){', "Chargement des objectifs du livret…"]) assert.ok(pl.includes(x), x);
  assert.ok(js.includes('t.referentiels = JSON.stringify(ref)'));
  for (const x of ['function ouvrirPeriode(f)', 'Objectifs de la période :', '+ Ajouter un lien', 'Enregistrer le brouillon', 'if(D.livret)return lirePeriode();', 'rel="noopener noreferrer"']) assert.ok(lv.includes(x), x);
  for (const x of ['lv.blocs.filter', 'objectifs fixés pour la période', 'rel="noopener noreferrer"']) assert.ok(va.includes(x), x);
});

console.log(n + ' tests DEV631 livret par période réussis');
