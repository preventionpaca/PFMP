'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const sources = ['EUC_SUIVI2_Moteur.js', 'EUC_SUIVI2_Controle.js', 'EUC_DEV610_Plannings.js', 'EUC_DEV620_Epi.js', 'EUC_DEV621_Etiquettes.js'].map(f => read('apps-script/' + f)).join('\n');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const J = x => JSON.parse(JSON.stringify(x));
const sec = iso => Math.round(Date.parse(iso + 'T00:00:00Z') / 1000);

function grist(opts) {
  opts = opts || {};
  const tables = {
    Annees_Scolaires: [{ id: 1, fields: { Code: '2026-2027', Date_debut: sec('2026-09-01'), Date_fin: sec('2027-08-31'), Active: true } }],
    Classes: [{ id: 2, fields: { Nom: '1BTS CPRP', Actif: true } }],
    EUC_ELEVES_PFMP: [{ id: 11, fields: { Nom: 'VALENZA', Prenom: 'Arthur', Classe: ['R', 2], Annee_scolaire: '2026-2027', Actif: true } }],
    EUC_PROFESSEURS_PFMP: [{ id: 1, fields: { Nom: 'DUPONT', Prenom: 'Marc', Discipline: 'Génie mécanique', Actif: true } }],
    EUC_ENTREPRISES: [{ id: 5, fields: { Raison_sociale: 'ACME SAS', Enseigne: 'Acme' } }],
    EUC_CONTACTS_ENTREPRISES: [{ id: 7, fields: { Entreprise: ['R', 5], Nom: 'MARTIN', Prenom: 'Léa', Fonction: 'Tutrice', Type_contact: 'Tuteur', Actif: true } }]
  };
  const cols = {}, calls = [], cache = {};
  Object.keys(tables).forEach(t => { cols[t] = {}; tables[t].forEach(r => Object.keys(r.fields).forEach(f => { cols[t][f] = 'Any'; })); });
  const k = {
    String, Number, Array, Object, JSON, Date, Math, Error, RegExp, console: { log() {} }, isFinite, isNaN,
    CacheService: { getScriptCache: () => ({ get: x => cache[x] || null, put: (x, v) => { cache[x] = v; }, removeAll() {} }) },
    HtmlService: { createTemplateFromFile: () => ({ evaluate() { return { setTitle() { return { addMetaTag() { return this; } }; } }; } }) },
    EUC_PFMP_contexteAdmin_: () => opts.refuser ? null : { autorise: true, role: 'DDFPT', email: 'ddfpt@example.org' },
    EUC_DEV441_col_: (id, label, type) => ({ id, fields: { label, type: type || 'Text' } }),
    EUC_ENT_grist(method, p, body) {
      calls.push({ method, p });
      if (p === '/tables' && method === 'get') return { tables: Object.keys(tables).map(id => ({ id })) };
      if (p === '/tables' && method === 'post') { body.tables.forEach(t => { tables[t.id] = []; cols[t.id] = {}; t.columns.forEach(x => { cols[t.id][x.id] = x.fields.type; }); }); return {}; }
      const c = /^\/tables\/([^/]+)\/columns$/.exec(p);
      if (c && method === 'post') { body.columns.forEach(x => { cols[c[1]][x.id] = x.fields.type; }); return {}; }
      if (c) return { columns: Object.keys(cols[c[1]] || {}).map(id => ({ id, fields: { type: cols[c[1]][id] } })) };
      const m = /^\/tables\/([^/]+)\/records$/.exec(p); if (!m) return {};
      const t = tables[m[1]] = tables[m[1]] || [];
      if (method === 'get') return { records: J(t) };
      if (new Set(body.records.map(r => Object.keys(r.fields || {}).sort().join('|'))).size > 1) throw new Error('Grist 400 : colonnes différentes');
      body.records.forEach(r => Object.keys(r.fields || {}).forEach(f => { if (!(f in (cols[m[1]] || {}))) throw new Error('Grist 400 : colonne inconnue ' + m[1] + '.' + f); }));
      if (!/^EUC_ETQ_|^EUC_EPI_|^EUC_ADMINISTRATIFS$/.test(m[1])) throw new Error('écriture interdite dans ' + m[1]);
      if (method === 'post') return { records: body.records.map(r => { const id = 1000 + t.length; t.push({ id, fields: J(r.fields) }); return { id }; }) };
      if (method === 'patch') { body.records.forEach(r => Object.assign(t.find(x => x.id === r.id).fields, J(r.fields))); return {}; }
      throw new Error('méthode interdite');
    }
  };
  vm.createContext(k); vm.runInContext(sources, k);
  k.EUC_SUIVI2_aujourdhui_ = () => '2026-10-23';
  return { k, tables, calls };
}

test('chargement : formats en stock par défaut, personnes des cinq sources, aucune écriture hors des tables étiquettes', () => {
  const g = grist(), r = g.k.EUC_DEV621_charger({});
  assert.deepStrictEqual(J(r.formats.map(f => [f.nom, f.colonnes, f.rangees, f.largeur, f.hauteur])), [['Avery C2495 — 2 × 5 (95 × 48,5 mm)', 2, 5, 95, 48.5], ['Badge pochette — 2 × 4 (99,5 × 69,9 mm)', 2, 4, 99.5, 69.9]]);
  assert.deepStrictEqual(J(r.personnes.map(p => [p.source, p.nom, p.organisme || p.classe])), [['ELEVE', 'VALENZA', 'Lycée Les Eucalyptus'], ['PROF', 'DUPONT', 'Lycée Les Eucalyptus'], ['PARTENAIRE', 'MARTIN', 'Acme']]);
  for (const t of ['EUC_ETQ_FORMATS', 'EUC_ETQ_MODELES', 'EUC_ETQ_IMPORTS', 'EUC_ETQ_IMPRESSIONS', 'EUC_ADMINISTRATIFS']) assert.ok(g.tables[t], t);
});

test('formats : planche contrôlée contre la page, positions des étiquettes en millimètres', () => {
  const g = grist(), k = g.k, f = { largeurPage: 210, hauteurPage: 297, colonnes: 2, rangees: 5, margeGauche: 10, margeHaut: 21, espaceH: 0, espaceV: 3, largeur: 95, hauteur: 48.5 };
  assert.deepStrictEqual(J(k.EUC_DEV621_verifierFormat_(f)), []);
  assert.deepStrictEqual(J(k.EUC_DEV621_positions_(f).slice(0, 3)), [{ x: 10, y: 21 }, { x: 105, y: 21 }, { x: 10, y: 72.5 }]);
  assert.ok(/trop large/.test(k.EUC_DEV621_verifierFormat_(Object.assign({}, f, { largeur: 110 })).join()));
  k.EUC_DEV621_charger({});
  assert.throws(() => k.EUC_DEV621_enregistrerFormats({ formats: [{ nom: 'Trop haut', colonnes: 1, rangees: 10, largeur: 50, hauteur: 40, margeHaut: 0 }] }), /trop haute/);
  assert.deepStrictEqual(J(k.EUC_DEV621_enregistrerFormats({ formats: [{ nom: 'Pochette 90 × 55', colonnes: 2, rangees: 5, margeGauche: 15, margeHaut: 10, largeur: 90, hauteur: 55 }, { nom: '' }] })), { ok: true, creees: 1, modifiees: 0 });
});

test('modèle : zones contrôlées (champ, taille, alignement, rotation, police), fond PNG ou JPEG limité, valeur des champs', () => {
  const g = grist(), k = g.k, r = k.EUC_DEV621_charger({});
  assert.throws(() => k.EUC_DEV621_enregistrerModele({ nom: 'Badge', format: 999 }), /format/);
  assert.throws(() => k.EUC_DEV621_enregistrerModele({ nom: 'Badge', format: r.formats[1].id, fond: 'data:text/html;base64,AAAA' }), /PNG ou JPEG/);
  const res = k.EUC_DEV621_enregistrerModele({ nom: 'Concours', format: r.formats[1].id, fond: 'data:image/png;base64,iVBORw0KGgo=', zones: [{ champ: 'NOM', x: 10, y: 20, l: 80, taille: 500, gras: true, align: 'centre', rotation: 45, police: 'Comic' }, { champ: 'INCONNU', texte: 'Jury' }] });
  const m = k.EUC_DEV621_charger({}).modeles.find(x => x.id === res.id);
  assert.deepStrictEqual(J([m.zones[0].taille, m.zones[0].align, m.zones[0].rotation, m.zones[0].police, m.zones[1].champ]), [120, 'center', 0, 'Arial', 'TEXTE']);
  const p = { nom: 'Martin', prenom: 'Léa', organisme: 'Acme', role: 'Jury' };
  assert.deepStrictEqual(['NOM', 'PRENOM_NOM', 'ORGANISME', 'ROLE'].map(c => k.EUC_DEV621_valeurChamp_({ champ: c }, p)).concat([k.EUC_DEV621_valeurChamp_({ champ: 'TEXTE', texte: 'Invité' }, p)]), ['MARTIN', 'Léa MARTIN', 'Acme', 'Jury', 'Invité']);
});

test('import Excel mémorisé par lot ; étiquettes imprimées repérées par modèle', () => {
  const g = grist(), k = g.k; k.EUC_DEV621_charger({});
  assert.throws(() => k.EUC_DEV621_importer({ lot: '', lignes: [{ nom: 'A' }] }), /nom au lot/);
  assert.deepStrictEqual(J(k.EUC_DEV621_importer({ lot: 'Concours 6 mai', lignes: [{ nom: 'durand', prenom: 'Paul', organisme: 'Lycée X', role: 'Jury' }, { nom: '', prenom: '' }] })), { ok: true, importees: 1, lot: 'Concours 6 mai' });
  const imp = k.EUC_DEV621_charger({}).personnes.find(p => p.source === 'IMPORT');
  assert.deepStrictEqual(J([imp.nom, imp.lot, imp.role]), ['DURAND', 'Concours 6 mai', 'Jury']);
  k.EUC_DEV621_marquerImprimees({ modele: 3, cles: ['IMPORT:' + imp.id, 'n’importe quoi'] });
  assert.deepStrictEqual(J(Object.keys(k.EUC_DEV621_charger({}).imprimees[3])), ['IMPORT:' + imp.id]);
});

test('page : route, carte Administration, administratifs déplacés ici sans identification, impression en millimètres, boutons protégés', () => {
  const pg = read('apps-script/Etiquettes_DEV621.html'), routes = read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), adm = read('apps-script/Admin_PFMP.html'), cfg = read('scripts/pfmp-release-config.json');
  assert.ok(routes.includes("case 'etiquettes-pfmp':\n      return EUC_DEV621_afficher(e);") && cfg.includes('"page": "etiquettes-pfmp"'));
  assert.ok(adm.includes('<h2>Étiquettes et badges</h2>') && adm.includes('?page=etiquettes-pfmp&amp;onglet=pAdmin">Administratifs'));
  assert.ok(pg.includes('data-p="pAdmin"') && !pg.includes('Qui saisit'), 'administratifs sans fenêtre d’identification');
  for (const fn of ['EUC_DEV621_enregistrerModele', 'EUC_DEV621_enregistrerFormats', 'EUC_DEV621_importer', 'EUC_DEV621_marquerImprimees', 'EUC_DEV620_enregistrerAdministratifs']) assert.match(pg, new RegExp("occupe\\([^;]*'" + fn + "'"), fn);
  for (const x of ["@page{size:'+P.f.largeurPage+'mm '+P.f.hauteurPage+'mm;margin:0}", 'id="iDepart"', 'id="iNouvelles" checked', 'el.onpointerdown', 'href="https://alternance.loucodi.fr/" target="_top">Accueil PFMP</a>']) assert.ok(pg.includes(x), x);
  const g = grist({ refuser: true }); assert.throws(() => g.k.EUC_DEV621_charger({}));
});

console.log(n + ' tests DEV621 étiquettes réussis');
