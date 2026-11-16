/* DEV675 — Professeur principal ajouté dans l'application (choisi dans la liste importée), remplacé par Pronote. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
const PROFS = [{ id: 7, Civilite: 'M.', Prenom: 'Paul', Nom: 'DURAND', Email: 'p.durand@ac-nice.fr' }, { id: 8, Nom: 'MARTIN', Prenom: 'Léa', Email: '' }, { id: 9, Nom: 'ANCIEN', Actif: false, Email: 'a@ac-nice.fr' }];
function ctx(liens) {
  const appels = [], removed = [];
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, __appels: appels, __removed: removed,
    EUC_DEV368_year: y => y || '2026-2027', EUC_DEV368_admin: () => ({ email: 'admin' }), EUC_DEV368_catalog: () => ({ classes: [] }),
    EUC_DEV456_familyCacheGet_: (y, f) => f === 'BACPRO' ? { classes: [{ classeId: 12, classe: '1MELEC2', periodes: [] }] } : { classes: [] },
    EUC_PFMP_ref_: v => Array.isArray(v) ? v[1] : v, Utilities: { formatDate: () => '' },
    EUC_IMPORT_lireRecords_: t => t === 'EUC_PROFESSEURS_PFMP' ? PROFS : t === 'EUC_CLASSES_PROFESSEURS_PFMP' ? liens : [],
    EUC_ENT_grist: (m, u, b) => { appels.push({ m, u, b }); return { records: [{ id: 99 }] }; },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ remove: c => removed.push(c) }) } };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js'), k); vm.runInContext(read('apps-script/EUC_DEV675_PpManuel.js'), k);
  return k;
}
test('liste des professeurs importés : actifs seulement, triés par nom, courriel indiqué', () => {
  const l = J(ctx([]).EUC_DEV675_professeurs());
  assert.deepEqual(l.map(p => p.nom), ['M. Paul DURAND', 'Léa MARTIN']); assert.equal(l[1].email, '');
});
test('ajout : lien marqué MANUEL_PFMP pour l’année, cache PP de la classe oublié', () => {
  const k = ctx([]), r = J(k.EUC_DEV675_ajouterPp({ annee: '2026-2027', classeId: 12, profId: 7 }));
  assert.equal(r.classe, '1MELEC2'); assert.equal(r.professeur, 'M. Paul DURAND');
  const post = k.__appels.find(a => a.m === 'post');
  assert.deepEqual(J(post.b.records[0].fields), Object.assign(J(post.b.records[0].fields), { Classe: 12, Professeur: 7, Role: 'PROFESSEUR_PRINCIPAL', Source_Pronote: 'MANUEL_PFMP', Annee_scolaire: '2026-2027', Actif: true }));
  assert.equal(post.b.records[0].fields.Source_Pronote, 'MANUEL_PFMP'); assert.deepEqual(k.__removed, ['DEV455_PP_12']);
});
test('ajout refusé : professeur hors liste, sans courriel, classe inconnue ; doublon sans écriture', () => {
  const k = ctx([{ id: 3, Classe: 12, Professeur: 7, Role: 'PROFESSEUR_PRINCIPAL', Actif: true }]);
  assert.throws(() => k.EUC_DEV675_ajouterPp({ classeId: 12, profId: 9 }), /pas dans la liste/);
  assert.throws(() => k.EUC_DEV675_ajouterPp({ classeId: 12, profId: 8 }), /pas de courriel/);
  assert.throws(() => k.EUC_DEV675_ajouterPp({ classeId: 55, profId: 7 }), /Classe introuvable/);
  assert.equal(J(k.EUC_DEV675_ajouterPp({ classeId: 12, profId: 7 })).deja, true); assert.equal(k.__appels.length, 0);
});
test('retrait : seulement un lien ajouté dans l’application ; marquage dans le lot', () => {
  const liens = [{ id: 3, Classe: 12, Professeur: 7, Role: 'PROFESSEUR_PRINCIPAL', Source_Pronote: 'MANUEL_PFMP', Actif: true }, { id: 4, Classe: 12, Professeur: 8, Role: 'PROFESSEUR_PRINCIPAL', Source_Pronote: 'LYCEE', Actif: true }];
  const k = ctx(liens);
  assert.throws(() => k.EUC_DEV675_retirerPp({ lienId: 4 }), /vient de Pronote/);
  k.EUC_DEV675_retirerPp({ lienId: 3 }); const p = k.__appels.find(a => a.m === 'patch'); assert.equal(p.b.records[0].id, 3); assert.equal(p.b.records[0].fields.Actif, false);
  const c = J(k.EUC_DEV675_marquer_([{ classeId: 12, principaux: [{ id: 7 }, { id: 8 }] }]));
  assert.equal(c[0].principaux[0].manuel, 3); assert.equal(c[0].principaux[1].manuel, undefined);
});
function importer(lignes, liens) {
  const appels = [];
  const k = { console, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite,
    EUC_IMPORT_exigerAdminTexte_: () => ({}), EUC_IMPORT_nowGrist_: () => 1, EUC_CORRESPONDANCE_CLASSES_TABLE_: 'CORR',
    EUC_ENT_grist: (m, u, b) => { appels.push({ m, u, b }); if (m === 'get' && u === '/tables') return { tables: ['EUC_PROFESSEURS_PFMP', 'EUC_CLASSES_PROFESSEURS_PFMP', 'EUC_CLASSES_DIPLOMES_PFMP'].map(id => ({ id })) }; if (m === 'get') return { columns: [{ id: 'Annee_scolaire' }, { id: 'Retire_le' }] }; return {}; },
    EUC_IMPORT_lireRecordsBruts_: t => ({ CORR: [{ id: 1, fields: { Actif: true, Annee_scolaire: '2026-2027', Classe_Grist: 12, Nom_classe_Pronote: '1MELEC2' } }], Classes: [{ id: 12, fields: { Nom: '1MELEC2' } }], EUC_PROFESSEURS_PFMP: [{ id: 7, fields: { Nom: 'DURAND', Prenom: 'Paul' } }, { id: 8, fields: { Nom: 'MARTIN', Prenom: 'Léa' } }], EUC_CLASSES_PROFESSEURS_PFMP: liens })[t] || [] };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_IMPORT_PFMP_ProfClasses.gs'), k);
  k.EUC_PC_importerClasses({ texte: 'NOM;PRINCIPAUX\n' + lignes });
  return appels.filter(a => a.m === 'patch').flatMap(a => a.b.records);
}
const MANUEL = () => [{ id: 3, fields: { Classe: 12, Professeur: 7, Role: 'PROFESSEUR_PRINCIPAL', Source_Pronote: 'MANUEL_PFMP', Annee_scolaire: '2026-2027', Actif: true } }];
test('import Pronote prioritaire : un professeur principal fourni remplace le lien manuel', () => {
  const p = importer('1MELEC2;MARTIN Léa', MANUEL()); assert.ok(p.some(r => r.id === 3 && r.fields.Actif === false), 'lien manuel désactivé');
});
test('import Pronote sans professeur principal pour la classe : le lien manuel est gardé ; même professeur : repris par Pronote', () => {
  assert.ok(!importer('1MELEC2;', MANUEL()).some(r => r.id === 3 && r.fields.Actif === false));
  const p = importer('1MELEC2;DURAND Paul', MANUEL()); const r = p.find(x => x.id === 3); assert.equal(r.fields.Actif, true); assert.notEqual(r.fields.Source_Pronote, 'MANUEL_PFMP');
});
test('page : choix dans la liste importée, ajout et retrait protégés, saisies des signataires gardées', () => {
  const h = read('apps-script/Acces_PP_Admin_DEV441.html');
  assert.match(h, /\+ Ajouter un professeur principal…/); assert.match(h, /'EUC_DEV675_ajouterPp'/); assert.match(h, /'EUC_DEV675_retirerPp'/); assert.match(h, /EUC_DEV675_professeurs\(\)/);
  assert.match(h, /appel\(b,'Ajout…'/); assert.match(h, /const garde=saisies\(\)/); assert.match(h, /remplacé par Pronote au prochain import/);
  assert.match(read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js'), /EUC_DEV675_marquer_\(classes\)/);
});
console.log(n + ' tests DEV675 réussis.');
