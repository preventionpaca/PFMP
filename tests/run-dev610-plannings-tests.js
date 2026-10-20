'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const sources = ['EUC_SUIVI2_Moteur.js', 'EUC_SUIVI2_Controle.js', 'EUC_DEV604_JeuTest.js', 'EUC_DEV610_Plannings.js'].map(f => read('apps-script/' + f)).join('\n');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const J = x => JSON.parse(JSON.stringify(x));

/* Calendrier officiel 2026-2027 (zone B) et prévisionnel 2027-2028, tels que saisis dans Vacances_Scolaires. */
const VAC = [
  ['2026-2027', 'Toussaint', '2026-10-17', '2026-11-01'], ['2026-2027', 'Noël', '2026-12-19', '2027-01-03'], ['2026-2027', 'Hiver', '2027-02-22', '2027-03-05'],
  ['2026-2027', 'Printemps', '2027-04-18', '2027-04-30'], ['2026-2027', "Pont de l'Ascension", '2027-05-06', '2027-05-07'], ['2026-2027', 'Été', '2027-07-03', '2027-08-31'],
  ['2027-2028', 'Toussaint', '2027-10-23', '2027-11-07', 1], ['2027-2028', 'Noël', '2027-12-18', '2028-01-02', 1], ['2027-2028', 'Hiver', '2028-02-05', '2028-02-20', 1],
  ['2027-2028', 'Printemps', '2028-04-08', '2028-04-23', 1], ['2027-2028', 'Été', '2028-07-08', '2028-08-31', 1]
];
const sec = iso => Math.round(Date.parse(iso + 'T00:00:00Z') / 1000);
const CLASSES = [[1, '1CAP CAR', '1CAP CAR'], [3, '1CAR', '1CAR'], [4, '1CIEL', '1CIEL'], [9, '1MVA1', '1MVA'], [10, '1MVA2', '1MVA'], [23, 'TCAP CAR', 'TCAP CAR'], [25, 'TCIEL', 'TCIEL'], [30, 'TMVA1', 'TMVA'], [31, 'TMVA2', 'TMVA'], [45, '1BTS MV', '1BTS MV'], [46, '2BTS MV', '2BTS MV'], [90, 'TEST PFMP', '1MVA'], [91, '1MVA3', '1MVA', false]];

function grist(opts) {
  opts = opts || {};
  const tables = {
    Annees_Scolaires: [{ id: 1, fields: { Code: '2026-2027', Date_debut: sec('2026-09-01'), Date_fin: sec('2027-08-31'), Active: true } }, { id: 2, fields: { Code: '2027-2028', Date_debut: sec('2027-09-01'), Date_fin: sec('2028-08-31'), Previsionnelle: true } }],
    /* Comme dans Grist : dates en texte ISO, années prévisionnelles décochées « Actif ». */
    Vacances_Scolaires: VAC.map((v, i) => ({ id: i + 1, fields: { Annee_scolaire: v[0], Nom_vacances: v[1], Date_debut: v[2], Date_fin: v[3], Previsionnel: !!v[4], Statut: v[4] ? 'Prévisionnel' : '', Actif: !v[4] } })).concat([{ id: 99, fields: { Annee_scolaire: '2026-2027', Nom_vacances: 'Ancienne saisie', Date_debut: '2026-10-05', Date_fin: '2026-10-09', Actif: false } }]),
    Classes: CLASSES.map(c => ({ id: c[0], fields: { Nom: c[1], Classe_PFMP: c[2], Actif: c[3] !== false } })),
    Types_Planning: [{ id: 1, fields: { Type: 'PFMP Tbac', Couleur: '#00C853' } }, { id: 2, fields: { Type: 'P.dif.', Couleur: '#C00000' } }, { id: 3, fields: { Type: 'BTS_STAGE', Libelle: 'Stage BTS', Couleur: '#FF00CC' } }, { id: 4, fields: { Type: 'PFMP 1ère', Couleur: '#00C890' } }],
    Planning_Periodes: (opts.periodes || []).map(J)
  };
  const calls = [], creees = [];
  const cols = { Planning_Periodes: { Annee_scolaire: 'Text', Type: 'Text', Date_debut: 'Date', Date_fin: 'Date', Classes_concernees: 'RefList:Classes', Classe: 'Ref:Classes', Classe_PFMP: 'Text', Formation: 'Text', Niveau: 'Text', Couleur: 'Text', Ligne_sheet: 'Int', Commentaire: 'Text', Actif: 'Bool', Duree_jour: 'Text' } };
  const k = {
    String, Number, Array, Object, JSON, Date, Math, Error, RegExp, console: { log() {} }, isFinite, isNaN,
    CacheService: { getScriptCache: () => { const c = {}; return { get: x => c[x] || null, put: (x, v) => { c[x] = v; }, removeAll() {} }; } },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createTemplateFromFile: () => ({ evaluate() { return { setTitle() { return { addMetaTag() { return this; } }; } }; } }) },
    EUC_PFMP_contexteAdmin_: () => opts.refuser ? null : { autorise: true, role: 'DDFPT', email: 'ddfpt@example.org' },
    EUC_DEV441_col_: (id, label, type) => ({ id, fields: { label, type: type || 'Text' } }),
    EUC_ENT_grist(method, p, body) {
      calls.push({ method, p, body: J(body || null) });
      if (p === '/tables' && method === 'get') return { tables: Object.keys(tables).map(id => ({ id })) };
      if (p === '/tables' && method === 'post') { body.tables.forEach(t => { tables[t.id] = []; creees.push(t.id); }); return {}; }
      const c = /^\/tables\/([^/]+)\/columns$/.exec(p); if (c) return { columns: Object.keys(cols[c[1]] || {}).map(id => ({ id, fields: { type: cols[c[1]][id] } })) };
      const m = /^\/tables\/([^/]+)\/records$/.exec(p); if (!m) return {};
      const t = tables[m[1]] = tables[m[1]] || [];
      if (method === 'get') return { records: J(t) };
      if (method === 'post') { const ids = body.records.map(r => { const id = 1000 + t.length; t.push({ id, fields: J(r.fields) }); return { id }; }); return { records: ids }; }
      if (method === 'patch') { body.records.forEach(r => Object.assign(t.find(x => x.id === r.id).fields, J(r.fields))); return {}; }
      throw new Error('méthode interdite ' + method);
    }
  };
  vm.createContext(k); vm.runInContext(sources, k);
  k.EUC_SUIVI2_aujourdhui_ = () => '2026-10-20';
  /* Les cellules RefList arrivent de Grist sous la forme ['L', …] : la lecture doit les comprendre. */
  return { k, tables, calls, creees };
}
const { k } = grist();
const lignesDefaut = () => k.EUC_DEV610_LIGNES_DEFAUT_.map((l, i) => ({ code: l[0], libelle: l[1], calendrier: l[2], groupe: l[3], profil: l[4], classePfmp: l[5], ordre: i, actif: true }));
const vac = annee => VAC.filter(v => v[0] === annee).map(v => ({ nom: v[1], debut: v[2], fin: v[3], previsionnel: !!v[4] }));
function calendrier(annee) { const y = Number(annee.slice(0, 4)), s = k.EUC_DEV610_semaines_(y + '-09-01', (y + 1) + '-08-31'); return { s, idx: k.EUC_DEV610_marquerVacances_(s, vac(annee)) }; }

test('semaines de l’année 2026-2027 : du lundi 31 août (S36) au lundi 30 août, numéros ISO', () => {
  const { s } = calendrier('2026-2027');
  assert.strictEqual(s.length, 53); assert.strictEqual(s[0].lundi, '2026-08-31'); assert.strictEqual(s[0].numero, 36); assert.strictEqual(s[0].vendredi, '2026-09-04');
  assert.strictEqual(s.find(x => x.lundi === '2027-01-04').numero, 1); assert.strictEqual(s.find(x => x.lundi === '2026-12-28').numero, 53);
});
test('vacances : Toussaint = S43-S44, été à partir de S27 ; le pont de l’Ascension ne noircit pas la semaine', () => {
  const { s, idx } = calendrier('2026-2027');
  assert.deepStrictEqual(J([s[idx.TOUSSAINT.premier].numero, s[idx.TOUSSAINT.dernier].numero]), [43, 44]);
  assert.strictEqual(s[idx.ETE.premier].numero, 27); assert.strictEqual(idx.ASCENSION, undefined);
  const asc = s.find(x => x.lundi === '2027-05-03'); assert.strictEqual(asc.vacances, ''); assert.deepStrictEqual(J(asc.jours), [{ nature: 'VACANCES', nom: 'ASCENSION', nb: 2 }]);
});
test('vacances nommées autrement : reconnues par leurs dates', () => {
  const t = (n, d, f) => k.EUC_DEV610_nomVacances_(n, d, f);
  assert.deepStrictEqual([t('3', '2026-10-17', '2026-11-01'), t('', '2026-12-19', '2027-01-03'), t('B1', '2027-02-22', '2027-03-05'), t('B2', '2027-04-18', '2027-04-30'), t('x', '2027-05-06', '2027-05-07'), t('', '2027-07-03', '2027-08-31'), t('Vacances de la Toussaint')], ['TOUSSAINT', 'NOEL', 'HIVER', 'PRINTEMPS', 'ASCENSION', 'ETE', 'TOUSSAINT']);
});
test('Terminale BAC PRO : 3 sem. avant la Toussaint, puis 3 sem. accolées au P.dif. collé avant l’hiver (dates publiées 2026-2027)', () => {
  const { s, idx } = calendrier('2026-2027');
  const r = k.EUC_DEV610_placer_(k.EUC_DEV610_reglesDefaut_('2026-2027').filter(x => x.profil === 'TBACPRO'), s, idx);
  assert.deepStrictEqual(J(r.alertes), []);
  assert.deepStrictEqual(J(r.periodes.map(p => [p.type, p.debut, p.fin])), [['PFMP Tbac', '2026-09-28', '2026-10-16'], ['PFMP Tbac', '2027-01-18', '2027-02-05'], ['P.dif.', '2027-02-08', '2027-02-19']]);
});
test('placement : écart, position « après », ancrage circulaire, vacances absentes, sortie d’année', () => {
  const { s, idx } = calendrier('2026-2027');
  let r = k.EUC_DEV610_placer_([{ numero: 1, type: 'PFMP 1ère', duree: 2, ancrage: 'NOEL', position: 'APRES', ecart: 1 }], s, idx);
  assert.deepStrictEqual(J([r.periodes[0].debut, r.periodes[0].fin]), ['2027-01-11', '2027-01-22']);
  r = k.EUC_DEV610_placer_([{ numero: 1, type: 'A', duree: 2, ancrage: 'REGLE', regleAncrage: 2 }, { numero: 2, type: 'B', duree: 2, ancrage: 'REGLE', regleAncrage: 1 }], s, idx);
  assert.strictEqual(r.periodes.length, 0); assert.ok(r.alertes.some(a => /circulaire/.test(a)));
  r = k.EUC_DEV610_placer_([{ numero: 1, type: 'A', duree: 2, ancrage: 'CARNAVAL' }], s, idx); assert.ok(/absentes/.test(r.alertes[0]));
  r = k.EUC_DEV610_placer_([{ numero: 1, type: 'A', duree: 3, ancrage: 'TOUSSAINT', ecart: 6 }], s, idx); assert.ok(/sort de l’année/.test(r.alertes[0]));
  r = k.EUC_DEV610_placer_([{ numero: 1, type: 'A', duree: 4, ancrage: 'NOEL', position: 'APRES', ecart: 6 }], s, idx); assert.ok(r.alertes.some(a => /chevauche les vacances \(HIVER\)/.test(a)));
  r = k.EUC_DEV610_placer_([{ numero: 1, type: 'A', duree: 3, ancrage: 'NOEL' }, { numero: 2, type: 'B', duree: 3, ancrage: 'NOEL', ecart: 1 }], s, idx); assert.ok(r.alertes.some(a => /se chevauchent/.test(a)));
});
test('règles initiales : la génération 2026-2027 retrouve les périodes publiées (1re, 2nde, CAP, BTS)', () => {
  const { s, idx } = calendrier('2026-2027');
  const g = k.EUC_DEV610_generer_(lignesDefaut(), k.EUC_DEV610_reglesDefaut_('2026-2027'), s, idx, []);
  const de = code => g.periodes.filter(p => p.ligne === code).map(p => p.type + ' ' + p.debut + ' ' + p.fin);
  assert.deepStrictEqual(J(de('1BP_MVA')), ['PFMP 1ère 2026-11-23 2026-12-18', 'PFMP 1ère 2027-03-22 2027-04-16']);
  assert.deepStrictEqual(J(de('2BP_REMI')), ['PFMP 2nde 2027-05-24 2027-07-02']);
  assert.deepStrictEqual(J(de('1CAP')), ['PFMP 1 CAP 2027-05-24 2027-07-02']);
  assert.deepStrictEqual(J(de('1BTS_CPI')), ['Stage BTS 2027-05-10 2027-07-02']);
  assert.deepStrictEqual(J(de('1BTS_CIEL')), ['Stage BTS 2027-05-24 2027-07-02']);
  assert.deepStrictEqual(J(de('2BTS_MV')), ['Stage BTS 2026-11-16 2026-12-18']);
  assert.deepStrictEqual(J(de('TCAP')), []); assert.deepStrictEqual(J(de('MIX_1BP')), []); assert.deepStrictEqual(J(de('TSEC')), []);
  assert.deepStrictEqual(J(g.alertes), ['CAP — 2e année (CAR) — 2 période(s) « PFMP T CAP » à placer à la main (3 et 4 semaines).']);
  assert.ok(g.periodes.every(p => k.EUC_DEV610_typeFormation_(p.type)));
});
test('N+1 sur dates prévisionnelles : les périodes suivent les vacances 2027-2028 sans ressaisie', () => {
  const { s, idx } = calendrier('2027-2028');
  const g = k.EUC_DEV610_generer_(lignesDefaut(), k.EUC_DEV610_reglesDefaut_('2027-2028'), s, idx, []);
  const tbp = g.periodes.filter(p => p.ligne === 'TBP_CIEL').map(p => p.debut + ' ' + p.fin);
  assert.deepStrictEqual(J(tbp), ['2027-10-04 2027-10-22', '2028-01-03 2028-01-21', '2028-01-24 2028-02-04']);
  assert.ok(s.some(x => x.previsionnel));
});
test('régénération : la reprise des types à règle est remplacée, le manuel (T CAP, grille) est conservé et jamais doublé', () => {
  const { s, idx } = calendrier('2026-2027'), lignes = lignesDefaut(), regles = k.EUC_DEV610_reglesDefaut_('2026-2027');
  const actuelles = [
    { ligne: '1BTS_MV', type: 'Stage BTS', debut: '2027-05-31', fin: '2027-07-02', origine: 'REPRISE' },
    { ligne: 'TCAP', type: 'PFMP TCAP', debut: '2027-03-15', fin: '2027-04-09', origine: 'REPRISE' },
    { ligne: 'TCAP', type: 'PFMP T CAP', debut: '2026-11-16', fin: '2026-12-04', origine: 'GRILLE' },
    { ligne: '1BP_CIEL', type: 'PFMP 1ère', debut: '2026-11-16', fin: '2026-12-11', origine: 'GRILLE' },
    { ligne: 'TSEC', type: 'ENT.', debut: '2026-11-16', fin: '2026-11-20', origine: 'GRILLE' }
  ];
  const g = k.EUC_DEV610_generer_(lignes, regles, s, idx, actuelles);
  const de = code => g.periodes.filter(p => p.ligne === code).map(p => [p.debut, p.origine]);
  assert.deepStrictEqual(J(de('1BTS_MV')), [['2027-06-07', 'REGLE']]);
  assert.deepStrictEqual(J(de('TCAP')), [['2026-11-16', 'GRILLE'], ['2027-03-15', 'REPRISE']]);
  assert.deepStrictEqual(J(de('1BP_CIEL')), [['2026-11-16', 'GRILLE'], ['2027-03-22', 'REGLE']]);
  assert.deepStrictEqual(J(de('TSEC')), [['2026-11-16', 'GRILLE']]);
  assert.ok(g.alertes.some(a => /1 BAC PRO — CIEL — période n°1 non replacée/.test(a)));
  assert.ok(!g.alertes.some(a => /T CAP/.test(a)), 'les deux T CAP sont placées');
  const c = g.changements.find(x => x.ligne === '1BTS_MV'); assert.strictEqual(c.nature, 'DEPLACEE'); assert.strictEqual(c.avant.debut, '2027-05-31');
  const again = k.EUC_DEV610_generer_(lignes, regles, s, idx, g.periodes); assert.strictEqual(again.changements.length, 0);
});
test('appel la première semaine de chaque période en entreprise, pas pendant le P.dif.', () => {
  const { s } = calendrier('2026-2027');
  const a = k.EUC_DEV610_appels_([{ ligne: 'X', type: 'PFMP Tbac', debut: '2026-09-28', fin: '2026-10-16' }, { ligne: 'X', type: 'P.dif.', debut: '2027-02-08', fin: '2027-02-19' }, { ligne: 'X', type: 'VISITE', debut: '2026-10-05', fin: '2026-10-09' }], s);
  assert.deepStrictEqual(J(a), [{ ligne: 'X', semaine: 4, debut: '2026-09-28', fin: '2026-10-02' }]);
});
test('rattachement proposé par Classe_PFMP : groupes 1MVA1 + 1MVA2, sans classe de test ni classe inactive', () => {
  const classes = CLASSES.map(c => ({ id: c[0], nom: c[1], classePfmp: c[2], actif: c[3] !== false }));
  assert.deepStrictEqual(J(k.EUC_DEV610_proposerClasses_({ classePfmp: '1MVA' }, classes)), [9, 10]);
  assert.deepStrictEqual(J(k.EUC_DEV610_proposerClasses_({ classePfmp: '' }, classes)), []);
  assert.deepStrictEqual(J(k.EUC_DEV610_proposerClasses_({ classePfmp: 'tcap car' }, classes)), [23]);
});
test('aperçu de publication : inchangé, déplacé, à créer, à désactiver ; hors périmètre jamais touché', () => {
  const lignes = lignesDefaut(), ratt = { TBP_MVA: [30, 31], '1BP_MVA': [9, 10], TCAP: [23], '1BTS_MV': [] };
  const existantes = [
    { id: 1, annee: '2026-2027', type: 'PFMP Tbac', debut: '2026-09-28', fin: '2026-10-16', classes: [30, 31] },
    { id: 2, annee: '2026-2027', type: 'PFMP Tbac', debut: '2027-01-11', fin: '2027-01-29', classes: [30, 31] },
    { id: 3, annee: '2026-2027', type: 'PFMP 1ère', debut: '2027-03-22', fin: '2027-04-16', classes: [9, 10] },
    { id: 4, annee: '2026-2027', type: 'VFMP', debut: '2026-09-23', fin: '2026-09-25', classes: [30, 31] },
    { id: 5, annee: '2026-2027', type: 'PFMP Tbac', debut: '2026-09-28', fin: '2026-10-16', classes: [77] },
    { id: 6, annee: '2025-2026', type: 'PFMP Tbac', debut: '2025-09-29', fin: '2025-10-17', classes: [30, 31] },
    { id: 7, annee: '2026-2027', type: 'PFMP TCAP', debut: '2027-03-15', fin: '2027-04-09', classes: [23] },
    { id: 8, annee: '2026-2027', type: 'PFMP Tbac', debut: '2026-09-28', fin: '2026-10-16', classes: [30, 9], actif: true }
  ];
  const version = { periodes: [
    { ligne: 'TBP_MVA', type: 'PFMP Tbac', debut: '2026-09-28', fin: '2026-10-16' }, { ligne: 'TBP_MVA', type: 'PFMP Tbac', debut: '2027-01-18', fin: '2027-02-05' }, { ligne: 'TBP_MVA', type: 'P.dif.', debut: '2027-02-08', fin: '2027-02-19' },
    { ligne: '1BP_MVA', type: 'PFMP 1ère', debut: '2026-11-23', fin: '2026-12-18' }, { ligne: '1BP_MVA', type: 'PFMP 1ère', debut: '2027-03-22', fin: '2027-04-16' },
    { ligne: '1BTS_MV', type: 'Stage BTS', debut: '2027-06-07', fin: '2027-07-02' }
  ] };
  const d = k.EUC_DEV610_diffPublication_(version, lignes, ratt, existantes, '2026-2027');
  assert.strictEqual(d.inchangees, 2);
  assert.deepStrictEqual(J(d.modifier.map(x => [x.id, x.avant.debut, x.debut])), [[2, '2027-01-11', '2027-01-18']]);
  assert.deepStrictEqual(J(d.creer.map(x => [x.ligne, x.type, x.debut, x.classes])), [['1BP_MVA', 'PFMP 1ère', '2026-11-23', [9, 10]], ['TBP_MVA', 'P.dif.', '2027-02-08', [30, 31]]]);
  assert.deepStrictEqual(J(d.desactiver.map(x => x.id)), [7]);
  assert.deepStrictEqual(J(d.sansClasse), ['1 BTS — MV']);
});
test('le code pur injecté dans la page s’évalue seul et calcule la même matrice', () => {
  const c = {}; vm.createContext(c); vm.runInContext(k.EUC_DEV610_codeClient_(), c);
  const s = c.EUC_DEV610_semaines_('2026-09-01', '2027-08-31'), idx = c.EUC_DEV610_marquerVacances_(s, vac('2026-2027'));
  const g = c.EUC_DEV610_generer_(lignesDefaut(), k.EUC_DEV610_reglesDefaut_('2026-2027'), s, idx, []);
  const ref = calendrier('2026-2027'); assert.deepStrictEqual(J(g.periodes), J(k.EUC_DEV610_generer_(lignesDefaut(), k.EUC_DEV610_reglesDefaut_('2026-2027'), ref.s, ref.idx, []).periodes));
});

test('chargement : tables créées une fois, lignes initiales, année N+1 choisie, règles initiales et vacances prévisionnelles', () => {
  const g = grist(); const r = g.k.EUC_DEV610_charger({});
  assert.deepStrictEqual(J(g.creees.sort()), ['EUC_PLAN_JOURS_PARTICULIERS', 'EUC_PLAN_LIGNES', 'EUC_PLAN_LIGNES_CLASSES', 'EUC_PLAN_REGLES', 'EUC_PLAN_VERSIONS']);
  assert.strictEqual(g.tables.EUC_PLAN_LIGNES.length, k.EUC_DEV610_LIGNES_DEFAUT_.length);
  assert.strictEqual(r.annee.code, '2027-2028'); assert.strictEqual(r.origineRegles, 'DEFAUT'); assert.ok(r.vacances.length === 5 && r.vacances.every(v => v.previsionnel));
  assert.deepStrictEqual(J(r.rattachements.TBP_MVA), [30, 31]); assert.strictEqual(r.publiees, 0);
  const r2 = g.k.EUC_DEV610_charger({ annee: '2026-2027' }); assert.strictEqual(r2.annee.code, '2026-2027'); assert.ok(r2.vacances.every(v => !v.previsionnel)); assert.strictEqual(r2.vacances.length, 6, 'une vacance décochée et non prévisionnelle est ignorée');
  assert.strictEqual(r2.vacances[0].debut, '2026-10-17');
  assert.ok(!g.calls.some(c => c.method === 'delete'));
  assert.throws(() => grist({ refuser: true }).k.EUC_DEV610_charger({}), /réservé/);
});
test('règles : contrôle de saisie, enregistrement par année, retrait par Actif = false, copie l’année suivante', () => {
  const g = grist(); g.k.EUC_DEV610_charger({});
  assert.throws(() => g.k.EUC_DEV610_enregistrerRegles({ annee: '2026-2027', regles: [{ profil: 'TBACPRO', numero: 1, duree: 0, ancrage: 'TOUSSAINT' }] }), /durée/);
  assert.throws(() => g.k.EUC_DEV610_enregistrerRegles({ annee: '2026-2027', regles: [{ profil: 'TBACPRO', numero: 1, duree: 3, ancrage: '' }] }), /ancrage/);
  assert.throws(() => g.k.EUC_DEV610_enregistrerRegles({ annee: '2026-2027', regles: [{ profil: 'X', numero: 1, duree: 3, ancrage: 'NOEL' }, { profil: 'X', numero: 1, duree: 3, ancrage: 'NOEL' }] }), /double/);
  const res = g.k.EUC_DEV610_enregistrerRegles({ annee: '2026-2027', regles: k.EUC_DEV610_reglesDefaut_('2026-2027') });
  assert.strictEqual(res.creees, k.EUC_DEV610_REGLES_DEFAUT_.length);
  const lues = g.k.EUC_DEV610_regles_('2026-2027'), garder = lues.filter(r => r.profil !== '2NDE');
  const res2 = g.k.EUC_DEV610_enregistrerRegles({ annee: '2026-2027', regles: garder });
  assert.strictEqual(res2.retirees, 1); assert.strictEqual(g.tables.EUC_PLAN_REGLES.find(r => r.fields.Profil === '2NDE').fields.Actif, false);
  const r = g.k.EUC_DEV610_charger({ annee: '2027-2028' }); assert.strictEqual(r.origineRegles, 'COPIE_2026-2027'); assert.ok(r.regles.every(x => x.id === 0 && x.annee === '2027-2028' && x.profil !== '2NDE'));
});
test('versions : création v1, mise à jour du brouillon, contrôle des dates, nouvelle version après publication', () => {
  const g = grist(); g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  const p = [{ ligne: 'TBP_MVA', type: 'PFMP Tbac', debut: '2026-09-28', fin: '2026-10-16', origine: 'REGLE', regle: 1 }];
  assert.throws(() => g.k.EUC_DEV610_enregistrerVersion({ annee: '2026-2027', periodes: [{ ligne: 'INCONNUE', type: 'X', debut: '2026-09-28', fin: '2026-10-02' }] }), /inconnue/);
  assert.throws(() => g.k.EUC_DEV610_enregistrerVersion({ annee: '2026-2027', periodes: [{ ligne: 'TBP_MVA', type: 'X', debut: '2026-10-02', fin: '2026-09-28' }] }), /invalides/);
  assert.throws(() => g.k.EUC_DEV610_enregistrerVersion({ annee: '2026-2027', periodes: [{ ligne: 'TBP_MVA', type: 'X', debut: '2027-09-06', fin: '2027-09-10' }] }), /sort de l’année/);
  const v1 = g.k.EUC_DEV610_enregistrerVersion({ annee: '2026-2027', numero: 0, periodes: p, commentaire: 'essai' });
  assert.deepStrictEqual(J([v1.numero, v1.creee, v1.base]), [1, true, 'OFFICIELLES']);
  const v1b = g.k.EUC_DEV610_enregistrerVersion({ annee: '2026-2027', numero: 1, periodes: p.concat([{ ligne: 'TBP_MVA', type: 'P.dif.', debut: '2027-02-08', fin: '2027-02-19', origine: 'GRILLE' }]) });
  assert.deepStrictEqual(J([v1b.numero, v1b.creee, v1b.periodes]), [1, false, 2]); assert.strictEqual(g.tables.EUC_PLAN_VERSIONS.length, 1);
  g.tables.EUC_PLAN_VERSIONS[0].fields.Statut = 'PUBLIE';
  const v2 = g.k.EUC_DEV610_enregistrerVersion({ annee: '2026-2027', numero: 1, periodes: p }); assert.deepStrictEqual(J([v2.numero, v2.creee]), [2, true]);
  assert.strictEqual(g.k.EUC_DEV610_enregistrerVersion({ annee: '2027-2028', numero: 0, periodes: [] }).base, 'PREVISIONNELLES');
});
test('reprise du calendrier publié : périodes en entreprise rattachées à une seule ligne, sans doublon, sans écriture', () => {
  const g = grist({ periodes: [
    { id: 1, fields: { Annee_scolaire: '2026-2027', Type: 'PFMP Tbac', Date_debut: sec('2026-09-28'), Date_fin: sec('2026-10-16'), Classes_concernees: ['L', 30, 31], Actif: true } },
    { id: 2, fields: { Annee_scolaire: '2026-2027', Type: 'PFMP Tbac', Date_debut: sec('2026-09-28'), Date_fin: sec('2026-10-16'), Classes_concernees: ['L', 30], Actif: true } },
    { id: 3, fields: { Annee_scolaire: '2026-2027', Type: 'VFMP', Date_debut: sec('2026-09-23'), Date_fin: sec('2026-09-25'), Classes_concernees: ['L', 30, 31], Actif: true } },
    { id: 4, fields: { Annee_scolaire: '2026-2027', Type: 'PFMP Tbac', Date_debut: sec('2026-09-28'), Date_fin: sec('2026-10-16'), Classes_concernees: ['L', 30, 9], Actif: true } },
    { id: 5, fields: { Annee_scolaire: '2026-2027', Type: 'PFMP TCAP', Date_debut: sec('2027-03-15'), Date_fin: sec('2027-04-09'), Classes_concernees: ['L', 23], Actif: false } }
  ] });
  g.k.EUC_DEV610_charger({ annee: '2026-2027' }); const avant = g.calls.filter(c => c.method !== 'get').length;
  const r = g.k.EUC_DEV610_reprendreExistant({ annee: '2026-2027' });
  assert.deepStrictEqual(J(r.periodes), [{ ligne: 'TBP_MVA', type: 'PFMP Tbac', debut: '2026-09-28', fin: '2026-10-16', origine: 'REPRISE', regle: null }]);
  assert.strictEqual(r.ignorees, 1); assert.strictEqual(g.calls.filter(c => c.method !== 'get').length, avant);
});
test('publication : confirmation, refus sur vacances prévisionnelles ou sans rattachement, écriture typée avec classes concernées', () => {
  const g = grist({ periodes: [
    { id: 50, fields: { Annee_scolaire: '2026-2027', Type: 'PFMP Tbac', Date_debut: sec('2027-01-11'), Date_fin: sec('2027-01-29'), Classes_concernees: ['L', 30, 31], Actif: true, Commentaire: 'ancien outil' } },
    { id: 51, fields: { Annee_scolaire: '2026-2027', Type: 'VFMP', Date_debut: sec('2026-09-23'), Date_fin: sec('2026-09-25'), Classes_concernees: ['L', 30, 31], Actif: true } }
  ] });
  g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  const p = [{ ligne: 'TBP_MVA', type: 'PFMP Tbac', debut: '2026-09-28', fin: '2026-10-16', origine: 'REGLE', regle: 1 }, { ligne: 'TBP_MVA', type: 'PFMP Tbac', debut: '2027-01-18', fin: '2027-02-05', origine: 'REGLE', regle: 2 }];
  g.k.EUC_DEV610_enregistrerVersion({ annee: '2026-2027', numero: 0, periodes: p });
  assert.throws(() => g.k.EUC_DEV610_publier({ annee: '2026-2027', numero: 1 }), /Confirmation/);
  assert.throws(() => g.k.EUC_DEV610_publier({ annee: '2026-2027', numero: 1, confirmation: 'PUBLIER' }), /rattachement/);
  const ap = g.k.EUC_DEV610_apercuPublication({ annee: '2026-2027', numero: 1 });
  assert.deepStrictEqual(J([ap.diff.creer.length, ap.diff.modifier.length, ap.diff.desactiver.length, ap.rattachementsEnregistres]), [1, 1, 0, false]);
  g.k.EUC_DEV610_enregistrerRattachements({ annee: '2026-2027', rattachements: { TBP_MVA: [30, 31, 999] } });
  assert.deepStrictEqual(J(g.tables.EUC_PLAN_LIGNES_CLASSES[0].fields.Classes), ['L', 30, 31]);
  const res = g.k.EUC_DEV610_publier({ annee: '2026-2027', numero: 1, confirmation: 'PUBLIER' });
  assert.deepStrictEqual(J([res.creees, res.modifiees, res.desactivees]), [1, 1, 0]);
  const cree = g.tables.Planning_Periodes.find(r => r.id >= 1000).fields;
  assert.deepStrictEqual(J(cree.Classes_concernees), ['L', 30, 31]); assert.strictEqual(cree.Date_debut, sec('2026-09-28')); assert.strictEqual(cree.Date_fin, sec('2026-10-16'));
  assert.strictEqual(cree.Annee_scolaire, '2026-2027'); assert.strictEqual(cree.Type, 'PFMP Tbac'); assert.strictEqual(cree.Classe_PFMP, 'TMVA'); assert.strictEqual(cree.Formation, 'T BAC PRO'); assert.strictEqual(cree.Niveau, 'MVA'); assert.strictEqual(cree.Ligne_sheet, 30); assert.strictEqual(cree.Couleur, '#00C853'); assert.match(cree.Commentaire, /Générateur de plannings — 2026-2027 v1/);
  const modif = g.tables.Planning_Periodes.find(r => r.id === 50).fields; assert.strictEqual(modif.Date_debut, sec('2027-01-18')); assert.strictEqual(modif.Commentaire, 'ancien outil');
  assert.strictEqual(g.tables.Planning_Periodes.find(r => r.id === 51).fields.Date_debut, sec('2026-09-23'));
  assert.strictEqual(g.tables.EUC_PLAN_VERSIONS[0].fields.Statut, 'PUBLIE');
  /* Le moteur du suivi reconnaît la période créée (R1–R7 : type, dates, année, classes concernées). */
  const pp = Object.assign({ id: 1001 }, cree); assert.ok(g.k.EUC_SUIVI2_typeFormation_(pp.Type)); assert.deepStrictEqual(J(g.k.EUC_SUIVI2_refs_(pp.Classes_concernees)), [30, 31]); assert.strictEqual(g.k.EUC_SUIVI2_date_(pp.Date_debut), '2026-09-28');
  const re = g.k.EUC_DEV610_apercuPublication({ annee: '2026-2027', numero: 1 }); assert.deepStrictEqual(J([re.diff.creer.length, re.diff.modifier.length, re.diff.inchangees]), [0, 0, 2]);
  g.k.EUC_DEV610_enregistrerVersion({ annee: '2027-2028', numero: 0, periodes: [{ ligne: 'TBP_MVA', type: 'PFMP Tbac', debut: '2027-10-04', fin: '2027-10-22' }] });
  g.k.EUC_DEV610_enregistrerRattachements({ annee: '2027-2028', rattachements: { TBP_MVA: [30, 31] } });
  assert.throws(() => g.k.EUC_DEV610_publier({ annee: '2027-2028', numero: 1, confirmation: 'PUBLIER' }), /prévisionnelles/);
  assert.ok(!g.calls.some(c => c.method === 'delete'));
});
test('jours particuliers : samedi travaillé en rattrapage, contrôle, retrait sans suppression', () => {
  const g = grist(); g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  assert.throws(() => g.k.EUC_DEV610_enregistrerJour({ annee: '2026-2027', date: '2027-02-06', nature: 'FERIE' }), /Nature/);
  g.k.EUC_DEV610_enregistrerJour({ annee: '2026-2027', date: '2027-02-06', nature: 'TRAVAILLE', libelle: 'Rattrapage du lundi de Pentecôte', heures: '4' });
  const j = g.k.EUC_DEV610_jours_('2026-2027'); assert.deepStrictEqual(J([j[0].date, j[0].nature, j[0].heures]), ['2027-02-06', 'TRAVAILLE', 4]);
  g.k.EUC_DEV610_enregistrerJour({ retirer: j[0].id }); assert.strictEqual(g.k.EUC_DEV610_jours_('2026-2027').length, 0);
});
test('page : route administrateur, lien d’accueil, fil d’Ariane canonique, boutons asynchrones protégés', () => {
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'plannings-pfmp':\s*return EUC_DEV610_afficher\(e\);/);
  assert.match(read('apps-script/Admin_PFMP.html'), /\?page=plannings-pfmp">Plannings annuels/);
  assert.ok(JSON.parse(read('scripts/pfmp-release-config.json')).routes.some(r => r.page === 'plannings-pfmp' && r.expected === 'Plannings annuels'));
  const h = read('apps-script/Plannings_DEV610.html');
  assert.match(h, /<nav class="ariane"[^>]*><a href="https:\/\/alternance\.loucodi\.fr\/" target="_top">Accueil PFMP<\/a> › <a href="<\?= adminBase \?>\?page=admin-pfmp" target="_top">Administration PFMP<\/a>/);
  assert.match(h, /<script><\?!= codeClient \?><\/script>/);
  assert.match(h, /function occupe\(btn,libelle,fn,arg,ok,delai\)\{\s*var orig=btn\.innerHTML,fini=false;btn\.disabled=true;btn\.innerHTML='<span class="spin"/);
  assert.match(h, /setTimeout\(function\(\)\{if\(fini\)return;fini=true;retablir\(\);message\('Délai dépassé : le serveur n’a pas répondu/);
  assert.match(h, /withFailureHandler\(function\(e\)\{if\(fini\)return;fini=true;clearTimeout\(t\);retablir\(\)/);
  for (const fn of ['EUC_DEV610_enregistrerRegles', 'EUC_DEV610_enregistrerRattachements', 'EUC_DEV610_enregistrerVersion', 'EUC_DEV610_apercuPublication', 'EUC_DEV610_publier', 'EUC_DEV610_enregistrerJour']) assert.match(h, new RegExp("occupe\\([^;]*'" + fn + "'"), fn);
  const directs = (h.match(/google\.script\.run/g) || []).length; assert.strictEqual(directs, 3, 'seuls occupe(), le chargement et la reprise appellent le serveur directement');
  assert.match(h, /confirmation:'PUBLIER'/); assert.match(h, /if\(!confirm\('Publier la version/);
  assert.match(h, /D\.previsionnel=prev;afficherAlertes\(\[\]\);\$\('changements'\)\.hidden=true;/, 'les alertes d’une autre année sont effacées au changement d’année');
  assert.match(h, /Aucune vacance trouvée pour/);
  assert.match(h, /@media print\{@page\{size:A3 landscape/); assert.match(h, /PRÉVISIONNEL/);
});

console.log(n + ' tests DEV610 plannings annuels réussis');
