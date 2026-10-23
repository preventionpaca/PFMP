'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const sources = ['EUC_SUIVI2_Moteur.js', 'EUC_SUIVI2_Controle.js', 'EUC_DEV604_JeuTest.js', 'EUC_DEV610_Logos.js', 'EUC_DEV610_Plannings.js'].map(f => read('apps-script/' + f)).join('\n');
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
  const calls = [], creees = [], cache = {}, refs = {}, formules = {};
  const cols = { Annees_Scolaires: { Code: 'Text', Libelle: 'Text', Date_debut: 'Date', Date_fin: 'Date', Zone: 'Text', Active: 'Bool', Commentaire: 'Text', Previsionnelle: 'Bool' }, Vacances_Scolaires: { Annee_scolaire: 'Text', Zone: 'Text', Nom_vacances: 'Text', Date_debut: 'Text', Date_fin: 'Text', Statut: 'Text', Commentaire: 'Text', Actif: 'Bool', Previsionnel: 'Bool' }, Planning_Periodes: { Annee_scolaire: 'Text', Type: 'Text', Date_debut: 'Date', Date_fin: 'Date', Classes_concernees: 'RefList:Classes', Classe: 'Ref:Classes', Classe_PFMP: 'Text', Formation: 'Text', Niveau: 'Text', Couleur: 'Text', Ligne_sheet: 'Int', Commentaire: 'Text', Actif: 'Bool', Duree_jour: 'Text' } };
  const k = {
    String, Number, Array, Object, JSON, Date, Math, Error, RegExp, console: { log() {} }, isFinite, isNaN,
    CacheService: { getScriptCache: () => ({ get: x => cache[x] || null, put: (x, v) => { cache[x] = v; }, removeAll() {} }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    HtmlService: { createTemplateFromFile: () => ({ evaluate() { return { setTitle() { return { addMetaTag() { return this; } }; } }; } }) },
    EUC_PFMP_contexteAdmin_: () => opts.refuser ? null : { autorise: true, role: 'DDFPT', email: 'ddfpt@example.org' },
    EUC_DEV441_col_: (id, label, type) => ({ id, fields: { label, type: type || 'Text' } }),
    EUC_ENT_grist(method, p, body) {
      calls.push({ method, p, body: J(body || null) });
      if (p === '/tables' && method === 'get') return { tables: Object.keys(tables).map(id => ({ id })) };
      if (p === '/tables' && method === 'post') { body.tables.forEach(t => { tables[t.id] = []; creees.push(t.id); cols[t.id] = {}; t.columns.forEach(x => { cols[t.id][x.id] = x.fields.type; }); }); return {}; }
      if (p === '/apply' && opts.refuserApply) throw new Error('Grist indisponible ou requête refusée (400).');
      if (p === '/tables/EUC_PLAN_LIGNES/records' && method === 'patch' && opts.refuserLignes) throw new Error('Grist indisponible ou requête refusée (400).');
      if (p === '/apply') { (opts.applies = opts.applies || []).push(J(body)); body.forEach(a => { if (a[0] === 'AddColumn') { cols[a[1]][a[2]] = a[3].type; refs[a[2]] = 900; } if (a[0] === 'ModifyColumn') { if (a[3].type) cols[a[1]][a[2]] = a[3].type; if (a[3].formula) formules[a[2]] = a[3]; } }); return {}; }
      const c = /^\/tables\/([^/]+)\/columns$/.exec(p); if (c && method === 'post') { body.columns.forEach(x => { (cols[c[1]] = cols[c[1]] || {})[x.id] = x.fields.type; }); return {}; }
      if (c) return { columns: Object.keys(cols[c[1]] || {}).map(id => ({ id, fields: Object.assign({ type: cols[c[1]][id] }, refs[id] && c[1] === 'Planning_Periodes' ? { colRef: refs[id] } : {}, formules[id] && c[1] === 'Planning_Periodes' ? { formula: formules[id].formula } : {}) })) };
      const m = /^\/tables\/([^/]+)\/records$/.exec(p); if (!m) return {};
      const t = tables[m[1]] = tables[m[1]] || [];
      if (method === 'get') return { records: J(t) };
      /* Comme Grist : toutes les lignes d'une requête portent les mêmes colonnes. */
      if ((method === 'post' || method === 'patch') && new Set(body.records.map(r => Object.keys(r.fields || {}).sort().join('|'))).size > 1) throw new Error('Grist indisponible ou requête refusée (400).');
      /* Comme Grist : une colonne inconnue d'une table du générateur est refusée (400). */
      const connues = Object.assign({}, cols[m[1]] || {}); t.forEach(x => Object.keys(x.fields || {}).forEach(f => { connues[f] = 1; }));
      if ((method === 'post' || method === 'patch') && /^EUC_PLAN_/.test(m[1]) && cols[m[1]]) body.records.forEach(r => Object.keys(r.fields || {}).forEach(f => { if (!(f in connues)) throw new Error('Grist indisponible ou requête refusée (400) : colonne inconnue ' + m[1] + '.' + f); }));
      if (method === 'post') { const ids = body.records.map(r => { const id = 1000 + t.length; t.push({ id, fields: J(r.fields) }); return { id }; }); return { records: ids }; }
      if (method === 'patch') { body.records.forEach(r => Object.assign(t.find(x => x.id === r.id).fields, J(r.fields))); return {}; }
      throw new Error('méthode interdite ' + method);
    }
  };
  vm.createContext(k); vm.runInContext(sources, k);
  k.EUC_SUIVI2_aujourdhui_ = () => '2026-10-20';
  /* Les cellules RefList arrivent de Grist sous la forme ['L', …] : la lecture doit les comprendre. */
  return { k, tables, calls, creees, opts, formules, cols };
}
const { k } = grist();
const lignesDefaut = () => k.EUC_DEV610_LIGNES_DEFAUT_.map((l, i) => ({ code: l[0], libelle: l[1], calendrier: l[2], groupe: l[3], profil: l[4], classePfmp: l[5], ordre: i, formation: l[7], niveau: l[8], actif: true }));
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
  /* Règle fixe : même saisi sur 3 jours ou plus (mercredi → vendredi), le pont ne fait jamais une semaine de vacances. */
  const s3 = k.EUC_DEV610_semaines_('2027-04-26', '2027-05-21'), i3 = k.EUC_DEV610_marquerVacances_(s3, [{ nom: 'Pont de l’Ascension', debut: '2027-05-05', fin: '2027-05-09' }]);
  const w = s3.find(x => x.lundi === '2027-05-03'); assert.strictEqual(w.vacances, ''); assert.deepStrictEqual(J(w.jours), [{ nature: 'VACANCES', nom: 'ASCENSION', nb: 3 }]); assert.strictEqual(i3.ASCENSION, undefined);
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
  assert.deepStrictEqual(J(de('1BTS_MV')), ['Stage BTS 2027-05-31 2027-07-02'], '1 BTS MV : 5 semaines avant l’été, comme le planning publié');
  assert.deepStrictEqual(J(de('TCAP')), []); assert.deepStrictEqual(J(de('MIX_1BP')), []); assert.deepStrictEqual(J(de('TSEC')), []);
  assert.deepStrictEqual(J(g.alertes), ['CAP — TCAP CAR — 2 période(s) « PFMP T CAP » à placer à la main (3 et 4 semaines).']);
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
    { ligne: '1BTS_MV', type: 'Stage BTS', debut: '2027-05-24', fin: '2027-06-25', origine: 'REPRISE' },
    { ligne: 'TCAP', type: 'PFMP TCAP', debut: '2027-03-15', fin: '2027-04-09', origine: 'REPRISE' },
    { ligne: 'TCAP', type: 'PFMP T CAP', debut: '2026-11-16', fin: '2026-12-04', origine: 'GRILLE' },
    { ligne: '1BP_CIEL', type: 'PFMP 1ère', debut: '2026-11-16', fin: '2026-12-11', origine: 'GRILLE' },
    { ligne: 'TSEC', type: 'ENT.', debut: '2026-11-16', fin: '2026-11-20', origine: 'GRILLE' }
  ];
  const g = k.EUC_DEV610_generer_(lignes, regles, s, idx, actuelles);
  const de = code => g.periodes.filter(p => p.ligne === code).map(p => [p.debut, p.origine]);
  assert.deepStrictEqual(J(de('1BTS_MV')), [['2027-05-31', 'REGLE']]);
  assert.deepStrictEqual(J(de('TCAP')), [['2026-11-16', 'GRILLE'], ['2027-03-15', 'REPRISE']]);
  assert.deepStrictEqual(J(de('1BP_CIEL')), [['2026-11-16', 'GRILLE'], ['2027-03-22', 'REGLE']]);
  assert.deepStrictEqual(J(de('TSEC')), [['2026-11-16', 'GRILLE']]);
  assert.ok(g.alertes.some(a => /1 BAC PRO — 1CIEL — période n°1 non replacée/.test(a)));
  assert.ok(!g.alertes.some(a => /T CAP/.test(a)), 'les deux T CAP sont placées');
  const c = g.changements.find(x => x.ligne === '1BTS_MV'); assert.strictEqual(c.nature, 'DEPLACEE'); assert.strictEqual(c.avant.debut, '2027-05-24');
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
test('aperçu de publication complète : toutes les lignes et tous les types, lignes existantes remises au propre sur place, en trop désactivées, non rattachées jamais touchées', () => {
  const lignes = lignesDefaut(), ratt = { TBP_MVA: [30, 31], '1BP_MVA': [9, 10], TCAP: [23], '1BTS_MV': [] };
  const types = { PFMPTBAC: { type: 'PFMP Tbac', couleur: '00c853' }, ENT: { type: 'ENT.', couleur: '#92D050' } };
  const L = c => lignes.find(l => l.code === c), propre = (c, type, d, f, cl) => k.EUC_DEV610_champsPropres_(L(c), { type, debut: d, fin: f }, cl, types);
  /* Ligne existante propre (comme écrite par l'application), éventuellement salie par une saisie à la main. */
  const ex = (id, c, type, d, f, cl, sale) => { const p = propre(c, type, d, f, cl); return { id, annee: '2026-2027', type: p.type, debut: d, fin: f, classes: cl, formation: p.formation, niveau: p.niveau,
    brut: Object.assign({ type: p.type, formation: p.formation, niveau: p.niveau, classePfmp: p.classePfmp, ligneSheet: 0, couleur: p.couleur, classes: cl }, sale || {}) }; };
  assert.deepStrictEqual(J(propre('TBP_MVA', 'pfmp  tbac', '2026-09-28', '2026-10-16', [31, 30])), { type: 'PFMP Tbac', debut: '2026-09-28', fin: '2026-10-16', classes: [30, 31], formation: L('TBP_MVA').formation, niveau: L('TBP_MVA').niveau, classePfmp: 'TMVA', ligneSheet: 0, ligneId: 0, couleur: '#00C853' });
  const existantes = [
    ex(1, 'TBP_MVA', 'PFMP Tbac', '2026-09-28', '2026-10-16', [30, 31]),
    ex(2, 'TBP_MVA', 'PFMP Tbac', '2027-01-11', '2027-01-29', [30, 31]),
    ex(3, '1BP_MVA', 'PFMP 1ère', '2027-03-22', '2027-04-16', [9, 10], { formation: ' 1 BAC PRO', niveau: 'MVA ' }),
    ex(4, 'TBP_MVA', 'VFMP', '2026-09-23', '2026-09-25', [30, 31]),
    { id: 5, annee: '2026-2027', type: 'PFMP Tbac', debut: '2026-09-28', fin: '2026-10-16', classes: [77] },
    ex(6, 'TBP_MVA', 'PFMP Tbac', '2025-09-29', '2025-10-17', [30, 31]),
    ex(7, 'TCAP', 'PFMP TCAP', '2027-03-15', '2027-04-09', [23]),
    { id: 8, annee: '2026-2027', type: 'PFMP Tbac', debut: '2026-09-28', fin: '2026-10-16', classes: [30, 9] },
    ex(9, 'TSEC', 'ENT.', '2026-11-16', '2026-11-20', [], { classePfmp: '', couleur: '#92d050' }),
    Object.assign(ex(10, 'TBP_MVA', 'PFMP Tbac', '2026-09-28', '2026-10-16', [30, 31]), { actif: false })
  ];
  existantes[5].annee = '2025-2026';
  const version = { periodes: [
    { ligne: 'TBP_MVA', type: 'PFMP Tbac', debut: '2026-09-28', fin: '2026-10-16' }, { ligne: 'TBP_MVA', type: 'PFMP Tbac', debut: '2027-01-18', fin: '2027-02-05' }, { ligne: 'TBP_MVA', type: 'P.dif.', debut: '2027-02-08', fin: '2027-02-19' },
    { ligne: '1BP_MVA', type: 'PFMP 1ère', debut: '2026-11-23', fin: '2026-12-18' }, { ligne: '1BP_MVA', type: 'PFMP 1ère', debut: '2027-03-22', fin: '2027-04-16' },
    { ligne: '1BTS_MV', type: 'Stage BTS', debut: '2027-06-07', fin: '2027-07-02' },
    { ligne: 'TSEC', type: 'ENT.', debut: '2026-11-16', fin: '2026-11-20' }, { ligne: 'TSEC', type: 'VISITE', debut: '2027-02-15', fin: '2027-02-19' },
    { ligne: 'TBP_MVA', type: 'Formation complémentaire', complement: '5 Star', debut: '2027-01-04', fin: '2027-01-08' }
  ] };
  const d = k.EUC_DEV610_diffPublication_(version, lignes, ratt, existantes, '2026-2027', { typesParCle: types, dossiers: { 7: 3, 3: 2 } });
  assert.strictEqual(d.inchangees, 1);
  assert.deepStrictEqual(J(d.modifier.map(x => [x.id, x.avant.debut, x.debut, x.ecarts, x.dossiers])), [[3, '2027-03-22', '2027-03-22', ['formation', 'niveau'], 2], [2, '2027-01-11', '2027-01-18', ['debut', 'fin'], 0], [9, '2026-11-16', '2026-11-16', ['classePfmp'], 0]]);
  assert.deepStrictEqual(J(d.modifier[0].niveau), L('1BP_MVA').niveau.trim(), 'espace retiré');
  assert.deepStrictEqual(J(d.creer.map(x => [x.ligne, x.type, x.debut, x.classes])), [['1BP_MVA', 'PFMP 1ère', '2026-11-23', [9, 10]], ['TBP_MVA', 'P.dif.', '2027-02-08', [30, 31]], ['TSEC', 'VISITE', '2027-02-15', []]]);
  assert.deepStrictEqual(J(d.desactiver.map(x => [x.id, x.dossiers])), [[4, 0], [7, 3]]);
  assert.deepStrictEqual(J(d.nonRattachees.map(x => [x.id, x.raison])), [[5, 'AUCUNE_LIGNE'], [8, 'PLUSIEURS_LIGNES']]);
  assert.deepStrictEqual(J(d.sansClasse), ['1 BTS — 1BTS MV']);
  /* Ligne sans classe rattachée : sa période existante n'est ni modifiée ni désactivée. */
  const e3 = k.EUC_DEV610_diffPublication_(version, lignes, ratt, existantes.concat([ex(11, '1BTS_MV', 'BTS_STAGE', '2027-05-31', '2027-06-25', [])]), '2026-2027', { typesParCle: types });
  assert.deepStrictEqual(J([e3.laissees.map(x => x.id), e3.desactiver.map(x => x.id)]), [[11], [4, 7]]);
  assert.ok(!JSON.stringify(d).includes('5 Star'), 'formation complémentaire jamais publiée');
  /* Colonne Classe_PFMP de type référence : jamais écrite, donc jamais un écart. */
  const r2 = k.EUC_DEV610_diffPublication_(version, lignes, ratt, existantes.map(e => e.brut ? Object.assign({}, e, { brut: Object.assign({}, e.brut, { classePfmp: '' }) }) : e), '2026-2027', { typesParCle: types, sansClassePfmp: true });
  assert.deepStrictEqual(J(r2.modifier.find(x => x.id === 9) || null), null); assert.strictEqual(r2.inchangees, 2);
});
test('le code pur injecté dans la page s’évalue seul et calcule la même matrice', () => {
  const c = {}; vm.createContext(c); vm.runInContext(k.EUC_DEV610_codeClient_(), c);
  const s = c.EUC_DEV610_semaines_('2026-09-01', '2027-08-31'), idx = c.EUC_DEV610_marquerVacances_(s, vac('2026-2027'));
  const g = c.EUC_DEV610_generer_(lignesDefaut(), k.EUC_DEV610_reglesDefaut_('2026-2027'), s, idx, []);
  const ref = calendrier('2026-2027'); assert.deepStrictEqual(J(g.periodes), J(k.EUC_DEV610_generer_(lignesDefaut(), k.EUC_DEV610_reglesDefaut_('2026-2027'), ref.s, ref.idx, []).periodes));
});

test('chargement : tables créées une fois, lignes initiales, année N+1 choisie, règles initiales et vacances prévisionnelles', () => {
  const g = grist(); const r = g.k.EUC_DEV610_charger({});
  assert.deepStrictEqual(J(g.creees.sort()), ['EUC_PLAN_COULEURS', 'EUC_PLAN_FORMATIONS', 'EUC_PLAN_HEURES', 'EUC_PLAN_JOURS_PARTICULIERS', 'EUC_PLAN_LIGNES', 'EUC_PLAN_LIGNES_CLASSES', 'EUC_PLAN_LOGOS', 'EUC_PLAN_PARAMETRES', 'EUC_PLAN_REGLES', 'EUC_PLAN_VERSIONS']);
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
  assert.throws(() => g.k.EUC_DEV610_enregistrerVersion({ annee: '2026-2027', periodes: [{ ligne: 'TBP_MVA', type: 'X', debut: '2027-12-06', fin: '2027-12-10' }] }), /sort de l’année/);
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
  assert.deepStrictEqual(J(r.periodes), [{ ligne: 'TBP_MVA', type: 'VFMP', debut: '2026-09-23', fin: '2026-09-25', origine: 'REPRISE', regle: null }, { ligne: 'TBP_MVA', type: 'PFMP Tbac', debut: '2026-09-28', fin: '2026-10-16', origine: 'REPRISE', regle: null }]);
  assert.strictEqual(r.ignorees, 1); assert.strictEqual(r.nonReprises[0].raison, 'PLUSIEURS_LIGNES'); assert.strictEqual(g.calls.filter(c => c.method !== 'get').length, avant);
  /* Bilan : chaque ligne Grist de l'année avec son résultat, sans écriture. */
  assert.deepStrictEqual(J(r.bilan.map(x => [x.id, x.statut, x.lignes || null, x.par || null, x.raison || null])), [
    [3, 'PLACEE', ['TBP_MVA'], 'CLASSES', null], [1, 'PLACEE', ['TBP_MVA'], 'CLASSES', null], [2, 'DOUBLON', ['TBP_MVA'], 'CLASSES', null],
    [4, 'NON_PLACEE', ['TBP_MVA', '1BP_MVA'], null, 'PLUSIEURS_LIGNES'], [5, 'INACTIVE', null, null, null]]);
});
test('reprise : période T CAP dont la classe est inactive ou non rattachée retrouvée par sa classe PFMP, détail des non reprises', () => {
  const lignes = lignesDefaut(), classesParId = { 23: { id: 23, nom: 'TCAP CAR', classePfmp: 'TCAP CAR', actif: false }, 30: { id: 30, nom: 'TMVA1', classePfmp: 'TMVA', actif: true }, 77: { id: 77, nom: 'TERM X', classePfmp: 'TX', actif: true } };
  assert.deepStrictEqual(J(k.EUC_DEV610_ligneDePeriode_({ classes: [23] }, {}, classesParId, lignes)), { ligne: 'TCAP', ajouts: [23], par: 'CLASSE_PFMP' });
  assert.deepStrictEqual(J(k.EUC_DEV610_ligneDePeriode_({ classes: [30] }, { 30: 'TBP_MVA' }, classesParId, lignes)), { ligne: 'TBP_MVA', ajouts: [], par: 'CLASSES' });
  assert.deepStrictEqual(J(k.EUC_DEV610_ligneDePeriode_({ classes: [], classePfmp: 'TCAP CAR' }, {}, classesParId, lignes)), { ligne: 'TCAP', ajouts: [], par: 'TEXTE_CLASSE_PFMP' });
  assert.strictEqual(k.EUC_DEV610_ligneDePeriode_({ classes: [77] }, {}, classesParId, lignes).raison, 'AUCUNE_LIGNE');
  assert.strictEqual(k.EUC_DEV610_ligneDePeriode_({ classes: [] }, {}, classesParId, lignes).raison, 'SANS_CLASSE');
  const g = grist({ periodes: [
    { id: 1, fields: { Annee_scolaire: '2026-2027', Type: 'PFMP T CAP', Date_debut: sec('2026-11-16'), Date_fin: sec('2026-12-04'), Classes_concernees: ['L', 23], Actif: true, Formation: 'CAP', Niveau: 'T CA' } },
    { id: 2, fields: { Annee_scolaire: '2026-2027', Type: 'PFMP TCAP', Date_debut: sec('2027-03-15'), Date_fin: sec('2027-04-09'), Classes_concernees: ['L', 23], Actif: true } },
    { id: 3, fields: { Annee_scolaire: '2026-2027', Type: 'PFMP 1ère', Date_debut: sec('2026-11-23'), Date_fin: sec('2026-12-18'), Classes_concernees: ['L', 555], Actif: true, Formation: '1 BAC PRO', Niveau: 'MP3' } },
    { id: 4, fields: { Annee_scolaire: '2026-2027', Type: 'PFMP 1ère', Date_debut: sec('2026-11-23'), Date_fin: sec('2026-12-18'), Classes_concernees: ['L', 555], Actif: true, Formation: '1 BAC PRO', Niveau: 'XYZ' } }
  ] });
  g.tables.Classes.find(c => c.id === 23).fields.Actif = false;
  g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  const r = g.k.EUC_DEV610_reprendreExistant({ annee: '2026-2027' });
  assert.deepStrictEqual(J(r.periodes.map(p => [p.ligne, p.type, p.debut])), [['1BP_MP3D', 'PFMP 1ère', '2026-11-23'], ['TCAP', 'PFMP T CAP', '2026-11-16'], ['TCAP', 'PFMP TCAP', '2027-03-15']]);
  assert.deepStrictEqual(J(r.suggestions), { TCAP: [23] });
  assert.deepStrictEqual(J(r.nonReprises.map(x => [x.id, x.raison, x.classes, x.niveau])), [[4, 'AUCUNE_LIGNE', ['#555'], 'XYZ']]);
  const { s, idx } = calendrier('2026-2027'), gen = k.EUC_DEV610_generer_(lignesDefaut(), k.EUC_DEV610_reglesDefaut_('2026-2027'), s, idx, J(r.periodes));
  assert.ok(!gen.alertes.some(a => /T CAP/.test(a)), 'les T CAP reprises ne sont plus « à placer à la main »');
});
test('reprise des mixités et classes entières par Formation / Niveau (colonnes A et B), quelle que soit la ligne de l’ancienne feuille ; classes de test écartées', () => {
  const lignes = lignesDefaut();
  const L = (f, n) => k.EUC_DEV610_ligneParLibelles_({ formation: f, niveau: n }, lignes);
  assert.deepStrictEqual(J(k.EUC_DEV610_lignesParLibelles_({ formation: '1BTS CPI-CPRP', niveau: 'Mixité' }, lignes)), ['MIX_1BTS_CPI', 'MIX_1BTS_CPRP'], 'ligne séparée : les deux lignes');
  assert.deepStrictEqual([L('1BTS MV', 'Mixité'), L('2BTS CPI-CPRP', 'Mixité'), L('2BTS MV', 'Mixité'), L('1 BAC PRO', 'Mixité'), L('CAP Connexe', 'CP'), L('CAP', 'CP'), L('Ducretet', 'TSEC'), L('BACHELOR', 'IP'), L('1BTS', 'MV'), L('1 BAC PRO', 'MP3'), L('X', 'Mixité'), L('', '')], ['MIX_1BTS_MV', 'MIX_2BTS_CPI', 'MIX_2BTS_MV', 'MIX_1BP', 'CAP_PEINTRE', 'CAP_PEINTRE', 'TSEC', 'BACHELOR_IP', '1BTS_MV', '1BP_MP3D', '', '']);
  const g = grist({ periodes: [
    { id: 280, fields: { Annee_scolaire: '2026-2027', Type: 'Stage BTS', Formation: '1BTS MV', Niveau: 'Mixité', Ligne_sheet: 41, Date_debut: sec('2027-05-31'), Date_fin: sec('2027-08-31'), Actif: true } },
    { id: 291, fields: { Annee_scolaire: '2026-2027', Type: 'ENT.', Formation: '1BTS MV', Niveau: 'Mixité', Ligne_sheet: 42, Date_debut: sec('2026-10-12'), Date_fin: sec('2026-10-16'), Actif: true } },
    { id: 289, fields: { Annee_scolaire: '2026-2027', Type: 'VISITE', Formation: '2BTS CPI-CPRP', Niveau: 'Mixité', Ligne_sheet: 42, Date_debut: sec('2026-12-14'), Date_fin: sec('2026-12-18'), Actif: true } },
    { id: 74, fields: { Annee_scolaire: '2026-2027', Type: 'VISITE', Formation: 'CAP', Niveau: 'CP', Date_debut: sec('2026-12-16'), Date_fin: sec('2026-12-18'), Actif: true } },
    { id: 400, fields: { Annee_scolaire: '2026-2027', Type: 'PFMP', Formation: 'TEST PFMP', Date_debut: sec('2026-10-26'), Date_fin: sec('2026-11-20'), Classes_concernees: ['L', 90], Actif: true } }
  ] });
  g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  const r = g.k.EUC_DEV610_reprendreExistant({ annee: '2026-2027' });
  assert.deepStrictEqual(J(r.periodes.map(p => [p.ligne, p.type, p.debut])).sort(), [['CAP_PEINTRE', 'VISITE', '2026-12-16'], ['MIX_1BTS_MV', 'ENT.', '2026-10-12'], ['MIX_1BTS_MV', 'Stage BTS', '2027-05-31'], ['MIX_2BTS_CPI', 'VISITE', '2026-12-14'], ['MIX_2BTS_CPRP', 'VISITE', '2026-12-14']]);
  assert.strictEqual(r.tests, 1); assert.strictEqual(r.ignorees, 0);
  const b = id => r.bilan.find(x => x.id === id);
  assert.deepStrictEqual(J([b(400).statut, b(289).statut, b(289).lignes, b(289).par, b(74).par]), ['TEST', 'PLACEE', ['MIX_2BTS_CPI', 'MIX_2BTS_CPRP'], 'LIBELLES', 'LIBELLES']);
});
test('calibrage de Planning_Periodes : aperçu sans écriture, colonne Ligne_planning, recopie Formation/Niveau/Ligne_sheet, Type en liste, cas douteux jamais écrits', () => {
  const g = grist({ periodes: [
    { id: 280, fields: { Annee_scolaire: '2026-2027', Type: 'Stage BTS', Formation: '1BTS MV', Niveau: 'Mixité', Ligne_sheet: 41, Date_debut: sec('2027-05-31'), Date_fin: sec('2027-08-31'), Actif: true } },
    { id: 369, fields: { Annee_scolaire: '2026-2027', Type: 'ENT.', Formation: '1BTS MV', Niveau: 'Mixité', Ligne_sheet: 42, Date_debut: sec('2026-10-12'), Date_fin: sec('2026-10-16'), Actif: true } },
    { id: 330, fields: { Annee_scolaire: '2026-2027', Type: 'Visite', Formation: '2BTS CPI-CPRP', Niveau: 'Mixité', Ligne_sheet: 42, Date_debut: sec('2026-11-02'), Date_fin: sec('2026-11-06'), Actif: true } },
    { id: 284, fields: { Annee_scolaire: '2026-2027', Type: 'PFMP TCAP', Formation: 'CAP', Niveau: 'T CA', Ligne_sheet: 9, Date_debut: sec('2027-03-15'), Date_fin: sec('2027-04-09'), Classes_concernees: ['L', 23], Actif: true } },
    { id: 74, fields: { Annee_scolaire: '2026-2027', Type: 'VISITE', Formation: 'CAP', Niveau: 'CP', Date_debut: sec('2026-12-16'), Date_fin: sec('2026-12-18'), Actif: true } },
    { id: 500, fields: { Annee_scolaire: '2026-2027', Type: 'ENT.', Formation: 'Inconnue', Niveau: 'Mixité', Date_debut: sec('2026-12-16'), Date_fin: sec('2026-12-18'), Actif: true } }
  ] });
  g.tables.Types_Planning.push({ id: 9, fields: { Type: 'VISITE' } }, { id: 10, fields: { Type: 'PFMP T CAP' } }, { id: 11, fields: { Type: 'ENT.' } });
  g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  const ecritures = () => g.calls.filter(c => c.method !== 'get' && (/Planning_Periodes/.test(c.p) || (c.p === '/apply' && JSON.stringify(c.body).includes('Planning_Periodes')))).length;
  const ap = g.k.EUC_DEV610_calibrer({});
  assert.strictEqual(ap.apercu, true); assert.strictEqual(ecritures(), 0, 'l’aperçu n’écrit rien');
  assert.deepStrictEqual(J(ap.douteux.map(x => x.id)), [500]);
  assert.deepStrictEqual(J(ap.typesChanges), { 'Visite → VISITE': 1, 'PFMP TCAP → PFMP T CAP': 1 });
  assert.ok(ap.schema.some(x => /Ligne_planning/.test(x)) && ap.schema.some(x => /Type/.test(x)));
  assert.strictEqual(g.k.EUC_DEV610_calibrer({ confirmation: 'NON' }).apercu, true); assert.strictEqual(ecritures(), 0, 'sans confirmation CALIBRER, rien n’est écrit');
  const r = g.k.EUC_DEV610_calibrer({ confirmation: 'CALIBRER' });
  assert.strictEqual(r.apercu, false);
  const a = J(g.opts.applies).filter(x => JSON.stringify(x).includes('Planning_Periodes'));
  assert.deepStrictEqual(a[0], [['AddColumn', 'Planning_Periodes', 'Ligne_planning', { type: 'Ref:EUC_PLAN_LIGNES', isFormula: false, label: 'Ligne de planning' }]]);
  assert.deepStrictEqual(a[1], [['SetDisplayFormula', 'Planning_Periodes', null, 900, '$Ligne_planning.Libelle']]);
  const mod = a[2]; assert.deepStrictEqual(mod.slice(0, 3).map(x => [x[2], x[3].formula, x[3].recalcWhen, x[3].recalcDeps]), [['Formation', '$Ligne_planning.Formation if $Ligne_planning and $Ligne_planning.Formation else value', 1, ['L', 900]], ['Niveau', '$Ligne_planning.Niveau if $Ligne_planning and $Ligne_planning.Niveau else value', 1, ['L', 900]], ['Ligne_sheet', '$Ligne_planning.Ligne_sheet if $Ligne_planning and $Ligne_planning.Ligne_sheet else value', 1, ['L', 900]]]);
  assert.strictEqual(mod[3][2], 'Type'); assert.strictEqual(mod[3][3].type, 'Choice'); const choix = JSON.parse(mod[3][3].widgetOptions).choices; assert.ok(choix.includes('VISITE') && choix.includes('Stage BTS') && choix.includes('PFMP T CAP') && !choix.includes('Visite'));
  const f = id => g.tables.Planning_Periodes.find(x => x.id === id).fields, L = code => g.tables.EUC_PLAN_LIGNES.find(x => x.fields.Code === code).id;
  assert.deepStrictEqual([f(369).Ligne_planning, f(369).Ligne_sheet, f(369).Formation], [L('MIX_1BTS_MV'), 41, '1BTS MV']);
  assert.deepStrictEqual([f(330).Ligne_planning, f(330).Type, f(330).Ligne_sheet], [L('MIX_2BTS_CPI'), 'VISITE', 42]);
  /* Mixité CPI-CPRP séparée : une copie est créée pour CPRP, avec sa propre ligne et les mêmes dates. */
  assert.deepStrictEqual(J(ap.copies.map(x => [x.source, x.ligne])), [[330, '2BTS CPRP Mixité']]);
  const copie = g.tables.Planning_Periodes.find(x => x.fields.Ligne_planning === L('MIX_2BTS_CPRP'));
  assert.deepStrictEqual([copie.fields.Type, copie.fields.Date_debut, copie.fields.Annee_scolaire, copie.fields.Formation, copie.fields.Niveau], ['VISITE', sec('2026-11-02'), '2026-2027', '2BTS CPI-CPRP', 'Mixité']);
  assert.match(copie.fields.Commentaire, /Copie de la période #330/); assert.strictEqual(r.copiees, 1);
  assert.deepStrictEqual([f(284).Ligne_planning, f(284).Type], [L('TCAP'), 'PFMP T CAP']);
  assert.deepStrictEqual([f(74).Ligne_planning, f(74).Formation, f(74).Niveau, f(74).Ligne_sheet], [L('CAP_PEINTRE'), 'CAP Connexe', 'CP', 10]);
  assert.strictEqual(f(500).Ligne_planning, undefined); assert.strictEqual(f(500).Formation, 'Inconnue');
  assert.ok(!g.calls.some(c => c.method === 'delete'));
  /* Deuxième passage : structure en place, plus rien à modifier ; la reprise lit Ligne_planning en priorité. */
  const r2 = g.k.EUC_DEV610_calibrer({}); assert.deepStrictEqual([r2.schema.filter(x => /Ligne_planning|Recopier/.test(x)).length, r2.aCorriger, r2.douteux.length], [0, 0, 1]);
  f(369).Formation = 'Autre chose'; f(369).Niveau = 'X';
  const rep = g.k.EUC_DEV610_reprendreExistant({ annee: '2026-2027' }); assert.ok(rep.periodes.some(p => p.ligne === 'MIX_1BTS_MV' && p.debut === '2026-10-12'));
});
test('organisation du tableau : ordre et groupes enregistrés, nouvelle classe proposée à sa place, Calendrier en liste, rien de supprimé', () => {
  const lignes = lignesDefaut().map((l, i) => Object.assign({ ordre: (i + 1) * 10 }, l));
  const p = k.EUC_DEV610_ligneProposee_({ id: 777, nom: '1MELEC2', classePfmp: '1MELEC2', etab: 'LP' }, lignes);
  assert.deepStrictEqual([p.calendrier, p.groupe, p.profil, p.apres], ['SCOLAIRE', '1 BAC PRO', '1BACPRO', '1BP_MELEC']);
  const pg = k.EUC_DEV610_ligneProposee_({ nom: 'TPEEB 21', classePfmp: 'TPEEB 21', etab: 'GRETA', modalite: 'Classe entière', gestionnaire: 'GRETA', donneur: 'GRETA' }, lignes);
  assert.deepStrictEqual(J([pg.calendrier, pg.groupe, pg.organismes, pg.libelle]), ['CLASSE_ENTIERE', 'Formation en alternance et continue', ['GRETA'], 'TPEEB 21']);
  assert.strictEqual(k.EUC_DEV610_ligneProposee_({ nom: 'CAP X', classePfmp: 'CAP X', etab: 'CFA', modalite: 'Classe entière' }, lignes).calendrier, 'CLASSE_ENTIERE');
  assert.strictEqual(k.EUC_DEV610_nouveauCode_('1 BAC PRO — Élec 2', ['1_BAC_PRO_ELEC_2']), '1_BAC_PRO_ELEC_2_2');
  const g = grist(); const r = g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  assert.ok(g.opts.applies.some(a => a[0][0] === 'ModifyColumn' && a[0][2] === 'Calendrier' && JSON.parse(a[0][3].widgetOptions).choices.join() === 'SCOLAIRE,MIXITE,CLASSE_ENTIERE'));
  assert.deepStrictEqual(J(r.calendriers), ['SCOLAIRE', 'MIXITE', 'CLASSE_ENTIERE']); assert.deepStrictEqual(J(r.organismes), ['CFA RAN', 'CFAI', 'GRETA', 'Ducretet']);
  const org = J(r.lignes).sort((a, b) => a.ordre - b.ordre), i = org.findIndex(l => l.code === 'MIX_TBP'), mix = org.splice(i, 1)[0];
  org.splice(org.findIndex(l => l.code === 'TBP_CIEL'), 0, mix);
  org.push({ id: 0, libelle: '1 BAC PRO — 1MELEC2', groupe: '1 BAC PRO', calendrier: 'SCOLAIRE', classePfmp: '1MELEC2', profil: '1BACPRO', formation: '1 BAC PRO', niveau: 'MELEC2', actif: true });
  org.find(l => l.code === 'TPMMA').actif = false;
  assert.throws(() => g.k.EUC_DEV610_enregistrerOrganisation({ lignes: org.map(l => Object.assign({}, l, l.code === 'TSEC' ? { calendrier: 'FC' } : {})) }), /calendrier/);
  assert.throws(() => g.k.EUC_DEV610_enregistrerOrganisation({ lignes: org.map(l => Object.assign({}, l, l.code === 'TSEC' ? { groupe: '' } : {})) }), /groupe/);
  const res = g.k.EUC_DEV610_enregistrerOrganisation({ lignes: org });
  assert.deepStrictEqual([res.creees, res.desactivees], [1, 0]);
  const lu = g.k.EUC_DEV610_lignes_(), codes = lu.map(l => l.code);
  assert.strictEqual(codes.indexOf('MIX_TBP') + 1, codes.indexOf('TBP_CIEL'), 'la mixité est placée juste avant CIEL');
  assert.strictEqual(lu[lu.length - 1].code, '1MELEC2'); assert.strictEqual(lu[lu.length - 1].profil, '1BACPRO');
  assert.strictEqual(lu.find(l => l.code === 'TPMMA').actif, false);
  const sans = org.filter(l => l.code !== 'CQPM_ASC'); const res2 = g.k.EUC_DEV610_enregistrerOrganisation({ lignes: sans.concat([]) .map(l => l.id ? l : Object.assign({}, l, { id: lu.find(x => x.code === '1MELEC2').id })) });
  assert.strictEqual(res2.desactivees, 1); assert.strictEqual(g.k.EUC_DEV610_lignes_().find(l => l.code === 'CQPM_ASC').actif, false);
  assert.ok(!g.calls.some(c => c.method === 'delete'));
  const h = read('apps-script/Plannings_DEV610.html');
  for (const t of ['data-p="pOrganisation"', 'draggable="true"', "addEventListener('drop'", "occupe(this,'Enregistrement…','EUC_DEV610_enregistrerOrganisation'", 'Ajouter au tableau', 'function etiquette(l)']) assert.ok(h.includes(t), t);
});
test('chargement robuste : un refus de Grist sur la liste Calendrier ou la mise à jour des lignes ne bloque pas la page', () => {
  const g = grist({ refuserApply: true }); const r = g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  assert.strictEqual(r.annee.code, '2026-2027'); assert.strictEqual(r.lignes.length, k.EUC_DEV610_LIGNES_DEFAUT_.length); assert.deepStrictEqual(J(r.avertissements), []);
  const g2 = grist(); g2.k.EUC_DEV610_charger({}); g2.tables.EUC_PLAN_LIGNES.forEach(x => { x.fields.Version_modele = 1; }); g2.k.CacheService.getScriptCache().put('EUC_DEV610_TABLES3', '');
  const g3 = grist({ refuserLignes: true }); g3.tables.EUC_PLAN_LIGNES = J(g2.tables.EUC_PLAN_LIGNES);
  const r3 = g3.k.EUC_DEV610_charger({ annee: '2026-2027' });
  assert.strictEqual(r3.annee.code, '2026-2027'); assert.ok(/mise à jour des lignes de planning/.test(r3.avertissements[0]), r3.avertissements[0]);
});
test('mise au modèle 2 : lignes de la première version remplacées (TPEEB unique désactivée, mixités CPI et CPRP séparées, GRETA dans « Formation continue et alternance »), lignes modifiées dans la page respectées', () => {
  const g = grist();
  g.tables.EUC_PLAN_LIGNES = [
    { id: 1, fields: { Code: 'TBP_MVA', Libelle: 'T BAC PRO — MVA', Calendrier: 'SCOLAIRE', Groupe: 'T BAC PRO', Classe_PFMP: 'TMVA', Ordre: 10, Actif: true } },
    { id: 2, fields: { Code: 'TPEEB', Libelle: 'TPEEB', Calendrier: 'FC_ALTERNANCE', Groupe: 'Formation continue et alternance', Classe_PFMP: 'TPEEB', Ordre: 20, Actif: true } },
    { id: 3, fields: { Code: 'MIX_1BTS_CPI_CPRP', Libelle: '1 BTS CPI-CPRP — Mixité', Calendrier: 'MIXITE', Groupe: '1 BTS', Ordre: 30, Actif: true } },
    { id: 4, fields: { Code: 'TSEC', Libelle: 'Mon TSEC', Calendrier: 'CLASSE_ENTIERE', Groupe: 'Mon groupe', Classe_PFMP: 'TSEC', Ordre: 40, Version_modele: 2, Actif: true } },
    { id: 5, fields: { Code: 'PERSO', Libelle: 'Classe ajoutée', Calendrier: 'SCOLAIRE', Groupe: 'X', Ordre: 50, Actif: true } }
  ];
  const r = g.k.EUC_DEV610_charger({ annee: '2026-2027' }), l = c => r.lignes.find(x => x.code === c);
  assert.deepStrictEqual(J([l('TBP_MVA').libelle, l('TBP_MVA').etablissement, l('TBP_MVA').formation, l('TBP_MVA').niveau]), ['TMVA', 'LP', 'T BAC PRO', 'MVA']);
  assert.strictEqual(l('TPEEB').actif, false); assert.strictEqual(l('MIX_1BTS_CPI_CPRP').actif, false);
  assert.deepStrictEqual(J([l('MIX_1BTS_CPI').libelle, l('MIX_1BTS_CPRP').organismes, l('MIX_1BTS_MV').organismes, l('MIX_TBP').organismes]), ['1BTS CPI Mixité', ['CFAI'], ['CFA RAN'], ['CFA RAN']]);
  assert.deepStrictEqual(J([l('TPEEB_19').calendrier, l('TPEEB_19').groupe, l('1MELEC_G').organismes, l('CQPM_ASC').organismes, l('BACHELOR_IP').etablissement]), ['CLASSE_ENTIERE', 'Formation en alternance et continue', ['GRETA'], ['GRETA', 'CFAI'], 'LGT']);
  assert.deepStrictEqual(J([l('TSEC').libelle, l('TSEC').groupe]), ['Mon TSEC', 'Mon groupe'], 'ligne enregistrée depuis la page : jamais écrasée');
  assert.strictEqual(l('PERSO').actif, true, 'une ligne ajoutée à la main reste active');
  assert.ok(!r.lignes.some(x => x.actif && x.calendrier === 'GRETA'));
});
test('formations de l’année : dates de début et de fin, titres ; années et vacances saisies dans la page, prévisionnelles comprises, jamais supprimées', () => {
  const g = grist(); g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  assert.throws(() => g.k.EUC_DEV610_enregistrerFormation({ annee: '2026-2027', ligne: 'BACHELOR_IP', debut: '2026-10-09', fin: '2026-10-01' }), /suivre/);
  assert.throws(() => g.k.EUC_DEV610_enregistrerFormation({ annee: '2026-2027', ligne: 'INCONNUE' }), /inconnue/);
  g.k.EUC_DEV610_enregistrerFormation({ annee: '2026-2027', ligne: 'BACHELOR_IP', debut: '2026-10-09', fin: '2027-09-30', titre: 'Formation Bachelor IP', sousTitre: 'Formation en alternance · LGT · CFAI' });
  g.k.EUC_DEV610_enregistrerFormation({ annee: '2026-2027', ligne: 'BACHELOR_IP', debut: '2026-10-09', fin: '2027-09-17', titre: 'Formation Bachelor IP' });
  const fo = g.k.EUC_DEV610_charger({ annee: '2026-2027' }).formations.BACHELOR_IP;
  assert.deepStrictEqual(J([fo.debut, fo.fin, fo.titre, fo.sousTitre]), ['2026-10-09', '2027-09-17', 'Formation Bachelor IP', '']); assert.strictEqual(g.tables.EUC_PLAN_FORMATIONS.length, 1);
  assert.throws(() => g.k.EUC_DEV610_enregistrerAnnee({ code: '2029-2031' }), /format/);
  assert.strictEqual(g.k.EUC_DEV610_enregistrerAnnee({ code: '2028-2029', previsionnelle: true }).creee, true);
  const a = g.tables.Annees_Scolaires.find(x => x.fields.Code === '2028-2029').fields; assert.deepStrictEqual([a.Date_debut, a.Date_fin, a.Previsionnelle, a.Active], [sec('2028-09-01'), sec('2029-08-31'), true, false]);
  assert.throws(() => g.k.EUC_DEV610_enregistrerVacances({ annee: '2030-2031', vacances: [] }), /inconnue/);
  assert.throws(() => g.k.EUC_DEV610_enregistrerVacances({ annee: '2028-2029', vacances: [{ nom: 'Toussaint', debut: '2028-11-05', fin: '2028-10-21' }] }), /invalides/);
  g.k.EUC_DEV610_enregistrerVacances({ annee: '2028-2029', vacances: [{ nom: 'Toussaint', debut: '2028-10-21', fin: '2028-11-05', previsionnel: true, commentaire: 'Rotation estimée' }, { nom: 'Noël', debut: '2028-12-23', fin: '2029-01-07', previsionnel: true }] });
  let r = g.k.EUC_DEV610_charger({ annee: '2028-2029' }); assert.deepStrictEqual(J(r.vacances.map(v => [v.nom, v.debut, v.previsionnel])), [['Toussaint', '2028-10-21', true], ['Noël', '2028-12-23', true]]);
  const tous = r.toutesVacances.filter(v => v.annee === '2028-2029'), t = tous.find(v => v.nom === 'Toussaint');
  g.k.EUC_DEV610_enregistrerVacances({ annee: '2028-2029', vacances: [Object.assign({}, t, { debut: '2028-10-14', fin: '2028-10-29', previsionnel: false })] });
  r = g.k.EUC_DEV610_charger({ annee: '2028-2029' }); assert.deepStrictEqual(J(r.vacances.map(v => [v.nom, v.debut, v.previsionnel])), [['Toussaint', '2028-10-14', false]]);
  assert.strictEqual(g.tables.Vacances_Scolaires.find(x => x.fields.Nom_vacances === 'Noël' && x.fields.Annee_scolaire === '2028-2029').fields.Actif, false, 'retirée, pas supprimée');
  assert.strictEqual(g.tables.Annees_Scolaires.find(x => x.fields.Code === '2028-2029').fields.Previsionnelle, false);
  assert.ok(!g.calls.some(c => c.method === 'delete'));
  const h = read('apps-script/Plannings_DEV610.html');
  for (const t of ['data-p="pAnnees"', "'EUC_DEV610_enregistrerVacances'", "'EUC_DEV610_enregistrerAnnee'", "'EUC_DEV610_enregistrerFormation'", 'Proposer d’après l’année précédente', 'class="pf" data-fe=', "c:'hors'", "'<th class=\"hc\" colspan=\"2\">H / P</th>'", 'Total annuel <b>', 'Formation en alternance', 'Formation continue', 'Ce calendrier de formation est donné à titre indicatif', "ufa:['#E46C0A'", "va:['#9a9a9a'", 'function couleurH(e)', "<td'+couleurH(e)+att+t+'>", 'table.a32c td.k-we{background:#6b6b6b', 'tr.an th{background:#1b396a', "ent:['#92D050'", "vi:['#00B0F0'", "ap:['#7F00FF'", "cs:['#2342D9'", "fe:['#DA9694'", "!=='ETE')return {c:'va'"]) assert.ok(h.includes(t), t);
  assert.doesNotMatch(h, /if\(fe\[s\.i\]\.ferme\)cls\+=' fe'/, 'plus d’allusion aux fériés dans les cases du planning');
  assert.ok(read('apps-script/Admin_PFMP.html').includes('&amp;onglet=pAnnees">Années et vacances'));
});
test('calendrier d’une formation (annexe 32a) : nature de chaque jour selon la charte du CFA', () => {
  const h = read('apps-script/Plannings_DEV610.html'), c = {};
  const code = h.match(/function evenement\(.*/)[0] + '\n' + h.match(/function natureJour\(e\)\{[\s\S]*?return 'blanc';\}/)[0];
  vm.createContext(c); vm.runInContext(k.EUC_DEV610_codeClient_() + '\n' + code, c);
  const N = e => c.natureJour(e);
  assert.deepStrictEqual([N({ c: 'fe' }), N({ c: 'we' }), N({ c: 'va' }), N({ c: '', lycee: true }), N({ c: '', entreprise: true, p: { type: 'ENT.' } }), N({ c: '', entreprise: true, evp: { type: 'VISITE' } }), N({ c: '', lycee: true, evp: { type: 'CONSEIL' } }), N({ c: '', evp: { type: 'APPEL TEL' } }), N({ c: '', evp: { type: 'EXAMENS' } }), N({ c: 'hors' }), N({ c: 'blanc' }), N({ c: '', comp: true })],
    ['fe', 'we', 'va', 'ufa', 'ent', 'vi', 'cs', 'ap', 'ex', 'blanc', 'blanc', 'comp']);
  /* Petites vacances toujours visibles (modèle 32a), même si le jeune est en entreprise ; été : la période s'affiche. */
  vm.runInContext(h.match(/function etatJour\(iso,l,pers,fo\)\{[\s\S]*?return \{c:'',lycee:true,ev:ev,evp:evp\};\}/)[0], c);
  c.D = { jours: [], vacances: [], toutesVacances: [{ nom: 'Noël', debut: '2026-12-19', fin: '2027-01-03' }, { nom: 'Été', debut: '2027-07-03', fin: '2027-08-31' }] }; c.FERIES = {};
  const pers = [{ ligne: 'MIX_1BP', type: 'ENT.', debut: '2026-12-21', fin: '2026-12-24' }, { ligne: 'MIX_1BP', type: 'ENT.', debut: '2027-07-05', fin: '2027-07-30' }];
  const E = iso => N(c.etatJour(iso, { code: 'MIX_1BP' }, pers, {}));
  assert.deepStrictEqual([E('2026-12-22'), E('2026-12-29'), E('2027-07-07'), E('2027-08-10')], ['va', 'va', 'ent', 'blanc']);
  /* Colonne H : jamais la couleur des vacances ni d'un événement ; vert en entreprise (vacances comprises), orange en cours, gris sinon. */
  vm.runInContext(h.match(/var CHARTE=\{[^\n]*\};/)[0], c);
  vm.runInContext(h.match(/function couleurH\(e\)\{[\s\S]*?return ' style="background:#bfbfbf;color:#333"';\}/)[0], c);
  const H = iso => c.couleurH(c.etatJour(iso, { code: 'MIX_1BP' }, pers, {}));
  assert.ok(/#92D050/.test(H('2026-12-22')), 'vacances en entreprise : H vert');
  assert.ok(/#bfbfbf/.test(H('2026-12-29')), 'vacances sans période : H gris');
  assert.ok(/#6b6b6b/.test(H('2026-12-26')), 'week-end : gris foncé');
  assert.ok(/#E46C0A/.test(c.couleurH({ c: '', lycee: true, evp: { type: 'VISITE' } })), 'jour de cours avec visite : H orange, pas la couleur de la visite');
});
test('calendrier d’une formation : intitulé du diplôme, périodes après l’été, logos (porteur à gauche, lycée à droite)', () => {
  const g = grist({ periodes: [
    { id: 900, fields: { Annee_scolaire: '2027-2028', Type: 'ENT.', Formation: 'BACHELOR', Niveau: 'IP', Date_debut: sec('2027-09-20'), Date_fin: sec('2027-10-01'), Actif: true } },
    { id: 901, fields: { Annee_scolaire: '2027-2028', Type: 'ENT.', Formation: 'BACHELOR', Niveau: 'IP', Date_debut: sec('2028-01-10'), Date_fin: sec('2028-01-14'), Actif: true } }
  ] });
  g.tables.Classes.push({ id: 60, fields: { Nom: 'Bachelor IP', Classe_PFMP: 'Bachelor IP', Actif: true } });
  g.tables.EUC_CLASSES_DIPLOMES_PFMP = [{ id: 1, fields: { Classe: 60, Intitule_diplome: 'Bachelor intégration des procédés', Actif: true } }, { id: 2, fields: { Classe: 9, Intitule_diplome: 'Bac pro MVA', Actif: true } }, { id: 3, fields: { Classe: 10, Intitule_diplome: 'Bac pro MVA', Actif: true } }];
  const r = g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  assert.strictEqual(r.diplomes.BACHELOR_IP, 'Bachelor intégration des procédés'); assert.strictEqual(r.diplomes['1BP_MVA'], 'Bac pro MVA');
  assert.deepStrictEqual(J(r.suite.map(p => [p.ligne, p.debut])), [['BACHELOR_IP', '2027-09-20']], 'seuls les trois premiers mois de l’année suivante');
  g.k.EUC_DEV610_enregistrerVersion({ annee: '2026-2027', numero: 0, periodes: [{ ligne: 'BACHELOR_IP', type: 'ENT.', debut: '2027-10-04', fin: '2027-10-08' }] });
  assert.throws(() => g.k.EUC_DEV610_enregistrerVersion({ annee: '2026-2027', numero: 0, periodes: [{ ligne: 'BACHELOR_IP', type: 'ENT.', debut: '2027-12-06', fin: '2027-12-10' }] }), /sort de l’année/);
  assert.throws(() => g.k.EUC_DEV610_enregistrerLogo({ organisme: 'Inconnu', image: '' }), /inconnu/);
  assert.throws(() => g.k.EUC_DEV610_enregistrerLogo({ organisme: 'CFAI', image: 'data:image/gif;base64,AAAA' }), /PNG ou JPEG/);
  g.k.EUC_DEV610_enregistrerLogo({ organisme: 'CFAI', image: 'data:image/png;base64,iVBORw0KGgo=' });
  g.k.EUC_DEV610_enregistrerLogo({ organisme: 'CFAI', image: 'data:image/png;base64,iVBORw0KGgoAAAA=' });
  assert.strictEqual(g.tables.EUC_PLAN_LOGOS.length, 1); assert.strictEqual(g.k.EUC_DEV610_logos_().GRETA.defaut, true); assert.strictEqual(g.k.EUC_DEV610_logos_().CFAI.image, 'data:image/png;base64,iVBORw0KGgoAAAA=');
  g.k.EUC_DEV610_enregistrerLogo({ organisme: 'CFAI', image: '' }); assert.strictEqual(g.k.EUC_DEV610_logos_().CFAI.defaut, true, 'retiré : le logo par défaut revient');
  assert.deepStrictEqual(J(Object.keys(g.k.EUC_DEV610_LOGOS_DEFAUT_).sort()), ['CFA RAN', 'CFAI', 'Ducretet', 'GRETA', 'Lycée Les Eucalyptus']); assert.ok(Object.values(g.k.EUC_DEV610_LOGOS_DEFAUT_).every(v => /^data:image\/(png|jpeg);base64,/.test(v) && v.length < 30000));
  /* Placement d'après la table Classes : gestionnaire puis donneur d'ordre ; mixité d'après les classes « Mixité » du groupe. */
  const cl = { 1: { id: 1, nom: '1BTS CPI', modalite: 'Mixité', gestionnaire: 'CFA RAN', donneur: 'CFAI' }, 2: { id: 2, nom: '1BTS MV', modalite: 'Mixité', gestionnaire: 'CFA RAN', donneur: 'CFA RAN' }, 3: { id: 3, nom: 'CQPM ASC', modalite: 'Classe entière', gestionnaire: 'GRETA', donneur: 'CFAI' }, 4: { id: 4, nom: 'TPEEB 19', gestionnaire: 'GRETA', donneur: 'GRETA' } };
  cl[5] = { id: 5, nom: 'TSEC', modalite: 'Classe entière', gestionnaire: 'CFA RAN', donneur: 'CFA RAN' };
  const ls = lignesDefaut().map(l => l.code === 'TSEC' ? Object.assign(l, { organismes: ['CFA RAN', 'Ducretet'] }) : l), ra = { '1BTS_CPI': [1], '1BTS_MV': [2], CQPM_ASC: [3], TPEEB_19: [4], TSEC: [5] }, O = code => J(k.EUC_DEV610_organismesLigne_(ls.find(x => x.code === code), ls, ra, cl));
  assert.deepStrictEqual([O('CQPM_ASC'), O('TPEEB_19'), O('MIX_1BTS_CPI'), O('MIX_1BTS_MV'), O('MIX_1BTS_CPRP'), O('TBP_MVA'), O('TSEC')], [['GRETA', 'CFAI'], ['GRETA'], ['CFA RAN', 'CFAI'], ['CFA RAN'], [], [], ['CFA RAN', 'Ducretet']]);
  const h = read('apps-script/Plannings_DEV610.html'), c = {}; vm.createContext(c); vm.runInContext(k.EUC_DEV610_codeClient_() + '\nvar D=null;\n' + h.match(/function logosFormation\(l\)\{[\s\S]*?droite:'Lycée Les Eucalyptus'\};\}/)[0], c);
  const L = o => J(c.logosFormation({ organismes: o }));
  c.D = { organismesLignes: { X: ['GRETA', 'CFAI'] } }; assert.deepStrictEqual(J(c.logosFormation({ code: 'X', organismes: ['CFA RAN'] })), { gauche: ['GRETA', 'CFAI'], droite: 'Lycée Les Eucalyptus' }, 'la table Classes prime');
  c.D = null;
  assert.deepStrictEqual([L(['CFA RAN', 'Ducretet']), L(['GRETA', 'CFAI']), L(['CFAI']), L(['GRETA']), L([])], [
    { gauche: ['CFA RAN', 'Ducretet'], droite: 'Lycée Les Eucalyptus' }, { gauche: ['GRETA', 'CFAI'], droite: 'Lycée Les Eucalyptus' }, { gauche: ['CFAI'], droite: 'Lycée Les Eucalyptus' }, { gauche: ['GRETA'], droite: 'Lycée Les Eucalyptus' }, { gauche: [], droite: 'Lycée Les Eucalyptus' }]);
  for (const t of ['data-p="pLogos"', 'function reduireImage(', '480/im.width,160/im.height', "'EUC_DEV610_enregistrerLogo'", 'id="fIntitule"', "concat((D.suite||[])", 'feries(y-1),feries(y),feries(y+1)']) assert.ok(h.includes(t), t);
  assert.ok(read('apps-script/Admin_PFMP.html').includes('&amp;onglet=pLogos">Logos des calendriers'));
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
  assert.deepStrictEqual(J([ap.diff.creer.length, ap.diff.modifier.length, ap.diff.desactiver.length, ap.rattachementsEnregistres]), [1, 1, 1, false], 'la VFMP absente de la version est à désactiver');
  g.k.EUC_DEV610_enregistrerRattachements({ annee: '2026-2027', rattachements: { TBP_MVA: [30, 31, 999] } });
  assert.deepStrictEqual(J(g.tables.EUC_PLAN_LIGNES_CLASSES[0].fields.Classes), ['L', 30, 31]);
  const res = g.k.EUC_DEV610_publier({ annee: '2026-2027', numero: 1, confirmation: 'PUBLIER' });
  assert.deepStrictEqual(J([res.creees, res.modifiees, res.desactivees]), [1, 1, 1]);
  const cree = g.tables.Planning_Periodes.find(r => r.id >= 1000).fields;
  assert.deepStrictEqual(J(cree.Classes_concernees), ['L', 30, 31]); assert.strictEqual(cree.Date_debut, sec('2026-09-28')); assert.strictEqual(cree.Date_fin, sec('2026-10-16'));
  assert.strictEqual(cree.Annee_scolaire, '2026-2027'); assert.strictEqual(cree.Type, 'PFMP Tbac'); assert.strictEqual(cree.Classe_PFMP, 'TMVA'); assert.strictEqual(cree.Formation, 'T BAC PRO'); assert.strictEqual(cree.Niveau, 'MVA'); assert.strictEqual(cree.Ligne_sheet, 30); assert.strictEqual(cree.Couleur, '#00C853'); assert.match(cree.Commentaire, /Générateur de plannings — 2026-2027 v1/);
  const modif = g.tables.Planning_Periodes.find(r => r.id === 50).fields; assert.strictEqual(modif.Date_debut, sec('2027-01-18')); assert.strictEqual(modif.Commentaire, 'ancien outil');
  assert.strictEqual(g.tables.Planning_Periodes.find(r => r.id === 51).fields.Date_debut, sec('2026-09-23')); assert.strictEqual(g.tables.Planning_Periodes.find(r => r.id === 51).fields.Actif, false, 'désactivée, jamais supprimée');
  assert.strictEqual(modif.Classe_PFMP, 'TMVA'); assert.strictEqual(modif.Niveau, 'MVA'); assert.deepStrictEqual(J(modif.Classes_concernees), ['L', 30, 31]);
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
test('page : jours fériés de l’année scolaire (Pâques, Ascension, Pentecôte) et repères des événements', () => {
  const h = read('apps-script/Plannings_DEV610.html'), c = {};
  const code = ['paques', 'feries', 'jourLong', 'evenement'].map(n => h.match(new RegExp('function ' + n + '\\(.*')) [0]).join('\n');
  vm.createContext(c); vm.runInContext(k.EUC_DEV610_codeClient_() + '\nvar JOURS=' + h.match(/var JOURS=(\[[^\]]*\])/)[1] + ',MOISL=' + h.match(/MOISL=(\[[^\]]*\])/)[1] + ';\n' + code, c);
  const f = c.feries(2026);
  assert.strictEqual(c.paques(2027), '2027-03-28');
  assert.deepStrictEqual([f['2027-03-29'], f['2027-05-06'], f['2027-05-17'], f['2027-05-01'], f['2026-11-11']], ['Lundi de Pâques', 'Ascension', 'Lundi de Pentecôte', 'Fête du Travail', 'Armistice']);
  assert.strictEqual(c.jourLong('2027-05-01'), 'Samedi 1er mai'); assert.strictEqual(c.jourLong('2027-05-06'), 'Jeudi 6 mai');
  assert.deepStrictEqual(['VISITE', 'Visite', 'APPEL TEL', 'EXAMENS', 'CONSEIL', 'VFMP', 'ENT.', 'PFMP Tbac'].map(c.evenement), ['V', 'V', 'A', 'E', 'C', '✓', '', '']);
});
test('page : route administrateur, lien d’accueil, fil d’Ariane canonique, boutons asynchrones protégés', () => {
  assert.match(read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), /case 'plannings-pfmp':\s*return EUC_DEV610_afficher\(e\);/);
  const adm = read('apps-script/Admin_PFMP.html');
  assert.match(adm, /<section class="card plannings">\s*<h2>Plannings<\/h2>/);
  for (const t of ['?page=plannings-pfmp">Planning général', '?page=plannings-pfmp&amp;vue=formations">Plannings par formation', '<h3>Paramétrage plannings</h3>', '&amp;onglet=pOrganisation">Organisation du tableau', '&amp;onglet=pRegles">', '&amp;onglet=pLignes">', '&amp;onglet=pJours">', '&amp;onglet=pPublication">']) assert.ok(adm.includes(t), t);
  assert.ok(adm.indexOf('card plannings') < adm.indexOf('card global'), 'la vignette Plannings ouvre le bloc transversal');
  assert.ok(JSON.parse(read('scripts/pfmp-release-config.json')).routes.some(r => r.page === 'plannings-pfmp' && r.expected === 'Plannings annuels'));
  const h = read('apps-script/Plannings_DEV610.html');
  assert.match(h, /<nav class="ariane"[^>]*><a href="https:\/\/alternance\.loucodi\.fr\/" target="_top">Accueil PFMP<\/a> › <a href="<\?= adminBase \?>\?page=admin-pfmp" target="_top">Administration PFMP<\/a>/);
  assert.match(h, /<script><\?!= codeClient \?><\/script>/);
  assert.match(h, /function occupe\(btn,libelle,fn,arg,ok,delai\)\{\s*var orig=btn\.innerHTML,fini=false;btn\.disabled=true;btn\.innerHTML='<span class="spin"/);
  assert.match(h, /setTimeout\(function\(\)\{if\(fini\)return;fini=true;retablir\(\);message\('Délai dépassé : le serveur n’a pas répondu/);
  assert.match(h, /withFailureHandler\(function\(e\)\{if\(fini\)return;fini=true;clearTimeout\(t\);retablir\(\)/);
  for (const fn of ['EUC_DEV610_enregistrerCouleurs', 'EUC_DEV610_enregistrerParametres', 'EUC_DEV610_enregistrerLogo', 'EUC_DEV610_enregistrerVacances', 'EUC_DEV610_enregistrerAnnee', 'EUC_DEV610_enregistrerFormation', 'EUC_DEV610_enregistrerOrganisation', 'EUC_DEV610_calibrer', 'EUC_DEV610_reprendreExistant', 'EUC_DEV610_enregistrerRegles', 'EUC_DEV610_enregistrerRattachements', 'EUC_DEV610_enregistrerVersion', 'EUC_DEV610_apercuPublication', 'EUC_DEV610_publier', 'EUC_DEV610_enregistrerJour', 'EUC_DEV610_enregistrerHeures']) assert.match(h, new RegExp("occupe\\([^;]*'" + fn + "'"), fn);
  const directs = (h.match(/google\.script\.run/g) || []).length; assert.strictEqual(directs, 3, 'seuls occupe(), le chargement et la reprise appellent le serveur directement');
  assert.match(h, /confirmation:'PUBLIER'/); assert.match(h, /if\(!confirm\('Publier la version/);
  assert.match(h, /D\.previsionnel=prev;afficherAlertes\(\[\]\);\$\('changements'\)\.hidden=true;/, 'les alertes d’une autre année sont effacées au changement d’année');
  assert.match(h, /Aucune vacance trouvée pour/);
  for (const t of ['data-cal="SCOLAIRE"', 'data-cal="MIXITE"', 'data-cal="CLASSE_ENTIERE"', 'data-cal="FC" checked> Formation continue', 'data-cal="CLASSE_ENTIERE" checked> Alternance (classe entière)', 'rowspan="4"', 'function titrePlanning()', "if(v.FC)parts.push('FORMATION CONTINUE')", "if(v.SCOLAIRE)parts.push('PFMP','STAGES')", 'id="piedPlanning"', 'aside class="legende" id="legende"', 'data-p="pCouleurs"', "'Lundi de Pentecôte'", "'Ascension'", 'Imprimer / PDF', "addEventListener('beforeprint'"]) assert.ok(h.includes(t), t);
  assert.match(h, /<style id="stylePage">@page\{size:A3 landscape;margin:8mm\}<\/style>/); assert.match(h, /\.panneau:not\(\.actif\)\{display:none!important\}/);
  for (const t of ['var VUE=<?= vue ?>,ONGLET=<?= onglet ?>,LIGNE_DEMANDEE=<?= ligne ?>', 'function rendreCalendrier(code)', 'function rendreFormations()', "id=\"nomsPronote\"", 'Ajouter une classe à la main']) assert.ok(h.includes(t), t); assert.match(h, /PRÉVISIONNEL/);
});

test('heures : bilan par demi-journée, formation complémentaire 5 Star comptée à part, récapitulatif par formateur', () => {
  const jours = [{ date: '2026-09-07', nature: 'FORMATION' }, { date: '2026-09-08', nature: 'FORMATION' }, { date: '2027-01-11', nature: 'COMPLEMENTAIRE', complement: '5 Star' }, { date: '2027-01-12', nature: 'COMPLEMENTAIRE', complement: '' }];
  const b = k.EUC_DEV610_bilanHeures_(jours, { matin: 4, apresMidi: 3 }, { '2026-09-07': { hm: null, ha: 4, fm: 'ab', fa: 'CD' }, '2027-01-11': { hm: 3.5, ha: '', fm: 'AB', fa: 'EF' }, '2026-09-08': { hm: 0, ha: '', fm: '', fa: 'CD' } });
  assert.deepStrictEqual(J(b.jours.map(x => [x.date, x.hm, x.ha, x.total, x.complement])), [['2026-09-07', 4, 4, 8, null], ['2026-09-08', 0, 3, 3, null], ['2027-01-11', 3.5, 3, 6.5, '5 Star'], ['2027-01-12', 4, 3, 7, 'Formation complémentaire']]);
  assert.strictEqual(b.formation, 11, 'les heures 5 Star ne sont jamais comptées dans la formation');
  assert.deepStrictEqual(J(b.complementaires), { '5 Star': 6.5, 'Formation complémentaire': 7 });
  assert.deepStrictEqual(J(b.formateurs), [
    { initiales: 'AB', formation: 4, complementaires: { '5 Star': 3.5 }, total: 7.5 },
    { initiales: 'CD', formation: 7, complementaires: {}, total: 7 },
    { initiales: 'EF', formation: 0, complementaires: { '5 Star': 3 }, total: 3 }]);
  assert.deepStrictEqual(J(b.sansFormateur), { formation: 0, complementaires: { 'Formation complémentaire': 7 } }, 'une demi-journée sans formateur est signalée, la demi-journée à 0 h ne compte pas');
  assert.ok(!k.EUC_DEV610_typeFormation_('Formation complémentaire'), 'jamais publiée comme période en entreprise');
  assert.strictEqual(k.EUC_DEV610_libelleType_({ type: 'Formation complémentaire', complement: '5 Star' }), 'Formation complémentaire – 5 Star');
  const c = {}; vm.createContext(c); vm.runInContext(k.EUC_DEV610_codeClient_(), c);
  assert.deepStrictEqual(J(c.EUC_DEV610_bilanHeures_(jours, { matin: 4, apresMidi: 3 }, {})), J(k.EUC_DEV610_bilanHeures_(jours, { matin: 4, apresMidi: 3 }, {})));
  assert.strictEqual(c.EUC_DEV610_TYPE_COMPLEMENTAIRE_, 'Formation complémentaire');
});
test('heures : réglages proposés (8 h pour le CAP peintre, 7 h ailleurs, quotas CAP 450 h et BAC PRO / BTS 675 h, formateurs du CAP peintre), enregistrement sans suppression', () => {
  const g = grist(); const r = g.k.EUC_DEV610_charger({ annee: '2026-2027' }), L = c => r.lignes.find(l => l.code === c);
  assert.deepStrictEqual(J([L('CAP_PEINTRE').heuresMatin, L('CAP_PEINTRE').heuresApresMidi, L('CAP_PEINTRE').quota, L('CAP_PEINTRE').formateurs]), [4, 4, 450, true], 'CAP peintre : journées de 8 h');
  assert.ok(r.lignes.filter(l => l.code !== 'CAP_PEINTRE').every(l => l.heuresMatin + l.heuresApresMidi === 7), 'toutes les autres formations, mixités comprises : journées de 7 h');
  assert.deepStrictEqual(J([L('1BTS_ELEC_ALT').quota, L('1MELEC_G').quota, L('1BTS_ELEC_ALT').formateurs, L('1CAP').quota]), [675, 675, false, null]);
  assert.deepStrictEqual(J(r.heures), []);
  const sauver = q => g.k.EUC_DEV610_enregistrerHeures(Object.assign({ annee: '2026-2027', ligne: 'CAP_PEINTRE' }, q));
  assert.throws(() => sauver({ jours: [{ date: '2025-09-08' }] }), /hors de l’année/);
  assert.throws(() => sauver({ jours: [{ date: '2026-09-08', hm: 9 }] }), /entre 0 et 8/);
  assert.throws(() => sauver({ jours: [{ date: '2026-09-08', fm: 'ABCDEFGHIJKLM' }] }), /12 caractères/);
  assert.throws(() => sauver({ ligne: 'INCONNUE', jours: [] }), /introuvable/);
  let res = sauver({ reglages: { matin: '3,5', apresMidi: 3.5, quota: 460, formateurs: true }, jours: [{ date: '2026-09-08', hm: '', ha: 4, fm: 'ab', fa: 'cd' }, { date: '2027-01-11', hm: 3, fm: 'AB' }] });
  assert.deepStrictEqual(J([res.jours, res.ligne.heuresMatin, res.ligne.quota, res.heures.length]), [2, 3.5, 460, 2]);
  res = sauver({ jours: [{ date: '2026-09-08', hm: null, ha: null, fm: '', fa: '' }] });
  const h = g.k.EUC_DEV610_heures_('2026-2027');
  assert.deepStrictEqual(J(h.map(x => [x.ligne, x.date, x.hm, x.ha, x.fm, x.fa])), [['CAP_PEINTRE', '2026-09-08', null, null, '', ''], ['CAP_PEINTRE', '2027-01-11', 3, null, 'AB', '']], 'jour remis au défaut : ligne vidée, jamais supprimée');
  assert.strictEqual(g.tables.EUC_PLAN_HEURES.length, 2);
  assert.deepStrictEqual(J(g.k.EUC_DEV610_charger({ annee: '2026-2027' }).heures.length), 2);
  assert.ok(!g.calls.some(c => c.method === 'delete'));
});
test('formation complémentaire : complément conservé dans la version, jamais publié dans Planning_Periodes', () => {
  const lignes = lignesDefaut(), annee = { code: '2026-2027', debut: '2026-09-01', fin: '2027-08-31' };
  const v = k.EUC_DEV610_validerPeriodes_([{ ligne: 'CAP_PEINTRE', type: 'Formation complémentaire', complement: ' 5 Star ', debut: '2027-01-11', fin: '2027-01-15' }, { ligne: 'CAP_PEINTRE', type: 'ENT.', complement: 'x', debut: '2026-11-16', fin: '2026-11-20' }], lignes, annee);
  assert.deepStrictEqual(J(v.map(p => [p.type, p.complement || ''])), [['ENT.', ''], ['Formation complémentaire', '5 Star']]); assert.ok(!('complement' in J(v[0])), 'aucun complément stocké hors formation complémentaire');
  const d = k.EUC_DEV610_diffPublication_({ periodes: [{ ligne: 'TBP_MVA', type: 'Formation complémentaire', complement: '5 Star', debut: '2027-01-11', fin: '2027-01-15' }] }, lignes, { TBP_MVA: [30, 31] }, [], '2026-2027');
  assert.strictEqual(d.creer.length, 0);
  const pg = read('apps-script/Plannings_DEV610.html');
  for (const t of ['id="selComplement"', 'id="recapFormateurs"', 'id="heures" class="noprint"', "['4+4','8 h (4 + 4)'],['4+3','7 h (4 + 3)'],['4+0','½ journée matin (4 h)']", '||HSALE||COUL_SALE)', 'EUC_DEV610_estComplementaire_($(\'selType\').value)', 'complement:p.complement']) assert.ok(pg.includes(t), t);
});

test('recopie des dates d’une classe vers les classes du même niveau : périodes en entreprise remplacées, le reste gardé, placées à la main', () => {
  const P = (ligne, type, debut, fin, extra) => Object.assign({ ligne, type, debut, fin, origine: 'REGLE', regle: 1 }, extra || {});
  const per = [P('1BP_MVA', 'PFMP 1ère', '2026-11-23', '2026-12-18'), P('1BP_MVA', 'PFMP 1ère', '2027-03-22', '2027-04-16'), P('1BP_MVA', 'VISITE', '2026-12-14', '2026-12-18'),
    P('1BP_CAR', 'PFMP 1ère', '2026-11-30', '2026-12-18'), P('1BP_CAR', 'EXAMENS', '2027-06-01', '2027-06-01'), P('TBP_MVA', 'PFMP Tbac', '2026-09-28', '2026-10-16'), P('MIX_1BP', 'ENT.', '2026-10-05', '2026-10-09')];
  const r = k.EUC_DEV610_recopier_(per, '1BP_MVA', ['1BP_CAR', '1BP_CIEL'], false);
  assert.deepStrictEqual(J([r.modeles, r.remplacees, r.ajoutees, r.parLigne]), [2, 1, 4, { '1BP_CAR': 2, '1BP_CIEL': 2 }]);
  const de = l => r.periodes.filter(p => p.ligne === l).map(p => [p.type, p.debut, p.origine]);
  assert.deepStrictEqual(J(de('1BP_CAR')), [['PFMP 1ère', '2026-11-23', 'TABLEAU'], ['PFMP 1ère', '2027-03-22', 'TABLEAU'], ['EXAMENS', '2027-06-01', 'REGLE']], 'examen gardé, PFMP remplacées');
  assert.deepStrictEqual(J(de('1BP_CIEL')).length, 2); assert.strictEqual(de('1BP_MVA').length, 3, 'source intacte'); assert.strictEqual(de('TBP_MVA').length, 1); assert.strictEqual(de('MIX_1BP').length, 1);
  const t = k.EUC_DEV610_recopier_(per, '1BP_MVA', ['1BP_CAR', '1BP_MVA'], true);
  assert.deepStrictEqual(J(t.periodes.filter(p => p.ligne === '1BP_CAR').map(p => p.type)), ['PFMP 1ère', 'VISITE', 'PFMP 1ère'], 'toutes : visite recopiée, examen remplacé ; la source n’est jamais sa propre cible');
  assert.ok(k.EUC_DEV610_estEntreprise_('ENT.') && k.EUC_DEV610_estEntreprise_('P.dif.') && !k.EUC_DEV610_estEntreprise_('VISITE'));
  assert.ok(k.EUC_DEV610_codeClient_().includes('function EUC_DEV610_recopier_'));
  const pg = read('apps-script/Plannings_DEV610.html');
  for (const x of ['Période fusionnée avec', 'class="petit pr">Recopier ces dates…', 'id="annulerCopie"', 'Lignes inactives ou retirées', 'tr class="teteLigne"']) assert.ok(pg.includes(x), x);
});

test('modalité des lignes comme le suivi des apprentis : formation continue d’après la colonne modalité des classes, sinon le profil par défaut (TPMMA)', () => {
  const lignes = lignesDefaut(), cpi = { 1: { id: 1, modalite: 'Formation continue' }, 2: { id: 2, modalite: 'Classe entière' } };
  assert.strictEqual(k.EUC_DEV610_modaliteLigne_({ code: 'X' }, { X: [2, 1] }, cpi), 'FORMATION_CONTINUE');
  assert.strictEqual(k.EUC_DEV610_modaliteLigne_({ code: 'TPMMA', classePfmp: 'TPMMA' }, { TPMMA: [2] }, cpi), '', 'la table Classes fait foi');
  k.EUC_DEV579_profilDefaut_ = n => /^TP ?MMA/.test(String(n).toUpperCase()) ? { mode: 'FORMATION_CONTINUE' } : { mode: 'CLASSE_ENTIERE' };
  try {
    const m = k.EUC_DEV610_modalitesLignes_(lignes, {}, []);
    assert.deepStrictEqual(J(m), { TPMMA: 'FORMATION_CONTINUE' }, 'une seule formation continue : le TPMMA');
  } finally { delete k.EUC_DEV579_profilDefaut_; }
});

test('mixités : noms distincts par niveau et section, anciens noms renommés une fois, jamais de classe rattachée ni de période en entreprise publiée', () => {
  assert.deepStrictEqual(['MIX_1BP', 'MIX_TBP', 'MIX_1BTS_CPI', 'MIX_2BTS_CPI', 'MIX_1BTS_CPRP', 'MIX_2BTS_MV'].map(c => k.EUC_DEV610_libelleMixite_(c)), ['1 BAC PRO Mixité', 'T BAC PRO Mixité', '1BTS CPI Mixité', '2BTS CPI Mixité', '1BTS CPRP Mixité', '2BTS MV Mixité']);
  const libs = lignesDefaut().filter(l => l.calendrier === 'MIXITE').map(l => l.libelle); assert.strictEqual(new Set(libs).size, libs.length, 'aucun doublon de nom');
  const g = grist();
  g.tables.EUC_PLAN_LIGNES = [
    { id: 1, fields: { Code: 'MIX_2BTS_CPI', Libelle: 'Mixité CPI', Calendrier: 'MIXITE', Groupe: '2 BTS', Ordre: 10, Version_modele: 2, Actif: true } },
    { id: 2, fields: { Code: 'MIX_1BTS_MV', Libelle: 'Mixité MV des apprentis', Calendrier: 'MIXITE', Groupe: '1 BTS', Ordre: 20, Version_modele: 2, Actif: true } }
  ];
  g.k.EUC_DEV610_charger({});
  const lig = g.tables.EUC_PLAN_LIGNES, cpi = lig.find(r => r.fields.Code === 'MIX_2BTS_CPI'), mv = lig.find(r => r.fields.Code === 'MIX_1BTS_MV');
  assert.strictEqual(lig.find(r => r.fields.Code === 'MIX_1BTS_CPRP').fields.Libelle, '1BTS CPRP Mixité', 'nouvelle ligne : nouveau nom');
  assert.strictEqual(cpi.fields.Libelle, '2BTS CPI Mixité', 'ancien nom par défaut renommé'); assert.strictEqual(mv.fields.Libelle, 'Mixité MV des apprentis', 'nom saisi gardé');
  const lignes = lignesDefaut(), d = k.EUC_DEV610_diffPublication_({ periodes: [{ ligne: 'MIX_1BTS_MV', type: 'Stage BTS', debut: '2027-05-31', fin: '2027-07-02' }, { ligne: 'MIX_1BTS_MV', type: 'ENT.', debut: '2026-10-12', fin: '2026-10-16' }] },
    lignes, { MIX_1BTS_MV: [40], '1BTS_MV': [40] }, [{ id: 7, annee: '2026-2027', type: 'Stage BTS', debut: '2027-05-31', fin: '2027-07-02', classes: [40] }], '2026-2027');
  assert.deepStrictEqual(J([d.sansClasse, d.creer.map(x => [x.ligne, x.type, x.classes])]), [[], [['MIX_1BTS_MV', 'ENT.', []]]], 'mixité : ENT. publiée sans classe, stage laissé à la ligne scolaire, pas d’alerte');
  assert.deepStrictEqual(J(d.desactiver.map(x => [x.id, x.ligne])), [[7, '1BTS_MV']], 'la classe 40 reste celle de la ligne scolaire');
  const pg = read('apps-script/Plannings_DEV610.html'); for (const x of ['id="voirInactives"', 'Mixités : aucune classe à rattacher', '(D.retirees||[]).indexOf(l.code)>=0']) assert.ok(pg.includes(x), x);
});

test('années de validité : une formation n’apparaît qu’entre sa première et sa dernière année (page, reprise, publication), enregistrées depuis l’organisation', () => {
  const V = (d, f, a) => k.EUC_DEV610_ligneDeLAnnee_({ anneeDebut: d, anneeFin: f }, a);
  assert.deepStrictEqual([V('', '', '2025-2026'), V('2026-2027', '', '2025-2026'), V('2026-2027', '', '2026-2027'), V('2026-2027', '', '2028-2029'), V('', '2026-2027', '2027-2028'), V('2025-2026', '2026-2027', '2026-2027')], [true, false, true, true, false, true]);
  const g = grist({ periodes: [{ id: 1, fields: { Annee_scolaire: '2026-2027', Type: 'ENT.', Formation: 'Ducretet', Niveau: 'TSEC', Date_debut: sec('2026-11-16'), Date_fin: sec('2026-11-20'), Actif: true } }] });
  const c0 = g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  const org = c0.lignes.map(l => Object.assign({}, l, l.code === 'TSEC' ? { anneeDebut: '2027-2028' } : {}, l.code === 'MIX_1BP' ? { sections: ['1BP_MP3D', '1BP_MT'] } : {}));
  assert.throws(() => g.k.EUC_DEV610_enregistrerOrganisation({ lignes: org.map(l => l.code === 'TSEC' ? Object.assign({}, l, { anneeFin: '2026-2027' }) : l) }), /précède/);
  assert.throws(() => g.k.EUC_DEV610_enregistrerOrganisation({ lignes: org.map(l => l.code === 'TSEC' ? Object.assign({}, l, { anneeDebut: '2027' }) : l) }), /format/);
  g.k.EUC_DEV610_enregistrerOrganisation({ lignes: org });
  const t = g.tables.EUC_PLAN_LIGNES.find(r => r.fields.Code === 'TSEC').fields, m = g.tables.EUC_PLAN_LIGNES.find(r => r.fields.Code === 'MIX_1BP').fields;
  assert.deepStrictEqual([t.Annee_debut, t.Annee_fin, m.Sections], ['2027-2028', '', '1BP_MP3D, 1BP_MT']);
  const c1 = g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  assert.deepStrictEqual(J(c1.lignes.find(l => l.code === 'MIX_1BP').sections), ['1BP_MP3D', '1BP_MT']);
  assert.ok(!g.k.EUC_DEV610_reprendreExistant({ annee: '2026-2027' }).periodes.some(p => p.ligne === 'TSEC'), 'TSEC pas encore ouvert en 2026-2027 : rien repris');
  const pg = read('apps-script/Plannings_DEV610.html');
  for (const x of ['function actifAnnee(l)', 'data-k="anneeDebut"', 'anneeDebut:D.annee.code', 'EUC_DEV610_generer_(lignesActives()']) assert.ok(pg.includes(x), x);
});
test('mixités par filière : couverture (cochées ou le reste du groupe), alertes, nom automatique, logos et diplôme d’après les filières', () => {
  const ls = lignesDefaut().map(l => l.code === 'MIX_1BP' ? Object.assign({}, l, { sections: ['1BP_MP3D', '1BP_MT'] }) : l)
    .concat([{ code: '1_BAC_PRO_MIXITE', libelle: '1 BAC PRO Mixité', calendrier: 'MIXITE', groupe: '1 BAC PRO', sections: [], actif: true }]);
  const cov = k.EUC_DEV610_couvertureMixites_(ls), sc = ls.filter(l => l.groupe === '1 BAC PRO' && l.calendrier === 'SCOLAIRE').map(l => l.code);
  assert.deepStrictEqual(J(cov.parLigne.MIX_1BP), { sections: ['1BP_MP3D', '1BP_MT'], partielle: true, reste: false, parCode: false });
  assert.deepStrictEqual(J(cov.parLigne['1_BAC_PRO_MIXITE'].sections), J(sc.filter(c => c !== '1BP_MP3D' && c !== '1BP_MT')));
  assert.deepStrictEqual(J(cov.alertes), []);
  assert.deepStrictEqual([k.EUC_DEV610_nomMixite_(ls.find(l => l.code === 'MIX_1BP'), ls, cov.parLigne), k.EUC_DEV610_nomMixite_(ls.find(l => l.code === '1_BAC_PRO_MIXITE'), ls, cov.parLigne), k.EUC_DEV610_nomMixite_(ls.find(l => l.code === 'MIX_TBP'), ls, cov.parLigne)],
    ['1 BAC PRO Mixité MP3D MT', '1 BAC PRO Mixité (autres filières)', 'T BAC PRO Mixité']);
  assert.strictEqual(k.EUC_DEV610_nomMixite_(ls.find(l => l.code === 'MIX_1BTS_CPI'), ls, cov.parLigne), '1BTS CPI Mixité', 'section lue dans le code : nom du code');
  const deux = ls.map(l => l.code === '1_BAC_PRO_MIXITE' ? Object.assign({}, l, { sections: ['1BP_MT'] }) : l);
  assert.ok(k.EUC_DEV610_couvertureMixites_(deux).alertes.some(a => /1BP_MT est couverte par deux/.test(a)));
  assert.deepStrictEqual(J(k.EUC_DEV610_couvertureMixites_(lignesDefaut()).alertes), [], 'modèle par défaut : aucune alerte');
  /* Logos et diplôme : classes des seules filières couvertes. */
  const ra = { '1BP_MP3D': [11], '1BP_MT': [12], '1BP_MVA': [13] }, cl = { 11: { id: 11, modalite: 'Mixité', gestionnaire: 'CFAI' }, 12: { id: 12, modalite: 'Mixité', gestionnaire: 'CFAI' }, 13: { id: 13, modalite: 'Mixité', gestionnaire: 'CFA RAN' } };
  assert.deepStrictEqual(J(k.EUC_DEV610_organismesLigne_(ls.find(l => l.code === 'MIX_1BP'), ls, ra, cl)), ['CFAI']);
  assert.deepStrictEqual(J(k.EUC_DEV610_organismesLigne_(ls.find(l => l.code === '1_BAC_PRO_MIXITE'), ls, ra, cl)), ['CFA RAN']);
  assert.deepStrictEqual(J(k.EUC_DEV610_classesDesFilieres_(ls.find(l => l.code === 'MIX_1BP'), ls, ra)), [11, 12]);
  /* Sans filière cochée dans le groupe : comportement inchangé (section lue dans le code). */
  assert.deepStrictEqual(J(k.EUC_DEV610_classesDesFilieres_(lignesDefaut().find(l => l.code === 'MIX_1BP'), lignesDefaut(), ra)).sort(), [11, 12, 13]);
});

test('organisation : une ligne masquée à l’ancien calendrier (TPEEB) ne bloque jamais l’enregistrement et n’est pas envoyée par la page', () => {
  const g = grist(); const r = g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  const org = J(r.lignes).concat([{ id: 0, code: 'TPEEB', libelle: 'TPEEB', groupe: '', calendrier: 'FC_ALTERNANCE', actif: false }]);
  const res = g.k.EUC_DEV610_enregistrerOrganisation({ lignes: org }); assert.strictEqual(res.creees, 1);
  const t = g.tables.EUC_PLAN_LIGNES.find(x => x.fields.Libelle === 'TPEEB' && x.fields.Actif === false); assert.ok(t && t.fields.Calendrier === undefined, 'calendrier ancien jamais réécrit');
  assert.throws(() => g.k.EUC_DEV610_enregistrerOrganisation({ lignes: J(r.lignes).map(l => l.code === 'TSEC' ? Object.assign(l, { calendrier: 'FC' }) : l) }), /calendrier/, 'une ligne affichée reste contrôlée');
  assert.ok(read('apps-script/Plannings_DEV610.html').includes("{lignes:ORG.filter(function(l){return (D.retirees||[]).indexOf(l.code)<0;})}"));
});

test('organisation : enregistrée même si les nouvelles colonnes manquent encore dans Grist (contrôle des tables déjà fait dans les 6 h)', () => {
  const g = grist(); const r = g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  /* Table créée par une version précédente : sans Annee_debut, Annee_fin ni Sections ; contrôle des tables en cache. */
  g.tables.EUC_PLAN_LIGNES.forEach(x => { delete x.fields.Annee_debut; delete x.fields.Annee_fin; delete x.fields.Sections; });
  ['Annee_debut', 'Annee_fin', 'Sections'].forEach(c => { delete g.cols.EUC_PLAN_LIGNES[c]; });
  const avant = J(Object.keys(g.k.EUC_DEV610_defLignes_().reduce((o, c) => (o[c.id] = 1, o), {})));
  assert.ok(avant.includes('Annee_debut') && avant.includes('Etablissement') && avant.includes('Version_modele'), 'définition complète de la table');
  g.k.CacheService.getScriptCache().put('EUC_DEV610_TABLES9', '1');
  const calls = g.calls.length;
  const org = J(r.lignes).map(l => l.code === 'TSEC' ? Object.assign(l, { anneeDebut: '2027-2028' }) : l);
  const res = g.k.EUC_DEV610_enregistrerOrganisation({ lignes: org }); assert.ok(res.ok);
  assert.strictEqual(g.tables.EUC_PLAN_LIGNES.find(x => x.fields.Code === 'TSEC').fields.Annee_debut, '2027-2028');
  assert.ok(g.calls.slice(calls).some(c => c.p === '/tables/EUC_PLAN_LIGNES/columns' && c.method === 'get'), 'colonnes vérifiées avant l’écriture');
  assert.deepStrictEqual(J(g.calls.slice(calls).filter(c => c.p === '/tables/EUC_PLAN_LIGNES/columns' && c.method === 'post').map(c => c.body.columns.map(x => x.id))), [['Annee_debut', 'Annee_fin', 'Sections']], 'colonnes manquantes créées avant l’écriture');
});

test('tableau des périodes : lignes repliées, regroupement des semaines accolées (week-end ou jour férié entre deux), génération visible depuis tout onglet', () => {
  const P = (d, f, t, o) => ({ ligne: 'MIX_1BP', type: t || 'ENT.', debut: d, fin: f, origine: o || 'REPRISE' });
  const r = k.EUC_DEV610_regrouper_([P('2026-12-21', '2026-12-24'), P('2026-12-28', '2026-12-31', 'ENT.', 'GRILLE'), P('2027-01-11', '2027-01-15'), P('2027-01-18', '2027-01-22'), P('2027-01-18', '2027-01-18', 'VISITE'), P('2027-02-01', '2027-02-05'), { ligne: 'X', type: 'ENT.', debut: '2027-01-04', fin: '2027-01-08' }], 'MIX_1BP', { '2026-12-25': 'Noël' });
  assert.strictEqual(r.fusions, 2);
  assert.deepStrictEqual(J(r.periodes.filter(p => p.ligne === 'MIX_1BP').map(p => [p.type, p.debut, p.fin, p.origine])), [['ENT.', '2026-12-21', '2026-12-31', 'TABLEAU'], ['ENT.', '2027-01-11', '2027-01-22', 'REPRISE'], ['VISITE', '2027-01-18', '2027-01-18', 'REPRISE'], ['ENT.', '2027-02-01', '2027-02-05', 'REPRISE']]);
  assert.strictEqual(r.periodes.filter(p => p.ligne === 'X').length, 1, 'autres lignes intactes');
  assert.strictEqual(k.EUC_DEV610_regrouper_([P('2026-12-21', '2026-12-24'), P('2026-12-28', '2026-12-31')], 'MIX_1BP', {}).fusions, 0, 'sans férié, un jour ouvré sépare : pas de fusion');
  const pg = read('apps-script/Plannings_DEV610.html');
  assert.ok(pg.indexOf('id="changements"') < pg.indexOf('role="tablist"'), 'résultat de la génération au-dessus des onglets');
  for (const x of ['id="toutDeplier"', 'Regrouper les semaines accolées', 'OUVERTES[c]=!OUVERTES[c]']) assert.ok(pg.includes(x), x);
});

test('couleurs par type et pied de page : saisis dans la page, contrôlés, prioritaires dans la publication ; ligne scolaire proposée sans organisme', () => {
  const g = grist({ periodes: [] }); g.k.EUC_DEV610_charger({ annee: '2026-2027' });
  assert.throws(() => g.k.EUC_DEV610_enregistrerCouleurs({ couleurs: [{ type: 'ENT.', couleur: 'vert' }] }), /hexadécimal/);
  const r = g.k.EUC_DEV610_enregistrerCouleurs({ couleurs: [{ type: 'ENT.', couleur: '#92d050' }, { type: 'PFMP Tbac', couleur: '' }, { type: 'Stage BTS', couleur: '#ff00cc' }] });
  assert.deepStrictEqual(J([r.creees, r.modifiees]), [2, 0]);
  const c = g.k.EUC_DEV610_charger({ annee: '2026-2027' }).couleurs;
  assert.deepStrictEqual(J([c.ENT.couleur, c.STAGEBTS.couleur, c.PFMPTBAC || null]), ['#92D050', '#FF00CC', null]);
  assert.deepStrictEqual(J(g.k.EUC_DEV610_enregistrerCouleurs({ couleurs: [{ type: 'ENT.', couleur: '#00FF00' }] })), { ok: true, creees: 0, modifiees: 1 });
  assert.throws(() => g.k.EUC_DEV610_enregistrerParametres({ parametres: { PIED_TELEPHONE: 'appeler Paul' } }), /Téléphone/);
  const p = g.k.EUC_DEV610_enregistrerParametres({ parametres: { PIED_LIBELLE: 'Bureau formation entreprise (BFE)', PIED_TELEPHONE: '04 93 00 00 00' } });
  assert.deepStrictEqual(J(p.parametres), { PIED_LIBELLE: 'Bureau formation entreprise (BFE)', PIED_TELEPHONE: '04 93 00 00 00' });
  assert.strictEqual(g.k.EUC_DEV610_charger({ annee: '2026-2027' }).parametres.PIED_TELEPHONE, '04 93 00 00 00');
  /* Publication : la couleur choisie prime sur Types_Planning. */
  g.k.EUC_DEV610_enregistrerVersion({ annee: '2026-2027', numero: 0, periodes: [{ ligne: 'TSEC', type: 'ENT.', debut: '2026-11-16', fin: '2026-11-20', origine: 'TABLEAU' }] });
  const ap = g.k.EUC_DEV610_apercuPublication({ annee: '2026-2027', numero: 1 });
  assert.strictEqual(ap.diff.creer[0].couleur, '#00FF00');
  const prop = k.EUC_DEV610_ligneProposee_({ id: 99, nom: '2BTS CPI', classePfmp: '2BTS CPI', etab: 'LGT', modalite: 'Mixité', gestionnaire: 'CFA RAN', donneur: 'CFAI' }, lignesDefaut());
  assert.deepStrictEqual(J([prop.calendrier, prop.organismes]), ['SCOLAIRE', []], 'ligne scolaire : pas d’organisme de la classe');
  const pg = read('apps-script/Plannings_DEV610.html');
  for (const x of ["l.calendrier==='SCOLAIRE'?[]:(l.organismes||[])", 'finMax=EUC_DEV610_plus_(finA,92)', "if(o.suite)cls+=' suite'", 'function miseEnPageImpression()', '.misePage{flex-direction:column;align-items:stretch}', 'function ajusterImpression()', "'✓':'VFMP'", '<span class="bfe">', "cls+=' part'", 'et bande']) assert.ok(pg.includes(x), x);
});

test('impression : aucun dégradé transparent dans la grille (rendu noir dans certains lecteurs PDF), appel en « A », repères aux deux bouts des bandes', () => {
  const pg = read('apps-script/Plannings_DEV610.html'), css = pg.slice(0, pg.indexOf('</style>'));
  assert.ok(!/table\.g[^{]*\{[^}]*gradient\([^)]*transparent/.test(css), 'aucun dégradé transparent dans les styles de la grille');
  assert.ok(pg.includes("(x===1?c:'#ffffff')"), 'semaines partielles : blanc franc');
  assert.ok(/table\.g td\.man\{box-shadow:none\}/.test(pg) && !/td\.man\{box-shadow:inset/.test(pg) && !pg.includes('</i>Placée à la main'), 'aucun trait « placée à la main », ni à l’écran ni à l’impression');
  assert.ok(pg.includes('jourComplet(j)+\' — \'+FERIES[j]') && pg.includes('pontH{box-shadow:inset 0 2px 0 #111') && !pg.includes('point(s.i)'), 'fériés sur le numéro de semaine, pont encadré de noir');
  assert.ok(!pg.includes("' pv'") && !pg.includes('Pont / jours de vacances'), 'pont : aucune hachure dans les lignes du tableau');
  assert.ok(pg.includes('/ASCENSION/.test(EUC_DEV610_n_(FERIES[j]))'), 'pont : seule la semaine du jeudi de l’Ascension est encadrée');
  for (const x of ["table.g td.ap::before{content:'A'", '<i class=\"ptf\"></i>', "cls+=' cont'"]) assert.ok(pg.includes(x), x);
});

test('page : année et onglet retrouvés après un rechargement, bouton « Actualiser » protégé (spinner, délai, erreur)', () => {
  const pg = read('apps-script/Plannings_DEV610.html');
  for (const x of ['id="actualiser"', "memEcrire('dev610_annee'", "charger(ANNEE_DEMANDEE||memLire('dev610_annee'))", "memEcrire('dev610_onglet',b.dataset.p)", "memLire('dev610_onglet')", 'VERSION_VOULUE=NUM', 'b.disabled=true', "Délai dépassé : le serveur n’a pas répondu (actualisation)", 'if(fini)fini(false)', 'try{return localStorage.getItem(k)']) assert.ok(pg.includes(x), x);
});

test('lisibilité du planning imprimé : titre selon les blocs, hauteur et polices ajustées à la page, zébrage, mois, nom à droite, semaines dans les bandes', () => {
  const pg = read('apps-script/Plannings_DEV610.html'), c = {};
  vm.createContext(c); vm.runInContext(pg.match(/function libBande\(t,n\)\{[^\n]*/)[0], c);
  assert.deepStrictEqual([c.libBande('PFMP 1ère', 6), c.libBande('PFMP Tbac', 3), c.libBande('Stage', 8), c.libBande('ENT.', 1)], ['PFMP 1ère · 6 sem.', 'PFMP Tbac', 'Stage · 8 sem.', 'ENT.']);
  for (const x of ['function titrePlanning()', "t.style.setProperty('--rh',rh+'px')", 'rh=Math.min(36,', "tr class=\"'+(zebre%2?'':'zb')+'\"", "(debutMois(s.i)?' m0':'')", 'class="libD"', 'var PALETTE_FRANCHE=', 'function celluleSupports(l)', 'id="ouvrirFormation"', 'id="retourAnnuel"', 'id="autreFormation"', "a.target=nouvelle?'_blank':'_top'", 'return i===0||SEM[i].mois!==SEM[i-1].mois', 'overflow:visible;border-right:2px solid #cfe3da', 'table.g td.v,table.g tr.zb td.v{background:#8e9894}', '<span class="tel">']) assert.ok(pg.includes(x), x);
});

test('formateurs : plusieurs sur une demi-journée (F+G) avec heures partagées ; saisie de l’après-midi reprise du matin ; BFE dans l’en-tête du calendrier', () => {
  const b = k.EUC_DEV610_bilanHeures_([{ date: '2026-09-14', nature: 'FORMATION' }, { date: '2026-09-15', nature: 'FORMATION' }], { matin: 4, apresMidi: 3 }, { '2026-09-14': { fm: 'F', fa: 'F' }, '2026-09-15': { fm: 'F+G', fa: 'F+G+H' } });
  assert.deepStrictEqual(J(b.formateurs.map(f => [f.initiales, f.total])), [['F', 10], ['G', 3], ['H', 1]]);
  assert.strictEqual(b.formation, 14);
  const pg = read('apps-script/Plannings_DEV610.html');
  for (const x of ['class="hd"', "if(d&&fa&&!d.checked){fa.value=val;s.fa=val;}", "if(e.key!=='Enter')return;", 'function bfeCal()', "'+bfeCal()+'", 'function joursLigne(l)', 'function recapAnnuelFormateurs()', '<div id="recapAnnuel"></div>', "rendreRecapAnnuel();}", 'toutes formations →']) assert.ok(pg.includes(x), x);
});

console.log(n + ' tests DEV610 plannings annuels réussis');
