/* DEV686 — Élèves sans convention : choix « Toutes les classes » (niveau + période), tri par classe puis par élève. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const test = (nom, fn) => { fn(); n++; console.log('ok - ' + nom); };
const J = x => JSON.parse(JSON.stringify(x));
function ctx() {
  const k = { console: { log() {} }, JSON, Object, String, Number, Array, Math, Date, Error, RegExp, isFinite };
  vm.createContext(k); vm.runInContext(read('apps-script/EUC_PFMP_DEV370_AdminTools.js'), k);
  Object.assign(k, {
    EUC_DEV368_admin: () => ({}), EUC_DEV368_year: y => y || '2026-2027', EUC_DEV368_t: v => String(v == null ? '' : v).trim(), EUC_DEV368_n: v => Number(v) || 0,
    EUC_DEV420_motifs_: () => [],
    EUC_DEV368_catalog: () => ({ classes: [
      { classeId: 2, classe: '1MELEC', famille: 'BACPRO', periodes: [{ id: 21, libelle: 'PFMP n°1' }, { id: 22, libelle: 'PFMP n°2' }] },
      { classeId: 1, classe: '1CAR', famille: 'BACPRO', periodes: [{ id: 11, libelle: 'PFMP n°1' }] },
      { classeId: 3, classe: 'TCAR', famille: 'BACPRO', periodes: [{ id: 31, libelle: 'PFMP n°1' }] } ] }),
    EUC_DEV371_levelOf_: c => c[0] === '1' ? 'PREMIERE' : 'TERMINALE', EUC_DEV371_periodKind_: l => l,
    EUC_DEV435_detailSans_: (y, f, c, p) => ({ __dev435Fast: true, lignes: {
      11: [{ eleveId: 5, nom: 'ZOLA', prenom: 'Léa' }, { eleveId: 6, nom: 'ABEL', prenom: 'Tom' }, { eleveId: 7, nom: 'CONV', prenom: 'X', conventionId: 9 }],
      21: [{ eleveId: 8, nom: 'MARTIN', prenom: 'Paul' }, { eleveId: 9, nom: 'APP', prenom: 'Y', apprenti: true }] }[p] || [] }) });
  return k;
}
test('toutes les classes : toutes les classes du niveau pour cette période, triées par classe puis par élève', () => {
  const d = J(ctx().EUC_DEV371_sansConvention({ annee: '2026-2027', niveau: 'PREMIERE', famille: '', periodeKind: 'PFMP n°1', classeId: 0, periodeId: 0 }));
  assert.deepEqual(d.lignes.map(x => x.classe + ' ' + x.eleve), ['1CAR ABEL Tom', '1CAR ZOLA Léa', '1MELEC MARTIN Paul'], 'autre niveau, autre période, conventionné et apprenti exclus');
  const une = J(ctx().EUC_DEV371_sansConvention({ annee: '2026-2027', niveau: 'PREMIERE', famille: 'BACPRO', periodeKind: 'PFMP n°1', classeId: 2, periodeId: 21 }));
  assert.deepEqual(une.lignes.map(x => x.eleve), ['MARTIN Paul'], 'une seule classe toujours possible');
});
test('page : option « Toutes les classes » et requête sans classe ni période précise', () => {
  const h = read('apps-script/Sans_Convention_PFMP_V368.html');
  assert.match(h, /<option value="__TOUTES__">Toutes les classes<\/option>/);
  assert.match(h, /toutes\?\{annee:year\.value,niveau:l\.code,famille:'',periodeKind:periode\.value,classeId:0,periodeId:0\}/);
  assert.match(h, /busy\(load,true,'Chargement…'\)/);
});
console.log(n + ' tests DEV686 réussis.');
