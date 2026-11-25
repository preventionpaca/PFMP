/* DEV738 — Statistiques : apprentis regroupés par organisme lié à l'OPCO (comme les effectifs) ; tableau de bord dans l'enveloppe sans bandeau. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
test('modèle : organisme OPCO transmis de la classe aux apprentis des statistiques (caches renouvelés)', () => {
  const a = read('apps-script/EUC_DEV577_Apprentis.js'), s = read('apps-script/EUC_DEV698_Statistiques.js');
  assert.match(a, /gestionnaire: pr \? pr\.gestionnaire : '', donneur: pr \? pr\.donneur : '', opco: pr \? pr\.opco \|\| '' : '',/);
  assert.match(s, /gestionnaire: T\(l\.gestionnaire\), donneur: T\(l\.donneur\), opco: T\(l\.opco\) \}\);/);
  assert.match(a, /EUC_DEV577_VERSION_ = '1\.0\.0-dev\.738'/); assert.match(s, /EUC_DEV698_VERSION_ = '1\.0\.0-dev\.738'/);
});
test('page : « Par organisme (relation OPCO) » : BTS ELEC Alt géré par le CFA RAN compté au CFAI (simulation)', () => {
  const h = read('apps-script/Statistiques_PFMP_DEV698.html');
  assert.ok(h.includes('<h3>Par organisme (relation OPCO)</h3>') && !h.includes('Par organisme gestionnaire'));
  const src = h.match(/const orgOpco=function\(a\)\{[^}]*\};/)[0], orgSrc = h.match(/org=function\(a\)\{const o=orgOpco\(a\);[^}]*\};/)[0];
  const w = {}; vm.createContext(w); vm.runInContext(src.replace('const ', 'var ') + 'var ' + orgSrc, w);
  assert.equal(w.orgOpco({ gestionnaire: 'CFA RAN', donneur: 'CFAI', opco: 'CFAI' }), 'CFAI');
  assert.equal(w.org({ gestionnaire: 'CFA RAN', donneur: 'CFAI', opco: 'CFAI' }), 'CFAI (gestionnaire CFA RAN)');
  assert.equal(w.org({ gestionnaire: 'GRETA', opco: 'GRETA' }), 'GRETA');
  assert.equal(w.orgOpco({ gestionnaire: 'CFA RAN', donneur: 'CFAI' }), 'CFAI', 'ancien cache sans opco : donneur d’ordre');
  assert.equal(w.org({}), 'Organisme à régler pour la classe');
  assert.match(h, /parOrg=compter\(E\.app,function\(a\)\{return orgOpco\(a\)\|\|'Organisme à régler pour la classe'\}\)/);
});
test('liens : adresse dashboard dans la table unique ; statistiques et retour passent par l’enveloppe', () => {
  assert.match(read('apps-script/EUC_DEV640_Liens.js'), /dashboard: 'https:\/\/dashboard\.lycee-les-eucalyptus\.org\/'/);
  assert.match(read('apps-script/EUC_DEV737_StatsDirection.js'), /EUC_LIEN_\('dashboard'\)/);
});
test('statistiques : classe absente du catalogue (cache vide) reconnue par la table Classes, jamais « Classe inconnue »', () => {
  const k = { String, Number, Array, Object, JSON, Date, Error, RegExp, Math, console: { log() {} } }; vm.createContext(k);
  vm.runInContext(read('apps-script/EUC_DEV698_Statistiques.js'), k);
  let admin = 0; k.EUC_DEV368_catalog = () => { admin++; throw new Error('Accès administrateur requis.'); };
  k.EUC_DEV368_catalogLecture_ = () => ({ classes: [{ classeId: 10, classe: '1CAR', famille: 'BACPRO', periodes: [{ id: 100, libelle: 'PFMP n°1', debut: '05/10/2026', fin: '30/10/2026' }] }] });
  k.EUC_DEV579_classesCompletes_ = () => [{ id: 10, classe: '1CAR', famille: 'BACPRO' }, { id: 11, classe: '1CIEL', famille: 'BACPRO' }, { id: 12, classe: '2BTS MV', famille: 'BTS' }];
  const c = JSON.parse(JSON.stringify(k.EUC_DEV698_classes_('2026-2027')));
  assert.equal(admin, 0, 'lecture du catalogue sans contrôle admin (statistiques de la direction)');
  assert.equal(c.parId[10].periodes.length, 1, 'le catalogue garde ses périodes');
  assert.deepEqual([c.parNom['1CIEL'].famille, c.parNom['2BTS MV'].famille, c.parId[12].cid], ['BACPRO', 'BTS', 12]);
  k.EUC_DEV368_catalogLecture_ = () => { throw new Error('cache vide'); };
  const d = JSON.parse(JSON.stringify(k.EUC_DEV698_classes_('2026-2027')));
  assert.deepEqual(Object.keys(d.parNom).sort(), ['1CAR', '1CIEL', '2BTS MV'], 'catalogue en échec : toutes les classes restent reconnues');
  assert.match(read('apps-script/EUC_PFMP_DEV370_AdminTools.js'), /function EUC_DEV368_catalog\(y\)\{\n  EUC_DEV368_admin\(\);return EUC_DEV368_catalogLecture_\(y\);/, 'contrôle admin conservé sur la fonction appelable');
});
console.log(n + ' tests DEV738 réussis.');
