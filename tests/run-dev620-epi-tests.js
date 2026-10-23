'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const sources = ['EUC_SUIVI2_Moteur.js', 'EUC_SUIVI2_Controle.js', 'EUC_DEV610_Plannings.js', 'EUC_DEV620_Epi.js'].map(f => read('apps-script/' + f)).join('\n');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const J = x => JSON.parse(JSON.stringify(x));
const sec = iso => Math.round(Date.parse(iso + 'T00:00:00Z') / 1000);

/* Grist simulé : tables, colonnes, création, refus d'une colonne inconnue et de lignes aux colonnes différentes. */
function grist(opts) {
  opts = opts || {};
  const tables = {
    Annees_Scolaires: [{ id: 1, fields: { Code: '2026-2027', Date_debut: sec('2026-09-01'), Date_fin: sec('2027-08-31'), Active: true } }],
    Classes: [[1, '1MVA', 'Scolaire'], [2, '1BTS CPRP', 'Scolaire'], [3, 'TEST PFMP', '']].map(c => ({ id: c[0], fields: { Nom: c[1], Classe_PFMP: c[1], Modalite_apprentissage: c[2], Actif: true } })),
    EUC_ELEVES_PFMP: [
      { id: 11, fields: { Nom: 'VALENZA', Prenom: 'Arthur', Classe: ['R', 2], Annee_scolaire: '2026-2027', Actif: true } },
      { id: 12, fields: { Nom: 'CAYUELA', Prenom: 'Basile', Classe: ['R', 2], Annee_scolaire: '2026-2027', Actif: true } },
      { id: 13, fields: { Nom: 'SORTI', Prenom: 'Paul', Classe: ['R', 2], Annee_scolaire: '2026-2027', Actif: true, Statut_scolarite: 'Sorti' } },
      { id: 14, fields: { Nom: 'ANCIEN', Prenom: 'Léa', Classe: ['R', 1], Annee_scolaire: '2025-2026', Actif: true } }
    ],
    EUC_PROFESSEURS_PFMP: [{ id: 1, fields: { Nom: 'DUPONT', Prenom: 'Marc', Actif: true } }]
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
      calls.push({ method, p, body: J(body || null) });
      if (p === '/tables' && method === 'get') return { tables: Object.keys(tables).map(id => ({ id })) };
      if (p === '/tables' && method === 'post') { body.tables.forEach(t => { tables[t.id] = []; cols[t.id] = {}; t.columns.forEach(x => { cols[t.id][x.id] = x.fields.type; }); }); return {}; }
      const c = /^\/tables\/([^/]+)\/columns$/.exec(p);
      if (c && method === 'post') { body.columns.forEach(x => { cols[c[1]][x.id] = x.fields.type; }); return {}; }
      if (c) return { columns: Object.keys(cols[c[1]] || {}).map(id => ({ id, fields: { type: cols[c[1]][id] } })) };
      const m = /^\/tables\/([^/]+)\/records$/.exec(p); if (!m) return {};
      const t = tables[m[1]] = tables[m[1]] || [];
      if (method === 'get') return { records: J(t) };
      if (new Set(body.records.map(r => Object.keys(r.fields || {}).sort().join('|'))).size > 1) throw new Error('Grist indisponible ou requête refusée (400).');
      body.records.forEach(r => Object.keys(r.fields || {}).forEach(f => { if (!(f in (cols[m[1]] || {}))) throw new Error('Grist indisponible ou requête refusée (400) : colonne inconnue ' + m[1] + '.' + f); }));
      if (/^Classes$|^EUC_ELEVES_PFMP$|^EUC_PROFESSEURS_PFMP$/.test(m[1])) throw new Error('écriture interdite dans ' + m[1]);
      if (method === 'post') return { records: body.records.map(r => { const id = 1000 + t.length; t.push({ id, fields: J(r.fields) }); return { id }; }) };
      if (method === 'patch') { body.records.forEach(r => Object.assign(t.find(x => x.id === r.id).fields, J(r.fields))); return {}; }
      throw new Error('méthode interdite ' + method);
    }
  };
  vm.createContext(k); vm.runInContext(sources, k);
  k.EUC_SUIVI2_aujourdhui_ = () => '2026-10-23';
  return { k, tables, calls, cols };
}

test('tables créées une fois avec pièces et tenues par défaut ; élèves de l’année, actifs et non sortis ; aucune écriture hors EPI', () => {
  const g = grist(), r = g.k.EUC_DEV620_charger({});
  assert.strictEqual(r.annee, '2026-2027');
  for (const t of ['EUC_EPI_PIECES', 'EUC_EPI_TENUES', 'EUC_EPI_CLASSES_TENUES', 'EUC_EPI_VAGUES', 'EUC_EPI_ESSAYAGES', 'EUC_ADMINISTRATIFS']) assert.ok(g.tables[t], t);
  assert.deepStrictEqual(J(r.pieces.map(p => p.code)), ['COMBINAISON', 'BLOUSON', 'PANTALON', 'BLOUSON_SANS_MANCHES', 'BLOUSE', 'CHAUSSURES']);
  assert.deepStrictEqual(J(r.pieces[0].tailles), ['1', '2', '3', '4']);
  assert.deepStrictEqual(J(r.tenues.find(t => t.code === 'BLOUSON_PANTALON').pieces), ['BLOUSON', 'PANTALON', 'CHAUSSURES']);
  assert.deepStrictEqual(J(r.eleves.map(e => e.nom)), ['CAYUELA', 'VALENZA']);
  assert.deepStrictEqual(J(r.classes.map(c => c.nom)), ['1BTS CPRP', '1MVA'], 'classe de test écartée');
  assert.deepStrictEqual(J(r.professeurs), ['DUPONT Marc']);
  g.k.EUC_DEV620_charger({}); assert.strictEqual(g.tables.EUC_EPI_PIECES.length, 6, 'défauts posés une seule fois');
});

test('essayage : vague et nom de la personne obligatoires, tailles contrôlées par la tenue, date et « saisi par » écrits, mise à jour sans doublon', () => {
  const g = grist(); g.k.EUC_DEV620_charger({});
  const v = g.k.EUC_DEV620_enregistrerVague({ annee: '2026-2027' }); assert.strictEqual(v.numero, 1);
  g.k.EUC_DEV620_enregistrerClassesTenues({ annee: '2026-2027', liens: { 2: 'BLOUSE' } });
  const ligne = { eleveId: 11, nom: 'VALENZA', prenom: 'Arthur', classeId: 2, tenue: 'BLOUSE', tailles: { BLOUSE: '3', CHAUSSURES: '42', COMBINAISON: '2' }, professeur: 'DUPONT Marc' };
  assert.throws(() => g.k.EUC_DEV620_enregistrerEssayages({ annee: '2026-2027', vague: 1, saisiPar: '', lignes: [ligne] }), /nom et votre prénom/);
  assert.throws(() => g.k.EUC_DEV620_enregistrerEssayages({ annee: '2026-2027', vague: 0, saisiPar: 'MARTIN Sabine', lignes: [ligne] }), /vague/);
  assert.throws(() => g.k.EUC_DEV620_enregistrerEssayages({ annee: '2026-2027', vague: 1, saisiPar: 'MARTIN Sabine', lignes: [Object.assign({}, ligne, { tailles: { BLOUSE: '9' } })] }), /hors grille/);
  const r = g.k.EUC_DEV620_enregistrerEssayages({ annee: '2026-2027', vague: 1, saisiPar: 'MARTIN Sabine', lignes: [ligne] });
  assert.deepStrictEqual(J([r.creees, r.modifiees]), [1, 0]);
  const e = g.tables.EUC_EPI_ESSAYAGES[0].fields;
  assert.deepStrictEqual(J([e.Eleve, e.Provisoire, e.Tenue, JSON.parse(e.Tailles), e.Saisi_par, e.Professeur]), [11, false, 'BLOUSE', { BLOUSE: '3', CHAUSSURES: '42' }, 'MARTIN Sabine', 'DUPONT Marc'], 'pièce hors tenue (combinaison) ignorée');
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(e.Date_saisie));
  const r2 = g.k.EUC_DEV620_enregistrerEssayages({ annee: '2026-2027', vague: 1, saisiPar: 'DUPONT Marc', lignes: [Object.assign({}, ligne, { tailles: { BLOUSE: '4', CHAUSSURES: '42' } })] });
  assert.deepStrictEqual(J([r2.creees, r2.modifiees, g.tables.EUC_EPI_ESSAYAGES.length, JSON.parse(g.tables.EUC_EPI_ESSAYAGES[0].fields.Tailles).BLOUSE]), [0, 1, 1, '4']);
  const c = g.k.EUC_DEV620_charger({}); assert.deepStrictEqual(J([c.essayages.length, c.liens[2].tenue, c.vagues[0].libelle]), [1, 'BLOUSE', 'Vague 1']);
  assert.ok(!g.calls.some(x => x.method === 'delete'));
});

test('élève hors Pronote : saisi avec nom, prénom et classe ou formation, puis rattaché à son dossier Pronote', () => {
  const g = grist(); g.k.EUC_DEV620_charger({}); g.k.EUC_DEV620_enregistrerVague({ annee: '2026-2027' });
  assert.throws(() => g.k.EUC_DEV620_enregistrerEssayages({ annee: '2026-2027', vague: 1, saisiPar: 'MARTIN Sabine', lignes: [{ eleveId: 0, nom: 'NOUVEAU', prenom: '', tenue: 'BLOUSE', tailles: {} }] }), /nom et prénom obligatoires/);
  g.k.EUC_DEV620_enregistrerEssayages({ annee: '2026-2027', vague: 1, saisiPar: 'MARTIN Sabine', lignes: [{ eleveId: 0, nom: 'PASSERELLE', prenom: 'Zoé', classeId: 2, classeTexte: '1BTS CPRP', tenue: 'BLOUSE', tailles: { BLOUSE: '2' } }] });
  const p = g.tables.EUC_EPI_ESSAYAGES[0];
  assert.deepStrictEqual(J([p.fields.Provisoire, p.fields.Eleve, p.fields.Nom]), [true, 0, 'PASSERELLE']);
  g.k.EUC_DEV620_rattacher({ id: p.id, eleveId: 12 });
  assert.deepStrictEqual(J([p.fields.Provisoire, p.fields.Eleve, p.fields.Nom, p.fields.Prenom]), [false, 12, 'CAYUELA', 'Basile']);
});

test('réglages : pièce et tenue ajoutées, pièce inconnue refusée, rien supprimé ; administratifs enregistrés, courriel contrôlé', () => {
  const g = grist(), r = g.k.EUC_DEV620_charger({});
  const pieces = J(r.pieces).map(p => Object.assign(p, { tailles: p.tailles.join(', ') })).concat([{ code: '', libelle: 'Gants', tailles: '7, 8, 9, 10' }]);
  assert.throws(() => g.k.EUC_DEV620_enregistrerReglages({ pieces, tenues: [{ libelle: 'Atelier', pieces: ['GANTS', 'CASQUE'] }] }), /pièce inconnue CASQUE/);
  g.k.EUC_DEV620_enregistrerReglages({ pieces, tenues: J(r.tenues).concat([{ libelle: 'Atelier', pieces: ['GANTS', 'CHAUSSURES'] }]) });
  /* Ligne ajoutée puis laissée vide : ignorée, jamais bloquante. */
  assert.ok(g.k.EUC_DEV620_enregistrerReglages({ pieces: pieces.concat([{ code: '', libelle: '', tailles: '' }]), tenues: J(r.tenues).concat([{ code: '', libelle: '', pieces: [] }]) }).ok);
  const c = g.k.EUC_DEV620_charger({});
  assert.deepStrictEqual(J([c.pieces.find(p => p.code === 'GANTS').tailles, c.tenues.find(t => t.code === 'ATELIER').pieces, c.pieces.length]), [['7', '8', '9', '10'], ['GANTS', 'CHAUSSURES'], 7]);
  assert.throws(() => g.k.EUC_DEV620_enregistrerAdministratifs({ lignes: [{ nom: 'BLANC', email: 'pas-un-courriel' }] }), /Courriel invalide/);
  g.k.EUC_DEV620_enregistrerAdministratifs({ lignes: [{ nom: 'BLANC', prenom: 'Anne', fonction: 'Secrétaire', email: 'anne.blanc@example.org' }, { nom: '', prenom: '' }] });
  assert.deepStrictEqual(J(g.k.EUC_DEV620_charger({}).administratifs.map(a => [a.nom, a.fonction, a.actif])), [['BLANC', 'Secrétaire', true]]);
});

test('calcul pur : grilles de tailles, contrôle par la tenue, promotion de l’étiquette selon la classe', () => {
  const g = grist(), k = g.k;
  assert.deepStrictEqual(J(k.EUC_DEV620_tailles_('s; m, L ,s')), ['S', 'M', 'L']);
  assert.deepStrictEqual(['1BTS CPRP', '2BTS MV', '2CAR', '1MVA', 'TMVA', '1CAP CAR', 'TCAP CAR'].map(c => k.EUC_DEV620_promotion_(c, '2026-2027')), ['2026-2028', '2025-2027', '2026-2029', '2025-2028', '2024-2027', '2026-2028', '2025-2027']);
});

test('page : route, carte Administration, fenêtre « nom et prénom » au démarrage, boutons asynchrones protégés', () => {
  const pg = read('apps-script/Epi_DEV620.html'), routes = read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), adm = read('apps-script/Admin_PFMP.html'), cfg = read('scripts/pfmp-release-config.json');
  assert.ok(routes.includes("case 'epi-pfmp':\n      return EUC_DEV620_afficher(e);"));
  assert.ok(adm.includes('?page=epi-pfmp">Essayage') && adm.includes('<h2>EPI et étiquettes</h2>'));
  assert.ok(cfg.includes('"page": "epi-pfmp"'));
  assert.ok(pg.includes('href="https://alternance.loucodi.fr/" target="_top">Accueil PFMP</a>'));
  for (const fn of ['EUC_DEV620_enregistrerEssayages', 'EUC_DEV620_enregistrerVague', 'EUC_DEV620_enregistrerReglages', 'EUC_DEV620_enregistrerClassesTenues', 'EUC_DEV620_enregistrerAdministratifs', 'EUC_DEV620_rattacher']) assert.match(pg, new RegExp("occupe\\([^;]*'" + fn + "'"), fn);
  assert.ok(pg.includes('demanderQui();charger(') && pg.includes("if(!QUI){demanderQui();return;}"), 'nom et prénom demandés au démarrage et avant tout enregistrement');
  const g = grist({ refuser: true }); assert.throws(() => g.k.EUC_DEV620_charger({}));
});

test('étiquettes fournisseur : libellés par défaut, noms de fichiers, ZIP lisible, JPEG 144 dpi, marquage des étiquettes produites', () => {
  const g = grist(), k = g.k;
  assert.deepStrictEqual(['1BTS CPRP', '2BTS MV', 'TCAP CAR', '1MVA'].map(c => k.EUC_DEV620_libelleEtiquette_(c)), ['BTS CPRP', 'BTS MV', 'CAP CAR', '1MVA']);
  assert.deepStrictEqual([k.EUC_DEV620_nomFichier_(2, 1, 43), k.EUC_DEV620_nomFichier_(2, 7, 120)], ['Vague2_01.jpg', 'Vague2_007.jpg']);
  assert.strictEqual(k.EUC_DEV620_crc32_(Buffer.from('123456789')), 0xCBF43926, 'CRC32 de référence');
  const zip = k.EUC_DEV620_zip_([{ nom: 'Vague1_01.jpg', data: new Uint8Array([1, 2, 3]) }, { nom: 'Vague1_02.jpg', data: new Uint8Array(Buffer.from('étiquette')) }]);
  const tmp = require('os').tmpdir() + '/dev620_test_' + process.pid + '.zip'; fs.writeFileSync(tmp, Buffer.from(zip));
  const lu = require('child_process').execFileSync('python3', ['-I', '-c', 'import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print("|".join(n+":"+z.read(n).decode("utf-8","replace") for n in z.namelist()))', tmp], { encoding: 'utf8' }).trim();
  fs.unlinkSync(tmp);
  assert.strictEqual(lu, 'Vague1_01.jpg:\u0001\u0002\u0003|Vague1_02.jpg:étiquette');
  const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  k.EUC_DEV620_jfif144_(jpeg); assert.deepStrictEqual(Array.from(jpeg.slice(13, 18)), [1, 0, 144, 0, 144]);
  k.EUC_DEV620_charger({}); k.EUC_DEV620_enregistrerVague({ annee: '2026-2027' });
  k.EUC_DEV620_enregistrerClassesTenues({ annee: '2026-2027', liens: { 2: { tenue: 'BLOUSE', libelle: 'BTS CPRP', promotion: '2026-2028' } } });
  assert.throws(() => k.EUC_DEV620_enregistrerClassesTenues({ annee: '2026-2027', liens: { 2: { tenue: 'BLOUSE', promotion: '2026' } } }), /Promotion/);
  k.EUC_DEV620_enregistrerEssayages({ annee: '2026-2027', vague: 1, saisiPar: 'MARTIN Sabine', lignes: [{ eleveId: 11, nom: 'VALENZA', prenom: 'Arthur', classeId: 2, tenue: 'BLOUSE', tailles: { BLOUSE: '3' } }] });
  const id = g.tables.EUC_EPI_ESSAYAGES[0].id;
  assert.throws(() => k.EUC_DEV620_marquerEtiquettes({ ids: [] }), /Aucune/);
  k.EUC_DEV620_marquerEtiquettes({ ids: [id], lot: 'Vague 1' });
  const c = k.EUC_DEV620_charger({});
  assert.deepStrictEqual(J([c.liens[2].libelle, c.liens[2].promotion, c.essayages[0].etiquetteLot, !!c.essayages[0].etiquetteLe]), ['BTS CPRP', '2026-2028', 'Vague 1', true]);
  const pg = read('apps-script/Epi_DEV620.html');
  for (const x of ['data-p="pEtiquettes"', 'function dessiner(x)', 'c.width=539;c.height=275', "EUC_DEV620_jfif144_(octets(", "occupe(b,'Marquage…','EUC_DEV620_marquerEtiquettes'", "tr.querySelector('.rx').onclick", 'id="modeleAdmin"', 'id="importAdmin" accept=".xlsx,.xls,.csv"', 'xlsx/0.18.5/xlsx.full.min.js', "Colonne « Nom » introuvable", 'id="qNouvelles" checked']) assert.ok(pg.includes(x), x);
});

console.log(n + ' tests DEV620 EPI réussis');
