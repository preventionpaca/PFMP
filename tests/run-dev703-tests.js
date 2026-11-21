/* DEV703 — Distance domicile → lieu de stage en voiture : adresses exactes, empreintes sans adresse, calcul par lots. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));

function ctx(opts) {
  opts = opts || {};
  const props = {}, appels = [];
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, Set, Map };
  vm.createContext(k);
  ['apps-script/EUC_DEV688_ControleNoms.js', 'apps-script/EUC_DEV703_Distances.js'].forEach(f => vm.runInContext(read(f), k, { filename: f }));
  Object.assign(k, {
    Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()), base64EncodeWebSafe: b => Buffer.from(b).toString('base64url') },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
    DriveApp: (() => { const mk = nom => ({ getId: () => 'id-' + nom, isTrashed: () => false, getBlob: () => ({ getDataAsString: () => props[nom] }), setContent: c => { props[nom] = c; } });
      const root = { getFilesByName: nom => { let vu = props[nom] == null; return { hasNext: () => !vu, next: () => { vu = true; return mk(nom); } }; }, createFile: (nom, c) => { props[nom] = c; return mk(nom); } };
      return { getRootFolder: () => root, getFileById: id => { if (props[id.slice(3)] == null) throw new Error('absent'); return mk(id.slice(3)); } }; })(),
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Maps: { DirectionFinder: { Mode: { DRIVING: 'driving' } }, newDirectionFinder: () => { const q = {}; const f = { setOrigin: o => (q.o = o, f), setDestination: d => (q.d = d, f), setMode: () => f, setLanguage: () => f,
      getDirections: () => { appels.push(q); if (opts.quota) throw new Error('Service invoked too many times for one day: route.'); if (/INCONNUE/.test(q.d)) return { status: 'NOT_FOUND', routes: [] };
        return { status: 'OK', routes: [{ legs: [{ distance: { value: 12345 }, duration: { value: 1500 } }] }] }; } }; return f; } },
    EUC_ADMIN_WORKFLOW_ctxV144_: () => ({}),
    EUC_PFMP_ref_: v => Array.isArray(v) ? v[1] : v,
    EUC_IMPORT_lireRecords_: t => t === 'EUC_ELEVES_PFMP' ? (opts.eleves || []) : t === 'EUC_RESPONSABLES_ELEVES_PFMP' ? (opts.resps || []) : [],
    EUC_DEV368_catalog: () => ({ classes: [] }), EUC_DEV371_levelOf_: () => '', EUC_DEV371_levelLabel_: () => '',
    EUC_CONVENTION_lireAccesFraisV108_: () => opts.convs || [], EUC_ADMIN_WORKFLOW_estDossierVisibleV522_: () => true,
    EUC_PFMP_anneeDossierV148_: a => a.Annee_scolaire, EUC_ADMIN_WORKFLOW_numeroV144_: a => 'N' + a.id,
    EUC_ADMIN_WORKFLOW_identiteEleveV521_: (a, by) => { const e = by[a.Eleve] || {}; return { id: a.Eleve, nom: e.Nom, prenom: e.Prenom }; }
  });
  k.props = props; k.appels = appels;
  return k;
}
const ELEVE = { id: 1, Nom: 'UN', Prenom: 'A', Adresse_1: '12 rue des Lilas', Code_postal: '06200', Ville: 'NICE' };
const conv = (id, over) => Object.assign({ id, Eleve: 1, Annee_scolaire: '2026-2027', Entreprise_raison_sociale: 'Garage', Entreprise_adresse: '5 avenue de la Gare', Entreprise_code_postal: '06400', Entreprise_commune: 'CANNES' }, over);

test('adresse exacte : voie obligatoire (pas une simple commune), domicile repris du responsable en charge', () => {
  const k = ctx();
  assert.equal(k.EUC_DEV703_adresse_('12 rue des Lilas', '06200', 'NICE'), '12 rue des Lilas, 06200 NICE');
  assert.equal(k.EUC_DEV703_adresse_('', '06200', 'NICE'), '', 'commune seule : pas une adresse exacte');
  assert.equal(k.EUC_DEV703_adresse_('12', '06200', 'NICE'), '', 'numéro sans voie');
  assert.equal(k.EUC_DEV703_adresse_('12 rue des Lilas', '', ''), '', 'voie sans code postal ni ville');
  assert.equal(k.EUC_DEV703_domicile_({ Adresse_1: 'Bât. B', Adresse_2: '3 bd Gambetta', Code_postal: '06000', Ville: 'NICE' }, []), 'Bât. B, 3 bd Gambetta, 06000 NICE');
  const resps = [{ Adresse_1: '1 rue Légale', Code_postal: '06100', Ville: 'NICE', Responsable_legal: true }, { Adresse_1: '2 rue En Charge', Code_postal: '06300', Ville: 'NICE', Responsable_en_charge: true }];
  assert.equal(k.EUC_DEV703_domicile_({ Ville: 'NICE' }, resps), '2 rue En Charge, 06300 NICE');
  assert.equal(k.EUC_DEV703_domicile_({}, []), '');
  assert.equal(k.EUC_DEV703_lieu_({ Lieu_stage_adresse: '9 quai Lunel', Lieu_stage_code_postal: '06300', Lieu_stage_commune: 'NICE', Entreprise_adresse: 'Siège', Entreprise_code_postal: '75008', Entreprise_commune: 'PARIS' }), '9 quai Lunel, 06300 NICE', 'lieu de stage prioritaire');
  assert.equal(k.EUC_DEV703_lieu_({}, { Numero_voie: '4 rue du Port', Code_postal: '98000', Commune: 'MONACO' }), '4 rue du Port, 98000 MONACO', 'fiche entreprise');
  assert.equal(k.EUC_DEV703_pays_('4 rue du Port, 98000 MONACO'), 'Monaco'); assert.equal(k.EUC_DEV703_pays_('12 rue des Lilas, 06200 NICE'), 'France');
});

test('calcul par lot : itinéraire voiture, km au dixième et minutes, stockage sans aucune adresse, pas de nouvel appel ensuite', () => {
  const k = ctx({ eleves: [ELEVE, { id: 2, Nom: 'DEUX', Prenom: 'B', Ville: 'NICE' }, { id: 3, Nom: 'TEST', Prenom: 'T', Adresse_1: '1 rue Essai', Code_postal: '06000', Ville: 'NICE', Donnee_test: true }],
    convs: [conv(10), conv(11, { Eleve: 2 }), conv(12, { Entreprise_adresse: '1 rue INCONNUE' }), conv(13, { Entreprise_adresse: '' }), conv(14, { Eleve: 3 }), conv(15)] });
  assert.equal(k.EUC_DEV703_distances({ annee: '2026-2027' }).compte.aCalculer, 3, 'avant calcul : 3 conventions à calculer (10, 12, 15)');
  const r = J(k.EUC_DEV703_calculer({ annee: '2026-2027' }));
  assert.equal(k.appels.length, 2, 'un seul appel pour deux conventions au même couple d’adresses ; élève d’essai ignoré');
  assert.equal(k.appels[0].o, '12 rue des Lilas, 06200 NICE, France'); assert.equal(k.appels[0].d, '5 avenue de la Gare, 06400 CANNES, France');
  assert.deepEqual(r.parConvention['10'], [12.3, 25]); assert.deepEqual(r.parConvention['15'], [12.3, 25]);
  assert.equal(r.parConvention['11'], 'DOMICILE'); assert.equal(r.parConvention['12'], 'INTROUVABLE'); assert.equal(r.parConvention['13'], 'LIEU'); assert.equal(r.parConvention['14'], undefined);
  assert.deepEqual(r.compte, { calculees: 2, aCalculer: 0, sansDomicile: 1, sansLieu: 1, introuvables: 1 }); assert.equal(r.faits, 2);
  const brut = Object.keys(k.props).map(c => c + '=' + k.props[c]).join('\n');
  assert.doesNotMatch(brut, /Lilas|Gare|NICE|CANNES|06200|06400|UN\b/i, 'aucune adresse ni nom dans le stockage');
  assert.match(brut, /^Eucalyptus PFMP - distances domicile-stage 2026-2027\.txt=[\w-]{14}:12\.3:25;[\w-]{14}:-1:-1$/m, 'un fichier par année : empreinte, km, minutes');
  const r2 = J(k.EUC_DEV703_distances({ annee: '2026-2027' }));
  assert.equal(k.appels.length, 2, 'lecture seule : aucun itinéraire');
  assert.deepEqual(r2.parConvention['10'], [12.3, 25]);
  /* Adresse de l'élève corrigée : nouvelle empreinte, l'ancienne entrée disparaît au calcul suivant. */
  ELEVE.Adresse_1 = '14 rue des Lilas';
  assert.equal(k.EUC_DEV703_distances({ annee: '2026-2027' }).compte.aCalculer, 3, 'les 3 conventions de cet élève');
  k.EUC_DEV703_calculer({ annee: '2026-2027' });
  assert.equal(k.EUC_DEV703_lireStock_ && Object.keys(k.EUC_DEV703_lireStock_('2026-2027')).length, 2, 'entrée périmée retirée');
  ELEVE.Adresse_1 = '12 rue des Lilas';
});

test('quota Google atteint : arrêt propre, rien de faux enregistré, message de reprise', () => {
  const k = ctx({ quota: true, eleves: [ELEVE], convs: [conv(10)] });
  const r = J(k.EUC_DEV703_calculer({ annee: '2026-2027' }));
  assert.match(r.limite, /Quota quotidien/); assert.equal(r.faits, 0); assert.equal(r.parConvention['10'], 'A_CALCULER');
});

test('stockage Drive : fichier créé au premier calcul, relu, remplacé ; année sans fichier = vide', () => {
  const k = ctx();
  assert.deepEqual(J(k.EUC_DEV703_lireStock_('2026-2027')), {}, 'aucun fichier : rien, sans création');
  assert.equal(Object.keys(k.props).length, 0);
  const m = {}; for (let i = 0; i < 900; i++) m['h' + String(i).padStart(13, '0')] = [i / 10, i];
  k.EUC_DEV703_ecrireStock_('2026-2027', m);
  assert.equal(Object.keys(k.EUC_DEV703_lireStock_('2026-2027')).length, 900);
  k.EUC_DEV703_ecrireStock_('2026-2027', { a: [1, 2] });
  assert.deepEqual(J(k.EUC_DEV703_lireStock_('2026-2027')), { a: [1, 2] });
  assert.deepEqual(Object.keys(k.props), ['Eucalyptus PFMP - distances domicile-stage 2026-2027.txt']);
});

test('page : section distance, bouton de calcul avec spinner, délai dépassé, lots répétés, aucune adresse affichée', () => {
  const h = read('apps-script/Statistiques_PFMP_DEV698.html');
  assert.match(h, /<h2>Distance domicile → lieu de stage \(en voiture\)<\/h2>/);
  assert.match(h, /btn\.disabled=true;btn\.innerHTML='<span class="spinner"><\/span>Calcul des distances…'/);
  assert.match(h, /const fin=function\(msg,err\)\{fini=true;clearTimeout\(tm\);btn\.disabled=false;btn\.textContent=old;/);
  assert.match(h, /setTimeout\(function\(\)\{if\(fini\)return;fin\('Le calcul a dépassé 2 minutes/);
  assert.match(h, /\.withFailureHandler\(function\(e\)\{if\(fini\)return;fin\('Erreur : '/);
  assert.match(h, /if\(c\.aCalculer&&d\.faits\)return lot\(\)/);
  assert.match(h, /EUC_DEV703_distances\(\{annee:an\}\)/); assert.match(h, /distances\(E\.conv\);/);
  assert.match(h, /tableau\('distListe',\['Élève','Classe','Période','Entreprise','Commune du lieu de stage','Distance \(km\)','Durée \(min\)'\]/);
  assert.doesNotMatch(h, /\.adresse\b|x\.o\b|x\.d\b/, 'aucune adresse côté page');
  const js = read('apps-script/EUC_DEV703_Distances.js');
  assert.doesNotMatch(js, /console\.|Logger\./, 'aucune adresse dans les journaux');
});
console.log(n + ' tests DEV703 réussis.');
