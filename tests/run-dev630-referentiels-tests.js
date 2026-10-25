'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
let n = 0;
function test(name, fn) { try { fn(); n++; console.log('✓', name); } catch (e) { console.error('✗', name); throw e; } }
const J = x => JSON.parse(JSON.stringify(x));
const k = { console, JSON, String, Number, Object, Array, RegExp };
vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV630_Referentiels.js'), k);
const lignes610 = (() => { const c = { console }; vm.createContext(c); vm.runInContext(read('apps-script/EUC_DEV610_Plannings.js'), c); return c.EUC_DEV610_LIGNES_DEFAUT_.map(l => l[0]); })();

test('référentiels : fiches RNCP relevées avec leurs blocs professionnels et compétences, sans donnée personnelle', () => {
  const R = k.EUC_DEV630_REFERENTIELS_;
  assert.ok(Object.keys(R).length >= 20);
  Object.keys(R).forEach(c => {
    assert.match(c, /^RNCP\d+$/); assert.ok(R[c].titre, c); assert.ok(R[c].blocs.length >= 2, c + ' : au moins 2 blocs professionnels');
    R[c].blocs.forEach(b => { assert.ok(b.code.startsWith(c + 'BC'), b.code); assert.ok(b.intitule && b.competences.length, b.code); });
    assert.ok(!R[c].blocs.some(b => /^(Français|Mathématiques|Physique|Prévention|Langue)/.test(b.intitule)), c + ' : enseignement général à part');
  });
  assert.deepStrictEqual(J(R.RNCP39617.blocs.map(b => b.intitule)), ['Recherche de solutions d’amélioration des moyens de production', 'Pilotage de la mise en œuvre de la solution technique d’intégration des procédés'], 'Bachelor IP : les deux blocs du livret');
  assert.ok(!/@|\b0[67](?:[ .]?\d\d){4}\b/.test(read('apps-script/EUC_DEV630_Referentiels.js')), 'aucun courriel ni téléphone');
});

test('référentiels : chaque ligne rattachée existe dans les plannings ; options et promotions (MVA, BTS MV) selon la session', () => {
  k.EUC_DEV630_LIGNES_.forEach(l => { assert.ok(lignes610.includes(l[0]), 'ligne inconnue ' + l[0]); assert.ok(k.EUC_DEV630_REFERENTIELS_[l[1]], l[1]); });
  const r = k.EUC_DEV630_referentielLigne_('1BP_RSP');
  assert.deepStrictEqual(J(r.blocs.map(b => b.option)), ['', 'RSP', 'RSP'], 'TRPM RSP : bloc commun et blocs de l’option');
  assert.strictEqual(k.EUC_DEV630_referentielLigne_('1BP_MVA').rncp, 'RNCP40996'); assert.strictEqual(k.EUC_DEV630_referentielLigne_('TBP_MVA').rncp, 'RNCP40009');
  assert.strictEqual(k.EUC_DEV630_referentielLigne_('1BTS_MV').rncp, 'RNCP41864'); assert.strictEqual(k.EUC_DEV630_referentielLigne_('2BTS_MV').rncp, 'RNCP38367');
  assert.strictEqual(k.EUC_DEV630_referentielLigne_('BACHELOR_IP').blocs.length, 2);
  assert.strictEqual(k.EUC_DEV630_referentielLigne_('INCONNUE'), null);
});

test('référentiel d’une ligne réelle : par code, par classe PFMP (ligne créée à la main), mixité d’après ses filières (un seul diplôme)', () => {
  const c = { console, JSON, String, Number, Object, Array, RegExp, Math, Date }; vm.createContext(c);
  vm.runInContext(read('apps-script/EUC_DEV610_Plannings.js') + '\n' + read('apps-script/EUC_DEV630_Referentiels.js'), c);
  const L = c.EUC_DEV610_LIGNES_DEFAUT_.map(l => ({ code: l[0], libelle: l[1], calendrier: l[2], groupe: l[3], classePfmp: l[5], sections: [] }));
  const g = L.find(l => l.code === '1BP_MVA').groupe;
  const mixMva = { code: 'MIX_1BP_MVA2', calendrier: 'MIXITE', groupe: g, classePfmp: '', sections: ['1BP_MVA'] };
  const lignes = L.concat([mixMva, { code: 'NOUVELLE', calendrier: 'CLASSE_ENTIERE', groupe: 'X', classePfmp: 'TSEC', sections: [] }]);
  assert.strictEqual(c.EUC_DEV630_referentielPour_(L.find(l => l.code === 'BACHELOR_IP'), lignes).rncp, 'RNCP39617', 'par code');
  const m = c.EUC_DEV630_referentielPour_(mixMva, lignes);
  assert.deepStrictEqual(J([m.rncp, m.ligne, /filières couvertes \(1BP_MVA\)/.test(m.remarque)]), ['RNCP40996', 'MIX_1BP_MVA2', true], 'mixité 1 MVA : bac pro Maintenance des véhicules');
  assert.strictEqual(c.EUC_DEV630_referentielPour_(lignes.find(l => l.code === 'NOUVELLE'), lignes).rncp, 'RNCP37263', 'ligne créée à la main : sa classe PFMP');
  const pq = {}, tout = Object.assign({}, L.find(l => l.code === 'MIX_1BP'), { sections: L.filter(l => l.groupe === g && l.calendrier === 'SCOLAIRE').map(l => l.code) });
  assert.strictEqual(c.EUC_DEV630_referentielPour_(tout, lignes.filter(l => l.code !== 'MIX_1BP').concat([tout]), pq), null);
  assert.match(pq.raison, /plusieurs diplômes/);
  const R = c.EUC_DEV630_referentielsLignes_(lignes);
  assert.ok(R.MIX_1BP_MVA2.blocs.length === 3 && R.TSEC.blocs.length === 3);
  const alternance = L.filter(l => l.calendrier === 'CLASSE_ENTIERE' && !R[l.code].blocs).map(l => l.code);
  assert.deepStrictEqual(J(alternance), ['CQPM_ASC'], 'classes entières : seul le CQPM ASC reste sans référentiel');
});

test('page « Référentiels des diplômes » : route admin, carte de l’administration, contrôle de release, Accueil PFMP', () => {
  const routes = read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js'), cfg = read('scripts/pfmp-release-config.json'), adm = read('apps-script/Admin_PFMP.html'), pg = read('apps-script/Referentiels_DEV630.html');
  assert.ok(routes.includes("case 'referentiels-pfmp':\n      return EUC_DEV630_afficher(e);") && cfg.includes('"page": "referentiels-pfmp", "scope": "admin", "expected": "Référentiels des diplômes"'));
  assert.ok(adm.includes('?page=referentiels-pfmp">Référentiels des diplômes'));
  assert.ok(pg.includes('<a href="https://alternance.loucodi.fr/" target="_top">Accueil PFMP</a>') && pg.includes('var DATA=<?!= donnees ?>;') && pg.includes('<title>Référentiels des diplômes</title>'));
  assert.ok(read('apps-script/EUC_DEV630_Referentiels.js').includes("EUC_SUIVI2_exigerAdmin_();"));
});

console.log(n + ' tests DEV630 référentiels réussis');
