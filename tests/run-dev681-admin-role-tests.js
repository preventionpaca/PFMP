/* DEV681 — Un compte reconnu sans rôle d'administration n'ouvre jamais le mode administration. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'apps-script/EUC_PFMP_AdminAuth.gs'), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
function ctx(role, env, email, allow) {
  const k = { String, Array, Object,
    EUC_RELEASE_blueEditorContext_: () => null,
    EUC_SUIVI_contexteCourant_: () => role ? { autorise: true, email: 'x@lycee.test', role } : { autorise: false },
    EUC_ENT_lireConfiguration: () => ({ EUC_ENT_ENVIRONMENT: env || 'production' }),
    Session: { getActiveUser: () => ({ getEmail: () => email || '' }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => allow || '' }) } };
  vm.createContext(k); vm.runInContext(src, k); return k;
}
test('rôles d’administration : DDFPT, ADMIN_PFMP, BUREAU_ENTREPRISES autorisés', () => {
  ['DDFPT', 'ADMIN_PFMP', 'BUREAU_ENTREPRISES'].forEach(r => { const c = ctx(r).EUC_PFMP_contexteAdmin_(); assert.equal(c.autorise, true); assert.equal(c.role, r); });
});
test('ENSEIGNANT et LECTURE_SEULE : jamais administrateurs (production comme recette hors liste)', () => {
  ['ENSEIGNANT', 'LECTURE_SEULE'].forEach(r => {
    assert.equal(ctx(r).EUC_PFMP_contexteAdmin_().autorise, false);
    assert.equal(ctx(r, 'recette', 'x@lycee.test', 'autre@lycee.test').EUC_PFMP_contexteAdmin_().autorise, false);
  });
  assert.equal(ctx(null).EUC_PFMP_contexteAdmin_().autorise, false);
});
test('recette : courriel de la liste EUC_PFMP_ADMIN_EMAILS toujours administrateur', () => {
  assert.equal(ctx('ENSEIGNANT', 'recette', 'x@lycee.test', 'x@lycee.test').EUC_PFMP_contexteAdmin_().autorise, true);
});
test('mode administration de la page des professeurs : dépend de ce contexte (V156)', () => {
  const v = fs.readFileSync(path.join(__dirname, '..', 'apps-script/EUC_SUIVI_PFMP_AffectationsV156.gs'), 'utf8');
  assert.match(v, /var ctx=EUC_PFMP_contexteAdmin_\(\);\s*return ctx&&ctx\.autorise\?ctx:null;/);
});
console.log(n + ' tests DEV681 réussis.');
