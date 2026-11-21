/* DEV702 — Apprentis en mixité d'une classe de bac pro du LP : CFA RAN par défaut. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
function ctx(col) {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV579_Profils.js'), k);
  k.EUC_DEV579_colonnesClasses_ = () => col || {};
  return k;
}
test('bac pro du LP en mixité : CFA RAN ; BTS, CAP, 2TSMV, LGT, GRETA, classe entière et réglage Grist inchangés', () => {
  const k = ctx(), g = (c, e, m) => { const p = J(k.EUC_DEV579_profil_({}, '2026-2027', 1, c, e || 'LP', m)); return p.mode + '/' + (p.gestionnaire || '') + '/' + (p.organismes || []).join('+'); };
  ['1CAR', 'TCAR', 'TMELEC', 'TCIEL', '1MVA2', '1RMO', '1MELEC', '2MELEC', 'TMP3D', 'TRSP'].forEach(c => assert.match(g(c), /^MIXITE\/CFA RAN\//, c));
  assert.doesNotMatch(g('2TSMV'), /CFA RAN\/$/); assert.equal(k.EUC_DEV579_bacProLp_('2TSMV', 'LP'), false); assert.equal(k.EUC_DEV579_bacProLp_('1BTS CI', 'LP'), false);
  assert.equal(k.EUC_DEV579_bacProLp_('TCAP CAR', 'LP'), false); assert.equal(k.EUC_DEV579_bacProLp_('TMELEC', 'LGT'), false); assert.equal(k.EUC_DEV579_bacProLp_('TEST PFMP', 'LP'), false);
  assert.match(g('TMELEC', 'LP', 'CLASSE_ENTIERE'), /^CLASSE_ENTIERE\/\//, 'classe entière gardée');
  assert.match(g('1MELEC G'), /^CLASSE_ENTIERE\/GRETA/, 'règle existante prioritaire');
  const k2 = ctx({ 1: { modalite: 'MIXITE', gestionnaire: 'CFAI' } });
  assert.match(J(k2.EUC_DEV579_profil_({}, '2026-2027', 1, 'TCAR', 'LP', '')).gestionnaire, /CFAI/, 'réglage Grist prioritaire');
});
test('1TSMV / 2TSMV = 1BTS MV / 2BTS MV : même libellé partout et même organisme (CFA RAN, mixité)', () => {
  const c = { String, Number, Array, Object, JSON, RegExp, Math, Date }; vm.createContext(c); vm.runInContext(read('apps-script/EUC_DEV688_ControleNoms.js'), c);
  assert.equal(c.EUC_DEV688_classe_('2TSMV'), '2BTS MV'); assert.equal(c.EUC_DEV688_classe_('1 tsmv'), '1BTS MV'); assert.equal(c.EUC_DEV688_classe_('2BTS MV'), '2BTS MV'); assert.equal(c.EUC_DEV688_classe_('TMELEC'), 'TMELEC');
  const k = ctx(); assert.deepEqual(J(k.EUC_DEV579_profilDefaut_('2TSMV', 'LGT')), { mode: 'MIXITE', gestionnaire: 'CFA RAN', donneur: 'CFA RAN' });
  assert.match(read('apps-script/EUC_DEV698_Statistiques.js'), /l\.classe = EUC_DEV688_classe_\(l\.classe\)/);
});
console.log(n + ' tests DEV702 réussis.');
