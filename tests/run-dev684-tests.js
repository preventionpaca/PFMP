/* DEV684 — Codes direction permanents : création (administration seulement), liste, révocation, pages. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
function ctx(rows, admin) {
  const posts = [];
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite, __posts: posts,
    EUC_DEV441_admin_: () => { if (admin === false) throw new Error('Accès administrateur requis.'); return { email: 'admin@lycee.test' }; },
    EUC_DEV441_t_: v => String(v == null ? '' : v).trim(), EUC_DEV441_n_: v => Number(Array.isArray(v) ? v[1] : v) || 0,
    EUC_DEV444_email_: v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || '').trim()) ? String(v).trim().toLowerCase() : '',
    EUC_DEV441_ensurePpTable_: () => true, EUC_DEV441_newCode_: () => 'ABCDE-FGHIJ-KLMNO-PQRST', EUC_DEV441_codeHash_: (c, s) => 'H(' + c + ')', EUC_DEV441_PP_TABLE_: 'EUC_ACCES_PP_PFMP',
    EUC_DEV441_ppRows_: () => rows || [], EUC_DEV463_dateMs_: v => typeof v === 'number' ? v * 1000 : Date.parse(v),
    Utilities: { getUuid: () => 'sel' },
    EUC_ENT_grist: (m, u, b) => { posts.push({ m, u, b }); return { records: [{ id: 77 }] }; } };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_DEV684_CodeDirection.js'), k); return k;
}
test('création : réservée à l’administration, sans classe ni période, sans date de fin, code haché', () => {
  assert.throws(() => ctx([], false).EUC_DEV684_creerCode({ nom: 'Mme A' }), /administrateur/);
  const k = ctx([]), r = J(k.EUC_DEV684_creerCode({ nom: '  Mme A, proviseure adjointe ', email: 'A@Lycee.test' }));
  assert.equal(r.code, 'ABCDE-FGHIJ-KLMNO-PQRST'); assert.equal(r.nom, 'Mme A, proviseure adjointe'); assert.equal(r.id, 77);
  const f = k.__posts[0].b.records[0].fields;
  assert.equal(f.Famille, 'DIRECTION'); assert.equal(f.Classe_id, 0); assert.equal(f.Periode_id, 0); assert.equal(f.Expiration, '2099-12-31T22:59:59.000Z');
  assert.equal(f.Code_hash, 'H(ABCDE-FGHIJ-KLMNO-PQRST)'); assert.ok(!JSON.stringify(f).includes('"ABCDE-FGHIJ'), 'code en clair jamais stocké');
  assert.equal(f.Professeur_email, 'a@lycee.test'); assert.equal(f.Cree_par, 'admin@lycee.test');
  assert.throws(() => ctx([]).EUC_DEV684_creerCode({ nom: '' }), /Indiquez le nom/); assert.throws(() => ctx([]).EUC_DEV684_creerCode({ nom: 'B', email: 'pas-un-mail' }), /Courriel invalide/);
});
test('liste : seulement les codes direction, actifs d’abord ; réservée à l’administration', () => {
  const rows = [{ id: 1, Famille: 'BACPRO', Professeur_nom: 'PP', Actif: true }, { id: 2, Famille: 'DIRECTION', Professeur_nom: 'Ancien', Actif: false, Date_creation: 1700000000, Date_revocation: 1700100000 }, { id: 3, Famille: 'DIRECTION', Professeur_nom: 'Mme A', Actif: true, Date_creation: 1800000000 }];
  const l = J(ctx(rows).EUC_DEV684_liste());
  assert.deepEqual(l.map(x => x.id), [3, 2]); assert.equal(l[1].actif, false); assert.ok(l[1].revocation);
  assert.throws(() => ctx(rows, false).EUC_DEV684_liste(), /administrateur/);
});
test('pages : génération affichée une fois, révocation confirmée avec indicateur ; page des professeurs transmet la famille', () => {
  const h = read('apps-script/Acces_PP_Admin_DEV441.html');
  assert.match(h, /Codes direction \(permanents\)/); assert.match(h, /appel\(\$\('dirCreer'\),'Création…','EUC_DEV684_creerCode'/);
  assert.match(h, /confirm\('Révoquer ce code direction/); assert.match(h, /appel\(b,'Révocation…','EUC_DEV441_revokePpAccess',\{id:Number\(b\.dataset\.id\)\},chargerDirection/);
  assert.match(h, /il ne sera plus affiché/); assert.match(h, /chargerDirection\(\);\$\('dirCreer'\)\.onclick=creerDirection;/);
  const s = read('apps-script/Suivi_Enseignants_DEV576.html');
  assert.match(s, /var portee=\{annee:String\(D\.annee\|\|''\),famille:String\(c\.familleBase\|\|c\.famille\|\|''\)/); assert.match(s, /code direction \(valable jusqu’à révocation\)/);
  assert.match(read('apps-script/EUC_DEV678_PpTableau.js'), /EUC_DEV448_lookupPp_\(q\.code, q\)/);
});
console.log(n + ' tests DEV684 réussis.');
